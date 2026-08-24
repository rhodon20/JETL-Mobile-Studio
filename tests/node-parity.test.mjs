import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

const attributesSource = readFileSync(new URL('../js/nodes/attributes.js', import.meta.url), 'utf8');
const spatialSource = readFileSync(new URL('../js/nodes/spatial.js', import.meta.url), 'utf8');
const geometrySource = readFileSync(new URL('../js/nodes/geometry.js', import.meta.url), 'utf8');
const utilsSource = readFileSync(new URL('../js/nodes/utils.js', import.meta.url), 'utf8');
const readersSource = readFileSync(new URL('../js/nodes/readers.js', import.meta.url), 'utf8');
const writersSource = readFileSync(new URL('../js/nodes/writers.js', import.meta.url), 'utf8');

function featureCollection(features) {
    return { type: 'FeatureCollection', features };
}

function loadAttributes() {
    const window = { TOOL_REGISTRY: {} };
    const context = {
        window,
        globalThis: window,
        console,
        resolveParamText: (value) => String(value ?? ''),
        JETLClone: (value) => JSON.parse(JSON.stringify(value)),
        turf: { featureCollection }
    };
    vm.runInNewContext(attributesSource, context, { filename: 'attributes.js' });
    return window.TOOL_REGISTRY;
}

function loadSpatial(windowOverrides = {}) {
    const window = { TOOL_REGISTRY: {}, JETLClone: (value) => JSON.parse(JSON.stringify(value)), ...windowOverrides };
    const point = (coordinates, properties = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties });
    const coordinatesOf = (value) => value?.geometry?.coordinates || [0, 0];
    const visitCoordinates = (coordinates, callback) => {
        if (!Array.isArray(coordinates)) return;
        if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') return callback(coordinates);
        coordinates.forEach((child) => visitCoordinates(child, callback));
    };
    const turf = {
        featureCollection,
        flatten: (value) => value,
        dissolve: (value) => value,
        simplify: (value) => value,
        cleanCoords: (value) => value,
        multiPolygon: (coordinates) => ({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates }, properties: {} }),
        booleanIntersects: (feature, supplier) => feature.properties?.intersects ?? supplier?.properties?.intersects ?? supplier?.properties?.relation === 'intersects',
        intersect: (feature, overlay) => feature.properties?.intersects === false || overlay?.properties?.intersects === false
            ? null
            : ({ ...feature, geometry: JSON.parse(JSON.stringify(feature.geometry)), properties: { ...feature.properties, part: 'inside' } }),
        difference: (feature) => feature.properties?.partial
            ? { ...feature, properties: { ...feature.properties, part: 'outside' } }
            : null,
        explode: (collection) => {
            const points = [];
            (collection.features || []).forEach((feature) => visitCoordinates(feature.geometry?.coordinates, (coordinates) => points.push(point(coordinates.slice()))));
            return featureCollection(points);
        },
        coordEach: (value, callback) => {
            const features = value.type === 'FeatureCollection' ? value.features : [value];
            features.forEach((feature) => visitCoordinates(feature.geometry?.coordinates, callback));
        },
        point,
        nearestPoint: (sourcePoint, collection) => (collection.features || []).reduce((best, candidate) => {
            const [sx, sy] = coordinatesOf(sourcePoint); const [cx, cy] = coordinatesOf(candidate);
            const candidateDistance = Math.hypot(cx - sx, cy - sy);
            return !best || candidateDistance < best.distance ? { feature: candidate, distance: candidateDistance } : best;
        }, null)?.feature || null,
        distance: (a, b) => {
            const [ax, ay] = coordinatesOf(a); const [bx, by] = coordinatesOf(b);
            return Math.hypot(bx - ax, by - ay);
        },
        centroid: (feature) => point(coordinatesOf(feature).slice()),
        booleanPointOnLine: (point, line) => line.properties?.hit === true,
        booleanPointInPolygon: (point, area) => area.properties?.hit === true,
        booleanEqual: (requestor, supplier) => supplier?.properties?.relation === 'equals',
        booleanOverlap: (requestor, supplier) => supplier?.properties?.relation === 'overlaps',
        booleanWithin: (requestor, supplier) => supplier?.properties?.relation === 'within',
        booleanContains: (requestor, supplier) => supplier?.properties?.relation === 'contains',
        booleanCrosses: (requestor, supplier) => supplier?.properties?.relation === 'crosses',
        booleanTouches: (requestor, supplier) => supplier?.properties?.relation === 'touches',
        booleanDisjoint: (requestor, supplier) => supplier?.properties?.relation === 'disjoint',
        polygonToLine: (area) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: area.geometry.coordinates?.[0] || [] }, properties: {} }),
        lineSplit: (line) => featureCollection([{ ...line, geometry: JSON.parse(JSON.stringify(line.geometry)), properties: { ...line.properties } }]),
        length: () => 1,
        along: () => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [0.5, 0] }, properties: {} })
    };
    const context = {
        window,
        globalThis: window,
        console,
        turf,
        JETLClone: (value) => JSON.parse(JSON.stringify(value)),
        resolveParamText: (value) => String(value ?? ''),
        normalizeResult: (value) => value
    };
    vm.runInNewContext(spatialSource, context, { filename: 'spatial.js' });
    return window.TOOL_REGISTRY;
}

function loadGeometry(windowOverrides = {}) {
    const window = { TOOL_REGISTRY: {}, JETLClone: (value) => JSON.parse(JSON.stringify(value)), ...windowOverrides };
    const turf = {
        featureCollection,
        point: (coordinates, properties = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties }),
        bbox: () => [0, 0, 2, 2],
        distance: () => 3,
        centroid: (feature) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: feature.geometry?.coordinates?.[0] || [0, 0] }, properties: {} }),
        bearing: (start, end) => {
            const [x1, y1] = start.geometry.coordinates; const [x2, y2] = end.geometry.coordinates;
            return Math.atan2(x2 - x1, y2 - y1) * 180 / Math.PI;
        },
        polygonToLine: (feature) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: feature.geometry.coordinates[0] }, properties: { ...feature.properties } }),
        polygonize: (collection) => featureCollection(collection.features.length ? [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} }] : []),
        buffer: (feature, distance) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [distance, 0], [distance, distance], [0, 0]]] }, properties: { ...feature.properties } }),
        difference: (outer) => ({ ...outer, geometry: JSON.parse(JSON.stringify(outer.geometry)), properties: { ...outer.properties } }),
        convex: (collection) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]]] }, properties: { count: collection.features.length } }),
        concave: (collection, options) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: { maxEdge: options.maxEdge, count: collection.features.length } })
    };
    const proj4 = (source, target, coordinate) => coordinate.slice();
    proj4.defs = () => undefined;
    vm.runInNewContext(geometrySource, { window, globalThis: window, console, turf, proj4 }, { filename: 'geometry.js' });
    return window.TOOL_REGISTRY;
}

function loadUtils(windowOverrides = {}, contextOverrides = {}) {
    const window = { TOOL_REGISTRY: {}, JETLClone: (value) => JSON.parse(JSON.stringify(value)), ...windowOverrides };
    const turf = { featureCollection, feature: (geometry, properties = {}) => ({ type: 'Feature', geometry, properties }), getType: (feature) => feature.geometry?.type || '' };
    vm.runInNewContext(utilsSource, { window, globalThis: window, console, turf, URL, fetch, AbortController, setTimeout, clearTimeout, btoa, ...contextOverrides }, { filename: 'utils.js' });
    return window.TOOL_REGISTRY;
}

function loadReaders(windowOverrides = {}, contextOverrides = {}) {
    const window = { TOOL_REGISTRY: {}, JETLClone: (value) => JSON.parse(JSON.stringify(value)), ...windowOverrides };
    const turf = {
        featureCollection,
        feature: (geometry, properties = {}) => ({ type: 'Feature', geometry, properties }),
        point: (coordinates, properties = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties }),
        lineString: (coordinates, properties = {}) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties }),
        bboxPolygon: (coordinates) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] }, properties: {} }),
        hexGrid: () => featureCollection([]), squareGrid: () => featureCollection([]), randomPoint: () => featureCollection([])
    };
    const context = {
        window, globalThis: window, console, turf,
        fetch: async () => ({ ok: true, json: async () => ({}) }),
        osmtogeojson: () => featureCollection([]),
        wellknown: { parse: (value) => String(value).startsWith('POINT') ? { type: 'Point', coordinates: [3, 4] } : null },
        ...contextOverrides
    };
    vm.runInNewContext(readersSource, context, { filename: 'readers.js' });
    windowOverrides.__window = window;
    return window.TOOL_REGISTRY;
}

function loadWriters(windowOverrides = {}, contextOverrides = {}) {
    const window = { TOOL_REGISTRY: {}, ...windowOverrides };
    const downloads = [];
    const context = { window, globalThis: window, console, Blob, URL, setTimeout, turf: { featureCollection }, download: (content, filename, mimeType) => downloads.push({ content, filename, mimeType }), toCSV: () => '', wellknown: { stringify: () => '' }, log: () => {}, ...contextOverrides };
    vm.runInNewContext(writersSource, context, { filename: 'writers.js' });
    return { registry: window.TOOL_REGISTRY, downloads };
}

test('FeatureJoiner conserva los tres puertos y separa el secundario no usado', async () => {
    const registry = loadAttributes();
    const tool = registry.attr_join_adv;
    assert.equal(tool.in, 2);
    assert.equal(tool.out, 3);
    const values = { '[df-map]': 'id:id', '[df-join]': 'inner', '[df-prefix]': 'right_' };
    const dom = { querySelector: (selector) => ({ value: values[selector] }) };
    const left = featureCollection([
        { type: 'Feature', geometry: null, properties: { id: 1, left: 'a' } },
        { type: 'Feature', geometry: null, properties: { id: 2, left: 'b' } }
    ]);
    const right = featureCollection([
        { type: 'Feature', geometry: null, properties: { id: 1, value: 'match' } },
        { type: 'Feature', geometry: null, properties: { id: 3, value: 'unused' } }
    ]);
    const result = await tool.run('1', [left, right], dom);
    assert.equal(result.output_1.features.length, 1);
    assert.equal(result.output_2.features.length, 1);
    assert.equal(result.output_3.features.length, 1);
    assert.equal(result.output_3.features[0].properties.id, 3);
});

test('Snapper expone los tres resultados del contrato Desktop', async () => {
    const registry = loadSpatial();
    const tool = registry.geo_snap;
    assert.equal(tool.out, 3);
    const dom = { querySelector: (selector) => ({ value: selector === '[df-unit]' ? 'meters' : '1' }) };
    const source = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }]);
    const anchor = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} }]);
    const result = await tool.run('1', [source, anchor], dom);
    assert.deepEqual(Object.keys(result), ['output_1', 'output_2', 'output_3']);
});

test('Anchored Snapper conserva sus cuatro salidas y no muta candidatos', async () => {
    const tool = loadSpatial().sp_anchored_snapper;
    assert.equal(tool.in, 2);
    assert.equal(tool.out, 4);
    const config = { snapping_type: 'vertex', distance: 1000, unit: 'meters', group_by: [] };
    const dom = { querySelector: () => ({ value: JSON.stringify(config) }) };
    const anchors = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: { anchor: true } }]);
    const candidates = featureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1.2, 1.2] }, properties: { id: 1 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [9, 9] }, properties: { id: 2 } }
    ]);
    const result = await tool.run('1', [anchors, candidates], dom);
    assert.deepEqual(Object.keys(result), ['output_1', 'output_2', 'output_3', 'output_4']);
    assert.equal(result.output_1.features.length, 1);
    assert.deepEqual(Array.from(result.output_1.features[0].geometry.coordinates), [1, 1]);
    assert.equal(result.output_2.features.length, 1);
    assert.equal(result.output_3.features.length, 0);
    assert.equal(result.output_4.features.length, 1);
    assert.deepEqual(candidates.features[0].geometry.coordinates, [1.2, 1.2]);
});

test('Neighbor Finder separa matched/unmatched y combina atributos opcionalmente', async () => {
    const tool = loadSpatial().sp_neighbor_finder;
    assert.equal(tool.in, 2);
    assert.equal(tool.out, 2);
    const dom = { querySelector: () => ({ value: JSON.stringify({ max_distance: 2, distance_factor: '', merge_attrs: true }) }) };
    const source = featureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: 1 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [10, 10] }, properties: { id: 2 } }
    ]);
    const candidates = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 0] }, properties: { name: 'nearest' } }]);
    const result = await tool.run('1', [source, candidates], dom);
    assert.equal(result.output_1.features.length, 1);
    assert.equal(result.output_2.features.length, 1);
    assert.equal(result.output_1.features[0].properties._distance, 1);
    assert.equal(result.output_1.features[0].properties.name, 'nearest');
    assert.equal(source.features[0].properties.name, undefined);
});

test('Spatial Relator aplica relación, agrupación, atributos y lista como Desktop', async () => {
    const tool = loadSpatial().sp_spatial_relator;
    assert.equal(tool.in, 2);
    assert.equal(tool.out, 1);
    const config = { mode: 'intersects', count_attr: 'related', group_by: ['group'], merge_attrs: true, merge_mode: 'prefix', supplier_selection: 'first', prefix: 'supplier_', generate_list: true, list_name: '_relations', list_attrs: true };
    const dom = { querySelector: () => ({ value: JSON.stringify(config) }) };
    const source = featureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: 1, group: 'A', intersects: true } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 2] }, properties: { id: 2, group: 'B', intersects: true } }
    ]);
    const suppliers = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { OBJECTID: 7, group: 'A', name: 'supplier' } }]);
    const result = await tool.run('1', [source, suppliers], dom);
    assert.equal(result.output_1.features[0].properties.related, 1);
    assert.equal(result.output_1.features[0].properties.Join_Count, 1);
    assert.equal(result.output_1.features[0].properties.TARGET_FID, 7);
    assert.equal(result.output_1.features[0].properties.supplier_name, 'supplier');
    assert.equal(result.output_1.features[0].properties._relations.length, 1);
    assert.equal(result.output_1.features[1].properties.related, 0);
    assert.equal(source.features[0].properties.related, undefined);

    const empty = await tool.run('1', [source, featureCollection([])], dom);
    assert.equal(empty.output_1.features[0].properties.related, 0);
});

test('Spatial Relator delega cargas grandes al backend y falla de forma accionable si falta', async () => {
    const source = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }]);
    const supplier = { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} };
    const suppliers = featureCollection(Array(14999).fill(supplier));
    const dom = { querySelector: () => ({ value: '{}' }) };
    await assert.rejects(() => loadSpatial().sp_spatial_relator.run('1', [source, suppliers], dom), /requiere backend Python/);

    let backendOperation = '';
    const expected = { output_1: featureCollection([{ ...supplier, properties: { backend: true } }]) };
    const registry = loadSpatial({ JETLBackend: { spatial: async (operation) => { backendOperation = operation; return expected; } } });
    const result = await registry.sp_spatial_relator.run('1', [source, suppliers], dom);
    assert.equal(backendOperation, 'spatial_relator');
    assert.equal(result.output_1.features[0].properties.backend, true);
});

test('Clipper separa geometría interior y exterior en dos puertos', async () => {
    const registry = loadSpatial();
    const tool = registry.sp_clip;
    assert.equal(tool.out, 2);
    const source = featureCollection([
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { intersects: true, partial: true } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { intersects: false } }
    ]);
    const mask = featureCollection([{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: {} }]);
    const result = await tool.run('1', [source, mask]);
    assert.equal(result.output_1.features.length, 1);
    assert.equal(result.output_2.features.length, 2);
});

test('Point overlayers replican coincidencias, prefijan atributos y separan unmatched', async () => {
    const registry = loadSpatial();
    const dom = { querySelector: () => ({ value: 'ol_' }) };
    const points = featureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: 1 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [9, 9] }, properties: { id: 2 } }
    ]);
    const pointOverlay = featureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { name: 'a' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { name: 'b' } }
    ]);
    const pointResult = await registry.sp_point_point_overlayer.run('1', [points, pointOverlay], dom);
    assert.equal(pointResult.output_1.features.length, 2);
    assert.equal(pointResult.output_2.features.length, 1);
    assert.equal(pointResult.output_1.features[1].properties.ol_name, 'b');
    assert.equal(pointResult.output_1.features[0].properties._overlayer_match_count, 2);

    for (const id of ['sp_point_line_overlayer', 'sp_point_area_overlayer']) {
        const overlay = featureCollection([{ type: 'Feature', geometry: { type: id.includes('line') ? 'LineString' : 'Polygon', coordinates: id.includes('line') ? [[0, 0], [1, 0]] : [[[0, 0], [1, 0], [0, 0]]] }, properties: { hit: true, zone: id } }]);
        const result = await registry[id].run('1', [points, overlay], dom);
        assert.equal(registry[id].out, 2);
        assert.equal(result.output_1.features.length, 2);
        assert.equal(result.output_1.features[0].properties.ol_zone, id);
    }
});

test('AreaOnArea genera intersecciones y conserva fuentes no coincidentes', async () => {
    const tool = loadSpatial().sp_area_area_overlayer;
    const source = featureCollection([
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { id: 1 } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { id: 2, intersects: false } }
    ]);
    const overlay = featureCollection([{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { class: 'A' } }]);
    const result = await tool.run('1', [source, overlay], { querySelector: () => ({ value: 'area_' }) });
    assert.equal(result.output_1.features.length, 1);
    assert.equal(result.output_1.features[0].properties.area_class, 'A');
    assert.equal(result.output_2.features[0].properties.id, 2);
});

test('Line overlayers mantienen el contrato matched/unmatched de Desktop', async () => {
    const registry = loadSpatial();
    const dom = { querySelector: () => ({ value: 'join_' }) };
    const lines = featureCollection([
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 0]] }, properties: { id: 1, intersects: true } },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[5, 0], [6, 0]] }, properties: { id: 2, intersects: false } }
    ]);
    const lineOverlay = featureCollection([{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [0, 1]] }, properties: { road: 'R1' } }]);
    const lineResult = await registry.sp_line_line_overlayer.run('1', [lines, lineOverlay], dom);
    assert.equal(lineResult.output_1.features.length, 1);
    assert.equal(lineResult.output_2.features.length, 1);
    assert.equal(lineResult.output_1.features[0].properties.join_road, 'R1');

    const areas = featureCollection([{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] }, properties: { hit: true, zone: 'Z1' } }]);
    const areaResult = await registry.sp_line_area_overlayer.run('1', [featureCollection([lines.features[0]]), areas], dom);
    assert.equal(areaResult.output_1.features.length, 1);
    assert.equal(areaResult.output_2.features.length, 0);
    assert.equal(areaResult.output_1.features[0].properties.join_zone, 'Z1');
});

test('Readers incorpora los ocho IDs Desktop objetivo con sus contratos', () => {
    const registry = loadReaders();
    for (const id of ['reader_csv', 'reader_excel', 'reader_feature_reader', 'reader_gdb', 'reader_geojson', 'reader_gpx', 'reader_kml', 'reader_shp']) assert.ok(registry[id], `${id} debe estar registrado`);
    assert.equal(registry.reader_feature_reader.in, 1);
    assert.equal(registry.reader_feature_reader.out, 3);
    assert.equal(registry.reader_gpx.out, 16);
    assert.equal(registry.reader_gdb.out, 16);
});

test('CSV Reader detecta lat/lon, tipa valores y concatena archivos sin mutación', async () => {
    const registry = loadReaders();
    const files = [
        { name: 'a.csv', text: async () => 'id,lat,lon,name\n1,40.4,-3.7,"Madrid\nCentro"' },
        { name: 'b.csv', text: async () => 'id,lat,lon,name\n2,41.3,2.1,Barcelona' }
    ];
    const values = { '[df-file]': { files }, '[df-lat]': { value: '' }, '[df-lon]': { value: '' } };
    const result = await registry.reader_csv.run('1', [], { querySelector: (selector) => values[selector] });
    assert.equal(result.features.length, 2);
    assert.deepEqual(Array.from(result.features[0].geometry.coordinates), [-3.7, 40.4]);
    assert.equal(result.features[0].properties.id, 1);
    assert.equal(result.features[0].properties.name, 'Madrid\nCentro');
    assert.equal(result.features[1].properties.jetl_source_file, 'b.csv');
    assert.equal(result.metadata.source_count, 2);
});

test('GeoJSON, KML, SHP y Excel usan el motor local adecuado', async () => {
    const formatCalls = [];
    const windowOverrides = {
        JETLFormats: { readFile: async (file) => { formatCalls.push(file.name); return featureCollection([{ type: 'Feature', geometry: null, properties: { source: file.name } }]); } },
        XLSX: {
            read: () => ({ SheetNames: ['Data'], Sheets: { Data: {} } }),
            utils: { sheet_to_json: () => [{ latitude: '40.4', longitude: '-3.7', city: 'Madrid' }] }
        }
    };
    const registry = loadReaders(windowOverrides);
    const domFor = (files) => ({ querySelector: (selector) => selector === '[df-file]' ? { files } : { value: '' } });
    const geojson = await registry.reader_geojson.run('1', [], domFor([{ name: 'data.geojson', text: async () => JSON.stringify(featureCollection([{ type: 'Feature', geometry: null, properties: { id: 1 } }])) }]));
    assert.equal(geojson.features[0].properties.id, 1);
    const kml = await registry.reader_kml.run('1', [], domFor([{ name: 'data.kml', text: async () => '<kml />' }]));
    const shp = await registry.reader_shp.run('1', [], domFor([{ name: 'data.zip', arrayBuffer: async () => new ArrayBuffer(0) }]));
    const excel = await registry.reader_excel.run('1', [], domFor([{ name: 'data.xlsx', arrayBuffer: async () => new ArrayBuffer(0) }]));
    assert.deepEqual(formatCalls, ['data.kml', 'data.zip']);
    assert.equal(kml.features[0].properties.source, 'data.kml');
    assert.equal(shp.features[0].properties.source, 'data.zip');
    assert.deepEqual(Array.from(excel.features[0].geometry.coordinates), [-3.7, 40.4]);
});

test('el editor de Readers inspecciona esquema, tipos, geometría y muestra CSV', async () => {
    const overrides = {}; loadReaders(overrides);
    const file = { name: 'data.csv', size: 64, text: async () => 'id;lat;lon;name\n1;40.4;-3.7;Madrid\n2;41.3;2.1;Barcelona' };
    const controls = { '[df-file]': { files: [file] }, '[df-reader-config]': { value: JSON.stringify({ delimiter: ';', lat_column: 'lat', lon_column: 'lon' }) } };
    const result = await overrides.__window.JETLReaderTools.inspect({ querySelector: (selector) => controls[selector] }, 'reader_csv');
    assert.equal(result.feature_count, 2); assert.equal(result.types.id, 'number'); assert.equal(result.geometry_types[0], 'Point'); assert.equal(result.rows[0].name, 'Madrid');
});

test('la configuración guardada por el editor gobierna la ejecución del CSV Reader', async () => {
    const registry = loadReaders(); const file = { name: 'data.csv', text: async () => 'x|y|label\n-3.7|40.4|Madrid' };
    const controls = { '[df-file]': { files: [file] }, '[df-reader-config]': { value: JSON.stringify({ delimiter: '|', lat_column: 'y', lon_column: 'x', schema_policy: 'same_schema' }) } };
    const result = await registry.reader_csv.run('1', [], { querySelector: (selector) => controls[selector] });
    assert.equal(JSON.stringify(result.features[0].geometry.coordinates), JSON.stringify([-3.7, 40.4])); assert.equal(result.features[0].properties.label, 'Madrid');
});

test('GPX conserva capas y completa las 16 salidas Desktop', async () => {
    const textNode = (value) => ({ textContent: value });
    const pointNode = (lon, lat, name) => ({
        getAttribute: (key) => key === 'lon' ? String(lon) : String(lat),
        getElementsByTagName: (tag) => tag === 'name' ? [textNode(name)] : []
    });
    const segment = { getElementsByTagName: (tag) => tag === 'trkpt' ? [pointNode(0, 0, ''), pointNode(1, 1, '')] : [] };
    const track = { getElementsByTagName: (tag) => tag === 'trkseg' ? [segment] : tag === 'name' ? [textNode('Track')] : [] };
    class DOMParser { parseFromString() { return { getElementsByTagName: (tag) => ({ parsererror: [], wpt: [pointNode(2, 3, 'Waypoint')], rte: [], trk: [track] }[tag] || []) }; } }
    const registry = loadReaders({}, { DOMParser });
    const result = await registry.reader_gpx.run('1', [], { querySelector: () => ({ files: [{ name: 'route.gpx', text: async () => '<gpx />' }] }) });
    assert.equal(Object.keys(result).length, 16);
    assert.equal(result.output_1.features.length, 1);
    assert.equal(result.output_3.features.length, 1);
    assert.equal(result.output_16.features.length, 0);
});

test('GDB y FeatureReader explican el backend y conservan la respuesta Desktop', async () => {
    const fileDom = { querySelector: () => ({ files: [{ name: 'data.gdb.zip' }] }) };
    await assert.rejects(() => loadReaders().reader_gdb.run('1', [], fileDom), /requiere backend/);
    const gdbRegistry = loadReaders({ JETLBackend: { readFile: async () => ({ output_1: featureCollection([{ type: 'Feature', geometry: null, properties: { layer: 1 } }]) }) } });
    const gdb = await gdbRegistry.reader_gdb.run('1', [], fileDom);
    assert.equal(gdb.output_1.features[0].properties.layer, 1);
    assert.equal(Object.keys(gdb).length, 16);

    const initiators = featureCollection([{ type: 'Feature', geometry: null, properties: { path: 'a.csv' } }]);
    const config = { path_mode: 'attribute', path_value: 'path', format: 'csv' };
    const featureDom = { querySelector: () => ({ value: JSON.stringify(config) }) };
    await assert.rejects(() => loadReaders().reader_feature_reader.run('7', [initiators], featureDom), /requiere backend/);
    let backendNode = '';
    const expected = { output_1: featureCollection([]), output_2: featureCollection([]), output_3: featureCollection([]) };
    const registry = loadReaders({ JETLBackend: { featureReader: async (payload, options, meta) => { backendNode = meta.node_id; return expected; } } });
    const result = await registry.reader_feature_reader.run('7', [initiators], featureDom);
    assert.equal(backendNode, '7');
    assert.equal(result, expected);
});

test('el alcance Studio excluye Raster y LiDAR del gate sin borrar compatibilidad heredada', () => {
    const auditUrl = new URL('../scripts/audit-node-parity.mjs', import.meta.url);
    const manifestUrl = new URL('../docs/desktop-node-manifest.json', import.meta.url);
    const scopeUrl = new URL('../docs/studio-node-scope.json', import.meta.url);
    const result = spawnSync(process.execPath, [auditUrl.pathname, manifestUrl.pathname, scopeUrl.pathname], { encoding: 'utf8' });
    assert.equal(result.status, 0, 'el catálogo objetivo debe estar cerrado');
    const report = JSON.parse(result.stdout);
    assert.equal(report.desktopCount, 134);
    assert.equal(report.targetDesktopCount, 115);
    assert.equal(report.studioCount, 119);
    assert.equal(report.targetSharedIdCount, 115);
    assert.equal(report.targetMissingInStudio.length, 0);
    assert.equal(report.excludedDesktop.length, 19);
    assert.deepEqual(report.legacyStudioOutOfScope, ['reader_geotiff', 'sp_point_sampling', 'sp_zonal_stats']);
    assert.ok(!report.targetMissingInStudio.includes('reader_lidar'));
    assert.ok(!report.targetMissingInStudio.includes('writer_geotiff'));
    assert.ok(!report.targetMissingInStudio.includes('util_python_caller'));
    assert.ok(!report.targetMissingInStudio.includes('util_system_caller'));
});

test('Writers registra los tres contratos Desktop pendientes', () => {
    const { registry } = loadWriters();
    for (const id of ['writer_gdb', 'writer_shp', 'writer_xlsx']) assert.ok(registry[id], `${id} debe estar registrado`);
    assert.equal(registry.writer_gdb.dynamicInputs, true); assert.equal(registry.writer_shp.in, 1); assert.equal(registry.writer_xlsx.out, 0);
});

test('XLSX Writer genera un libro local con atributos normalizados', async () => {
    let appended; const XLSX = { utils: { book_new: () => ({}), json_to_sheet: (rows) => ({ rows }), book_append_sheet: (book, sheet, name) => { appended = { sheet, name }; } }, write: () => new Uint8Array([1, 2, 3]) };
    const { registry, downloads } = loadWriters({ XLSX });
    const input = featureCollection([{ type: 'Feature', geometry: null, properties: { id: 1, nested: { ok: true } } }]);
    const controls = { '[df-fn]': { value: 'table.xlsx' }, '[df-sheet]': { value: 'Results' } };
    assert.equal(await registry.writer_xlsx.run('1', [input], { querySelector: (selector) => controls[selector] }), input);
    assert.equal(appended.name, 'Results'); assert.equal(appended.sheet.rows[0].nested, '{"ok":true}'); assert.equal(downloads[0].filename, 'table.xlsx');
});

test('SHP Writer descarga un ZIP local y GDB exige backend real', async () => {
    const shpwrite = { zip: async () => new Uint8Array([80, 75]) }; const { registry, downloads } = loadWriters({ shpwrite });
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: 1 } }]);
    const shpControls = { '[df-fn]': { value: 'layer.zip' }, '[df-layer-name]': { value: 'places' } };
    await registry.writer_shp.run('2', [input], { querySelector: (selector) => shpControls[selector] }); assert.equal(downloads[0].filename, 'layer.zip');
    const gdbControls = { '[df-fn]': { value: 'data.gdb.zip' }, '[df-layer-name]': { value: 'layer' } };
    await assert.rejects(() => registry.writer_gdb.run('3', [input], { querySelector: (selector) => gdbControls[selector] }), /requiere un backend/);
    let payload; const backend = loadWriters({ JETLBackend: { exportVector: async (format, data, options) => { payload = { format, data, options }; return { downloaded: true }; } } }).registry;
    assert.equal(await backend.writer_gdb.run('4', [input], { querySelector: (selector) => gdbControls[selector] }), input); assert.equal(payload.format, 'gdb'); assert.equal(payload.options.layers.length, 1);
});

test('Creator genera atributos tipados, sustitución e índice de instancia', () => {
    const tool = loadUtils().util_creator;
    const config = { count: 2, geometry_mode: 'point', x: -3.7, y: 40.4, instance_attr: 'row', attributes: [{ name: 'name', value: 'item-{i}', type: 'string' }, { name: 'value', value: '7', type: 'number' }] };
    const result = tool.run('1', [], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.equal(result.features.length, 2); assert.equal(result.features[1].properties.name, 'item-2'); assert.equal(result.features[0].properties.value, 7); assert.equal(JSON.stringify(result.features[0].geometry.coordinates), JSON.stringify([-3.7, 40.4]));
});

test('HTTP Caller produce una respuesta inspeccionable y respeta configuración', async () => {
    let captured;
    const fakeFetch = async (url, options) => { captured = { url, options }; return { ok: true, status: 201, url, headers: { get: () => 'application/json', forEach: (fn) => fn('application/json', 'content-type') }, text: async () => '{"ok":true}' }; };
    const tool = loadUtils({}, { fetch: fakeFetch }).util_http_caller;
    const config = { method: 'POST', url: 'https://api.example.test/items', headers: { 'X-Test': 'yes' }, body: '{"a":1}' };
    const result = await tool.run('1', [], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.equal(captured.options.method, 'POST'); assert.equal(captured.options.body, '{"a":1}'); assert.equal(result.features[0].properties.response_status_code, 201); assert.equal(JSON.stringify(result.features[0].properties.response_json), JSON.stringify({ ok: true }));
});

test('REST y GraphQL construyen URLs y cuerpos ejecutables en navegador', async () => {
    const calls = []; const fakeFetch = async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200, url, headers: { get: () => 'application/json', forEach: () => {} }, text: async () => '{}' }; };
    const registry = loadUtils({}, { fetch: fakeFetch });
    await registry.util_rest_request.run('1', [], { querySelector: () => ({ value: JSON.stringify({ base_url: 'https://api.example.test', path: 'users', query: { page: 2 } }) }) });
    await registry.util_graphql_request.run('2', [], { querySelector: () => ({ value: JSON.stringify({ endpoint: 'https://api.example.test/graphql', query: 'query Ping { ping }', variables: { n: 1 } }) }) });
    assert.match(calls[0].url, /users\?page=2/); assert.equal(calls[1].options.method, 'POST'); assert.equal(JSON.parse(calls[1].options.body).variables.n, 1);
});

test('Response Inspector y Workspace Runner preservan la colección', () => {
    const registry = loadUtils(); const input = featureCollection([{ type: 'Feature', geometry: null, properties: { response_status_code: 204, response_ok: true, response_body: 'done' } }]);
    const controls = {}; const dom = { querySelector: (selector) => controls[selector] ||= { textContent: '' } };
    assert.equal(registry.util_response_inspector.run('1', [input], dom), input); assert.match(controls['[data-response-status]'].textContent, /204/);
    assert.equal(registry.util_workspace_runner.hidden, true); assert.equal(registry.util_workspace_runner.run('2', [input]), input);
});

test('List Concatenator replica listas directas y rutas anidadas de Desktop', async () => {
    const tool = loadAttributes().attr_list_concatenator;
    assert.equal(tool.in, 1);
    assert.equal(tool.out, 1);
    const config = { list_attr: 'items{}.name', target_attr: 'names', delimiter: '|', drop_empty: true };
    const dom = { querySelector: () => ({ value: JSON.stringify(config) }) };
    const input = featureCollection([{ type: 'Feature', geometry: null, properties: { items: [{ name: 'a' }, { name: '' }, { name: null }, { name: 'b' }] } }]);
    const result = await tool.run('1', [input], dom);
    assert.equal(result.features[0].properties.names, 'a|b');
    assert.equal(input.features[0].properties.names, undefined, 'no debe mutar la entrada');
});

test('Substring Extractor usa fin inclusivo e índices negativos como Desktop', async () => {
    const tool = loadAttributes().attr_substring;
    const input = featureCollection([{ type: 'Feature', geometry: null, properties: { date: '2026-08-24' } }]);
    const run = async (config) => tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    const year = await run({ source_attr: 'date', target_attr: 'part', start: 0, end: 3 });
    const day = await run({ source_attr: 'date', target_attr: 'part', start: -2, end: -1 });
    assert.equal(year.features[0].properties.part, '2026');
    assert.equal(day.features[0].properties.part, '24');
});

test('Attribute Splitter y List Exploder completan el recorrido texto a features', async () => {
    const registry = loadAttributes();
    const input = featureCollection([{ type: 'Feature', geometry: null, properties: { code: 'a__b_c' } }]);
    const splitterConfig = { source_attr: 'code', target_attr: 'parts', delimiter: '_' };
    const split = await registry.attr_splitter.run('1', [input], { querySelector: () => ({ value: JSON.stringify(splitterConfig) }) });
    assert.deepEqual(Array.from(split.features[0].properties.parts), ['a', 'b', 'c']);
    const exploderConfig = { list_attr: 'parts', index_attr: 'position' };
    const exploded = await registry.attr_list_exploder.run('2', [split], { querySelector: () => ({ value: JSON.stringify(exploderConfig) }) });
    assert.deepEqual(Array.from(exploded.features, (feature) => feature.properties.parts), ['a', 'b', 'c']);
    assert.deepEqual(Array.from(exploded.features, (feature) => feature.properties.position), [0, 1, 2]);
    assert.equal(input.features[0].properties.parts, undefined);
});

test('String Replacer conserva reglas múltiples, regex Desktop y política sin coincidencia', async () => {
    const tool = loadAttributes().attr_string_replacer;
    const input = featureCollection([
        { type: 'Feature', geometry: null, properties: { code: 'AB-123', label: 'North' } },
        { type: 'Feature', geometry: null, properties: { code: 'none', label: 'South' } }
    ]);
    const config = {
        mode: 'regex', case_sensitive: false, no_match_action: 'set', no_match_value: 'missing',
        rules: [
            { enabled: true, attribute: 'code', search: '^([a-z]+)-([0-9]+)$', replace: '\\2_\\1' },
            { enabled: false, attribute: 'label', search: 'north', replace: 'N' }
        ]
    };
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.equal(result.features[0].properties.code, '123_AB');
    assert.equal(result.features[1].properties.code, 'missing');
    assert.equal(result.features[0].properties.label, 'North');
});

test('Aggregator agrupa sin distinguir mayúsculas y construye geometrías MultiPoint', async () => {
    const tool = loadAttributes().attr_aggregator;
    assert.equal(tool.in, 1);
    assert.equal(tool.out, 1);
    const config = { group_by: 'grupo', remove_geometry: false, produce_multis: true, preserve_multi_inputs: false };
    const dom = { querySelector: () => ({ value: JSON.stringify(config) }) };
    const input = featureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { GRUPO: 'A', nombre: '', primero: 1 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: { grupo: 'A', nombre: 'relleno', segundo: 2 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 2] }, properties: { grupo: 'B', nombre: 'otro' } }
    ]);
    const result = await tool.run('1', [input], dom);
    assert.equal(result.features.length, 2);
    assert.equal(result.features[0].geometry.type, 'MultiPoint');
    assert.deepEqual(Array.from(result.features[0].geometry.coordinates, (coordinate) => Array.from(coordinate)), [[0, 0], [1, 1]]);
    assert.equal(result.features[0].properties.nombre, 'relleno');
    assert.equal(input.features[0].properties.nombre, '', 'no debe mutar la entrada');
});

test('Attribute Manager legado conserva dos puertos y separa reglas fallidas', async () => {
    const tool = loadAttributes().attr_manager;
    assert.equal(tool.hidden, true);
    assert.equal(tool.in, 1);
    assert.equal(tool.out, 2);
    const config = {
        preserveOthers: true,
        onError: 'reject',
        rules: [
            { action: 'rename', source: 'name', target: 'label' },
            { action: 'cast', source: 'amount', target: 'amount_int', cast: 'integer' },
            { action: 'formula', target: 'double', value: 'props.amount_int * 2' }
        ]
    };
    const dom = { querySelector: (selector) => selector === '[df-attr-manager-config]' ? { value: JSON.stringify(config) } : null };
    const input = featureCollection([
        { type: 'Feature', geometry: null, properties: { name: 'válida', amount: '4.8' } },
        { type: 'Feature', geometry: null, properties: { amount: 'x' } }
    ]);
    const result = await tool.run('1', [input], dom);
    assert.equal(result.output_1.features.length, 1);
    assert.equal(result.output_2.features.length, 1);
    assert.equal(result.output_1.features[0].properties.label, 'válida');
    assert.equal(result.output_1.features[0].properties.amount_int, 4);
    assert.equal(result.output_1.features[0].properties.double, 8);
    assert.match(result.output_2.features[0].properties._attr_manager_error, /campo no encontrado|convertir/);
});

test('Attribute Manager v2 evalúa condiciones, funciones y selección de atributos', async () => {
    const tool = loadAttributes().attr_manager_v2;
    assert.equal(tool.in, 1);
    assert.equal(tool.out, 1);
    const config = {
        preserveOthers: false,
        rules: [
            { action: 'do_nothing', inputAttr: 'name' },
            { action: 'set', outputAttr: 'score2', value: '@Value(score)*2', valueType: 'number', condition: '@Value(active)==true' },
            { action: 'create', outputAttr: 'title', value: '@upper(@Value(name))', valueType: 'string' }
        ]
    };
    const dom = { querySelector: (selector) => selector === '[df-attr-manager-v2-config]' ? { value: JSON.stringify(config) } : null };
    const input = featureCollection([
        { type: 'Feature', geometry: null, properties: { name: 'madrid', score: 3, active: true, extra: 'fuera' } },
        { type: 'Feature', geometry: null, properties: { name: 'toledo', score: 2, active: false, extra: 'fuera' } }
    ]);
    const result = await tool.run('1', [input], dom);
    assert.deepEqual(Object.keys(result.features[0].properties), ['name', 'score2', 'title']);
    assert.equal(result.features[0].properties.score2, 6);
    assert.equal(result.features[0].properties.title, 'MADRID');
    assert.equal(result.features[1].properties.score2, null);
    assert.equal(result.features[1].properties.extra, undefined);
});

test('Coordinate Extractor usa índices negativos y conserva la entrada', async () => {
    const tool = loadGeometry().geo_coordinate_extractor;
    const values = { '[df-index]': '-1', '[df-x-attr]': 'lon', '[df-y-attr]': 'lat', '[df-z-attr]': 'z' };
    const dom = { querySelector: (selector) => ({ value: values[selector] }) };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 1, 2], [3, 4, 5]] }, properties: { id: 1 } }]);
    const result = await tool.run('1', [input], dom);
    assert.equal(result.features[0].properties.lon, '3');
    assert.equal(result.features[0].properties.lat, '4');
    assert.equal(result.features[0].properties.z, '5');
    assert.equal(input.features[0].properties.lon, undefined);
});

test('CRS Extractor materializa el CRS disponible sin mutar metadatos', async () => {
    const tool = loadGeometry().geo_crs_extractor;
    const input = featureCollection([{ type: 'Feature', geometry: null, properties: { id: 1 } }]);
    input.metadata = { crs: 'EPSG:25830' };
    const result = await tool.run('1', [input]);
    assert.equal(result.features[0].properties.crs_code, 'EPSG:25830');
    assert.equal(result.features[0].properties.crs_name, 'EPSG:25830');
    assert.equal(result.features[0].properties.crs_wkt, null);
    assert.equal(input.features[0].properties.crs_code, undefined);
});

test('Deaggregator separa multipart y conserva parte, atributos y CRS', async () => {
    const tool = loadGeometry().geo_deaggregator;
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] }, properties: { id: 7 } }]);
    input.metadata = { crs: 'EPSG:4326' };
    const result = await tool.run('1', [input]);
    assert.equal(result.features.length, 2);
    assert.deepEqual(Array.from(result.features, (feature) => feature.geometry.type), ['Point', 'Point']);
    assert.deepEqual(Array.from(result.features, (feature) => feature.properties._part_number), ['0', '1']);
    assert.ok(result.features.every((feature) => feature.properties._crs === 'EPSG:4326'));

    const nested = featureCollection([{ type: 'Feature', geometry: { type: 'GeometryCollection', geometries: [
        { type: 'Point', coordinates: [2, 2] },
        { type: 'MultiPoint', coordinates: [[3, 3], [4, 4]] }
    ] }, properties: { id: 8 } }]);
    const nestedResult = await tool.run('2', [nested]);
    assert.equal(nestedResult.features.length, 3);
    assert.deepEqual(Array.from(nestedResult.features, (feature) => feature.properties._part_number), ['0', '1', '2']);
});

test('Hull Creator conserva el selector convexo/cóncavo de Desktop', async () => {
    const tool = loadGeometry().geo_hull_creator;
    const input = featureCollection([0, 1, 2, 3].map((value) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [value, value] }, properties: {} })));
    const dom = { querySelector: (selector) => ({ value: selector === '[df-hulltype]' ? 'concave' : '4' }) };
    const result = await tool.run('1', [input], dom);
    assert.equal(result.features.length, 1);
    assert.equal(result.features[0].geometry.type, 'Polygon');
    assert.equal(result.features[0].properties.count, 4);
});

test('Junction Splitter produce cuatro colecciones independientes', () => {
    const tool = loadUtils().util_tee;
    assert.equal(tool.in, 1);
    assert.equal(tool.out, 4);
    const input = featureCollection([{ type: 'Feature', geometry: null, properties: { value: 1 } }]);
    const result = tool.run('1', [input]);
    assert.deepEqual(Object.keys(result), ['output_1', 'output_2', 'output_3', 'output_4']);
    result.output_1.features[0].properties.value = 99;
    assert.equal(result.output_2.features[0].properties.value, 1);
    assert.equal(input.features[0].properties.value, 1);
});

test('Coordinate System Setter asigna metadatos y respeta overwrite', async () => {
    const tool = loadGeometry().geo_crs_setter;
    const config = { crs: 'EPSG:25830', overwrite: false };
    const input = featureCollection([
        { type: 'Feature', geometry: null, properties: { _crs: 'EPSG:4326' } },
        { type: 'Feature', geometry: null, properties: {} }
    ]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.equal(result.metadata.crs, 'EPSG:25830');
    assert.equal(result.features[0].properties._crs, 'EPSG:4326');
    assert.equal(result.features[1].properties._crs, 'EPSG:25830');
    assert.equal(input.metadata, undefined);
});

test('Horizontal Angle Calculator conserva líneas y calcula grados/radianes', async () => {
    const tool = loadGeometry().geo_horizontal_angle_calculator;
    const input = featureCollection([
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 0]] }, properties: { id: 1 } },
        { type: 'Feature', geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [0, 1]], [[0, 1], [-1, 1]]] }, properties: { id: 2 } }
    ]);
    const config = { unit: 'degrees', azimuth_attr: 'az', angle_attr: 'horizontal' };
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.equal(result.features[0].properties.az, 90);
    assert.equal(result.features[0].properties.horizontal, 0);
    assert.equal(result.features[1].properties.az, 0);
    assert.equal(result.features[1].properties.horizontal, 90);
    assert.equal(input.features[0].properties.az, undefined);
});

test('Rotator usa origen fijo y mantiene salida de rechazados Desktop', async () => {
    const tool = loadGeometry().geo_rotator;
    assert.equal(tool.out, 2);
    const config = { angle_mode: 'fixed', angle_value: 90, origin_mode: 'custom', origin_x: 0, origin_y: 0, on_error: 'reject' };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 0] }, properties: {} }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.ok(Math.abs(result.output_1.features[0].geometry.coordinates[0]) < 1e-10);
    assert.ok(Math.abs(result.output_1.features[0].geometry.coordinates[1] - 1) < 1e-10);
    assert.equal(result.output_2.features.length, 0);
});

test('Densifier añade vértices sin modificar la geometría original', async () => {
    const tool = loadGeometry().geo_densifier;
    const config = { mode: 'uniform', interval_mode: 'fixed', interval_value: 2, on_error: 'reject' };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [4, 0]] }, properties: {} }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.deepEqual(Array.from(result.output_1.features[0].geometry.coordinates, (coordinate) => Array.from(coordinate)), [[0, 0], [2, 0], [4, 0]]);
    assert.equal(input.features[0].geometry.coordinates.length, 2);
    assert.equal(result.output_2.features.length, 0);
});

test('MeasureExtractor conserva nulls para vértices sin tercera coordenada', async () => {
    const tool = loadGeometry().geo_measure_extractor;
    const config = { measure_type: 'whole', list_attr: 'm' };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0, 4], [1, 1], [2, 2, 8]] }, properties: {} }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.deepEqual(Array.from(result.features[0].properties.m), [4, null, 8]);
    assert.equal(input.features[0].properties.m, undefined);
});

test('Area Builder polygoniza linework y conserva atributos de origen', async () => {
    const tool = loadGeometry().geo_area_builder;
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 0], [1, 1], [0, 0]] }, properties: { source: 'a' } }]);
    const result = await tool.run('1', [input]);
    assert.equal(result.features.length, 1);
    assert.equal(result.features[0].properties.source, 'a');
});

test('Centerline Replacer conserva dos puertos y diagnostica la ausencia de backend', async () => {
    const tool = loadGeometry().geo_centerline_replacer;
    assert.equal(tool.out, 2);
    await assert.rejects(() => tool.run('1', [featureCollection([])], { querySelector: () => ({ value: '{}' }) }), /backend Python/);
    const expected = { output_1: featureCollection([]), output_2: featureCollection([]) };
    const backendTool = loadGeometry({ JETLBackend: { geometry: async () => expected } }).geo_centerline_replacer;
    assert.equal(await backendTool.run('1', [featureCollection([])], { querySelector: () => ({ value: '{}' }) }), expected);
});

test('Extruder crea coordenadas 3D y separa rechazos', async () => {
    const tool = loadGeometry().geo_extruder;
    const config = { height_mode: 'fixed', height_value: 7, base_mode: 'value', base_value: 2, on_error: 'reject' };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.deepEqual(Array.from(result.output_1.features[0].geometry.coordinates, (coordinate) => Array.from(coordinate)), [[1, 2, 2], [1, 2, 9]]);
    assert.equal(result.output_2.features.length, 0);
});

test('Generalizer delega exactamente en Topo Simplify', async () => {
    const registry = loadGeometry();
    const expected = featureCollection([{ type: 'Feature', geometry: null, properties: { delegated: true } }]);
    registry.geo_topo_simplify.run = async () => expected;
    assert.equal(await registry.geo_generalizer.run('1', [featureCollection([])], {}), expected);
});

test('Geometry Coercer convierte polígonos en líneas', async () => {
    const tool = loadGeometry().geo_geometry_coercer;
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] }, properties: { id: 4 } }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: 'line' }) });
    assert.equal(result.features[0].geometry.type, 'LineString');
    assert.equal(result.features[0].properties.id, 4);
});

test('Line Builder agrupa, ordena y elimina puntos duplicados', async () => {
    const tool = loadGeometry().geo_line_builder;
    const input = featureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 0] }, properties: { Job: 'A', img: '2' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 0] }, properties: { Job: 'A', img: '1' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 0] }, properties: { Job: 'A', img: '3' } }
    ]);
    const config = { group_by: 'Job', sort_by: 'img', remove_duplicates: true };
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.deepEqual(Array.from(result.features[0].geometry.coordinates, (coordinate) => Array.from(coordinate)), [[1, 0], [2, 0]]);
});

test('MultiBufferer crea bandas ordenadas y mantiene dos salidas', async () => {
    const tool = loadGeometry().geo_multi_bufferer;
    const config = { output_mode: 'polygons', distances: '20,10', unit: 'meters' };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: 1 } }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.deepEqual(Array.from(result.output_1.features, (feature) => feature.properties._multibuffer_distance), [10, 20]);
    assert.equal(result.output_2.features.length, 0);
});

test('MultiBufferer conserva el modo Desktop de líneas paralelas proyectadas', async () => {
    const tool = loadGeometry().geo_multi_bufferer;
    const config = { output_mode: 'offset_lines', distances: '2', side: 'both', projected_crs: 'EPSG:25830' };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [4, 0]] }, properties: { _crs: 'EPSG:4326' } }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.equal(result.output_1.features.length, 2);
    assert.deepEqual(Array.from(result.output_1.features[0].geometry.coordinates[0]), [0, 2]);
    assert.deepEqual(Array.from(result.output_1.features[1].geometry.coordinates[0]), [0, -2]);
});

test('Offsetter desplaza XYZ sin mutar la entrada', async () => {
    const tool = loadGeometry().geo_offsetter;
    const config = { x_mode: 'fixed', x_value: 2, y_mode: 'fixed', y_value: -1, z_mode: 'fixed', z_value: 3, on_error: 'reject' };
    const input = featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [4, 5, 6] }, properties: {} }]);
    const result = await tool.run('1', [input], { querySelector: () => ({ value: JSON.stringify(config) }) });
    assert.deepEqual(Array.from(result.output_1.features[0].geometry.coordinates), [6, 4, 9]);
    assert.deepEqual(input.features[0].geometry.coordinates, [4, 5, 6]);
});

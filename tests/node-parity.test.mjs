import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

const attributesSource = readFileSync(new URL('../js/nodes/attributes.js', import.meta.url), 'utf8');
const spatialSource = readFileSync(new URL('../js/nodes/spatial.js', import.meta.url), 'utf8');
const geometrySource = readFileSync(new URL('../js/nodes/geometry.js', import.meta.url), 'utf8');
const utilsSource = readFileSync(new URL('../js/nodes/utils.js', import.meta.url), 'utf8');

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

function loadSpatial() {
    const window = { TOOL_REGISTRY: {} };
    const turf = {
        featureCollection,
        flatten: (value) => value,
        dissolve: (value) => value,
        simplify: (value) => value,
        cleanCoords: (value) => value,
        multiPolygon: (coordinates) => ({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates }, properties: {} }),
        booleanIntersects: (feature) => !!feature.properties?.intersects,
        intersect: (feature, overlay) => feature.properties?.intersects === false || overlay?.properties?.intersects === false
            ? null
            : ({ ...feature, geometry: JSON.parse(JSON.stringify(feature.geometry)), properties: { ...feature.properties, part: 'inside' } }),
        difference: (feature) => feature.properties?.partial
            ? { ...feature, properties: { ...feature.properties, part: 'outside' } }
            : null,
        explode: () => featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} }]),
        coordEach: (collection, callback) => collection.features.forEach((feature) => callback(feature.geometry.coordinates)),
        point: (coordinates) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties: {} }),
        nearestPoint: () => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} }),
        distance: () => 0,
        booleanPointOnLine: (point, line) => line.properties?.hit === true,
        booleanPointInPolygon: (point, area) => area.properties?.hit === true,
        booleanEqual: () => false,
        booleanOverlap: () => false,
        booleanWithin: () => false,
        booleanContains: () => false,
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

function loadUtils() {
    const window = { TOOL_REGISTRY: {}, JETLClone: (value) => JSON.parse(JSON.stringify(value)) };
    const turf = { featureCollection, getType: (feature) => feature.geometry?.type || '' };
    vm.runInNewContext(utilsSource, { window, globalThis: window, console, turf }, { filename: 'utils.js' });
    return window.TOOL_REGISTRY;
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

test('el alcance Studio excluye Raster y LiDAR del gate sin borrar compatibilidad heredada', () => {
    const auditUrl = new URL('../scripts/audit-node-parity.mjs', import.meta.url);
    const manifestUrl = new URL('../docs/desktop-node-manifest.json', import.meta.url);
    const scopeUrl = new URL('../docs/studio-node-scope.json', import.meta.url);
    const result = spawnSync(process.execPath, [auditUrl.pathname, manifestUrl.pathname, scopeUrl.pathname], { encoding: 'utf8' });
    assert.equal(result.status, 1, 'el gate debe seguir detectando nodos objetivo pendientes');
    const report = JSON.parse(result.stdout);
    assert.equal(report.desktopCount, 134);
    assert.equal(report.targetDesktopCount, 117);
    assert.equal(report.studioCount, 99);
    assert.equal(report.targetSharedIdCount, 95);
    assert.equal(report.targetMissingInStudio.length, 22);
    assert.equal(report.excludedDesktop.length, 17);
    assert.deepEqual(report.legacyStudioOutOfScope, ['reader_geotiff', 'sp_point_sampling', 'sp_zonal_stats']);
    assert.ok(!report.targetMissingInStudio.includes('reader_lidar'));
    assert.ok(!report.targetMissingInStudio.includes('writer_geotiff'));
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

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

const attributesSource = readFileSync(new URL('../js/nodes/attributes.js', import.meta.url), 'utf8');
const spatialSource = readFileSync(new URL('../js/nodes/spatial.js', import.meta.url), 'utf8');

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
        intersect: (feature) => ({ ...feature, properties: { ...feature.properties, part: 'inside' } }),
        difference: (feature) => feature.properties?.partial
            ? { ...feature, properties: { ...feature.properties, part: 'outside' } }
            : null,
        explode: () => featureCollection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} }]),
        coordEach: (collection, callback) => collection.features.forEach((feature) => callback(feature.geometry.coordinates)),
        point: (coordinates) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties: {} }),
        nearestPoint: () => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} }),
        distance: () => 0
    };
    const context = {
        window,
        globalThis: window,
        console,
        turf,
        JETLClone: (value) => JSON.parse(JSON.stringify(value)),
        normalizeResult: (value) => value
    };
    vm.runInNewContext(spatialSource, context, { filename: 'spatial.js' });
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

test('el alcance Studio excluye Raster y LiDAR del gate sin borrar compatibilidad heredada', () => {
    const auditUrl = new URL('../scripts/audit-node-parity.mjs', import.meta.url);
    const manifestUrl = new URL('../docs/desktop-node-manifest.json', import.meta.url);
    const scopeUrl = new URL('../docs/studio-node-scope.json', import.meta.url);
    const result = spawnSync(process.execPath, [auditUrl.pathname, manifestUrl.pathname, scopeUrl.pathname], { encoding: 'utf8' });
    assert.equal(result.status, 1, 'el gate debe seguir detectando nodos objetivo pendientes');
    const report = JSON.parse(result.stdout);
    assert.equal(report.desktopCount, 134);
    assert.equal(report.targetDesktopCount, 117);
    assert.equal(report.studioCount, 75);
    assert.equal(report.targetSharedIdCount, 71);
    assert.equal(report.targetMissingInStudio.length, 46);
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

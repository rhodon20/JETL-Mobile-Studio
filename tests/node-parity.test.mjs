import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

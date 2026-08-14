import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const engine = readFileSync(new URL('../js/engine.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function loadEntryBuilder() {
    const source = engine.match(/function buildFlowNavigatorEntries[\s\S]*?\n}\nwindow\.buildFlowNavigatorEntries = buildFlowNavigatorEntries;/)?.[0];
    assert.ok(source, 'No se encontró el constructor del navegador');
    const context = { window: {} };
    vm.runInNewContext(source, context, { filename: 'flow-navigator-builder.js' });
    return context.window.buildFlowNavigatorEntries;
}

const flow = {
    drawflow: { Home: { data: {
        1: {
            name: 'reader_osm', data: { place: 'Madrid', layer: 'Edificios' },
            inputs: {}, outputs: { output_1: { connections: [{ node: '2', output: 'input_1' }] } }
        },
        2: {
            name: 'attr_creator', data: { field: 'densidad' },
            inputs: { input_1: { connections: [{ node: '1', input: 'output_1' }] } },
            outputs: { output_1: { connections: [] } }
        }
    } } }
};

const registry = {
    reader_osm: { label: 'OSM Reader', cat: 'Lectores', icon: 'fa-globe', color: '#16a085' },
    attr_creator: { label: 'Attribute Creator', cat: 'Atributos', icon: 'fa-plus', color: '#2980b9' }
};

test('filtra nodos por nombre, categoría, configuración e ID', () => {
    const build = loadEntryBuilder();
    assert.deepEqual(Array.from(build(flow, registry, 'OSM'), (entry) => entry.id), ['1']);
    assert.deepEqual(Array.from(build(flow, registry, 'atributos'), (entry) => entry.id), ['2']);
    assert.deepEqual(Array.from(build(flow, registry, 'densidad'), (entry) => entry.id), ['2']);
    assert.deepEqual(Array.from(build(flow, registry, '1'), (entry) => entry.id), ['1']);
});

test('resume las conexiones de cada resultado', () => {
    const build = loadEntryBuilder();
    const entries = build(flow, registry, '');
    assert.equal(entries[0].outputs, 1);
    assert.equal(entries[1].inputs, 1);
});

test('la interfaz ofrece acceso directo y centra el nodo seleccionado', () => {
    assert.match(index, /data-ui-action="open-flow-navigator"[\s\S]*?JETLOpenFlowNavigator/);
    assert.match(index, /id="flow-navigator-filter"/);
    assert.match(engine, /viewport\.clientWidth \/ 2 - centerX \* zoom/);
    assert.match(engine, /node\.classList\.add\('selected'\)/);
    assert.match(engine, /escapeFlowNavigatorHTML\(entry\.label\)/);
});

test('el centrado aplica una transformación real y selecciona el nodo', () => {
    const source = engine.match(/function focusFlowNode[\s\S]*?\n}\nwindow\.JETLFocusFlowNode = focusFlowNode;/)?.[0];
    assert.ok(source, 'No se encontró la función de centrado');
    const selected = new Set();
    const node = {
        offsetLeft: 300, offsetTop: 400, offsetWidth: 240, offsetHeight: 200,
        classList: { add(value) { selected.add(value); }, remove(value) { selected.delete(value); } },
        animate() {}
    };
    const other = { classList: { remove() {} } };
    let dispatched = null;
    let synced = false;
    const context = {
        window: { innerWidth: 390, JETLSyncCanvasViewport() { synced = true; } },
        document: {
            getElementById(id) {
                if (id === 'node-2') return node;
                if (id === 'drawflow') return { clientWidth: 390, clientHeight: 700 };
                return null;
            },
            querySelectorAll() { return [other, node]; }
        },
        editor: {
            precanvas: { style: {} }, zoom_min: 0.5, zoom: 1,
            dispatch(event, id) { dispatched = [event, id]; }
        },
        currentNodeId: null,
        executionData: {},
        buildTable() {}
    };
    vm.runInNewContext(source, context, { filename: 'flow-navigator-focus.js' });
    assert.equal(context.window.JETLFocusFlowNode('2'), true);
    assert.equal(context.editor.zoom, 0.88);
    assert.match(context.editor.precanvas.style.transform, /^translate\(-/);
    assert.equal(selected.has('selected'), true);
    assert.deepEqual(Array.from(dispatched), ['nodeSelected', '2']);
    assert.equal(synced, true);
});

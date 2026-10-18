import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFlow } from '../js/engine/validate.js';

const registry = {
    reader_csv: { in: 0, out: 1 },
    geo_buffer: { in: 1, out: 1 },
    spatial_clip: { in: 2, out: 2 }
};
// Grafo con el formato de editor.export().drawflow.Home.data.
function graph(nodes, links = []) {
    const data = {};
    nodes.forEach(([id, name, nodeData = {}]) => {
        const tool = registry[name] || { in: 1, out: 1 };
        data[id] = { id, name, data: nodeData, inputs: {}, outputs: {} };
        for (let i = 1; i <= tool.in; i++) data[id].inputs[`input_${i}`] = { connections: [] };
        for (let i = 1; i <= tool.out; i++) data[id].outputs[`output_${i}`] = { connections: [] };
    });
    links.forEach(([from, to, input = 'input_1']) => {
        data[from].outputs.output_1.connections.push({ node: String(to), output: input });
        data[to].inputs[input].connections.push({ node: String(from), input: 'output_1' });
    });
    return data;
}
const levels = (issues) => issues.map((i) => `${i.level}:${i.nodeId}:${i.message}`);

test('un flujo correcto no tiene incidencias', () => {
    assert.deepEqual(validateFlow(graph([[1, 'reader_csv'], [2, 'geo_buffer']], [[1, 2]]), { registry }), []);
});

test('detecta flujo vacío, tipos desconocidos y entradas sin conectar', () => {
    assert.deepEqual(levels(validateFlow({}, { registry })), ['warn:null:El flujo está vacío']);
    const issues = levels(validateFlow(graph([[1, 'reader_csv'], [2, 'spatial_clip'], [3, 'raro']], [[1, 2]]), { registry }));
    assert.ok(issues.includes('error:2:Entrada 2 de 2 sin conectar'));
    assert.ok(issues.includes('error:3:Tipo de nodo desconocido (raro)'));
    assert.ok(!issues.some((i) => i.startsWith('error:2:Entrada 1')));
});

test('marca los nodos de un ciclo', () => {
    const issues = levels(validateFlow(graph([[1, 'geo_buffer'], [2, 'geo_buffer']], [[1, 2], [2, 1]]), { registry }));
    assert.ok(issues.includes('error:1:Forma parte de un ciclo: el flujo no puede ordenarse'));
    assert.ok(issues.includes('error:2:Forma parte de un ciclo: el flujo no puede ordenarse'));
});

test('avisa de lectores sin origen, parámetros no definidos y nodos aislados', () => {
    const g = graph([[1, 'reader_csv'], [2, 'geo_buffer', { dist: '${radio}', unit: '${unidad}' }], [3, 'reader_csv']], [[1, 2]]);
    const issues = levels(validateFlow(g, { registry, params: { unidad: 'm' }, hasReaderSource: (id) => id === '1' }));
    assert.ok(issues.includes('warn:3:Lector sin archivo u origen configurado'));
    assert.ok(issues.includes('warn:2:Usa ${radio}, que no está en Parámetros'));
    assert.ok(!issues.some((i) => i.includes('${unidad}')));
    assert.ok(issues.includes('info:3:No está conectado a ningún otro nodo'));
    // Los errores van primero, luego avisos y sugerencias.
    const order = validateFlow(g, { registry, hasReaderSource: () => false }).map((i) => i.level);
    assert.deepEqual(order, [...order].sort((a, b) => ['error', 'warn', 'info'].indexOf(a) - ['error', 'warn', 'info'].indexOf(b)));
});

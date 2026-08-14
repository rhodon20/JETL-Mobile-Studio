import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../js/engine.js', import.meta.url), 'utf8');

test('el gesto del catálogo distingue tap de scroll', () => {
    const start = engine.indexOf('function createTouchIntentTracker');
    const end = engine.indexOf('window.JETLCreateTouchIntentTracker', start);
    assert.ok(start >= 0 && end > start, 'falta el clasificador de gesto');
    const source = `${engine.slice(start, end)}; window.createTracker = createTouchIntentTracker;`;
    const context = { window: {}, Math };
    vm.runInNewContext(source, context);

    const item = { id: 'reader' };
    const tap = context.window.createTracker(10);
    tap.start(item, 20, 30);
    tap.move(25, 34);
    assert.equal(tap.end(), item, 'un desplazamiento corto conserva el tap');

    const scroll = context.window.createTracker(10);
    scroll.start(item, 20, 30);
    scroll.move(20, 56);
    assert.equal(scroll.end(), null, 'el scroll no puede insertar un nodo');

    const sidebarMarkup = engine.match(/function renderSidebar[\s\S]*?function filterTools/)?.[0] ?? '';
    assert.doesNotMatch(sidebarMarkup, /ontouchend|this\.click\(\)/);
});

test('el botón protagonista ejecuta exclusivamente el flujo completo', () => {
    const runButton = index.match(/<button[^>]+id="mobile-run"[^>]*>/)?.[0] ?? '';
    assert.match(runButton, /aria-label="Ejecutar todo el flujo"/);
    assert.match(runButton, /JETLRunAll\(\)/);
    assert.doesNotMatch(runButton, /runEnginePartial|currentNodeId/);
    assert.match(index, /window\.JETLRunAll = async function[\s\S]*?window\.runEngine\(\)/);
});

test('quicksearch está en la cabecera entre marca y acciones', () => {
    const header = index.match(/<div id="header">[\s\S]*?<\/div>\s*<div class="toolbar-separator"/)?.[0] ?? '';
    const brandPosition = header.indexOf('class="brand"');
    const searchPosition = header.indexOf('id="quick-search"');
    const toolbarPosition = header.indexOf('class="toolbar"');
    assert.ok(brandPosition >= 0 && brandPosition < searchPosition && searchPosition < toolbarPosition);
    assert.match(index, /id="qs-input"[^>]+placeholder="Buscar nodo"/);
    assert.match(engine, /if \(isMobileSearch\(\)\) addNodeClick\(item\.dataset\.k\)/);
});

test('el historial persiste y limita las ejecuciones registradas', () => {
    const start = engine.indexOf("const RUN_HISTORY_KEY");
    const end = engine.indexOf('function renderRunHistory', start);
    assert.ok(start >= 0 && end > start, 'faltan las funciones de historial');
    const source = `${engine.slice(start, end)}; window.loadHistory = loadRunHistory; window.recordReport = publishRunReport;`;
    const values = new Map();
    const context = {
        window: {},
        console,
        SafeStorage: {
            load(key) { return values.get(key) ?? null; },
            save(key, value) { values.set(key, value); },
            clear(key) { values.delete(key); }
        },
        JSON
    };
    vm.runInNewContext(source, context);
    for (let i = 0; i < 35; i += 1) {
        context.window.recordReport({ run_id: i, label: `Ejecución ${i}`, status: 'ok', nodes: [] });
    }
    const history = context.window.loadHistory();
    assert.equal(history.length, 30);
    assert.equal(history[0].run_id, 34);
    assert.equal(history.at(-1).run_id, 5);
    assert.ok(history.every((report) => report.history_id), 'cada ejecución necesita un id seleccionable');
});

test('el historial sustituye a Flujo en el dock y conserva retorno al canvas', () => {
    const dock = index.match(/<nav id="mobile-dock"[\s\S]*?<\/nav>/)?.[0] ?? '';
    assert.match(dock, /<span>Historial<\/span>/);
    assert.doesNotMatch(dock, /<span>Flujo<\/span>/);
    assert.match(engine, /function openRunHistory\(\)[\s\S]*?JETLNativeNav\?\.\('flow'\)/);
});

test('ejecutar todo planifica cada nodo de ramas y componentes desconectados', () => {
    const start = engine.indexOf('function buildExecutionPlan');
    const end = engine.indexOf('window.JETLBuildExecutionPlan', start);
    assert.ok(start >= 0 && end > start, 'falta el planificador topológico');
    const source = `${engine.slice(start, end)}; window.plan = buildExecutionPlan;`;
    const context = { window: {}, Map, Object, String, Number, Error };
    vm.runInNewContext(source, context);
    const graph = {
        1: { inputs: {} },
        2: { inputs: { input_1: { connections: [{ node: '1' }] } } },
        3: { inputs: { input_1: { connections: [{ node: '1' }] } } },
        4: { inputs: { input_1: { connections: [{ node: '2' }, { node: '3' }] } } },
        5: { inputs: {} }
    };
    const plan = context.window.plan(graph);
    assert.deepEqual([...plan.order].sort(), ['1', '2', '3', '4', '5']);
    assert.ok(plan.order.indexOf('1') < plan.order.indexOf('2'));
    assert.ok(plan.order.indexOf('2') < plan.order.indexOf('4'));
    assert.ok(plan.order.indexOf('3') < plan.order.indexOf('4'));

    const cycle = {
        1: { inputs: { input_1: { connections: [{ node: '2' }] } } },
        2: { inputs: { input_1: { connections: [{ node: '1' }] } } }
    };
    assert.throws(() => context.window.plan(cycle), /ciclo/);

    const runSource = engine.match(/async function runEngine\(\)[\s\S]*?function cancelEngineRun/)?.[0] ?? '';
    assert.match(runSource, /buildExecutionPlan\(exportData\)/);
    assert.match(runSource, /for \(const nodeId of level\)[\s\S]*?processNode\(nodeId, exportData\)/);
});

test('un nodo nuevo se autoconecta desde la selección compatible', () => {
    const start = engine.indexOf('function connectNewNodeFromSelection');
    const end = engine.indexOf('window.JETLConnectNewNodeFromSelection', start);
    assert.ok(start >= 0 && end > start, 'falta el autoconectado');
    const calls = [];
    const graph = {
        1: { outputs: { output_1: { connections: [] } }, inputs: {} },
        2: { outputs: {}, inputs: { input_1: { connections: [] } } },
        3: { outputs: {}, inputs: {} }
    };
    const context = {
        window: {}, console,
        editor: { addConnection(...args) { calls.push(args); } },
        _getGraphDataSafe() { return graph; },
        Object, String
    };
    vm.runInNewContext(`${engine.slice(start, end)}; window.connect = connectNewNodeFromSelection;`, context);
    assert.equal(context.window.connect('1', '2'), true);
    assert.deepEqual(calls[0], ['1', '2', 'output_1', 'input_1']);
    assert.equal(context.window.connect('1', '3'), false, 'un destino sin entrada no debe conectarse');

    const addSource = engine.match(/function addNodeClick\(k\)[\s\S]*?\n}\n/)?.[0] ?? '';
    assert.match(addSource, /getSingleSelectedCanvasNodeId\(\)/);
    assert.match(addSource, /connectNewNodeFromSelection\(sourceId, id\)/);
    assert.match(addSource, /selectCanvasNode\(id\)/);
});

test('el historial ofrece detalle, KPIs, filtro y exportación por ejecución', () => {
    assert.match(index, /id="run-history-detail"/);
    assert.match(index, /data-run-history-export="json"/);
    assert.match(index, /data-run-history-export="csv"/);
    assert.match(engine, /<span>Procesados<\/span>/);
    assert.match(engine, /<span>Caché<\/span>/);
    assert.match(engine, /id="run-history-node-filter"/);
    assert.match(engine, /class="run-history-node-table"/);
    assert.match(engine, /function downloadRunReport\(format = 'json', reportOverride = null\)/);
});

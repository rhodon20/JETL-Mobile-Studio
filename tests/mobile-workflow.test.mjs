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

test('abrir un editor de nodo carga su módulo diferido en el primer toque', () => {
    assert.match(engine, /schemaAction === 'calc-open-editor'/);
    assert.match(engine, /schemaAction === 'formatter-open-editor'/);
    assert.match(engine, /'list-concat-open-editor'/);
    assert.match(engine, /'substring-open-editor'/);
    assert.match(engine, /'splitter-open-editor'/);
    assert.match(engine, /'list-exploder-open-editor'/);
    assert.match(engine, /'strrep-open-editor'/);
    assert.match(engine, /'aggregator-open-editor'/);
    assert.match(engine, /'attr-manager-open-editor'/);
    assert.match(engine, /'attr-manager-v2-open-editor'/);
    assert.match(engine, /window\.JETLEnsureExtras\?\.\(\)\.then/);
    assert.match(engine, /window\.JETLSchemaUI\.openFormatterEditor\(nodeId\)/);
    assert.match(engine, /window\.JETLSchemaUI\.openAggregatorEditor\(nodeId\)/);
    assert.match(engine, /window\.JETLSchemaUI\.openAttributeManagerEditor\(nodeId, 'v2'\)/);
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

test('insertar sobre una conexión conserva sus extremos y puertos', () => {
    const start = engine.indexOf('function graphHasConnection');
    const end = engine.indexOf('window.JETLReplaceConnectionWithNode', start);
    assert.ok(start >= 0 && end > start, 'falta la sustitución de conexiones');
    const graph = {
        1: { outputs: { output_2: { connections: [{ node: '2', output: 'input_3' }] } }, inputs: {} },
        2: { outputs: {}, inputs: { input_3: { connections: [{ node: '1', input: 'output_2' }] } } },
        7: { outputs: { output_1: { connections: [] } }, inputs: { input_1: { connections: [] } } }
    };
    const remove = (sourceId, targetId, outputPort, inputPort) => {
        const out = graph[sourceId]?.outputs?.[outputPort]?.connections || [];
        const index = out.findIndex((item) => String(item.node) === String(targetId) && item.output === inputPort);
        if (index < 0) return false;
        out.splice(index, 1);
        const input = graph[targetId].inputs[inputPort].connections;
        const inputIndex = input.findIndex((item) => String(item.node) === String(sourceId) && item.input === outputPort);
        if (inputIndex >= 0) input.splice(inputIndex, 1);
        return true;
    };
    const add = (sourceId, targetId, outputPort, inputPort) => {
        graph[sourceId].outputs[outputPort].connections.push({ node: String(targetId), output: inputPort });
        graph[targetId].inputs[inputPort].connections.push({ node: String(sourceId), input: outputPort });
    };
    const context = {
        window: {}, console, selectedCanvasConnection: {},
        _getGraphDataSafe() { return graph; },
        editor: { removeSingleConnection: remove, addConnection: add },
        Object, String, Error
    };
    vm.runInNewContext(`${engine.slice(start, end)}; window.replace = replaceConnectionWithNode;`, context);
    assert.equal(context.window.replace({ output_id: '1', input_id: '2', output_class: 'output_2', input_class: 'input_3' }, '7'), true);
    assert.equal(graph[1].outputs.output_2.connections[0].node, '7');
    assert.equal(graph[1].outputs.output_2.connections[0].output, 'input_1');
    assert.equal(graph[7].outputs.output_1.connections[0].node, '2');
    assert.equal(graph[7].outputs.output_1.connections[0].output, 'input_3');
    assert.equal(graph[2].inputs.input_3.connections[0].node, '7');
});

test('la inserción sobre conexión es una única operación deshacible y da feedback', () => {
    const addSource = engine.match(/function addNodeClick\(k\)[\s\S]*?\n}\n/)?.[0] ?? '';
    assert.match(addSource, /getSelectedCanvasConnection\(\)/);
    assert.match(addSource, /replaceConnectionWithNode\(connection, id\)/);
    assert.match(addSource, /JETLHistoryTransaction\(mutation\)/);
    assert.match(addSource, /Nodo insertado en la conexión/);
    assert.match(index, /\.drawflow \.connection \.main-path\.selected/);
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

test('el monitor refleja progreso, nodo activo y error navegable', () => {
    const start = engine.indexOf('let activeRunMonitor = null');
    const end = engine.indexOf('function buildExecutionPlan', start);
    assert.ok(start >= 0 && end > start, 'falta el monitor de ejecución');
    const makeClassList = () => {
        const values = new Set();
        return { values, add(...names) { names.forEach((name) => values.add(name)); }, remove(...names) { names.forEach((name) => values.delete(name)); } };
    };
    const nodes = ['1', '2'].map((id) => ({ id: `node-${id}`, classList: makeClassList(), dataset: {} }));
    const ids = ['loader', 'loader-title', 'loader-elapsed', 'loader-msg', 'loader-cancel', 'loader-close', 'loader-focus-error', 'loader-progress-text', 'loader-progress-bar', 'loader-node-time'];
    const elements = Object.fromEntries(ids.map((id) => [id, { id, style: {}, dataset: {}, hidden: false, textContent: '' }]));
    const graph = { 1: { name: 'reader' }, 2: { name: 'writer' } };
    const context = {
        window: { TOOL_REGISTRY: { reader: { label: 'Reader' }, writer: { label: 'Writer' } } },
        document: {
            querySelectorAll(selector) { return selector === '.drawflow-node' ? nodes : []; },
            getElementById(id) { return nodes.find((node) => node.id === id) || elements[id] || null; }
        },
        _getGraphDataSafe() { return graph; },
        setInterval() { return 1; }, clearInterval() {}, setTimeout() { return 2; }, clearTimeout() {},
        Date, Math, Number, String, Set
    };
    vm.runInNewContext(`${engine.slice(start, end)}; window.startMonitor=startRunMonitor; window.updateMonitor=updateRunMonitorNode; window.finishMonitor=finishRunMonitor;`, context);
    context.window.startMonitor('Ejecución Total', ['1', '2']);
    assert.equal(elements.loader.style.display, 'flex');
    assert.ok(nodes[0].classList.values.has('jetl-run-pending'));
    context.window.updateMonitor('1', { status: 'running', ms: 0 });
    assert.ok(nodes[0].classList.values.has('jetl-run-running'));
    assert.match(elements['loader-msg'].textContent, /Reader/);
    context.window.updateMonitor('1', { status: 'ok', ms: 24 });
    assert.equal(elements['loader-progress-text'].textContent, '1/2 nodos · 50%');
    context.window.updateMonitor('2', { status: 'error', ms: 5, error: 'fallo controlado' });
    context.window.finishMonitor('error', '2');
    assert.equal(elements['loader-focus-error'].hidden, false);
    assert.equal(elements['loader-focus-error'].dataset.nodeId, '2');
    assert.ok(nodes[1].classList.values.has('jetl-run-error'));
});

test('la cancelación se registra sin convertirla en un error de nodo', () => {
    const processNode = readFileSync(new URL('../js/processNode.js', import.meta.url), 'utf8');
    assert.match(processNode, /cancelled \? 'cancelled' : 'error'/);
    assert.match(engine, /finishRunMonitor\('cancelled'\)/);
    assert.match(engine, /cancelled_nodes:/);
    assert.match(engine, /<span>Cancelados<\/span>/);
});

test('la ejecución no dispara la animación legacy de cables ni oculta el nodo activo', () => {
    const processNodeSource = readFileSync(new URL('../js/processNode.js', import.meta.url), 'utf8');
    const visualization = readFileSync(new URL('../js/visualization.js', import.meta.url), 'utf8');
    const workerPool = readFileSync(new URL('../js/core/workerPool.js', import.meta.url), 'utf8');
    assert.doesNotMatch(processNodeSource, /anim_CableFlow\(/);
    assert.doesNotMatch(processNodeSource, /anim_NodeSuccess\(/);
    const cableFunction = visualization.match(/function anim_CableFlow[\s\S]*?\n}/)?.[0] ?? '';
    assert.doesNotMatch(cableFunction, /anime\s*\(/);
    assert.match(cableFunction, /strokeDasharray = ''/);
    assert.match(workerPool, /loader'\)\?\.dataset\.status === 'running'/);
    assert.match(workerPool, /loaderMsg && !liveMonitor/);
});

test('el monitor evita indicadores rotatorios que Safari pueda deformar', () => {
    assert.match(index, /class="run-monitor-indicator"/);
    assert.match(index, /#loader\[data-status="error"\] \.run-monitor-indicator/);
    assert.doesNotMatch(index, /class="spinner"/);
    assert.doesNotMatch(index, /@keyframes\s+spin/);
    assert.doesNotMatch(index, /animation:\s*spin/);
});

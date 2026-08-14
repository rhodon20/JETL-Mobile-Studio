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
    const source = `${engine.slice(start, end)}; window.loadHistory = loadRunHistory; window.recordReport = publishRunReport; window.focusId = getRunHistoryFocusId;`;
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
    assert.equal(context.window.focusId({ label: 'Parcial #17', nodes: [] }), '17');
});

test('el historial sustituye a Flujo en el dock y conserva retorno al canvas', () => {
    const dock = index.match(/<nav id="mobile-dock"[\s\S]*?<\/nav>/)?.[0] ?? '';
    assert.match(dock, /<span>Historial<\/span>/);
    assert.doesNotMatch(dock, /<span>Flujo<\/span>/);
    assert.match(engine, /function openRunHistory\(\)[\s\S]*?JETLNativeNav\?\.\('flow'\)/);
});

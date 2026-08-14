import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../js/mobile.js', import.meta.url), 'utf8');
const headScript = index.match(/<script>([\s\S]*?)<\/script>/)?.[1];

class ClassList {
    constructor(...values) { this.values = new Set(values); }
    add(...values) { values.forEach((value) => this.values.add(value)); }
    remove(...values) { values.forEach((value) => this.values.delete(value)); }
    contains(value) { return this.values.has(value); }
    toggle(value, force) {
        const enabled = force === undefined ? !this.contains(value) : !!force;
        if (enabled) this.add(value); else this.remove(value);
        return enabled;
    }
}

function createElement(id, classes = []) {
    const attributes = new Map();
    return {
        id,
        checked: id === 'mobile-state-flow',
        classList: new ClassList(...classes),
        dataset: {},
        style: {},
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; }
    };
}

function bootNavigation() {
    assert.ok(headScript, 'No se encontró el script de arranque');
    const elements = new Map();
    ['flow', 'nodes', 'results', 'project'].forEach((view) => {
        elements.set(`mobile-state-${view}`, createElement(`mobile-state-${view}`, ['mobile-view-state']));
    });
    elements.set('sidebar', createElement('sidebar'));
    elements.set('sidebar-overlay', createElement('sidebar-overlay'));
    elements.set('mobile-project-sheet', createElement('mobile-project-sheet'));
    elements.set('sys-status', createElement('sys-status'));
    elements.set('map', createElement('map'));
    elements.set('logs', createElement('logs'));
    elements.set('table-container', createElement('table-container'));

    const buttons = ['nodes', 'results', 'project'].map((view) => {
        const button = createElement(`button-${view}`);
        button.dataset.mobileView = view;
        const getAttribute = button.getAttribute.bind(button);
        button.getAttribute = (name) => name === 'data-mobile-view' ? view : getAttribute(name);
        return button;
    });
    const resultButtons = ['map', 'table', 'logs'].map((view) => {
        const button = createElement(`result-${view}`, view === 'map' ? ['active'] : []);
        const getAttribute = button.getAttribute.bind(button);
        button.getAttribute = (name) => name === 'data-results-view' ? view : getAttribute(name);
        return button;
    });
    const listeners = new Map();
    const body = { classList: new ClassList() };
    const document = {
        body,
        getElementById(id) { return elements.get(id) ?? null; },
        querySelectorAll(selector) {
            if (selector === '[data-mobile-view]') return buttons;
            if (selector === '#panel-tabs [data-results-view]') return resultButtons;
            if (selector === '.mobile-view-state') return [...elements.values()].filter((element) => element.classList.contains('mobile-view-state'));
            return [];
        },
        addEventListener(type, listener) {
            const values = listeners.get(type) ?? [];
            values.push(listener);
            listeners.set(type, values);
        }
    };
    const window = {
        __JETL_BOOT: undefined,
        addEventListener() {},
        setTimeout() {},
        document,
        navigator: {}
    };
    const context = {
        window,
        document,
        navigator: window.navigator,
        caches: undefined,
        console,
        Promise,
        Date,
        setTimeout() {}
    };
    window.window = window;
    vm.runInNewContext(headScript, context, { filename: 'index-head.js' });
    return { window, document, elements, buttons, resultButtons, listeners };
}

function expectView(env, view) {
    const { document, elements, buttons } = env;
    assert.equal(elements.get(`mobile-state-${view}`).checked, true, `${view}: radio activo`);
    for (const other of ['flow', 'nodes', 'results', 'project'].filter((candidate) => candidate !== view)) {
        assert.equal(elements.get(`mobile-state-${other}`).checked, false, `${view}: radio ${other} inactivo`);
    }
    assert.equal(elements.get('sidebar').classList.contains('open'), view === 'nodes', `${view}: sidebar`);
    assert.equal(document.body.classList.contains('mobile-nodes-open'), view === 'nodes', `${view}: estado nodos`);
    assert.equal(elements.get('sidebar-overlay').style.display, view === 'nodes' ? 'block' : 'none', `${view}: overlay`);
    assert.equal(document.body.classList.contains('mobile-results-open'), view === 'results', `${view}: resultados`);
    assert.equal(document.body.classList.contains('mobile-sheet-open'), view === 'project', `${view}: proyecto`);
    assert.equal(elements.get('mobile-project-sheet').getAttribute('aria-hidden'), view === 'project' ? 'false' : 'true');
    buttons.forEach((button) => {
        assert.equal(button.classList.contains('active'), button.dataset.mobileView === view, `${view}: botón ${button.dataset.mobileView}`);
        assert.equal(button.getAttribute('aria-pressed'), String(button.dataset.mobileView === view), `${view}: aria ${button.dataset.mobileView}`);
    });
}

test('cada destino móvil tiene un botón directo y una regla CSS de respaldo', () => {
    for (const view of ['nodes', 'results', 'project']) {
        assert.match(index, new RegExp(`<input[^>]+id="mobile-state-${view}"`));
        assert.match(index, new RegExp(`<button[^>]+data-mobile-view="${view}"[^>]+onclick="JETLNativeNav\\('${view}'\\)"`));
    }
    assert.match(index, /id="mobile-state-flow"/);
    assert.match(index, /id="mobile-history"[^>]+JETLOpenRunHistory/);
    assert.doesNotMatch(index, /data-mobile-view="flow"/);
    assert.match(index, /#mobile-state-nodes:checked ~ #layout #sidebar/);
    assert.match(index, /body\.mobile-nodes-open #sidebar/);
    assert.match(index, /#mobile-state-results:checked ~ #bottom-panel/);
    assert.match(index, /#mobile-state-project:checked ~ #mobile-project-sheet/);
});

test('la navegación no captura ni cancela fases del mismo gesto', () => {
    assert.doesNotMatch(headScript, /addEventListener\(['"](?:pointerdown|touchstart|touchend|mousedown|click)['"]/);
    assert.doesNotMatch(mobile, /addEventListener\(['"](?:pointerdown|touchstart|touchend)['"]/);
    const dock = index.match(/<nav id="mobile-dock"[\s\S]*?<\/nav>/)?.[0] ?? '';
    assert.doesNotMatch(dock, /ontouch|preventDefault/);
    for (const tag of dock.match(/<button[^>]+data-mobile-view[^>]+>/g) ?? []) {
        assert.doesNotMatch(tag, /stopPropagation/);
    }
    assert.doesNotMatch(index.match(/<label id="sidebar-overlay"[^>]*>/)?.[0] ?? '', /data-ui-action/);
});

test('cada vista de resultados tiene una acción directa y feedback inmediato', async () => {
    for (const view of ['map', 'table', 'logs']) {
        assert.match(index, new RegExp(`data-results-view="${view}"[^>]+onclick="event\\.stopPropagation\\(\\); JETLNativeResultTab\\('${view}'\\)"`));
    }

    const env = bootNavigation();
    for (const view of ['table', 'logs', 'map']) {
        await env.window.JETLNativeResultTab(view);
        const visibleId = view === 'table' ? 'table-container' : view;
        for (const id of ['map', 'logs', 'table-container']) {
            assert.equal(env.elements.get(id).style.display, id === visibleId ? 'block' : 'none', `${view}: contenido ${id}`);
        }
        env.resultButtons.forEach((button) => {
            const active = button.getAttribute('data-results-view') === view;
            assert.equal(button.classList.contains('active'), active, `${view}: estado visual`);
            assert.equal(button.getAttribute('aria-selected'), String(active), `${view}: estado accesible`);
        });
    }
});

test('la transición es determinista, idempotente y permite cambiar de vista', () => {
    const env = bootNavigation();
    const sequence = ['nodes', 'nodes', 'project', 'flow', 'results', 'flow', 'nodes'];
    sequence.forEach((view) => {
        env.window.JETLNativeNav(view);
        expectView(env, view);
    });
});

test('el cambio nativo del radio activa la vista sin depender de click o touch', () => {
    const env = bootNavigation();
    const state = env.elements.get('mobile-state-project');
    state.checked = true;
    const changeHandlers = env.listeners.get('change') ?? [];
    assert.equal(changeHandlers.length, 1, 'debe existir un único sincronizador de estado');
    changeHandlers[0]({ target: state });
    expectView(env, 'project');
});

test('las librerías GIS no se cargan automáticamente al terminar la página', () => {
    const loadBlock = index.match(/window\.addEventListener\('load',[\s\S]*?\}, \{ once: true \}\);\s*<\/script>/)?.[0] ?? '';
    assert.ok(loadBlock, 'No se encontró el bloque de carga diferida');
    assert.doesNotMatch(loadBlock, /\n\s*loadJETLRuntime\(\);/);
    assert.match(index, /window\.JETLEnsureRuntime = loadJETLRuntime/);
});

test('ningún módulo auxiliar forma parte del arranque automático', () => {
    const extras = index.match(/const JETL_EXTRA_SCRIPTS = \[([\s\S]*?)\];/)?.[1] ?? '';
    assert.ok(extras, 'No se encontró la lista de módulos auxiliares');
    assert.match(extras, /schemaUI/);
    assert.match(extras, /templates/);
    assert.match(extras, /packages/);
    assert.doesNotMatch(extras, /modalSystem/);
    const loadHandler = index.match(/window\.addEventListener\('load',[\s\S]*?\}, \{ once: true \}\);/)?.[0] ?? '';
    assert.doesNotMatch(loadHandler, /loadJETLExtras/);
    assert.match(index, /window\.JETLEnsureExtras = loadJETLExtras/);
});

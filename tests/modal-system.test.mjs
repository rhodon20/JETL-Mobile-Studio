import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/modalSystem.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../js/schemaUI.js', import.meta.url), 'utf8');
const attributes = readFileSync(new URL('../js/nodes/attributes.js', import.meta.url), 'utf8');

class ObservableClassList {
    constructor(owner, ...values) {
        this.owner = owner;
        this.values = new Set(values);
    }

    contains(value) { return this.values.has(value); }

    add(...values) {
        values.forEach((value) => this.values.add(value));
        this.owner.notifyClassMutation();
    }

    remove(...values) {
        values.forEach((value) => this.values.delete(value));
        this.owner.notifyClassMutation();
    }
}

function createModal(display) {
    const attributes = new Map();
    const modal = {
        display,
        dataset: {},
        observer: null,
        mutationCount: 0,
        querySelectorAll() { return []; },
        querySelector() { return null; },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        notifyClassMutation() {
            this.mutationCount++;
            if (this.mutationCount > 10) throw new Error('Bucle de mutaciones de clase');
            this.observer?.();
        }
    };
    modal.classList = new ObservableClassList(modal, 'modal');
    return modal;
}

function executeWithModal(display) {
    const modal = createModal(display);
    const body = createModal('block');
    body.classList = new ObservableClassList(body);
    const listeners = new Map();
    const document = {
        activeElement: null,
        body,
        contains() { return false; },
        querySelectorAll(selector) { return selector === '.modal' ? [modal] : []; },
        addEventListener(type, listener) { listeners.set(type, listener); }
    };
    class MutationObserver {
        constructor(callback) { this.callback = callback; }
        observe(element) { element.observer = () => this.callback([]); }
    }
    const window = {
        getComputedStyle(element) { return { display: element.display }; },
        requestAnimationFrame(callback) { callback(); },
        setTimeout(callback) { callback(); }
    };
    vm.runInNewContext(source, { window, document, MutationObserver, console }, { filename: 'modalSystem.js' });
    return { modal, body, listeners };
}

test('un modal oculto no realimenta su propio MutationObserver', () => {
    const { modal } = executeWithModal('none');
    assert.equal(modal.mutationCount, 0);
    assert.equal(modal.getAttribute('aria-hidden'), 'true');
});

test('un modal visible converge tras una sola mutación de clase', () => {
    const { modal, body } = executeWithModal('flex');
    assert.equal(modal.mutationCount, 1);
    assert.equal(modal.classList.contains('is-open'), true);
    assert.equal(modal.getAttribute('aria-hidden'), 'false');
    assert.equal(body.classList.contains('modal-open'), true);
});

test('los módulos auxiliares tienen versión nueva y sólo carga explícita', () => {
    assert.match(index, /const JETL_EXTRAS_VERSION = '20260824-15'/);
    assert.match(index, /const JETL_EXTRA_SCRIPTS = \[\s*'js\/modalSystem\.js',\s*'js\/schemaUI\.js'/);
    assert.match(index, /script\.src = src \+ '\?v=' \+ JETL_EXTRAS_VERSION/);
    assert.match(index, /window\.JETLEnsureExtras = loadJETLExtras/);
});

test('String Formatter usa el contrato modal de Desktop y persiste JSON', () => {
    assert.match(index, /id="formatter-editor-modal"[^>]+aria-modal="true"/);
    assert.match(index, /data-ui-action="save-formatter-editor"/);
    assert.match(attributes, /data-schema-action="formatter-open-editor"/);
    assert.match(attributes, /data-schema-action="list-concat-open-editor"/);
    assert.match(attributes, /data-schema-action="substring-open-editor"/);
    assert.match(index, /id="attribute-text-editor-modal"/);
    assert.match(schema, /openAttributeTextEditor/);
    assert.match(attributes, /textarea df-config/);
    assert.match(attributes, /JSON\.parse\(configRaw\)/);
    assert.match(schema, /function openFormatterEditor\(nodeId\)/);
    assert.match(schema, /openCalcEditor,/);
    assert.match(schema, /_commitNodeControl\(configControl, JSON\.stringify\(config\)\)/);
    assert.match(schema, /new Event\('input', \{ bubbles: true \}\)/);
    assert.match(schema, /else if \(nodeEl\?\.classList\.contains\('attr_string_formatter'\)\)/);
});

test('String Formatter ejecuta la configuración JSON del modal', async () => {
    const context = {
        window: { TOOL_REGISTRY: {} },
        console,
        resolveParamText(value) { return String(value ?? ''); },
        turf: { featureCollection(features) { return { type: 'FeatureCollection', features }; } }
    };
    vm.runInNewContext(attributes, context, { filename: 'attributes.js' });
    const config = JSON.stringify({ fields: ['name'], operation: 'upper', arguments: '', onError: 'null' });
    const dom = { querySelector(selector) { return selector === '[df-config]' ? { value: config } : null; } };
    const input = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Madrid' } }] };
    const output = await context.window.TOOL_REGISTRY.attr_string_formatter.run('1', [input], dom);
    assert.equal(output.features[0].properties.name, 'MADRID');
});

test('los editores móviles son modales centrados y no hojas inferiores', () => {
    const mobileModal = index.match(/\.modal \{\s*align-items: center;[\s\S]*?\.node-editor-field-list \{ grid-template-columns: 1fr;/)?.[0] ?? '';
    assert.match(mobileModal, /max-height: calc\(100dvh/);
    assert.match(mobileModal, /border-radius: 16px !important/);
    assert.doesNotMatch(mobileModal, /align-items: flex-end/);
    assert.doesNotMatch(mobileModal, /22px 22px 0 0/);
});

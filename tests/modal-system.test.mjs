import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/modalSystem.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

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

test('la página fuerza una versión nueva de los módulos post-arranque', () => {
    assert.match(index, /const JETL_POST_BOOT_VERSION = '20260814-10'/);
    assert.match(index, /script\.src = JETL_POST_BOOT_SCRIPTS\[index\+\+\] \+ '\?v=' \+ JETL_POST_BOOT_VERSION/);
});

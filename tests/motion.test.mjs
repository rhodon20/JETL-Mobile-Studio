import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../js/engine.js', import.meta.url), 'utf8');
const motion = readFileSync(new URL('../js/motion.js', import.meta.url), 'utf8');
const parity = readFileSync(new URL('../docs/NODE_CATALOG_PARITY.md', import.meta.url), 'utf8');

class FakeElement {
    constructor() {
        this.style = { removeProperty() {} };
    }
    animate() {}
    querySelector() { return null; }
}

function bootMotion(prefersReducedMotion = false) {
    const calls = [];
    function anime(options) {
        calls.push(options);
        options.complete?.();
        return options;
    }
    anime.remove = () => {};
    anime.stagger = (step) => () => step;
    const document = {
        querySelectorAll() { return []; },
        querySelector() { return null; },
        getElementById() { return null; }
    };
    const window = {
        anime,
        document,
        matchMedia() { return { matches: prefersReducedMotion }; }
    };
    vm.runInNewContext(motion, { window, document, Element: FakeElement }, { filename: 'motion.js' });
    return { api: window.JETLMotion, calls };
}

test('Anime.js se prepara como capa de UI y no se duplica en el runtime GIS', () => {
    assert.match(index, /const JETL_MOTION_VERSION = '20260824-1'/);
    assert.match(index, /window\.JETLEnsureMotion = loadJETLMotion/);
    assert.match(index, /requestIdleCallback\(warmMotion/);
    const runtimeScripts = index.match(/const JETL_RUNTIME_SCRIPTS = \[([\s\S]*?)\];/)?.[1] ?? '';
    assert.doesNotMatch(runtimeScripts, /anime\.min\.js/);
    assert.match(index, /await loadJETLMotion\(\)\.catch/);
});

test('la entrada de nodo es breve, no elástica y usa transform/opacidad', () => {
    const { api, calls } = bootMotion(false);
    api.enterNode(new FakeElement());
    assert.equal(calls.length, 1);
    assert.equal(calls[0].duration, 220);
    assert.equal(calls[0].easing, 'easeOutCubic');
    assert.deepEqual(Array.from(calls[0].opacity), [0, 1]);
    assert.deepEqual(Array.from(calls[0].scale), [.97, 1]);
    assert.doesNotMatch(calls[0].easing, /elastic/i);
    assert.match(engine, /window\.JETLMotion\.enterNode\(el\)/);
});

test('prefers-reduced-motion evita iniciar animaciones', () => {
    const { api, calls } = bootMotion(true);
    api.enterNode(new FakeElement());
    api.surfaceIn(new FakeElement());
    assert.equal(calls.length, 0);
});

test('el inventario Studio es reproducible y la paridad de catálogo queda fijada', () => {
    const output = execFileSync(process.execPath, ['scripts/audit-node-parity.mjs'], {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8'
    });
    const report = JSON.parse(output);
    assert.equal(report.studioCount, 67);
    assert.equal(report.studio.length, 67);
    assert.match(parity, /mismo catálogo funcional de nodos/);
    assert.match(parity, /requiere\s+backend/);
});

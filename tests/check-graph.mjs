// Dependency graph of the app's classic scripts (they share globals, not imports).
//
// Every script belongs to a layer; a script may use globals defined by its own layer
// or lower ones. Using a global defined higher up (e.g. the engine calling a UI
// function) is an "upward" edge; mutual references between files form cycles; a
// global assigned by more than one file has no single owner.
//
// The current violations are recorded in tests/graph-baseline.json. The check fails
// when a new one appears and asks to shrink the baseline when one disappears, so the
// graph can only get cleaner.
//
// Usage: node tests/check-graph.mjs [--update] [--report]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { analyze } from 'eslint-scope';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'tests', 'graph-baseline.json');

// Lowest to highest. Files not listed here fail the check.
const LAYERS = {
    boot: ['inline:head'],
    core: ['js/core.js', 'js/params.js'],
    services: ['js/formats.js', 'js/core/workerPool.js', 'js/basemap.js', 'js/motion.js'],
    nodes: ['js/nodes/readers.js', 'js/nodes/geometry.js', 'js/nodes/utils.js', 'js/nodes/spatial.js',
        'js/nodes/attributes.js', 'js/nodes/raster.js', 'js/nodes/writers.js', 'js/tools.js'],
    engine: ['js/processNode.js'],
    state: ['js/state/history.js', 'js/projectPersistence.js', 'js/templates.js', 'js/packages.js'],
    ui: ['js/visualization.js', 'js/schemaUI.js', 'js/modalSystem.js', 'js/mobile.js'],
    app: ['js/engine.js', 'inline:loader'],
    dev: ['js/smoke.js']
};
const LAYER_NAMES = Object.keys(LAYERS);
const layerOf = {};
LAYER_NAMES.forEach((l, i) => LAYERS[l].forEach(f => { layerOf[f] = i; }));

const VENDOR_GLOBALS = new Set(['L', 'turf', 'Drawflow', 'shp', 'geoblaze', 'GeoTIFF', 'osmtogeojson', 'proj4',
    'wellknown', 'GeoPackage', 'anime', 'jsts', 'rbush', 'RBush', 'maplibregl', 'MaplibreGLLeaflet']);
const BROWSER_GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis), 'window', 'document', 'navigator',
    'location', 'localStorage', 'sessionStorage', 'console', 'fetch', 'Blob', 'File', 'FileReader', 'URL', 'Worker',
    'performance', 'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
    'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'Event', 'CustomEvent', 'DOMParser', 'XMLSerializer', 'Image',
    'getComputedStyle', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'KeyboardEvent', 'DataTransfer',
    'FormData', 'AbortController', 'crypto', 'screen', 'history', 'indexedDB', 'caches', 'self', 'addEventListener',
    'removeEventListener', 'dispatchEvent', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'matchMedia', 'open',
    'scrollTo', 'event', 'print', 'name', 'status', 'global', 'module', 'require', 'Response', 'Request', 'Headers',
    'visualViewport', 'PointerEvent', 'TouchEvent', 'ShadowRoot', 'getSelection', 'arguments', 'undefined']);

function readSources() {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    const sources = {
        // The first inline script is the head boot code; the core inline block is made
        // of js/ files (scripts/inline-assets.mjs) and is analysed through them; the
        // last one is the runtime loader.
        'inline:head': inline[0],
        'inline:loader': inline[inline.length - 1]
    };
    Object.values(LAYERS).flat().filter(f => !f.startsWith('inline:'))
        .forEach(f => { sources[f] = fs.readFileSync(path.join(ROOT, f), 'utf8'); });
    const deferred = [...html.matchAll(/<script defer src="(js\/[^"?]+)/g)].map(m => m[1]);
    const lazy = [...html.matchAll(/'(js\/[a-zA-Z/]+\.js)'/g)].map(m => m[1]).filter(f => !f.startsWith('js/vendor/'));
    const known = new Set(Object.keys(sources));
    const unlisted = [...new Set([...deferred, ...lazy])].filter(f => !known.has(f));
    return { sources, unlisted };
}

function analyseFile(code) {
    const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', ranges: true, allowHashBang: true });
    const scope = analyze(ast, { ecmaVersion: 2022 }).globalScope;
    const defines = new Set(scope.variables.map(v => v.name));
    const writes = new Set();
    walk.simple(ast, {
        AssignmentExpression(n) {
            const l = n.left;
            if (l.type === 'MemberExpression' && !l.computed && l.object.type === 'Identifier' && l.object.name === 'window') {
                writes.add(l.property.name);
            }
        }
    });
    const uses = new Set(scope.through.map(r => r.identifier.name));
    walk.simple(ast, {
        MemberExpression(n) {
            if (!n.computed && n.object.type === 'Identifier' && n.object.name === 'window') uses.add(n.property.name);
        }
    });
    return { defines, writes, uses };
}

export function computeViolations() {
    const { sources, unlisted } = readSources();
    const info = {};
    for (const [file, code] of Object.entries(sources)) info[file] = analyseFile(code);

    const owners = {};
    for (const [file, i] of Object.entries(info)) {
        for (const name of new Set([...i.defines, ...i.writes])) (owners[name] = owners[name] || new Set()).add(file);
    }
    const violations = new Set(unlisted.map(f => `unlisted: ${f} is loaded but has no layer`));
    const edges = {};
    for (const [file, i] of Object.entries(info)) {
        edges[file] = new Set();
        for (const name of i.uses) {
            if (VENDOR_GLOBALS.has(name) || BROWSER_GLOBALS.has(name)) continue;
            if (i.defines.has(name) || i.writes.has(name)) continue;
            const defs = [...(owners[name] || [])];
            for (const d of defs) {
                edges[file].add(d);
                if (layerOf[d] > layerOf[file]) {
                    violations.add(`upward: ${file} (${LAYER_NAMES[layerOf[file]]}) uses ${name} from ${d} (${LAYER_NAMES[layerOf[d]]})`);
                }
            }
        }
    }
    for (const [name, files] of Object.entries(owners)) {
        if (files.size > 1) violations.add(`shared-owner: ${name} is defined/assigned by ${[...files].sort().join(', ')}`);
    }
    // Cycles: strongly connected components with more than one file.
    let index = 0;
    const idx = {}; const low = {}; const stack = []; const on = new Set();
    const strong = (v) => {
        idx[v] = low[v] = index++; stack.push(v); on.add(v);
        for (const w of edges[v]) {
            if (idx[w] === undefined) { strong(w); low[v] = Math.min(low[v], low[w]); } else if (on.has(w)) low[v] = Math.min(low[v], idx[w]);
        }
        if (low[v] === idx[v]) {
            const comp = []; let w;
            do { w = stack.pop(); on.delete(w); comp.push(w); } while (w !== v);
            if (comp.length > 1) violations.add(`cycle: ${comp.sort().join(' <-> ')}`);
        }
    };
    Object.keys(edges).forEach(v => { if (idx[v] === undefined) strong(v); });
    return { violations: [...violations].sort(), edges };
}

const { violations, edges } = computeViolations();
if (process.argv.includes('--report')) {
    for (const [f, ds] of Object.entries(edges)) console.log(`${f} -> ${[...ds].sort().join(', ')}`);
}
if (process.argv.includes('--update')) {
    fs.writeFileSync(BASELINE, JSON.stringify(violations, null, 2) + '\n');
    console.log(`[check-graph] baseline written: ${violations.length} violations`);
    process.exit(0);
}
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : [];
const added = violations.filter(v => !baseline.includes(v));
const fixed = baseline.filter(v => !violations.includes(v));
const byKind = (list) => Object.entries(list.reduce((a, v) => { const k = v.split(':')[0]; a[k] = (a[k] || 0) + 1; return a; }, {}))
    .map(([k, n]) => `${k} ${n}`).join(', ');
if (added.length) {
    console.error(`[check-graph] ${added.length} new violation(s):\n  ` + added.join('\n  '));
    process.exit(1);
}
if (fixed.length) {
    console.error(`[check-graph] ${fixed.length} violation(s) fixed; shrink the baseline with: node tests/check-graph.mjs --update\n  ` + fixed.join('\n  '));
    process.exit(1);
}
console.log(`[check-graph] OK — ${violations.length} known violations (${byKind(violations) || 'none'})`);

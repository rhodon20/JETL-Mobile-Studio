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
// app holds the commands (project, nodes, runs); the ui invokes them and they
// report back through JETLEvents. shell starts the app and wires the DOM, so it
// may use every layer below it.
const LAYERS = {
    boot: ['inline:head'],
    core: ['js/core.js', 'js/params.js'],
    services: ['js/formats.js', 'js/core/workerPool.js', 'js/basemap.js', 'js/motion.js', 'js/core/crs.js', 'inline:loader'],
    nodes: ['js/nodes/readers.js', 'js/nodes/geometry.js', 'js/nodes/utils.js', 'js/nodes/spatial.js',
        'js/nodes/attributes.js', 'js/nodes/raster.js', 'js/nodes/writers.js', 'js/tools.js'],
    engine: ['js/processNode.js', 'js/engine/dirty.js', 'js/engine/runPlan.js'],
    state: ['js/state/history.js', 'js/state/draft.js', 'js/state/runHistory.js', 'js/projectPersistence.js', 'js/packages.js'],
    app: ['js/engine.js', 'js/templates.js'],
    ui: ['inline:nav', 'js/visualization.js', 'js/schemaUI.js', 'js/modalSystem.js', 'js/mobile.js', 'js/ui/catalog.js', 'js/ui/runPanel.js', 'js/ui/buildInfo.js', 'js/ui/notify.js', 'js/ui/draftPrompt.js'],
    shell: ['js/shell.js'],
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
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
        .map(m => ({ attrs: m[1], code: m[2] }));
    // The core inline block is made of js/ files (scripts/inline-assets.mjs) and is
    // analysed through them; data-jetl-nav is the early mobile navigation; the last
    // inline script is the runtime loader; the other inline scripts in the head are
    // the boot code.
    const loader = inline[inline.length - 1];
    const sources = {
        'inline:head': inline.filter(s => s !== loader && !/data-jetl-(nav|core-inline)/.test(s.attrs)).map(s => s.code).join('\n'),
        'inline:nav': inline.filter(s => /data-jetl-nav/.test(s.attrs)).map(s => s.code).join('\n'),
        'inline:loader': loader.code
    };
    Object.values(LAYERS).flat().filter(f => !f.startsWith('inline:'))
        .forEach(f => { sources[f] = fs.readFileSync(path.join(ROOT, f), 'utf8'); });
    const deferred = [...html.matchAll(/<script (?:defer|type="module") src="(js\/[^"?]+)/g)].map(m => m[1]);
    const modules = new Set([
        ...[...html.matchAll(/<script type="module" src="(js\/[^"?]+)/g)].map(m => m[1]),
        // Loaded on demand with import(): the extras list and literal import('./js/...').
        ...[...(html.match(/const JETL_EXTRA_MODULES = \[([\s\S]*?)\]/)?.[1] || '').matchAll(/'([^']+)'/g)].map(m => m[1]),
        ...[...html.matchAll(/import\('\.\/(js\/[^'?]+)/g)].map(m => m[1])
    ]);
    const lazy = [...html.matchAll(/'(js\/[a-zA-Z/]+\.js)'/g)].map(m => m[1]).filter(f => !f.startsWith('js/vendor/'));
    // Modules reached through `import` are modules too (and are loaded that way).
    const pending = [...modules];
    while (pending.length) {
        const file = pending.pop();
        if (!(file in sources)) continue;
        const ast = acorn.parse(sources[file], { ecmaVersion: 2022, sourceType: 'module' });
        ast.body.filter(n => n.source && /^(Import|Export(Named|All))Declaration$/.test(n.type)).forEach(n => {
            const target = path.posix.join(path.posix.dirname(file), n.source.value);
            if (!modules.has(target)) { modules.add(target); pending.push(target); }
        });
    }
    const known = new Set(Object.keys(sources));
    const unlisted = [...new Set([...deferred, ...lazy])].filter(f => !known.has(f));
    return { sources, unlisted, modules };
}

// ES modules declare nothing global: what they share goes through `export` (or an
// explicit window.X), and what they need through `import` (or classic globals).
function analyseFile(code, file, isModule) {
    const sourceType = isModule ? 'module' : 'script';
    const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType, ranges: true, allowHashBang: true });
    const scope = analyze(ast, { ecmaVersion: 2022, sourceType }).globalScope;
    const defines = new Set(isModule ? [] : scope.variables.map(v => v.name));
    // Top-level names of a module are private to it (imported ones included).
    const moduleScope = isModule ? scope.childScopes.find(s => s.type === 'module') : null;
    const privateNames = new Set(moduleScope ? moduleScope.variables.map(v => v.name) : []);
    const imports = new Set();
    if (isModule) {
        ast.body.filter(n => n.type === 'ImportDeclaration' || ((n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration') && n.source))
            .forEach(n => imports.add(path.posix.join(path.posix.dirname(file), n.source.value)));
    }
    // In a module, assigning a name nobody declares throws (strict mode).
    const undeclaredWrites = new Set(isModule ? scope.through.filter(r => r.isWrite()).map(r => r.identifier.name) : []);
    const writes = new Set();
    walk.simple(ast, {
        CallExpression(n) {
            // Object.assign(window, { a, b }) publishes a and b.
            const c = n.callee;
            if (c.type === 'MemberExpression' && c.object.name === 'Object' && c.property.name === 'assign' &&
                n.arguments[0]?.type === 'Identifier' && n.arguments[0].name === 'window' && n.arguments[1]?.type === 'ObjectExpression') {
                n.arguments[1].properties.forEach(prop => { if (prop.key?.type === 'Identifier') writes.add(prop.key.name); });
            }
        },
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
    return { defines, writes, uses, imports, undeclaredWrites, privateNames };
}

export function computeViolations() {
    const { sources, unlisted, modules } = readSources();
    const info = {};
    for (const [file, code] of Object.entries(sources)) info[file] = analyseFile(code, file, modules.has(file));

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
                // The dev layer (smoke suite) is fetched on demand by its loader and
                // never runs in normal use, so looking it up is not a dependency.
                if (LAYER_NAMES[layerOf[d]] === 'dev' && d !== file) continue;
                edges[file].add(d);
                if (layerOf[d] > layerOf[file]) {
                    violations.add(`upward: ${file} (${LAYER_NAMES[layerOf[file]]}) uses ${name} from ${d} (${LAYER_NAMES[layerOf[d]]})`);
                }
            }
        }
    }
    for (const [file, i] of Object.entries(info)) {
        for (const target of i.imports) {
            if (!(target in info)) { violations.add(`import: ${file} imports ${target}, which has no layer`); continue; }
            edges[file].add(target);
            if (layerOf[target] > layerOf[file]) {
                violations.add(`upward: ${file} (${LAYER_NAMES[layerOf[file]]}) imports ${target} (${LAYER_NAMES[layerOf[target]]})`);
            }
        }
        // A bare name another module keeps private is a ReferenceError at runtime.
        for (const name of i.uses) {
            if (owners[name] || i.privateNames.has(name) || BROWSER_GLOBALS.has(name) || VENDOR_GLOBALS.has(name)) continue;
            const holder = Object.keys(info).find(f => f !== file && info[f].privateNames.has(name));
            if (holder) violations.add(`private: ${file} uses ${name}, which is private to ${holder}`);
        }
        for (const name of i.undeclaredWrites) {
            if (!owners[name] && !BROWSER_GLOBALS.has(name)) violations.add(`undeclared-write: ${file} assigns ${name}, which no script declares`);
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

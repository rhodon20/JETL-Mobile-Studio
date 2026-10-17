#!/usr/bin/env node
// Compara la configuración de los nodos compartidos con JETL Desktop: los campos
// `df-*` que cada plantilla (`tpl()`) guarda en el proyecto, sus valores por
// defecto y las opciones de los desplegables. Complementa a audit-node-parity.mjs,
// que sólo compara identificadores y puertos.
//
// Necesita un clon local de JETL Desktop (no se ejecuta en CI):
//   node scripts/audit-node-params.mjs <ruta-jetl-desktop> [--summary]
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const desktopRoot = process.argv[2];
if (!desktopRoot) {
    console.error('Uso: node scripts/audit-node-params.mjs <ruta-jetl-desktop> [--summary]');
    process.exit(2);
}

function loadRegistry(nodesDir) {
    const registry = {};
    const noop = () => {};
    const browser = { TOOL_REGISTRY: registry, addEventListener: noop, removeEventListener: noop };
    const context = vm.createContext({
        window: browser,
        globalThis: browser,
        console: { log: noop, info: noop, warn: noop, error: noop },
        URL, Blob, TextEncoder, TextDecoder, setTimeout, clearTimeout,
        JETLEscapeHtml: (value) => String(value ?? ''),
        resolveParamText: (value) => String(value ?? ''),
        // Algunos archivos registran listeners del DOM al cargar; aquí no hace falta un DOM real.
        document: { addEventListener: noop, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }) }
    });
    for (const filename of readdirSync(nodesDir).filter((name) => name.endsWith('.js')).sort()) {
        vm.runInContext(readFileSync(resolve(nodesDir, filename), 'utf8'), context, { filename });
    }
    return registry;
}

const attribute = (attrs, name) => {
    const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
    return match ? (match[1] ?? match[2] ?? match[3]) : null;
};

// Campos df-* de una plantilla con su valor inicial (lo que se guarda en el proyecto).
function fieldsOf(html) {
    const fields = {};
    const tagPattern = /<(input|select|textarea)\b([^>]*)>/gi;
    let match;
    while ((match = tagPattern.exec(html))) {
        const [, tag, attrs] = match;
        const df = attrs.match(/\bdf-([\w-]+)/);
        if (!df) continue;
        const kind = tag.toLowerCase();
        const type = (attribute(attrs, 'type') || '').toLowerCase();
        if (kind === 'select') {
            const body = html.slice(match.index, html.indexOf('</select>', match.index));
            const options = [...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)]
                .map((option) => ({ value: attribute(option[1], 'value') ?? option[2].trim(), selected: /\bselected\b/i.test(option[1]) }));
            fields[df[1]] = { value: (options.find((o) => o.selected) || options[0] || {}).value ?? null, options: options.map((o) => o.value) };
        } else if (kind === 'textarea') {
            fields[df[1]] = { value: html.slice(match.index + match[0].length, html.indexOf('</textarea>', match.index)).trim() };
        } else if (type === 'checkbox' || type === 'radio') {
            fields[df[1]] = { value: /\bchecked\b/i.test(attrs) };
        } else {
            fields[df[1]] = { value: attribute(attrs, 'value') ?? '' };
        }
    }
    return fields;
}

function describe(registry) {
    return Object.fromEntries(Object.entries(registry).map(([id, node]) => {
        let html = '';
        try { html = typeof node.tpl === 'function' ? String(node.tpl('1') ?? '') : ''; } catch (error) {
            throw new Error(`${id}.tpl(): ${error.message}`);
        }
        return [id, fieldsOf(html)];
    }));
}

const desktop = describe(loadRegistry(resolve(desktopRoot, 'js/nodes')));
const studio = describe(loadRegistry(resolve(projectRoot, 'js/nodes')));

// Alcance: el de audit-node-parity.mjs (manifiesto Desktop + exclusiones de Studio).
const manifest = JSON.parse(readFileSync(resolve(projectRoot, 'docs/desktop-node-manifest.json'), 'utf8'));
const scope = JSON.parse(readFileSync(resolve(projectRoot, 'docs/studio-node-scope.json'), 'utf8'));
const excludedIds = new Set((scope.excludedNodeIds || []).map(String));
const excludedCategories = new Set((scope.excludedCategories || []).map((value) => String(value).toLowerCase()));
const target = manifest.nodes
    .filter((node) => !excludedIds.has(String(node.id)) && !excludedCategories.has(String(node.category || node.cat || '').toLowerCase()))
    .map((node) => String(node.id))
    .filter((id) => desktop[id] && studio[id])
    .sort();

const nodes = target.flatMap((id) => {
    const d = desktop[id];
    const s = studio[id];
    const onlyDesktop = Object.keys(d).filter((name) => !(name in s));
    const onlyStudio = Object.keys(s).filter((name) => !(name in d));
    const defaults = Object.keys(d)
        .filter((name) => name in s && JSON.stringify(d[name].value) !== JSON.stringify(s[name].value))
        .map((name) => ({ field: name, desktop: d[name].value, studio: s[name].value }));
    const options = Object.keys(d)
        .filter((name) => name in s && d[name].options && s[name].options && JSON.stringify(d[name].options) !== JSON.stringify(s[name].options))
        .map((name) => ({
            field: name,
            onlyDesktop: d[name].options.filter((o) => !s[name].options.includes(o)),
            onlyStudio: s[name].options.filter((o) => !d[name].options.includes(o))
        }));
    return onlyDesktop.length || onlyStudio.length || defaults.length || options.length
        ? [{ id, onlyDesktop, onlyStudio, defaults, options }]
        : [];
});

const report = {
    desktopRoot: resolve(desktopRoot),
    comparedNodes: target.length,
    nodesWithDifferences: nodes.length,
    nodes
};
if (process.argv.includes('--summary')) {
    console.log(`Nodos comparados: ${report.comparedNodes}; con diferencias de configuración: ${report.nodesWithDifferences}`);
    for (const row of nodes) {
        const parts = [];
        if (row.onlyDesktop.length) parts.push(`sólo Desktop: ${row.onlyDesktop.join(', ')}`);
        if (row.onlyStudio.length) parts.push(`sólo Studio: ${row.onlyStudio.join(', ')}`);
        row.defaults.forEach((d) => parts.push(`defecto ${d.field}: ${JSON.stringify(d.desktop)} → ${JSON.stringify(d.studio)}`));
        row.options.forEach((o) => parts.push(`opciones ${o.field}: sólo Desktop [${o.onlyDesktop.join(', ')}], sólo Studio [${o.onlyStudio.join(', ')}]`));
        console.log(`- ${row.id}: ${parts.join('; ')}`);
    }
} else {
    console.log(JSON.stringify(report, null, 2));
}

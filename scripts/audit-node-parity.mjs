#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const nodeDirectory = resolve(projectRoot, 'js/nodes');
const registry = {};
const browser = { TOOL_REGISTRY: registry };
const context = vm.createContext({
    window: browser,
    globalThis: browser,
    console,
    URL,
    Blob,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout
});

for (const filename of readdirSync(nodeDirectory).filter((name) => name.endsWith('.js')).sort()) {
    const source = readFileSync(resolve(nodeDirectory, filename), 'utf8');
    vm.runInContext(source, context, { filename });
}

const studio = Object.entries(registry).map(([id, node]) => ({
    id,
    label: String(node.label || id),
    category: String(node.cat || 'Sin categoría')
})).sort((a, b) => a.id.localeCompare(b.id));

const manifestPath = process.argv[2];
if (!manifestPath) {
    console.log(JSON.stringify({ studioCount: studio.length, studio }, null, 2));
    process.exit(0);
}

const desktopManifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
const desktop = Array.isArray(desktopManifest) ? desktopManifest : desktopManifest.nodes;
if (!Array.isArray(desktop)) throw new Error('El manifiesto Desktop debe ser un array o contener nodes[]');

const studioIds = new Set(studio.map((node) => node.id));
const desktopIds = new Set(desktop.map((node) => String(node.id || node.key || '')));
const missingInStudio = desktop
    .filter((node) => !studioIds.has(String(node.id || node.key || '')))
    .map((node) => String(node.id || node.key || ''))
    .filter(Boolean)
    .sort();
const studioOnly = studio.filter((node) => !desktopIds.has(node.id)).map((node) => node.id);

console.log(JSON.stringify({
    desktopSource: desktopManifest.source || manifestPath,
    desktopCount: desktop.length,
    studioCount: studio.length,
    equivalentCount: desktop.length - missingInStudio.length,
    missingInStudio,
    studioOnly
}, null, 2));

if (missingInStudio.length) process.exitCode = 1;

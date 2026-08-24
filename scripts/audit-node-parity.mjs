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
    category: String(node.cat || 'Sin categoría'),
    inputs: Number(node.in ?? node.inputs ?? 0),
    outputs: Number(node.out ?? node.outputs ?? 0)
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
const studioById = new Map(studio.map((node) => [node.id, node]));
const missingInStudio = desktop
    .filter((node) => !studioIds.has(String(node.id || node.key || '')))
    .map((node) => String(node.id || node.key || ''))
    .filter(Boolean)
    .sort();
const studioOnly = studio.filter((node) => !desktopIds.has(node.id)).map((node) => node.id);
const shared = desktop.filter((node) => studioIds.has(String(node.id || node.key || '')));
const contractMismatches = shared.flatMap((node) => {
    const id = String(node.id || node.key || '');
    const studioNode = studioById.get(id);
    const differences = [];
    if (node.inputs != null && Number(node.inputs) !== studioNode.inputs) differences.push(`inputs Desktop=${node.inputs} Studio=${studioNode.inputs}`);
    if (node.outputs != null && Number(node.outputs) !== studioNode.outputs) differences.push(`outputs Desktop=${node.outputs} Studio=${studioNode.outputs}`);
    return differences.length ? [{ id, differences }] : [];
});
const categoryCoverage = {};
desktop.forEach((node) => {
    const category = String(node.category || node.cat || 'unknown');
    if (!categoryCoverage[category]) categoryCoverage[category] = { desktop: 0, shared: 0, missing: 0 };
    categoryCoverage[category].desktop++;
    if (studioIds.has(String(node.id || node.key || ''))) categoryCoverage[category].shared++;
    else categoryCoverage[category].missing++;
});
Object.values(categoryCoverage).forEach((row) => {
    row.coverage = Number((row.shared / row.desktop * 100).toFixed(1));
});
const missingByRuntime = missingInStudio.reduce((summary, id) => {
    const node = desktop.find((candidate) => String(candidate.id || candidate.key || '') === id);
    const status = String(node?.backendStatus || 'frontend');
    summary[status] = (summary[status] || 0) + 1;
    return summary;
}, {});

console.log(JSON.stringify({
    desktopSource: desktopManifest.source || manifestPath,
    desktopCount: desktop.length,
    studioCount: studio.length,
    sharedIdCount: shared.length,
    missingInStudio,
    studioOnly,
    contractMismatches,
    categoryCoverage,
    missingByRuntime
}, null, 2));

if (missingInStudio.length) process.exitCode = 1;

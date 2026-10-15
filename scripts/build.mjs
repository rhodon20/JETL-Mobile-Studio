// Assembles the static site into dist/ for GitHub Pages. No bundling: the app runs
// from source; this only leaves out tests, docs and tooling.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ENTRIES = ['index.html', 'manifest.json', 'sw.js', 'icons', 'css', 'js'];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
for (const entry of ENTRIES) fs.cpSync(path.join(ROOT, entry), path.join(DIST, entry), { recursive: true });
// Serve files and folders starting with '_' or '.' as-is.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log('[build] dist/ ready');

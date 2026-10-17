// Assembles the static site into dist/ for GitHub Pages. No bundling: the app runs
// from source; this only leaves out tests, docs and tooling, and stamps the version.
import { execFileSync } from 'node:child_process';
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

// Version stamp: the page carries the deploy it belongs to and version.json the
// latest one (fetched without cache), so the app can tell a stale copy apart.
const sha = (process.env.GITHUB_SHA || gitShortSha() || 'local').slice(0, 7);
const build = { sha, run: process.env.GITHUB_RUN_NUMBER || '', builtAt: new Date().toISOString() };
const PLACEHOLDER = '<meta name="jetl-build" content="dev">';
const indexPath = path.join(DIST, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes(PLACEHOLDER)) throw new Error(`index.html has no ${PLACEHOLDER} to stamp`);
fs.writeFileSync(indexPath, html.replace(PLACEHOLDER,
    `<meta name="jetl-build" content="${build.sha}" data-run="${build.run}" data-built-at="${build.builtAt}">`));
fs.writeFileSync(path.join(DIST, 'version.json'), JSON.stringify(build) + '\n');
console.log(`[build] stamped ${build.sha}${build.run ? ` (deploy #${build.run})` : ''}`);

function gitShortSha() {
    try {
        return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch (error) {
        console.warn('[build] git not available, stamping "local":', error.message);
        return '';
    }
}
console.log('[build] dist/ ready');

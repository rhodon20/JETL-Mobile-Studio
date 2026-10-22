// Assembles the static site into dist/ for GitHub Pages. No bundling: the app runs
// from source; this leaves out tests, docs and tooling, versions every script and
// stylesheet by its content and stamps the deploy.
//
// Usage: node scripts/build.mjs [--out <dir>]
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import * as acorn from 'acorn';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const DIST = outArg >= 0 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'dist');
const ENTRIES = ['index.html', 'privacy.html', 'manifest.json', 'sw.js', 'icons', 'css', 'js'];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const entry of ENTRIES) fs.cpSync(path.join(ROOT, entry), path.join(DIST, entry), { recursive: true });
// Serve files and folders starting with '_' or '.' as-is.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
// Cloudflare: reglas de raíz y cabeceras (deploy/). Y, cuando exista, la
// verificación de dominio de la app Android (.well-known/assetlinks.json).
for (const file of ['_redirects', '_headers']) fs.copyFileSync(path.join(ROOT, 'deploy', file), path.join(DIST, file));
if (fs.existsSync(path.join(ROOT, '.well-known'))) fs.cpSync(path.join(ROOT, '.well-known'), path.join(DIST, '.well-known'), { recursive: true });

// Cache busting: GitHub Pages lets browsers reuse files for 10 minutes, so every
// reference carries ?v=<hash of the file's content>. A file that did not change
// keeps its URL (and its cache); one that did gets a new URL. Files are hashed as
// they are in dist/, after their own references were rewritten.
function contentHash(...files) {
    const hash = createHash('sha256');
    for (const file of files) {
        const full = path.join(DIST, file);
        if (!fs.existsSync(full)) throw new Error(`[build] referenced file not found: ${file}`);
        hash.update(file).update('\0').update(fs.readFileSync(full));
    }
    return hash.digest('hex').slice(0, 10);
}
function rewrite(file, pattern, replacer) {
    const full = path.join(DIST, file);
    const before = fs.readFileSync(full, 'utf8');
    const after = before.replace(pattern, replacer);
    if (after === before) throw new Error(`[build] nothing to version in ${file} (${pattern})`);
    fs.writeFileSync(full, after);
}

// The geo worker is created from workerPool.js.
const workerUrl = `js/geo.worker.js?v=${contentHash('js/geo.worker.js')}`;
rewrite('js/core/workerPool.js', /'js\/geo\.worker\.js'/, () => `'${workerUrl}'`);

// Files loaded on demand by the inline loader share one version per group.
let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const listed = (name) => {
    const body = html.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]`))?.[1];
    if (!body) throw new Error(`[build] ${name} not found in index.html`);
    return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};
const groups = {
    JETL_EXTRAS_VERSION: listed('JETL_EXTRA_MODULES'),
    JETL_RUNTIME_VERSION: [...listed('JETL_RUNTIME_SCRIPTS'), 'js/visualization.js'],
    JETL_MOTION_VERSION: ['js/vendor/anime.min.js', 'js/motion.js']
};
for (const [name, files] of Object.entries(groups)) {
    const pattern = new RegExp(`const ${name} = '[^']*'`);
    if (!pattern.test(html)) throw new Error(`[build] ${name} not found in index.html`);
    html = html.replace(pattern, `const ${name} = '${contentHash(...files)}'`);
}

// Every script and stylesheet tag.
let tagged = 0;
html = html.replace(/(\b(?:src|href)=")((?:js|css)\/[^"?]+)(?:\?v=[^"]*)?"/g, (_, attr, file) => {
    tagged++;
    return `${attr}${file}?v=${contentHash(file)}"`;
});
// ES modules imported by other modules have no tag. The import map gives each one
// the same versioned URL wherever it is imported from, and modulepreload fetches
// them alongside the entry modules instead of one import after another. Browsers
// without import maps load them unversioned: still a single instance each.
const entries = [...html.matchAll(/<script type="module" src="(js\/[^"?]+)/g)].map((m) => m[1]);
// Modules the loader imports on demand: their URL carries their group's version,
// but what they import goes through the import map like everything else.
const onDemand = [...listed('JETL_EXTRA_MODULES'), ...[...html.matchAll(/import\('\.\/(js\/[^'?]+)/g)].map((m) => m[1])];
const imported = new Set();
const queue = [...entries, ...onDemand];
while (queue.length) {
    const file = queue.pop();
    const ast = acorn.parse(fs.readFileSync(path.join(DIST, file), 'utf8'), { ecmaVersion: 2022, sourceType: 'module' });
    for (const node of ast.body) {
        if (!node.source || !/^(Import|Export(Named|All))Declaration$/.test(node.type)) continue;
        const target = path.posix.join(path.posix.dirname(file), node.source.value);
        if (entries.includes(target) || onDemand.includes(target)) throw new Error(`[build] ${target} is loaded on its own and also imported by ${file}: it would load twice`);
        if (!imported.has(target)) { imported.add(target); queue.push(target); }
    }
}
if (imported.size) {
    const sorted = [...imported].sort();
    const map = { imports: Object.fromEntries(sorted.map((file) => [`./${file}`, `./${file}?v=${contentHash(file)}`])) };
    const head = [`<script type="importmap">${JSON.stringify(map)}</script>`,
        ...sorted.map((file) => `<link rel="modulepreload" href="${file}?v=${contentHash(file)}">`)];
    const anchor = '<meta name="jetl-build" content="dev">';
    if (!html.includes(anchor)) throw new Error(`[build] ${anchor} not found to place the import map`);
    html = html.replace(anchor, `${anchor}\n    ${head.join('\n    ')}`);
}

fs.writeFileSync(path.join(DIST, 'index.html'), html);
console.log(`[build] versioned ${tagged} tags, ${Object.keys(groups).length} lazy groups, the worker and ${imported.size} imported modules`);

// Version stamp: the page carries the deploy it belongs to and version.json the
// latest one (fetched without cache), so the app can tell a stale copy apart.
const sha = (process.env.GITHUB_SHA || gitShortSha() || 'local').slice(0, 7);
const build = { sha, run: process.env.GITHUB_RUN_NUMBER || '', builtAt: new Date().toISOString() };
const PLACEHOLDER = '<meta name="jetl-build" content="dev">';
if (!html.includes(PLACEHOLDER)) throw new Error(`index.html has no ${PLACEHOLDER} to stamp`);
fs.writeFileSync(path.join(DIST, 'index.html'), html.replace(PLACEHOLDER,
    `<meta name="jetl-build" content="${build.sha}" data-run="${build.run}" data-built-at="${build.builtAt}">`));
fs.writeFileSync(path.join(DIST, 'version.json'), JSON.stringify(build) + '\n');

// Offline mode: sw.js precaches what working with vector data needs, with the
// exact URLs this build requests. Left out: MapLibre (the basemap needs the
// network anyway), raster libraries (out of scope) and the iOS startup images.
const groupVersion = (name) => html.match(new RegExp(`const ${name} = '([^']*)'`))[1];
const precache = new Set(['./', 'index.html', 'privacy.html', 'manifest.json', workerUrl]);
for (const m of html.matchAll(/\b(?:src|href)="((?:js|css|icons)\/[^"]+)"/g)) if (!m[1].startsWith('icons/startup/')) precache.add(m[1]);
for (const m of html.matchAll(/"\.\/(js\/[^"]+\?v=[^"]+)"/g)) precache.add(m[1]);
listed('JETL_EXTRA_MODULES').forEach((file) => precache.add(`${file}?v=${groupVersion('JETL_EXTRAS_VERSION')}`));
[...listed('JETL_RUNTIME_SCRIPTS'), 'js/visualization.js'].forEach((file) => precache.add(`${file}?v=${groupVersion('JETL_RUNTIME_VERSION')}`));
groups.JETL_MOTION_VERSION.forEach((file) => precache.add(`${file}?v=${groupVersion('JETL_MOTION_VERSION')}`));
[...listed('JETL_DEFERRED_STYLES'),
    'css/vendor/fontawesome/webfonts/fa-solid-900.woff2',
    // Imported by the geo worker (importScripts) and by the Shapefile reader.
    'js/vendor/turf.min.js', 'js/vendor/jsts.min.js', 'js/vendor/rbush.min.js', 'js/vendor/proj4.js', 'js/vendor/shp.js',
    ...JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8')).icons.map((icon) => icon.src)
].forEach((file) => precache.add(file));
for (const url of precache) {
    const file = url === './' ? 'index.html' : url.split('?')[0];
    if (!fs.existsSync(path.join(DIST, file))) throw new Error(`[build] offline precache lists a missing file: ${url}`);
}
const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
if (!sw.includes("const BUILD = 'dev';") || !sw.includes('const PRECACHE = [];')) throw new Error('[build] sw.js placeholders not found');
fs.writeFileSync(path.join(DIST, 'sw.js'), sw
    .replace("const BUILD = 'dev';", `const BUILD = '${build.sha}-${contentHash('index.html')}';`)
    .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify([...precache].sort(), null, 4)};`));
console.log(`[build] offline: ${precache.size} files precached by sw.js`);
console.log(`[build] stamped ${build.sha}${build.run ? ` (deploy #${build.run})` : ''}`);
console.log(`[build] ${path.relative(ROOT, DIST) || DIST}/ ready`);

function gitShortSha() {
    try {
        return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch (error) {
        console.warn('[build] git not available, stamping "local":', error.message);
        return '';
    }
}

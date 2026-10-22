import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'jetl-build-'));
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs'), '--out', OUT], { stdio: 'pipe' });
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');

// The contract browsers rely on: the version is a hash of what is served, so a
// file gets a new URL exactly when its content changes.
const hashOf = (...files) => {
    const hash = createHash('sha256');
    files.forEach((file) => hash.update(file).update('\0').update(fs.readFileSync(path.join(OUT, file))));
    return hash.digest('hex').slice(0, 10);
};

test.after(() => fs.rmSync(OUT, { recursive: true, force: true }));

test('cada script y hoja de estilo publicados llevan el hash de su contenido', () => {
    const tags = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
    const refs = [...tags.matchAll(/\b(?:src|href)="((?:js|css)\/[^"?]+)(?:\?v=([^"]*))?"/g)];
    const source = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const expected = [...source.matchAll(/\b(?:src|href)="(?:js|css)\/[^"?]+"/g)].length;
    assert.ok(expected > 0);
    assert.equal(refs.length, expected, 'todas las referencias del código fuente deben publicarse versionadas');
    for (const [, file, version] of refs) assert.equal(version, hashOf(file), `${file} sin versión de contenido`);
});

test('los grupos diferidos y el worker se versionan por contenido', () => {
    assert.match(html, new RegExp(`const JETL_RUNTIME_VERSION = '${hashOf('js/vendor/maplibre/maplibre-gl.js', 'js/vendor/turf.min.js', 'js/vendor/osmtogeojson.js', 'js/vendor/proj4.js', 'js/vendor/wellknown.js', 'js/basemap.js', 'js/visualization.js')}'`));
    assert.match(html, new RegExp(`const JETL_EXTRAS_VERSION = '${hashOf('js/modalSystem.js', 'js/schemaUI.js', 'js/templates.js', 'js/packages.js')}'`));
    assert.match(html, new RegExp(`const JETL_MOTION_VERSION = '${hashOf('js/vendor/anime.min.js', 'js/motion.js')}'`));
    assert.doesNotMatch(html, /_VERSION = 'dev'/);
    const pool = fs.readFileSync(path.join(OUT, 'js/core/workerPool.js'), 'utf8');
    assert.match(pool, new RegExp(`'js/geo\\.worker\\.js\\?v=${hashOf('js/geo.worker.js')}'`));
});

test('el despliegue queda sellado en la página y en version.json', () => {
    const version = JSON.parse(fs.readFileSync(path.join(OUT, 'version.json'), 'utf8'));
    assert.match(version.sha, /^[0-9a-f]{7}$|^local$/);
    assert.match(html, new RegExp(`<meta name="jetl-build" content="${version.sha}" data-run="[^"]*" data-built-at="${version.builtAt}">`));
});

test('los módulos importados tienen una única URL versionada y se precargan', () => {
    const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1] ?? '{}');
    const imported = Object.keys(map.imports || {});
    assert.ok(imported.length > 0, 'falta el import map');
    for (const key of imported) {
        const file = key.replace(/^\.\//, '');
        assert.equal(map.imports[key], `./${file}?v=${hashOf(file)}`);
        assert.match(html, new RegExp(`<link rel="modulepreload" href="${file.replace(/\./g, '\\.')}\\?v=${hashOf(file)}">`));
        assert.doesNotMatch(html, new RegExp(`<script type="module" src="${file.replace(/\./g, '\\.')}`), `${file} no puede tener etiqueta e import a la vez`);
    }
    assert.ok(html.indexOf('type="importmap"') < html.indexOf('<script type="module"'), 'el import map debe ir antes de cualquier módulo');
});

test('el service worker publicado precachea, con su URL exacta, lo que la app pide', () => {
    const sw = fs.readFileSync(path.join(OUT, 'sw.js'), 'utf8');
    assert.doesNotMatch(sw, /const BUILD = 'dev'/);
    const precache = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
    for (const url of precache) {
        const file = url === './' ? 'index.html' : url.split('?')[0];
        assert.ok(fs.existsSync(path.join(OUT, file)), `${url} no existe`);
    }
    // El arranque (tags e import map), los grupos diferidos y el worker, tal y como se piden.
    const tagged = [...html.matchAll(/\b(?:src|href)="((?:js|css)\/[^"]+\?v=[^"]+)"/g)].map((m) => m[1]);
    const runtime = html.match(/const JETL_RUNTIME_VERSION = '([^']+)'/)[1];
    const pool = fs.readFileSync(path.join(OUT, 'js/core/workerPool.js'), 'utf8').match(/'(js\/geo\.worker\.js\?v=[^']+)'/)[1];
    for (const url of [...tagged, `js/vendor/maplibre/maplibre-gl.js?v=${runtime}`, 'js/vendor/maplibre/maplibre-gl.css', `js/visualization.js?v=${runtime}`, pool, 'js/vendor/jsts.min.js', 'index.html', 'privacy.html']) {
        assert.ok(precache.includes(url), `falta en el precacheo: ${url}`);
    }
    // MapLibre sí va (el visor funciona sin conexión; el mapa base necesita red igualmente).
    // Fuera: Leaflet, que ya no se usa, y las pantallas de arranque de iOS.
    assert.ok(!precache.some((url) => url.includes('leaflet') || url.startsWith('icons/startup/')));
});

test('el despliegue en Cloudflare sirve cada archivo sin redirigir y no cachea lo que decide la versión', () => {
    // Con html_handling por defecto index.html y privacy.html redirigen (307) y el
    // service worker no puede precachear respuestas redirigidas (comprobado con wrangler dev).
    const config = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
    assert.match(config, /"directory": "\.\/dist"/);
    assert.match(config, /"html_handling": "none"/);
    assert.match(fs.readFileSync(path.join(OUT, '_redirects'), 'utf8'), /^\/ \/index\.html 200$/m);
    const headers = fs.readFileSync(path.join(OUT, '_headers'), 'utf8');
    for (const file of ['/index.html', '/sw.js', '/version.json']) assert.match(headers, new RegExp(`^${file.replace('.', '\\.')}\\n  Cache-Control: no-`, 'm'), file);
    // La app Android sólo abre a pantalla completa si el dominio publica su huella.
    assert.ok(fs.existsSync(path.join(OUT, '.well-known', 'assetlinks.json')), 'falta .well-known/assetlinks.json en el build');
});

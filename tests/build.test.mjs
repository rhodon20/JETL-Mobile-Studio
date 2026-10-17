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
    const refs = [...html.matchAll(/\b(?:src|href)="((?:js|css)\/[^"?]+)(?:\?v=([^"]*))?"/g)];
    assert.ok(refs.length >= 20, `se esperaban las etiquetas de la app, hay ${refs.length}`);
    for (const [, file, version] of refs) assert.equal(version, hashOf(file), `${file} sin versión de contenido`);
});

test('los grupos diferidos y el worker se versionan por contenido', () => {
    assert.match(html, new RegExp(`const JETL_RUNTIME_VERSION = '${hashOf('js/vendor/leaflet.js', 'js/vendor/turf.min.js', 'js/vendor/osmtogeojson.js', 'js/vendor/proj4.js', 'js/vendor/wellknown.js', 'js/basemap.js', 'js/visualization.js')}'`));
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

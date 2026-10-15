// Basemap provider selection, in a real browser:
//  - OpenFreeMap style reachable (served here by a route stub) -> MapLibre layer;
//  - style unreachable (external hosts blocked)               -> OSM raster fallback.
// No API key may appear in any tile/style request.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, report, serve } from './lib/harness.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STUB_STYLE = JSON.stringify({ version: 8, name: 'stub-dark', sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#111' } }] });
const server = await serve(ROOT);
const problems = [];

async function scenario(name, stubStyle) {
    const app = await openApp(server.origin);
    const requested = [];
    app.page.on('request', r => requested.push(r.url()));
    if (stubStyle) {
        await app.page.route('https://tiles.openfreemap.org/styles/dark', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: STUB_STYLE }));
    }
    try {
        await app.page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
        await app.page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready');
        const result = await app.page.evaluate(async () => {
            await window.JETLEnsureRuntime();
            window.ensureJETLMap();
            return await window.JETLBasemapReady;
        });
        const expected = stubStyle ? 'openfreemap' : 'osm';
        if (result !== expected) app.problems.push(`${name}: basemap=${result}, expected ${expected}`);
        const keyed = requested.filter(u => /[?&](key|api_?key|access_token)=/i.test(u));
        if (keyed.length) app.problems.push(`${name}: requests with API keys: ${keyed.join(', ')}`);
        if (requested.some(u => u.includes('cartocdn'))) app.problems.push(`${name}: CARTO still requested`);
        console.log(`[basemap] ${name}: ${result}`);
    } catch (e) {
        app.problems.push(`${name}: ${e && e.message ? e.message.split('\n')[0] : e}`);
    } finally {
        problems.push(...app.problems);
        await app.browser.close();
    }
}

await scenario('openfreemap reachable', true);
await scenario('openfreemap unreachable', false);
server.close();
report('basemap', problems);

// Headless runner for the in-app smoke suite (window.JETLSmoke).
// Serves the repo statically, opens it in mobile-sized Chromium and fails on
// any smoke failure, uncaught page error or failed same-origin request.
// External hosts (CDN tiles, Nominatim, ...) are blocked so runs are deterministic.
//
// --offline: lets the service worker install, cuts the network and reloads before
// running the suite (use it against the built site: --root dist).
//
// Usage: node tests/run-smoke.mjs [--extended] [--offline] [--root <dir>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, report, serve } from './lib/harness.mjs';

const args = process.argv.slice(2);
const mode = args.includes('--extended') ? 'extended' : 'stable';
const offline = args.includes('--offline');
const rootArg = args.indexOf('--root');
const ROOT = rootArg >= 0 ? args[rootArg + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const server = await serve(ROOT);
const { browser, context, page, problems } = await openApp(server.origin, { serviceWorkers: offline ? 'allow' : 'block', expectOffline: offline });
try {
    const t0 = Date.now();
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    console.log(`[smoke] app loaded in ${Date.now() - t0} ms (${server.origin})`);

    if (offline) {
        await page.evaluate(async () => {
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) {
                await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
            }
        });
        await context.setOffline(true);
        await page.reload({ waitUntil: 'load' });
        console.log('[smoke] reloaded offline from service worker cache');
    }

    // Startup is staged: vendor libraries load after the shell, and JETLSmoke starts
    // as a proxy until js/smoke.js is fetched.
    // Startup is staged: the shell boots first, the GIS runtime (Leaflet, turf...) and
    // the extras (schema UI, templates, packages) load on demand, and JETLSmoke is a
    // proxy until js/smoke.js is fetched. Load everything the suite exercises.
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
    const runtimeOk = await page.evaluate(async () => {
        const ok = await window.JETLEnsureRuntime();
        await window.JETLEnsureExtras();
        await window.ensureSmokeApiLoadedAsync(15000);
        return ok;
    });
    if (!runtimeOk) problems.push('runtime failed to load');
    const summary = await page.evaluate(async (m) => {
        const s = m === 'extended' ? await window.JETLSmoke.runExtended() : await window.JETLSmoke.runStable();
        return {
            pass: s.pass, fail: s.fail, total: s.total,
            failed: s.results.filter(r => !r.ok).map(r => `${r.name}: ${r.detail}`),
            omitted: s.results.filter(r => r.ok && /omitido/i.test(String(r.detail || ''))).map(r => `${r.name} (${r.detail})`)
        };
    }, mode);

    console.log(`[smoke] ${mode}: ${summary.pass}/${summary.total} OK`);
    if (summary.omitted.length) console.log(`[smoke] omitted (counted as OK):\n  ${summary.omitted.join('\n  ')}`);
    summary.failed.forEach(f => problems.push(`smoke FAIL ${f}`));
} catch (e) {
    problems.push(`runner: ${e && e.stack ? e.stack : e}`);
} finally {
    await browser.close();
    server.close();
}
report('smoke', problems);

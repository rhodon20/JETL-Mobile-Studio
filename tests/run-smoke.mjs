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
        // La app registra el service worker unos segundos después de estar lista.
        await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 })
            .catch(() => { throw new Error('el service worker no llegó a controlar la página (¿build sin desplegar?)'); });
        await context.setOffline(true);
        await page.reload({ waitUntil: 'load' });
        console.log('[smoke] reloaded offline from service worker cache');
    }

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

    if (offline) {
        // Interruptor de emergencia: ?nosw=1 desregistra el service worker y borra sus cachés.
        await context.setOffline(false);
        await page.goto(`${server.origin}/index.html?nosw=1`, { waitUntil: 'load' });
        const retired = await page.waitForFunction(async () => {
            const registrations = await navigator.serviceWorker.getRegistrations();
            const names = (await caches.keys()).filter((name) => name.startsWith('jetl-'));
            return registrations.length === 0 && names.length === 0;
        }, null, { timeout: 15000 }).then(() => true, () => false);
        console.log(`[smoke] ?nosw=1 retires the service worker: ${retired ? 'yes' : 'NO'}`);
        if (!retired) problems.push('?nosw=1 did not unregister the service worker and clear its caches');
    }
} catch (e) {
    problems.push(`runner: ${e && e.stack ? e.stack : e}`);
} finally {
    await browser.close();
    server.close();
}
report('smoke', problems);

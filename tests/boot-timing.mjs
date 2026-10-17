// Startup time on a slow phone-like profile: Chromium with network latency and
// bandwidth limits and a slowed-down CPU. Prints the median time until the editor
// is ready and how many same-origin requests it took. It is a comparison tool
// (run it before and after a change on the same machine), not a pass/fail test.
//
// Usage: node tests/boot-timing.mjs [--root <dir>] [--runs N]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, serve } from './lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const ROOT = opt('--root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const RUNS = Number(opt('--runs', 5));
const NETWORK = { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 };
const CPU_SLOWDOWN = 4;

const server = await serve(ROOT);
const samples = [];
for (let run = 0; run < RUNS; run++) {
    const { browser, context, page } = await openApp(server.origin);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', NETWORK);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
    let requests = 0;
    page.on('request', (req) => { if (req.url().startsWith(server.origin)) requests++; });
    const t0 = Date.now();
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 120000, polling: 50 });
    samples.push({ ms: Date.now() - t0, requests });
    await browser.close();
}
server.close();
samples.sort((a, b) => a.ms - b.ms);
const median = samples[Math.floor(samples.length / 2)];
console.log(`[boot-timing] ready in ${median.ms} ms (median of ${RUNS}; all: ${samples.map((s) => s.ms).join(', ')}), ${median.requests} requests`);

// Shared test harness: serves a directory over HTTP and opens it in Chromium with
// external hosts blocked, collecting page errors and failed same-origin requests.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm',
    '.woff2': 'font/woff2', '.ttf': 'font/ttf'
};

export async function serve(root) {
    const ROOT = path.resolve(root);
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let file = path.join(ROOT, urlPath);
        if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
        if (urlPath.endsWith('/')) file = path.join(file, 'index.html');
        fs.readFile(file, (err, data) => {
            if (err) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
            res.end(data);
        });
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    return { origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

// Returns { browser, context, page, problems }. problems collects page errors,
// failed same-origin requests (aborts excepted) and HTTP errors.
// expectOffline: network failures are the point of an offline run (the service
// worker tries the network first for app code, then falls back to its cache).
export async function openApp(origin, { viewport = { width: 390, height: 844 }, mobile = true, serviceWorkers = 'block', expectOffline = false } = {}) {
    const problems = [];
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers, acceptDownloads: true });
    await context.route(url => !url.href.startsWith(origin), route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join(' | ')}`));
    page.on('requestfailed', r => {
        // Aborts are expected when a cancelled worker is terminated mid-request.
        const reason = (r.failure() && r.failure().errorText) || '';
        if (expectOffline && reason === 'net::ERR_INTERNET_DISCONNECTED') return;
        if (r.url().startsWith(origin) && reason !== 'net::ERR_ABORTED') problems.push(`request failed (${reason}): ${r.url()}`);
    });
    page.on('response', r => {
        if (r.url().startsWith(origin) && r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
    });
    return { browser, context, page, problems };
}

export function report(name, problems) {
    if (problems.length) {
        console.error(`[${name}] ${problems.length} problem(s):`);
        problems.forEach(p => console.error('  - ' + p));
        process.exit(1);
    }
    console.log(`[${name}] OK`);
}

// End-to-end check of the app's own flows, which the smoke suite (node APIs)
// does not touch: add and connect nodes, run everything, run up to a node, fail
// a run, browse the run history, start a new project, and keep the canvas grid in
// step with the editor. Uses only offline readers.
//
// Usage: node tests/app-flow.mjs [--root <dir>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, report, serve } from './lib/harness.mjs';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const ROOT = rootArg >= 0 ? args[rootArg + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const server = await serve(ROOT);
const { browser, page, problems } = await openApp(server.origin);
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

// Every script must be fetched once: two URLs for one ES module would run it twice.
const scriptRequests = [];
page.on('request', (req) => { if (req.resourceType() === 'script' && req.url().startsWith(server.origin)) scriptRequests.push(new URL(req.url())); });

try {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
    // The boot splash fades out once the editor is ready and stops blocking taps.
    const splashGone = await page.waitForFunction(() => !document.getElementById('boot-splash'), null, { timeout: 2000 }).then(() => true, () => false);
    check('boot splash fades out when ready', splashGone);
    await page.evaluate(async () => { await window.JETLEnsureRuntime(); await window.JETLEnsureExtras(); });

    // Full run: bbox reader -> centroid.
    const full = await page.evaluate(async () => {
        const a = addNode('reader_bbox_gen');
        const b = addNode('geo_centroid');
        editor.addConnection(a, b, 'output_1', 'input_1');
        await runEngine();
        const node = (id) => document.getElementById('node-' + id);
        return {
            a: String(a), b: String(b),
            report: window.lastRunReport && { status: window.lastRunReport.status, executed: window.lastRunReport.summary.executed_nodes, id: window.lastRunReport.history_id },
            historyHead: window.JETLRunHistory.load()[0]?.history_id,
            monitor: document.getElementById('loader')?.dataset.status,
            nodeStates: [node(a)?.dataset.runState, node(b)?.dataset.runState],
            // The count itself animates for 1.5 s; visibility and colour are set at once.
            badge: (() => { const el = node(b)?.querySelector('.node-badge-count'); return el ? `${el.style.display}:${el.classList.contains('badge-green')}` : null; })(),
            summaryLogged: document.getElementById('logs').textContent.includes('Resumen Ejecución Total')
        };
    });
    check('full run report', full.report?.status === 'ok' && full.report.executed === 2, JSON.stringify(full.report));
    check('full run recorded in history', full.historyHead && full.historyHead === full.report?.id);
    check('monitor finished ok', full.monitor === 'ok', full.monitor);
    check('nodes marked ok on the canvas', full.nodeStates.every((s) => s === 'ok'), full.nodeStates.join(','));
    check('feature count badge shown for this run', full.badge === 'inline-block:true', full.badge);
    check('run summary in the log', full.summaryLogged);

    // Partial run up to the centroid shows its result in the table.
    const partial = await page.evaluate(async (b) => {
        await runEnginePartial(b);
        return {
            label: window.lastRunReport?.label, status: window.lastRunReport?.status,
            currentNodeId, rows: document.querySelectorAll('#table-container tbody tr').length
        };
    }, full.b);
    check('partial run report', partial.status === 'ok' && partial.label === `Parcial #${full.b}`, JSON.stringify(partial));
    check('partial run selects and tabulates its node', String(partial.currentNodeId) === full.b && partial.rows > 0, JSON.stringify(partial));

    // History panel lists the runs.
    const history = await page.evaluate(() => {
        window.JETLOpenRunHistory();
        const modal = document.getElementById('run-history-modal');
        const out = { open: modal.classList.contains('is-open'), items: modal.querySelectorAll('.run-history-item').length };
        window.JETLCloseRunHistory();
        out.closed = !modal.classList.contains('is-open');
        return out;
    });
    check('history panel lists runs', history.open && history.items >= 2 && history.closed, JSON.stringify(history));

    // New project, then a run that fails: unparseable WKT gives a feature without
    // geometry, and the centroid node fails on it.
    const failed = await page.evaluate(async () => {
        window.JETLProjects.startNew();
        const emptied = Object.keys(editor.export().drawflow.Home.data).length === 0 && Object.keys(executionData).length === 0;
        const w = addNode('reader_wkt');
        document.querySelector(`#node-${w} [df-w]`).value = 'NOT WKT';
        const c = addNode('geo_centroid');
        editor.addConnection(w, c, 'output_1', 'input_1');
        await runEngine();
        const focus = document.getElementById('loader-focus-error');
        const out = {
            emptied, c: String(c), status: window.lastRunReport?.status,
            monitor: document.getElementById('loader')?.dataset.status,
            focusHidden: focus?.hidden, focusNode: focus?.dataset.nodeId,
            nodeState: document.getElementById('node-' + c)?.dataset.runState
        };
        document.getElementById('loader-close').click();
        out.monitorClosed = document.getElementById('loader').style.display === 'none';
        return out;
    });
    check('new project empties the workspace', failed.emptied);
    check('failed run report', failed.status === 'error', failed.status);
    check('monitor points at the failing node', failed.monitor === 'error' && failed.focusHidden === false && failed.focusNode === failed.c, JSON.stringify(failed));
    check('failing node marked on the canvas', failed.nodeState === 'error', failed.nodeState);
    check('monitor closes from its button', failed.monitorClosed, JSON.stringify(failed));

    // Reproject must transform each vertex once. turf closes rings reusing the
    // first vertex's array, and structuredClone/postMessage keep that sharing:
    // transforming in place used to project it twice. Main thread (1 feature)
    // and worker (>= 200 features) paths.
    const reproject = await page.evaluate(async () => {
        const node = window.TOOL_REGISTRY.geo_reproject;
        const dom = { querySelector: (sel) => ({ value: sel === '[df-src]' ? 'EPSG:4326' : 'EPSG:3857' }) };
        const expected = proj4('EPSG:4326', 'EPSG:3857', [-3.75, 40.4]);
        const check = async (count) => {
            const fc = turf.featureCollection(Array.from({ length: count }, () => turf.bboxPolygon([-3.75, 40.4, -3.65, 40.5])));
            const out = await node.run('reproject_check', [fc], dom);
            const rings = out.features.map((f) => f.geometry.coordinates[0]);
            const finite = rings.every((ring) => ring.every((c) => Number.isFinite(c[0]) && Number.isFinite(c[1])));
            const closedAtExpected = rings.every((ring) => [ring[0], ring[ring.length - 1]].every((c) => Math.abs(c[0] - expected[0]) < 1e-3 && Math.abs(c[1] - expected[1]) < 1e-3));
            return { count, finite, closedAtExpected, first: rings[0][0], last: rings[0][rings[0].length - 1] };
        };
        return [await check(1), await check(200)];
    });
    reproject.forEach((r) => check(`reproject transforms each vertex once (${r.count} feature${r.count > 1 ? 's' : ''})`, r.finite && r.closedAtExpected, JSON.stringify(r)));

    // A result in another CRS is drawn where it belongs: Reproject tags its output
    // and the map reprojects it to degrees for display only.
    const projected = await page.evaluate(async () => {
        window.JETLProjects.startNew();
        const a = addNode('reader_bbox_gen');
        const b = addNode('geo_reproject');
        editor.addConnection(a, b, 'output_1', 'input_1');
        document.querySelector(`#node-${b} [df-dst]`).value = 'EPSG:25830';
        await runEngine();
        await window.showOnMap(String(b));
        const bounds = mapLayers[String(b)]?.getBounds();
        const out = executionData[b]?.data;
        return {
            crs: out?.metadata?.crs,
            firstX: out?.features?.[0]?.geometry?.coordinates?.[0]?.[0]?.[0],
            center: bounds ? [bounds.getCenter().lng, bounds.getCenter().lat] : null
        };
    });
    check('reprojected output is tagged with its CRS', projected.crs === 'EPSG:25830' && projected.firstX > 400000, JSON.stringify(projected));
    check('map draws a projected result in place', !!projected.center && Math.abs(projected.center[0] + 3.7) < 0.05 && Math.abs(projected.center[1] - 40.45) < 0.05, JSON.stringify(projected));

    // On-demand ES modules: their internals stay private, while the API other
    // code calls when they are loaded is published, e.g. a delegated UI action.
    const lazy = await page.evaluate(() => {
        const sidebar = document.getElementById('sidebar');
        const before = sidebar.classList.contains('open');
        const button = document.createElement('button');
        button.dataset.uiAction = 'toggle-sidebar';
        document.body.appendChild(button);
        button.click();
        const toggled = sidebar.classList.contains('open') !== before;
        button.click();
        button.remove();
        return { toggled, internal: typeof window.handleSort, nodeHelper: typeof window.resolveParamTextReader, templates: typeof window.openTemplatesModal };
    });
    check('delegated action reaches the on-demand visualization module', lazy.toggled, JSON.stringify(lazy));
    check('module internals are not global', lazy.internal === 'undefined' && lazy.nodeHelper === 'undefined' && lazy.templates === 'function', JSON.stringify(lazy));

    // The brand shows the deployed version and whether it is the latest one.
    const stamped = await page.evaluate(() => document.querySelector('meta[name="jetl-build"]').content);
    const openBuildInfo = async () => {
        // Close it first if open, so each call renders from scratch.
        await page.evaluate(() => { if (!document.getElementById('build-info').hidden) document.getElementById('brand-button').click(); });
        await page.evaluate(() => document.getElementById('brand-button').click());
        await page.waitForFunction(() => {
            const status = document.querySelector('#build-info .build-info-status');
            return status && !/Comprobando/.test(status.textContent);
        });
        return page.evaluate(() => ({
            visible: !document.getElementById('build-info').hidden,
            version: document.querySelector('#build-info .build-info-version')?.textContent,
            state: document.querySelector('#build-info .build-info-status')?.dataset.state || 'dev',
            reload: !!document.querySelector('#build-info .build-info-reload')
        }));
    };
    if (stamped === 'dev') {
        const info = await openBuildInfo();
        check('brand shows the development version', info.visible && info.state === 'dev', JSON.stringify(info));
    } else {
        const latest = await openBuildInfo();
        check('brand shows the deployed version as latest', latest.visible && latest.state === 'latest' && latest.version.includes(stamped), JSON.stringify(latest));
        await page.route('**/version.json*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ sha: '0000000', run: '999', builtAt: new Date().toISOString() }) }));
        const outdated = await openBuildInfo();
        check('brand flags a newer deploy and offers to reload', outdated.state === 'outdated' && outdated.reload, JSON.stringify(outdated));
        await page.unroute('**/version.json*');
    }
    await page.keyboard.press('Escape');

    // Zooming the editor moves the canvas grid with it.
    const grid = await page.evaluate(async () => {
        editor.zoom_in();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return document.getElementById('drawflow').dataset.viewport;
    });
    check('canvas grid follows zoom', /,1\.[1-9]\d$/.test(grid || ''), grid);

    const byPath = {};
    scriptRequests.forEach((url) => { (byPath[url.pathname] = byPath[url.pathname] || []).push(url.search); });
    // Each pool worker fetches geo.worker.js; the check is about ES modules running twice.
    const twice = Object.entries(byPath).filter(([p, searches]) => searches.length > 1 && !p.endsWith('/geo.worker.js')).map(([p, searches]) => `${p} ${searches.join(' ')}`);
    check('each script is fetched once', twice.length === 0, twice.join('; '));
    if (stamped !== 'dev') {
        const unversioned = Object.entries(byPath).filter(([p, searches]) => !p.includes('/vendor/') && searches.some((q) => !q.startsWith('?v='))).map(([p]) => p);
        check('published scripts are fetched with their version', unversioned.length === 0, unversioned.join(', '));
    }

    // Draft recovery: after a reload the app asks before touching the saved flow.
    const reloadAndReadPrompt = async () => {
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
        return page.evaluate(() => {
            const modal = document.getElementById('draft-recovery-modal');
            return {
                open: modal.classList.contains('is-open'),
                detail: document.getElementById('draft-recovery-detail').textContent,
                editorNodes: Object.keys(editor.export().drawflow.Home.data).length
            };
        });
    };
    const savedNodes = await page.evaluate(() => {
        const a = addNode('reader_bbox_gen');
        const b = addNode('geo_centroid');
        editor.addConnection(a, b, 'output_1', 'input_1');
        return Object.keys(editor.export().drawflow.Home.data).length;
    });
    const offered = await reloadAndReadPrompt();
    check('reopening offers the unsaved flow without loading it', offered.open && offered.editorNodes === 0 && offered.detail.includes(`${savedNodes} nodos`) && offered.detail.includes('Guardado'), JSON.stringify(offered));
    await page.click('[data-draft-recovery="restore"]');
    const restored = await page.evaluate(() => ({
        nodes: Object.keys(editor.export().drawflow.Home.data).length,
        open: document.getElementById('draft-recovery-modal').classList.contains('is-open')
    }));
    check('recover restores the flow', restored.nodes === savedNodes && !restored.open, JSON.stringify(restored));
    await reloadAndReadPrompt();
    await page.click('[data-draft-recovery="discard"]');
    const discarded = await reloadAndReadPrompt();
    check('discard deletes the draft for good', !discarded.open && discarded.editorNodes === 0 && await page.evaluate(() => !window.JETLProjects.hasDraft()), JSON.stringify(discarded));

    for (const c of checks) console.log(`[app-flow] ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
    checks.filter((c) => !c.ok).forEach((c) => problems.push(`${c.name}: ${c.detail}`));
} catch (error) {
    problems.push(`app-flow crashed: ${error && error.stack ? error.stack : error}`);
} finally {
    await browser.close();
    server.close();
}
report('app-flow', problems);

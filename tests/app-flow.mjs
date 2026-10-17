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

try {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
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
        openRunHistory();
        const modal = document.getElementById('run-history-modal');
        const out = { open: modal.classList.contains('is-open'), items: modal.querySelectorAll('.run-history-item').length };
        closeRunHistory();
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
        closeRunMonitor();
        return out;
    });
    check('new project empties the workspace', failed.emptied);
    check('failed run report', failed.status === 'error', failed.status);
    check('monitor points at the failing node', failed.monitor === 'error' && failed.focusHidden === false && failed.focusNode === failed.c, JSON.stringify(failed));
    check('failing node marked on the canvas', failed.nodeState === 'error', failed.nodeState);

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

    for (const c of checks) console.log(`[app-flow] ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
    checks.filter((c) => !c.ok).forEach((c) => problems.push(`${c.name}: ${c.detail}`));
} catch (error) {
    problems.push(`app-flow crashed: ${error && error.stack ? error.stack : error}`);
} finally {
    await browser.close();
    server.close();
}
report('app-flow', problems);

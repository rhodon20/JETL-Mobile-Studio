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

    // Large polygon layers are sampled on the map only; the node keeps every feature.
    const shapes = await page.evaluate(async () => {
        const id = addNode('geo_buffer');
        const features = Array.from({ length: 6000 }, (_, i) => {
            const x = -3.7 + (i % 100) * 0.001, y = 40.4 + Math.floor(i / 100) * 0.001;
            return turf.polygon([[[x, y], [x + 0.0005, y], [x + 0.0005, y + 0.0005], [x, y]]], { i });
        });
        executionData[id] = { data: turf.featureCollection(features) };
        await showOnMap(id);
        const drawn = mapLayers[id].getLayers().length;
        const kept = executionData[id].data.features.length;
        return { id, drawn, kept, indicator: document.getElementById('map-perf-indicator')?.textContent || '' };
    });
    check('large polygon layers are sampled on the map only', shapes.drawn === 5000 && shapes.kept === 6000 && shapes.indicator.includes('mostrando'), JSON.stringify(shapes));

    // Tapping a table row takes the map to that feature, even one left out of the sample.
    const focusOn = async (idx) => {
        await page.evaluate(() => switchTab('table'));
        await page.click(`#tr-row-${idx} td:nth-child(3)`);
        await page.waitForTimeout(500);
        return page.evaluate((idx) => {
            const c = map.getCenter();
            const f = executionData[currentNodeId].data.features[idx].geometry.coordinates[0][0];
            const mapActive = document.querySelector('#panel-tabs [data-results-view="map"]').classList.contains('active');
            return { mapActive, zoom: map.getZoom(), near: Math.abs(c.lng - f[0]) < 0.001 && Math.abs(c.lat - f[1]) < 0.001 };
        }, idx);
    };
    await page.evaluate((id) => { JETLNativeNav('results'); currentNodeId = id; buildTable(executionData[id].data); }, shapes.id);
    const drawnFocus = await focusOn(0);
    const sampledOutFocus = await focusOn(5);
    check('tapping a row centres the map on that feature', drawnFocus.mapActive && drawnFocus.near && drawnFocus.zoom >= 15, JSON.stringify(drawnFocus));
    check('a feature left out of the map sample can still be focused', sampledOutFocus.mapActive && sampledOutFocus.near, JSON.stringify(sampledOutFocus));
    // Columns can be hidden from the table toolbar and shown again.
    await page.evaluate(() => switchTab('table'));
    await page.click('[data-table-action="columns"]');
    await page.uncheck('input[data-table-column="i"]');
    const hiddenCol = await page.evaluate(() => ({
        headers: [...document.querySelectorAll('#table-container thead th')].map((th) => th.textContent.trim()),
        label: document.getElementById('table-columns-count').textContent
    }));
    await page.click('[data-table-action="show-all-columns"]');
    const shownCol = await page.evaluate(() => [...document.querySelectorAll('#table-container thead th')].map((th) => th.textContent.trim()));
    check('a table column can be hidden and shown again', !hiddenCol.headers.includes('i') && hiddenCol.label === 'Columnas 0/1' && shownCol.includes('i'), JSON.stringify({ hiddenCol, shownCol }));
    await page.evaluate((id) => { editor.removeNodeId('node-' + id); JETLNativeNav('flow'); }, shapes.id);

    // The centre button opens the actions panel; its contents follow the selection.
    const hubState = () => page.evaluate(() => ({
        open: document.body.classList.contains('action-hub-open'),
        head: document.querySelector('#action-hub .action-hub-head')?.textContent || '',
        primary: document.querySelector('#action-hub .action-hub-primary span')?.textContent || '',
        items: [...document.querySelectorAll('#action-hub .action-hub-item span')].map((el) => el.textContent),
        nodes: Object.keys(editor.export().drawflow.Home.data).length,
        button: document.getElementById('mobile-run').textContent.trim()
    }));
    const hubIds = await page.evaluate(() => {
        editor.clear();
        const a = addNode('reader_bbox_gen');
        const b = addNode('geo_buffer');
        editor.addConnection(a, b, 'output_1', 'input_1');
        document.querySelectorAll('.drawflow-node.selected').forEach((el) => el.classList.remove('selected'));
        editor.node_selected = null;
        JETLNativeNav('flow');
        return { a, b };
    });
    await page.click('#mobile-run');
    const flowHub = await hubState();
    check('actions panel offers the flow actions with nothing selected', flowHub.open && flowHub.primary === 'Ejecutar todo' && flowHub.items.includes('Buscar en el lienzo') && flowHub.head.includes('2 nodos'), JSON.stringify(flowHub));
    await page.click('#mobile-dock [data-mobile-view="results"]');
    const closedByDock = await page.evaluate(() => !document.body.classList.contains('action-hub-open'));
    check('another dock button closes the actions panel', closedByDock);
    await page.evaluate(() => JETLNativeNav('flow'));
    await page.click('#mobile-run');
    await page.click('#action-hub .action-hub-primary');
    await page.waitForFunction(() => window.lastRunReport?.scope === 'full' && document.getElementById('mobile-run').textContent.includes('Acciones'), null, { timeout: 15000 });
    check('its primary action runs the whole flow', await page.evaluate(() => window.lastRunReport.status === 'ok' && !document.body.classList.contains('action-hub-open')));

    await page.evaluate((b) => {
        const el = document.querySelector(`#node-${b} [df-dist]`);
        el.value = '250';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('node-' + b).classList.add('selected');
        editor.node_selected = document.getElementById('node-' + b);
    }, hubIds.b);
    await page.click('#mobile-run');
    const nodeHub = await hubState();
    check('with a node selected the panel offers that node', nodeHub.primary === 'Ejecutar hasta aquí' && nodeHub.head.includes(`#${hubIds.b}`) && nodeHub.items.includes('Duplicar'), JSON.stringify(nodeHub));
    await page.click('#action-hub [data-hub-action="duplicate"]');
    const duplicated = await page.evaluate((b) => {
        const data = editor.export().drawflow.Home.data;
        const copy = Object.values(data).find((n) => String(n.id) !== String(b) && n.name === 'geo_buffer');
        return { nodes: Object.keys(data).length, copied: copy && JSON.stringify(copy.data) === JSON.stringify(data[b].data) && Object.keys(copy.data).length > 0 };
    }, hubIds.b);
    await page.evaluate(() => undo());
    const undone = await hubState();
    check('duplicate copies the node configuration and undoes in one step', duplicated.nodes === 3 && duplicated.copied && undone.nodes === 2, JSON.stringify({ duplicated, undone: undone.nodes }));
    const cancelLabel = await page.evaluate(() => {
        JETLEvents.emit('run:start', { label: 'x', plannedIds: [] });
        const during = document.getElementById('mobile-run').textContent.trim();
        JETLEvents.emit('run:finish', { label: 'x', status: 'cancelled' });
        return during;
    });
    check('during a run the centre button cancels it', cancelLabel === 'Cancelar', cancelLabel);

    // Every dock destination is a bottom sheet: history keeps the dock and closes on navigation.
    await page.click('#mobile-history');
    const historySheet = await page.evaluate(() => ({
        open: document.getElementById('run-history-modal').classList.contains('is-open'),
        dock: getComputedStyle(document.getElementById('mobile-dock')).visibility,
        active: document.getElementById('mobile-history').classList.contains('active')
    }));
    await page.click('[data-mobile-view="nodes"]');
    const swapped = await page.evaluate(() => ({
        historyClosed: !document.getElementById('run-history-modal').classList.contains('is-open'),
        nodesOpen: document.body.classList.contains('mobile-nodes-open')
    }));
    await page.evaluate(() => JETLNativeNav('flow'));
    check('history is a dock sheet that gives way to the next one', historySheet.open && historySheet.dock === 'visible' && historySheet.active && swapped.historyClosed && swapped.nodesOpen, JSON.stringify({ historySheet, swapped }));

    // On a phone, chaining nodes grows the flow downwards in two columns (zigzag).
    const chain = await page.evaluate(() => {
        editor.clear();
        JETLNativeNav('flow');
        const first = addNode('reader_bbox_gen');
        document.querySelectorAll('.drawflow-node.selected').forEach((el) => el.classList.remove('selected'));
        document.getElementById('node-' + first).classList.add('selected');
        editor.node_selected = document.getElementById('node-' + first);
        const ids = [first];
        for (let k = 0; k < 4; k++) ids.push(addNodeClick('geo_centroid'));
        const data = editor.drawflow.drawflow.Home.data;
        return ids.map((id) => [Number(data[id].pos_x), Number(data[id].pos_y), (data[id].inputs.input_1?.connections || []).length]);
    });
    const xs = [...new Set(chain.map(([x]) => x))];
    const rowsGoDown = chain[2][1] > chain[0][1] && chain[4][1] > chain[2][1];
    const zigzag = xs.length === 2 && chain[0][0] === chain[2][0] && chain[2][0] === chain[4][0] && chain[1][0] === chain[3][0]
        && chain[0][1] === chain[1][1] && chain[2][1] === chain[3][1];
    check('chained nodes grow downwards in two columns on a phone', zigzag && rowsGoDown && chain.slice(1).every(([, , linked]) => linked === 1), JSON.stringify(chain));

    // «Validar flujo» lists problems before running; tapping one goes to its node.
    const valIds = await page.evaluate(() => {
        editor.clear();
        const a = addNode('reader_bbox_gen');
        const b = addNode('geo_buffer');
        const c = addNode('geo_centroid');
        editor.addConnection(a, b, 'output_1', 'input_1');
        document.querySelectorAll('.drawflow-node.selected').forEach((el) => el.classList.remove('selected'));
        editor.node_selected = null;
        JETLNativeNav('flow');
        return { a, b, c };
    });
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="validate"]');
    const validation = await page.evaluate(() => ({
        open: document.getElementById('validation-modal').classList.contains('is-open'),
        summary: document.getElementById('validation-summary').textContent,
        items: [...document.querySelectorAll('.validation-item')].map((el) => `${el.className.match(/is-(\w+)/)[1]}|${el.getAttribute('data-validation-node')}|${el.textContent.replace(/\s+/g, ' ').trim()}`)
    }));
    check('validation lists the unconnected input as an error', validation.open && validation.items[0]?.startsWith(`error|${valIds.c}|`) && validation.items[0].includes('Entrada sin conectar') && validation.summary.includes('1 error'), JSON.stringify(validation));
    await page.click(`.validation-item[data-validation-node="${valIds.c}"]`);
    await page.waitForTimeout(300);
    const jumped = await page.evaluate((c) => {
        const node = document.getElementById('node-' + c).getBoundingClientRect();
        const view = document.getElementById('drawflow').getBoundingClientRect();
        return { closed: !document.getElementById('validation-modal').classList.contains('is-open'), centred: Math.abs((node.left + node.width / 2) - (view.left + view.width / 2)) < 30 };
    }, valIds.c);
    check('tapping a problem goes to its node', jumped.closed && jumped.centred, JSON.stringify(jumped));
    await page.evaluate(({ b, c }) => {
        editor.addConnection(b, c, 'output_1', 'input_1');
        document.querySelectorAll('.drawflow-node.selected').forEach((el) => el.classList.remove('selected'));
        editor.node_selected = null;
    }, valIds);
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="validate"]');
    const clean = await page.evaluate(() => ({ ok: !!document.querySelector('#validation-list .validation-ok'), summary: document.getElementById('validation-summary').textContent }));
    await page.click('[data-validation-close]');
    check('a correct flow validates clean', clean.ok && clean.summary === 'Sin incidencias', JSON.stringify(clean));

    // Nodes snap to the 25 px canvas grid by default when created or dropped.
    const snapIds = await page.evaluate(() => { editor.clear(); const id = addNode('geo_buffer'); JETLNativeNav('flow'); JETLEvents.emit('canvas:fit'); return id; });
    await page.waitForTimeout(200);
    const dragBy = async (id, dx, dy) => {
        const box = await page.locator(`#node-${id} .node-head`).boundingBox();
        await page.mouse.move(box.x + 20, box.y + 10);
        await page.mouse.down();
        for (let k = 1; k <= 4; k++) await page.mouse.move(box.x + 20 + dx * k / 4, box.y + 10 + dy * k / 4);
        await page.mouse.up();
        return page.evaluate((id) => { const n = editor.drawflow.drawflow.Home.data[id]; return [n.pos_x, n.pos_y]; }, id);
    };
    const snapped = await dragBy(snapIds, 37, 13);
    check('a dropped node snaps to the canvas grid', snapped.every((v) => v % 25 === 0), JSON.stringify(snapped));
    await page.evaluate(() => { document.querySelector('[data-ui-action="toggle-grid-snap"]').click(); });
    const free = await dragBy(snapIds, 37, 13);
    const toggled = await page.evaluate(() => document.querySelector('[data-ui-action="toggle-grid-snap"]').getAttribute('aria-pressed'));
    await page.evaluate(() => { document.querySelector('[data-ui-action="toggle-grid-snap"]').click(); });
    check('grid snap can be turned off from Proyecto', toggled === 'false' && free.some((v) => v % 25 !== 0), JSON.stringify({ toggled, free }));

    // Multi-select: tap to pick, drag one to move the group, act on the group from the panel.
    const ms = await page.evaluate(() => {
        editor.clear();
        const a = addNode('reader_bbox_gen');
        const b = addNode('geo_buffer');
        const c = addNode('geo_centroid');
        editor.addConnection(a, b, 'output_1', 'input_1');
        editor.addConnection(b, c, 'output_1', 'input_1');
        const place = (id, x, y) => { const n = editor.drawflow.drawflow.Home.data[id]; n.pos_x = x; n.pos_y = y; const el = document.getElementById('node-' + id); el.style.left = x + 'px'; el.style.top = y + 'px'; editor.updateConnectionNodes('node-' + id); };
        place(a, 20, 20); place(b, 20, 260); place(c, 20, 520);
        addToHistory();
        document.querySelectorAll('.drawflow-node.selected').forEach((el) => el.classList.remove('selected'));
        editor.node_selected = null;
        JETLNativeNav('flow');
        JETLEvents.emit('canvas:fit');
        return { a, b, c };
    });
    await page.waitForTimeout(300);
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="select"]');
    await page.click(`#node-${ms.a} .node-head`);
    await page.click(`#node-${ms.b} .node-head`);
    const picking = await page.evaluate(() => ({
        mode: document.body.classList.contains('multi-select-mode'),
        banner: document.getElementById('multi-select-banner').textContent,
        picked: [...document.querySelectorAll('.drawflow-node.is-picked')].length
    }));
    check('select mode picks nodes with a tap', picking.mode && picking.picked === 2 && picking.banner.includes('2 nodos'), JSON.stringify(picking));

    const posOf = (id) => page.evaluate((id) => { const n = editor.drawflow.drawflow.Home.data[id]; return [n.pos_x, n.pos_y]; }, id);
    const [beforeA, beforeB, beforeC] = [await posOf(ms.a), await posOf(ms.b), await posOf(ms.c)];
    const head = await page.locator(`#node-${ms.a} .node-head`).boundingBox();
    await page.mouse.move(head.x + 20, head.y + 10);
    await page.mouse.down();
    for (let k = 1; k <= 5; k++) await page.mouse.move(head.x + 20 + k * 12, head.y + 10 + k * 6);
    await page.mouse.up();
    const [afterA, afterB, afterC] = [await posOf(ms.a), await posOf(ms.b), await posOf(ms.c)];
    const moved = [afterA[0] - beforeA[0], afterA[1] - beforeA[1]];
    check('dragging a picked node moves the whole group', moved[0] > 0 && Math.abs((afterB[0] - beforeB[0]) - moved[0]) < 0.5 && Math.abs((afterB[1] - beforeB[1]) - moved[1]) < 0.5 && afterC[0] === beforeC[0], JSON.stringify({ moved, b: [afterB[0] - beforeB[0], afterB[1] - beforeB[1]], c: afterC[0] - beforeC[0] }));
    await page.evaluate(() => undo());
    check('the group move undoes in one step', JSON.stringify([await posOf(ms.a), await posOf(ms.b)]) === JSON.stringify([beforeA, beforeB]));

    await page.click('#mobile-run');
    const groupHub = await hubState();
    await page.click('#action-hub [data-hub-action="duplicate-group"]');
    const dup = await page.evaluate(({ a, b }) => {
        const data = editor.export().drawflow.Home.data;
        const copies = Object.values(data).filter((n) => ![a, b].map(String).includes(String(n.id)) && ['reader_bbox_gen', 'geo_buffer'].includes(n.name) );
        const copyA = copies.find((n) => n.name === 'reader_bbox_gen');
        const copyB = copies.find((n) => n.name === 'geo_buffer');
        const linked = copyA && copyB && (copyA.outputs.output_1.connections || []).some((l) => String(l.node) === String(copyB.id));
        return { nodes: Object.keys(data).length, linked, picked: [...document.querySelectorAll('.drawflow-node.is-picked')].map((el) => el.id.replace('node-', '')).sort().join() === [copyA?.id, copyB?.id].map(String).sort().join() };
    }, ms);
    check('the panel duplicates the picked group with its connection', groupHub.primary === 'Duplicar 2 nodos' && dup.nodes === 5 && dup.linked && dup.picked, JSON.stringify({ groupHub: groupHub.primary, dup }));
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="delete-group"]');
    const afterDelete = await hubState();
    await page.evaluate(() => undo());
    const afterUndo = await hubState();
    check('deleting the group is one undo step', afterDelete.nodes === 3 && afterUndo.nodes === 5, JSON.stringify({ afterDelete: afterDelete.nodes, afterUndo: afterUndo.nodes }));
    await page.click('#multi-select-banner button');
    check('Listo leaves select mode', await page.evaluate(() => !document.body.classList.contains('multi-select-mode') && !document.querySelector('.drawflow-node.is-picked')));

    // Notes: a free sticky note on the canvas and an annotation inside a node.
    const noteNodes = await page.evaluate(() => {
        editor.clear();
        const a = addNode('reader_bbox_gen');
        const b = addNode('geo_buffer');
        editor.addConnection(a, b, 'output_1', 'input_1');
        document.querySelectorAll('.drawflow-node.selected').forEach((el) => el.classList.remove('selected'));
        editor.node_selected = null;
        JETLNativeNav('flow');
        JETLEvents.emit('canvas:fit');
        addToHistory();
        return { a, b };
    });
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="note"]');
    await page.fill('#annotation-text', 'Revisar la zona norte');
    await page.click('[data-annotation-color="#3498db"]');
    await page.click('[data-annotation-save]');
    const freeNote = await page.evaluate(() => ({
        dom: document.querySelector('#annotation-layer .canvas-note')?.textContent.trim(),
        saved: editor.export().annotations
    }));
    check('a free note is created from Acciones', freeNote.dom === 'Revisar la zona norte' && freeNote.saved.length === 1 && freeNote.saved[0].color === '#3498db' && freeNote.saved[0].nodeId === null, JSON.stringify(freeNote));

    const noteBox = await page.locator('.canvas-note').boundingBox();
    await page.mouse.move(noteBox.x + 30, noteBox.y + 20);
    await page.mouse.down();
    for (let k = 1; k <= 4; k++) await page.mouse.move(noteBox.x + 30 + k * 11, noteBox.y + 20 + k * 9);
    await page.mouse.up();
    const movedNote = await page.evaluate(() => ({ ...editor.export().annotations[0], dialog: !!document.getElementById('annotation-modal')?.classList.contains('is-open') }));
    check('dragging a note moves it onto the grid', movedNote.x !== freeNote.saved[0].x && movedNote.x % 25 === 0 && movedNote.y % 25 === 0 && !movedNote.dialog, JSON.stringify(movedNote));

    await page.click('.canvas-note');
    await page.fill('#annotation-text', 'Revisar la zona sur');
    await page.click('[data-annotation-save]');
    const edited = await page.evaluate(() => editor.export().annotations[0].text);
    await page.evaluate(() => undo());
    const noteUndone = await page.evaluate(() => ({ text: editor.export().annotations[0]?.text, dom: document.querySelector('.canvas-note')?.textContent.trim() }));
    check('tapping a note edits it and undo restores it', edited === 'Revisar la zona sur' && noteUndone.text === 'Revisar la zona norte' && noteUndone.dom === 'Revisar la zona norte', JSON.stringify({ edited, noteUndone }));

    await page.evaluate((b) => { const el = document.getElementById('node-' + b); el.classList.add('selected'); editor.node_selected = el; }, noteNodes.b);
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="annotate"]');
    await page.fill('#annotation-text', 'Radio provisional');
    await page.click('[data-annotation-save]');
    await page.click('#mobile-run');
    const nodeNote = await page.evaluate((b) => ({
        strip: document.querySelector(`#node-${b} > .node-note`)?.textContent.trim(),
        label: [...document.querySelectorAll('#action-hub .action-hub-item span')].map((el) => el.textContent).includes('Editar nota')
    }), noteNodes.b);
    await page.click('[data-hub-close]');
    check('a node annotation shows inside the node', nodeNote.strip === 'Radio provisional' && nodeNote.label, JSON.stringify(nodeNote));

    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
    await page.click('[data-draft-recovery="restore"]');
    await page.waitForTimeout(200);
    const restoredNotes = await page.evaluate((b) => ({
        free: document.querySelector('.canvas-note')?.textContent.trim(),
        strip: document.querySelector(`#node-${b} > .node-note`)?.textContent.trim()
    }), noteNodes.b);
    check('notes come back with the recovered draft', restoredNotes.free === 'Revisar la zona norte' && restoredNotes.strip === 'Radio provisional', JSON.stringify(restoredNotes));
    const afterRemove = await page.evaluate((b) => { editor.removeNodeId('node-' + b); return editor.export().annotations.map((n) => n.nodeId); }, noteNodes.b);
    check('removing a node drops its annotation', afterRemove.length === 1 && afterRemove[0] === null, JSON.stringify(afterRemove));
    // A project saved with the notes only at its root (Desktop format) still shows them.
    const desktopNotes = await page.evaluate(async () => {
        const id = addNode('geo_buffer');
        const flow = editor.export();
        delete flow.annotations;
        const project = { version: 'x', flow, annotations: [
            { id: 'annotation_1', type: 'custom', text: 'Desde Desktop', node_id: null, x: 50, y: 50, color: '#2ecc71' },
            { id: 'annotation_2', type: 'custom', text: 'Del nodo', node_id: String(id), x: 0, y: 0, color: '#f1c40f' }
        ] };
        const input = document.getElementById('upload-jetl');
        const transfer = new DataTransfer();
        transfer.items.add(new File([JSON.stringify(project)], 'p.jetl', { type: 'application/json' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 400));
        return {
            free: document.querySelector('.canvas-note')?.textContent.trim(),
            strip: document.querySelector(`#node-${id} > .node-note`)?.textContent.trim()
        };
    });
    check('notes saved at the project root (Desktop) are loaded', desktopNotes.free === 'Desde Desktop' && desktopNotes.strip === 'Del nodo', JSON.stringify(desktopNotes));
    await page.evaluate(() => { editor.clear(); JETLNativeNav('flow'); });

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

    // Home-screen shortcuts (manifest.json): ?action=… is handled once and removed from the URL.
    const launch = async (action) => {
        await page.goto(`${server.origin}/index.html?action=${action}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
        await page.waitForTimeout(200);
        return page.evaluate(() => ({
            search: location.search,
            nodes: Object.keys(editor.export().drawflow.Home.data).length,
            prompt: document.getElementById('draft-recovery-modal').classList.contains('is-open'),
            history: document.getElementById('run-history-modal').classList.contains('is-open'),
            project: document.body.classList.contains('mobile-sheet-open')
        }));
    };
    await page.evaluate(() => { editor.clear(); const a = addNode('reader_bbox_gen'); const b = addNode('geo_buffer'); editor.addConnection(a, b, 'output_1', 'input_1'); });
    const viaDraft = await launch('draft');
    check('shortcut «Borrador» restores the draft without asking', viaDraft.nodes === 2 && !viaDraft.prompt && viaDraft.search === '', JSON.stringify(viaDraft));
    const viaNew = await launch('new');
    check('shortcut «Nuevo» starts empty but still offers an unsaved draft', viaNew.nodes === 0 && viaNew.prompt, JSON.stringify(viaNew));
    await page.click('[data-draft-recovery="discard"]');
    const viaHistory = await launch('history');
    check('shortcut «Historial» opens the history sheet', viaHistory.history && viaHistory.search === '', JSON.stringify(viaHistory));
    const viaOpen = await launch('open');
    check('shortcut «Abrir» opens the Proyecto sheet', viaOpen.project, JSON.stringify(viaOpen));

    for (const c of checks) console.log(`[app-flow] ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
    checks.filter((c) => !c.ok).forEach((c) => problems.push(`${c.name}: ${c.detail}`));
} catch (error) {
    problems.push(`app-flow crashed: ${error && error.stack ? error.stack : error}`);
} finally {
    await browser.close();
    server.close();
}
report('app-flow', problems);

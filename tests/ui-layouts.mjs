// Interfaz táctil o de escritorio y su disposición según el dispositivo (cabecera
// de index.html, JETLUi): móvil y tablet en cualquier orientación reciben la
// interfaz táctil, un ordenador con ratón la de escritorio, y el ajuste de
// Proyecto > Interfaz se respeta y se recuerda.
//
// Usage: node tests/ui-layouts.mjs [--root <dir>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, report, serve } from './lib/harness.mjs';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = rootArg >= 0 ? args[rootArg + 1] : path.join(HERE, '..');

const server = await serve(ROOT);
const checks = [];
const problems = [];
const pageProblems = [];   // los avisos de consola de cada página abierta
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

async function boot(viewport, mobile) {
    const app = await openApp(server.origin, { viewport, mobile });
    await app.page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    await app.page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
    pageProblems.push(app.problems);
    return app;
}

const state = (page) => page.evaluate(() => {
    const rect = (id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r ? { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) } : null; };
    return {
        touch: document.documentElement.classList.contains('ui-touch'),
        desktop: document.documentElement.classList.contains('ui-desktop'),
        layout: document.documentElement.dataset.layout,
        dock: rect('mobile-dock'),
        dockShown: getComputedStyle(document.getElementById('mobile-dock')).display !== 'none',
        results: rect('bottom-panel'),
        vw: innerWidth,
        vh: innerHeight
    };
});

try {
    // Móvil en horizontal: táctil, barra a la izquierda y hojas por la derecha.
    {
        const { browser, page } = await boot({ width: 915, height: 412 }, true);
        const s = await state(page);
        check('a phone in landscape gets the touch interface', s.touch && s.layout === 'phone-landscape', JSON.stringify(s));
        check('in landscape the navigation bar is a rail on the left', s.dockShown && s.dock.left === 0 && s.dock.width < 100 && s.dock.height >= s.vh - 1, JSON.stringify(s.dock));
        await page.evaluate(() => JETLNativeNav('results'));
        await page.waitForTimeout(500);
        const open = await state(page);
        check('in landscape the results open on the right, leaving part of the flow visible', open.results.right === open.vw && open.results.left > open.dock.right + 100 && open.results.height >= open.vh - 1, JSON.stringify(open.results));
        // Girar a vertical: misma interfaz, barra abajo.
        await page.evaluate(() => JETLNativeNav('flow'));
        await page.setViewportSize({ width: 412, height: 915 });
        await page.waitForTimeout(400);
        const portrait = await state(page);
        check('turning the phone to portrait brings the bar back to the bottom', portrait.touch && portrait.layout === 'phone' && portrait.dock.bottom === portrait.vh && portrait.dock.width === portrait.vw, JSON.stringify(portrait));
        await browser.close();
    }

    // Tablet (iPad en vertical y en horizontal): interfaz táctil.
    for (const [viewport, layout] of [[{ width: 820, height: 1180 }, 'tablet'], [{ width: 1180, height: 820 }, 'tablet-landscape']]) {
        const { browser, page } = await boot(viewport, true);
        const s = await state(page);
        check(`a tablet ${viewport.width}x${viewport.height} gets the touch interface (${layout})`, s.touch && s.layout === layout && s.dockShown, JSON.stringify(s));
        await browser.close();
    }

    const rect = (page, selector) => page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height), visible: getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' };
    }, selector);

    // Tablet en vertical: barra flotante, resultados a media pantalla sin velo, catálogo a la izquierda.
    {
        const { browser, page } = await boot({ width: 820, height: 1180 }, true);
        const dock = await rect(page, '#mobile-dock');
        check('on a tablet in portrait the bar floats with a fixed width', dock.width <= 560 && dock.left > 0 && dock.bottom < 1180, JSON.stringify(dock));
        await page.evaluate(() => JETLNativeNav('results'));
        await page.waitForTimeout(500);
        const results = await rect(page, '#bottom-panel');
        const scrim = await page.evaluate(() => getComputedStyle(document.getElementById('mobile-scrim')).opacity);
        check('on a tablet in portrait the results take the lower half and leave the flow usable', results.top > 450 && results.top < 700 && Number(scrim) === 0, JSON.stringify({ results, scrim }));
        await page.evaluate(() => JETLNativeNav('nodes'));
        await page.waitForTimeout(500);
        const catalog = await rect(page, '#sidebar');
        check('on a tablet in portrait the catalog is a side panel', catalog.left === 0 && catalog.width <= 430, JSON.stringify(catalog));
        await browser.close();
    }

    // Tablet en horizontal: flujo y resultados lado a lado.
    {
        const { browser, page } = await boot({ width: 1180, height: 820 }, true);
        await page.waitForFunction(() => typeof map !== 'undefined' && map, null, { timeout: 30000 });
        const panel = await rect(page, '#bottom-panel');
        const flow = await rect(page, '#drawflow');
        check('on a tablet in landscape the results are always shown on the right, next to the flow', panel.visible && panel.right === 1180 && panel.width > 400 && flow.right <= panel.left + 1 && flow.left >= 80, JSON.stringify({ panel, flow }));
        await page.click('#bottom-panel .panel-sheet-close');
        await page.waitForTimeout(300);
        const hidden = await rect(page, '#bottom-panel');
        const wide = await rect(page, '#drawflow');
        await page.evaluate(() => JETLNativeNav('results'));
        await page.waitForTimeout(300);
        const shown = await rect(page, '#bottom-panel');
        check('the X hides the results panel and Resultados brings it back', !hidden.visible && wide.right === 1180 && shown.visible, JSON.stringify({ hidden, wide, shown }));
        const before = shown.width;
        await page.mouse.move(shown.left + 6, 400);
        await page.mouse.down();
        await page.mouse.move(shown.left - 150, 400, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        const dragged = await rect(page, '#bottom-panel');
        check('dragging the divider gives the results more room', dragged.width > before + 100, JSON.stringify({ before, after: dragged.width }));
        await page.click('#mobile-run');
        await page.waitForTimeout(400);
        const hub = await rect(page, '#action-hub');
        check('on a tablet in landscape Acciones is a floating card next to the bar', hub.visible && hub.width <= 400 && hub.left > 80 && hub.bottom < 820, JSON.stringify(hub));
        await page.keyboard.press('Escape');
        // Ampliar: el mapa ocupa todo menos la barra; al girar a vertical se deshace.
        await page.click('#btn-map-expand');
        await page.waitForTimeout(400);
        const expanded = await rect(page, '#bottom-panel');
        await page.setViewportSize({ width: 820, height: 1180 });
        await page.waitForTimeout(500);
        const rotated = await page.evaluate(() => ({ maximized: document.body.classList.contains('map-panel-maximized'), layout: document.documentElement.dataset.layout, flow: getComputedStyle(document.getElementById('layout')).display }));
        check('Ampliar takes the map to full screen, and turning the tablet brings the flow back', expanded.left <= 90 && expanded.right === 1180 && !rotated.maximized && rotated.layout === 'tablet' && rotated.flow !== 'none', JSON.stringify({ expanded, rotated }));
        await browser.close();
    }

    // Ordenador con ratón: escritorio, aunque la ventana sea ancha o mediana.
    {
        const { browser, page } = await boot({ width: 1400, height: 900 }, false);
        const s = await state(page);
        check('a computer with a mouse gets the desktop interface', s.desktop && !s.touch && s.layout === 'desktop' && !s.dockShown, JSON.stringify(s));
        await browser.close();
    }

    // Proyecto > Interfaz: el ajuste manda y se recuerda al volver a abrir.
    {
        const { browser, page } = await boot({ width: 390, height: 844 }, true);
        await page.evaluate(() => JETLNativeNav('project'));
        await page.waitForTimeout(400);
        await page.click('#mobile-project-sheet [data-ui-mode="desktop"]');
        await page.waitForTimeout(300);
        const chosen = await state(page);
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
        const reloaded = await state(page);
        check('choosing the desktop interface applies it and is remembered', chosen.desktop && reloaded.desktop && !reloaded.dockShown, JSON.stringify({ chosen, reloaded }));
        // En una pantalla táctil, la interfaz de escritorio tiene un botón para volver.
        const back = page.locator('#header .toolbar .btn[data-ui-mode]');
        const visible = await back.isVisible();
        if (visible) await back.click();
        await page.waitForTimeout(300);
        const after = await state(page);
        check('on a touch screen the desktop interface offers a way back', visible && after.touch && after.layout === 'phone', JSON.stringify(after));
        await browser.close();
    }
    for (const c of checks) console.log(`[ui-layouts] ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
    checks.filter((c) => !c.ok).forEach((c) => problems.push(`${c.name}: ${c.detail}`));
} catch (error) {
    problems.push(`ui-layouts crashed: ${error && error.stack ? error.stack : error}`);
} finally {
    server.close();
}
pageProblems.forEach((list) => problems.push(...list));
report('ui-layouts', problems);

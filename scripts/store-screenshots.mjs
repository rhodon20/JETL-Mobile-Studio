// Capturas para la ficha de Google Play: teléfono 9:16 (1080×1920) y el gráfico
// destacado (1024×500). Recorre la app real con un flujo de ejemplo.
//
// Usage: node scripts/store-screenshots.mjs [--root dist] [--out store/screenshots]
// Con red el mapa base aparece de fondo (la CI lo lanza desde store-assets.yml);
// sin red se generan igual, con el mapa vacío.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from '../tests/lib/harness.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const ROOT = path.resolve(arg('--root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const OUT = path.resolve(arg('--out', 'store/screenshots'));
fs.mkdirSync(OUT, { recursive: true });

const server = await serve(ROOT);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'es-ES' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = async (name) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(`[store] ${name}.png`);
};
// Teselas del mapa base: espera a que dejen de llegar (o a que pase el tiempo, sin red).
const settleMap = () => page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

try {
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
    await page.waitForFunction(() => !document.getElementById('boot-splash'), null, { timeout: 5000 });
    await page.evaluate(async () => { await window.JETLEnsureRuntime(); await window.JETLEnsureExtras(); });

    // Flujo de ejemplo sobre el centro de Madrid, encadenado como lo haría el
    // usuario (cada nodo tras el seleccionado): área → puntos → Voronoi → área (ha).
    const ids = await page.evaluate(async () => {
        editor.clear();
        JETLNativeNav('flow');
        const select = (id) => {
            document.querySelectorAll('.drawflow-node.selected').forEach((el) => el.classList.remove('selected'));
            const el = document.getElementById('node-' + id);
            if (el) el.classList.add('selected');
            editor.node_selected = el;
        };
        const area = addNode('reader_bbox_gen');
        select(area);
        const points = addNodeClick('geo_random_fill');
        const cells = addNodeClick('geo_voronoi');
        const size = addNodeClick('attr_area');
        document.querySelector(`#node-${area} [df-b]`).value = '-3.715,40.405,-3.685,40.43';
        document.querySelector(`#node-${points} [df-n]`).value = '40';
        document.querySelector(`#node-${size} [df-field]`).value = 'hectareas';
        document.querySelector(`#node-${size} [df-unit]`).value = '0.0001';
        await runEngine();
        select(null);
        JETLEvents.emit('canvas:fit');
        addToHistory();
        return { area, points, cells, size };
    });
    // Una nota en el lienzo, como haría el usuario desde Acciones.
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="note"]');
    await page.fill('#annotation-text', 'Zonas de servicio por punto');
    await page.click('[data-annotation-color="#f1c40f"]');
    await page.click('[data-annotation-save]');
    await page.evaluate(() => JETLEvents.emit('canvas:fit'));
    // Sin el aviso de «Proceso completado» encima.
    await page.waitForFunction(() => !document.querySelector('#toast.visible'), null, { timeout: 8000 }).catch(() => {});
    await shot('01-flujo');

    await page.click('#mobile-run');
    await page.waitForSelector('#action-hub:not([hidden])');
    await shot('02-acciones');
    await page.click('#action-hub [data-hub-close]');

    // «Ver resultado» desde Acciones, con el nodo seleccionado.
    await page.tap(`#node-${ids.size}`, { position: { x: 70, y: 12 } });
    await page.click('#mobile-run');
    await page.click('#action-hub [data-hub-action="view"]');
    // El selector de caché del visor no sigue al nodo que se muestra: se elige a mano.
    await page.selectOption('#feature-cache-node', String(ids.size));
    await page.click('#feature-cache-open');
    await page.evaluate(() => switchTab('map'));
    // El mapa no encuadra la capa por sí solo: lo que haría el usuario con los dedos.
    await page.evaluate(() => zoomToAllLayers());
    await settleMap();
    await shot('03-mapa');

    await page.evaluate(() => switchTab('table'));
    await shot('04-tabla');

    await page.evaluate(() => JETLNativeNav('nodes'));
    await shot('05-nodos');

    await page.evaluate(() => { JETLNativeNav('flow'); JETLOpenRunHistory(); });
    await shot('06-historial');

    // Gráfico destacado: icono, nombre y lema sobre el fondo de la app.
    const icon = fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
    const feature = await browser.newPage({ viewport: { width: 1024, height: 500 } });
    await feature.setContent(`<!doctype html><html><body style="margin:0;width:1024px;height:500px;display:flex;align-items:center;gap:56px;padding:0 88px;box-sizing:border-box;
        background:radial-gradient(circle at 78% 30%, #1d3a5c 0, #121212 60%);font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#fff">
        <div style="width:220px;height:220px;flex:none;border-radius:48px;overflow:hidden">${icon.replace('<svg', '<svg width="220" height="220"')}</div>
        <div><div style="font-size:76px;font-weight:700;letter-spacing:-1px">JETL Studio</div>
        <div style="font-size:30px;color:#cfd8e3;margin-top:12px;line-height:1.3">Flujos ETL geoespaciales<br>en tu móvil, también sin conexión</div></div>
        </body></html>`);
    await feature.screenshot({ path: path.join(OUT, 'grafico-destacado.png') });
    console.log('[store] grafico-destacado.png');
    if (errors.length) throw new Error(`errores en la página:\n${errors.join('\n')}`);
} finally {
    await browser.close();
    server.close();
}

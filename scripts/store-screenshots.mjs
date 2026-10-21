// Capturas para la ficha de Google Play: teléfono 9:16 (1080×1920) y el gráfico
// destacado (1024×500). Recorre la app real con un flujo de ejemplo y compone
// cada captura en un marco de móvil con un titular (las capturas sin componer
// quedan en raw/).
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
const RAW = path.join(OUT, 'raw');
fs.mkdirSync(RAW, { recursive: true });

// Titular de cada captura de la ficha (la primera es la que más se ve).
const HEADLINES = {
    '01-flujo': ['ETL geoespacial', 'en tu móvil, también sin conexión'],
    '02-acciones': ['Todo a un toque', 'el botón de Acciones cambia según lo que eliges'],
    '03-mapa': ['Mira el resultado', 'en el mapa, al momento'],
    '04-tabla': ['Explora los atributos', 'filtra, ordena y elige columnas'],
    '05-nodos': ['Más de 100 nodos', 'leer, transformar, cruzar y exportar'],
    '06-historial': ['Cada ejecución', 'con su duración, entidades y errores']
};

const server = await serve(ROOT);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'es-ES' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = async (name) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(RAW, `${name}.png`) });
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
    await settleMap();
    await shot('03-mapa');

    await page.evaluate(() => switchTab('table'));
    await shot('04-tabla');

    await page.evaluate(() => JETLNativeNav('nodes'));
    await shot('05-nodos');

    await page.evaluate(() => { JETLNativeNav('flow'); JETLOpenRunHistory(); });
    await shot('06-historial');

    const icon = fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
    // Marca: el fondo oscuro de la app con el verde y el azul del icono.
    const BRAND = `font-family:Inter,Roboto,'Segoe UI',sans-serif;color:#fff;margin:0;
        background:radial-gradient(ellipse at 85% 0%, rgba(96,165,250,.38) 0, transparent 55%),
                   radial-gradient(ellipse at 0% 100%, rgba(52,211,153,.22) 0, transparent 50%), #0f1115`;
    const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap">';
    const canvas = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    for (const [name, [title, subtitle]] of Object.entries(HEADLINES)) {
        const screen = fs.readFileSync(path.join(RAW, `${name}.png`)).toString('base64');
        await canvas.setContent(`<!doctype html><html><head>${FONTS}</head><body style="${BRAND};width:1080px;height:1920px;overflow:hidden;position:relative">
            <div style="position:absolute;top:120px;left:0;right:0;text-align:center;padding:0 70px">
                <div style="font-size:84px;font-weight:800;letter-spacing:-2px;line-height:1.05">${title}</div>
                <div style="font-size:40px;font-weight:500;color:#b8c4d4;margin-top:22px;line-height:1.25">${subtitle}</div>
            </div>
            <div style="position:absolute;top:470px;left:50%;transform:translateX(-50%);width:744px;height:1323px;padding:18px;border-radius:84px;
                background:#05070a;box-shadow:0 0 0 3px #2a2f38, 0 40px 120px rgba(0,0,0,.65), 0 0 160px rgba(96,165,250,.18)">
                <img src="data:image/png;base64,${screen}" style="display:block;width:744px;height:1323px;border-radius:66px">
            </div>
        </body></html>`, { waitUntil: 'networkidle' }).catch(() => {});
        await canvas.evaluate(() => document.fonts.ready);
        await canvas.screenshot({ path: path.join(OUT, `${name}.png`) });
        console.log(`[store] ${name}.png (ficha)`);
    }

    // Gráfico destacado: icono, nombre y lema sobre el mismo fondo.
    const feature = await browser.newPage({ viewport: { width: 1024, height: 500 } });
    await feature.setContent(`<!doctype html><html><head>${FONTS}</head><body style="${BRAND};width:1024px;height:500px;display:flex;align-items:center;gap:56px;padding:0 88px;box-sizing:border-box">
        <div style="width:220px;height:220px;flex:none;border-radius:48px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)">${icon.replace('<svg', '<svg width="220" height="220"')}</div>
        <div><div style="font-size:76px;font-weight:800;letter-spacing:-2px">JETL Studio</div>
        <div style="font-size:30px;font-weight:500;color:#b8c4d4;margin-top:12px;line-height:1.3">Flujos ETL geoespaciales<br>en tu móvil, también sin conexión</div></div>
        </body></html>`, { waitUntil: 'networkidle' }).catch(() => {});
    await feature.evaluate(() => document.fonts.ready);
    await feature.screenshot({ path: path.join(OUT, 'grafico-destacado.png') });
    console.log('[store] grafico-destacado.png');
    if (errors.length) throw new Error(`errores en la página:\n${errors.join('\n')}`);
} finally {
    await browser.close();
    server.close();
}

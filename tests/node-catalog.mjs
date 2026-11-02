// Catálogo de nodos con nombres en español: categorías traducidas, búsqueda por el
// nombre de referencia (alias, p. ej. «Clipper» encuentra «Recortar») y sin tildes,
// ayuda que se abre al tocar el icono, y proyectos guardados con los nombres antiguos
// que se abren con los nuevos.
//
// Usage: node tests/node-catalog.mjs [--root <dir>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, report, serve } from './lib/harness.mjs';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = rootArg >= 0 ? args[rootArg + 1] : path.join(HERE, '..');

const server = await serve(ROOT);
const { browser, page, problems } = await openApp(server.origin);
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

try {
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });

    // Categorías en español, en el orden del registro.
    await page.evaluate(() => JETLNativeNav('nodes'));
    await page.waitForTimeout(300);
    const categories = await page.$$eval('#sidebar-content .cat-name', (els) => els.map((el) => el.textContent));
    check('categories are shown in Spanish', categories.join(' | ') === 'Entradas | Geometría | Superposición | Análisis espacial | Atributos | Utilidades | Ráster | Exportar', categories.join(' | '));

    // Buscar por el nombre de referencia y sin tildes.
    const search = async (text) => {
        await page.fill('#sidebar-filter-input', text);
        await page.waitForTimeout(150);
        return page.$$eval('#sidebar-content .node-item-label', (els) => els.map((el) => el.textContent));
    };
    const byAlias = await search('Clipper');
    const byName = await search('punto central');
    const noAccent = await search('geometria');
    check('the catalog finds a node by its reference name', byAlias.includes('Recortar'), byAlias.join(', '));
    check('the catalog finds a node by its Spanish name', byName.includes('Punto central'), byName.join(', '));
    check('the search ignores accents', noAccent.includes('Reparar geometría') && noAccent.length > 10, `${noAccent.length}: ${noAccent.slice(0, 3).join(', ')}`);
    await search('');
    await page.evaluate(() => JETLNativeNav('flow'));

    // Tocar la ayuda de un nodo abre la tarjeta con su nombre, el de referencia y la explicación.
    const id = await page.evaluate(() => addNode('geo_buffer'));
    await page.click(`#node-${id} .node-help`);
    await page.waitForTimeout(200);
    const card = await page.evaluate(() => {
        const el = document.getElementById('node-help-card');
        return el && !el.hidden ? { title: el.querySelector('strong').textContent, alias: el.querySelector('small').textContent, text: el.querySelector('p').textContent } : null;
    });
    check('tapping the help icon shows the node help', card && card.title === 'Buffer' && /Bufferer/.test(card.alias) && card.text.length > 40, JSON.stringify(card));
    await page.mouse.click(20, 400);
    await page.waitForTimeout(150);
    check('tapping elsewhere closes the help', await page.evaluate(() => document.getElementById('node-help-card').hidden));

    // Un proyecto guardado antes del cambio (cabecera «Bufferer» sin ayuda) se abre con el nombre nuevo.
    const reopened = await page.evaluate(async (id) => {
        const flow = editor.export();
        const node = flow.drawflow.Home.data[id];
        node.html = node.html.replace(/<span class="node-title">[\s\S]*?<\/span>/, '<span><i class="fas fa-bullseye"></i> Bufferer</span>').replace(/<i class="fas fa-circle-info[^>]*><\/i>/, '');
        const file = new File([JSON.stringify(flow)], 'antiguo.jetl', { type: 'application/json' });
        const input = document.getElementById('upload-jetl');
        const data = new DataTransfer();
        data.items.add(file);
        input.files = data.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 600));
        const el = document.querySelector('.drawflow-node .node-head');
        return { title: el?.querySelector('.node-title')?.textContent.trim(), help: !!el?.querySelector('.node-help') };
    }, id);
    check('a project saved with the old names opens with the new ones', reopened.title === 'Buffer' && reopened.help, JSON.stringify(reopened));

    for (const c of checks) console.log(`[node-catalog] ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
    checks.filter((c) => !c.ok).forEach((c) => problems.push(`${c.name}: ${c.detail}`));
} catch (error) {
    problems.push(`node-catalog crashed: ${error && error.stack ? error.stack : error}`);
} finally {
    await browser.close();
    server.close();
}
report('node-catalog', problems);

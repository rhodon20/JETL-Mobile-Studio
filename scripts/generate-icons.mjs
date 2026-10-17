// Genera los iconos PNG y las pantallas de arranque de iOS a partir de
// icons/icon.svg, renderizándolos con el Chromium de Playwright (ya usado en las
// pruebas), y escribe las etiquetas <link> de iOS en index.html entre marcadores.
// Ejecutar al cambiar el icono: node scripts/generate-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = path.join(ROOT, 'icons');
const svg = fs.readFileSync(path.join(ICONS, 'icon.svg'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const BACKGROUND = manifest.background_color;  // fondo del arranque, igual que en Android
const LOGO_FILL = '#1f2937';                     // fondo del propio icono

// iPhones en vertical: tamaño CSS y densidad. iOS sólo usa la imagen cuyo tamaño
// coincide exactamente con el de la pantalla.
const IPHONES = [
    [440, 956, 3], [430, 932, 3], [428, 926, 3], [414, 896, 3], [414, 896, 2],
    [414, 736, 3], [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2]
];

const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect[^>]*\/>/, '');
// Logo sin el fondo redondeado, para colocarlo sobre un fondo a sangre.
const logo = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="${size}" height="${size}">${inner}</svg>`;

const pages = {
    plain: (size) => `<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
    // A sangre y con el logo dentro de la zona segura (80 % central) de Android.
    bleed: (size, scale) => `<body style="margin:0;width:${size}px;height:${size}px;background:${LOGO_FILL};display:grid;place-items:center">${logo(Math.round(size * scale))}</body>`,
    splash: (width, height) => {
        const icon = Math.round(width * 0.28);
        return `<body style="margin:0;width:${width}px;height:${height}px;background:${BACKGROUND};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(icon * 0.18)}px;font-family:-apple-system,system-ui,sans-serif">
            <div style="width:${icon}px;height:${icon}px;border-radius:${Math.round(icon * 0.22)}px;background:${LOGO_FILL};display:grid;place-items:center">${logo(Math.round(icon * 0.86))}</div>
            <div style="color:#e5e7eb;font-size:${Math.round(icon * 0.2)}px;font-weight:700;letter-spacing:.02em">${manifest.name}</div>
        </body>`;
    }
};

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(html, width, height, file, transparent = false) {
    await page.setViewportSize({ width, height });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head>${html}</html>`);
    await page.screenshot({ path: path.join(ICONS, file), omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
    console.log(`[icons] ${file} ${width}x${height}`);
}

await render(pages.plain(192), 192, 192, 'icon-192.png', true);
await render(pages.plain(512), 512, 512, 'icon-512.png', true);
await render(pages.bleed(512, 0.62), 512, 512, 'icon-maskable-512.png');
await render(pages.bleed(180, 0.78), 180, 180, 'apple-touch-icon.png');

fs.mkdirSync(path.join(ICONS, 'startup'), { recursive: true });
const links = [];
for (const [w, h, dpr] of IPHONES) {
    const file = `startup/iphone-${w * dpr}x${h * dpr}.png`;
    await render(pages.splash(w * dpr, h * dpr), w * dpr, h * dpr, file);
    links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="icons/${file}">`);
}
await browser.close();

const START = '<!-- jetl-startup-images:start (scripts/generate-icons.mjs) -->';
const END = '<!-- jetl-startup-images:end -->';
const indexPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const a = html.indexOf(START);
const b = html.indexOf(END);
if (a < 0 || b < a) throw new Error(`index.html necesita los marcadores ${START} … ${END}`);
fs.writeFileSync(indexPath, `${html.slice(0, a + START.length)}\n    ${links.join('\n    ')}\n    ${html.slice(b)}`);
console.log(`[icons] ${links.length} pantallas de arranque enlazadas en index.html`);

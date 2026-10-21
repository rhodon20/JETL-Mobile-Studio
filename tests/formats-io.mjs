// Lectura y escritura de formatos con archivos reales (tests/fixtures/formats), en el
// navegador y sin red: cada lector lee las tres ciudades con su nodo, GeoPackage y
// GeoParquet se escriben y se vuelven a leer igual, y ninguna librería se pide fuera.
//
// Usage: node tests/formats-io.mjs [--root <dir>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp, report, serve } from './lib/harness.mjs';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = rootArg >= 0 ? args[rootArg + 1] : path.join(HERE, '..');
const FIXTURES = path.join(HERE, 'fixtures', 'formats');

const server = await serve(ROOT);
const { browser, page, problems } = await openApp(server.origin);
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
// Las librerías de formatos van en js/vendor: ningún script ni WASM se pide fuera
// (las teselas del mapa base sí son externas).
const external = [];
page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith(server.origin) || url.startsWith('data:')) return;
    if (req.resourceType() === 'script' || /\.(m?js|wasm)(\?|$)|\+esm/.test(url)) external.push(url);
});

// [nodo, archivo, puerto, entidades esperadas]
const READERS = [
    ['reader_geojson', 'ciudades.geojson', 'output_1', 3],
    ['reader_kml', 'ciudades.kml', 'output_1', 3],
    ['reader_gpx', 'ciudades.gpx', 'output_3', 3],
    ['reader_csv', 'ciudades_latlon.csv', 'output_1', 3],
    ['reader_csv', 'ciudades_wkt.csv', 'output_1', 3],
    ['reader_shp', 'ciudades.shp.zip', 'output_1', 3],
    ['reader_excel', 'ciudades.xlsx', 'output_1', 3],
    ['reader_gpkg', 'ciudades.gpkg', 'output_1', 3],
    ['reader_gpkg', 'madrid_25830.gpkg', 'output_1', 1],
    ['reader_parquet', 'ciudades.geoparquet.parquet', 'output_1', 3],
    ['reader_parquet', 'ciudades_wkt.parquet', 'output_1', 3],
    ['reader_parquet', 'tabla.parquet', 'output_1', 3]
];

try {
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
    await page.evaluate(async () => { await window.JETLEnsureRuntime(); await window.JETLEnsureExtras(); });

    for (const [type, file, port, expected] of READERS) {
        const id = await page.evaluate((t) => { editor.clear(); return addNode(t); }, type);
        await page.setInputFiles(`#node-${id} input[type=file]`, path.join(FIXTURES, file));
        // GPKG y Parquet leen al elegir el archivo; el resto, al ejecutar.
        await page.waitForFunction((id) => !/Leyendo/.test(document.querySelector(`#node-${id} .file-lbl`)?.textContent || ''), id, { timeout: 60000 });
        const got = await page.evaluate(async ({ id, port }) => {
            await runEngine();
            const data = executionData[id]?.data;
            const fc = data?.type === 'FeatureCollection' ? data : data?.[port];
            const madrid = fc?.features?.find((f) => Object.values(f.properties || {}).includes('Madrid'));
            return { status: window.lastRunReport?.status, n: fc?.features?.length, crs: fc?.metadata?.crs || null, coords: madrid?.geometry?.coordinates || null, props: madrid ? JSON.stringify(madrid.properties) : null };
        }, { id, port });
        const near = (c, x, y) => Array.isArray(c) && Math.abs(c[0] - x) < 1e-6 && Math.abs(c[1] - y) < 1e-6;
        let ok = got.status === 'ok' && got.n === expected && got.props !== null;
        if (file === 'tabla.parquet') ok = ok && got.coords === null && /"poblacion":3300000/.test(got.props);
        else if (file === 'madrid_25830.gpkg') ok = ok && got.crs === 'EPSG:25830' && near(got.coords, 440300, 4474500);
        else ok = ok && near(got.coords, -3.7, 40.42);
        // Int64 de Parquet y GPKG llegan como número, no como BigInt.
        if (/parquet|gpkg/.test(file)) ok = ok && /"poblacion":3300000/.test(got.props);
        check(`${type} reads ${file}`, ok, JSON.stringify(got));
        if (file === 'madrid_25830.gpkg') {
            // Se dibuja sobre Madrid: el mapa reproyecta según metadata.crs.
            const center = await page.evaluate(async (id) => { await showNodeResult(id, false); const c = map.getCenter(); JETLNativeNav('flow'); return { lng: c.lng, lat: c.lat }; }, id);
            check('a GeoPackage in EPSG:25830 is drawn over Madrid', Math.abs(center.lng + 3.7) < 0.05 && Math.abs(center.lat - 40.42) < 0.05, JSON.stringify(center));
        }
    }

    // Ida y vuelta: lo que se escribe en GPKG y GeoParquet se vuelve a leer igual.
    const roundTrip = await page.evaluate(async () => {
        const fc = turf.featureCollection([
            turf.point([-3.7, 40.42], { nombre: 'Madrid', n: 1, ok: true, tags: { a: 1 } }),
            turf.lineString([[-4, 40], [-3, 41], [-2, 40.5]], { nombre: 'Línea', n: 2.5 }),
            turf.polygon([[[-4, 40], [-3, 40], [-3, 41], [-4, 40]], [[-3.8, 40.2], [-3.2, 40.2], [-3.2, 40.6], [-3.8, 40.2]]], { nombre: 'Zona con hueco' }),
            turf.multiPolygon([[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[2, 2], [3, 2], [3, 3], [2, 2]]]], { nombre: 'Multi' }),
            { type: 'Feature', geometry: { type: 'Point', coordinates: [-3.7, 40.42, 650] }, properties: { nombre: 'Con Z' } }
        ]);
        const out = {};
        for (const ext of ['gpkg', 'parquet']) {
            const written = await JETLFormats.writeFile(ext, fc);
            const back = await JETLFormats.readFile(new File([await written.blob.arrayBuffer()], `x.${ext}`));
            out[ext] = {
                n: back.features.length,
                sameGeometry: back.features.every((f, i) => JSON.stringify(f.geometry) === JSON.stringify(fc.features[i].geometry)),
                madrid: back.features[0].properties
            };
        }
        const utm = { ...turf.featureCollection([turf.point([440300, 4474500], { nombre: 'Madrid' })]), metadata: { crs: 'EPSG:25830' } };
        try { await JETLFormats.writeFile('gpkg', utm); out.gpkgUtm = 'sin error'; } catch (e) { out.gpkgUtm = e.message; }
        const parquetUtm = await JETLFormats.writeFile('parquet', utm);
        out.parquetUtmCrs = (await JETLFormats.readFile(new File([await parquetUtm.blob.arrayBuffer()], 'u.parquet'))).metadata?.crs;
        return out;
    });
    for (const ext of ['gpkg', 'parquet']) {
        const r = roundTrip[ext];
        check(`${ext} write → read keeps geometries and attributes`, r.n === 5 && r.sameGeometry && r.madrid.nombre === 'Madrid' && r.madrid.n === 1 && r.madrid.tags === '{"a":1}', JSON.stringify(r));
    }
    check('GeoPackage refuses data that is not in EPSG:4326 with a clear message', /EPSG:25830.*Reproject/.test(roundTrip.gpkgUtm), roundTrip.gpkgUtm);
    check('GeoParquet keeps the CRS of the data', roundTrip.parquetUtmCrs === 'EPSG:25830', String(roundTrip.parquetUtmCrs));

    // WKB de otras herramientas: EWKB de PostGIS con SRID, ISO con Z y M, big endian.
    const wkb = await page.evaluate(() => {
        const bytes = (build) => { const v = new DataView(new ArrayBuffer(64)); const n = build(v); return new Uint8Array(v.buffer, 0, n); };
        const ewkb = bytes((v) => { v.setUint8(0, 1); v.setUint32(1, 0x20000001, true); v.setUint32(5, 4326, true); v.setFloat64(9, -3.7, true); v.setFloat64(17, 40.42, true); return 25; });
        const isoZM = bytes((v) => { v.setUint8(0, 1); v.setUint32(1, 3001, true); [1, 2, 3, 4].forEach((c, i) => v.setFloat64(5 + i * 8, c, true)); return 37; });
        const big = bytes((v) => { v.setUint8(0, 0); v.setUint32(1, 1, false); v.setFloat64(5, 5, false); v.setFloat64(13, 6, false); return 21; });
        const decode = (b) => JSON.stringify(JETLFormats.wkb.toGeometry(b));
        return [decode(ewkb), decode(isoZM), decode(big)];
    });
    check('WKB decodes PostGIS EWKB, ISO Z/M and big endian', wkb[0] === '{"type":"Point","coordinates":[-3.7,40.42]}' && wkb[1] === '{"type":"Point","coordinates":[1,2,3]}' && wkb[2] === '{"type":"Point","coordinates":[5,6]}', wkb.join(' '));

    // GDB y FeatureReader necesitan el backend de Desktop: registrados (abren sus proyectos), no ofrecidos.
    const catalog = await page.evaluate(() => {
        JETLNativeNav('nodes');
        const text = document.getElementById('sidebar-content').textContent;
        return { registered: ['reader_gdb', 'writer_gdb', 'reader_feature_reader'].every((k) => TOOL_REGISTRY[k]), shown: ['GDB Reader', 'FeatureReader'].filter((l) => text.includes(l)), gpkgShown: text.includes('GPKG Reader') };
    });
    check('backend-only nodes stay registered but out of the catalog', catalog.registered && catalog.shown.length === 0 && catalog.gpkgShown, JSON.stringify(catalog));

    check('no format library is fetched from outside the app', external.length === 0, external.join(', '));

    for (const c of checks) console.log(`[formats-io] ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
    checks.filter((c) => !c.ok).forEach((c) => problems.push(`${c.name}: ${c.detail}`));
} catch (error) {
    problems.push(`formats-io crashed: ${error && error.stack ? error.stack : error}`);
} finally {
    await browser.close();
    server.close();
}
report('formats-io', problems);

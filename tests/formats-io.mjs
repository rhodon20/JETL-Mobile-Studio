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
    ['reader_parquet', 'tabla.parquet', 'output_1', 3],
    ['reader_parquet', 'madrid_25830.parquet', 'output_1', 1],
    ['reader_parquet', 'tipos_variados.parquet', 'output_1', 3]
];

try {
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready', null, { timeout: 30000 });
    // Elegir el archivo antes de la primera ejecución: el motor (y loadFile) aún no
    // se ha cargado y el lector tenía que esperar a una ejecución fallida.
    {
        const id = await page.evaluate(() => addNode('reader_parquet'));
        await page.setInputFiles(`#node-${id} input[type=file]`, path.join(FIXTURES, 'ciudades.geoparquet.parquet'));
        const label = await page.waitForFunction((id) => {
            const text = document.querySelector(`#node-${id} .file-lbl`)?.textContent || '';
            return /fts|Error/.test(text) && text;
        }, id, { timeout: 60000 }).then((handle) => handle.jsonValue()).catch(() => 'sin leer');
        check('a reader reads the file chosen before the first run', /\(3 fts\)/.test(label), label);
    }
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
        // En otro CRS se lee ya en EPSG:4326: los nodos de geoprocesamiento trabajan en grados.
        else if (/madrid_25830/.test(file)) ok = ok && got.crs === 'EPSG:4326' && Math.abs(got.coords[0] + 3.7) < 0.01 && Math.abs(got.coords[1] - 40.42) < 0.01;
        else ok = ok && near(got.coords, -3.7, 40.42);
        // Int64 de Parquet y GPKG llegan como número, no como BigInt.
        if (/parquet|gpkg/.test(file)) ok = ok && /"poblacion":3300000/.test(got.props);
        check(`${type} reads ${file}`, ok, JSON.stringify(got));
        if (file === 'tipos_variados.parquet') {
            // Tipos de pandas/GeoPandas/DuckDB: texto y binario «large», fechas, decimales, listas y estructuras.
            const p = JSON.parse(got.props);
            const expectedTypes = { nombre: 'Madrid', provincia: 'Madrid', poblacion: 3300000, rango: 1, capital: true, fundacion: '0852-01-01', actualizado: '2026-10-21T12:00:00.000Z', superficie: 604.45, barrios: '[1,2]', vacia: null };
            const wrong = Object.entries(expectedTypes).filter(([k, v]) => p[k] !== v).map(([k]) => `${k}=${JSON.stringify(p[k])}`);
            check('Parquet types become plain values (dates, decimals, lists, large strings)', wrong.length === 0 && Math.abs(p.densidad - 5390.5) < 1e-6 && JSON.parse(p.centro).x === -3.7, wrong.join(', ') || got.props);
        }
        if (/madrid_25830/.test(file)) {
            // Un nodo posterior (CenterPoint) recibe grados y su resultado se dibuja sobre
            // Madrid; antes calculaba con metros como si fueran grados y salía fuera del mapa.
            const after = await page.evaluate(async (id) => {
                const c = addNode('geo_centroid');
                editor.addConnection(id, c, 'output_1', 'input_1');
                await runEngine();
                const point = executionData[c]?.data?.features?.[0]?.geometry?.coordinates;
                try { await showNodeResult(c, false); } catch (e) { return { point, error: e.message }; }
                const center = map.getCenter();
                JETLNativeNav('flow');
                return { point, center: [center.lng, center.lat] };
            }, id);
            const madrid = (c) => Array.isArray(c) && Math.abs(c[0] + 3.7) < 0.05 && Math.abs(c[1] - 40.42) < 0.05;
            check(`a node after ${file} works in degrees and is drawn over Madrid`, madrid(after.point) && madrid(after.center), JSON.stringify(after));
        }
    }

    // Un GeoPackage con varias tablas saca una por salida, como en Desktop; con CRS
    // distintos todas pasan a EPSG:4326.
    {
        const id = await page.evaluate(() => { editor.clear(); return addNode('reader_gpkg'); });
        await page.setInputFiles(`#node-${id} input[type=file]`, path.join(FIXTURES, 'varias_tablas.gpkg'));
        await page.waitForFunction((id) => !/Leyendo|Sin archivo/.test(document.querySelector(`#node-${id} .file-lbl`)?.textContent || ''), id, { timeout: 60000 });
        const multi = await page.evaluate(async (id) => {
            await runEngine();
            const d = executionData[id].data;
            return {
                outputs: document.querySelectorAll(`#node-${id} .outputs .output`).length,
                layers: [...document.querySelectorAll(`#node-${id} [data-reader-layers] .reader-layer-row`)].map((r) => r.textContent),
                first: [d.output_1.features.length, d.output_1.features[0]?.properties?._table],
                second: [d.output_2.features.length, d.output_2.features[0]?.geometry?.coordinates, d.output_2.metadata?.crs],
                third: [d.output_3.features.length, d.output_3.features[0]?.geometry?.type, d.output_3.features[0]?.geometry?.coordinates?.[0]?.[2]],
                fourth: d.output_4.features.length
            };
        }, id);
        const [n2, c2, crs2] = multi.second;
        check('a GeoPackage with several tables gives one output per table', multi.outputs === 3 && multi.first[0] === 3 && multi.first[1] === 'ciudades' && n2 === 1 && multi.fourth === 0, JSON.stringify(multi));
        // Una tabla sin su geometría registrada (la librería rechazaba el archivo entero) se lee igual, con Z.
        check('a table whose geometry column is not registered is still read', multi.third[0] === 1 && multi.third[1] === 'LineString' && multi.third[2] === 650, JSON.stringify(multi.third));
        // Al ver el resultado se elige entre las salidas del nodo (no las 16 internas),
        // cada una con su tabla.
        const picker = await page.evaluate(async (id) => {
            const shown = showNodeResult(id);
            await new Promise((resolve) => setTimeout(resolve, 300));
            const labels = [...document.querySelectorAll('#toast.port-picker .port-picker-btn')].map((b) => b.textContent);
            document.querySelector('#toast.port-picker .port-picker-btn:nth-child(2)')?.click();
            await shown;
            JETLNativeNav('flow');
            return { labels, layer: mapLayers[id]?.count };
        }, id);
        check('the output picker offers only the node outputs, named after their tables', picker.labels.join(' | ') === '1 · ciudades (3) | 2 · madrid_utm (1) | 3 · marcas (1)' && picker.layer === 1, JSON.stringify(picker));
        check('the GPKG node lists which table goes out of each output', multi.layers.join(' | ') === 'Salida 1 · ciudades (3) | Salida 2 · madrid_utm (1) | Salida 3 · marcas (1)', multi.layers.join(' | '));
        // Otro GPKG con una sola tabla: sobran salidas, pero la que tiene un cable se queda.
        const kept = await page.evaluate((id) => { const b = addNode('geo_centroid'); editor.addConnection(id, b, 'output_3', 'input_1'); return b; }, id);
        await page.setInputFiles(`#node-${id} input[type=file]`, path.join(FIXTURES, 'ciudades.gpkg'));
        await page.waitForFunction((id) => /ciudades\.gpkg/.test(document.querySelector(`#node-${id} .file-lbl`)?.textContent || ''), id, { timeout: 60000 });
        const after = await page.evaluate(({ id, kept }) => ({ outputs: Object.keys(editor.getNodeFromId(id).outputs).length, wired: editor.getNodeFromId(kept).inputs.input_1.connections.length }), { id, kept });
        check('outputs follow the tables but a wired output is never removed', after.outputs === 3 && after.wired === 1, JSON.stringify(after));
        check('tables with different CRS are all brought to EPSG:4326', crs2 === 'EPSG:4326' && Math.abs(c2[0] + 3.7) < 0.01 && Math.abs(c2[1] - 40.42) < 0.01, JSON.stringify(multi.second));
    }

    // Ida y vuelta: lo que se escribe en GPKG y GeoParquet se vuelve a leer igual.
    const roundTrip = await page.evaluate(async () => {
        const fc = turf.featureCollection([
            turf.point([-3.7, 40.42], { nombre: 'Madrid', n: 1, ok: true, tags: { a: 1 }, _idx: 0, _crs: 'EPSG:4326' }),
            turf.lineString([[-4, 40], [-3, 41], [-2, 40.5]], { nombre: 'Línea', n: 2.5 }),
            turf.polygon([[[-4, 40], [-3, 40], [-3, 41], [-4, 40]], [[-3.8, 40.2], [-3.2, 40.2], [-3.2, 40.6], [-3.8, 40.2]]], { nombre: 'Zona con hueco' }),
            turf.multiPolygon([[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[2, 2], [3, 2], [3, 3], [2, 2]]]], { nombre: 'Multi' }),
            { type: 'Feature', geometry: { type: 'Point', coordinates: [-3.7, 40.42, 650] }, properties: { nombre: 'Con Z' } }
        ]);
        const out = {};
        for (const ext of ['gpkg', 'parquet']) {
            const written = await JETLFormats.writeFile(ext, fc);
            const back = await JETLFormats.readFile(new File([await written.blob.arrayBuffer()], `x.${ext}`));
            const exported = new Set(back.features.flatMap((f) => Object.keys(f.properties)));
            out[ext] = {
                internal: ['_idx', '_crs'].filter((k) => exported.has(k)),
                n: back.features.length,
                sameGeometry: back.features.every((f, i) => JSON.stringify(f.geometry) === JSON.stringify(fc.features[i].geometry)),
                madrid: back.features[0].properties
            };
        }
        const utm = { ...turf.featureCollection([turf.point([440300, 4474500], { nombre: 'Madrid' })]), metadata: { crs: 'EPSG:25830' } };
        const gpkgUtm = await JETLFormats.writeFile('gpkg', utm);
        const gpkgBack = await JETLFormats.readFile(new File([await gpkgUtm.blob.arrayBuffer()], 'u.gpkg'));
        out.gpkgUtm = { coords: gpkgBack.features[0].geometry.coordinates, crs: gpkgBack.metadata?.crs, table: gpkgBack.features[0].properties._table };
        const parquetUtm = await JETLFormats.writeFile('parquet', utm);
        out.parquetUtm = (await JETLFormats.readFile(new File([await parquetUtm.blob.arrayBuffer()], 'u.parquet'))).metadata;
        // Un código que no está en js/core/crs.js: su definición sale de la librería de GeoPackage.
        const wgsUtm = await JETLFormats.writeFile('parquet', { ...utm, metadata: { crs: 'EPSG:32630' } });
        const wgsUtmBack = await JETLFormats.readFile(new File([await wgsUtm.blob.arrayBuffer()], 'w.parquet'));
        out.parquetOther = { crs: wgsUtmBack.metadata?.crs, coords: wgsUtmBack.features[0].geometry.coordinates };
        return out;
    });
    for (const ext of ['gpkg', 'parquet']) {
        const r = roundTrip[ext];
        check(`${ext} write → read keeps geometries and attributes`, r.internal.length === 0 && r.n === 5 && r.sameGeometry && r.madrid.nombre === 'Madrid' && r.madrid.n === 1 && r.madrid.tags === '{"a":1}', JSON.stringify(r));
    }
    const gu = roundTrip.gpkgUtm;
    check('GeoPackage export brings other CRS to EPSG:4326 by itself', gu.crs === 'EPSG:4326' && Math.abs(gu.coords[0] + 3.7) < 0.01 && Math.abs(gu.coords[1] - 40.42) < 0.01, JSON.stringify(gu));
    const po = roundTrip.parquetOther;
    check('a Parquet in a less common CRS is read in EPSG:4326 too', po.crs === 'EPSG:4326' && Math.abs(po.coords[0] + 3.7) < 0.01 && Math.abs(po.coords[1] - 40.42) < 0.01, JSON.stringify(po));
    check('GeoParquet is written in the CRS of the data', roundTrip.parquetUtm?.source_crs === 'EPSG:25830' && roundTrip.parquetUtm?.crs === 'EPSG:4326', JSON.stringify(roundTrip.parquetUtm));

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

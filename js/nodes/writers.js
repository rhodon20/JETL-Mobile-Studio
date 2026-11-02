// Cat: writers
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
function resolveParamTextWriter(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}
function writerFeatureCollection(data) {
    if (data?.type === 'FeatureCollection') return data;
    if (data?.type === 'Feature') return turf.featureCollection([data]);
    if (Array.isArray(data)) return turf.featureCollection(data);
    return turf.featureCollection([]);
}
function writerFilename(dom, fallback) {
    return resolveParamTextWriter(dom?.querySelector('[df-fn]')?.value || fallback) || fallback;
}
function writerDownload(content, filename, mimeType) {
    if (typeof download === 'function') return download(content, filename, mimeType);
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
}
async function writerEnsureScript(src, globalName) {
    if (window[globalName]) return window[globalName];
    if (typeof window.JETLLoadScriptOnce !== 'function') throw new Error(`No se puede cargar el motor ${globalName}`);
    await window.JETLLoadScriptOnce(src, globalName);
    if (!window[globalName]) throw new Error(`Motor ${globalName} no disponible`);
    return window[globalName];
}
function writerRows(data) {
    return writerFeatureCollection(data).features.map((feature) => {
        const row = { ...(feature.properties || {}) };
        Object.keys(row).forEach((key) => { if (row[key] && typeof row[key] === 'object') row[key] = JSON.stringify(row[key]); });
        return row;
    });
}
function writerBackendOwner() {
    if (typeof window.JETLBackendIntegration?.exportVector === 'function') return window.JETLBackendIntegration;
    if (typeof window.JETLBackend?.exportVector === 'function') return window.JETLBackend;
    return null;
}
async function writerBackendExport(format, data, options, nodeId) {
    const owner = writerBackendOwner();
    if (!owner) throw new Error(`${String(format).toUpperCase()} Writer requiere un backend de exportación compatible`);
    const result = await owner.exportVector(format, writerFeatureCollection(data), options, { node_id: nodeId });
    if (result?.downloaded) return result;
    const content = result?.blob || result?.buffer || result?.content;
    if (content == null) throw new Error(`El backend ${String(format).toUpperCase()} no devolvió un archivo`);
    writerDownload(content, result.filename || options.filename, result.mimeType || 'application/octet-stream');
    return result;
}
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    writer_geojson: {
        cat: '5. WRITERS', label: 'Exportar GeoJSON', alias: 'GeoJSON DL', help: 'Descarga los datos de entrada como un archivo GeoJSON con el nombre indicado. Conserva la geometría y todos los atributos tal como llegan, sin cambiar las coordenadas.', icon: 'fa-file-code', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.geojson" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.geojson');
            download(JSON.stringify(i[0]), fn, 'application/json');
            return i[0];
        }
    },

    writer_csv: {
        cat: '5. WRITERS', label: 'Exportar CSV', alias: 'CSV DL', help: 'Descarga los atributos de entrada como un archivo CSV con el nombre indicado.', icon: 'fa-file-csv', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.csv" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.csv');
            download(toCSV(i[0]), fn, 'text/csv');
            return i[0];
        }
    },

    writer_kml: {
        cat: '5. WRITERS', label: 'Exportar KML', alias: 'KML DL', help: 'Descarga los datos de entrada como un archivo KML, que se abre en visores de mapas como Google Earth. Las coordenadas deben estar en longitud/latitud (EPSG:4326).', icon: 'fa-globe', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.kml" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            if (!window.JETLFormats || !JETLFormats.toKML) throw new Error("Exportador KML no disponible");
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.kml');
            download(JETLFormats.toKML(i[0]), fn, 'application/vnd.google-earth.kml+xml');
            return i[0];
        }
    },

    writer_gpkg: {
        cat: '5. WRITERS', label: 'Exportar GeoPackage', alias: 'GPKG DL', icon: 'fa-database', color: '#c0392b', in: 1, out: 0,
        help: 'Descarga un GeoPackage con todos los datos en una tabla llamada jetl_export. Se escribe siempre en EPSG:4326: los datos en otro sistema se reproyectan automáticamente. Los atributos se guardan como número, booleano o texto.',
        tpl: () => `<input class="node-control" df-fn value="export.gpkg" placeholder="Nombre archivo">`,
        run: async (id, i, d) => {
            if (!window.JETLFormats) throw new Error("Formatos no disponibles");
            const res = await JETLFormats.writeFile('gpkg', i[0]);
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || '') || res.filename || 'export.gpkg';
            const a = document.createElement('a'); a.href = URL.createObjectURL(res.blob); a.download = fn; a.click();
            return i[0];
        }
    },

    writer_parquet: {
        cat: '5. WRITERS', label: 'Exportar GeoParquet', alias: 'Parquet DL', icon: 'fa-table', color: '#c0392b', in: 1, out: 0,
        help: 'Descarga un archivo GeoParquet con la geometría en WKB, que se puede abrir con QGIS, GDAL o DuckDB. Si los datos no están en EPSG:4326, el sistema de coordenadas se guarda en los metadatos.',
        tpl: () => `<input class="node-control" df-fn value="export.parquet" placeholder="Nombre archivo">`,
        run: async (id, i, d) => {
            if (!window.JETLFormats) throw new Error("Formatos no disponibles");
            const res = await JETLFormats.writeFile('parquet', i[0]);
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || '') || res.filename || 'export.parquet';
            const a = document.createElement('a'); a.href = URL.createObjectURL(res.blob); a.download = fn; a.click();
            return i[0];
        }
    },

    writer_gdb: {
        requiresBackend: true,
        cat: '5. WRITERS', label: 'Exportar GDB', alias: 'GDB', icon: 'fa-folder-open', color: '#c0392b', in: 1, out: 0,
        dynamicInputs: true, inputClonePolicy: 'none', help: 'Exporta una File Geodatabase comprimida en ZIP. Admite varias entradas: cada una se convierte en una capa con el prefijo indicado (capa_1, capa_2…). Necesita el servidor de JETL.',
        tpl: () => `<input class="node-control" df-fn value="export.gdb.zip" placeholder="Nombre archivo"><input class="node-control" df-layer-name value="layer" placeholder="Prefijo capa"><div style="font-size:.66em;color:#aaa;margin-top:5px">Requiere backend · varias entradas admitidas</div>`,
        run: async (id, inputs, dom) => {
            const filename = writerFilename(dom, 'export.gdb.zip'); const layerPrefix = resolveParamTextWriter(dom?.querySelector('[df-layer-name]')?.value || 'layer') || 'layer';
            const layers = (Array.isArray(inputs) ? inputs : []).map((data, index) => data ? { name: `${layerPrefix}_${index + 1}`, data: writerFeatureCollection(data) } : null).filter(Boolean);
            await writerBackendExport('gdb', inputs?.[0], { filename, layer_name: layerPrefix, layers }, id); return inputs?.[0];
        }
    },

    writer_shp: {
        cat: '5. WRITERS', label: 'Exportar Shapefile', alias: 'SHP', icon: 'fa-map', color: '#c0392b', in: 1, out: 0, inputClonePolicy: 'none', help: 'Descarga un Shapefile comprimido en ZIP, generado en el propio dispositivo. Elige el nombre del archivo y el de la capa. Si no hay entidades de entrada, da error.',
        tpl: () => `<input class="node-control" df-fn value="export.shp.zip" placeholder="Nombre archivo"><input class="node-control" df-layer-name value="layer" placeholder="Nombre de capa">`,
        run: async (id, inputs, dom) => {
            const source = writerFeatureCollection(inputs?.[0]); if (!source.features.length) throw new Error('SHP Writer necesita entidades de entrada');
            const shpwrite = await writerEnsureScript('js/vendor/shpwrite.js', 'shpwrite');
            const filename = writerFilename(dom, 'export.shp.zip'); const layer = resolveParamTextWriter(dom?.querySelector('[df-layer-name]')?.value || 'layer') || 'layer';
            const archive = await shpwrite.zip(source, { folder: layer, types: { point: layer, polygon: layer, polyline: layer } });
            writerDownload(archive, filename, 'application/zip'); return inputs?.[0];
        }
    },

    writer_xlsx: {
        cat: '5. WRITERS', label: 'Exportar Excel', alias: 'XLSX', icon: 'fa-table', color: '#c0392b', in: 1, out: 0, inputClonePolicy: 'none', help: 'Descarga un libro Excel con los atributos de la entrada en la hoja indicada (hasta 31 caracteres). No incluye la geometría, y los valores compuestos se guardan como texto JSON.',
        tpl: () => `<input class="node-control" df-fn value="export.xlsx" placeholder="Nombre archivo"><input class="node-control" df-sheet value="Data" placeholder="Nombre de hoja">`,
        run: async (id, inputs, dom) => {
            const XLSX = await writerEnsureScript('js/vendor/xlsx.full.min.js', 'XLSX');
            const rows = writerRows(inputs?.[0]); const sheetName = String(dom?.querySelector('[df-sheet]')?.value || 'Data').slice(0, 31) || 'Data';
            const workbook = XLSX.utils.book_new(); const worksheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            writerDownload(bytes, writerFilename(dom, 'export.xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); return inputs?.[0];
        }
    },

    writer_wkt: { cat: '5. WRITERS', label: 'WKT en consola', alias: 'WKT Console', help: 'Escribe en el registro de ejecución la geometría de cada entidad de entrada en formato WKT. No descarga ningún archivo.', icon: 'fa-font', color: '#c0392b', in: 1, out: 0, tpl: () => `<div>Ver en Log</div>`, run: (id, i) => { i[0].features.forEach(f => log(wellknown.stringify(f))); return i[0] } }
});

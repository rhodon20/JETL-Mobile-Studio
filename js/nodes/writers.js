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
        cat: '5. WRITERS', label: 'GeoJSON DL', icon: 'fa-file-code', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.geojson" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.geojson');
            download(JSON.stringify(i[0]), fn, 'application/json');
            return i[0];
        }
    },

    writer_csv: {
        cat: '5. WRITERS', label: 'CSV DL', icon: 'fa-file-csv', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.csv" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.csv');
            download(toCSV(i[0]), fn, 'text/csv');
            return i[0];
        }
    },

    writer_kml: {
        cat: '5. WRITERS', label: 'KML DL', icon: 'fa-globe', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.kml" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            if (!window.JETLFormats || !JETLFormats.toKML) throw new Error("Exportador KML no disponible");
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.kml');
            download(JETLFormats.toKML(i[0]), fn, 'application/vnd.google-earth.kml+xml');
            return i[0];
        }
    },

    writer_gpkg: {
        cat: '5. WRITERS', label: 'GPKG DL', icon: 'fa-database', color: '#c0392b', in: 1, out: 0,
        help: 'Exporta GeoPackage (experimental).',
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
        cat: '5. WRITERS', label: 'Parquet DL', icon: 'fa-table', color: '#c0392b', in: 1, out: 0,
        help: 'Exporta Parquet (experimental).',
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
        cat: '5. WRITERS', label: 'GDB', icon: 'fa-folder-open', color: '#c0392b', in: 1, out: 0,
        dynamicInputs: true, inputClonePolicy: 'none', help: 'Exporta File Geodatabase mediante un backend compatible.',
        tpl: () => `<input class="node-control" df-fn value="export.gdb.zip" placeholder="Nombre archivo"><input class="node-control" df-layer-name value="layer" placeholder="Prefijo capa"><div style="font-size:.66em;color:#aaa;margin-top:5px">Requiere backend · varias entradas admitidas</div>`,
        run: async (id, inputs, dom) => {
            const filename = writerFilename(dom, 'export.gdb.zip'); const layerPrefix = resolveParamTextWriter(dom?.querySelector('[df-layer-name]')?.value || 'layer') || 'layer';
            const layers = (Array.isArray(inputs) ? inputs : []).map((data, index) => data ? { name: `${layerPrefix}_${index + 1}`, data: writerFeatureCollection(data) } : null).filter(Boolean);
            await writerBackendExport('gdb', inputs?.[0], { filename, layer_name: layerPrefix, layers }, id); return inputs?.[0];
        }
    },

    writer_shp: {
        cat: '5. WRITERS', label: 'SHP', icon: 'fa-map', color: '#c0392b', in: 1, out: 0, inputClonePolicy: 'none', help: 'Exporta Shapefile como ZIP en el navegador.',
        tpl: () => `<input class="node-control" df-fn value="export.shp.zip" placeholder="Nombre archivo"><input class="node-control" df-layer-name value="layer" placeholder="Nombre de capa">`,
        run: async (id, inputs, dom) => {
            const source = writerFeatureCollection(inputs?.[0]); if (!source.features.length) throw new Error('SHP Writer necesita entidades de entrada');
            const shpwrite = await writerEnsureScript('https://unpkg.com/@mapbox/shp-write@0.4.3/shpwrite.js', 'shpwrite');
            const filename = writerFilename(dom, 'export.shp.zip'); const layer = resolveParamTextWriter(dom?.querySelector('[df-layer-name]')?.value || 'layer') || 'layer';
            const archive = await shpwrite.zip(source, { folder: layer, types: { point: layer, polygon: layer, polyline: layer } });
            writerDownload(archive, filename, 'application/zip'); return inputs?.[0];
        }
    },

    writer_xlsx: {
        cat: '5. WRITERS', label: 'XLSX', icon: 'fa-table', color: '#c0392b', in: 1, out: 0, inputClonePolicy: 'none', help: 'Exporta atributos a un libro Excel local.',
        tpl: () => `<input class="node-control" df-fn value="export.xlsx" placeholder="Nombre archivo"><input class="node-control" df-sheet value="Data" placeholder="Nombre de hoja">`,
        run: async (id, inputs, dom) => {
            const XLSX = await writerEnsureScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX');
            const rows = writerRows(inputs?.[0]); const sheetName = String(dom?.querySelector('[df-sheet]')?.value || 'Data').slice(0, 31) || 'Data';
            const workbook = XLSX.utils.book_new(); const worksheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            writerDownload(bytes, writerFilename(dom, 'export.xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); return inputs?.[0];
        }
    },

    writer_wkt: { cat: '5. WRITERS', label: 'WKT Console', icon: 'fa-font', color: '#c0392b', in: 1, out: 0, tpl: () => `<div>Ver en Log</div>`, run: (id, i) => { i[0].features.forEach(f => log(wellknown.stringify(f))); return i[0] } }
});

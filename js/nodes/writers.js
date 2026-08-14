// Cat: writers
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
function resolveParamTextWriter(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
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

    writer_wkt: { cat: '5. WRITERS', label: 'WKT Console', icon: 'fa-font', color: '#c0392b', in: 1, out: 0, tpl: () => `<div>Ver en Log</div>`, run: (id, i) => { i[0].features.forEach(f => log(wellknown.stringify(f))); return i[0] } }
});

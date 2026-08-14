// Cat: readers
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
function resolveParamTextReader(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    reader_osm: {
        cat: '1. READERS', label: 'OSM Reader', icon: 'fa-globe', color: '#e67e22', in: 0, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Lugar / Zona</span>
                <input type="text" df-place class="node-control" placeholder="Ej: Humanes de Madrid" value="Madrid">
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Extensión (Metros lado)</span>
                <input type="number" df-size class="node-control" value="2000" min="50" max="2200">
                <div style="font-size:0.6em;color:#666;font-style:italic">Máximo permitido: 2200m</div>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Capa a extraer</span>
                <select class="node-control" df-t>
                    <option value="building">Edificios</option>
                    <option value="highway">Carreteras</option>
                    <option value="leisure=park">Parques</option>
                    <option value="amenity">Servicios</option>
                    <option value="waterway">Agua</option>
                    <option value="landuse">Usos suelo</option>
                </select>
            </div>`,
        run: async (id, i, d) => {
            const place = resolveParamTextReader(d.querySelector('[df-place]').value);
            let size = parseFloat(resolveParamTextReader(d.querySelector('[df-size]').value));
            const type = resolveParamTextReader(d.querySelector('[df-t]').value);

            if (!place) throw new Error("Introduce un nombre de lugar.");

            // Límite duro basado en tu offset original de 0.02 grados (~2.2km)
            if (size > 2200) {
                size = 2200;
                if (window.log) window.log("⚠️ Aviso: Extensión ajustada al máximo (2200m).");
            }

            // 1. Geocodificación (Nominatim) para obtener Lat/Lon del centro
            if (window.log) window.log(`📍 Localizando: ${place}...`);
            const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;

            let lat, lon;
            try {
                const nomRes = await fetch(nomUrl);
                const nomData = await nomRes.json();
                if (!nomData || nomData.length === 0) throw new Error("Lugar no encontrado.");
                lat = parseFloat(nomData[0].lat);
                lon = parseFloat(nomData[0].lon);
            } catch (e) { throw new Error("Error geocodificando: " + e.message); }

            // 2. Calcular Bounding Box (Metros -> Grados)
            // 1 grado latitud ~= 111,320 metros
            const metersPerDegLat = 111320;
            const metersPerDegLon = 111320 * Math.cos(lat * (Math.PI / 180));

            const latOffset = (size / 2) / metersPerDegLat;
            const lonOffset = (size / 2) / metersPerDegLon;

            const s = lat - latOffset;
            const w = lon - lonOffset;
            const n = lat + latOffset;
            const e = lon + lonOffset;

            // 3. Consultar Overpass API
            const [k, v] = type.includes('=') ? type.split('=') : [type, null];
            // Sintaxis Overpass: (south, west, north, east)
            const query = `[out:json];(way["${k}"${v ? `="${v}"` : ''}](${s},${w},${n},${e}););out geom;`;

            if (window.log) window.log(`⬇️ Descargando ${type} de OSM...`);

            try {
                const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
                if (!r.ok) throw new Error("Servidor OSM saturado o error.");
                const data = await r.json();
                const geojson = osmtogeojson(data);

                if (geojson.features.length === 0) if (window.log) window.log("⚠️ La consulta no devolvió resultados en esa zona.");

                return geojson;
            } catch (err) { throw new Error("Fallo Overpass: " + err.message); }
        }
    },

    reader_file: {
        cat: '1. READERS', label: 'File Reader', icon: 'fa-folder-open', color: '#e67e22', in: 0, out: 1,
        tpl: () => `<input type="file" data-load-file="1" class="node-control"><div style="font-size:0.7em;color:#aaa" class="file-lbl">Sin archivo</div>`,
        run: async (id) => { const v = window._file_cache && window._file_cache['file_' + id]; if (!v) throw new Error("Sin archivo"); return v; }
    },

    reader_gpkg: {
        cat: '1. READERS', label: 'GPKG Reader', icon: 'fa-database', color: '#e67e22', in: 0, out: 1,
        help: 'Lee GeoPackage (experimental). Si falla, revisa la librería GeoPackage.',
        tpl: () => `<input type="file" data-load-file="1" class="node-control" accept=".gpkg"><div style="font-size:0.7em;color:#aaa" class="file-lbl">Sin archivo</div>`,
        run: async (id) => { const v = window._file_cache && window._file_cache['file_' + id]; if (!v) throw new Error("Sin archivo"); return v; }
    },

    reader_parquet: {
        cat: '1. READERS', label: 'Parquet Reader', icon: 'fa-table', color: '#e67e22', in: 0, out: 1,
        help: 'Lee Parquet (experimental). Requiere ParquetReader global.',
        tpl: () => `<input type="file" data-load-file="1" class="node-control" accept=".parquet"><div style="font-size:0.7em;color:#aaa" class="file-lbl">Sin archivo</div>`,
        run: async (id) => { const v = window._file_cache && window._file_cache['file_' + id]; if (!v) throw new Error("Sin archivo"); return v; }
    },

    reader_http: { cat: '1. READERS', label: 'HTTP JSON', icon: 'fa-cloud-download-alt', color: '#e67e22', in: 0, out: 1, tpl: () => `<input class="node-control" df-u placeholder="URL (GeoJSON)">`, run: async (id, i, d) => { const u = resolveParamTextReader(d.querySelector('[df-u]').value); const r = await fetch(u); return await r.json(); } },

    reader_wkt: { cat: '1. READERS', label: 'WKT/Text', icon: 'fa-font', color: '#e67e22', in: 0, out: 1, tpl: () => `<textarea class="node-control" df-w placeholder="POINT(30 10)"></textarea>`, run: async (id, i, d) => { const t = resolveParamTextReader(d.querySelector('[df-w]').value); const w = wellknown(t); return turf.featureCollection([turf.feature(w)]) } },

    reader_bbox_gen: { cat: '1. READERS', label: 'BBox Creator', icon: 'fa-vector-square', color: '#e67e22', in: 0, out: 1, tpl: () => `<input class="node-control" df-b placeholder="minX,minY,maxX,maxY" value="-3.75,40.4,-3.65,40.5">`, run: (id, i, d) => { const b = resolveParamTextReader(d.querySelector('[df-b]').value).split(',').map(Number); return turf.featureCollection([turf.bboxPolygon(b)]) } },

    reader_geotiff: {
        cat: '1. READERS', label: 'GeoTIFF Reader', icon: 'fa-file-image', color: '#e67e22',
        in: 0, out: 1,
        tpl: (id) => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Archivo .tif / .tiff</span>
                <input type="file" df-file class="node-control" accept=".tif,.tiff">
            </div>
            <div style="font-size:0.6em;color:#666">
                Carga optimizada con referencia en memoria.
            </div>`,
        run: async (id, i, d) => {
            await window.JETLLoadScriptOnce('js/vendor/geotiff.js', 'GeoTIFF');
            const fileInput = d.querySelector('[df-file]');
            if (!fileInput.files || fileInput.files.length === 0) throw new Error("Selecciona un archivo TIFF");

            const file = fileInput.files[0];
            const arrayBuffer = await file.arrayBuffer(); // Leemos binario

            // --- TRUCO DE CACHÉ GLOBAL ---
            // Generamos un ID único y guardamos el binario pesado en window
            // Esto evita que se rompa al pasar por JSON entre nodos.
            const cacheId = 'tiff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            if (!window._tiff_cache) window._tiff_cache = {};
            if (!window._node_tiff_ref) window._node_tiff_ref = {};
            const prevRef = window._node_tiff_ref[String(id)];
            if (prevRef && window._tiff_cache[prevRef]) {
                delete window._tiff_cache[prevRef];
            }
            window._tiff_cache[cacheId] = arrayBuffer;
            window._node_tiff_ref[String(id)] = cacheId;

            // Leemos metadatos básicos para visualización
            const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
            const image = await tiff.getImage();
            const bbox = image.getBoundingBox();
            const poly = turf.bboxPolygon(bbox);

            // Pasamos solo la REFERENCIA (ID)
            poly.properties = {
                source_file: file.name,
                type: 'raster_bbox',
                width: image.getWidth(),
                height: image.getHeight(),
                _raster_ref_id: cacheId // <--- La llave maestra
            };

            if (window.log) window.log(`📷 Raster cargado en caché (${cacheId})`);

            return turf.featureCollection([poly]);
        }
    },

    gen_point: { cat: '1. READERS', label: 'Point Creator', icon: 'fa-map-pin', color: '#e67e22', in: 0, out: 1, tpl: () => `<input class="node-control" df-c placeholder="Lon,Lat" value="-3.703,40.416">`, run: (id, i, d) => { const c = resolveParamTextReader(d.querySelector('[df-c]').value).split(',').map(Number); return turf.featureCollection([turf.point(c)]) } },

    gen_grid: { cat: '1. READERS', label: 'Grid Generator', icon: 'fa-th', color: '#e67e22', in: 0, out: 1, tpl: () => `<select class="node-control" df-t><option value="hex">Hex</option><option value="sq">Square</option></select><input class="node-control" type="number" df-s value="1" placeholder="Size km">`, run: (id, i, d) => { const t = resolveParamTextReader(d.querySelector('[df-t]').value), s = parseFloat(resolveParamTextReader(d.querySelector('[df-s]').value)), b = [-3.8, 40.3, -3.6, 40.5]; return t === 'hex' ? turf.hexGrid(b, s) : turf.squareGrid(b, s) } },

    gen_random: { cat: '1. READERS', label: 'Random Points', icon: 'fa-dice', color: '#e67e22', in: 0, out: 1, tpl: () => `<input type="number" df-n value="50" class="node-control">`, run: (id, i, d) => turf.randomPoint(parseInt(resolveParamTextReader(d.querySelector('[df-n]').value)), { bbox: [-3.8, 40.3, -3.6, 40.5] }) }
});

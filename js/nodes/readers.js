// Cat: readers
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
function resolveParamTextReader(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}

const READER_MULTI_OUTPUTS = 16;
const FEATURE_READER_DEFAULT_CONFIG = {
    version: 1,
    format: 'csv',
    path_mode: 'attribute',
    path_value: '',
    path_expression: '',
    layer_mode: 'none',
    layer_value: '',
    schema_policy: 'union',
    merge_initiator: true,
    initiator_prefix: 'init_',
    reader_prefix: '',
    cache_policy: 'per_dataset_layer',
    missing_file_policy: 'reject',
    empty_read_policy: 'pass_empty_summary',
    max_features_per_initiator: 0,
    csv: { lat_field: '', lon_field: '', delimiter: 'auto', encoding: 'utf-8' }
};

function readerCloneCompat(value) {
    if (typeof window !== 'undefined' && typeof window.JETLClone === 'function') return window.JETLClone(value);
    return JSON.parse(JSON.stringify(value));
}

function readerSelectedFilesCompat(dom) {
    const input = dom?.querySelector?.('[df-file]');
    return input?.files ? Array.from(input.files).filter(Boolean) : [];
}

function readerSourceNameCompat(source, index = 0) {
    return String(source?.name || source?.path || `source_${index + 1}`);
}

function readerFeatureCollectionCompat(value, metadata = {}) {
    let result;
    if (value?.type === 'FeatureCollection') result = readerCloneCompat(value);
    else if (value?.type === 'Feature') result = turf.featureCollection([readerCloneCompat(value)]);
    else if (value?.type && (Array.isArray(value.coordinates) || Array.isArray(value.geometries))) result = turf.featureCollection([turf.feature(readerCloneCompat(value), {})]);
    else if (Array.isArray(value)) result = turf.featureCollection(value.map(readerCloneCompat));
    else throw new Error('El lector no devolvió una colección GeoJSON válida');
    result.metadata = { ...(result.metadata || {}), ...metadata, feature_count: result.features.length };
    return result;
}

function readerDelimitedRowCompat(line, delimiter) {
    const values = []; let value = ''; let quoted = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (char === '"') {
            if (quoted && line[index + 1] === '"') { value += '"'; index++; }
            else quoted = !quoted;
        } else if (char === delimiter && !quoted) { values.push(value); value = ''; }
        else value += char;
    }
    values.push(value);
    return values;
}

function readerDelimitedRecordsCompat(text, delimiter) {
    const records = []; let record = []; let value = ''; let quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');
    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        if (char === '"') {
            if (quoted && source[index + 1] === '"') { value += '"'; index++; }
            else quoted = !quoted;
        } else if (char === delimiter && !quoted) { record.push(value); value = ''; }
        else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && source[index + 1] === '\n') index++;
            record.push(value); value = '';
            if (record.some((cell) => String(cell).trim() !== '')) records.push(record);
            record = [];
        } else value += char;
    }
    record.push(value);
    if (record.some((cell) => String(cell).trim() !== '')) records.push(record);
    return records;
}

function readerTypedValueCompat(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
    if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return Number(text);
    return text;
}

function readerDetectFieldCompat(headers, preferred, candidates) {
    if (preferred && headers.includes(preferred)) return preferred;
    const normalized = new Map(headers.map((header) => [String(header).trim().toLowerCase(), header]));
    for (const candidate of candidates) if (normalized.has(candidate)) return normalized.get(candidate);
    return '';
}

function readerRowsToFeaturesCompat(rows, options = {}) {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const latField = readerDetectFieldCompat(headers, options.lat_column || options.lat_field, ['lat', 'latitude', 'y']);
    const lonField = readerDetectFieldCompat(headers, options.lon_column || options.lon_field, ['lon', 'lng', 'long', 'longitude', 'x']);
    const wktField = readerDetectFieldCompat(headers, options.wkt_column, ['wkt', 'geometry', 'geom']);
    return rows.map((row) => {
        let geometry = null;
        if (latField && lonField && Number.isFinite(Number(row[latField])) && Number.isFinite(Number(row[lonField]))) {
            geometry = { type: 'Point', coordinates: [Number(row[lonField]), Number(row[latField])] };
        } else if (wktField && typeof wellknown !== 'undefined') {
            try { geometry = wellknown.parse(String(row[wktField] || '')); } catch (error) { geometry = null; }
        }
        return turf.feature(geometry, { ...row });
    });
}

function readerParseCsvCompat(text, options = {}) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
    if (!lines.length) return turf.featureCollection([]);
    const delimiter = options.delimiter && options.delimiter !== 'auto'
        ? String(options.delimiter)
        : [',', ';', '\t'].sort((a, b) => readerDelimitedRowCompat(lines[0], b).length - readerDelimitedRowCompat(lines[0], a).length)[0];
    const records = readerDelimitedRecordsCompat(text, delimiter);
    const headers = (records[0] || []).map((header) => header.trim());
    const rows = records.slice(1).map((values) => {
        return Object.fromEntries(headers.map((header, index) => [header, readerTypedValueCompat(values[index])]));
    });
    return turf.featureCollection(readerRowsToFeaturesCompat(rows, options));
}

function readerParseGpxCompat(text) {
    if (typeof DOMParser === 'undefined') throw new Error('Este navegador no dispone de parser XML para GPX');
    const xml = new DOMParser().parseFromString(String(text || ''), 'text/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('GPX inválido');
    const numberAttr = (node, name) => Number(node.getAttribute(name));
    const properties = (node) => {
        const result = {};
        for (const tag of ['name', 'desc', 'type', 'time']) {
            const value = node.getElementsByTagName(tag)[0]?.textContent?.trim();
            if (value) result[tag] = value;
        }
        return result;
    };
    const coordinate = (node) => {
        const lon = numberAttr(node, 'lon'); const lat = numberAttr(node, 'lat');
        const elevation = Number(node.getElementsByTagName('ele')[0]?.textContent);
        return Number.isFinite(elevation) ? [lon, lat, elevation] : [lon, lat];
    };
    const waypoints = Array.from(xml.getElementsByTagName('wpt')).map((node) => turf.point(coordinate(node), properties(node)));
    const routes = Array.from(xml.getElementsByTagName('rte')).map((node) => {
        const coords = Array.from(node.getElementsByTagName('rtept')).map(coordinate).filter((item) => Number.isFinite(item[0]) && Number.isFinite(item[1]));
        return coords.length >= 2 ? turf.lineString(coords, properties(node)) : null;
    }).filter(Boolean);
    const tracks = [];
    Array.from(xml.getElementsByTagName('trk')).forEach((track) => {
        const trackProperties = properties(track);
        Array.from(track.getElementsByTagName('trkseg')).forEach((segment, segmentIndex) => {
            const coords = Array.from(segment.getElementsByTagName('trkpt')).map(coordinate);
            if (coords.length >= 2) tracks.push(turf.lineString(coords, { ...trackProperties, segment: segmentIndex + 1 }));
        });
    });
    return {
        output_1: turf.featureCollection(tracks),
        output_2: turf.featureCollection(routes),
        output_3: turf.featureCollection(waypoints)
    };
}

async function readerLocalSourceCompat(source, format, options = {}) {
    const name = readerSourceNameCompat(source).toLowerCase();
    if (format === 'csv') return readerFeatureCollectionCompat(readerParseCsvCompat(await source.text(), options), { format, source_file: source.name });
    if (format === 'geojson') return readerFeatureCollectionCompat(JSON.parse(await source.text()), { format, source_file: source.name });
    if (format === 'kml' || format === 'shp') {
        if (!window.JETLFormats?.readFile) throw new Error(`Motor local ${format.toUpperCase()} no disponible`);
        if (format === 'shp' && !name.endsWith('.zip')) throw new Error('En Studio, selecciona el conjunto SHP comprimido como ZIP');
        return readerFeatureCollectionCompat(await window.JETLFormats.readFile(source), { format, source_file: source.name });
    }
    if (format === 'gpx') return readerParseGpxCompat(await source.text());
    if (format === 'xlsx') {
        if (!window.XLSX) await window.JETLLoadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX');
        if (!window.XLSX) throw new Error('Motor Excel no disponible');
        const workbook = window.XLSX.read(await source.arrayBuffer(), { type: 'array', cellDates: true });
        const sheetName = options.sheet_name && workbook.Sheets[options.sheet_name] ? options.sheet_name : workbook.SheetNames[0];
        if (!sheetName) return turf.featureCollection([]);
        const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });
        return readerFeatureCollectionCompat(turf.featureCollection(readerRowsToFeaturesCompat(rows, options)), { format, source_file: source.name, sheet_name: sheetName });
    }
    throw new Error(`Formato local no soportado: ${format}`);
}

async function readerSourceCompat(source, format, options = {}) {
    const owner = typeof window.JETLBackendIntegration?.readFile === 'function' ? window.JETLBackendIntegration : window.JETLBackend;
    const backend = owner?.readFile;
    if (typeof backend === 'function') {
        try {
            const result = await backend.call(owner, source, format, options);
            if (result) return result;
        } catch (error) {
            if (window.log) window.log(`Backend ${format}: ${error.message}. Probando lector local.`);
        }
    }
    return await readerLocalSourceCompat(source, format, options);
}

async function readerCollectionCompat(sources, format, options = {}) {
    const owner = typeof window.JETLBackendIntegration?.readCollection === 'function' ? window.JETLBackendIntegration : window.JETLBackend;
    const backend = owner?.readCollection;
    if (typeof backend === 'function' && sources.length > 1) {
        try {
            const result = await backend.call(owner, sources, format, options);
            if (result) return result;
        } catch (error) {
            if (window.log) window.log(`Colección ${format}: ${error.message}. Concatenando en Studio.`);
        }
    }
    const collections = [];
    for (let index = 0; index < sources.length; index++) {
        const collection = readerFeatureCollectionCompat(await readerSourceCompat(sources[index], format, options));
        collections.push({ collection, sourceName: readerSourceNameCompat(sources[index], index) });
    }
    if (String(options.schema_policy || 'same_schema') !== 'union' && collections.length > 1) {
        const schemas = collections.map(({ collection }) => Object.keys(collection.features[0]?.properties || {}).sort().join('\u0000'));
        if (schemas.some((schema) => schema !== schemas[0])) throw new Error('Los archivos seleccionados no tienen el mismo esquema');
    }
    const features = collections.flatMap(({ collection, sourceName }) => collection.features.map((feature) => {
        const item = readerCloneCompat(feature); item.properties = { ...(item.properties || {}) };
        if (item.properties.jetl_source_file === undefined) item.properties.jetl_source_file = sourceName;
        return item;
    }));
    return readerFeatureCollectionCompat(turf.featureCollection(features), { format, collection_mode: 'concat', schema_policy: options.schema_policy || 'same_schema', source_count: sources.length, source_files: collections.map((item) => item.sourceName) });
}

function readerMultiOutputCompat(result) {
    const source = result?.outputs && typeof result.outputs === 'object' ? result.outputs : result;
    const outputs = {};
    for (let index = 1; index <= READER_MULTI_OUTPUTS; index++) outputs[`output_${index}`] = source?.[`output_${index}`] || turf.featureCollection([]);
    if (result?.type === 'FeatureCollection') outputs.output_1 = result;
    return outputs;
}

function readerFileTemplateCompat(accept, detail = '') {
    return `<div class="node-editor-summary"><i class="fas fa-file-import"></i><div><strong data-reader-file-summary>Seleccionar archivo</strong><small>${detail}</small></div></div><input type="file" df-file class="node-control" accept="${accept}" multiple>`;
}
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    reader_geojson: {
        cat: '1. READERS', label: 'GeoJSON Reader', icon: 'fa-file-code', color: '#e67e22', in: 0, out: 1,
        help: 'Lee uno o varios GeoJSON localmente en Studio.',
        tpl: () => readerFileTemplateCompat('.geojson,.json', 'GeoJSON · colección'),
        run: async (id, inputs, dom) => {
            const sources = readerSelectedFilesCompat(dom); if (!sources.length) throw new Error('Selecciona uno o varios GeoJSON');
            return await readerCollectionCompat(sources, 'geojson', { schema_policy: 'union' });
        }
    },

    reader_kml: {
        cat: '1. READERS', label: 'KML Reader', icon: 'fa-globe', color: '#e67e22', in: 0, out: 1,
        help: 'Lee uno o varios KML localmente en Studio.',
        tpl: () => readerFileTemplateCompat('.kml', 'KML · colección'),
        run: async (id, inputs, dom) => {
            const sources = readerSelectedFilesCompat(dom); if (!sources.length) throw new Error('Selecciona uno o varios KML');
            return await readerCollectionCompat(sources, 'kml', { schema_policy: 'union' });
        }
    },

    reader_csv: {
        cat: '1. READERS', label: 'CSV Reader', icon: 'fa-file-csv', color: '#e67e22', in: 0, out: 1,
        help: 'Lee CSV localmente y detecta coordenadas lat/lon o WKT.',
        tpl: () => `${readerFileTemplateCompat('.csv', 'CSV · lat/lon o WKT')}<div style="display:flex;gap:8px"><label><small>Lat</small><input type="text" df-lat class="node-control" placeholder="lat"></label><label><small>Lon</small><input type="text" df-lon class="node-control" placeholder="lon"></label></div>`,
        run: async (id, inputs, dom) => {
            const sources = readerSelectedFilesCompat(dom); if (!sources.length) throw new Error('Selecciona uno o varios CSV');
            const options = { lat_column: resolveParamTextReader(dom.querySelector('[df-lat]')?.value || ''), lon_column: resolveParamTextReader(dom.querySelector('[df-lon]')?.value || ''), schema_policy: 'same_schema' };
            return await readerCollectionCompat(sources, 'csv', options);
        }
    },

    reader_excel: {
        cat: '1. READERS', label: 'Excel Reader', icon: 'fa-file-excel', color: '#e67e22', in: 0, out: 1,
        help: 'Lee Excel localmente y detecta coordenadas lat/lon.',
        tpl: () => `${readerFileTemplateCompat('.xlsx,.xls', 'Excel · primera hoja')}<div style="display:flex;gap:8px"><label><small>Lat</small><input type="text" df-lat class="node-control" placeholder="lat"></label><label><small>Lon</small><input type="text" df-lon class="node-control" placeholder="lon"></label></div>`,
        run: async (id, inputs, dom) => {
            const sources = readerSelectedFilesCompat(dom); if (!sources.length) throw new Error('Selecciona uno o varios Excel');
            const options = { lat_column: resolveParamTextReader(dom.querySelector('[df-lat]')?.value || ''), lon_column: resolveParamTextReader(dom.querySelector('[df-lon]')?.value || ''), schema_policy: 'same_schema' };
            return await readerCollectionCompat(sources, 'xlsx', options);
        }
    },

    reader_shp: {
        cat: '1. READERS', label: 'SHP Reader', icon: 'fa-map', color: '#e67e22', in: 0, out: 1,
        help: 'Lee SHP comprimido en ZIP localmente; conjuntos sueltos requieren backend.',
        tpl: () => readerFileTemplateCompat('.zip,.shp,.shx,.dbf,.prj,.cpg', 'ZIP recomendado'),
        run: async (id, inputs, dom) => {
            const sources = readerSelectedFilesCompat(dom); if (!sources.length) throw new Error('Selecciona un SHP ZIP o su conjunto de archivos');
            if (sources.length === 1 && String(sources[0].name || '').toLowerCase().endsWith('.zip')) return await readerSourceCompat(sources[0], 'shp', {});
            const owner = typeof window.JETLBackendIntegration?.readCollection === 'function' ? window.JETLBackendIntegration : window.JETLBackend;
            const backend = owner?.readCollection;
            if (typeof backend !== 'function') throw new Error('Los SHP sueltos requieren backend; comprime .shp, .shx, .dbf y .prj en un ZIP');
            return await backend.call(owner, sources, 'shp', { schema_policy: 'same_schema' });
        }
    },

    reader_gpx: {
        cat: '1. READERS', label: 'GPX Reader', icon: 'fa-route', color: '#e67e22', in: 0, out: READER_MULTI_OUTPUTS,
        help: 'Lee GPX y expone tracks, routes y waypoints como capas independientes.',
        tpl: () => readerFileTemplateCompat('.gpx', '16 salidas por capas'),
        run: async (id, inputs, dom) => {
            const sources = readerSelectedFilesCompat(dom); if (!sources.length) throw new Error('Selecciona uno o varios GPX');
            if (sources.length === 1) return readerMultiOutputCompat(await readerSourceCompat(sources[0], 'gpx', {}));
            const tracks = []; const routes = []; const waypoints = [];
            for (const source of sources) {
                const result = readerMultiOutputCompat(await readerSourceCompat(source, 'gpx', {}));
                tracks.push(...result.output_1.features); routes.push(...result.output_2.features); waypoints.push(...result.output_3.features);
            }
            return readerMultiOutputCompat({ output_1: turf.featureCollection(tracks), output_2: turf.featureCollection(routes), output_3: turf.featureCollection(waypoints) });
        }
    },

    reader_gdb: {
        cat: '1. READERS', label: 'GDB Reader', icon: 'fa-folder', color: '#e67e22', in: 0, out: READER_MULTI_OUTPUTS,
        help: 'Lee File Geodatabase por capas mediante backend, sin cargar GDAL pesado en móvil.',
        tpl: () => readerFileTemplateCompat('.zip,.gdb', 'Requiere backend · 16 salidas'),
        run: async (id, inputs, dom) => {
            const sources = readerSelectedFilesCompat(dom); if (!sources.length) throw new Error('Selecciona un GDB comprimido en ZIP');
            const collectionOwner = typeof window.JETLBackendIntegration?.readCollection === 'function' ? window.JETLBackendIntegration : window.JETLBackend;
            const fileOwner = typeof window.JETLBackendIntegration?.readFile === 'function' ? window.JETLBackendIntegration : window.JETLBackend;
            const collectionBackend = collectionOwner?.readCollection; const fileBackend = fileOwner?.readFile;
            let result;
            if (sources.length > 1 && typeof collectionBackend === 'function') result = await collectionBackend.call(collectionOwner, sources, 'gdb', { all_layers: true });
            else if (typeof fileBackend === 'function') result = await fileBackend.call(fileOwner, sources[0], 'gdb', { all_layers: true });
            else if (typeof collectionBackend === 'function') result = await collectionBackend.call(collectionOwner, sources, 'gdb', { all_layers: true });
            else throw new Error('GDB Reader requiere backend; GDAL no se carga en Studio móvil');
            return readerMultiOutputCompat(result);
        }
    },

    reader_feature_reader: {
        cat: '1. READERS', label: 'FeatureReader', icon: 'fa-folder-open', color: '#e67e22', in: 1, out: 3, inputClonePolicy: 'none',
        help: 'Lee datasets dinámicamente desde atributos del feature iniciador mediante backend.',
        tpl: () => `<div class="node-editor-summary"><i class="fas fa-folder-open"></i><div><strong data-geom-transform-summary>CSV · atributo</strong><small>1 entrada · 3 salidas</small></div></div><button type="button" class="btn node-editor-open" data-schema-action="geom-transform-open-editor"><i class="fas fa-pen"></i> Configurar</button><div class="node-editor-storage"><textarea df-fr-config>${JSON.stringify(FEATURE_READER_DEFAULT_CONFIG)}</textarea></div>`,
        run: async (id, inputs, dom) => {
            const initiators = inputs[0];
            if (!initiators || !Array.isArray(initiators.features)) throw new Error('FeatureReader requiere features iniciadoras en input_1');
            let config; try { config = { ...FEATURE_READER_DEFAULT_CONFIG, ...JSON.parse(dom.querySelector('[df-fr-config]')?.value || '{}') }; } catch (error) { config = readerCloneCompat(FEATURE_READER_DEFAULT_CONFIG); }
            config.csv = { ...FEATURE_READER_DEFAULT_CONFIG.csv, ...(config.csv || {}) };
            if (config.path_mode === 'attribute' && !config.path_value) throw new Error('FeatureReader requiere seleccionar el atributo que contiene la ruta');
            if (config.path_mode === 'static' && !config.path_value) throw new Error('FeatureReader requiere una ruta fija');
            if (config.path_mode === 'template' && !config.path_expression) throw new Error('FeatureReader requiere una plantilla de ruta');
            if (typeof window.JETLBackend?.featureReader !== 'function') throw new Error('FeatureReader requiere backend: el navegador móvil no puede abrir rutas dinámicas');
            const result = await window.JETLBackend.featureReader({ initiators }, config, { node_id: id });
            if (!result?.output_1) throw new Error('FeatureReader no devolvió resultados');
            return result;
        }
    },

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

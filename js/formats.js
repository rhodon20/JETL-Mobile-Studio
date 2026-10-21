// =============================================
// FORMATS REGISTRY (MODULAR I/O)
// =============================================
// This module isolates new/experimental formats so they are easy to locate.
(function () {
    const registry = {
        readers: [],
        writers: []
    };

    function _xmlEscape(v) {
        return String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function _coordsToKml(coords) {
        return coords.map(c => {
            const x = Number(c[0]);
            const y = Number(c[1]);
            const z = c.length > 2 ? Number(c[2]) : null;
            return z === null || Number.isNaN(z) ? `${x},${y}` : `${x},${y},${z}`;
        }).join(' ');
    }

    function _parseCoords(text) {
        if (!text) return [];
        return text
            .trim()
            .split(/\s+/)
            .map(token => token.split(',').map(Number))
            .filter(c => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
            .map(c => c.length >= 3 && Number.isFinite(c[2]) ? [c[0], c[1], c[2]] : [c[0], c[1]]);
    }

    function _elText(parent, tag) {
        const el = parent.getElementsByTagName(tag)[0];
        return el && el.textContent ? el.textContent.trim() : '';
    }

    function _firstDirectChild(el, tagName) {
        for (const child of el.children || []) {
            if (child.tagName === tagName) return child;
        }
        return null;
    }

    function _kmlGeometryToGeoJSON(el) {
        if (!el) return null;
        const tag = el.tagName;

        if (tag === 'Point') {
            const coords = _parseCoords(_elText(el, 'coordinates'));
            if (!coords.length) return null;
            return { type: 'Point', coordinates: coords[0] };
        }
        if (tag === 'LineString') {
            const coords = _parseCoords(_elText(el, 'coordinates'));
            if (coords.length < 2) return null;
            return { type: 'LineString', coordinates: coords };
        }
        if (tag === 'Polygon') {
            const rings = [];
            const outer = el.getElementsByTagName('outerBoundaryIs')[0];
            if (outer) {
                const lr = outer.getElementsByTagName('LinearRing')[0];
                const coords = _parseCoords(_elText(lr || outer, 'coordinates'));
                if (coords.length >= 4) rings.push(coords);
            }
            const inners = el.getElementsByTagName('innerBoundaryIs');
            for (let i = 0; i < inners.length; i++) {
                const lr = inners[i].getElementsByTagName('LinearRing')[0];
                const coords = _parseCoords(_elText(lr || inners[i], 'coordinates'));
                if (coords.length >= 4) rings.push(coords);
            }
            if (!rings.length) return null;
            return { type: 'Polygon', coordinates: rings };
        }
        if (tag === 'MultiGeometry') {
            const geoms = [];
            for (const child of el.children || []) {
                const g = _kmlGeometryToGeoJSON(child);
                if (g) geoms.push(g);
            }
            if (!geoms.length) return null;

            const same = geoms.every(g => g.type === geoms[0].type);
            if (same && geoms[0].type === 'Point') return { type: 'MultiPoint', coordinates: geoms.map(g => g.coordinates) };
            if (same && geoms[0].type === 'LineString') return { type: 'MultiLineString', coordinates: geoms.map(g => g.coordinates) };
            if (same && geoms[0].type === 'Polygon') return { type: 'MultiPolygon', coordinates: geoms.map(g => g.coordinates) };
            return { type: 'GeometryCollection', geometries: geoms };
        }

        return null;
    }

    function parseKMLToGeoJSON(text) {
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        const parseErr = xml.getElementsByTagName('parsererror');
        if (parseErr && parseErr.length) throw new Error("KML invalido");

        const placemarks = Array.from(xml.getElementsByTagName('Placemark'));
        const features = [];

        const kmlGeomTags = ['Point', 'LineString', 'Polygon', 'MultiGeometry'];
        const findGeom = (pm) => {
            for (const t of kmlGeomTags) {
                const el = _firstDirectChild(pm, t);
                if (el) return el;
            }
            for (const t of kmlGeomTags) {
                const all = pm.getElementsByTagName(t);
                if (all.length) return all[0];
            }
            return null;
        };

        placemarks.forEach(pm => {
            const geomEl = findGeom(pm);
            const geometry = _kmlGeometryToGeoJSON(geomEl);
            if (!geometry) return;

            const props = {};
            const name = _elText(pm, 'name');
            const description = _elText(pm, 'description');
            if (name) props.name = name;
            if (description) props.description = description;

            const dataEls = pm.getElementsByTagName('Data');
            for (let i = 0; i < dataEls.length; i++) {
                const key = dataEls[i].getAttribute('name');
                if (!key) continue;
                const valEl = dataEls[i].getElementsByTagName('value')[0];
                props[key] = valEl ? (valEl.textContent || '').trim() : '';
            }

            features.push(turf.feature(geometry, props));
        });

        if (features.length) return turf.featureCollection(features);

        const firstGeom = (() => {
            for (const t of kmlGeomTags) {
                const all = xml.getElementsByTagName(t);
                if (all.length) return all[0];
            }
            return null;
        })();

        const g = _kmlGeometryToGeoJSON(firstGeom);
        if (!g) throw new Error("KML sin geometrias compatibles");
        return turf.featureCollection([turf.feature(g, {})]);
    }

    function _geomToKml(geometry) {
        if (!geometry || !geometry.type) return '';
        const t = geometry.type;
        const c = geometry.coordinates;

        if (t === 'Point') {
            return `<Point><coordinates>${_coordsToKml([c])}</coordinates></Point>`;
        }
        if (t === 'LineString') {
            return `<LineString><coordinates>${_coordsToKml(c)}</coordinates></LineString>`;
        }
        if (t === 'Polygon') {
            const rings = (c || []).map(r => {
                if (!r || !r.length) return null;
                const first = r[0];
                const last = r[r.length - 1];
                const closed = (first[0] === last[0] && first[1] === last[1]) ? r : [...r, first];
                return closed;
            }).filter(Boolean);
            if (!rings.length) return '';
            const outer = `<outerBoundaryIs><LinearRing><coordinates>${_coordsToKml(rings[0])}</coordinates></LinearRing></outerBoundaryIs>`;
            const inners = rings.slice(1).map(r => `<innerBoundaryIs><LinearRing><coordinates>${_coordsToKml(r)}</coordinates></LinearRing></innerBoundaryIs>`).join('');
            return `<Polygon>${outer}${inners}</Polygon>`;
        }
        if (t === 'MultiPoint') {
            return `<MultiGeometry>${(c || []).map(p => `<Point><coordinates>${_coordsToKml([p])}</coordinates></Point>`).join('')}</MultiGeometry>`;
        }
        if (t === 'MultiLineString') {
            return `<MultiGeometry>${(c || []).map(line => `<LineString><coordinates>${_coordsToKml(line)}</coordinates></LineString>`).join('')}</MultiGeometry>`;
        }
        if (t === 'MultiPolygon') {
            const polys = (c || []).map(poly => _geomToKml({ type: 'Polygon', coordinates: poly })).join('');
            return `<MultiGeometry>${polys}</MultiGeometry>`;
        }
        if (t === 'GeometryCollection') {
            return `<MultiGeometry>${(geometry.geometries || []).map(g => _geomToKml(g)).join('')}</MultiGeometry>`;
        }
        return '';
    }

    function toKML(data) {
        const fc = (data && data.type === 'FeatureCollection')
            ? data
            : turf.featureCollection(Array.isArray(data) ? data : [data]);

        const body = (fc.features || []).map((f, idx) => {
            const geomXml = _geomToKml(f.geometry);
            if (!geomXml) return '';

            const props = f.properties || {};
            const name = props.name !== undefined ? `<name>${_xmlEscape(props.name)}</name>` : `<name>feature_${idx + 1}</name>`;
            const desc = props.description !== undefined ? `<description>${_xmlEscape(props.description)}</description>` : '';
            const ext = Object.keys(props)
                .filter(k => k !== 'name' && k !== 'description' && !k.startsWith('_'))
                .map(k => `<Data name="${_xmlEscape(k)}"><value>${_xmlEscape(props[k])}</value></Data>`)
                .join('');
            const extXml = ext ? `<ExtendedData>${ext}</ExtendedData>` : '';

            return `<Placemark>${name}${desc}${extXml}${geomXml}</Placemark>`;
        }).join('');

        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<kml xmlns="http://www.opengis.net/kml/2.2">',
            '<Document>',
            body,
            '</Document>',
            '</kml>'
        ].join('');
    }

    function _ext(name) {
        const i = name.lastIndexOf('.');
        return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
    }

    function registerReader(def) {
        if (!def || !def.exts || !def.read) return;
        registry.readers.push(def);
    }

    function registerWriter(def) {
        if (!def || !def.exts || !def.write) return;
        registry.writers.push(def);
    }

    async function readFile(file) {
        if (!file) throw new Error("Archivo no válido.");
        const ext = _ext(file.name);
        const reader = registry.readers.find(r => r.exts.includes(ext));
        if (!reader) throw new Error(`Formato no soportado: .${ext}`);
        const timeoutMs = reader.timeoutMs || 30000;
        return await _withTimeout(reader.read(file), timeoutMs, `Timeout leyendo .${ext}`);
    }

    async function writeFile(ext, data) {
        const writer = registry.writers.find(w => w.exts.includes(ext));
        if (!writer) throw new Error(`Formato de salida no soportado: .${ext}`);
        return await writer.write(data);
    }

    // ----------------------------
    // Built-in readers
    // ----------------------------
    registerReader({
        exts: ['geojson', 'json'],
        label: 'GeoJSON',
        read: async (file) => {
            const text = await file.text();
            return JSON.parse(text);
        }
    });

    registerReader({
        exts: ['kml'],
        label: 'KML',
        read: async (file) => {
            const text = await file.text();
            return parseKMLToGeoJSON(text);
        }
    });

    registerReader({
        exts: ['zip'],
        label: 'Shapefile ZIP',
        read: async (file) => {
            await window.JETLLoadScriptOnce('js/vendor/shp.js', 'shp');
            const buffer = await file.arrayBuffer();
            const result = await shp(buffer);
            return Array.isArray(result) ? turf.featureCollection(result.flatMap(r => r.features)) : result;
        }
    });

    // ----------------------------
    // GeoPackage y Parquet
    // ----------------------------
    // Las librerías van en js/vendor (sin CDN): se descargan la primera vez que se
    // usan y el service worker las guarda, así que después funcionan sin conexión.
    const GEOPACKAGE_SRC = 'js/vendor/geopackage.min.js';
    const ARROW_SRC = 'js/vendor/arrow.es2015.min.js';
    const PARQUET_WASM_SRC = 'js/vendor/parquet-wasm/parquet_wasm.js';

    async function _geopackage() {
        const GP = await window.JETLLoadScriptOnce(GEOPACKAGE_SRC, 'geopackage');
        if (!GP || typeof GP.open !== 'function') throw new Error('Motor GeoPackage no disponible.');
        return GP;
    }

    let _parquetReady = null;
    // parquet-wasm convierte Parquet <-> Arrow IPC; apache-arrow lee y construye las tablas.
    function _parquet() {
        if (!_parquetReady) {
            _parquetReady = (async () => {
                const Arrow = await window.JETLLoadScriptOnce(ARROW_SRC, 'Arrow');
                if (!Arrow || typeof Arrow.tableFromIPC !== 'function') throw new Error('Motor Arrow no disponible.');
                const wasm = await import(new URL(PARQUET_WASM_SRC, document.baseURI).href);
                await wasm.default();
                return { Arrow, wasm };
            })().catch((error) => { _parquetReady = null; throw error; });
        }
        return _parquetReady;
    }

    function _cancelled(what) {
        if (window.isEngineCancelled) throw new Error(`${what} cancelada.`);
    }

    // Valores de una fila que no caben en JSON: enteros de 64 bits (BigInt), binarios
    // y estructuras de Arrow.
    function _plainValue(value) {
        if (typeof value === 'bigint') {
            const asNumber = Number(value);
            return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
        }
        if (value instanceof Uint8Array || value instanceof ArrayBuffer) return '[BINARY]';
        if (value instanceof Date) return value.toISOString();
        if (value && typeof value === 'object') {
            const plain = typeof value.toJSON === 'function' ? value.toJSON() : value;
            try { return JSON.stringify(plain, (k, v) => typeof v === 'bigint' ? v.toString() : v); } catch (e) { return String(plain); }
        }
        return value;
    }

    // --- WKB (ISO y EWKB de PostGIS) <-> geometría GeoJSON ---
    const WKB_TYPES = ['', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];

    function wkbToGeometry(bytes) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let offset = 0;
        function read() {
            const little = view.getUint8(offset) === 1; offset += 1;
            let type = view.getUint32(offset, little); offset += 4;
            // EWKB: banderas en los bits altos (Z, M, SRID); ISO: 1000/2000/3000 sobre el tipo.
            let hasZ = (type & 0x80000000) !== 0, hasM = (type & 0x40000000) !== 0;
            if (type & 0x20000000) offset += 4;
            type &= 0x0fffffff;
            if (type >= 1000) { const dims = Math.floor(type / 1000); hasZ = hasZ || dims === 1 || dims === 3; hasM = hasM || dims === 2 || dims === 3; type %= 1000; }
            const size = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);
            const point = () => {
                const c = [];
                for (let i = 0; i < size; i++) { c.push(view.getFloat64(offset, little)); offset += 8; }
                // Se conserva Z; M no tiene sitio en GeoJSON.
                return hasZ ? c.slice(0, 3) : c.slice(0, 2);
            };
            const count = () => { const n = view.getUint32(offset, little); offset += 4; return n; };
            const points = () => Array.from({ length: count() }, point);
            const name = WKB_TYPES[type];
            if (name === 'Point') { const c = point(); return c.every(Number.isNaN) ? null : { type: name, coordinates: c }; }
            if (name === 'LineString') return { type: name, coordinates: points() };
            if (name === 'Polygon') return { type: name, coordinates: Array.from({ length: count() }, points) };
            if (name === 'GeometryCollection') return { type: name, geometries: Array.from({ length: count() }, read).filter(Boolean) };
            if (name && name.startsWith('Multi')) {
                return { type: name, coordinates: Array.from({ length: count() }, read).filter(Boolean).map((g) => g.coordinates) };
            }
            throw new Error(`Tipo de geometría WKB no soportado (${type})`);
        }
        return read();
    }

    // Z si alguna coordenada la trae (ISO WKB: tipo + 1000; GeoParquet: «Point Z»).
    function _hasZ(geometry) {
        return /\[[^[\]]*,[^[\]]*,[^[\]]*\]/.test(JSON.stringify(geometry.coordinates || geometry.geometries || []));
    }

    function geometryToWkb(geometry) {
        const chunks = [];
        let length = 0;
        const push = (bytes) => { chunks.push(bytes); length += bytes.byteLength; };
        const header = (type, count) => {
            const b = new DataView(new ArrayBuffer(count === undefined ? 5 : 9));
            b.setUint8(0, 1); b.setUint32(1, type, true);
            if (count !== undefined) b.setUint32(5, count, true);
            push(new Uint8Array(b.buffer));
        };
        const coords = (list, dims) => {
            const b = new DataView(new ArrayBuffer(list.length * dims * 8));
            list.forEach((c, i) => { for (let d = 0; d < dims; d++) b.setFloat64((i * dims + d) * 8, d < c.length ? Number(c[d]) : 0, true); });
            push(new Uint8Array(b.buffer));
        };
        function write(g, z) {
            const dims = z ? 3 : 2;
            const code = (name) => WKB_TYPES.indexOf(name) + (z ? 1000 : 0);
            if (g.type === 'Point') { header(code('Point')); coords([g.coordinates.length ? g.coordinates : [NaN, NaN, NaN]], dims); }
            else if (g.type === 'LineString') { header(code('LineString'), g.coordinates.length); coords(g.coordinates, dims); }
            else if (g.type === 'Polygon') { header(code('Polygon'), g.coordinates.length); g.coordinates.forEach((ring) => { const n = new DataView(new ArrayBuffer(4)); n.setUint32(0, ring.length, true); push(new Uint8Array(n.buffer)); coords(ring, dims); }); }
            else if (g.type === 'MultiPoint' || g.type === 'MultiLineString' || g.type === 'MultiPolygon') {
                header(code(g.type), g.coordinates.length);
                const part = g.type.slice(5);
                g.coordinates.forEach((c) => write({ type: part, coordinates: c }, z));
            } else if (g.type === 'GeometryCollection') { header(code('GeometryCollection'), g.geometries.length); g.geometries.forEach((p) => write(p, z)); }
            else throw new Error(`Tipo de geometría no soportado: ${g.type}`);
        }
        write(geometry, _hasZ(geometry));
        const out = new Uint8Array(length);
        let at = 0;
        chunks.forEach((c) => { out.set(c, at); at += c.byteLength; });
        return out;
    }

    // CRS de GeoParquet: PROJJSON con id {authority, code}; sin clave «crs» es CRS84.
    function _geoparquetCrs(column) {
        const crs = column && column.crs;
        if (crs && crs.id && crs.id.authority && crs.id.code) return `${String(crs.id.authority).toUpperCase()}:${crs.id.code}`;
        if (typeof crs === 'string') return crs;
        return null;
    }

    function _collectionCrs(fc) {
        const tagged = (fc.features || []).find((f) => f && f.properties && f.properties._crs);
        const raw = (fc.metadata && fc.metadata.crs) || (fc.crs && fc.crs.properties && fc.crs.properties.name) || (tagged && tagged.properties._crs) || '';
        const code = String(raw).match(/EPSG:{1,2}(\d+)/i) || String(raw).match(/^(\d+)$/);
        if (/CRS84$/i.test(String(raw))) return 'EPSG:4326';
        return code ? `EPSG:${code[1]}` : (raw ? String(raw) : null);
    }

    function _asCollection(data) {
        return data && data.type === 'FeatureCollection' ? data : turf.featureCollection(Array.isArray(data) ? data : [data]);
    }

    registerReader({
        exts: ['gpkg'],
        label: 'GeoPackage',
        timeoutMs: 90000,
        read: async (file) => {
            const GP = await _geopackage();
            const gpkg = await GP.open(new Uint8Array(await file.arrayBuffer()));
            try {
                const tables = typeof gpkg.getFeatureTables === 'function' ? gpkg.getFeatureTables() : [];
                if (!tables.length) throw new Error('El GeoPackage no tiene tablas vectoriales.');
                const tableName = tables[0];
                if (tables.length > 1 && window.log) window.log(`GeoPackage con ${tables.length} tablas (${tables.join(', ')}): se lee «${tableName}».`, 'warn');

                const dao = gpkg.getFeatureDao(tableName);
                const geometryColumn = dao.getGeometryColumnName();
                const features = [];
                let count = 0;
                for (const raw of dao.queryForEach()) {
                    if (count++ % 500 === 0) { _cancelled('Lectura de GeoPackage'); await new Promise((r) => setTimeout(r, 0)); }
                    const row = dao.getRow(raw);
                    const data = row.getGeometry();
                    const geometry = data && data.geometry ? data.geometry.toGeoJSON() : null;
                    const properties = {};
                    for (const key in row.values) if (key !== geometryColumn) properties[key] = _plainValue(row.values[key]);
                    features.push({ type: 'Feature', geometry, properties });
                }
                const fc = turf.featureCollection(features);
                const srs = typeof dao.getSrs === 'function' ? dao.getSrs() : null;
                // Las coordenadas llegan en el CRS de la tabla: se etiqueta para que el mapa lo reproyecte.
                if (srs && srs.organization && srs.organization_coordsys_id > 0) fc.metadata = { crs: `${String(srs.organization).toUpperCase()}:${srs.organization_coordsys_id}` };
                return fc;
            } finally {
                if (typeof gpkg.close === 'function') { try { gpkg.close(); } catch (e) { /* ya cerrado */ } }
            }
        }
    });

    registerReader({
        exts: ['parquet'],
        label: 'Parquet / GeoParquet',
        timeoutMs: 90000,
        read: async (file) => {
            const { Arrow, wasm } = await _parquet();
            // readParquet devuelve una tabla de WASM: hay que pasarla a IPC para que Arrow la lea.
            const table = Arrow.tableFromIPC(wasm.readParquet(new Uint8Array(await file.arrayBuffer())).intoIPCStream());
            let geo = null;
            try { geo = JSON.parse(table.schema.metadata.get('geo') || 'null'); } catch (e) { geo = null; }
            const fields = table.schema.fields;
            // GeoParquet declara su columna de geometría; si no, se busca por nombre (WKB o WKT).
            let geometryName = geo && geo.primary_column;
            if (!geometryName) {
                const guess = fields.find((f) => /^(geometry|geom|wkb_geometry|wkt|the_geom)$/i.test(f.name));
                geometryName = guess ? guess.name : null;
            }
            const encoding = geo && geo.columns && geo.columns[geometryName] ? String(geo.columns[geometryName].encoding || '').toUpperCase() : '';
            if (encoding && encoding !== 'WKB' && encoding !== 'WKT') throw new Error(`Codificación de geometría GeoParquet no soportada: ${encoding} (se admiten WKB y WKT).`);

            const features = [];
            for (let i = 0; i < table.numRows; i++) {
                if (i % 2000 === 0) { _cancelled('Lectura de Parquet'); await new Promise((r) => setTimeout(r, 0)); }
                const row = table.get(i).toJSON();
                let geometry = null;
                const raw = geometryName ? row[geometryName] : null;
                if (raw instanceof Uint8Array && raw.length) geometry = wkbToGeometry(raw);
                else if (typeof raw === 'string' && raw.trim()) geometry = wellknown.parse(raw);
                if (geometryName) delete row[geometryName];
                const properties = {};
                for (const key in row) properties[key] = _plainValue(row[key]);
                features.push({ type: 'Feature', geometry, properties });
            }
            const fc = turf.featureCollection(features);
            const crs = geo && geo.columns ? _geoparquetCrs(geo.columns[geometryName]) : null;
            if (crs && crs !== 'OGC:CRS84') fc.metadata = { crs };
            if (!geometryName && window.log) window.log('Parquet sin columna de geometría: se lee como tabla de atributos.', 'warn');
            return fc;
        }
    });

    // ----------------------------
    // Formatos de Exportación Avanzados (Escritura)
    // ----------------------------
    registerWriter({
        exts: ['gpkg'],
        label: 'GeoPackage',
        write: async (data) => {
            const fc = _asCollection(data);
            const crs = _collectionCrs(fc);
            // La librería inserta las entidades como EPSG:4326.
            if (crs && crs !== 'EPSG:4326') throw new Error(`El GeoPackage se escribe en EPSG:4326 y los datos están en ${crs}: reproyéctalos antes con el nodo Reproject.`);
            const GP = await _geopackage();
            const gpkg = await GP.create();
            const tableName = 'jetl_export';
            const types = new Map();
            fc.features.forEach((f) => Object.entries(f.properties || {}).forEach(([key, value]) => {
                if (key === 'id' || key === 'geometry' || value === null || value === undefined) return;
                const type = typeof value === 'number' ? 'REAL' : typeof value === 'boolean' ? 'BOOLEAN' : 'TEXT';
                types.set(key, types.has(key) && types.get(key) !== type ? 'TEXT' : type);
            }));
            await GP.createFeatureTableWithProperties(gpkg, tableName, [...types].map(([name, dataType]) => ({ name, dataType })));
            for (let i = 0; i < fc.features.length; i++) {
                if (i % 250 === 0) { _cancelled('Exportación a GeoPackage'); await new Promise((r) => setTimeout(r, 0)); }
                const f = fc.features[i];
                const properties = {};
                for (const [key, type] of types) {
                    const value = f.properties ? f.properties[key] : undefined;
                    if (value === undefined || value === null) continue;
                    properties[key] = type === 'TEXT' && typeof value === 'object' ? JSON.stringify(value) : type === 'TEXT' ? String(value) : value;
                }
                await GP.addGeoJSONFeatureToGeoPackage(gpkg, { type: 'Feature', geometry: f.geometry, properties }, tableName);
            }
            const bytes = await new Promise((resolve, reject) => gpkg.export((error, result) => error ? reject(error) : resolve(result)));
            return { blob: new Blob([bytes], { type: 'application/geopackage+sqlite3' }), filename: 'export.gpkg' };
        }
    });

    // GeoParquet 1.1: geometría WKB y metadatos «geo», legible por QGIS, GDAL o DuckDB.
    registerWriter({
        exts: ['parquet'],
        label: 'GeoParquet',
        write: async (data) => {
            const fc = _asCollection(data);
            const { Arrow, wasm } = await _parquet();
            const keys = [];
            const kinds = new Map();
            fc.features.forEach((f) => Object.entries(f.properties || {}).forEach(([key, value]) => {
                if (key === 'geometry') return;
                if (!kinds.has(key)) { keys.push(key); kinds.set(key, null); }
                if (value === null || value === undefined) return;
                const kind = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';
                const prev = kinds.get(key);
                kinds.set(key, prev && prev !== kind ? 'string' : kind);
            }));
            const columns = {};
            const geometryTypes = new Set();
            const wkb = [];
            for (let i = 0; i < fc.features.length; i++) {
                if (i % 1000 === 0) { _cancelled('Exportación a Parquet'); await new Promise((r) => setTimeout(r, 0)); }
                const g = fc.features[i].geometry;
                if (g) geometryTypes.add(_hasZ(g) ? `${g.type} Z` : g.type);
                wkb.push(g ? geometryToWkb(g) : null);
            }
            for (const key of keys) {
                const kind = kinds.get(key) || 'string';
                const values = fc.features.map((f) => {
                    const v = f.properties ? f.properties[key] : null;
                    if (v === null || v === undefined) return null;
                    if (kind === 'string') return typeof v === 'object' ? JSON.stringify(v) : String(v);
                    return v;
                });
                const type = kind === 'number' ? new Arrow.Float64() : kind === 'boolean' ? new Arrow.Bool() : new Arrow.Utf8();
                columns[key] = Arrow.vectorFromArray(values, type);
            }
            columns.geometry = Arrow.vectorFromArray(wkb, new Arrow.Binary());
            const crs = _collectionCrs(fc);
            const column = { encoding: 'WKB', geometry_types: [...geometryTypes].sort() };
            // Sin «crs» GeoParquet entiende OGC:CRS84 (lon/lat). Otro CRS se identifica por su código.
            if (crs && crs !== 'EPSG:4326') {
                const [authority, code] = crs.split(':');
                column.crs = { type: 'ProjectedCRS', name: crs, id: { authority, code: Number(code) || code } };
            }
            const geo = { version: '1.1.0', primary_column: 'geometry', columns: { geometry: column } };
            // Un solo lote con el esquema final: todos los campos admiten nulos (atributos que
            // faltan en alguna entidad, geometría vacía) y llevan los metadatos «geo».
            const fields = Object.entries(columns).map(([name, vector]) => new Arrow.Field(name, vector.type, true));
            const schema = new Arrow.Schema(fields, new Map([['geo', JSON.stringify(geo)]]));
            const rows = Arrow.makeData({ type: new Arrow.Struct(fields), length: fc.features.length, nullCount: 0, children: Object.values(columns).map((vector) => vector.data[0]) });
            const withGeo = new Arrow.Table([new Arrow.RecordBatch(schema, rows)]);
            const bytes = wasm.writeParquet(wasm.Table.fromIPCStream(Arrow.tableToIPC(withGeo, 'stream')));
            return { blob: new Blob([bytes], { type: 'application/vnd.apache.parquet' }), filename: 'export.parquet' };
        }
    });

    window.JETLFormats = {
        registerReader,
        registerWriter,
        readFile,
        writeFile,
        toKML,
        wkb: { toGeometry: wkbToGeometry, fromGeometry: geometryToWkb },
        _registry: registry
    };

    function _withTimeout(promise, ms, msg) {
        let timer = null;
        return new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(msg || 'Timeout')), ms);
            Promise.resolve(promise).then((v) => {
                clearTimeout(timer);
                resolve(v);
            }).catch((e) => {
                clearTimeout(timer);
                reject(e);
            });
        });
    }
})();

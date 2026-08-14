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
            const buffer = await file.arrayBuffer();
            const result = await shp(buffer);
            return Array.isArray(result) ? turf.featureCollection(result.flatMap(r => r.features)) : result;
        }
    });

    // ----------------------------
    // Experimental readers
    // ----------------------------
    registerReader({
        exts: ['gpkg'],
        label: 'GeoPackage (Experimental)',
        timeoutMs: 45000,
        read: async (file) => {
            if (window.log) window.log("⏳ Descargando motor GeoPackage desde CDN para Lectura...", "info");
            await loadScript('https://unpkg.com/@ngageoint/geopackage@3.0.0/dist/geopackage.min.js', 'GeoPackage');
            const GP = window.GeoPackage;
            if (!GP || !GP.GeoPackageAPI) throw new Error("Motor GeoPackage no disponible.");

            if (window.log) window.log("⏳ Abriendo GeoPackage en memoria...", "info");
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            const gpkg = await GP.GeoPackageAPI.open(bytes);
            const tables = gpkg.getFeatureTables ? gpkg.getFeatureTables() : [];
            if (!tables || tables.length === 0) {
                if (gpkg.close) gpkg.close();
                throw new Error("No se encontraron tablas vectoriales en el GPKG.");
            }

            const tableName = tables[0];
            const dao = gpkg.getFeatureDao(tableName);
            const rows = dao.queryForAll();
            const features = [];

            let iterCount = 0;
            while (rows.moveToNext()) {
                if (window.isEngineCancelled) throw new Error("Lectura de GeoPackage cancelada.");
                if (iterCount++ % 200 === 0) await new Promise(r => setTimeout(r, 0));

                const row = rows.getRow();
                const geomData = row.getGeometry();
                if (!geomData) continue;

                let gj = null;
                try {
                    // Intento de parseo de geometria v3
                    if (geomData.geometry) {
                        gj = geomData.geometry.toGeoJSON();
                    } else if (geomData.toGeoJSON) {
                        gj = geomData.toGeoJSON();
                    }
                } catch (e) { }

                if (!gj) continue;

                // Extraer propiedades
                const props = {};
                const geomColumn = dao.getGeometryColumnName();
                if (row.values) {
                    for (const key in row.values) {
                        if (key !== geomColumn) {
                            props[key] = row.values[key];
                        }
                    }
                }

                features.push(turf.feature(gj, props));
            }

            if (gpkg.close) gpkg.close();
            return turf.featureCollection(features);
        }
    });

    registerReader({
        exts: ['parquet'],
        label: 'Parquet (GeoParquet-lite)',
        read: async (file) => {
            if (window.log) window.log("⏳ Iniciando motor Parquet WASM para Lectura...", "info");
            try {
                // Importación dinámica nativa de ESM
                const parquetWasm = await import('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm.js');
                await parquetWasm.default('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm_bg.wasm');
                const arrow = await import('https://cdn.jsdelivr.net/npm/apache-arrow@13.0.0/+esm');

                const buffer = await file.arrayBuffer();
                const ipc = parquetWasm.readParquet(new Uint8Array(buffer));

                const table = arrow.tableFromIPC(ipc);
                const rows = table.toArray().map(r => r.toJSON());

                const features = [];
                for (const r of rows) {
                    let geom = null;
                    if (r.geometry && typeof r.geometry === 'string') {
                        try {
                            geom = wellknown.parse(r.geometry);
                            delete r.geometry;
                        } catch (e) { }
                    }
                    features.push(turf.feature(geom, r));
                }

                if (window.log) window.log("✅ Parquet importado con éxito.", "success");
                return turf.featureCollection(features);
            } catch (e) {
                if (window.log) window.log("⚠️ " + e.message, "err");
                throw new Error("Lectura Parquet Error: " + e.message);
            }
        }
    });

    // ----------------------------
    // Funciones Helper para cargar librerías dinámicamente sin bloquear el arranque inicial
    function loadScript(src, globalVar) {
        return new Promise((resolve, reject) => {
            if (window[globalVar]) return resolve(window[globalVar]);
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve(window[globalVar]);
            s.onerror = () => reject(new Error("Error cargando " + src));
            document.head.appendChild(s);
        });
    }

    // ----------------------------
    // Formatos de Exportación Avanzados (Escritura)
    // ----------------------------
    registerWriter({
        exts: ['gpkg'],
        label: 'GeoPackage (Experimental)',
        write: async (data) => {
            if (window.log) window.log("⏳ Descargando motor GeoPackage desde CDN...", "info");
            await loadScript('https://unpkg.com/@ngageoint/geopackage@3.0.0/dist/geopackage.min.js', 'GeoPackage');
            const GP = window.GeoPackage;
            if (!GP || !GP.GeoPackageAPI) throw new Error("Error en motor GeoPackage");

            if (GP.setSqljsWasmLoc) {
                GP.setSqljsWasmLoc('https://unpkg.com/@ngageoint/geopackage@3.0.0/dist/sql-wasm.wasm');
            }

            if (window.log) window.log("⏳ Creando GeoPackage en memoria...", "info");
            const gpkg = await GP.GeoPackageAPI.create();
            const tableName = "jetl_export";
            const fc = data.type === 'FeatureCollection' ? data : turf.featureCollection(Array.isArray(data) ? data : [data]);

            // Crear tabla e insertar Features
            await GP.GeoPackageAPI.createFeatureTable(gpkg, tableName, fc.features[0] ? fc.features[0].geometry : null);
            for (let i = 0; i < fc.features.length; i++) {
                if (window.isEngineCancelled) throw new Error("Exportación a GeoPackage cancelada.");
                if (i % 250 === 0) await new Promise(r => setTimeout(r, 0));

                await GP.GeoPackageAPI.addGeoJSONFeatureToGeoPackage(gpkg, fc.features[i], tableName);
            }

            if (window.log) window.log("⏳ Exportando binario GPKG...", "info");
            const byteArray = await gpkg.export();
            const blob = new Blob([byteArray], { type: "application/geopackage+sqlite3" });
            return { blob, filename: "export.gpkg" };
        }
    });

    registerWriter({
        exts: ['parquet'],
        label: 'Parquet (GeoParquet-lite)',
        write: async (data) => {
            if (window.log) window.log("⏳ Iniciando motor Parquet WASM...", "info");
            try {
                // Importamos directamente las dependencias como modulos ES (ESM) para no romper bindings WASM
                const parquetWasm = await import('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm.js');
                await parquetWasm.default('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm_bg.wasm');
                const arrow = await import('https://cdn.jsdelivr.net/npm/apache-arrow@13.0.0/+esm');

                const fc = data.type === 'FeatureCollection' ? data : turf.featureCollection(Array.isArray(data) ? data : [data]);
                if (window.log) window.log("⏳ Serializando a formato tabular Arrow...", "info");

                const rows = [];
                for (let i = 0; i < fc.features.length; i++) {
                    if (window.isEngineCancelled) throw new Error("Exportación a Parquet cancelada.");
                    if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));

                    const f = fc.features[i];
                    if (!f.geometry) continue;
                    try {
                        let wkt = wellknown.stringify(f.geometry);
                        const flatProps = {};
                        if (f.properties) {
                            Object.keys(f.properties).forEach(k => {
                                let val = f.properties[k];
                                if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                                flatProps[k] = val;
                            });
                        }
                        rows.push({
                            jetl_id: i,
                            geometry: wkt,
                            ...flatProps
                        });
                    } catch (e) { }
                }

                if (rows.length === 0) throw new Error("No hay data válida");
                // Usamos tableFromJSON de apache-arrow
                const table = arrow.tableFromJSON(rows);
                const ipc = arrow.tableToIPC(table, "file");

                // Escribimos a Parquet usando parquet-wasm
                const buffer = parquetWasm.writeParquet(ipc);

                if (window.log) window.log("✅ Parquet generado éxito.", "success");

                const blob = new Blob([buffer], { type: "application/octet-stream" });
                return { blob, filename: "export.parquet" };
            } catch (e) {
                if (window.log) window.log("⚠️ " + e.message, "err");
                throw new Error("Parquet Export Error: " + e.message);
            }
        }
    });

    window.JETLFormats = {
        registerReader,
        registerWriter,
        readFile,
        writeFile,
        toKML,
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

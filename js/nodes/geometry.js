// Cat: geometry
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    geo_centroid: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'CenterPoint', icon: 'fa-dot-circle', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>Centroide</div>`,
        run: async (id, i) => {
            const fc = i[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 25000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({ task: 'geo_centroid', features: fc }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker CenterPoint fallo, fallback local:', e);
                }
            }
            return turf.featureCollection(fc.features.map(f => turf.centroid(f, { properties: f.properties })));
        }
    },

    geo_simplify: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Simplifier', icon: 'fa-compress-arrows-alt', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tolerancia (Grados)</span>
                <input type="number" df-tol value="0.0001" step="0.0001" class="node-control">
            </div>
            <div style="font-size:0.6em;color:#888">Reduce vÃ©rtices manteniendo la forma.</div>`,
        run: async (id, inputs, dom) => {
            const tol = parseFloat(dom.querySelector('[df-tol]').value) || 0.0001;
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_simplify',
                        features: inputs[0],
                        tol
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Simplifier fallo, fallback local:", e);
                }
            }
            return turf.simplify(inputs[0], { tolerance: tol, highQuality: true, mutate: false });
        }
    },

    geo_topo_simplify: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Topo Simplify', icon: 'fa-wave-square', color: '#2980b9', in: 1, out: 1,
        help: 'SimplificaciÃ³n con limpieza topolÃ³gica (cleanCoords).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tolerancia (Grados)</span>
                <input type="number" df-tol value="0.00005" step="0.00001" class="node-control">
            </div>
            <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:0.7em;color:#aaa">
                <input type="checkbox" df-preserve-boundary>
                Mantener bordes limite sin simplificar
            </label>
            <div style="font-size:0.6em;color:#888">Simplifica y limpia geometrÃ­as.</div>`,
        run: async (id, inputs, dom) => {
            const tol = parseFloat(dom.querySelector('[df-tol]').value) || 0.00005;
            const preserveBoundary = !!dom.querySelector('[df-preserve-boundary]')?.checked;
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_topo_simplify',
                        features: inputs[0],
                        tol,
                        preserveBoundary
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Topo Simplify fallo, fallback local:", e);
                }
            }
            const inputFc = inputs[0];
            const flat = turf.flatten(inputFc);
            const polyOnly = flat.features.filter(f => turf.getType(f) === 'Polygon');

            // Topology-preserving path for polygon meshes:
            // simplify shared linework once, then rebuild polygons from that graph.
            if (polyOnly.length > 0 && polyOnly.length === flat.features.length && typeof turf.polygonize === 'function') {
                try {
                    const lineParts = [];
                    polyOnly.forEach((p, idx) => {
                        const ln = turf.polygonToLine(p);
                        if (ln && ln.type === 'FeatureCollection' && Array.isArray(ln.features)) {
                            ln.features.forEach(f => lineParts.push(turf.feature(f.geometry, { _src_idx: idx })));
                        } else if (ln && ln.type === 'Feature') {
                            lineParts.push(turf.feature(ln.geometry, { _src_idx: idx }));
                        }
                    });

                    const simplifiedLines = lineParts.map((lf) => {
                        const s = turf.simplify(lf, { tolerance: tol, highQuality: true, mutate: false });
                        const c = turf.cleanCoords(s);
                        turf.coordEach(c, (coord) => {
                            coord[0] = +coord[0].toFixed(8);
                            coord[1] = +coord[1].toFixed(8);
                        });
                        return c;
                    });

                    const rebuilt = turf.polygonize(turf.featureCollection(simplifiedLines));
                    if (rebuilt && rebuilt.features && rebuilt.features.length > 0) {
                        rebuilt.features.forEach((np) => {
                            let donor = null;
                            try {
                                const cc = turf.centroid(np);
                                donor = polyOnly.find(op => {
                                    try { return turf.booleanPointInPolygon(cc, op); } catch (_) { return false; }
                                }) || null;
                            } catch (_) { }
                            if (!donor) {
                                let best = null;
                                let bestArea = -1;
                                polyOnly.forEach((op) => {
                                    try {
                                        const inter = turf.intersect(np, op);
                                        if (inter) {
                                            const a = turf.area(inter);
                                            if (a > bestArea) { bestArea = a; best = op; }
                                        }
                                    } catch (_) { }
                                });
                                donor = best;
                            }
                            np.properties = donor ? { ...(donor.properties || {}) } : {};
                        });
                        return rebuilt;
                    }
                } catch (e) {
                    console.warn("Topo mesh rebuild fallo, fallback per-feature:", e);
                }
            }

            const features = (inputFc && inputFc.features) ? inputFc.features : [];
            const out = features.map((f) => {
                try {
                    const simplified = turf.simplify(f, { tolerance: tol, highQuality: true, mutate: false });
                    return turf.cleanCoords(simplified);
                } catch (e) {
                    try { return turf.cleanCoords(f); } catch (_) { return f; }
                }
            });
            return turf.featureCollection(out);
        }
    },
    geo_line_merge: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line Merger', icon: 'fa-grip-lines', color: '#2980b9', in: 1, out: 1,
        help: 'Une lineas colineales dentro de la misma capa.',
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Merge LineStrings</div>`,
        run: async (id, inputs) => {
            const mergeLinesLocal = (fc) => {
                const flat = turf.flatten(fc);
                const lines = flat.features.filter((f) => turf.getType(f) === 'LineString');
                if (!lines.length) return turf.featureCollection([]);

                const key = (c) => `${(+c[0].toFixed(8))},${(+c[1].toFixed(8))}`;
                const endpoints = new Map();
                const degree = new Map();
                const parts = lines.map((f, idx) => {
                    const coords = turf.getCoords(f);
                    const s = key(coords[0]);
                    const e = key(coords[coords.length - 1]);
                    if (!endpoints.has(s)) endpoints.set(s, []);
                    if (!endpoints.has(e)) endpoints.set(e, []);
                    endpoints.get(s).push({ idx, atStart: true });
                    endpoints.get(e).push({ idx, atStart: false });
                    degree.set(s, (degree.get(s) || 0) + 1);
                    degree.set(e, (degree.get(e) || 0) + 1);
                    return { coords, props: { ...(f.properties || {}) }, used: false };
                });

                const out = [];
                const nextFrom = (nodeKey, usedSet) => {
                    const deg = degree.get(nodeKey) || 0;
                    if (deg !== 2) return null;
                    const candidates = endpoints.get(nodeKey) || [];
                    for (let i = 0; i < candidates.length; i++) {
                        const c = candidates[i];
                        if (!usedSet.has(c.idx)) return c;
                    }
                    return null;
                };

                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].used) continue;
                    parts[i].used = true;
                    const used = new Set([i]);
                    let merged = parts[i].coords.slice();
                    const props = parts[i].props;

                    let tail = key(merged[merged.length - 1]);
                    while (true) {
                        const cand = nextFrom(tail, used);
                        if (!cand) break;
                        const p = parts[cand.idx];
                        p.used = true;
                        used.add(cand.idx);
                        const oriented = cand.atStart ? p.coords : p.coords.slice().reverse();
                        merged = merged.concat(oriented.slice(1));
                        tail = key(merged[merged.length - 1]);
                    }

                    let head = key(merged[0]);
                    while (true) {
                        const cand = nextFrom(head, used);
                        if (!cand) break;
                        const p = parts[cand.idx];
                        p.used = true;
                        used.add(cand.idx);
                        const oriented = cand.atStart ? p.coords.slice().reverse() : p.coords;
                        merged = oriented.slice(0, oriented.length - 1).concat(merged);
                        head = key(merged[0]);
                    }

                    out.push(turf.lineString(merged, props));
                }
                return turf.featureCollection(out);
            };

            const flatIn = turf.flatten(inputs[0]);
            const lineCount = flatIn.features.filter((f) => turf.getType(f) === 'LineString').length;
            const USE_WORKER_FROM = 300;

            if (lineCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_line_merge',
                        features: inputs[0]
                    }, 120000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Line Merger fallo, fallback local:", e);
                }
            }

            return mergeLinesLocal(inputs[0]);
        }
    },

    geo_reproject: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Reproject', icon: 'fa-sync', color: '#2980b9', in: 1, out: 1,
        help: 'Reproyecta geometrÃ­as con proj4 (EPSG:4326 -> EPSG:3857, etc).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Origen (EPSG)</span>
                <input type="text" df-src class="node-control" value="EPSG:4326">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Destino (EPSG)</span>
                <input type="text" df-dst class="node-control" value="EPSG:3857">
            </div>`,
        run: async (id, inputs, dom) => {
            const src = dom.querySelector('[df-src]').value || 'EPSG:4326';
            const dst = dom.querySelector('[df-dst]').value || 'EPSG:3857';
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 200;
            const KNOWN_CRS = {
                'EPSG:25830': '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs +type=crs',
                'EPSG:23030': '+proj=utm +zone=30 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs'
            };

            const ensureDef = (code) => {
                if (!code || typeof proj4 === 'undefined' || typeof proj4.defs !== 'function') return null;
                let d = proj4.defs(code);
                if (!d && KNOWN_CRS[code]) {
                    try { proj4.defs(code, KNOWN_CRS[code]); } catch (_) {}
                    d = proj4.defs(code);
                }
                return (typeof d === 'string' && d) ? d : null;
            };

            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    const srcDef = ensureDef(src);
                    const dstDef = ensureDef(dst);
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_reproject',
                        features: fc,
                        src,
                        dst,
                        srcDef: (typeof srcDef === 'string' && srcDef) ? srcDef : null,
                        dstDef: (typeof dstDef === 'string' && dstDef) ? dstDef : null
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Reproject fallo, fallback local:", e);
                }
            }

            if (!proj4) throw new Error("proj4 no disponible");
            ensureDef(src);
            ensureDef(dst);
            let prj = null;
            try { prj = proj4(src, dst); } catch (e) {
                throw new Error(`Reproject no pudo crear transformacion ${src} -> ${dst}: ${e && e.message ? e.message : e}`);
            }
            const out = JETLClone(fc);
            turf.coordEach(out, (coord) => {
                const p = prj.forward(coord);
                coord[0] = p[0];
                coord[1] = p[1];
            });
            return out;
        }
    },

    geo_repair: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Geometry Repair', icon: 'fa-toolbox', color: '#2980b9', in: 1, out: 1,
        help: 'Repara geometrÃ­as invÃ¡lidas (worker con JSTS).',
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">makeValid / buffer(0)</div>`,
        run: async (id, inputs) => {
            const features = inputs[0];
            if (!features || !features.features) throw new Error("Sin datos");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = { task: 'make_valid', features: features };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker repair fallÃ³, fallback local:", e);
                }
            }
            // Fallback local
            const cleaned = turf.cleanCoords(features);
            const out = [];
            turf.flatten(cleaned).features.forEach(f => {
                const t = turf.getType(f);
                if (t === 'Polygon' || t === 'MultiPolygon') {
                    try {
                        const uk = turf.unkinkPolygon(f);
                        if (uk && uk.features) out.push(...uk.features);
                        else out.push(f);
                    } catch (e) { out.push(f); }
                } else {
                    out.push(f);
                }
            });
            return turf.featureCollection(out);
        }
    },

    geo_chunk: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line Chopper', icon: 'fa-cut', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Longitud de Segmento</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-len value="100" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="meters">m</option>
                        <option value="kilometers">km</option>
                    </select>
                </div>
            </div>`,
        run: async (id, inputs, dom) => {
            const len = parseFloat(dom.querySelector('[df-len]').value);
            const unit = dom.querySelector('[df-unit]').value;
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_chunk',
                        features: inputs[0],
                        len,
                        unit
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Line Chopper fallo, fallback local:", e);
                }
            }

            turf.flatten(inputs[0]).features.forEach(f => {
                if (turf.getType(f) === 'LineString') {
                    const chunks = turf.lineChunk(f, len, { units: unit });
                    // Heredar propiedades del padre
                    chunks.features.forEach(c => c.properties = { ...f.properties });
                    res.push(...chunks.features);
                } else {
                    res.push(f); // Pasar geometrÃ­a no lineal tal cual
                }
            });
            return turf.featureCollection(res);
        }
    },

    geo_dissolve: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Dissolver', icon: 'fa-object-group', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Disolver por campos</span>
                <input type="text" df-fields class="node-control" placeholder="Ej: building, height">
                <div style="font-size:0.6em;color:#666;font-style:italic">Dejar vacÃ­o para disolver todo en uno.</div>
            </div>`,
        run: async (id, inputs, dom) => {
            const rawFields = dom.querySelector('[df-fields]').value;
            const features = inputs[0].features;
            const fields = rawFields ? rawFields.split(',').map(f => f.trim()).filter(f => f !== '') : [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'geo_dissolve',
                        features: inputs[0],
                        fields
                    };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Dissolve fallo, fallback local:", e);
                }
            }

            // Caso 1: Disolver todo (sin campos)
            if (!rawFields || rawFields.trim() === '') {
                return turf.dissolve(inputs[0]);
            }

            // Caso 2: Disolver por uno o varios campos
            // Limpiamos y separamos los campos (ej: "building,  height " -> ["building", "height"])
            const fieldsLocal = rawFields.split(',').map(f => f.trim()).filter(f => f !== '');

            // Creamos una propiedad temporal Ãºnica que concatena los valores de los campos elegidos
            const tempProp = '_dissolve_key_';

            const taggedFeatures = features.map(f => {
                // Clonamos para no mutar el original inesperadamente
                const newF = JETLClone(f);

                // Generamos la clave compuesta (ej: "yes_10")
                // Si un campo no existe o es null, usamos "null" para agrupar esos errores juntos
                const key = fieldsLocal.map(field => {
                    const val = newF.properties[field];
                    return val !== undefined && val !== null ? val : 'null';
                }).join('_|_'); // Separador poco comÃºn para evitar colisiones

                newF.properties[tempProp] = key;
                return newF;
            });

            // Usamos turf.dissolve sobre esa propiedad temporal
            const fc = turf.featureCollection(taggedFeatures);

            let dissolved;
            try {
                // 'Unable to find segment' en SweepLine tree es un bug hiper-comÃºn de Turf.js (derivado de polygon-clipping)
                // al procesar vÃ©rtices muy juntos o superpuestos con precisiÃ³n flotante inestable.
                // Limpiamos coordenadas antes de procesar para reducir riesgos drÃ¡sticamente.
                const cleanForDissolve = turf.cleanCoords(fc, { mutate: true });
                dissolved = turf.dissolve(cleanForDissolve, { propertyName: tempProp });
            } catch (e) {
                console.warn("[Dissolver] FallÃ³ turf.dissolve (bug SweepLine). Realizando uniÃ³n lÃ³gica (Atributos), omitiendo fusiÃ³n de geometrÃ­a plana.", e);
                // Fallback de emergencia: 
                // Si la topologÃ­a no se puede unir por el bug, agrupamos los datos (Features)
                // dejando las geometrÃ­as en un GeometryCollection o MultiPolygon por el mismo tempProp

                const groupMap = {};
                fc.features.forEach(f => {
                    const k = f.properties[tempProp];
                    if (!groupMap[k]) {
                        groupMap[k] = JETLClone(f);
                    } else {
                        // Intentamos unificar si son del mismo tipo, de lo contrario lo obviamos visualmente
                        // Esto es solo un fallback para que no crashee todo el nodo
                        try {
                            groupMap[k] = turf.union(groupMap[k], f);
                        } catch (unionErr) { /* Ignorar si falla union por el mismo motivo */ }
                    }
                });
                dissolved = turf.featureCollection(Object.values(groupMap));
            }

            // Limpieza: Eliminamos la propiedad temporal del resultado
            dissolved.features.forEach(f => {
                delete f.properties[tempProp];
            });

            return dissolved;
        }
    },

    geo_explode: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Exploder', icon: 'fa-shapes', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Multipart <i class="fas fa-arrow-right"></i> Singlepart</div>`,
        run: async (id, inputs) => {
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 5000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_explode',
                        features: fc
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Exploder fallo, fallback local:', e);
                }
            }

            // turf.flatten convierte cualquier Multi(Point|Line|Polygon) en una colecciÃ³n individual
            const flat = turf.flatten(fc);
            // IMPORTANTE: Clonamos los atributos (properties) superficialmente
            // para romper referencias compartidas originadas por flatten.
            for (let i = 0; i < flat.features.length; i++) {
                const f = flat.features[i];
                f.properties = f.properties ? { ...f.properties } : {};
                if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));
            }
            return flat;
        }
    },

    geo_vertex_creator: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Vertex Creator', icon: 'fa-draw-polygon', color: '#2980b9', in: 1, out: 1,
        // CORRECCIÃ“N: Usamos tpl explÃ­cito para compatibilidad con tu index.html actual
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Modo de ExtracciÃ³n</span>
                <select df-mode class="node-control">
                    <option value="All Vertices">Todos los vÃ©rtices</option>
                    <option value="Start Points">Solo Inicio (Start)</option>
                    <option value="End Points">Solo Final (End)</option>
                    <option value="Start & End">Inicio y Final</option>
                    <option value="Dangles">Dangles (Cabos sueltos)</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            // Leemos el valor del select manualmente usando el DOM del nodo
            const mode = dom.querySelector('[df-mode]').value;
            const features = inputs[0].features;
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_vertex_creator',
                        features: inputs[0],
                        mode
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Vertex Creator fallo, fallback local:", e);
                }
            }

            // Helper para obtener las rutas de coordenadas
            const getPaths = (g) => {
                const type = turf.getType(g);
                const c = g.coordinates;
                if (type === 'LineString') return [c];
                if (type === 'MultiLineString' || type === 'Polygon') return c;
                if (type === 'MultiPolygon') return c.flat();
                return [];
            };

            if (mode === 'Dangles') {
                // LÃ³gica TopolÃ³gica: Buscar nodos que aparecen exactamente 1 vez en todo el dataset
                const counts = {};

                // 1. Contar ocurrencias
                features.forEach(f => {
                    getPaths(f.geometry).forEach(path => {
                        if (path.length < 2) return;
                        const start = path[0].join(',');
                        const end = path[path.length - 1].join(',');
                        counts[start] = (counts[start] || 0) + 1;
                        counts[end] = (counts[end] || 0) + 1;
                    });
                });

                // 2. Extraer Ãºnicos
                Object.entries(counts).forEach(([key, cnt]) => {
                    if (cnt === 1) {
                        const [x, y] = key.split(',').map(Number);
                        res.push(turf.point([x, y]));
                    }
                });

            } else {
                // LÃ³gica por Entidad
                features.forEach(f => {
                    if (mode === 'All Vertices') {
                        turf.explode(f).features.forEach(p => {
                            p.properties = f.properties;
                            res.push(p);
                        });
                        return;
                    }

                    getPaths(f.geometry).forEach(path => {
                        if (path.length === 0) return;
                        const start = path[0];
                        const end = path[path.length - 1];

                        if (mode.includes('Start')) res.push(turf.point(start, f.properties));
                        if (mode.includes('End')) res.push(turf.point(end, f.properties));
                    });
                });
            }
            return turf.featureCollection(res);
        }
    },

    geo_triangulator: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Triangulator', icon: 'fa-shapes', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Polygons <i class="fas fa-arrow-right"></i> Triangles (TIN)</div>`,
        run: async (id, inputs) => {
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_triangulator',
                        features: inputs[0]
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Triangulator fallo, fallback local:", e);
                }
            }

            // Primero aplanamos para asegurar que no hay MultiPolÃ­gonos complejos
            turf.flatten(inputs[0]).features.forEach(f => {
                const type = turf.getType(f);

                // Solo procesamos PolÃ­gonos
                if (type === 'Polygon') {
                    try {
                        const tin = turf.tesselate(f);
                        // Transferimos los atributos del padre a cada triÃ¡ngulo hijo
                        tin.features.forEach(triangle => {
                            triangle.properties = f.properties;
                            res.push(triangle);
                        });
                    } catch (e) {
                        // Si falla (ej: polÃ­gono invÃ¡lido), lo ignoramos o logueamos
                        console.warn('Fallo al triangular feature', f);
                    }
                }
            });

            return turf.featureCollection(res);
        }
    },

    geo_donut_extractor: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Donut Extractor', icon: 'fa-dot-circle', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Extract Polygon Holes</div>`,
        run: async (id, inputs) => {
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_donut_extractor',
                        features: inputs[0]
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Donut Extractor fallo, fallback local:", e);
                }
            }

            const holes = [];
            const flat = turf.flatten(inputs[0]);

            // Aplanamos para asegurar que tratamos feature a feature
            for (let fi = 0; fi < flat.features.length; fi++) {
                const f = flat.features[fi];
                const type = turf.getType(f);
                if (type === 'Polygon') {
                    const coords = f.geometry.coordinates;
                    // El Ã­ndice 0 es el contorno exterior, los siguientes (1, 2, ...) son agujeros
                    if (coords.length > 1) {
                        for (let i = 1; i < coords.length; i++) {
                            // Creamos un nuevo polÃ­gono por cada agujero
                            const holePoly = turf.polygon([coords[i]], f.properties);
                            holes.push(holePoly);
                        }
                    }
                }
                if (fi % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }

            return turf.featureCollection(holes);
        }
    },

    geo_line_closer: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line Closer', icon: 'fa-vector-square', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">LineString <i class="fas fa-arrow-right"></i> Polygon</div>`,
        run: async (id, inputs) => {
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 3000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_line_closer',
                        features: fc
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Line Closer fallo, fallback local:', e);
                }
            }

            const polys = [];
            const flat = turf.flatten(fc);
            for (let i = 0; i < flat.features.length; i++) {
                const f = flat.features[i];
                const type = turf.getType(f);
                if (type === 'LineString') {
                    try {
                        // turf.lineToPolygon cierra automÃ¡ticamente la lÃ­nea
                        const poly = turf.lineToPolygon(f);
                        poly.properties = f.properties;
                        polys.push(poly);
                    } catch (e) {
                        console.warn('No se pudo cerrar la lÃ­nea', f);
                    }
                }
                if (i % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }

            return turf.featureCollection(polys);
        }
    },

    geo_line_to_polygon: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line to Polygon', icon: 'fa-vector-square', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Line/MultiLine <i class="fas fa-arrow-right"></i> Polygon</div>`,
        run: async (id, inputs) => {
            const polys = [];
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 10000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_line_to_polygon',
                        features: fc
                    }, 120000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Line to Polygon fallo, fallback local:', e);
                }
            }
            const feats = (fc && Array.isArray(fc.features)) ? fc.features : [];
            for (let i = 0; i < feats.length; i++) {
                const f = feats[i];
                const g = f && f.geometry ? f.geometry : null;
                const t = g ? g.type : '';
                try {
                    if (t === 'LineString') {
                        const poly = turf.lineToPolygon(f);
                        poly.properties = { ...(f.properties || {}) };
                        polys.push(poly);
                    } else if (t === 'MultiLineString' && Array.isArray(g.coordinates)) {
                        for (let j = 0; j < g.coordinates.length; j++) {
                            const ls = turf.lineString(g.coordinates[j], { ...(f.properties || {}) });
                            const poly = turf.lineToPolygon(ls);
                            poly.properties = { ...(f.properties || {}) };
                            polys.push(poly);
                        }
                    }
                } catch (e) {
                    console.warn('Line to Polygon: no se pudo convertir feature', f);
                }
                if (i % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }
            return turf.featureCollection(polys);
        }
    },

    geo_polygon_to_line: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Polygon to Line', icon: 'fa-grip-lines', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Polygon/MultiPolygon <i class="fas fa-arrow-right"></i> Line</div>`,
        run: async (id, inputs) => {
            const lines = [];
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 10000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_polygon_to_line',
                        features: fc
                    }, 120000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Polygon to Line fallo, fallback local:', e);
                }
            }
            const feats = (fc && Array.isArray(fc.features)) ? fc.features : [];
            for (let i = 0; i < feats.length; i++) {
                const f = feats[i];
                const g = f && f.geometry ? f.geometry : null;
                const t = g ? g.type : '';
                try {
                    if (t === 'Polygon') {
                        const out = turf.polygonToLine(f);
                        if (out && out.type === 'FeatureCollection' && Array.isArray(out.features)) {
                            out.features.forEach(l => {
                                l.properties = { ...(f.properties || {}) };
                                lines.push(l);
                            });
                        } else if (out && out.type === 'Feature') {
                            out.properties = { ...(f.properties || {}) };
                            lines.push(out);
                        }
                    } else if (t === 'MultiPolygon' && Array.isArray(g.coordinates)) {
                        for (let j = 0; j < g.coordinates.length; j++) {
                            const p = turf.polygon(g.coordinates[j], { ...(f.properties || {}) });
                            const out = turf.polygonToLine(p);
                            if (out && out.type === 'FeatureCollection' && Array.isArray(out.features)) {
                                out.features.forEach(l => {
                                    l.properties = { ...(f.properties || {}) };
                                    lines.push(l);
                                });
                            } else if (out && out.type === 'Feature') {
                                out.properties = { ...(f.properties || {}) };
                                lines.push(out);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Polygon to Line: no se pudo convertir feature', f);
                }
                if (i % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }
            return turf.featureCollection(lines);
        }
    },

    geo_point_surf: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'CenterPointInside', icon: 'fa-map-marker', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>Interior garantizado</div>`,
        run: async (id, i) => {
            const fc = i[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 25000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({ task: 'geo_point_surf', features: fc }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker CenterPointInside fallo, fallback local:', e);
                }
            }
            return turf.featureCollection(fc.features.map(f => turf.pointOnFeature(f)));
        }
    },

    geo_bbox: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Envelope', icon: 'fa-square-full', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>Caja LÃ­mite</div>`,
        run: async (id, i) => {
            const fc = i[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 25000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({ task: 'geo_bbox', features: fc }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Envelope fallo, fallback local:', e);
                }
            }
            return turf.featureCollection(fc.features.map(f => turf.bboxPolygon(turf.bbox(f))));
        }
    },

    geo_voronoi: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Voronoi', icon: 'fa-th-large', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>PolÃ­gonos</div>`,
        run: async (id, i) => {
            const inputs = i[0];
            if (!inputs || !inputs.features) throw new Error("Sin datos");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'geo_voronoi',
                        features: inputs.features
                    };

                    // Voronoi es rÃ¡pido con RBush, pero lento en construcciÃ³n inicial
                    const wres = await postWorkerTask(payload, 30000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Voronoi fallÃ³, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (ORIGINAL) ---
            const seen = new Set();
            const cleanPoints = [];
            inputs.features.forEach(f => {
                if (turf.getType(f) === 'Point') {
                    const c = f.geometry.coordinates;
                    const key = c[0].toFixed(6) + ',' + c[1].toFixed(6);
                    if (!seen.has(key)) {
                        seen.add(key);
                        cleanPoints.push(turf.point([c[0], c[1]], f.properties));
                    }
                }
            });

            if (cleanPoints.length === 0) throw new Error("No hay puntos vÃ¡lidos");
            const fc = turf.featureCollection(cleanPoints);

            const bbox = turf.bbox(fc);
            const w = bbox[2] - bbox[0];
            const h = bbox[3] - bbox[1];
            const pad = Math.max(w, h) * 0.5 || 0.01;
            const expandedBbox = [bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad];

            const result = turf.voronoi(fc, { bbox: expandedBbox });

            if (result && result.features) {
                result.features = result.features.filter(f => f && f.geometry && f.geometry.coordinates.length > 0);
                result.features.forEach((poly, idx) => {
                    if (poly && cleanPoints[idx]) {
                        poly.properties = cleanPoints[idx].properties;
                    }
                });
            }

            return result;
        }
    },

    geo_buffer: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Bufferer', icon: 'fa-bullseye', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Radio / Unidad</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-dist value="100" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="meters">m</option>
                        <option value="kilometers">km</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Estilo Borde</span>
                <select df-cap class="node-control">
                    <option value="round">Redondo (Round)</option>
                    <option value="square" disabled>Cuadrado (No soportado)</option>
                </select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Resultado</span>
                <select df-dis class="node-control">
                    <option value="false">Individual (Solapados)</option>
                    <option value="true">Disuelto (Unido)</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const dist = parseFloat(dom.querySelector('[df-dist]').value);
            const unit = dom.querySelector('[df-unit]').value;
            const dissolve = dom.querySelector('[df-dis]').value === 'true';

            const features = inputs[0];

            if (!features || !features.features.length) throw new Error("Input vacÃ­o");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'geo_buffer',
                        features: features,
                        dist: dist,
                        unit: unit,
                        dissolve: dissolve
                    };

                    // Tiempo generoso (90s) porque Dissolve es muy pesado
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Buffer fallÃ³, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL ---
            const buffered = turf.buffer(features, dist, { units: unit });
            return dissolve ? turf.dissolve(buffered) : buffered;
        }
    },

    geo_random_fill: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Random Fill', icon: 'fa-braille', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Puntos por PolÃ­gono</span>
                <input type="number" df-n class="node-control" value="50" min="1">
            </div>
            <div style="font-size:0.6em;color:#888">
                Genera puntos aleatorios restringidos al interior de cada geometrÃ­a.
            </div>`,
        run: async (id, inputs, dom) => {
            const count = parseInt(dom.querySelector('[df-n]').value) || 10;
            const resultPoints = [];
            const fc = inputs[0] || turf.featureCollection([]);

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_random_fill',
                        features: fc,
                        count
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Random Fill fallo, fallback local:", e);
                }
            }

            const feats = turf.flatten(fc).features;
            for (let fi = 0; fi < feats.length; fi++) {
                const f = feats[fi];
                const type = turf.getType(f);
                if (type !== 'Polygon' && type !== 'MultiPolygon') continue;

                const bbox = turf.bbox(f);
                let current = 0;
                let attempts = 0;
                const maxAttempts = count * 80; // Evita bucles infinitos en poligonos corruptos

                while (current < count && attempts < maxAttempts) {
                    if (attempts % 200 === 0 && typeof window.JETLThrowIfCancelled === 'function') {
                        window.JETLThrowIfCancelled();
                    }
                    const rnd = turf.randomPoint(1, { bbox: bbox });
                    const pt = rnd.features[0];
                    if (turf.booleanPointInPolygon(pt, f)) {
                        pt.properties = { ...f.properties, _generated_id: current };
                        resultPoints.push(pt);
                        current++;
                    }
                    attempts++;
                }
                if (fi % 40 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
            }

            return turf.featureCollection(resultPoints);
        }
    }
});








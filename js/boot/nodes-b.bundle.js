/* ---- js/nodes/spatial.js ---- */
// Cat: spatial
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    geo_kink_remover: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Kink Remover', icon: 'fa-band-aid', color: '#8e44ad', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Umbral Z-Kink (Grados)</span>
                <input type="number" df-deg value="5" class="node-control" title="Ángulos menores a este valor (picos muy agudos) serán eliminados">
            </div>
            <div style="font-size:0.6em;color:#888">Corrige lazos (Unkink) y elimina picos (Z-kinks).</div>
        `,
        run: async (id, inputs, dom) => {
            const minDeg = parseFloat(dom.querySelector('[df-deg]').value) || 0;
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'geo_kink_remover',
                        features: inputs[0],
                        minDeg
                    };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Kink Remover fallo, fallback local:", e);
                }
            }

            // Función auxiliar para limpiar Z-kinks (picos agudos) basada en ángulos
            const cleanZKinks = (feature) => {
                // Si no hay umbral, devolvemos tal cual (solo aplicamos cleanCoords básico)
                if (minDeg <= 0) return turf.cleanCoords(feature);

                const type = turf.getType(feature);
                if (type !== 'Polygon' && type !== 'LineString') return feature; // Solo soportado en líneas simples/polígonos simples por ahora

                const coords = turf.getCoords(feature);
                // Lógica simplificada: Iterar vértices y calcular ángulo de desviación
                // Nota: Para implementación robusta en Polígonos con huecos, habría que iterar anillos.
                // Aquí aplicamos una simplificación topológica segura usando turf.simplify como proxy robusto
                // para evitar romper la geometría manualmente con cálculos de ángulos complejos.
                // Mapeamos "Grados" a una tolerancia aproximada de simplificación para eliminar ruido.

                // Sin embargo, para cumplir con "Grados", usamos cleanCoords que elimina redundancia
                // y simplify con alta calidad para eliminar el ruido de los quiebros.
                const tolerance = minDeg * 0.00005; // Conversión heurística para WGS84
                return turf.simplify(feature, { tolerance: tolerance, highQuality: true });
            };

            turf.flatten(inputs[0]).features.forEach(f => {
                const type = turf.getType(f);

                if (type === 'Polygon' || type === 'MultiPolygon') {
                    try {
                        // 1. Arreglar Lazos (Unkink)
                        const unkinked = turf.unkinkPolygon(f);

                        // 2. Limpiar Z-kinks en los fragmentos resultantes
                        unkinked.features.forEach(part => {
                            part.properties = f.properties; // Mantener atributos
                            res.push(cleanZKinks(part));
                        });
                    } catch (e) {
                        // Fallback si unkink falla (ej. geometría corrupta)
                        console.warn('Unkink falló, aplicando limpieza básica', e);
                        res.push(cleanZKinks(f));
                    }
                } else if (type === 'LineString' || type === 'MultiLineString') {
                    // Para líneas solo aplicamos limpieza de Z-kinks
                    res.push(cleanZKinks(f));
                } else {
                    // Puntos u otros pasan directo
                    res.push(f);
                }
            });

            return turf.featureCollection(res);
        }
    },

    geo_angle_calculator: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Angle Calculator', icon: 'fa-ruler-combined', color: '#8e44ad', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Ángulo Máximo (Grados)</span>
                <input type="number" df-deg value="45" class="node-control" title="Marca vértices con ángulo interno menor a este valor">
            </div>
            <div style="font-size:0.6em;color:#888">Detecta picos agudos (< 180º).</div>
        `,
        run: async (id, inputs, dom) => {
            const threshold = parseFloat(dom.querySelector('[df-deg]').value);
            const points = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'geo_angle_calculator',
                        features: inputs[0],
                        threshold
                    };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Angle Calculator fallo, fallback local:", e);
                }
            }

            // Función auxiliar: Calcula el ángulo interno (0 a 180) en el vértice B (A-B-C)
            const getAngleAtVertex = (a, b, c) => {
                const bearingBA = turf.bearing(b, a);
                const bearingBC = turf.bearing(b, c);
                let angle = Math.abs(bearingBA - bearingBC);
                if (angle > 180) angle = 360 - angle;
                return angle;
            };

            turf.flatten(inputs[0]).features.forEach((f, fIdx) => {
                const type = turf.getType(f);
                const coords = turf.getCoords(f);

                // Normalizamos para tratar Anillos de Polígonos o Líneas simples
                // (Nota: Solo procesa el anillo exterior en polígonos para simplificar)
                let ring = (type === 'Polygon') ? coords[0] : (type === 'LineString' ? coords : null);

                if (!ring || ring.length < 3) return;

                const isClosed = (type === 'Polygon');
                // En GeoJSON, el último punto de un polígono repite el primero.
                // Iteramos hasta length-1 porque el último es duplicado en polígonos.
                const len = ring.length;
                const limit = isClosed ? len - 1 : len;

                for (let i = 0; i < limit; i++) {
                    let prev, curr, next;

                    if (i === 0) {
                        if (!isClosed) continue; // Una línea no tiene ángulo en el inicio
                        prev = ring[len - 2]; // El penúltimo punto real
                        curr = ring[0];
                        next = ring[1];
                    } else if (i === len - 1) {
                        if (!isClosed) continue; // Una línea no tiene ángulo en el final
                        // En polígono esto ya se cubre en el caso i=0 debido a la duplicidad
                        continue;
                    } else {
                        prev = ring[i - 1];
                        curr = ring[i];
                        next = ring[i + 1];
                    }

                    // Protección contra puntos duplicados consecutivos que dan bearing NaN
                    if (!prev || !next) continue;

                    const angle = getAngleAtVertex(prev, curr, next);

                    if (angle <= threshold) {
                        points.push(turf.point(curr, {
                            ...f.properties, // Hereda atributos del padre
                            _vertex_index: i,
                            _parent_id: fIdx,
                            angle: parseFloat(angle.toFixed(2)) // Guarda el ángulo calculado
                        }));
                    }
                }
            });

            return turf.featureCollection(points);
        }
    },

    sp_min_area_solver: {
        cat: '2.2 VECTOR - SPATIAL', label: 'MinArea Solver', icon: 'fa-compress-alt', color: '#8e44ad',
        in: 1,
        out: 3, // Out 1: Intactos | Out 2: Fusionados (Merged) | Out 3: Fallidos (Failed)
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Criterio de Área</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-val value="100" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="1">m²</option>
                        <option value="10000">ha</option>
                        <option value="1000000">km²</option>
                    </select>
                </div>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Modo de Acción</span>
                <select df-mode class="node-control">
                    <option value="merge">Fusionar con vecino (Merge)</option>
                    <option value="delete">Solo Eliminar</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666;margin-top:4px">
                <b>Out 1:</b> Passed (Intactos)<br>
                <b>Out 2:</b> Merged (Fusionados)<br>
                <b>Out 3:</b> Failed (Eliminados)
            </div>`,
        run: async (id, inputs, dom) => {
            const minVal = parseFloat(dom.querySelector('[df-val]').value);
            const multiplier = parseFloat(dom.querySelector('[df-unit]').value);
            const mode = dom.querySelector('[df-mode]').value;
            const thresholdSqM = minVal * multiplier;

            const features = inputs[0];
            if (!features || !features.features) throw new Error("Entrada vacía");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'min_area_solver',
                        features: features,
                        thresholdSqM: thresholdSqM,
                        mode: mode
                    };

                    // Proceso iterativo puede tardar (120s)
                    const wres = await postWorkerTask(payload, 120000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker MinArea falló, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (ORIGINAL) ---
            // Código original como red de seguridad
            let items = features.features.map((f, i) => {
                const area = turf.area(f);
                return { id: i, feature: f, geometry: f.geometry, properties: f.properties, area: area, bbox: turf.bbox(f), isSliver: area < thresholdSqM, isDeleted: false, isModified: false };
            });
            if (mode === 'delete') {
                const passed = items.filter(i => !i.isSliver).map(i => i.feature);
                const failed = items.filter(i => i.isSliver).map(i => i.feature);
                return { output_1: turf.featureCollection(passed), output_2: turf.featureCollection([]), output_3: turf.featureCollection(failed) };
            }
            items.sort((a, b) => a.area - b.area);
            for (let idx = 0; idx < items.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 20 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const item = items[idx];
                if (item.isDeleted || item.area >= thresholdSqM) continue;
                let bestNeighbor = null;
                let maxSharedLen = 0;
                for (let j = 0; j < items.length; j++) {
                    if (j % 200 === 0 && typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    const candidate = items[j];
                    if (item.id === candidate.id || candidate.isDeleted) continue;
                    if (item.bbox[2] < candidate.bbox[0] || item.bbox[0] > candidate.bbox[2] || item.bbox[3] < candidate.bbox[1] || item.bbox[1] > candidate.bbox[3]) continue;
                    try {
                        if (turf.booleanIntersects(item.feature, candidate.feature)) {
                            const l1 = turf.polygonToLine(item.feature);
                            const l2 = turf.polygonToLine(candidate.feature);
                            const overlap = turf.lineOverlap(l1, l2);
                            if (overlap && overlap.features.length > 0) {
                                const len = turf.length(overlap);
                                if (len > maxSharedLen) { maxSharedLen = len; bestNeighbor = candidate; }
                            } else if (!bestNeighbor) { bestNeighbor = candidate; }
                        }
                    } catch (e) { }
                }
                if (bestNeighbor) {
                    try {
                        const union = turf.union(bestNeighbor.feature, item.feature);
                        bestNeighbor.feature = union;
                        bestNeighbor.area = turf.area(union);
                        bestNeighbor.bbox = turf.bbox(union);
                        bestNeighbor.isModified = true;
                        item.isDeleted = true;
                    } catch (err) { }
                }
            }
            const outPassed = []; const outMerged = []; const outFailed = [];
            items.forEach(i => {
                if (i.isDeleted) return;
                if (i.area >= thresholdSqM) { if (i.isModified) outMerged.push(i.feature); else outPassed.push(i.feature); }
                else { outFailed.push(i.feature); }
            });
            return { output_1: turf.featureCollection(outPassed), output_2: turf.featureCollection(outMerged), output_3: turf.featureCollection(outFailed) };
        }
    },

    geo_snap: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Snapper', icon: 'fa-magnet', color: '#8e44ad', in: 2, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Distancia de Atracción</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-dist value="1" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="meters">m</option>
                        <option value="kilometers">km</option>
                        <option value="miles">miles</option>
                    </select>
                </div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:2px">
                Input 1 (Data) se mueve hacia Input 2 (Ancla).
            </div>`,
        run: async (id, inputs, dom) => {
            const val = parseFloat(dom.querySelector('[df-dist]').value);
            const unit = dom.querySelector('[df-unit]').value;

            // Validación básica de parámetros
            if (isNaN(val) || val < 0) throw new Error("Distancia inválida");

            // Input 1 es lo que vamos a mover, Input 2 es el ancla
            const source = inputs[0];
            const anchor = inputs[1];

            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!anchor || !anchor.features.length) throw new Error("Input 2 (Ancla) vacío");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'geo_snap',
                        source: source,
                        anchor: anchor,
                        range: val,
                        unit: unit
                    };

                    // Tiempo extendido (60s) para snapping masivo
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Snap falló, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (ORIGINAL, MUY LENTO) ---
            // Solo se ejecuta si el worker falla

            // Umbral en Kilómetros (Turf estándar para conversiones simples locales)
            let thresholdKm = val;
            if (unit === 'meters') thresholdKm = val / 1000;
            else if (unit === 'miles') thresholdKm = val * 1.60934;

            const sourceClone = JETLClone(source);

            // Optimizacion mínima local: Explode solo una vez
            const anchorPoints = turf.explode(anchor);

            turf.coordEach(sourceClone, (currentCoord) => {
                const currentPoint = turf.point(currentCoord);
                const nearest = turf.nearestPoint(currentPoint, anchorPoints);
                const distance = turf.distance(currentPoint, nearest, { units: 'kilometers' });

                if (distance <= thresholdKm) {
                    currentCoord[0] = nearest.geometry.coordinates[0];
                    currentCoord[1] = nearest.geometry.coordinates[1];
                }
            });

            return sourceClone;
        }
    },

    sp_spatial_filter: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Spatial Filter', icon: 'fa-filter', color: '#8e44ad', in: 2, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Criterio (Input 1 vs Input 2)</span>
                <select df-mode class="node-control">
                    <option value="contains">Contiene a (Contains)</option>
                    <option value="within">Dentro de (Within)</option>
                    <option value="crosses">Cruza (Crosses)</option>
                    <option value="touches">Toca (Touches)</option>
                    <option value="equal">Igual (Equals)</option>
                    <option value="disjoint">Disjoint (No toca)</option>
                    <option value="overlap">Overlap (Solapa)</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Passed (Cumple) | Out 2: Failed</div>`,
        run: async (id, inputs, dom) => {
            const mode = dom.querySelector('[df-mode]').value;
            const source = inputs[0]; // FeatureCollection completo
            const mask = inputs[1];   // FeatureCollection completo

            if (!source || !source.features.length) throw new Error("Input 1 (Data) vacío");
            if (!mask || !mask.features.length) throw new Error("Input 2 (Mask) vacío");

            // --- INTENTO VIA WORKER (OPTIMIZADO) ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker(); // Reiniciar si murió

                    const payload = {
                        task: 'spatial_filter',
                        source: source,
                        mask: mask,
                        mode: mode
                    };

                    // Timeout generoso (60s) para operaciones complejas
                    const wres = await postWorkerTask(payload, 60000);

                    if (wres && wres.status === 'ok') {
                        // El worker ya devuelve { output_1: ..., output_2: ... }
                        return wres.data;
                    }
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker filter falló, usando fallback local:", e);
                }
            }

            // --- FALLBACK: HILO PRINCIPAL (Lento, solo si falla worker) ---
            const passed = [];
            const failed = [];
            // Aplanamos máscara para bucle simple
            const flatMask = [];
            turf.flatten(mask).features.forEach(f => flatMask.push(f));

            for (let idx = 0; idx < source.features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 40 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f1 = source.features[idx];
                let match = false;
                for (const f2 of flatMask) {
                    try {
                        if (mode === 'contains' && turf.booleanContains(f1, f2)) match = true;
                        else if (mode === 'within' && turf.booleanWithin(f1, f2)) match = true;
                        else if (mode === 'crosses' && turf.booleanCrosses(f1, f2)) match = true;
                        else if (mode === 'touches' && turf.booleanTouches(f1, f2)) match = true;
                        else if (mode === 'equal' && turf.booleanEqual(f1, f2)) match = true;
                        // Añadimos los nuevos modos al fallback también
                        else if (mode === 'disjoint' && turf.booleanDisjoint(f1, f2)) match = true;
                        else if (mode === 'overlap' && turf.booleanOverlap(f1, f2)) match = true;
                    } catch (e) { }
                    if (match) break;
                }
                if (match) passed.push(f1);
                else failed.push(f1);
            }

            return {
                output_1: turf.featureCollection(passed),
                output_2: turf.featureCollection(failed)
            };
        }
    },

    sp_spatial_join: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Spatial Join', icon: 'fa-link', color: '#8e44ad', in: 2, out: 2,
        help: 'Une atributos de Input2 en Input1 según relación espacial.',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Relación</span>
                <select df-mode class="node-control">
                    <option value="intersects">Intersects</option>
                    <option value="within">Within</option>
                    <option value="contains">Contains</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tipo Join</span>
                <select df-join class="node-control">
                    <option value="left">Left</option>
                    <option value="inner">Inner</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Estrategia</span>
                <select df-strategy class="node-control">
                    <option value="first">Primer match</option>
                    <option value="aggregate">Agregado (numéricos)</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo Campos</span>
                <input type="text" df-prefix class="node-control" value="j_">
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Join | Out 2: Sin Match</div>`,
        run: async (id, inputs, dom) => {
            const mode = dom.querySelector('[df-mode]').value;
            const joinType = dom.querySelector('[df-join]').value;
            const strategy = dom.querySelector('[df-strategy]').value;
            const prefix = dom.querySelector('[df-prefix]').value || 'j_';
            const source = inputs[0];
            const join = inputs[1];
            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!join || !join.features.length) throw new Error("Input 2 vacío");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = { task: 'spatial_join', source, join, mode, joinType, prefix, strategy };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker spatial join falló, fallback local:", e);
                }
            }

            // Fallback local
            const joined = [];
            const unmatched = [];
            for (let idx = 0; idx < source.features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 40 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f1 = source.features[idx];
                let matched = false;
                const matches = [];
                join.features.forEach(f2 => {
                    try {
                        let ok = false;
                        if (mode === 'intersects') ok = turf.booleanIntersects(f1, f2);
                        else if (mode === 'within') ok = turf.booleanWithin(f1, f2);
                        else if (mode === 'contains') ok = turf.booleanContains(f1, f2);
                        if (ok) matches.push(f2);
                    } catch (e) { }
                });
                if (matches.length > 0) {
                    matched = true;
                    const nf = JETLClone(f1);
                    if (strategy === 'first') {
                        const m = matches[0];
                        Object.keys(m.properties || {}).forEach(k => nf.properties[prefix + k] = m.properties[k]);
                    } else {
                        nf.properties[prefix + 'match_count'] = matches.length;
                        const agg = {};
                        matches.forEach(m => {
                            Object.keys(m.properties || {}).forEach(k => {
                                const v = m.properties[k];
                                if (typeof v === 'number' && !isNaN(v)) {
                                    if (!agg[k]) agg[k] = { sum: 0, min: v, max: v, count: 0 };
                                    agg[k].sum += v;
                                    agg[k].min = Math.min(agg[k].min, v);
                                    agg[k].max = Math.max(agg[k].max, v);
                                    agg[k].count += 1;
                                }
                            });
                        });
                        Object.keys(agg).forEach(k => {
                            const a = agg[k];
                            nf.properties[prefix + k + '_sum'] = a.sum;
                            nf.properties[prefix + k + '_avg'] = a.count ? a.sum / a.count : null;
                            nf.properties[prefix + k + '_min'] = a.min;
                            nf.properties[prefix + k + '_max'] = a.max;
                        });
                    }
                    joined.push(nf);
                }
                if (!matched && joinType === 'left') joined.push(f1);
                if (!matched) unmatched.push(f1);
            }
            return { output_1: turf.featureCollection(joined), output_2: turf.featureCollection(unmatched) };
        }
    },

    sp_nearest_neighbor: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Nearest Neighbor', icon: 'fa-shoe-prints', color: '#8e44ad', in: 2, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Radio Máximo</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-dist placeholder="Infinito" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="kilometers">km</option>
                        <option value="meters">m</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom:4px">
                <label style="font-size:0.8em;color:#ccc;display:flex;align-items:center">
                    <input type="checkbox" df-copy checked style="margin-right:5px"> Copiar Atributos
                </label>
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Con Vecino | Out 2: Sin Vecino</div>`,
        run: async (id, inputs, dom) => {
            const distVal = dom.querySelector('[df-dist]').value;
            const units = dom.querySelector('[df-unit]').value;
            const copyAttr = dom.querySelector('[df-copy]').checked;

            // Si el campo está vacío, mandamos Infinity para que el Worker entienda que no hay límite
            const maxDist = (distVal && distVal.trim() !== '') ? parseFloat(distVal) : Infinity;

            const source = inputs[0];
            const candidates = inputs[1];

            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!candidates || !candidates.features.length) throw new Error("Input 2 vacío");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'nearest_neighbor',
                        source: source,
                        candidates: candidates,
                        maxDist: maxDist,
                        unit: units,
                        copyAttr: copyAttr
                    };

                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker NN falló, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (BRUTE FORCE) ---
            const matched = [];
            const unmatched = [];
            const candidateFC = turf.featureCollection(candidates.features.map((f, idx) => {
                const c = turf.centroid(f);
                c.properties = f.properties;
                c.id = idx;
                return c;
            }));

            for (let idx = 0; idx < source.features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 50 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f = source.features[idx];
                const center = turf.centroid(f);
                // nearestPoint de turf no soporta maxDist nativamente, busca el absoluto
                const nearest = turf.nearestPoint(center, candidateFC);

                let dist = nearest.properties.distanceToPoint;
                if (units === 'meters') dist = dist * 1000;

                // Comprobación manual de distancia
                if (dist <= maxDist) {
                    const res = JETLClone(f);
                    res.properties._neighbor_dist = parseFloat(dist.toFixed(4));
                    if (copyAttr) {
                        Object.keys(nearest.properties).forEach(k => {
                            if (k !== 'distanceToPoint' && k !== 'featureIndex') res.properties['neighbor_' + k] = nearest.properties[k];
                        });
                    } else {
                        res.properties._neighbor_id = nearest.id;
                    }
                    matched.push(res);
                } else {
                    unmatched.push(f);
                }
            }

            return {
                output_1: turf.featureCollection(matched),
                output_2: turf.featureCollection(unmatched)
            };
        }
    },

    sp_intersector: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Intersector', icon: 'fa-times', color: '#8e44ad', in: 2, out: 2,
        tpl: () => `<div style="font-size:0.7em;color:#aaa">Calcula intersección. <br>Si son líneas, las corta.</div>
                    <div style="font-size:0.6em;color:#888;margin-top:2px">Out 1: Geometría (Líneas/Polys) | Out 2: Puntos</div>`,
        run: async (id, inputs) => {
            const source = inputs[0];
            const target = inputs[1];

            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!target || !target.features.length) throw new Error("Input 2 vacío");

            const features1 = source.features;
            const features2 = target.features;

            // Detectar modo automáticamente
            const isLineMode = features1.some(f => turf.getType(f).includes('Line')) && features2.some(f => turf.getType(f).includes('Line'));

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'intersector',
                        source: source,
                        target: target,
                        isLineMode: isLineMode
                    };

                    // Tiempo extendido (90s) para intersecciones complejas
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker intersector falló, fallback local:", e);
                }
            }

            // --- FALLBACK: HILO PRINCIPAL (CÓDIGO ORIGINAL LEGACY) ---
            // Solo se ejecutará si falla el Worker
            const outGeom = [];
            const outPoints = [];

            if (isLineMode) {
                // Cálculo costoso global
                const intersections = turf.lineIntersect(source, target);
                if (intersections && intersections.features) outPoints.push(...intersections.features);

                // Split Input 1
                const sourceLines = turf.flatten(source).features;
                for (let idx = 0; idx < sourceLines.length; idx++) {
                    if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    if (idx % 30 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                    const line = sourceLines[idx];
                    let splitResult = [line];
                    try {
                        if (intersections.features.length > 0) {
                            const split = turf.lineSplit(line, intersections);
                            if (split && split.features.length > 0) splitResult = split.features;
                        }
                    } catch (e) { }
                    splitResult.forEach(s => { s.properties = { ...line.properties, _origin: 'input1' }; outGeom.push(s); });
                }

                // Split Input 2
                const targetLines = turf.flatten(target).features;
                for (let idx = 0; idx < targetLines.length; idx++) {
                    if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    if (idx % 30 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                    const line = targetLines[idx];
                    let splitResult = [line];
                    try {
                        if (intersections.features.length > 0) {
                            const split = turf.lineSplit(line, intersections);
                            if (split && split.features.length > 0) splitResult = split.features;
                        }
                    } catch (e) { }
                    splitResult.forEach(s => { s.properties = { ...line.properties, _origin: 'input2' }; outGeom.push(s); });
                }
            } else {
                // Polygons Loop O(N*M)
                const sourceFlat = turf.flatten(source).features;
                const targetFlat = turf.flatten(target).features;
                for (let i1 = 0; i1 < sourceFlat.length; i1++) {
                    if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    if (i1 % 20 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                    const f1 = sourceFlat[i1];
                    for (let i2 = 0; i2 < targetFlat.length; i2++) {
                        if (i2 % 200 === 0 && typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                        const f2 = targetFlat[i2];
                        try {
                            const intersection = turf.intersect(f1, f2);
                            if (intersection) {
                                intersection.properties = { ...f1.properties, ...f2.properties };
                                outGeom.push(intersection);
                            }
                        } catch (e) { }
                    }
                }
            }

            return {
                output_1: turf.featureCollection(outGeom),
                output_2: turf.featureCollection(outPoints)
            };
        }
    },

    sp_clip: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Clipper (Robust)', icon: 'fa-crop', color: '#8e44ad', in: 2, out: 1,
        tpl: () => `<div>Data &#8745; Mask</div>`,
        run: async (id, i) => {
            if (!i[0] || !i[1] || !i[1].features.length) throw new Error("Faltan datos");
            if (!i[0].features || i[0].features.length === 0) throw new Error("Data vacía");

            let maskCollection = turf.flatten(i[1]);
            let dissolved = turf.dissolve(maskCollection);
            let mask = dissolved.features[0];
            if (dissolved.features.length > 1) {
                const coords = dissolved.features.map(f => f.geometry.coordinates);
                mask = turf.multiPolygon(coords);
            }
            try { mask = turf.simplify(mask, { tolerance: 0.00001, highQuality: true }); } catch (e) { }
            try { mask = turf.cleanCoords(mask); } catch (e) { }

            // Intentar usar Worker si está disponible (definido en index.html)
            const features = i[0].features;
            const CHUNK = 50;
            try {
                if (typeof postWorkerTask === 'function') {
                    if (!window.geoWorker) createGeoWorker(); // Asumiendo fn global
                    const payload = { task: 'clip', features: { type: 'FeatureCollection', features }, mask, chunk: CHUNK };
                    const wres = await postWorkerTask(payload, 30000);
                    if (wres && (wres.status === 'ok' || wres.status === 'partial')) {
                        return normalizeResult(wres.data || wres.result || wres);
                    }
                }
            } catch (e) {
                if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                console.log("Worker clip fallback");
            }

            // Fallback Main Thread
            const res = [];
            for (let idx = 0; idx < features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 50 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f = features[idx];
                try {
                    if (!turf.booleanIntersects(f, mask)) continue;
                    const clipped = turf.intersect(f, mask);
                    if (clipped) { clipped.properties = f.properties; res.push(clipped); }
                } catch (e) { }
            }
            return turf.featureCollection(res);
        }
    }
});






/* ---- js/nodes/attributes.js ---- */
﻿// Cat: attributes
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
const SAFE_EXPR_MAX_LEN = 500;
const SAFE_EXPR_BLOCKLIST = [
    /\b(?:window|document|globalThis|self|Function|eval|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|caches|navigator|location)\b/i,
    /(?:__proto__|prototype|constructor)/i,
    /\b(?:import|export)\b/i
];

function validateSafeExpression(expr) {
    const source = String(expr || '').trim();
    if (!source) throw new Error("Expresion vacia");
    if (source.length > SAFE_EXPR_MAX_LEN) {
        throw new Error(`Expresion demasiado larga (max ${SAFE_EXPR_MAX_LEN} chars)`);
    }
    for (const rule of SAFE_EXPR_BLOCKLIST) {
        if (rule.test(source)) throw new Error("Expresion bloqueada por seguridad");
    }
    return source;
}

function compileSafeExpression(expr, argNames) {
    const source = validateSafeExpression(expr);
    const names = Array.isArray(argNames) ? argNames : [];
    return new Function(
        ...names,
        'Math',
        'turf',
        'window',
        'document',
        'globalThis',
        'self',
        'Function',
        'fetch',
        'XMLHttpRequest',
        `"use strict"; return (${source});`
    );
}

function parseCsvFields(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function resolveParamText(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}

function computeBasicStats(values) {
    const nums = values.filter((v) => typeof v === 'number' && !isNaN(v));
    if (!nums.length) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const avg = sum / nums.length;
    return { sum, min, max, avg, count: nums.length };
}

function writeFlatStatsToFeature(props, prefix, key, stats) {
    props[`${prefix}_${key}_sum`] = stats.sum;
    props[`${prefix}_${key}_min`] = stats.min;
    props[`${prefix}_${key}_max`] = stats.max;
    props[`${prefix}_${key}_avg`] = stats.avg;
    props[`${prefix}_${key}_count`] = stats.count;
}

function normalizeTestValue(raw, sampleVal) {
    const text = String(raw ?? '').trim();
    if (typeof sampleVal === 'number') {
        const n = Number(text);
        return isNaN(n) ? text : n;
    }
    if (typeof sampleVal === 'boolean') return text.toLowerCase() === 'true';
    return text;
}

function evalTestCondition(props, cond) {
    const left = props ? props[cond.field] : undefined;
    const op = String(cond.op || '==');
    const rightRaw = cond.value;
    const right = normalizeTestValue(rightRaw, left);

    if (op === 'like') return String(left ?? '').toLowerCase().includes(String(rightRaw ?? '').toLowerCase());
    if (op === 'starts') return String(left ?? '').toLowerCase().startsWith(String(rightRaw ?? '').toLowerCase());
    if (op === 'ends') return String(left ?? '').toLowerCase().endsWith(String(rightRaw ?? '').toLowerCase());
    if (op === 'in') {
        const list = String(rightRaw ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return list.includes(String(left ?? ''));
    }
    if (op === '>') return left > Number(right);
    if (op === '>=') return left >= Number(right);
    if (op === '<') return left < Number(right);
    if (op === '<=') return left <= Number(right);
    if (op === '!=') return left != right;
    return left == right;
}

function evalTestGroup(props, conditions) {
    if (!Array.isArray(conditions) || !conditions.length) return true;
    let acc = evalTestCondition(props, conditions[0]);
    for (let i = 1; i < conditions.length; i++) {
        const join = String(conditions[i].join || 'AND').toUpperCase();
        const cur = evalTestCondition(props, conditions[i]);
        acc = join === 'OR' ? (acc || cur) : (acc && cur);
    }
    return acc;
}

Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    attr_stats: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Stats Calc', icon: 'fa-calculator', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campos numericos</span>
                <input type="text" df-field class="node-control" placeholder="campo1, campo2">
            </div>
            <div df-stats-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Modo</span>
                <select df-mode class="node-control">
                    <option value="per_field">Stats por campo</option>
                    <option value="concat">Stats concatenadas</option>
                    <option value="both">Ambas</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (no rechazar)</option>
                    <option value="reject">Rechazar sin numericos</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666">Escribe columnas visibles: stats_*</div>`,
        run: async (id, inputs, dom) => {
            const fields = parseCsvFields(resolveParamText(dom.querySelector('[df-field]').value));
            const mode = dom.querySelector('[df-mode]')?.value || 'per_field';
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const prefix = 'stats';
            if (!fields.length) throw new Error("Define al menos un campo");

            if (onError !== 'reject' && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_stats',
                        features: inputs[0],
                        fields,
                        mode,
                        prefix
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Stats fallo, fallback local:", e);
                }
            }

            const fc = inputs[0];
            const byField = {};
            fields.forEach((field) => {
                const values = fc.features.map((f) => (f.properties || {})[field]);
                const s = computeBasicStats(values);
                if (s) byField[field] = s;
            });
            if (!Object.keys(byField).length) throw new Error("No hay valores numericos en los campos elegidos");

            let concatStats = null;
            if (mode === 'concat' || mode === 'both') {
                const concatValues = [];
                fc.features.forEach((f) => {
                    const p = (f && f.properties) || {};
                    fields.forEach((k) => {
                        const v = p[k];
                        if (typeof v === 'number' && !isNaN(v)) concatValues.push(v);
                    });
                });
                concatStats = computeBasicStats(concatValues);
            }

            fc.features.forEach((f) => {
                if (!f.properties) f.properties = {};
                if (mode === 'per_field' || mode === 'both') {
                    Object.keys(byField).forEach((field) => {
                        writeFlatStatsToFeature(f.properties, prefix, field, byField[field]);
                    });
                }
                if ((mode === 'concat' || mode === 'both') && concatStats) {
                    writeFlatStatsToFeature(f.properties, prefix, 'concat', concatStats);
                }
            });

            if (onError === 'reject') {
                const passed = [];
                const rejected = [];
                fc.features.forEach((f) => {
                    const p = f.properties || {};
                    const hasNumeric = fields.some((k) => typeof p[k] === 'number' && !isNaN(p[k]));
                    if (hasNumeric) passed.push(f);
                    else {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._stats_error = 'Sin valores numericos en campos objetivo';
                        rejected.push(rf);
                    }
                });
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }

            return fc;
        }
    },

    attr_renamer: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Renamer', icon: 'fa-tag', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Mapeo (Viejo:Nuevo)</span>
                <input type="text" df-map class="node-control" placeholder="old:new, id:uid">
                <div style="font-size:0.6em;color:#666;font-style:italic">Separar pares por comas</div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex;gap:4px;margin-top:2px">
                    <select df-rename-old class="node-control" style="flex:1"></select>
                    <input type="text" df-rename-new class="node-control" style="flex:1" placeholder="nuevo_nombre">
                    <button class="btn" style="padding:4px 8px" data-schema-action="renamer-add" title="Agregar mapeo">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (continuar)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const mapping = mapStr.split(',').map(p => p.split(':').map(s => s.trim())).filter(([a, b]) => a && b);
            if (!mapping.length) throw new Error("Define al menos un mapeo old:new");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_renamer',
                        features: inputs[0],
                        mapping,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Renamer fallo, fallback local:", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    mapping.forEach(([oldName, newName]) => {
                        if (f.properties[oldName] === undefined) throw new Error(`Campo no encontrado: ${oldName}`);
                        f.properties[newName] = f.properties[oldName];
                        delete f.properties[oldName];
                    });
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._renamer_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_keeper: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Keeper', icon: 'fa-check-square', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campos a mantener</span>
                <input type="text" df-keep class="node-control" placeholder="id, name, type">
                <div style="font-size:0.6em;color:#666;font-style:italic">El resto serÃ¡ borrado</div>
            </div>
            <div df-keeper-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (continuar)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const keepStr = resolveParamText(dom.querySelector('[df-keep]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const toKeep = new Set(keepStr.split(',').map(s => s.trim()));
            if (!toKeep.size) throw new Error("Define al menos un campo a mantener");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_keeper',
                        features: inputs[0],
                        keepList: Array.from(toKeep),
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Keeper fallo, fallback local:", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    let found = 0;
                    const newProps = {};
                    Object.keys(f.properties).forEach(k => {
                        if (toKeep.has(k)) {
                            newProps[k] = f.properties[k];
                            found++;
                        }
                    });
                    if (found === 0) throw new Error("Ningun campo objetivo presente");
                    f.properties = newProps;
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._keeper_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_creator: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attr Creator', icon: 'fa-plus-square', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nuevo Campo</span>
                <input type="text" df-name class="node-control" value="new_field">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Valor o FÃ³rmula (=)</span>
                <input type="text" df-val class="node-control" placeholder="Texto o =f.properties.id*2">
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-name]').value);
            const exprRaw = resolveParamText(dom.querySelector('[df-val]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const isFormula = exprRaw.startsWith('=');

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_creator',
                        features: inputs[0],
                        field,
                        exprRaw,
                        isFormula,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Attr Creator fallo, fallback local:", e);
                }
            }

            let formulaFn = null;
            let compileErr = null;
            if (isFormula) {
                try {
                    formulaFn = compileSafeExpression(exprRaw.substring(1), ['f']);
                } catch (e) {
                    compileErr = e;
                    console.warn("Error en fÃ³rmula Creator", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};

                if (isFormula && !formulaFn) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[field] = null;
                        rf.properties._creator_error = compileErr && compileErr.message ? compileErr.message : 'Formula invalida';
                        rejected.push(rf);
                    } else {
                        f.properties[field] = null;
                        passed.push(f);
                    }
                    return;
                }

                if (isFormula && formulaFn) {
                    try {
                        f.properties[field] = formulaFn(
                            f,
                            Math,
                            turf,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined
                        );
                        passed.push(f);
                    } catch (e) {
                        if (onError === 'reject') {
                            const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                            if (!rf.properties) rf.properties = {};
                            rf.properties[field] = null;
                            rf.properties._creator_error = e && e.message ? e.message : String(e);
                            rejected.push(rf);
                        } else {
                            f.properties[field] = null;
                            passed.push(f);
                        }
                    }
                } else {
                    f.properties[field] = exprRaw;
                    passed.push(f);
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_counter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Counter', icon: 'fa-sort-numeric-down', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre Campo ID</span>
                <input type="text" df-field class="node-control" value="_id">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Valor Inicial</span>
                <input type="number" df-start class="node-control" value="1">
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value);
            let count = parseInt(resolveParamText(dom.querySelector('[df-start]').value)) || 1;

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_counter',
                        features: inputs[0],
                        fieldName,
                        start: count
                    }, 30000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Counter fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach(f => {
                f.properties[fieldName] = count++;
            });
            return inputs[0];
        }
    },

    attr_sorter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Sorter', icon: 'fa-sort-alpha-down', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campo a Ordenar</span>
                <select df-field class="node-control"></select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">DirecciÃ³n</span>
                <select df-dir class="node-control">
                    <option value="asc">Ascendente (A-Z, 0-9)</option>
                    <option value="desc">Descendente (Z-A, 9-0)</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-field]').value);
            const dir = resolveParamText(dom.querySelector('[df-dir]').value) || 'asc';
            const features = [...inputs[0].features]; // Copia para sortear

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_sorter',
                        features: { type: 'FeatureCollection', features },
                        field,
                        dir
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Sorter fallÃƒÂ³, fallback local:", e);
                }
            }

            features.sort((a, b) => {
                const valA = a.properties[field];
                const valB = b.properties[field];

                if (valA === valB) return 0;

                // DetecciÃ³n automÃ¡tica de tipo (NÃºmero vs Texto)
                const isNum = typeof valA === 'number' && typeof valB === 'number';

                let comparison = 0;
                if (isNum) {
                    comparison = valA - valB;
                } else {
                    // ComparaciÃ³n segura de strings (nulls al final)
                    comparison = String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true });
                }

                return dir === 'asc' ? comparison : -comparison;
            });

            return turf.featureCollection(features);
        }
    },

    attr_string_formatter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'String Formatter', icon: 'fa-text-width', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campo(s) Objetivo</span>
                <input type="text" df-field class="node-control" placeholder="Ej: name, type">
            </div>
            <div df-formatter-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">OperaciÃ³n</span>
                <select df-op class="node-control">
                    <option value="upper">MayÃºsculas (UPPER)</option>
                    <option value="lower">MinÃºsculas (lower)</option>
                    <option value="capitalize">Capitalizar (Titulo)</option>
                    <option value="trim">Trim (Limpiar espacios)</option>
                    <option value="replace">Reemplazar (A -> B)</option>
                    <option value="concat">Concatenar (Suffix)</option>
                    <option value="pad">Rellenar (PadStart 001)</option>
                    <option value="template">Plantilla ({campo})</option>
                </select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Argumentos (Sep: | )</span>
                <input type="text" df-args class="node-control" placeholder="old|new Ã³ 000">
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (asignar vacio)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666;margin-top:2px">
                Para Replace: "buscar|reemplazo"<br>
                Para Template: "ID_{id}_zona"
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldRaw = resolveParamText(dom.querySelector('[df-field]').value);
            const op = resolveParamText(dom.querySelector('[df-op]').value) || 'upper';
            const argsRaw = resolveParamText(dom.querySelector('[df-args]').value || '');
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const fields = fieldRaw.split(',').map((s) => s.trim()).filter(Boolean);
            if (!fields.length) throw new Error("Campo objetivo vacio");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_string_formatter',
                        features: inputs[0],
                        fields,
                        op,
                        argsRaw,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker String Formatter fallo, fallback local:", e);
                }
            }

            // Parsear argumentos (separador pipe | para replace)
            const args = argsRaw.split('|');
            const arg1 = args[0];
            const arg2 = args[1] || '';
            const passed = [];
            const rejected = [];

            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    fields.forEach((field) => {
                        if (f.properties[field] === undefined && op !== 'template') {
                            throw new Error(`Campo no encontrado: ${field}`);
                        }
                        let val = f.properties[field];
                        if (val === undefined || val === null) val = '';
                        val = String(val);

                        switch (op) {
                            case 'upper': val = val.toUpperCase(); break;
                            case 'lower': val = val.toLowerCase(); break;
                            case 'trim': val = val.trim(); break;
                            case 'capitalize':
                                val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                                break;
                            case 'replace':
                                // Reemplazo global simple
                                val = val.split(arg1).join(arg2);
                                break;
                            case 'concat':
                                val = val + arg1;
                                break;
                            case 'pad': {
                                // Arg1: Longitud total, Arg2: CarÃ¡cter relleno (defecto '0')
                                const len = parseInt(arg1) || 3;
                                const char = arg2 || '0';
                                val = val.padStart(len, char);
                                break;
                            }
                            case 'template': {
                                // Reemplaza {campo} por el valor de ese campo
                                // El argumento es la plantilla completa, ignorando el valor original del campo objetivo
                                let tpl = argsRaw;
                                Object.keys(f.properties).forEach(k => {
                                    const regex = new RegExp(`{${k}}`, 'g');
                                    tpl = tpl.replace(regex, f.properties[k]);
                                });
                                val = tpl;
                                break;
                            }
                        }
                        f.properties[field] = val;
                    });
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._fmt_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        fields.forEach((field) => { f.properties[field] = ''; });
                        passed.push(f);
                    }
                }
            });

            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_feature_merger: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Feature Merger', icon: 'fa-code-branch', color: '#27ae60', in: 2, out: 3,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">RelaciÃ³n (Input1 : Input2)</span>
                <input type="text" df-map class="node-control" placeholder="tipo:TIPO, id:ID_REF">
                <div style="font-size:0.6em;color:#666;font-style:italic">Separar pares por comas.</div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex; gap:4px; margin-top:2px">
                    <select class="node-control" df-join-left style="flex:1"></select>
                    <select class="node-control" df-join-right style="flex:1"></select>
                    <button class="btn" style="padding:4px 8px" data-schema-action="join-add" title="Agregar par a la relacion">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:4px">
                Out 1: Merged<br>Out 2: Not Merged (Input 1)<br>Out 3: Unused (Input 2)
            </div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const reqFeatures = inputs[0].features; // Requestor (Mantiene geometrÃ­a)
            const supFeatures = inputs[1].features; // Supplier (Aporta atributos)

            // Parsear el mapeo "campo1:campo2, campoA:campoB"
            const joinPairs = mapStr.split(',').map(p => p.split(':').map(s => s.trim()));
            if (joinPairs.length === 0 || !joinPairs[0][0]) throw new Error("Define campos de uniÃ³n");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_feature_merger',
                        requestor: { type: 'FeatureCollection', features: reqFeatures },
                        supplier: { type: 'FeatureCollection', features: supFeatures },
                        joinPairs: joinPairs
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Feature Merger fallÃ³, fallback local:", e);
                }
            }

            // FunciÃ³n auxiliar para generar Hash Keys
            const getKey = (props, fields) => fields.map(f => String(props[f] || 'null')).join('|_|');

            // 1. Indexar el Supplier (Input 2)
            const supMap = new Map();
            const supKeys = joinPairs.map(p => p[1]); // Lado derecho del par

            supFeatures.forEach((f, idx) => {
                const key = getKey(f.properties, supKeys);
                // Si hay duplicados en el supplier, nos quedamos con el primero (First Match)
                if (!supMap.has(key)) {
                    supMap.set(key, { props: f.properties, originalIdx: idx, used: false });
                }
            });

            const merged = [];
            const notMerged = [];

            // 2. Procesar Requestor (Input 1)
            const reqKeys = joinPairs.map(p => p[0]); // Lado izquierdo del par

            reqFeatures.forEach(f => {
                const key = getKey(f.properties, reqKeys);

                if (supMap.has(key)) {
                    // Match encontrado!
                    const supData = supMap.get(key);
                    supData.used = true; // Marcamos supplier como usado

                    // Clonamos feature para no mutar original
                    const newF = JETLClone(f);
                    // Fusionamos atributos (Supplier sobrescribe a Requestor en caso de colisiÃ³n)
                    newF.properties = { ...newF.properties, ...supData.props };
                    merged.push(newF);
                } else {
                    // No match
                    notMerged.push(f);
                }
            });

            // 3. Recolectar Unused Suppliers (Input 2 que sobraron)
            const unusedSup = supFeatures.filter((f, idx) => {
                // Como supMap solo guarda el primero de cada serie duplicada,
                // necesitamos una forma de saber si este feature especÃ­fico fue "tocado".
                // Una forma robusta es volver a generar su key y ver si esa key estÃ¡ marcada como usada en el mapa.
                const key = getKey(f.properties, supKeys);
                const mapEntry = supMap.get(key);
                // Si la entrada del mapa fue usada, consideramos todos los duplicados de esa clave como usados?
                // Generalmente en FeatureMerger 1:1, los duplicados del supplier que no se usaron son "Unused".
                // Pero para simplificar lÃ³gica visual: Si la clave se usÃ³, el "concepto" se usÃ³.
                // AquÃ­ seremos estrictos: Solo devolvemos los que NO fueron la fuente de datos.

                return !mapEntry || !mapEntry.used;
            });

            return {
                output_1: turf.featureCollection(merged),
                output_2: turf.featureCollection(notMerged),
                output_3: turf.featureCollection(unusedSup)
            };
        }
    },

    attr_join_adv: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attribute Join', icon: 'fa-link', color: '#27ae60', in: 2, out: 2,
        help: 'Join tabular por claves (left/inner).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Relacion (Input1 : Input2)</span>
                <input type="text" df-map class="node-control" placeholder="id:ID_REF, tipo:TYPE">
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex; gap:4px; margin-top:2px">
                    <select class="node-control" df-join-left style="flex:1"></select>
                    <select class="node-control" df-join-right style="flex:1"></select>
                    <button class="btn" style="padding:4px 8px" data-schema-action="join-add" title="Agregar par a la relacion">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tipo Join</span>
                <select df-join class="node-control">
                    <option value="left">Left</option>
                    <option value="inner">Inner</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo</span>
                <input type="text" df-prefix class="node-control" value="j_">
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Join | Out 2: Sin Match</div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const joinType = resolveParamText(dom.querySelector('[df-join]').value) || 'left';
            const prefix = resolveParamText(dom.querySelector('[df-prefix]').value) || 'j_';
            const left = inputs[0].features || [];
            const right = inputs[1].features || [];
            const joinPairs = mapStr.split(',').map(p => p.split(':').map(s => s.trim())).filter(p => p[0] && p[1]);
            if (joinPairs.length === 0) throw new Error("Define campos de union");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_join',
                        left: { type: 'FeatureCollection', features: left },
                        right: { type: 'FeatureCollection', features: right },
                        joinPairs,
                        joinType,
                        prefix
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Attribute Join fallÃ³, fallback local:", e);
                }
            }
            const getKey = (props, fields) => fields.map(f => String(props[f] || 'null')).join('|_|');
            const rightKeys = joinPairs.map(p => p[1]);
            const leftKeys = joinPairs.map(p => p[0]);
            const index = new Map();
            right.forEach(f => {
                const key = getKey(f.properties || {}, rightKeys);
                if (!index.has(key)) index.set(key, f);
            });
            const joined = [];
            const unmatched = [];
            left.forEach(f => {
                if (!f.properties) f.properties = {};
                const key = getKey(f.properties || {}, leftKeys);
                const match = index.get(key);
                if (match) {
                    const nf = JETLClone(f);
                    Object.keys(match.properties || {}).forEach(k => nf.properties[prefix + k] = match.properties[k]);
                    joined.push(nf);
                } else {
                    if (joinType === 'left') joined.push(f);
                    unmatched.push(f);
                }
            });
            return { output_1: turf.featureCollection(joined), output_2: turf.featureCollection(unmatched) };
        }
    },
    attr_calc_pro: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Field Calculator Pro', icon: 'fa-keyboard', color: '#27ae60', in: 1, out: 2,
        help: 'Expresiones JS con helpers: props, feat, Math, turf.',
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-keyboard"></i>
                <div><strong data-calc-summary>new_field</strong><small>Configura una expresión por elemento</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="calc-open-editor">
                <i class="fas fa-pen"></i> Abrir editor
            </button>
            <div class="node-editor-storage" aria-hidden="true">
                <input type="text" df-name class="node-control" value="new_field" tabindex="-1">
                <textarea df-expr class="node-control" tabindex="-1"></textarea>
                <select df-on-error class="node-control" tabindex="-1">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
                <select df-source-field class="node-control" tabindex="-1"></select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-name]').value);
            const exprRaw = resolveParamText(dom.querySelector('[df-expr]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            if (!field) throw new Error("Campo destino vacio");
            if (!exprRaw) throw new Error("Expresion vacia");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_calc_pro',
                        features: inputs[0],
                        field,
                        exprRaw,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Field Calculator Pro fallo, fallback local:", e);
                }
            }
            const fn = compileSafeExpression(exprRaw, ['props', 'feat']);
            const passed = [];
            const rejected = [];
            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    f.properties[field] = fn(
                        f.properties || {},
                        f,
                        Math,
                        turf,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined
                    );
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[field] = null;
                        rf.properties._calc_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[field] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },
    attr_area: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Area Calc', icon: 'fa-ruler-combined', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre del Campo</span>
                <input type="text" df-field class="node-control" value="_area" placeholder="_area">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Unidades</span>
                <select df-unit class="node-control">
                    <option value="1">Metros cuadrados (mÂ²)</option>
                    <option value="0.000001">KilÃ³metros cuadrados (kmÂ²)</option>
                    <option value="0.0001">HectÃ¡reas (ha)</option>
                    <option value="10.7639">Pies cuadrados (ftÂ²)</option>
                </select>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value) || '_area';
            const multiplier = parseFloat(dom.querySelector('[df-unit]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const passed = [];
            const rejected = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_area',
                        features: inputs[0],
                        fieldName,
                        multiplier,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Area Calc fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    // Turf siempre calcula en mÂ²
                    const areaSqM = turf.area(f);
                    // Aplicamos el factor de conversiÃ³n
                    f.properties[fieldName] = parseFloat((areaSqM * multiplier).toFixed(4));
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[fieldName] = null;
                        rf.properties._area_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[fieldName] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_length: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Length Calc', icon: 'fa-ruler-horizontal', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre del Campo</span>
                <input type="text" df-field class="node-control" value="_length" placeholder="_length">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Unidades</span>
                <select df-unit class="node-control">
                    <option value="kilometers">KilÃ³metros (km)</option>
                    <option value="meters">Metros (m)</option>
                    <option value="centimeters">CentÃ­metros (cm)</option>
                    <option value="miles">Millas</option>
                    <option value="feet">Pies</option>
                </select>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value) || '_length';
            const unit = resolveParamText(dom.querySelector('[df-unit]').value) || 'meters';
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const passed = [];
            const rejected = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_length',
                        features: inputs[0],
                        fieldName,
                        unit,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Length Calc fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    const gType = f && f.geometry ? f.geometry.type : null;
                    if (gType !== 'LineString' && gType !== 'MultiLineString') {
                        throw new Error('Geometria no lineal para Length Calc');
                    }
                    let length;

                    if (unit === 'centimeters') {
                        // Turf no tiene 'centimeters' nativo en versiones antiguas, calculamos en metros * 100
                        length = turf.length(f, { units: 'meters' }) * 100;
                    } else {
                        // Para el resto usamos la conversiÃ³n nativa de Turf
                        length = turf.length(f, { units: unit });
                    }

                    f.properties[fieldName] = parseFloat(length.toFixed(4));
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[fieldName] = null;
                        rf.properties._length_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[fieldName] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_matcher: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Matcher', icon: 'fa-clone', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:6px">
                <span style="font-size:0.7em;color:#aaa">Criterio de Coincidencia</span>
                <div style="display:flex; flex-direction:column; gap:4px; margin-top:2px">
                    <label style="font-size:0.8em; display:flex; align-items:center; color:#ddd">
                        <input type="checkbox" df-geo checked style="margin-right:6px"> GeometrÃ­a
                    </label>
                    <label style="font-size:0.8em; display:flex; align-items:center; color:#ddd">
                        <input type="checkbox" df-attr style="margin-right:6px"> Atributos
                    </label>
                </div>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Campos (Si Atributos = ON)</span>
                <input type="text" df-fields class="node-control" placeholder="Ej: id, type">
                <div df-matcher-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-top:4px"></div>
                <div style="font-size:0.6em;color:#666;font-style:italic">VacÃ­o = Todos los campos.</div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:4px">Out 1: Ãšnicos | Out 2: Duplicados</div>`,
        run: async (id, inputs, dom) => {
            const matchGeo = dom.querySelector('[df-geo]').checked;
            const matchAttr = dom.querySelector('[df-attr]').checked;
            const rawFields = resolveParamText(dom.querySelector('[df-fields]').value);

            const uniques = [];
            const duplicates = [];
            const seenHashes = new Set();

            const targetFields = rawFields ? rawFields.split(',').map(s => s.trim()).filter(s => s !== '') : null;

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_matcher',
                        features: { type: 'FeatureCollection', features: inputs[0].features || [] },
                        matchGeo,
                        matchAttr,
                        targetFields
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Matcher fallÃƒÂ³, fallback local:", e);
                }
            }

            inputs[0].features.forEach(f => {
                let hashParts = [];

                // 1. Huella de GeometrÃ­a
                if (matchGeo) {
                    // Usamos stringify de las coordenadas para comparaciÃ³n exacta
                    hashParts.push(JSON.stringify(f.geometry));
                }

                // 2. Huella de Atributos
                if (matchAttr) {
                    if (targetFields && targetFields.length > 0) {
                        // Concatenar solo campos especÃ­ficos
                        const attrVal = targetFields.map(k => {
                            const val = f.properties[k];
                            return val !== undefined && val !== null ? val : 'null';
                        }).join('_|_');
                        hashParts.push(attrVal);
                    } else {
                        // Concatenar todo el objeto de propiedades (ordenado para consistencia)
                        // Para evitar problemas de orden de claves, ordenamos keys
                        const sortedProps = {};
                        Object.keys(f.properties || {}).sort().forEach(key => {
                            sortedProps[key] = f.properties[key];
                        });
                        hashParts.push(JSON.stringify(sortedProps));
                    }
                }

                // Si no se selecciona nada, asumimos que no hay criterio => todos son Ãºnicos (o error)
                if (hashParts.length === 0) {
                    uniques.push(f);
                    return;
                }

                const finalHash = hashParts.join('###');

                if (seenHashes.has(finalHash)) {
                    duplicates.push(f);
                } else {
                    seenHashes.add(finalHash);
                    uniques.push(f);
                }
            });

            return {
                output_1: turf.featureCollection(uniques),
                output_2: turf.featureCollection(duplicates)
            };
        }
    },
    attr_test: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Tester', icon: 'fa-balance-scale', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div df-test-rows style="display:flex; flex-direction:column; gap:6px;"></div>
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="node-btn-mini" type="button" data-schema-action="test-add-row" title="Agregar condicion">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div style="font-size:0.62em;color:#777;margin-top:4px;">Operadores: =, !=, >, >=, <, <=, like, starts, ends, in</div>
        `,
        run: async (id, i, d) => {
            const rows = Array.from(d.querySelectorAll('[data-test-row]'));
            let conditions = rows
                .map((row, idx) => {
                    const field = resolveParamText(row.querySelector('[df-test-field]')?.value || '');
                    const op = row.querySelector('[df-test-op]')?.value || '==';
                    const value = resolveParamText(row.querySelector('[df-test-val]')?.value || '');
                    const join = idx === 0 ? 'AND' : (row.querySelector('[df-test-join]')?.value || 'AND');
                    if (!field) return null;
                    return { field, op, value, join };
                })
                .filter(Boolean);
            if (!conditions.length) {
                const legacyField = resolveParamText(d.querySelector('[df-l]')?.value || '');
                const legacyOp = d.querySelector('[df-op]')?.value || '==';
                const legacyVal = resolveParamText(d.querySelector('[df-r]')?.value || '');
                if (legacyField) conditions = [{ field: legacyField, op: legacyOp, value: legacyVal, join: 'AND' }];
            }
            if (!conditions.length) throw new Error("Define al menos una condicion");

            const p = [];
            const f = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_test',
                        features: i[0],
                        conditions
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Tester fallo, fallback local:", e);
                }
            }

            i[0].features.forEach((feat) => {
                const props = (feat && feat.properties) || {};
                const pass = evalTestGroup(props, conditions);
                if (pass) p.push(feat);
                else f.push(feat);
            });
            return { output_1: turf.featureCollection(p), output_2: turf.featureCollection(f) };
        }
    }
});








/* ---- js/nodes/raster.js ---- */
// Cat: raster
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    sp_point_sampling: {
        cat: '4. RASTER', label: 'Multi-Band Sampler', icon: 'fa-crosshairs', color: '#8e44ad',
        in: 2,
        out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo Salida</span>
                <input type="text" df-prefix class="node-control" value="val" placeholder="Ej: val">
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Modo Extraccion</span>
                <select df-mode class="node-control">
                    <option value="all">Todas las Bandas</option>
                    <option value="select">Bandas Especificas</option>
                </select>
                <input type="text" df-bands class="node-control" style="display:none;margin-top:2px" placeholder="Indices (ej: 0, 2, 4)" title="Indices separados por coma">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Grid Step (Si no hay puntos)</span>
                <input type="number" df-step class="node-control" value="1" min="1">
            </div>`,
        run: async (id, inputs, dom) => {
            const throwIfCancelled = () => {
                if (typeof window.JETLThrowIfCancelled === 'function') return window.JETLThrowIfCancelled();
                if (window.isEngineCancelled) {
                    const err = new Error('Operacion cancelada por el usuario');
                    err.name = 'CancelledError';
                    err.cancelled = true;
                    throw err;
                }
            };
            const nextTick = async () => {
                if (typeof window.JETLNextTick === 'function') return window.JETLNextTick();
                return new Promise(r => setTimeout(r, 0));
            };

            // 1. Deteccion inteligente de entradas
            let rasterInput = null;
            let pointsInput = null;

            inputs.forEach(inp => {
                if (inp && inp.features && inp.features.length > 0) {
                    if (inp.features[0].properties && inp.features[0].properties._raster_ref_id) {
                        rasterInput = inp;
                    } else {
                        pointsInput = inp;
                    }
                }
            });

            if (!rasterInput) throw new Error('No se detecto el GeoTIFF. Conecta el Reader.');

            // 2. Recuperacion del binario
            const refId = rasterInput.features[0].properties._raster_ref_id;
            const buffer = window._tiff_cache ? window._tiff_cache[refId] : null;
            if (!buffer) throw new Error('El archivo expiro. Recarga el Reader.');
            throwIfCancelled();

            // 3. Params UI
            const prefix = dom.querySelector('[df-prefix]').value || 'val';
            const step = parseInt(dom.querySelector('[df-step]').value) || 1;
            const mode = dom.querySelector('[df-mode]').value; // 'all' o 'select'
            const bandsStr = dom.querySelector('[df-bands]').value;

            // Parseamos bandas seleccionadas
            let selectedIndices = [];
            if (mode === 'select') {
                selectedIndices = bandsStr.split(',')
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n));
                if (selectedIndices.length === 0) throw new Error('Modo Seleccion: indica al menos un indice (ej: 0).');
            }

            if (window.log) window.log(`Procesando Raster (${mode === 'select' ? 'Bandas: ' + selectedIndices.join(',') : 'Todas'})...`);

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'raster_sample',
                        rasterBuffer: buffer,
                        pointsFC: pointsInput || null,
                        prefix,
                        mode,
                        selectedIndices,
                        step
                    }, 180000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker raster_sample fallo, fallback local:', e);
                }
            }

            // 4. Parseo geoblaze
            const georaster = await geoblaze.parse(buffer);
            let outputFeatures = [];
            let hits = 0;

            // Helper de asignacion
            const assignBand = (feat, val, bandIdx) => {
                if (val !== null && !isNaN(val)) {
                    feat.properties[`${prefix}_b${bandIdx}`] = parseFloat(Number(val).toFixed(4));
                } else {
                    feat.properties[`${prefix}_b${bandIdx}`] = null;
                }
            };

            // Caso A: muestreo de puntos
            if (pointsInput) {
                const features = pointsInput.features;
                if (window.log) window.log(`Muestreando ${features.length} puntos...`);

                const BATCH = 64;
                outputFeatures = [];
                for (let i = 0; i < features.length; i += BATCH) {
                    throwIfCancelled();
                    const slice = features.slice(i, i + BATCH);
                    const rows = await Promise.all(slice.map(async (f) => {
                        const newF = JETLClone(f);
                        if (turf.getType(newF) === 'Point') {
                            try {
                                const coords = turf.getCoords(newF);
                                // identify devuelve Number (1 banda) o Array (N bandas)
                                let raw = await geoblaze.identify(georaster, coords);
                                if (!Array.isArray(raw)) raw = [raw];

                                if (mode === 'all') {
                                    raw.forEach((val, idx) => assignBand(newF, val, idx));
                                } else {
                                    selectedIndices.forEach(idx => {
                                        if (idx < raw.length) assignBand(newF, raw[idx], idx);
                                    });
                                }
                                hits++;
                            } catch (e) {
                                // fuera de rango
                            }
                        }
                        return newF;
                    }));
                    outputFeatures.push(...rows);
                    if ((i / BATCH) % 8 === 0) await nextTick();
                }
            }
            // Caso B: generacion de grid
            else {
                const { width, height, pixelWidth, pixelHeight, xmin, ymax } = georaster;

                const estimatedPoints = (width / step) * (height / step);
                if (estimatedPoints > 150000) console.warn(`Generando ~${Math.round(estimatedPoints)} puntos.`);

                for (let y = 0; y < height; y += step) {
                    throwIfCancelled();
                    for (let x = 0; x < width; x += step) {
                        const centX = xmin + (x * pixelWidth) + (pixelWidth / 2);
                        const centY = ymax - (y * pixelHeight) - (pixelHeight / 2);
                        const newF = turf.point([centX, centY]);

                        // Leemos solo lo necesario de la matriz values
                        if (mode === 'all') {
                            georaster.values.forEach((bandGrid, bIdx) => {
                                const val = bandGrid[y][x];
                                assignBand(newF, val, bIdx);
                            });
                        } else {
                            selectedIndices.forEach(bIdx => {
                                if (georaster.values[bIdx]) {
                                    const val = georaster.values[bIdx][y][x];
                                    assignBand(newF, val, bIdx);
                                }
                            });
                        }

                        outputFeatures.push(newF);
                        hits++;
                    }
                    if (((y / step) % 8) === 0) await nextTick();
                }
            }

            if (window.log) window.log(`Finalizado. ${hits} registros.`);
            return turf.featureCollection(outputFeatures);
        }
    },

    sp_zonal_stats: {
        cat: '4. RASTER', label: 'Zonal Stats', icon: 'fa-chart-area', color: '#8e44ad',
        in: 2, out: 1,
        help: 'Estadisticas zonales (poligonos + GeoTIFF).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo</span>
                <input type="text" df-prefix class="node-control" value="zs">
            </div>
            <div style="font-size:0.6em;color:#888">Calcula min/max/mean/sum por poligono.</div>`,
        run: async (id, inputs, dom) => {
            const throwIfCancelled = () => {
                if (typeof window.JETLThrowIfCancelled === 'function') return window.JETLThrowIfCancelled();
                if (window.isEngineCancelled) {
                    const err = new Error('Operacion cancelada por el usuario');
                    err.name = 'CancelledError';
                    err.cancelled = true;
                    throw err;
                }
            };
            const nextTick = async () => {
                if (typeof window.JETLNextTick === 'function') return window.JETLNextTick();
                return new Promise(r => setTimeout(r, 0));
            };

            let rasterInput = null;
            let polyInput = null;
            inputs.forEach(inp => {
                if (inp && inp.features && inp.features.length > 0) {
                    if (inp.features[0].properties && inp.features[0].properties._raster_ref_id) rasterInput = inp;
                    else polyInput = inp;
                }
            });
            if (!rasterInput) throw new Error('No se detecto el GeoTIFF.');
            if (!polyInput) throw new Error('Conecta poligonos.');

            const refId = rasterInput.features[0].properties._raster_ref_id;
            const buffer = window._tiff_cache ? window._tiff_cache[refId] : null;
            if (!buffer) throw new Error('El archivo expiro. Recarga el Reader.');
            throwIfCancelled();

            const prefix = dom.querySelector('[df-prefix]').value || 'zs';

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'raster_zonal_stats',
                        rasterBuffer: buffer,
                        polygonsFC: polyInput,
                        prefix
                    }, 180000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker raster_zonal_stats fallo, fallback local:', e);
                }
            }

            const georaster = await geoblaze.parse(buffer);
            const out = [];

            for (let i = 0; i < polyInput.features.length; i++) {
                throwIfCancelled();
                const f = polyInput.features[i];
                const nf = JETLClone(f);
                try {
                    const stats = await geoblaze.zonalStats(georaster, f, ['min', 'max', 'mean', 'sum']);
                    if (Array.isArray(stats) && stats[0]) {
                        Object.keys(stats[0]).forEach(k => nf.properties[`${prefix}_${k}`] = stats[0][k]);
                    }
                } catch (e) {
                    nf.properties[`${prefix}_err`] = true;
                }
                out.push(nf);
                if ((i % 20) === 0) await nextTick();
            }

            return turf.featureCollection(out);
        }
    }
});


/* ---- js/nodes/writers.js ---- */
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


/* ---- js/tools.js ---- */
// =================================================================
// 🛠️ JETL TOOL REGISTRY - MODULED ROOT
// =================================================================
if (typeof window !== 'undefined') {
    window.TOOL_REGISTRY = window.TOOL_REGISTRY || {};
} else {
    global.TOOL_REGISTRY = global.TOOL_REGISTRY || {};
}
// Los nodos están definidos dentro de js/nodes/

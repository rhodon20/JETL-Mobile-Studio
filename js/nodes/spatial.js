// Cat: spatial
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};

function spatialCloneCompat(feature) {
    if (typeof window !== 'undefined' && typeof window.JETLClone === 'function') return window.JETLClone(feature);
    return JSON.parse(JSON.stringify(feature));
}

function spatialOverlayPropertiesCompat(source, overlay, prefix, index, count) {
    const properties = { ...(source || {}) };
    Object.entries(overlay || {}).forEach(([key, value]) => { properties[`${prefix}${key}`] = value; });
    properties._overlayer_match_index = index;
    properties._overlayer_match_count = count;
    return properties;
}

function spatialPointKeyCompat(feature) {
    const coordinates = feature?.geometry?.coordinates;
    return Array.isArray(coordinates) && coordinates.length >= 2 ? `${Number(coordinates[0]).toFixed(8)},${Number(coordinates[1]).toFixed(8)}` : '';
}

function spatialOverlayerResultCompat(matched, unmatched) {
    return { output_1: turf.featureCollection(matched), output_2: turf.featureCollection(unmatched) };
}

function spatialRequireOverlayInputsCompat(source, overlay) {
    if (!source?.features?.length) throw new Error('Input 1 vacío');
    if (!overlay?.features?.length) throw new Error('Input 2 vacío');
}

function spatialPointPointOverlayerCompat(source, overlay, prefix) {
    spatialRequireOverlayInputsCompat(source, overlay);
    const index = new Map();
    (overlay.features || []).forEach((feature) => {
        const key = spatialPointKeyCompat(feature);
        if (!key) return;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(feature);
    });
    const matched = []; const unmatched = [];
    (source.features || []).forEach((feature) => {
        const hits = index.get(spatialPointKeyCompat(feature)) || [];
        if (!hits.length) return unmatched.push(feature);
        hits.forEach((hit, position) => {
            const output = spatialCloneCompat(feature);
            output.properties = spatialOverlayPropertiesCompat(feature.properties, hit.properties, prefix, position + 1, hits.length);
            matched.push(output);
        });
    });
    return spatialOverlayerResultCompat(matched, unmatched);
}

function spatialPointPredicateOverlayerCompat(source, overlay, prefix, predicate) {
    spatialRequireOverlayInputsCompat(source, overlay);
    const matched = []; const unmatched = [];
    (source.features || []).forEach((feature) => {
        const hits = (overlay.features || []).filter((candidate) => {
            try { return predicate(feature, candidate); } catch (error) { return false; }
        });
        if (!hits.length) return unmatched.push(feature);
        hits.forEach((hit, position) => {
            const output = spatialCloneCompat(feature);
            output.properties = spatialOverlayPropertiesCompat(feature.properties, hit.properties, prefix, position + 1, hits.length);
            matched.push(output);
        });
    });
    return spatialOverlayerResultCompat(matched, unmatched);
}

function spatialAreaAreaOverlayerCompat(source, overlay, prefix) {
    spatialRequireOverlayInputsCompat(source, overlay);
    const matched = []; const unmatched = [];
    (source.features || []).forEach((feature) => {
        const hits = [];
        (overlay.features || []).forEach((candidate) => {
            try { const intersection = turf.intersect(feature, candidate); if (intersection) hits.push({ candidate, intersection }); } catch (error) { /* non-overlapping */ }
        });
        if (!hits.length) return unmatched.push(feature);
        hits.forEach((hit, position) => {
            hit.intersection.properties = spatialOverlayPropertiesCompat(feature.properties, hit.candidate.properties, prefix, position + 1, hits.length);
            matched.push(hit.intersection);
        });
    });
    return spatialOverlayerResultCompat(matched, unmatched);
}

function spatialLineLineOverlayerCompat(source, overlay, prefix) {
    return spatialPointPredicateOverlayerCompat(source, overlay, prefix, (feature, candidate) => (
        turf.booleanIntersects(feature, candidate)
        || turf.booleanEqual?.(feature, candidate)
        || turf.booleanOverlap?.(feature, candidate)
        || turf.booleanWithin?.(feature, candidate)
        || turf.booleanContains?.(feature, candidate)
    ));
}

function spatialLineAreaOverlayerCompat(source, overlay, prefix) {
    spatialRequireOverlayInputsCompat(source, overlay);
    const matched = []; const unmatched = [];
    (source.features || []).forEach((feature) => {
        let segments = [spatialCloneCompat(feature)];
        (overlay.features || []).forEach((area) => {
            let boundary;
            try { boundary = turf.polygonToLine(area); } catch (error) { return; }
            const boundaries = boundary?.type === 'FeatureCollection' ? boundary.features : [boundary];
            boundaries.filter(Boolean).forEach((line) => {
                segments = segments.flatMap((segment) => {
                    try { const split = turf.lineSplit(segment, line); return split?.features?.length ? split.features : [segment]; }
                    catch (error) { return [segment]; }
                });
            });
        });
        segments.forEach((segment) => {
            let probe;
            try {
                const length = turf.length(segment, { units: 'kilometers' });
                probe = length > 0 ? turf.along(segment, length / 2, { units: 'kilometers' }) : turf.point(segment.geometry.coordinates[0]);
            } catch (error) { probe = turf.point(segment.geometry?.coordinates?.[0] || [0, 0]); }
            const hits = (overlay.features || []).filter((area) => { try { return turf.booleanPointInPolygon(probe, area); } catch (error) { return false; } });
            if (!hits.length) { segment.properties = { ...(feature.properties || {}) }; unmatched.push(segment); return; }
            hits.forEach((hit, position) => {
                const output = spatialCloneCompat(segment);
                output.properties = spatialOverlayPropertiesCompat(feature.properties, hit.properties, prefix, position + 1, hits.length);
                matched.push(output);
            });
        });
    });
    return spatialOverlayerResultCompat(matched, unmatched);
}

function spatialReadConfigCompat(dom, defaults) {
    try { return { ...defaults, ...JSON.parse(dom.querySelector('[df-geom-transform-config]')?.value || '{}') }; }
    catch (error) { return { ...defaults }; }
}

function spatialRelationCompat(requestor, supplier, mode) {
    try {
        if (mode === 'contains') return turf.booleanContains(requestor, supplier);
        if (mode === 'within') return turf.booleanWithin(requestor, supplier);
        if (mode === 'crosses') return turf.booleanCrosses(requestor, supplier);
        if (mode === 'touches') return turf.booleanTouches(requestor, supplier);
        if (mode === 'equal' || mode === 'equals') return turf.booleanEqual(requestor, supplier);
        if (mode === 'disjoint') return turf.booleanDisjoint(requestor, supplier);
        if (mode === 'overlap' || mode === 'overlaps') return turf.booleanOverlap(requestor, supplier);
        return turf.booleanIntersects(requestor, supplier);
    } catch (error) { return false; }
}

function spatialFieldsCompat(raw) {
    if (Array.isArray(raw)) return raw.map(String).map((field) => field.trim()).filter(Boolean);
    try { const parsed = JSON.parse(String(raw || '[]')); if (Array.isArray(parsed)) return parsed.map(String).map((field) => field.trim()).filter(Boolean); }
    catch (error) { /* comma-separated fallback */ }
    return String(raw || '').split(',').map((field) => field.trim()).filter(Boolean);
}

function spatialSupplierIdCompat(feature, fallback) {
    for (const key of ['OBJECTID', 'FID', 'fid', 'id', 'ID']) {
        const value = feature?.properties?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return feature?.id ?? fallback;
}

function spatialMergeSupplierCompat(properties, supplier, config, index) {
    if (!config.merge_attrs) return;
    Object.entries(supplier?.properties || {}).forEach(([key, value]) => {
        if (['OBJECTID', 'FID', 'fid', 'id', 'ID'].includes(key)) return;
        if (config.merge_mode === 'merge') {
            if (properties[key] === undefined || properties[key] === null || properties[key] === '') properties[key] = value;
            else properties[`${key}_${index + 1}`] = value;
        } else properties[`${config.prefix || 'supplier_'}${key}`] = value;
    });
}

function spatialRelatorCompat(source, suppliers, config) {
    const countAttr = String(config.count_attr || 'related_suppliers').trim() || 'related_suppliers';
    const listName = String(config.list_name || '_relations').trim() || '_relations';
    const groupFields = spatialFieldsCompat(config.group_by);
    const output = (source.features || []).map((requestor) => {
        const item = spatialCloneCompat(requestor);
        const requestorProperties = item.properties || {};
        const matches = (suppliers.features || []).map((supplier, index) => ({ supplier, index })).filter(({ supplier }) => (
            groupFields.every((field) => Object.prototype.hasOwnProperty.call(requestorProperties, field) && Object.prototype.hasOwnProperty.call(supplier.properties || {}, field) && String(requestorProperties[field]) === String(supplier.properties[field]))
            && spatialRelationCompat(requestor, supplier, config.mode || 'intersects')
        ));
        requestorProperties[countAttr] = matches.length;
        requestorProperties.Join_Count = matches.length;
        if (matches.length) {
            const selected = config.supplier_selection === 'last' ? matches[matches.length - 1] : matches[0];
            requestorProperties.TARGET_FID = spatialSupplierIdCompat(selected.supplier, selected.index);
            spatialMergeSupplierCompat(requestorProperties, selected.supplier, config, selected.index);
        }
        if (config.generate_list) requestorProperties[listName] = matches.map(({ supplier, index }) => {
            const entry = { supplier_index: index, supplier_id: spatialSupplierIdCompat(supplier, index), relation: config.mode || 'intersects' };
            if (config.list_attrs !== false) entry.attributes = { ...(supplier.properties || {}) };
            return entry;
        });
        item.properties = requestorProperties;
        return item;
    });
    return { output_1: turf.featureCollection(output) };
}

Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    sp_anchored_snapper: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Anchored Snapper', icon: 'fa-anchor', color: '#8e44ad', in: 2, out: 4,
        help: 'Desplaza candidatos del input 2 hacia anchors del input 1.',
        tpl: () => `<div class="node-editor-summary"><i class="fas fa-anchor"></i><div><strong data-geom-transform-summary>Segment · 10 m</strong><small>4 salidas Desktop</small></div></div><button type="button" class="btn node-editor-open" data-schema-action="geom-transform-open-editor"><i class="fas fa-pen"></i> Configurar</button><div class="node-editor-storage"><textarea df-geom-transform-config>{"snapping_type":"segment","distance":10,"unit":"meters","group_by":[]}</textarea></div>`,
        run: async (id, inputs, dom) => {
            const config = spatialReadConfigCompat(dom, { snapping_type: 'segment', distance: 10, unit: 'meters', group_by: [] });
            const distanceLimit = Number(config.distance);
            if (!Number.isFinite(distanceLimit) || distanceLimit < 0) throw new Error('Distancia inválida');
            const anchors = inputs[0]; const candidates = inputs[1];
            if (!anchors?.features) throw new Error('Input 1 vacío');
            if (!candidates?.features) throw new Error('Input 2 vacío');
            const anchorPoints = turf.explode(anchors);
            const snapped = []; const untouched = [];
            const thresholdKm = config.unit === 'meters' ? distanceLimit / 1000 : config.unit === 'miles' ? distanceLimit * 1.60934 : distanceLimit;
            (candidates.features || []).forEach((feature) => {
                if (!feature?.geometry || !anchorPoints.features?.length) { untouched.push(feature); return; }
                const output = spatialCloneCompat(feature); let changed = false;
                turf.coordEach(output, (coordinate) => {
                    const current = turf.point(coordinate);
                    const nearest = turf.nearestPoint(current, anchorPoints);
                    if (nearest && turf.distance(current, nearest, { units: 'kilometers' }) <= thresholdKm) {
                        const [x, y] = nearest.geometry.coordinates;
                        if (coordinate[0] !== x || coordinate[1] !== y) { coordinate[0] = x; coordinate[1] = y; changed = true; }
                    }
                });
                if (changed) snapped.push(output); else untouched.push(feature);
            });
            return { output_1: turf.featureCollection(snapped), output_2: turf.featureCollection(untouched), output_3: turf.featureCollection([]), output_4: turf.featureCollection((anchors.features || []).slice()) };
        }
    },

    sp_neighbor_finder: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Neighbor Finder', icon: 'fa-crosshairs', color: '#8e44ad', in: 2, out: 2,
        help: 'Busca el candidato más próximo para cada feature fuente.',
        tpl: () => `<div class="node-editor-summary"><i class="fas fa-crosshairs"></i><div><strong data-geom-transform-summary>Sin límite</strong><small>Vecino más próximo</small></div></div><button type="button" class="btn node-editor-open" data-schema-action="geom-transform-open-editor"><i class="fas fa-pen"></i> Configurar</button><div class="node-editor-storage"><textarea df-geom-transform-config>{"max_distance":"","distance_factor":"","merge_attrs":false}</textarea></div>`,
        run: async (id, inputs, dom) => {
            const config = spatialReadConfigCompat(dom, { max_distance: '', distance_factor: '', merge_attrs: false });
            const source = inputs[0]; const candidates = inputs[1];
            if (!source?.features?.length) throw new Error('Input 1 vacío');
            if (!candidates?.features?.length) throw new Error('Input 2 vacío');
            const maxDistance = String(config.max_distance ?? '').trim() ? Number(config.max_distance) : null;
            const matched = []; const unmatched = [];
            (source.features || []).forEach((feature) => {
                let best = null; let bestDistance = Infinity;
                (candidates.features || []).forEach((candidate) => {
                    try {
                        const distance = turf.distance(turf.centroid(feature), turf.centroid(candidate), { units: 'meters' });
                        if (distance < bestDistance) { best = candidate; bestDistance = distance; }
                    } catch (error) { /* invalid candidate */ }
                });
                if (!best || (Number.isFinite(maxDistance) && bestDistance > maxDistance)) { unmatched.push(feature); return; }
                const output = spatialCloneCompat(feature); output.properties = { ...(output.properties || {}), _distance: bestDistance };
                if (config.merge_attrs) Object.entries(best.properties || {}).forEach(([key, value]) => { if (!(key in output.properties)) output.properties[key] = value; });
                matched.push(output);
            });
            return spatialOverlayerResultCompat(matched, unmatched);
        }
    },

    sp_spatial_relator: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Spatial Relator', icon: 'fa-project-diagram', color: '#8e44ad', in: 2, out: 1,
        help: 'Cuenta y describe Suppliers relacionados para cada Requestor.',
        tpl: () => `<div class="node-editor-summary"><i class="fas fa-project-diagram"></i><div><strong data-geom-transform-summary>Intersects · related_suppliers</strong><small>Requestors + Suppliers</small></div></div><button type="button" class="btn node-editor-open" data-schema-action="geom-transform-open-editor"><i class="fas fa-pen"></i> Configurar</button><div class="node-editor-storage"><textarea df-geom-transform-config>{"mode":"intersects","count_attr":"related_suppliers","merge_attrs":false,"merge_mode":"prefix","supplier_selection":"first","prefix":"supplier_","generate_list":false,"list_name":"_relations","list_attrs":true,"group_by":[]}</textarea></div>`,
        run: async (id, inputs, dom) => {
            const config = spatialReadConfigCompat(dom, { mode: 'intersects', count_attr: 'related_suppliers', merge_attrs: false, merge_mode: 'prefix', supplier_selection: 'first', prefix: 'supplier_', generate_list: false, list_name: '_relations', list_attrs: true, group_by: [] });
            const source = inputs[0]; const suppliers = inputs[1];
            if (source?.features?.length === 0) return { output_1: turf.featureCollection([]) };
            if (!source?.features) throw new Error('Input 1 vacío');
            if (!suppliers?.features) throw new Error('Input 2 vacío');
            if (source.features.length + suppliers.features.length >= 15000) {
                if (typeof window !== 'undefined' && typeof window.JETLBackend?.spatial === 'function') {
                    const result = await window.JETLBackend.spatial('spatial_relator', { source, join: suppliers }, config);
                    if (result) return result;
                }
                throw new Error('Spatial Relator grande requiere backend Python para no bloquear la interfaz');
            }
            return spatialRelatorCompat(source, suppliers, config);
        }
    },

    sp_point_point_overlayer: {
        cat: '2.2 VECTOR - OVERLAYERS', label: 'PointOnPoint Overlayer', icon: 'fa-bullseye', color: '#8e44ad', in: 2, out: 2,
        help: 'Replica puntos coincidentes y añade atributos del overlay.',
        tpl: () => `<label><span style="font-size:0.7em;color:#aaa">Prefijo overlay</span><input type="text" df-prefix class="node-control" value="pt_"></label><div style="font-size:0.6em;color:#888">Out 1 matched · Out 2 unmatched</div>`,
        run: async (id, inputs, dom) => spatialPointPointOverlayerCompat(inputs[0] || turf.featureCollection([]), inputs[1] || turf.featureCollection([]), resolveParamText(dom.querySelector('[df-prefix]')?.value || 'pt_'))
    },

    sp_point_line_overlayer: {
        cat: '2.2 VECTOR - OVERLAYERS', label: 'PointOnLine Overlayer', icon: 'fa-map-pin', color: '#8e44ad', in: 2, out: 2,
        help: 'Replica puntos situados sobre líneas y añade atributos del overlay.',
        tpl: () => `<label><span style="font-size:0.7em;color:#aaa">Prefijo línea</span><input type="text" df-prefix class="node-control" value="line_"></label><div style="font-size:0.6em;color:#888">Out 1 matched · Out 2 unmatched</div>`,
        run: async (id, inputs, dom) => spatialPointPredicateOverlayerCompat(inputs[0] || turf.featureCollection([]), inputs[1] || turf.featureCollection([]), resolveParamText(dom.querySelector('[df-prefix]')?.value || 'line_'), (point, line) => turf.booleanPointOnLine(point, line))
    },

    sp_point_area_overlayer: {
        cat: '2.2 VECTOR - OVERLAYERS', label: 'PointOnArea Overlayer', icon: 'fa-map-pin', color: '#8e44ad', in: 2, out: 2,
        help: 'Replica puntos contenidos en áreas y añade atributos del overlay.',
        tpl: () => `<label><span style="font-size:0.7em;color:#aaa">Prefijo área</span><input type="text" df-prefix class="node-control" value="area_"></label><div style="font-size:0.6em;color:#888">Out 1 matched · Out 2 unmatched</div>`,
        run: async (id, inputs, dom) => spatialPointPredicateOverlayerCompat(inputs[0] || turf.featureCollection([]), inputs[1] || turf.featureCollection([]), resolveParamText(dom.querySelector('[df-prefix]')?.value || 'area_'), (point, area) => turf.booleanPointInPolygon(point, area))
    },

    sp_area_area_overlayer: {
        cat: '2.2 VECTOR - OVERLAYERS', label: 'AreaOnArea Overlayer', icon: 'fa-object-group', color: '#8e44ad', in: 2, out: 2,
        help: 'Genera una geometría por cada intersección área-área.',
        tpl: () => `<label><span style="font-size:0.7em;color:#aaa">Prefijo área</span><input type="text" df-prefix class="node-control" value="area_"></label><div style="font-size:0.6em;color:#888">Out 1 matched · Out 2 unmatched</div>`,
        run: async (id, inputs, dom) => spatialAreaAreaOverlayerCompat(inputs[0] || turf.featureCollection([]), inputs[1] || turf.featureCollection([]), resolveParamText(dom.querySelector('[df-prefix]')?.value || 'area_'))
    },

    sp_line_area_overlayer: {
        cat: '2.2 VECTOR - OVERLAYERS', label: 'LineOnArea Overlayer', icon: 'fa-grip-lines', color: '#8e44ad', in: 2, out: 2,
        help: 'Divide líneas y separa tramos interiores y exteriores.',
        tpl: () => `<label><span style="font-size:0.7em;color:#aaa">Prefijo área</span><input type="text" df-prefix class="node-control" value="area_"></label><div style="font-size:0.6em;color:#888">Out 1 inside · Out 2 outside</div>`,
        run: async (id, inputs, dom) => spatialLineAreaOverlayerCompat(inputs[0] || turf.featureCollection([]), inputs[1] || turf.featureCollection([]), resolveParamText(dom.querySelector('[df-prefix]')?.value || 'area_'))
    },

    sp_line_line_overlayer: {
        cat: '2.2 VECTOR - OVERLAYERS', label: 'LineOnLine Overlayer', icon: 'fa-grip-lines', color: '#8e44ad', in: 2, out: 2,
        help: 'Replica líneas fuente por cada línea overlay relacionada.',
        tpl: () => `<label><span style="font-size:0.7em;color:#aaa">Prefijo línea</span><input type="text" df-prefix class="node-control" value="line_"></label><div style="font-size:0.6em;color:#888">Out 1 matched · Out 2 unmatched</div>`,
        run: async (id, inputs, dom) => spatialLineLineOverlayerCompat(inputs[0] || turf.featureCollection([]), inputs[1] || turf.featureCollection([]), resolveParamText(dom.querySelector('[df-prefix]')?.value || 'line_'))
    },

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
        cat: '2.2 VECTOR - SPATIAL', label: 'Snapper', icon: 'fa-magnet', color: '#8e44ad', in: 2, out: 3,
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
                Out 1: Snapped | Out 2: Untouched | Out 3: Collapsed
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
                    if (wres && wres.status === 'ok') {
                        const data = wres.data;
                        if (data?.output_1) return data;
                        if (data?.type === 'FeatureCollection') {
                            return {
                                output_1: data,
                                output_2: turf.featureCollection([]),
                                output_3: turf.featureCollection([])
                            };
                        }
                    }

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

            return {
                output_1: sourceClone,
                output_2: turf.featureCollection([]),
                output_3: turf.featureCollection([])
            };
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
        cat: '2.2 VECTOR - SPATIAL', label: 'Clipper (Robust)', icon: 'fa-crop', color: '#8e44ad', in: 2, out: 2,
        tpl: () => `<div>Out 1: Inside | Out 2: Outside</div>`,
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
                        const workerResult = normalizeResult(wres.data || wres.result || wres);
                        if (workerResult?.output_1 && workerResult?.output_2) return workerResult;
                    }
                }
            } catch (e) {
                if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                console.log("Worker clip fallback");
            }

            // Fallback Main Thread
            const inside = [];
            const outside = [];
            for (let idx = 0; idx < features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 50 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f = features[idx];
                try {
                    if (!turf.booleanIntersects(f, mask)) {
                        outside.push(f);
                        continue;
                    }
                    const clipped = turf.intersect(f, mask);
                    if (clipped) { clipped.properties = f.properties; inside.push(clipped); }
                    const remainder = turf.difference(f, mask);
                    if (remainder) { remainder.properties = f.properties; outside.push(remainder); }
                } catch (e) {
                    outside.push(f);
                }
            }
            return {
                output_1: turf.featureCollection(inside),
                output_2: turf.featureCollection(outside)
            };
        }
    }
});





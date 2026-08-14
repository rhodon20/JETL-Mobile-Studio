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

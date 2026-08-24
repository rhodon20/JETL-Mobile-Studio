// Cat: utils
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    util_filter_geo: { cat: '3. UTILS', label: 'Geometry Filter', icon: 'fa-shapes', color: '#7f8c8d', in: 1, out: 3, tpl: () => `<div style="font-size:0.6em">1:Poly 2:Line 3:Pt</div>`, run: (id, i) => { const p = [], l = [], pt = []; i[0].features.forEach(f => { const t = turf.getType(f).toLowerCase(); if (t.includes('poly')) p.push(f); else if (t.includes('line')) l.push(f); else pt.push(f) }); return { output_1: turf.featureCollection(p), output_2: turf.featureCollection(l), output_3: turf.featureCollection(pt) } } },

    util_junction: {
        cat: '3. UTILS', label: 'Junction', icon: 'fa-circle', color: '#7f8c8d',
        in: 5, // Múltiples entradas para permitir la fusión
        out: 1,
        tpl: () => ``, // Se mantiene vacío para conservar el estilo minimalista
        run: (id, inputs) => {
            const allFeatures = [];

            // Recorremos todas las entradas conectadas
            inputs.forEach(layer => {
                if (layer && layer.features) {
                    allFeatures.push(...layer.features);
                }
            });

            return turf.featureCollection(allFeatures);
        }
    },

    util_tee: {
        cat: '3. UTILS', label: 'Junction Splitter', icon: 'fa-code-branch', color: '#9b59b6', in: 1, out: 4,
        help: 'Clona una rama en cuatro salidas independientes.',
        tpl: () => `<div style="display:grid;gap:4px;align-items:center;justify-items:center;min-height:26px"><div class="junction-point"></div><div style="font-size:0.68em;color:#8bc">Una entrada · cuatro salidas</div></div>`,
        run: (id, inputs) => {
            const source = inputs?.[0] || turf.featureCollection([]);
            const cloneCollection = () => turf.featureCollection((source.features || []).map((feature) => {
                if (typeof window !== 'undefined' && typeof window.JETLClone === 'function') return window.JETLClone(feature);
                return JSON.parse(JSON.stringify(feature));
            }));
            return { output_1: cloneCollection(), output_2: cloneCollection(), output_3: cloneCollection(), output_4: cloneCollection() };
        }
    },

    util_holder: {
        cat: '3. UTILS', label: 'Inspector', icon: 'fa-eye', color: '#7f8c8d',
        in: 1, out: 1,
        tpl: (id) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px">
                <span style="font-size:0.7em;color:#aaa">Color Visor</span>
                <input type="color" df-color class="node-control" value="#00ffcc" 
                    style="height:22px; width:50px; border:none; cursor:pointer; padding:0;">
            </div>
            <div style="font-size:0.6em;color:#666">
                Fuerza el estilo visual de esta capa.
            </div>`,
        run: (id, inputs, dom) => {
            if (!inputs[0]) return null;

            // Recuperamos el color seleccionado
            const colorInput = dom.querySelector('[df-color]');
            const userColor = colorInput ? colorInput.value : '#00ffcc';

            // Clonamos el contenedor (Superficial) para no romper la referencia de las features
            // Esto es muy rápido y no consume memoria extra.
            const output = { ...inputs[0] };

            // Adjuntamos la orden de estilo al objeto raíz
            output._custom_style = {
                color: userColor,
                fillColor: userColor,
                weight: 3,
                opacity: 1,
                fillOpacity: 0.4
            };

            return output;
        }
    },

    util_runner: {
        cat: '3. UTILS', label: 'Batch Runner', icon: 'fa-play', color: '#fff', in: 5, out: 0,
        tpl: () => `<div style="font-size:0.7em;color:#aaa">Conecta nodos finales aquí y ejecútalos todos juntos.</div>`,
        run: (id, inputs) => { return inputs; } // No hace nada, solo fuerza el "Pull" de sus padres
    },

    util_sampler: {
        cat: '3. UTILS', label: 'Random Sampler', icon: 'fa-dice', color: '#7f8c8d',
        in: 1, out: 1,
        tpl: () => `
        <div style="margin-bottom:4px">
            <span style="font-size:0.7em;color:#aaa">Estrategia de Muestreo</span>
            <select df-mode class="node-control">
                <option value="random">Aleatorio (N Total)</option>
                <option value="interval">Intervalo (Cada N)</option>
                <option value="first">Primeros N (Head)</option>
                <option value="last">Últimos N (Tail)</option>
            </select>
        </div>
        <div>
            <span style="font-size:0.7em;color:#aaa">Valor (N)</span>
            <input type="number" df-n class="node-control" value="10" min="1">
        </div>`,
        run: async (id, inputs, dom) => {
            // 1. Validación de entrada vectorial
            if (!inputs[0] || !inputs[0].features) throw new Error("Conecta una capa de entrada.");

            const features = inputs[0].features;
            const mode = dom.querySelector('[df-mode]').value;
            const n = parseInt(dom.querySelector('[df-n]').value) || 10;

            let result = [];

            // 2. Lógica de Muestreo según la estrategia seleccionada
            if (mode === 'random') {
                // Clonamos y desordenamos aleatoriamente
                const shuffled = [...features].sort(() => 0.5 - Math.random());
                result = shuffled.slice(0, n);
            }
            else if (mode === 'interval') {
                // Filtramos uno de cada N elementos
                result = features.filter((f, i) => (i + 1) % n === 0);
            }
            else if (mode === 'first') {
                // Los primeros N
                result = features.slice(0, n);
            }
            else if (mode === 'last') {
                // Los últimos N
                // Nota: slice con negativo toma desde el final
                result = features.slice(-n);
            }

            if (window.log) window.log(`🎲 Sampler: ${mode} -> ${result.length} elementos seleccionados.`);

            return turf.featureCollection(result);
        }
    }
});

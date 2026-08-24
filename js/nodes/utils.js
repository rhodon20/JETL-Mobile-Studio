// Cat: utils
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
const _utilRoot = typeof window !== 'undefined' ? window : global;
const _utilEmpty = () => turf.featureCollection([]);
const _utilConfig = (dom, selector, defaults = {}) => {
    try { return { ...defaults, ...JSON.parse(dom?.querySelector(selector)?.value || '{}') }; }
    catch (_) { return { ...defaults }; }
};
const _utilEditor = (storage, summary, label = 'Configurar') => `
    <input type="hidden" ${storage} value="{}">
    <button type="button" class="node-control node-editor-action" data-action="geom-transform-open-editor">${label}</button>
    <div data-geom-transform-summary style="font-size:.65em;color:#9aa;margin-top:5px">${summary}</div>`;
const _utilResolve = (value, feature) => typeof _utilRoot.JETLResolveParamText === 'function'
    ? _utilRoot.JETLResolveParamText(String(value ?? ''), feature)
    : String(value ?? '').replace(/\{([^{}]+)\}/g, (_, key) => feature?.properties?.[key] ?? '');
const _utilHeaders = (config) => {
    const headers = { ...(config.headers || {}) };
    if (config.auth === 'basic') headers.Authorization = `Basic ${btoa(`${config.user || ''}:${config.pass || ''}`)}`;
    if (config.auth === 'bearer') headers.Authorization = `Bearer ${config.token || ''}`;
    if (config.auth === 'api_key') headers[config.api_key_header || 'X-API-Key'] = config.api_key_value || '';
    if (config.auth === 'oauth2') throw new Error('OAuth2 client-credentials requiere un backend seguro; no se ejecuta en Studio.');
    return headers;
};
const _utilResponseCollection = async (response, request) => {
    const body = await response.text();
    let json = null;
    try { json = body ? JSON.parse(body) : null; } catch (_) { /* texto válido */ }
    const responseHeaders = {};
    if (response.headers?.forEach) response.headers.forEach((value, key) => { responseHeaders[key] = value; });
    return turf.featureCollection([turf.feature(null, {
        request_method: request.method, request_url: request.url,
        response_ok: !!response.ok, response_status_code: Number(response.status || 0),
        response_content_type: response.headers?.get?.('content-type') || '',
        response_final_url: response.url || request.url, response_body: body,
        response_json: json, response_headers: responseHeaders
    })]);
};
const _utilFetch = async (request, timeoutSeconds = 15) => {
    if (!request.url) throw new Error('Indica una URL.');
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), Math.max(1, Number(timeoutSeconds) || 15) * 1000) : null;
    try {
        const response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body, signal: controller?.signal });
        return await _utilResponseCollection(response, request);
    } catch (error) {
        throw new Error(`No se pudo completar la petición web: ${error.message}. Comprueba URL, CORS y conectividad.`);
    } finally { if (timer) clearTimeout(timer); }
};
const _utilRequestBody = (config, inputs) => {
    if (config.body) return String(config.body);
    if (inputs?.[0]) return JSON.stringify(inputs[0]);
    return undefined;
};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    util_creator: {
        cat: '3. UTILS', label: 'Creator', icon: 'fa-wand-magic-sparkles', color: '#7f8c8d', in: 0, out: 1,
        tpl: () => _utilEditor('df-creator-config', '1 entidad · sin geometría'),
        run: (id, inputs, dom) => {
            const config = _utilConfig(dom, '[df-creator-config]', { count: 1, geometry_mode: 'none', x: 0, y: 0, crs: '', instance_attr: '_creation_instance', attributes: [{ enabled: true, name: 'path', value: '', type: 'string' }] });
            const count = Math.min(100000, Math.max(1, Number(config.count) || 1));
            const cast = (value, type) => {
                if (type === 'number') return Number(value); if (type === 'boolean') return String(value).toLowerCase() === 'true';
                if (type === 'null') return null; if (type === 'json') { try { return JSON.parse(value); } catch (_) { return value; } }
                return String(value ?? '');
            };
            const features = Array.from({ length: count }, (_, index) => {
                const properties = { [config.instance_attr || '_creation_instance']: index + 1 };
                (Array.isArray(config.attributes) ? config.attributes : []).filter((item) => item?.enabled !== false && item?.name).forEach((item) => {
                    properties[item.name] = cast(String(item.value ?? '').replace(/\{i\}/g, String(index + 1)), item.type || 'string');
                });
                const geometry = config.geometry_mode === 'point' ? { type: 'Point', coordinates: [Number(config.x) || 0, Number(config.y) || 0] } : null;
                return turf.feature(geometry, properties);
            });
            const output = turf.featureCollection(features); output.metadata = { generated_by: 'Creator', count, crs: config.crs || '' }; return output;
        }
    },

    util_http_caller: {
        cat: '3. UTILS', label: 'HTTP Caller', icon: 'fa-globe', color: '#7f8c8d', in: 1, out: 1,
        tpl: () => _utilEditor('df-http-config', 'Petición HTTP configurable'),
        run: async (id, inputs, dom) => {
            const config = _utilConfig(dom, '[df-http-config]', { method: 'GET', url: '', timeout: 15, auth: 'none', headers: {}, body: '' });
            const feature = inputs?.[0]?.features?.[0]; const method = String(config.method || 'GET').toUpperCase();
            const request = { method, url: _utilResolve(config.url, feature), headers: _utilHeaders(config) };
            if (!['GET', 'HEAD'].includes(method)) request.body = _utilRequestBody(config, inputs);
            return _utilFetch(request, config.timeout);
        }
    },

    util_rest_request: {
        cat: '3. UTILS', label: 'REST Request', icon: 'fa-cloud-arrow-down', color: '#7f8c8d', in: 1, out: 1,
        tpl: () => _utilEditor('df-rest-config', 'Endpoint REST configurable'),
        run: async (id, inputs, dom) => {
            const config = _utilConfig(dom, '[df-rest-config]', { base_url: '', path: '', method: 'GET', timeout: 15, auth: 'none', query: {}, headers: {}, body: '' });
            const feature = inputs?.[0]?.features?.[0]; const base = _utilResolve(config.base_url, feature); const path = _utilResolve(config.path, feature);
            const url = new URL(path, base.endsWith('/') ? base : `${base}/`); Object.entries(config.query || {}).forEach(([key, value]) => url.searchParams.set(key, _utilResolve(value, feature)));
            const method = String(config.method || 'GET').toUpperCase(); const request = { method, url: url.toString(), headers: _utilHeaders(config) };
            if (!['GET', 'HEAD'].includes(method)) request.body = _utilRequestBody(config, inputs); return _utilFetch(request, config.timeout);
        }
    },

    util_graphql_request: {
        cat: '3. UTILS', label: 'GraphQL Request', icon: 'fa-diagram-project', color: '#7f8c8d', in: 1, out: 1,
        tpl: () => _utilEditor('df-graphql-config', 'Consulta GraphQL'),
        run: async (id, inputs, dom) => {
            const config = _utilConfig(dom, '[df-graphql-config]', { endpoint: '', operation_name: '', query: '', variables: {}, timeout: 15, auth: 'none', headers: {} });
            const feature = inputs?.[0]?.features?.[0]; const headers = { 'Content-Type': 'application/json', ..._utilHeaders(config) };
            return _utilFetch({ method: 'POST', url: _utilResolve(config.endpoint, feature), headers, body: JSON.stringify({ query: config.query || '', variables: config.variables || {}, operationName: config.operation_name || undefined }) }, config.timeout);
        }
    },

    util_response_inspector: {
        cat: '3. UTILS', label: 'Response Inspector', icon: 'fa-magnifying-glass', color: '#7f8c8d', in: 1, out: 1,
        tpl: () => `<div style="font-size:.65em;color:#aaa"><b data-response-status>Sin respuesta</b><div data-response-type></div><pre data-response-body style="max-height:68px;overflow:auto;white-space:pre-wrap;margin:4px 0"></pre></div>`,
        run: (id, inputs, dom) => {
            const source = inputs?.[0] || _utilEmpty(); const properties = source.features?.[0]?.properties || {};
            const status = dom?.querySelector('[data-response-status]'); const type = dom?.querySelector('[data-response-type]'); const body = dom?.querySelector('[data-response-body]');
            if (status) status.textContent = `${properties.response_status_code ?? '—'} ${properties.response_ok ? 'OK' : ''}`.trim();
            if (type) type.textContent = properties.response_content_type || properties.response_final_url || '';
            if (body) body.textContent = typeof properties.response_body === 'string' ? properties.response_body : JSON.stringify(properties.response_json ?? '', null, 2);
            return source;
        }
    },

    util_workspace_runner: {
        cat: '3. UTILS', label: 'Workspace Runner', icon: 'fa-layer-group', color: '#7f8c8d', in: 1, out: 1, hidden: true,
        help: 'Compatibilidad de proyectos Desktop. En Studio actúa como paso transparente; la ejecución externa de workspaces requiere backend.',
        tpl: () => `<div style="font-size:.65em;color:#aaa">Compatibilidad · paso transparente</div>`, run: (id, inputs) => inputs?.[0] || null
    },
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

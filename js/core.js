        // =============================================
        // 1. SISTEMA CORE Y STORAGE
        // =============================================
        const SafeStorage={isAvailable:!1,init:function(){try{let e="__test__";localStorage.setItem(e,e),localStorage.removeItem(e),this.isAvailable=!0}catch(e){console.warn("Storage disabled")}},save:function(e,t){this.isAvailable&&localStorage.setItem(e,t)},load:function(e){return this.isAvailable?localStorage.getItem(e):null},clear:function(e){this.isAvailable&&localStorage.removeItem(e)}};SafeStorage.init();

        const CITIES = [{n:"Madrid",c:[40.416,-3.703]},{n:"Barcelona",c:[41.385,2.173]},{n:"Valencia",c:[39.469,-0.376]},{n:"Sevilla",c:[37.389,-5.984]}];
        let currentNodeId = null;
        let currentRunTimestamp = 0; // Para el control de estado (verde/naranja)

        // =============================================
        // 1.a ESTADO COMPARTIDO (dueño único)
        // =============================================
        // El editor y el mapa se crean al arrancar (engine.js); los resultados, las
        // capas y las cachés son objetos que nadie sustituye: se vacían en sitio con
        // JETLClearObject, así cualquier referencia guardada sigue siendo válida.
        let editor = null;
        let map = null;
        const mapLayers = {};          // nodeId -> capa del mapa (js/ui/mapEngine.js: count, bounds)
        const executionData = {};      // nodeId -> { data, _runId, _contentHash, _ms }
        window.executionData = executionData;
        window._file_cache = {};       // 'file_' + nodeId -> FeatureCollection leída
        window._tiff_cache = {};       // refId -> ArrayBuffer GeoTIFF
        window._node_tiff_ref = {};    // nodeId -> refId
        window.isEngineCancelled = false;
        // Ficheros elegidos en el editor de un lector (elemento del nodo -> File[]);
        // los escribe schemaUI.js y los lee el nodo lector al ejecutarse.
        window.JETLReaderFileStore = new WeakMap();

        function JETLClearObject(obj) {
            Object.keys(obj).forEach((k) => { delete obj[k]; });
            return obj;
        }
        window.JETLClearObject = JETLClearObject;

        function clearNodeRuntimeCaches(nodeId) {
            if (!nodeId) return;
            delete window._file_cache['file_' + nodeId];
            const tiffRef = window._node_tiff_ref[nodeId];
            if (tiffRef) {
                delete window._tiff_cache[tiffRef];
                delete window._node_tiff_ref[nodeId];
            }
        }

        function clearAllRuntimeCaches() {
            JETLClearObject(window._file_cache);
            JETLClearObject(window._tiff_cache);
            JETLClearObject(window._node_tiff_ref);
        }

        window.JETLRuntimeCache = {
            clearNode: clearNodeRuntimeCaches,
            clearAll: clearAllRuntimeCaches
        };

        function JETLSetEngineCancelled(value) {
            window.isEngineCancelled = !!value;
        }
        window.JETLSetEngineCancelled = JETLSetEngineCancelled;

        // =============================================
        // 1.b EVENTOS
        // =============================================
        // Las capas bajas (nodos, motor, estado) anuncian lo que ocurre y la UI se
        // suscribe; así ninguna depende de la que la pinta. emit devuelve cuántos
        // oyentes había para que el emisor pueda degradar a consola.
        const JETLEvents = (() => {
            const handlers = {};
            return {
                on(type, fn) {
                    (handlers[type] = handlers[type] || []).push(fn);
                    return () => { handlers[type] = (handlers[type] || []).filter((h) => h !== fn); };
                },
                emit(type, detail) {
                    const list = (handlers[type] || []).slice();
                    list.forEach((fn) => {
                        try { fn(detail); } catch (e) { console.error(`[JETLEvents] ${type}:`, e); }
                    });
                    return list.length;
                }
            };
        })();
        window.JETLEvents = JETLEvents;

        // Registro y avisos: los pinta visualization.js; antes de que cargue van a consola.
        function log(message, level) {
            if (!JETLEvents.emit('log', { message, level })) console.log(`[JETL] ${message}`);
        }
        function showToast(message, type) {
            if (!JETLEvents.emit('toast', { message, type })) console.log(message);
        }
        window.log = log;
        window.showToast = showToast;

        // Descargas: un único punto, sustituible en pruebas con JETLSetDownloadHandler.
        let JETLDownloadHandler = null;
        function download(content, filename, mime) {
            if (JETLDownloadHandler) return JETLDownloadHandler(content, filename, mime);
            const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        function JETLSetDownloadHandler(fn) {
            const prev = JETLDownloadHandler;
            JETLDownloadHandler = typeof fn === 'function' ? fn : null;
            return prev;
        }
        window.JETLSetDownloadHandler = JETLSetDownloadHandler;

        function toCSV(g) {
            if (!g || !g.features || g.features.length === 0) return "";
            const props = new Set();
            g.features.forEach(f => Object.keys(f.properties || {}).forEach(k => !k.startsWith('_') && props.add(k)));
            const h = Array.from(props);
            const escape = v => {
                if (v === null || v === undefined) return '';
                let s = String(v);
                if (s.includes('"')) s = s.replace(/"/g, '""');
                if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
                return s;
            };
            const rows = g.features.map(f => h.map(k => escape(f.properties ? f.properties[k] : '')).join(','));
            return h.join(',') + '\n' + rows.join('\n');
        }

        const ensureFC = (geo) => {
            if (!geo) return turf.featureCollection([]);
            if (geo.type === 'FeatureCollection') return geo;
            if (geo.type === 'Feature') return turf.featureCollection([geo]);
            if (geo.type === 'GeometryCollection') return turf.featureCollection(geo.geometries.map(g => turf.feature(g)));
            return turf.featureCollection([turf.feature(geo)]);
        };

        // Resultado de un nodo -> FeatureCollection (o el mapa output_* si tiene varios puertos).
        function normalizeResult(res) {
            if (!res) return null;
            if (res.type === 'Feature') return turf.featureCollection([res]);
            if (res.type === 'FeatureCollection') return res;
            if (Array.isArray(res) && res.length && res[0].type) return turf.featureCollection(res);
            const keys = Object.keys(res || {});
            if (keys.some(k => k && k.startsWith && k.startsWith('output_'))) return res;
            if (res && res.geometry) return turf.featureCollection([turf.feature(res.geometry, res.properties || {})]);
            return res;
        }

        function resolvePort(parentRes, parentPort) {
            if (!parentRes) return null;
            if (parentRes.type === 'FeatureCollection' || parentRes.type === 'Feature') return normalizeResult(parentRes);
            if (typeof parentRes === 'object') {
                if (parentPort && parentRes[parentPort]) return normalizeResult(parentRes[parentPort]);
                if (parentRes.output_1) return normalizeResult(parentRes.output_1);
                if (parentRes.output) return normalizeResult(parentRes.output);
            }
            return null;
        }

        function JETLCloneFallback(value, seen) {
            if (value === null || value === undefined) return value;
            const t = typeof value;
            if (t !== 'object') return value;
            if (value instanceof Date) return new Date(value.getTime());
            if (value instanceof RegExp) return new RegExp(value.source, value.flags);
            if (value instanceof ArrayBuffer) return value.slice(0);
            if (ArrayBuffer.isView(value)) {
                if (typeof value.slice === 'function') return value.slice(0);
                return new value.constructor(value);
            }

            const refs = seen || new Map();
            if (refs.has(value)) return refs.get(value);

            if (Array.isArray(value)) {
                const outArr = new Array(value.length);
                refs.set(value, outArr);
                for (let i = 0; i < value.length; i++) outArr[i] = JETLCloneFallback(value[i], refs);
                return outArr;
            }

            const out = {};
            refs.set(value, out);
            Object.keys(value).forEach((k) => { out[k] = JETLCloneFallback(value[k], refs); });
            return out;
        }

        function JETLClone(value) {
            if (value === null || value === undefined) return value;
            if (typeof structuredClone === 'function') {
                try { return structuredClone(value); } catch (e) {}
            }
            return JETLCloneFallback(value);
        }
        window.JETLClone = JETLClone;
        window.JETLCloneFallback = JETLCloneFallback;

        function JETLIsCancelledError(err) {
            return !!(
                (typeof window !== 'undefined' && window.isEngineCancelled) ||
                (err && (err.cancelled || err.name === 'CancelledError'))
            );
        }
        window.JETLIsCancelledError = JETLIsCancelledError;

        function JETLThrowIfCancelled() {
            if (typeof window !== 'undefined' && window.isEngineCancelled) {
                const err = new Error('Operacion cancelada por el usuario');
                err.name = 'CancelledError';
                err.cancelled = true;
                throw err;
            }
        }
        window.JETLThrowIfCancelled = JETLThrowIfCancelled;

        function JETLNextTick() {
            return new Promise(resolve => setTimeout(resolve, 0));
        }
        window.JETLNextTick = JETLNextTick;

        // Escaping for text interpolated into HTML: anything from data files, HTTP
        // responses or imported JSON (packages, templates) must go through it.
        function JETLEscapeHtml(value) {
            return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => (
                { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
            ));
        }
        window.JETLEscapeHtml = JETLEscapeHtml;

        // =============================================
        // 1.b PARAMETROS GLOBALES DE WORKSPACE
        // =============================================
        const PARAMS_STORAGE_KEY = 'jetl_workspace_params';
        let __jetlParams = {};
        try {
            const raw = SafeStorage.load(PARAMS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') __jetlParams = parsed;
            }
        } catch (e) { /* noop */ }

        function JETLGetParams() {
            return { ...(__jetlParams || {}) };
        }

        function JETLSetParams(map) {
            __jetlParams = (map && typeof map === 'object') ? { ...map } : {};
            SafeStorage.save(PARAMS_STORAGE_KEY, JSON.stringify(__jetlParams));
            return JETLGetParams();
        }

        function JETLSetParam(key, value) {
            const k = String(key || '').trim();
            if (!k) return JETLGetParams();
            __jetlParams[k] = value == null ? '' : String(value);
            SafeStorage.save(PARAMS_STORAGE_KEY, JSON.stringify(__jetlParams));
            return JETLGetParams();
        }

        function JETLGetParam(key, fallback = '') {
            const k = String(key || '').trim();
            if (!k) return fallback;
            return Object.prototype.hasOwnProperty.call(__jetlParams, k) ? __jetlParams[k] : fallback;
        }

        function JETLResolveParamText(input) {
            const source = input == null ? '' : String(input);
            if (!source.includes('${')) return source;
            return source.replace(/\$\{([a-zA-Z0-9_.-]+)\}/g, (m, key) => {
                const k = String(key || '').trim();
                if (!k) return m;
                return Object.prototype.hasOwnProperty.call(__jetlParams, k) ? String(__jetlParams[k]) : m;
            });
        }

        window.JETLParams = {
            getAll: JETLGetParams,
            setAll: JETLSetParams,
            get: JETLGetParam,
            set: JETLSetParam
        };
        window.JETLResolveParamText = JETLResolveParamText;

        // =============================================
        // 1.c SUITE SMOKE (carga bajo demanda)
        // =============================================
        // window.JETLSmoke es estable desde el arranque; js/smoke.js se descarga la
        // primera vez que se usa y publica window.JETLSmokeSuite.
        const SMOKE_SRC = 'js/smoke.js';
        let __smokeLoadPromise = null;

        function ensureSmokeApiLoadedAsync(timeoutMs = 5000) {
            if (window.JETLSmokeSuite) return Promise.resolve(true);
            if (__smokeLoadPromise) return __smokeLoadPromise;
            __smokeLoadPromise = new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = SMOKE_SRC;
                const timer = setTimeout(() => resolve(!!window.JETLSmokeSuite), timeoutMs);
                s.onload = () => { clearTimeout(timer); resolve(!!window.JETLSmokeSuite); };
                s.onerror = () => { clearTimeout(timer); resolve(false); };
                document.head.appendChild(s);
            }).finally(() => {
                __smokeLoadPromise = null;
            });
            return __smokeLoadPromise;
        }

        function smokeEntry(name) {
            return async (...args) => {
                await ensureSmokeApiLoadedAsync();
                if (!window.JETLSmokeSuite) throw new Error('JETLSmoke no disponible (fallo de carga de js/smoke.js)');
                return window.JETLSmokeSuite[name](...args);
            };
        }

        window.JETLSmoke = {
            runBasic: smokeEntry('runBasic'),
            runStable: smokeEntry('runStable'),
            runExtended: smokeEntry('runExtended'),
            runGate: smokeEntry('runGate')
        };
        window.ensureSmokeApiLoadedAsync = ensureSmokeApiLoadedAsync;

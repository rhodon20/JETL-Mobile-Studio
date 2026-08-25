        // =============================================
        // 1. SISTEMA CORE Y STORAGE
        // =============================================
        const SafeStorage={isAvailable:!1,init:function(){try{let e="__test__";localStorage.setItem(e,e),localStorage.removeItem(e),this.isAvailable=!0}catch(e){console.warn("Storage disabled")}},save:function(e,t){this.isAvailable&&localStorage.setItem(e,t)},load:function(e){return this.isAvailable?localStorage.getItem(e):null},clear:function(e){this.isAvailable&&localStorage.removeItem(e)}};SafeStorage.init();

        const CITIES = [{n:"Madrid",c:[40.416,-3.703]},{n:"Barcelona",c:[41.385,2.173]},{n:"Valencia",c:[39.469,-0.376]},{n:"Sevilla",c:[37.389,-5.984]}];
        let layerControl; 
        let currentNodeId = null;
        let currentRunTimestamp = 0; // Para el control de estado (verde/naranja)

        const ensureFC = (geo) => {
            if (!geo) return turf.featureCollection([]);
            if (geo.type === 'FeatureCollection') return geo;
            if (geo.type === 'Feature') return turf.featureCollection([geo]);
            if (geo.type === 'GeometryCollection') return turf.featureCollection(geo.geometries.map(g => turf.feature(g)));
            return turf.featureCollection([turf.feature(geo)]);
        };

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
        // 1.c FALLBACK DE CARGA SMOKE (anti-cache/SW)
        // =============================================
        const SMOKE_SRC = 'js/smoke.js';
        let __smokeLoadPromise = null;

        function ensureSmokeApiLoaded() {
            if (typeof window === 'undefined') return;
            if (window.JETLSmoke) return;
            const existing = document.querySelector('script[data-jetl-smoke-fallback="1"]');
            if (existing) return;
            const s = document.createElement('script');
            s.src = SMOKE_SRC;
            s.defer = true;
            s.setAttribute('data-jetl-smoke-fallback', '1');
            s.onload = () => console.log('[JETL] smoke fallback loaded');
            s.onerror = (e) => console.warn('[JETL] smoke fallback failed', e);
            (document.head || document.body || document.documentElement).appendChild(s);
        }

        function ensureSmokeApiLoadedAsync(timeoutMs = 5000) {
            if (typeof window === 'undefined') return Promise.resolve(false);
            if (window.JETLSmoke && !window.JETLSmoke.__proxy) return Promise.resolve(true);
            if (__smokeLoadPromise) return __smokeLoadPromise;

            __smokeLoadPromise = new Promise((resolve) => {
                let done = false;
                const finish = (ok) => {
                    if (done) return;
                    done = true;
                    resolve(!!ok);
                };

                const checkReady = () => !!(window.JETLSmoke && !window.JETLSmoke.__proxy);
                if (checkReady()) return finish(true);

                let s = document.querySelector('script[data-jetl-smoke-fallback="1"]');
                if (!s) {
                    s = document.createElement('script');
                    s.src = SMOKE_SRC;
                    s.defer = true;
                    s.setAttribute('data-jetl-smoke-fallback', '1');
                    (document.head || document.body || document.documentElement).appendChild(s);
                }

                s.addEventListener('load', () => finish(checkReady()), { once: true });
                s.addEventListener('error', () => finish(false), { once: true });
                setTimeout(() => finish(checkReady()), timeoutMs);
            }).finally(() => {
                __smokeLoadPromise = null;
            });
            return __smokeLoadPromise;
        }

        if (typeof window !== 'undefined' && !window.JETLSmoke) {
            const smokeProxy = {
                __proxy: true,
                runBasic: async () => {
                    await ensureSmokeApiLoadedAsync();
                    if (!window.JETLSmoke || window.JETLSmoke === smokeProxy || typeof window.JETLSmoke.runBasic !== 'function') {
                        throw new Error('JETLSmoke no disponible (fallo de carga de js/smoke.js)');
                    }
                    return window.JETLSmoke.runBasic();
                },
                runExtended: async () => {
                    await ensureSmokeApiLoadedAsync();
                    if (!window.JETLSmoke || window.JETLSmoke === smokeProxy || typeof window.JETLSmoke.runExtended !== 'function') {
                        throw new Error('JETLSmoke no disponible (fallo de carga de js/smoke.js)');
                    }
                    return window.JETLSmoke.runExtended();
                }
            };
            window.JETLSmoke = smokeProxy;
        }

        if (typeof window !== 'undefined') {
            window.ensureSmokeApiLoaded = ensureSmokeApiLoaded;
            window.ensureSmokeApiLoadedAsync = ensureSmokeApiLoadedAsync;
        }

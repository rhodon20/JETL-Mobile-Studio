const CACHE_NAME = 'jetl-cache-v2026-3';
const coreAssets = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon.svg',

    // Vendor Libs
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/gh/jerosoler/Drawflow/dist/drawflow.min.css',
    './js/vendor/leaflet.js',
    './js/vendor/turf.min.js',
    './js/vendor/drawflow.min.js',
    './js/vendor/shp.js',
    './js/vendor/geoblaze.web.min.js',
    './js/vendor/geotiff.js',
    './js/vendor/osmtogeojson.js',
    './js/vendor/proj4.js',
    './js/vendor/wellknown.js',
    './js/vendor/anime.min.js',

    // Core JS
    './js/core.js',
    './js/formats.js',
    './js/core/workerPool.js',
    './js/state/history.js',
    './js/geo.worker.js',
    './js/visualization.js',
    './js/processNode.js',
    './js/engine.js',
    './js/smoke.js',

    // Node Definitions
    './js/nodes/readers.js',
    './js/nodes/geometry.js',
    './js/nodes/spatial.js',
    './js/nodes/attributes.js',
    './js/nodes/raster.js',
    './js/nodes/writers.js',
    './js/schemaUI.js',
    './js/nodes/utils.js',
    './js/tools.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching core assets for Offline Use');
                // Intentamos cachear lo básico sin romper el SW si un archivo falta
                return Promise.allSettled(
                    coreAssets.map(url => cache.add(url).catch(e => console.warn('[SW] Fallo al cachear', url, e)))
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activated');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Limpiando cache antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Evitar interceptar requests pesadas que son problemáticas de cachear nativamente
    if (event.request.method !== 'GET' || event.request.url.includes('.wasm')) return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse; // Retorna del caché local rápido
                }

                // Si no hay caché, intenta por red y lo cachea bajo demanda
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        // Solo cachear HTTP/S nativo
                        if (event.request.url.startsWith('http')) {
                            cache.put(event.request, responseToCache);
                        }
                    });

                    return networkResponse;
                }).catch(() => {
                    // Fallback Offline Extremo
                    console.error('[SW] Fetch failed and no cache available for', event.request.url);
                });
            })
    );
});

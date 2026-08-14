const CACHE_NAME = 'jetl-mobile-cache-v5';
const coreAssets = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon.svg',
    './css/mobile.css',
    './css/ui-system.css',
    './js/mobile.js',
    './js/modalSystem.js',

    // Vendor Libs
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
    './js/vendor/geopackage.min.js',
    './js/vendor/parquet.min.js',
    './js/vendor/parquet_bundled.js',
    './js/vendor/jsts.min.js',
    './js/vendor/rbush.min.js',

    // Core JS
    './js/core.js',
    './js/params.js',
    './js/formats.js',
    './js/core/workerPool.js',
    './js/state/history.js',
    './js/geo.worker.js',
    './js/visualization.js',
    './js/processNode.js',
    './js/engine.js',
    './js/templates.js',
    './js/packages.js',
    './js/tools.js',
    './js/schemaUI.js',
    './js/smoke.js',

    // Node Definitions
    './js/nodes/readers.js',
    './js/nodes/geometry.js',
    './js/nodes/spatial.js',
    './js/nodes/attributes.js',
    './js/nodes/raster.js',
    './js/nodes/writers.js',
    './js/nodes/utils.js'
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

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.ok) {
                        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
                    }
                    return response;
                })
                .catch(() => caches.match('./index.html').then(cached => cached || caches.match('./')))
        );
        return;
    }

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

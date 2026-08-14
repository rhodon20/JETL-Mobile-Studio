const CACHE_NAME = 'jetl-mobile-cache-v9';
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
    // Las librerías GIS pesadas se cachean al usarse. No deben retrasar
    // la activación de una nueva versión de la aplicación.

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
            caches.match('./index.html').then(cached => {
                const networkUpdate = fetch(event.request)
                    .then(response => {
                        if (response && response.ok) {
                            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
                        }
                        return response;
                    })
                    .catch(() => null);

                // Una navegación nunca debe quedar bloqueada esperando la red.
                if (cached) {
                    networkUpdate.then(() => undefined);
                    return cached;
                }
                return Promise.race([
                    networkUpdate,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]).then(response => {
                    if (response) return response;
                    return caches.match('./').then(rootCached => rootCached || new Response(
                        '<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#121212;color:#fff;font-family:sans-serif;padding:24px"><h1>JETL Studio</h1><p>Sin conexión. Vuelve a intentarlo cuando dispongas de red.</p></body>',
                        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                    ));
                });
            })
        );
        return;
    }

    const requestURL = new URL(event.request.url);
    const isVersionedAppAsset = requestURL.origin === self.location.origin &&
        ['script', 'style', 'manifest'].includes(event.request.destination);

    // El código de la aplicación debe comprobar la red primero para evitar que
    // una versión antigua del SW deje JS/CSS obsoleto tras un despliegue.
    if (isVersionedAppAsset) {
        event.respondWith(
            Promise.race([
                fetch(event.request).catch(() => null),
                new Promise(resolve => setTimeout(() => resolve(null), 5000))
            ]).then(networkResponse => {
                if (networkResponse && networkResponse.ok) {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                    return networkResponse;
                }
                return caches.match(event.request);
            })
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

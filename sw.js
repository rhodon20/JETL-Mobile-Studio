// Modo sin conexión de JETL Studio. scripts/build.mjs rellena BUILD y PRECACHE;
// en desarrollo (sin build) la app no registra este archivo.
//
// Lo que hizo retirar la versión anterior (agosto de 2026) fue que Safari se
// quedaba sin entregar la página: la navegación competía entre caché y red con
// un temporizador. Reglas para no repetirlo:
// - la navegación va siempre a la red; sólo si la red falla se sirve la copia
//   guardada del index (sin carreras ni temporizadores: con red se comporta
//   como si no hubiera service worker);
// - los archivos precacheados son los de este build, así que se sirven desde la
//   caché; el resto del mismo origen va a la red y la caché sólo cubre los fallos;
// - version.json y todo lo de otros orígenes (mapa base, Overpass, URLs del
//   usuario) no se tocan;
// - cada build tiene su caché; al activarse uno nuevo se borran las anteriores.
const BUILD = 'dev';
const PRECACHE = [];
const CACHE = `jetl-${BUILD}`;
const RUNTIME = `jetl-runtime-${BUILD}`;
const INDEX = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        // Atómico: si falta un archivo, el service worker no se instala y sigue
        // el anterior (o ninguno), nunca uno a medias.
        await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter((name) => name.startsWith('jetl-') && name !== CACHE && name !== RUNTIME)
            .map((name) => caches.delete(name)));
        if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
        await self.clients.claim();
    })());
});

async function fromNetworkOr(request, fallback) {
    try {
        return await fetch(request);
    } catch (error) {
        const cached = await fallback();
        if (cached) return cached;
        throw error;
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.endsWith('/version.json')) return;

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                return (await event.preloadResponse) || await fetch(request);
            } catch (error) {
                // La página pedida (privacy.html…) o, si no está, la app.
                const cached = await caches.match(request, { cacheName: CACHE, ignoreSearch: true })
                    || await caches.match(INDEX, { cacheName: CACHE });
                if (cached) return cached;
                throw error;
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const precached = await caches.match(request, { cacheName: CACHE });
        if (precached) return precached;
        return fromNetworkOr(request, () => caches.match(request, { cacheName: RUNTIME })).then(async (response) => {
            if (response.ok && response.type === 'basic') {
                const copy = response.clone();
                event.waitUntil(caches.open(RUNTIME).then((cache) => cache.put(request, copy)));
            }
            return response;
        });
    })());
});

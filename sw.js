// Retirada temporal del service worker de JETL Studio.
// Esta versión se activa inmediatamente, elimina únicamente las cachés de JETL
// y se desregistra para que las navegaciones posteriores vayan directas a red.
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names.filter((name) => name.startsWith('jetl-')).map((name) => caches.delete(name))
        );
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach((client) => client.postMessage({ type: 'JETL_SW_RETIRED' }));
    })());
});

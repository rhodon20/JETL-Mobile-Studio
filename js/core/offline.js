// Registro del modo sin conexión (sw.js). Nunca forma parte del arranque: se
// registra cuando la app ya está lista y sólo en un build desplegado (en
// desarrollo sw.js no tiene la lista de archivos). ?nosw=1 es el interruptor de
// emergencia: desregistra el service worker y borra sus cachés.
const REGISTER_DELAY_MS = 2000;

async function retireOfflineMode() {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith('jetl-')).map((name) => caches.delete(name)));
    }
}

function initOfflineMode() {
    if (!('serviceWorker' in navigator)) return;
    if (new URLSearchParams(location.search).has('nosw')) {
        retireOfflineMode().catch((error) => console.warn('[JETL] No se pudo retirar el modo sin conexión', error));
        return;
    }
    const build = document.querySelector('meta[name="jetl-build"]')?.content;
    if (!build || build === 'dev') return;
    setTimeout(() => {
        navigator.serviceWorker.register('sw.js', { scope: './' })
            .catch((error) => console.warn('[JETL] Modo sin conexión no disponible', error));
    }, REGISTER_DELAY_MS);
}

export { initOfflineMode };

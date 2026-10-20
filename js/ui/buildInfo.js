// Versión desplegada: al pulsar la marca de la cabecera se muestra el despliegue
// que se está viendo (sellado en index.html por scripts/build.mjs) y se compara con
// el último publicado (version.json, pedido sin caché). Si no coinciden, el
// navegador está mostrando una copia antigua y se ofrece recargar.

function readLoadedBuild() {
    const meta = document.querySelector('meta[name="jetl-build"]');
    const sha = meta?.getAttribute('content') || 'dev';
    if (sha === 'dev') return null;
    return { sha, run: meta.dataset.run || '', builtAt: meta.dataset.builtAt || '' };
}

async function fetchLatestBuild() {
    const response = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function describe(build) {
    const parts = [];
    if (build.run) parts.push(`Despliegue #${build.run}`);
    parts.push(build.sha);
    if (build.builtAt) {
        const date = new Date(build.builtAt);
        if (!Number.isNaN(date.getTime())) parts.push(date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }));
    }
    return parts.join(' · ');
}

function line(className, text) {
    const el = document.createElement('p');
    el.className = className;
    el.textContent = text;
    return el;
}

function position(panel, anchor) {
    const rect = anchor.getBoundingClientRect();
    panel.style.top = `${Math.round(rect.bottom + 8)}px`;
    panel.style.left = `${Math.round(Math.max(8, rect.left))}px`;
}

async function render(panel) {
    const loaded = readLoadedBuild();
    const title = document.createElement('strong');
    title.textContent = 'JETL Studio';
    const status = line('build-info-status', loaded ? 'Comprobando si es la última versión…' : 'Versión de desarrollo (sin desplegar)');
    const privacy = document.createElement('a');
    privacy.className = 'build-info-privacy';
    privacy.href = 'privacy.html';
    privacy.textContent = 'Política de privacidad';
    panel.replaceChildren(title, line('build-info-version', loaded ? describe(loaded) : 'Local'), status, privacy);
    if (!loaded) return;

    try {
        const latest = await fetchLatestBuild();
        if (latest.sha === loaded.sha) {
            status.textContent = 'Es la última versión publicada';
            status.dataset.state = 'latest';
            return;
        }
        status.textContent = `Hay una versión más reciente: ${describe(latest)}`;
        status.dataset.state = 'outdated';
        const reload = document.createElement('button');
        reload.type = 'button';
        reload.className = 'build-info-reload';
        reload.textContent = 'Recargar';
        reload.addEventListener('click', () => window.location.reload());
        panel.append(reload);
    } catch (error) {
        console.warn('[JETL] No se pudo comprobar la última versión', error);
        status.textContent = 'No se pudo comprobar la última versión (¿sin conexión?)';
        status.dataset.state = 'unknown';
    }
}

function init() {
    const anchor = document.getElementById('brand-button');
    const panel = document.getElementById('build-info');
    if (!anchor || !panel) return;

    const close = () => {
        panel.hidden = true;
        anchor.setAttribute('aria-expanded', 'false');
    };
    anchor.addEventListener('click', () => {
        if (!panel.hidden) return close();
        position(panel, anchor);
        panel.hidden = false;
        anchor.setAttribute('aria-expanded', 'true');
        render(panel);
    });
    document.addEventListener('click', (event) => {
        if (!panel.hidden && !panel.contains(event.target) && !anchor.contains(event.target)) close();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) close();
    });
}

init();

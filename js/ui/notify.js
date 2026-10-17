// Registro y avisos en pantalla: pinta lo que core.js emite con log() y
// showToast(), y el aviso interactivo para elegir puerto. Se carga con la
// visualización (usa anime.js, que llega con ese runtime).
function renderLogEntry(m, t) {
    const l = document.getElementById('logs');
    if (!l) return;
    const ts = new Date().toLocaleTimeString();
    const color = t === 'err' ? '#e74c3c' : (t === 'success' ? '#2ecc71' : (t === 'warn' ? '#f1c40f' : '#bbb'));
    // Messages carry file/network content (errors, WKT): text only, never HTML.
    const row = document.createElement('div');
    row.style.cssText = `color:${color};margin-bottom:4px;font-family:monospace;font-size:0.9em`;
    const stamp = document.createElement('span');
    stamp.style.cssText = 'opacity:0.5;margin-right:5px';
    stamp.textContent = `[${ts}]`;
    row.append(stamp, String(m));
    l.appendChild(row);
    l.scrollTop = l.scrollHeight;
}

let toastAutoHideTimer = null;
let toastInteractiveCleanup = null;

function clearToastInteractive() {
    if (typeof toastInteractiveCleanup === 'function') {
        try { toastInteractiveCleanup(); } catch (_) { }
    }
    toastInteractiveCleanup = null;
}

function renderToast(m, type) {
    const t = document.getElementById('toast');
    if (!t) return console.log(m);
    const msgEl = document.getElementById('toast-msg');
    clearToastInteractive();
    if (toastAutoHideTimer) {
        clearTimeout(toastAutoHideTimer);
        toastAutoHideTimer = null;
    }
    if (msgEl) msgEl.innerText = m;

    t.style.borderLeft = `4px solid ${type === 'error' ? '#e74c3c' : (type === 'warn' ? '#f1c40f' : '#2ecc71')}`;
    t.style.pointerEvents = 'none';
    t.className = 'visible';
    anime.remove(t);
    anime({ targets: t, translateY: [50, 0], opacity: [0, 1], scale: [0.9, 1], easing: 'spring(1, 80, 10, 0)', duration: 800 });
    toastAutoHideTimer = setTimeout(() => {
        anime({ targets: t, opacity: 0, translateY: 20, duration: 300, easing: 'easeInQuad', complete: () => { t.className = ''; } });
    }, 3000);
}

// log() y showToast() viven en core.js y emiten eventos; aquí sólo se pintan.
JETLEvents.on('log', (e) => renderLogEntry(e.message, e.level));
JETLEvents.on('toast', (e) => renderToast(e.message, e.type));

function showPortPickerToast(nodeId, ports, currentPort) {
    return new Promise((resolve) => {
        const t = document.getElementById('toast');
        const msgEl = document.getElementById('toast-msg');
        if (!t || !msgEl || !ports || ports.length === 0) return resolve(currentPort || null);

        clearToastInteractive();
        if (toastAutoHideTimer) {
            clearTimeout(toastAutoHideTimer);
            toastAutoHideTimer = null;
        }
        const fallback = currentPort || ports[0];
        const buttons = ports.map((p) => {
            const active = p === fallback;
            const bg = active ? '#2ecc71' : '#2a2a2a';
            const color = active ? '#111' : '#ddd';
            return `<button type="button" data-toast-port="${p}" style="border:1px solid #555;background:${bg};color:${color};padding:4px 8px;border-radius:12px;cursor:pointer;font-size:12px">${p}</button>`;
        }).join('');

        msgEl.innerHTML = `<span style="margin-right:6px">Nodo #${nodeId}: elige puerto</span>${buttons}`;
        t.style.borderLeft = '4px solid #3498db';
        t.style.pointerEvents = 'auto';
        t.className = 'visible';
        anime.remove(t);
        anime({ targets: t, translateY: [50, 0], opacity: [0, 1], scale: [0.9, 1], easing: 'spring(1, 80, 10, 0)', duration: 500 });

        const onClick = (e) => {
            const btn = e.target.closest('[data-toast-port]');
            if (!btn) return;
            finish(btn.getAttribute('data-toast-port') || fallback);
        };
        const finish = (chosen) => {
            clearToastInteractive();
            t.style.pointerEvents = 'none';
            anime({ targets: t, opacity: 0, translateY: 20, duration: 220, easing: 'easeInQuad', complete: () => { t.className = ''; } });
            resolve(chosen || fallback);
        };
        const onEsc = (e) => {
            if (e.key === 'Escape') finish(fallback);
        };

        t.addEventListener('click', onClick);
        document.addEventListener('keydown', onEsc);
        const ttl = setTimeout(() => finish(fallback), 7000);

        toastInteractiveCleanup = () => {
            t.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onEsc);
            clearTimeout(ttl);
        };
    });
}

export { showPortPickerToast };

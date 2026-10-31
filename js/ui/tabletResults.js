// Panel de Resultados en tablet (disposición de JETLUi, cabecera de index.html):
//   tablet            hoja en la mitad inferior; su asa (franja superior) ajusta la
//                     altura, del 20 % al 85 % de la pantalla.
//   tablet-landscape  panel fijo a la derecha del flujo; el divisor (franja
//                     izquierda) ajusta la anchura, del 28 % al 70 %; la X lo oculta
//                     y Resultados (JETLNativeNav) lo vuelve a mostrar.
// Las medidas van en las variables CSS --results-top y --results-width (mobile.css).

function onHandle(panel, event, layout) {
    const rect = panel.getBoundingClientRect();
    if (layout === 'tablet') return event.clientY - rect.top <= 24;
    if (layout === 'tablet-landscape') return event.clientX - rect.left <= 16 && !document.body.classList.contains('map-panel-maximized');
    return false;
}

function initResize(panel) {
    let drag = null;
    panel.addEventListener('pointerdown', (event) => {
        const layout = window.JETLUi?.layout();
        if (!onHandle(panel, event, layout)) return;
        drag = { id: event.pointerId, layout };
        panel.setPointerCapture(event.pointerId);
        panel.classList.add('is-resizing');
        event.preventDefault();
    });
    panel.addEventListener('pointermove', (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const root = document.documentElement.style;
        if (drag.layout === 'tablet') {
            const top = Math.min(0.85, Math.max(0.2, event.clientY / window.innerHeight));
            root.setProperty('--results-top', `${Math.round(top * 100)}dvh`);
        } else {
            const width = Math.min(0.7, Math.max(0.28, (window.innerWidth - event.clientX) / window.innerWidth));
            root.setProperty('--results-width', `${Math.round(width * 100)}vw`);
        }
    });
    const end = (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        drag = null;
        panel.classList.remove('is-resizing');
        // El mapa se ajusta solo (MapLibre vigila su contenedor); el flujo se reencuadra.
        JETLEvents.emit('canvas:fit');
    };
    panel.addEventListener('pointerup', end);
    panel.addEventListener('pointercancel', end);
}

// En horizontal los resultados están siempre a la vista: el mapa se prepara ya,
// sin esperar a pulsar Resultados.
function prepareDockedResults() {
    if (window.JETLUi?.layout() !== 'tablet-landscape') return;
    const runtime = typeof window.JETLEnsureRuntime === 'function' ? window.JETLEnsureRuntime() : window.JETLRuntimeReady;
    Promise.resolve(runtime).then((ready) => {
        if (ready !== false && typeof window.ensureJETLMap === 'function') window.ensureJETLMap();
    }).catch((error) => console.error('[JETL] Visor no disponible', error));
}

function initTabletResults() {
    const panel = document.getElementById('bottom-panel');
    if (!panel) return;
    initResize(panel);
    panel.addEventListener('click', (event) => {
        if (window.JETLUi?.layout() !== 'tablet-landscape' || !event.target.closest('.panel-sheet-close')) return;
        // Con el mapa ampliado el lienzo está oculto: cerrar vuelve al flujo, no lo deja en blanco.
        if (document.body.classList.contains('map-panel-maximized')) window.toggleMapPanelExpand?.(false);
        document.body.classList.add('results-hidden');
        JETLEvents.emit('canvas:fit');
    });
    window.addEventListener('jetl:ui-change', (event) => {
        if (event.detail?.layout === 'tablet-landscape') prepareDockedResults();
        // Ampliar el mapa oculta el lienzo: fuera del modo estudio se deshace.
        else if (document.body.classList.contains('map-panel-maximized')) window.toggleMapPanelExpand?.(false);
    });
    prepareDockedResults();
}

export { initTabletResults };

(function () {
    'use strict';

    const mobileQuery = window.matchMedia('(max-width: 768px)');

    function isMobile() {
        return mobileQuery.matches;
    }

    function setActive(view) {
        const nativeState = document.getElementById(`mobile-state-${view}`);
        if (nativeState) nativeState.checked = true;
        document.querySelectorAll('[data-mobile-view]').forEach((button) => {
            button.classList.toggle('active', button.dataset.mobileView === view);
        });
    }

    function closeTransientViews() {
        document.body.classList.remove('mobile-results-open', 'mobile-sheet-open');
        document.getElementById('mobile-project-sheet')?.setAttribute('aria-hidden', 'true');

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar?.classList.remove('open');
        if (overlay) overlay.style.display = 'none';
    }

    function notify(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type);
    }

    async function waitForRuntime(message) {
        if (!window.JETLRuntimeReady) return;
        if (window.__JETL_RUNTIME_STATE !== 'ready' && message) notify(message, 'info');
        const ready = await window.JETLRuntimeReady;
        if (!ready) throw window.__JETL_RUNTIME_ERROR || new Error('El motor no pudo cargarse');
    }

    function fitFlowToViewport() {
        if (!isMobile()) return;
        const flow = document.getElementById('drawflow');
        const instance = window.JETLEditor;
        const canvas = instance?.precanvas;
        if (!flow || !canvas || flow.clientWidth < 1 || flow.clientHeight < 1) return;

        const nodes = Array.from(canvas.querySelectorAll('.drawflow-node'));
        if (nodes.length === 0) {
            instance.canvas_x = 0;
            instance.canvas_y = 0;
            instance.zoom = 1;
            instance.zoom_last_value = 1;
            canvas.style.transform = 'translate(0px, 0px) scale(1)';
            return;
        }

        const minX = Math.min(...nodes.map((node) => node.offsetLeft));
        const minY = Math.min(...nodes.map((node) => node.offsetTop));
        const maxX = Math.max(...nodes.map((node) => node.offsetLeft + node.offsetWidth));
        const maxY = Math.max(...nodes.map((node) => node.offsetTop + node.offsetHeight));
        const contentWidth = Math.max(1, maxX - minX);
        const contentHeight = Math.max(1, maxY - minY);
        const padding = 20;
        const scale = Math.max(
            instance.zoom_min || 0.5,
            Math.min(1, (flow.clientWidth - padding * 2) / contentWidth, (flow.clientHeight - padding * 2) / contentHeight)
        );
        const x = (flow.clientWidth - contentWidth * scale) / 2 - minX * scale;
        const y = (flow.clientHeight - contentHeight * scale) / 2 - minY * scale;

        instance.canvas_x = x;
        instance.canvas_y = y;
        instance.zoom = scale;
        instance.zoom_last_value = scale;
        canvas.style.transformOrigin = '0 0';
        canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    function scheduleFlowFit() {
        window.requestAnimationFrame(() => window.requestAnimationFrame(fitFlowToViewport));
    }

    async function openView(view) {
        if (!isMobile()) return;

        const sameViewIsOpen =
            (view === 'nodes' && document.getElementById('sidebar')?.classList.contains('open')) ||
            (view === 'results' && document.body.classList.contains('mobile-results-open')) ||
            (view === 'project' && document.body.classList.contains('mobile-sheet-open'));

        closeTransientViews();
        if (sameViewIsOpen || view === 'flow') {
            setActive('flow');
            scheduleFlowFit();
            return;
        }

        if (view === 'nodes') {
            document.getElementById('sidebar')?.classList.add('open');
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) overlay.style.display = 'block';
        } else if (view === 'results') {
            try {
                await waitForRuntime('Preparando el visor…');
                window.ensureJETLMap?.();
                document.body.classList.add('mobile-results-open');
            } catch (error) {
                console.warn('[JETL] No se pudo iniciar el mapa', error);
                notify('No se pudo preparar el visor', 'error');
                setActive('flow');
                return;
            }
        } else if (view === 'project') {
            document.body.classList.add('mobile-sheet-open');
            document.getElementById('mobile-project-sheet')?.setAttribute('aria-hidden', 'false');
        }

        setActive(view);
    }

    async function runFlow() {
        closeTransientViews();
        setActive('flow');
        const button = document.getElementById('mobile-run');
        if (button?.disabled) return;
        if (button) button.disabled = true;
        try {
            await waitForRuntime('Preparando el motor…');
            if (typeof window.runEngine === 'function') {
                await window.runEngine();
            } else if (typeof runEngine === 'function') {
                await runEngine();
            } else {
                notify('El motor todavía no está listo', 'warning');
            }
        } catch (error) {
            console.error('[JETL] El motor no está disponible', error);
            notify('No se pudo preparar el motor', 'error');
        } finally {
            if (button) button.disabled = false;
        }
    }

    let lastHandledTouch = 0;

    function handleMobileAction(event) {
        const viewButton = event.target.closest('[data-mobile-view]');
        if (viewButton) {
            openView(viewButton.dataset.mobileView);
            return true;
        }

        if (event.target.closest('#mobile-run')) {
            runFlow();
            return true;
        }

        if (event.target.closest('#mobile-scrim, [data-mobile-close]')) {
            closeTransientViews();
            setActive('flow');
            return true;
        }

        if (isMobile() && event.target.closest('#sidebar-overlay')) {
            setActive('flow');
            return true;
        }

        if (isMobile() && event.target.closest('#mobile-project-sheet [data-ui-action]')) {
            window.setTimeout(() => {
                closeTransientViews();
                setActive('flow');
            }, 0);
            return true;
        }
        return false;
    }

    // iOS puede cancelar el `click` tras interpretar el gesto como arrastre.
    // `touchend` garantiza una activación y el filtro temporal evita duplicarla.
    document.addEventListener('touchend', (event) => {
        const projectAction = event.target.closest('#mobile-project-sheet [data-ui-action]');
        if (isMobile() && projectAction) {
            lastHandledTouch = Date.now();
            event.preventDefault();
            projectAction.click();
            window.setTimeout(() => {
                closeTransientViews();
                setActive('flow');
            }, 0);
            return;
        }
        if (!isMobile() || !handleMobileAction(event)) return;
        lastHandledTouch = Date.now();
        event.preventDefault();
    }, { passive: false });

    document.addEventListener('click', (event) => {
        if (Date.now() - lastHandledTouch < 700) return;
        handleMobileAction(event);
    });

    mobileQuery.addEventListener?.('change', () => {
        if (!isMobile()) closeTransientViews();
        else scheduleFlowFit();
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (!isMobile()) return;
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(scheduleFlowFit, 120);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleFlowFit, { once: true });
    } else {
        scheduleFlowFit();
    }

    window.JETLMobile = { openView, closeTransientViews, fitFlowToViewport };
})();

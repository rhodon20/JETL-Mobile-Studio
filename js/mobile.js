(function () {
    'use strict';

    const mobileQuery = window.matchMedia('(max-width: 768px)');

    function isMobile() {
        return mobileQuery.matches;
    }

    function setActive(view) {
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

    function openView(view) {
        if (!isMobile()) return;

        const sameViewIsOpen =
            (view === 'nodes' && document.getElementById('sidebar')?.classList.contains('open')) ||
            (view === 'results' && document.body.classList.contains('mobile-results-open')) ||
            (view === 'project' && document.body.classList.contains('mobile-sheet-open'));

        closeTransientViews();
        if (sameViewIsOpen || view === 'flow') {
            setActive('flow');
            return;
        }

        if (view === 'nodes') {
            document.getElementById('sidebar')?.classList.add('open');
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) overlay.style.display = 'block';
        } else if (view === 'results') {
            document.body.classList.add('mobile-results-open');
        } else if (view === 'project') {
            document.body.classList.add('mobile-sheet-open');
            document.getElementById('mobile-project-sheet')?.setAttribute('aria-hidden', 'false');
        }

        setActive(view);
    }

    function runFlow() {
        closeTransientViews();
        setActive('flow');
        if (typeof window.runEngine === 'function') {
            window.runEngine();
        } else if (typeof runEngine === 'function') {
            runEngine();
        } else if (typeof window.showToast === 'function') {
            window.showToast('El motor todavía no está listo', 'warn');
        }
    }

    document.addEventListener('click', (event) => {
        const viewButton = event.target.closest('[data-mobile-view]');
        if (viewButton) {
            openView(viewButton.dataset.mobileView);
            return;
        }

        if (event.target.closest('#mobile-run')) {
            runFlow();
            return;
        }

        if (event.target.closest('#mobile-scrim, [data-mobile-close]')) {
            closeTransientViews();
            setActive('flow');
            return;
        }

        if (isMobile() && event.target.closest('#sidebar-overlay')) {
            setActive('flow');
            return;
        }

        if (isMobile() && event.target.closest('#mobile-project-sheet [data-ui-action]')) {
            window.setTimeout(() => {
                closeTransientViews();
                setActive('flow');
            }, 0);
        }
    });

    mobileQuery.addEventListener?.('change', () => {
        if (!isMobile()) closeTransientViews();
    });

    window.JETLMobile = { openView, closeTransientViews };
})();

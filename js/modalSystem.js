(function () {
    'use strict';

    let activeModal = null;
    let returnFocus = null;

    function visible(modal) {
        return modal && window.getComputedStyle(modal).display !== 'none';
    }

    function focusable(modal) {
        return Array.from(modal.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.offsetParent !== null);
    }

    function syncModal(modal) {
        if (!visible(modal)) {
            if (modal.classList.contains('is-open')) modal.classList.remove('is-open');
            if (modal.getAttribute('aria-hidden') !== 'true') modal.setAttribute('aria-hidden', 'true');
            if (activeModal === modal) {
                activeModal = null;
                if (document.body.classList.contains('modal-open')) document.body.classList.remove('modal-open');
                if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
                returnFocus = null;
            }
            return;
        }

        const becameActive = activeModal !== modal;
        if (becameActive) {
            returnFocus = document.activeElement;
            activeModal = modal;
        }
        if (modal.getAttribute('aria-hidden') !== 'false') modal.setAttribute('aria-hidden', 'false');
        if (!document.body.classList.contains('modal-open')) document.body.classList.add('modal-open');
        if (!modal.classList.contains('is-open')) {
            window.requestAnimationFrame(() => {
                if (visible(modal) && !modal.classList.contains('is-open')) modal.classList.add('is-open');
            });
        }
        if (becameActive) {
            window.setTimeout(() => focusable(modal)[0]?.focus({ preventScroll: true }), 40);
        }
    }

    function closeModal(modal) {
        const closeButton = modal?.querySelector('[data-ui-action^="close-"]');
        if (closeButton) closeButton.click();
    }

    function observe(modal) {
        if (modal.dataset.modalSystem === '1') return;
        modal.dataset.modalSystem = '1';
        modal.setAttribute('aria-hidden', 'true');
        new MutationObserver(() => syncModal(modal)).observe(modal, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        syncModal(modal);
    }

    document.querySelectorAll('.modal').forEach(observe);

    document.addEventListener('click', (event) => {
        const modal = event.target.classList?.contains('modal') ? event.target : null;
        if (modal) closeModal(modal);
    });

    document.addEventListener('keydown', (event) => {
        if (!activeModal) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal(activeModal);
            return;
        }
        if (event.key !== 'Tab') return;
        const items = focusable(activeModal);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    window.JETLModalSystem = { closeActive: () => closeModal(activeModal) };
})();

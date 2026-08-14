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
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            if (activeModal === modal) {
                activeModal = null;
                document.body.classList.remove('modal-open');
                if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
                returnFocus = null;
            }
            return;
        }

        if (activeModal !== modal) {
            returnFocus = document.activeElement;
            activeModal = modal;
        }
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        window.requestAnimationFrame(() => modal.classList.add('is-open'));
        window.setTimeout(() => focusable(modal)[0]?.focus({ preventScroll: true }), 40);
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

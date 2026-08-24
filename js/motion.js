(function () {
    'use strict';

    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const EASING = {
        standard: 'easeOutCubic',
        emphasized: 'easeOutQuart'
    };

    function elements(targets) {
        if (!targets) return [];
        if (typeof targets === 'string') return Array.from(document.querySelectorAll(targets));
        if (targets instanceof Element) return [targets];
        return Array.from(targets).filter(Boolean);
    }

    function reduced() {
        return !!reducedMotionQuery?.matches;
    }

    function clear(items) {
        elements(items).forEach((item) => {
            item.style.removeProperty('opacity');
            item.style.removeProperty('transform');
        });
    }

    function nativeAnimate(items, keyframes, options) {
        elements(items).forEach((item, index) => {
            if (typeof item.animate !== 'function') return;
            item.animate(keyframes, {
                duration: options.duration,
                delay: (options.delay || 0) + (options.stagger || 0) * index,
                easing: options.cssEasing || 'cubic-bezier(.2,.8,.2,1)'
            });
        });
    }

    function enterNode(target) {
        const items = elements(target);
        if (!items.length || reduced()) return clear(items);
        if (typeof window.anime === 'function') {
            window.anime.remove(items);
            return window.anime({
                targets: items,
                opacity: [0, 1],
                translateY: [8, 0],
                scale: [.97, 1],
                duration: 220,
                easing: EASING.standard,
                complete: () => clear(items)
            });
        }
        nativeAnimate(items, [
            { opacity: 0, transform: 'translateY(8px) scale(.97)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ], { duration: 220 });
    }

    function surfaceIn(target) {
        const items = elements(target);
        if (!items.length || reduced()) return clear(items);
        if (typeof window.anime === 'function') {
            window.anime.remove(items);
            return window.anime({
                targets: items,
                opacity: [0, 1],
                translateY: [10, 0],
                duration: 190,
                easing: EASING.emphasized,
                complete: () => clear(items)
            });
        }
        nativeAnimate(items, [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 190 });
    }

    function staggerIn(targets) {
        const items = elements(targets);
        if (!items.length || reduced()) return clear(items);
        if (typeof window.anime === 'function') {
            window.anime.remove(items);
            return window.anime({
                targets: items,
                opacity: [0, 1],
                translateY: [6, 0],
                delay: window.anime.stagger(28),
                duration: 170,
                easing: EASING.standard,
                complete: () => clear(items)
            });
        }
        nativeAnimate(items, [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 170, stagger: 28 });
    }

    function press(target) {
        const items = elements(target);
        if (!items.length || reduced()) return;
        if (typeof window.anime === 'function') {
            window.anime.remove(items);
            return window.anime({
                targets: items,
                scale: [.96, 1],
                duration: 150,
                easing: EASING.standard,
                complete: () => clear(items)
            });
        }
        nativeAnimate(items, [
            { transform: 'scale(.96)' },
            { transform: 'scale(1)' }
        ], { duration: 150 });
    }

    function navigation(view) {
        const active = document.querySelector(`[data-mobile-view="${view}"]`);
        press(active);
        const surface = view === 'nodes'
            ? document.getElementById('sidebar')
            : view === 'project'
                ? document.getElementById('mobile-project-sheet')
                : view === 'results'
                    ? document.getElementById('bottom-panel')
                    : null;
        if (surface) surfaceIn(surface);
    }

    function modalIn(modal) {
        surfaceIn(modal?.querySelector('.modal-content'));
    }

    window.JETLMotion = Object.freeze({
        enterNode,
        modalIn,
        navigation,
        press,
        reduced,
        staggerIn,
        surfaceIn
    });
})();

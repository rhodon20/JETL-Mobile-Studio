(function (root) {
    'use strict';

    const PROJECT_VERSION = '2026.08.25';
    const MAX_READER_FEATURES = 5000;
    const MAX_READER_CHARS = 2 * 1024 * 1024;

    function clone(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function normalizeReaderCopy(value) {
        let copy = value;
        if (typeof copy === 'string') {
            if (!copy.trim() || copy.length > MAX_READER_CHARS) return null;
            try { copy = JSON.parse(copy); } catch (_) { return null; }
        }
        if (!copy || copy.type !== 'FeatureCollection' || !Array.isArray(copy.features)) return null;
        if (copy.features.length > MAX_READER_FEATURES) return null;
        const serialized = JSON.stringify(copy);
        if (serialized.length > MAX_READER_CHARS) return null;
        const normalized = clone(copy);
        normalized.metadata = {
            ...(normalized.metadata || {}),
            edited_copy: true,
            source_mode: 'project_working_copy',
            feature_count: normalized.features.length
        };
        return normalized;
    }

    function collectReaderWorkingCopies(documentRef) {
        const copies = {};
        const nodes = documentRef?.querySelectorAll?.('.drawflow-node') || [];
        Array.from(nodes).forEach((nodeEl) => {
            const storage = nodeEl.querySelector?.('[df-reader-edited-data]');
            const copy = normalizeReaderCopy(storage?.value || '');
            const nodeId = String(nodeEl.id || '').replace(/^node-/, '');
            if (copy && nodeId) copies[nodeId] = copy;
        });
        return copies;
    }

    function createProject(flow, documentRef, timestamp = Date.now()) {
        return {
            version: PROJECT_VERSION,
            timestamp,
            flow,
            reader_working_copies: collectReaderWorkingCopies(documentRef)
        };
    }

    function parseProject(payload) {
        if (!payload || typeof payload !== 'object') throw new Error('Proyecto no válido');
        return {
            flow: payload.flow || payload,
            readerWorkingCopies: payload.reader_working_copies && typeof payload.reader_working_copies === 'object'
                ? payload.reader_working_copies
                : {}
        };
    }

    function commitControl(control, serialized) {
        control.value = serialized;
        if (typeof Event === 'function' && typeof control.dispatchEvent === 'function') {
            control.dispatchEvent(new Event('input', { bubbles: true }));
            control.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function restoreReaderWorkingCopies(documentRef, copies) {
        const report = { restored: 0, skipped: 0 };
        Object.entries(copies || {}).forEach(([nodeId, value]) => {
            const copy = normalizeReaderCopy(value);
            const nodeEl = documentRef?.getElementById?.('node-' + nodeId);
            const storage = nodeEl?.querySelector?.('[df-reader-edited-data]');
            if (!copy || !storage) { report.skipped += 1; return; }
            commitControl(storage, JSON.stringify(copy));
            const summary = nodeEl.querySelector?.('[data-reader-file-summary]');
            if (summary) summary.textContent = `Copia del proyecto · ${copy.features.length} entidades`;
            report.restored += 1;
        });
        return report;
    }

    root.JETLProjectPersistence = {
        version: PROJECT_VERSION,
        limits: { readerFeatures: MAX_READER_FEATURES, readerChars: MAX_READER_CHARS },
        normalizeReaderCopy,
        collectReaderWorkingCopies,
        createProject,
        parseProject,
        restoreReaderWorkingCopies
    };
})(typeof window !== 'undefined' ? window : globalThis);

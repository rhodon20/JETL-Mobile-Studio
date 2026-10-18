// Panel «Validar flujo»: ejecuta validateFlow sobre el lienzo y lista las
// incidencias; tocar una lleva al nodo. Saber si un lector tiene origen depende
// del DOM y de las cachés de archivos, así que se resuelve aquí.
import { validateFlow } from '../engine/validate.js';
import { _getGraphDataSafe } from '../engine/dirty.js';
import { focusFlowNode } from './catalog.js';

const LEVELS = {
    error: { icon: 'fa-circle-xmark', label: 'Error' },
    warn: { icon: 'fa-triangle-exclamation', label: 'Aviso' },
    info: { icon: 'fa-circle-info', label: 'Sugerencia' }
};

function hasReaderSource(nodeId) {
    const el = document.getElementById('node-' + nodeId);
    if (!el) return true;
    const fileInput = el.querySelector('input[type="file"]');
    if (fileInput) {
        const stored = window.JETLReaderFileStore?.get?.(el);
        return !!(window._file_cache?.['file_' + nodeId]
            || (Array.isArray(stored) && stored.length)
            || fileInput.files?.length
            || el.querySelector('[df-reader-edited-data]')?.value.trim());
    }
    // Lectores de URL o texto: basta con algún campo escrito.
    return [...el.querySelectorAll('input[type="text"], input:not([type]), textarea')].some((control) => control.value.trim());
}

function nodeLabel(nodeId) {
    const node = nodeId && editor.getNodeFromId(nodeId);
    const tool = node && TOOL_REGISTRY[node.name];
    return node ? `${tool ? tool.label : node.name} #${nodeId}` : 'Flujo';
}

function ensureModal() {
    let modal = document.getElementById('validation-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'validation-modal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'validation-title');
    modal.innerHTML = `<div class="modal-content validation-content">
        <div class="modal-header">
            <div class="modal-title"><i class="fas fa-list-check"></i><div><strong id="validation-title">Validación del flujo</strong><small id="validation-summary"></small></div></div>
            <button class="modal-close" type="button" data-validation-close aria-label="Cerrar"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body"><div id="validation-list"></div></div>
    </div>`;
    modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target.closest('[data-validation-close]')) closeValidation();
        const item = event.target.closest('[data-validation-node]');
        if (!item) return;
        const nodeId = item.getAttribute('data-validation-node');
        closeValidation();
        window.JETLNativeNav?.('flow');
        requestAnimationFrame(() => focusFlowNode(nodeId));
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) closeValidation();
    });
    document.body.append(modal);
    return modal;
}

function closeValidation() {
    const modal = document.getElementById('validation-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
}

function openValidation() {
    const issues = validateFlow(_getGraphDataSafe(), {
        registry: TOOL_REGISTRY,
        params: window.JETLParams?.getAll?.() || {},
        hasReaderSource
    });
    const modal = ensureModal();
    const counts = issues.reduce((acc, issue) => ({ ...acc, [issue.level]: (acc[issue.level] || 0) + 1 }), {});
    document.getElementById('validation-summary').textContent = issues.length
        ? [['error', 'errores', 'error'], ['warn', 'avisos', 'aviso'], ['info', 'sugerencias', 'sugerencia']]
            .filter(([level]) => counts[level]).map(([level, many, one]) => `${counts[level]} ${counts[level] === 1 ? one : many}`).join(' · ')
        : 'Sin incidencias';
    document.getElementById('validation-list').innerHTML = issues.length
        ? issues.map((issue) => {
            const level = LEVELS[issue.level];
            const target = issue.nodeId ? `data-validation-node="${JETLEscapeHtml(issue.nodeId)}"` : 'disabled';
            return `<button type="button" class="validation-item is-${issue.level}" ${target}>
                <i class="fas ${level.icon}" aria-label="${level.label}"></i>
                <span><strong>${JETLEscapeHtml(nodeLabel(issue.nodeId))}</strong>${JETLEscapeHtml(issue.message)}</span>
                ${issue.nodeId ? '<i class="fas fa-chevron-right validation-go" aria-hidden="true"></i>' : ''}
            </button>`;
        }).join('')
        : '<div class="validation-ok"><i class="fas fa-circle-check"></i><strong>Todo en orden</strong><span>No se han encontrado problemas antes de ejecutar.</span></div>';
    modal.style.display = 'flex';
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    return issues;
}

export { openValidation, closeValidation };

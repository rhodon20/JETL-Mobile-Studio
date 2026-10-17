// Monitor de la ejecución en curso (overlay y estado de cada nodo en el
// lienzo) y panel de historial. Escucha los eventos de js/engine/runPlan.js.
import { escapeFlowNavigatorHTML, focusFlowNode } from './catalog.js';

let activeRunMonitor = null;

const RUN_NODE_CLASSES = ['jetl-run-pending', 'jetl-run-running', 'jetl-run-ok', 'jetl-run-cached', 'jetl-run-error', 'jetl-run-cancelled'];

function formatLiveDuration(ms) {
    const value = Math.max(0, Number(ms || 0));
    return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s` : `${Math.round(value)} ms`;
}

function setCanvasNodeRunState(nodeId, status) {
    const node = document.getElementById('node-' + nodeId);
    if (!node) return;
    node.classList.remove(...RUN_NODE_CLASSES);
    if (status) {
        node.classList.add(`jetl-run-${status}`);
        node.dataset.runState = status;
    } else {
        delete node.dataset.runState;
    }
}

function updateRunMonitorClock() {
    if (!activeRunMonitor) return;
    const elapsed = document.getElementById('loader-elapsed');
    const nodeTime = document.getElementById('loader-node-time');
    if (elapsed) elapsed.textContent = formatLiveDuration(Date.now() - activeRunMonitor.startedAt);
    if (nodeTime) nodeTime.textContent = activeRunMonitor.currentStartedAt
        ? `Nodo actual: ${formatLiveDuration(Date.now() - activeRunMonitor.currentStartedAt)}` : '';
}

function renderRunMonitor() {
    if (!activeRunMonitor) return;
    const total = activeRunMonitor.plannedIds.length;
    const done = activeRunMonitor.completedIds.size;
    const progress = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const progressText = document.getElementById('loader-progress-text');
    const progressBar = document.getElementById('loader-progress-bar');
    if (progressText) progressText.textContent = `${done}/${total} nodos · ${progress}%`;
    if (progressBar) progressBar.style.width = `${progress}%`;
    updateRunMonitorClock();
}

function startRunMonitor(label, plannedIds) {
    if (activeRunMonitor?.timer) clearInterval(activeRunMonitor.timer);
    if (activeRunMonitor?.closeTimer) clearTimeout(activeRunMonitor.closeTimer);
    const ids = (plannedIds || []).map(String);
    document.querySelectorAll('.drawflow-node').forEach((node) => {
        node.classList.remove(...RUN_NODE_CLASSES);
        delete node.dataset.runState;
    });
    ids.forEach((id) => setCanvasNodeRunState(id, 'pending'));
    activeRunMonitor = { label, plannedIds: ids, completedIds: new Set(), startedAt: Date.now(), currentNodeId: null, currentStartedAt: null, errorNodeId: null, timer: null, closeTimer: null };
    const loader = document.getElementById('loader');
    const title = document.getElementById('loader-title');
    const message = document.getElementById('loader-msg');
    const cancel = document.getElementById('loader-cancel');
    const close = document.getElementById('loader-close');
    const focusError = document.getElementById('loader-focus-error');
    if (loader) { loader.style.display = 'flex'; loader.dataset.status = 'running'; }
    if (title) title.textContent = label;
    if (message) message.textContent = 'Preparando flujo…';
    if (cancel) cancel.hidden = false;
    if (close) close.hidden = true;
    if (focusError) focusError.hidden = true;
    renderRunMonitor();
    activeRunMonitor.timer = setInterval(updateRunMonitorClock, 100);
}

function updateRunMonitorNode(nodeId, patch) {
    if (!activeRunMonitor || !patch?.status) return;
    const id = String(nodeId);
    const graphNode = _getGraphDataSafe()[id];
    const tool = graphNode?.name ? window.TOOL_REGISTRY?.[graphNode.name] : null;
    const label = tool?.label || graphNode?.name || `Nodo #${id}`;
    const terminal = ['ok', 'cached', 'error', 'cancelled'].includes(patch.status);
    if (patch.status === 'running') {
        activeRunMonitor.currentNodeId = id;
        activeRunMonitor.currentStartedAt = Date.now();
    }
    if (terminal) {
        activeRunMonitor.completedIds.add(id);
        if (activeRunMonitor.currentNodeId === id) activeRunMonitor.currentStartedAt = null;
    }
    if (patch.status === 'error') activeRunMonitor.errorNodeId = id;
    setCanvasNodeRunState(id, patch.status);
    const message = document.getElementById('loader-msg');
    if (message) {
        if (patch.status === 'running') message.textContent = `Ejecutando ${label} (#${id})`;
        else if (patch.status === 'cached') message.textContent = `${label} recuperado de caché`;
        else if (patch.status === 'error') message.textContent = `Error en ${label}: ${patch.error || 'error desconocido'}`;
        else if (patch.status === 'ok') message.textContent = `${label} completado en ${formatLiveDuration(patch.ms)}`;
    }
    renderRunMonitor();
}

function finishRunMonitor(status, errorNodeId = null) {
    if (!activeRunMonitor) return;
    if (activeRunMonitor.timer) clearInterval(activeRunMonitor.timer);
    activeRunMonitor.timer = null;
    if (status === 'cancelled') {
        activeRunMonitor.plannedIds.forEach((id) => {
            if (!activeRunMonitor.completedIds.has(id)) setCanvasNodeRunState(id, 'cancelled');
        });
    }
    const loader = document.getElementById('loader');
    const message = document.getElementById('loader-msg');
    const cancel = document.getElementById('loader-cancel');
    const close = document.getElementById('loader-close');
    const focusError = document.getElementById('loader-focus-error');
    const resolvedErrorId = errorNodeId || activeRunMonitor.errorNodeId;
    if (loader) loader.dataset.status = status;
    if (cancel) cancel.hidden = true;
    if (close) close.hidden = status !== 'error';
    if (focusError) {
        focusError.hidden = status !== 'error' || !resolvedErrorId;
        focusError.dataset.nodeId = resolvedErrorId || '';
    }
    if (message) {
        if (status === 'ok') message.textContent = 'Flujo completado';
        else if (status === 'cancelled') message.textContent = 'Ejecución cancelada';
        else if (status === 'error' && !resolvedErrorId) message.textContent = 'La ejecución terminó con error';
    }
    renderRunMonitor();
    if (status !== 'error') {
        const monitor = activeRunMonitor;
        monitor.closeTimer = setTimeout(() => {
            if (activeRunMonitor === monitor) closeRunMonitor();
        }, status === 'ok' ? 700 : 1200);
    }
}

function closeRunMonitor() {
    if (activeRunMonitor?.timer) clearInterval(activeRunMonitor.timer);
    if (activeRunMonitor?.closeTimer) clearTimeout(activeRunMonitor.closeTimer);
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    activeRunMonitor = null;
}

JETLEvents.on('run:start', (e) => startRunMonitor(e.label, e.plannedIds));
JETLEvents.on('run:node', (e) => updateRunMonitorNode(e.id, e.patch));
JETLEvents.on('run:finish', (e) => finishRunMonitor(e.status, e.errorNodeId));

let selectedRunHistoryId = null;
let runHistoryNodeFilter = '';
JETLEvents.on('run:recorded', (entry) => { selectedRunHistoryId = entry.history_id; });

function formatRunDuration(ms) {
    const value = Number(ms || 0);
    return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s` : `${Math.round(value)} ms`;
}

function renderRunHistory() {
    const list = document.getElementById('run-history-list');
    const detail = document.getElementById('run-history-detail');
    const count = document.getElementById('run-history-count');
    if (!list || !detail) return;
    const history = loadRunHistory();
    if (count) count.textContent = `${history.length} ejecución${history.length === 1 ? '' : 'es'}`;
    if (!history.length) {
        list.innerHTML = '';
        detail.innerHTML = `<div class="run-history-empty"><i class="fas fa-clock-rotate-left"></i><strong>Todavía no hay ejecuciones</strong><span>Las ejecuciones completas y parciales aparecerán aquí.</span></div>`;
        return;
    }
    if (!selectedRunHistoryId || !history.some((report) => report.history_id === selectedRunHistoryId)) {
        selectedRunHistoryId = history[0].history_id;
    }
    const statusLabels = { ok: 'Completada', error: 'Error', cancelled: 'Cancelada', unknown: 'Sin estado' };
    list.innerHTML = history.map((report) => {
        const date = new Date(report.generated_at || report.run_id || Date.now());
        const summary = report.summary || {};
        const active = report.history_id === selectedRunHistoryId;
        return `<button type="button" class="run-history-item run-status-${escapeFlowNavigatorHTML(report.status || 'unknown')}${active ? ' active' : ''}" data-run-history-id="${escapeFlowNavigatorHTML(report.history_id)}">
            <span class="run-history-status" aria-hidden="true"></span>
            <div class="run-history-copy">
                <strong>${escapeFlowNavigatorHTML(report.label || 'Ejecución')}</strong>
                <small>${escapeFlowNavigatorHTML(date.toLocaleString('es-ES'))} · ${summary.processed_nodes ?? summary.nodes ?? 0}/${summary.planned_nodes ?? summary.nodes ?? 0} nodos</small>
            </div>
            <span class="run-history-badge">${escapeFlowNavigatorHTML(statusLabels[report.status] || report.status || 'Sin estado')}</span>
            <strong class="run-history-duration">${formatRunDuration(report.duration_ms ?? summary.total_ms)}</strong>
        </button>`;
    }).join('');

    const selected = history.find((report) => report.history_id === selectedRunHistoryId) || history[0];
    const summary = selected.summary || {};
    const needle = runHistoryNodeFilter.trim().toLocaleLowerCase('es');
    const nodes = (selected.nodes || []).filter((node) => !needle || [node.id, node.label, node.node, node.category, node.status]
        .join(' ').toLocaleLowerCase('es').includes(needle));
    const nodeRows = nodes.map((node) => {
        const outputs = Object.entries(node.outputs || {}).map(([port, value]) => `${port}: ${value}`).join(' · ') || '—';
        const state = node.status === 'ok' ? 'Ejecutado' : node.status === 'cached' ? 'Caché' : node.status === 'error' ? 'Error' : node.status === 'cancelled' ? 'Cancelado' : 'No ejecutado';
        return `<tr data-run-node-id="${escapeFlowNavigatorHTML(node.id)}">
            <td><button type="button" class="run-history-node-link" data-run-node-id="${escapeFlowNavigatorHTML(node.id)}">${escapeFlowNavigatorHTML(node.label)} <small>#${escapeFlowNavigatorHTML(node.id)}</small></button>${node.error ? `<span class="run-history-node-error">${escapeFlowNavigatorHTML(node.error)}</span>` : ''}</td>
            <td><span class="run-node-state run-node-${escapeFlowNavigatorHTML(node.status)}">${state}</span></td>
            <td>${node.count || 0}<small>${escapeFlowNavigatorHTML(outputs)}</small></td>
            <td>${formatRunDuration(node.ms)}</td>
        </tr>`;
    }).join('');
    detail.innerHTML = `<div class="run-history-detail-head">
        <div><strong>${escapeFlowNavigatorHTML(selected.label || 'Ejecución')}</strong><small>${escapeFlowNavigatorHTML(new Date(selected.started_at || selected.generated_at).toLocaleString('es-ES'))}</small></div>
        <span class="run-history-badge">${escapeFlowNavigatorHTML(statusLabels[selected.status] || selected.status || 'Sin estado')}</span>
    </div>
    <div class="run-history-kpis">
        <div><span>Duración</span><strong>${formatRunDuration(selected.duration_ms ?? summary.total_ms)}</strong></div>
        <div><span>Procesados</span><strong>${summary.processed_nodes ?? summary.nodes ?? 0}/${summary.planned_nodes ?? summary.nodes ?? 0}</strong></div>
        <div><span>Ejecutados</span><strong>${summary.executed_nodes ?? 0}</strong></div>
        <div><span>Caché</span><strong>${summary.cached_nodes ?? 0}</strong></div>
        <div><span>Features</span><strong>${summary.total_features ?? 0}</strong></div>
        <div><span>Errores</span><strong>${summary.error_nodes ?? (selected.status === 'error' ? 1 : 0)}</strong></div>
        <div><span>Cancelados</span><strong>${summary.cancelled_nodes ?? 0}</strong></div>
    </div>
    ${selected.error ? `<div class="run-history-error"><i class="fas fa-triangle-exclamation"></i>${escapeFlowNavigatorHTML(selected.error)}</div>` : ''}
    <label class="run-history-filter"><i class="fas fa-filter"></i><input id="run-history-node-filter" type="search" value="${escapeFlowNavigatorHTML(runHistoryNodeFilter)}" placeholder="Filtrar nodos…"><span>${nodes.length}/${(selected.nodes || []).length}</span></label>
    <div class="run-history-table-wrap"><table class="run-history-node-table"><thead><tr><th>Nodo</th><th>Estado</th><th>Features / salidas</th><th>Tiempo</th></tr></thead><tbody>${nodeRows || '<tr><td colspan="4">Sin nodos coincidentes</td></tr>'}</tbody></table></div>`;
}

function closeRunHistory() {
    const modal = document.getElementById('run-history-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
}

function initRunHistory() {
    const modal = document.getElementById('run-history-modal');
    if (!modal || modal.dataset.ready === 'true') return;
    modal.dataset.ready = 'true';
    modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target.closest('[data-run-history-close]')) closeRunHistory();
        const clear = event.target.closest('[data-run-history-clear]');
        if (clear) {
            SafeStorage.clear(RUN_HISTORY_KEY);
            selectedRunHistoryId = null;
            runHistoryNodeFilter = '';
            renderRunHistory();
            showToast('Historial borrado', 'success');
        }
        const historyItem = event.target.closest('[data-run-history-id]');
        if (historyItem) {
            selectedRunHistoryId = historyItem.getAttribute('data-run-history-id');
            runHistoryNodeFilter = '';
            renderRunHistory();
        }
        const exportButton = event.target.closest('[data-run-history-export]');
        if (exportButton) {
            const selected = loadRunHistory().find((report) => report.history_id === selectedRunHistoryId) || loadRunHistory()[0];
            if (selected) downloadRunReport(exportButton.getAttribute('data-run-history-export'), selected);
        }
        const focus = event.target.closest('[data-run-node-id]');
        if (focus) {
            const id = focus.getAttribute('data-run-node-id');
            closeRunHistory();
            window.JETLNativeNav?.('flow');
            requestAnimationFrame(() => focusFlowNode(id));
        }
    });
    modal.addEventListener('input', (event) => {
        if (event.target?.id !== 'run-history-node-filter') return;
        runHistoryNodeFilter = event.target.value || '';
        renderRunHistory();
        requestAnimationFrame(() => {
            const input = document.getElementById('run-history-node-filter');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) closeRunHistory();
    });
}

function openRunHistory() {
    const modal = document.getElementById('run-history-modal');
    if (!modal) return false;
    initRunHistory();
    window.JETLNativeNav?.('flow');
    selectedRunHistoryId = loadRunHistory()[0]?.history_id || null;
    runHistoryNodeFilter = '';
    renderRunHistory();
    modal.style.display = 'flex';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    return true;
}

window.JETLRunHistory = { load: loadRunHistory, record: publishRunReport, render: renderRunHistory };
window.JETLOpenRunHistory = openRunHistory;
window.JETLCloseRunHistory = closeRunHistory;

export { closeRunMonitor };

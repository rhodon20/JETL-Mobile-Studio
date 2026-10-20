// Botón central «Acciones»: abre un panel con la acción más probable arriba y el
// resto en rejilla. Lo que ofrece depende del contexto: sin selección, el flujo;
// con un nodo seleccionado, ese nodo. Durante una ejecución el botón la cancela.
// Las acciones que ya tenían un data-ui-action lo reutilizan (shell.js y
// params.js las atienden); el resto se resuelve aquí.
import {
    runEnginePartial, cancelEngineRun, duplicateNode, getSingleSelectedCanvasNodeId
} from '../engine.js';
import { collectRequiredNodeIds } from '../engine/runPlan.js';
import { _getGraphDataSafe } from '../engine/dirty.js';
import { loadRunHistory } from '../state/runHistory.js';
import { formatRunDuration } from './runPanel.js';
import { focusFlowNode } from './catalog.js';
import { isSelecting, pickedIds, startSelection, stopSelection, setPicked, pickAll } from './multiSelect.js';
import { duplicateNodes, removeNodes } from '../engine.js';
import { openValidation } from './validationPanel.js';
import { annotate, noteForNode } from './annotations.js';

let running = false;

const FLOW_ITEMS = [
    { icon: 'fa-magnifying-glass-location', label: 'Buscar en el lienzo', ui: 'open-flow-navigator' },
    { icon: 'fa-list-check', label: 'Validar flujo', hub: 'validate' },
    { icon: 'fa-object-group', label: 'Seleccionar varios', hub: 'select' },
    { icon: 'fa-note-sticky', label: 'Nota', hub: 'note' },
    { icon: 'fa-expand', label: 'Encuadrar', hub: 'fit' },
    { icon: 'fa-layer-group', label: 'Plantillas', ui: 'open-templates' },
    { icon: 'fa-sliders', label: 'Parámetros', ui: 'open-params' }
];

const NODE_ITEMS = [
    { icon: 'fa-map-location-dot', label: 'Ver resultado', hub: 'view' },
    { icon: 'fa-note-sticky', label: 'Anotar', hub: 'annotate' },
    { icon: 'fa-clone', label: 'Duplicar', hub: 'duplicate' },
    { icon: 'fa-crosshairs', label: 'Centrar', hub: 'center' },
    { icon: 'fa-object-group', label: 'Seleccionar varios', hub: 'select' },
    { icon: 'fa-play', label: 'Ejecutar todo', hub: 'run-all' },
    { icon: 'fa-trash-can', label: 'Eliminar', hub: 'delete', danger: true }
];

const SELECTION_ITEMS = [
    { icon: 'fa-check-double', label: 'Todos', hub: 'pick-all' },
    { icon: 'fa-ban', label: 'Ninguno', hub: 'pick-none' },
    { icon: 'fa-check', label: 'Terminar', hub: 'select-done' },
    { icon: 'fa-trash-can', label: 'Eliminar', hub: 'delete-group', danger: true }
];

function lastFullRun() {
    const report = loadRunHistory().find((entry) => entry.scope === 'full');
    return report ? `última: ${formatRunDuration(report.duration_ms)}` : '';
}

function nodeLabel(id) {
    const node = editor.getNodeFromId(id);
    const tool = node && TOOL_REGISTRY[node.name];
    return `${tool ? tool.label : 'Nodo'} #${id}`;
}

function itemHtml(item) {
    const attr = item.ui ? `data-ui-action="${item.ui}"` : `data-hub-action="${item.hub}"`;
    return `<button type="button" class="action-hub-item${item.danger ? ' danger' : ''}" ${attr}><i class="fas ${item.icon}" aria-hidden="true"></i><span>${item.label}</span></button>`;
}

const plural = (n) => `${n} ${n === 1 ? 'nodo' : 'nodos'}`;

// Cabecera de hoja, la misma que Proyecto, Nodos o Historial.
function sheetHead(kicker, title) {
    return `<div class="mobile-sheet-header action-hub-head"><div><small>${kicker}</small><strong>${title}</strong></div>
        <button type="button" class="mobile-sheet-close" data-hub-close aria-label="Cerrar"><i class="fas fa-times"></i></button></div>`;
}

function render(panel) {
    if (isSelecting()) {
        const count = pickedIds().length;
        panel.dataset.nodeId = '';
        panel.innerHTML = `${sheetHead('SELECCIÓN', plural(count))}
            <button type="button" class="action-hub-primary" data-hub-action="duplicate-group" ${count ? '' : 'disabled'}><i class="fas fa-clone" aria-hidden="true"></i><span>Duplicar ${plural(count)}</span><small>con sus conexiones</small></button>
            <div class="action-hub-grid">${SELECTION_ITEMS.map(itemHtml).join('')}</div>`;
        return;
    }
    const nodeId = getSingleSelectedCanvasNodeId();
    const node = nodeId && editor.getNodeFromId(nodeId);
    let head, primary, items;
    if (node) {
        const planned = collectRequiredNodeIds(nodeId, _getGraphDataSafe()).length;
        head = sheetHead('NODO SELECCIONADO', JETLEscapeHtml(nodeLabel(nodeId)));
        primary = { icon: 'fa-forward-step', label: 'Ejecutar hasta aquí', hub: 'run-to', note: `${planned} ${planned === 1 ? 'nodo' : 'nodos'}` };
        items = NODE_ITEMS.map((item) => (item.hub === 'annotate' && noteForNode(nodeId) ? { ...item, label: 'Editar nota' } : item));
    } else {
        const count = Object.keys(_getGraphDataSafe()).length;
        head = sheetHead('ACCIONES', `Flujo · ${plural(count)}`);
        primary = { icon: 'fa-play', label: 'Ejecutar todo', hub: 'run-all', note: lastFullRun() };
        items = FLOW_ITEMS;
    }
    panel.dataset.nodeId = node ? String(nodeId) : '';
    panel.innerHTML = `${head}
        <button type="button" class="action-hub-primary" data-hub-action="${primary.hub}"><i class="fas ${primary.icon}" aria-hidden="true"></i><span>${primary.label}</span><small>${JETLEscapeHtml(primary.note)}</small></button>
        <div class="action-hub-grid">${items.map(itemHtml).join('')}</div>`;
}

function isOpen() {
    return document.body.classList.contains('action-hub-open');
}

function closeActionHub() {
    document.body.classList.remove('action-hub-open');
    document.getElementById('mobile-run')?.setAttribute('aria-expanded', 'false');
}

function openActionHub() {
    const panel = document.getElementById('action-hub');
    if (!panel) return;
    // Una sola hoja a la vez: Acciones sustituye a la que estuviera abierta.
    window.JETLNativeNav?.('flow');
    render(panel);
    document.body.classList.add('action-hub-open');
    document.getElementById('mobile-run')?.setAttribute('aria-expanded', 'true');
    panel.querySelector('.action-hub-primary')?.focus({ preventScroll: true });
}

function showFlow() {
    window.JETLNativeNav?.('flow');
}

async function runHubAction(action, nodeId) {
    if (action === 'select') {
        showFlow();
        startSelection(nodeId);
        return;
    }
    if (isSelecting()) {
        const ids = pickedIds();
        if (action === 'pick-all') pickAll();
        else if (action === 'pick-none') setPicked([]);
        else if (action === 'select-done') stopSelection();
        else if (action === 'duplicate-group' && ids.length) {
            setPicked(duplicateNodes(ids));
            showToast(`${plural(ids.length)} duplicados`, 'success');
        } else if (action === 'delete-group' && ids.length) {
            removeNodes(ids);
            showToast(`${plural(ids.length)} eliminados · Deshacer los recupera`, 'success');
        }
        return;
    }
    if (action === 'note') {
        showFlow();
        annotate();
        return;
    }
    if (action === 'validate') {
        openValidation();
        return;
    }
    if (action === 'run-all') {
        showFlow();
        await window.JETLRunAll?.();
    } else if (action === 'fit') {
        showFlow();
        JETLEvents.emit('canvas:fit');
    } else if (!nodeId) {
        return;
    } else if (action === 'run-to') {
        showFlow();
        await runEnginePartial(nodeId);
    } else if (action === 'view') {
        if (!executionData[nodeId]) {
            showToast('Ese nodo aún no tiene resultado: ejecútalo primero', 'warning');
            return;
        }
        await window.JETLEnsureRuntime?.();
        window.JETLNativeNav?.('results');
        await window.showOnMap?.(nodeId, null, true);
        window.switchTab?.('map');
    } else if (action === 'annotate') {
        showFlow();
        annotate(nodeId);
    } else if (action === 'duplicate') {
        showFlow();
        if (duplicateNode(nodeId)) showToast('Nodo duplicado', 'success');
    } else if (action === 'center') {
        showFlow();
        requestAnimationFrame(() => focusFlowNode(nodeId));
    } else if (action === 'delete') {
        editor.removeNodeId('node-' + nodeId);
    }
}

function setRunning(value) {
    running = value;
    const button = document.getElementById('mobile-run');
    if (!button) return;
    button.classList.toggle('is-cancel', value);
    button.setAttribute('aria-label', value ? 'Cancelar la ejecución' : 'Acciones');
    button.innerHTML = value
        ? '<i class="fas fa-stop"></i><span>Cancelar</span>'
        : '<i class="fas fa-bolt"></i><span>Acciones</span>';
    if (value) closeActionHub();
}

function initActionHub() {
    const button = document.getElementById('mobile-run');
    if (!button || document.getElementById('action-hub')) return;
    const scrim = document.createElement('div');
    scrim.id = 'action-hub-scrim';
    const panel = document.createElement('div');
    panel.id = 'action-hub';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Acciones');
    document.body.append(scrim, panel);

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (running) cancelEngineRun();
        else if (isOpen()) closeActionHub();
        else openActionHub();
    });
    scrim.addEventListener('click', closeActionHub);
    // Ir a otra vista desde el dock cierra el panel.
    document.getElementById('mobile-dock')?.addEventListener('click', (event) => {
        if (!event.target.closest('#mobile-run')) closeActionHub();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) closeActionHub();
    });
    // Los data-ui-action siguen su camino hasta shell.js; aquí sólo se cierra el panel.
    panel.addEventListener('click', (event) => {
        if (event.target.closest('[data-hub-close]')) {
            closeActionHub();
            return;
        }
        const item = event.target.closest('[data-hub-action], [data-ui-action]');
        if (!item) return;
        const nodeId = panel.dataset.nodeId || null;
        closeActionHub();
        const action = item.getAttribute('data-hub-action');
        if (action) runHubAction(action, nodeId);
        else if (item.getAttribute('data-ui-action') === 'open-flow-navigator') showFlow();
    });
    JETLEvents.on('run:start', () => setRunning(true));
    JETLEvents.on('run:finish', () => setRunning(false));
}

export { initActionHub, openActionHub, closeActionHub };

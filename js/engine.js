// =============================================
// 3. ENGINE & EVENTS
// =============================================
// editor, map, mapLayers, executionData and the runtime caches are owned by core.js.
import { _getGraphDataSafe, clearAllDirty, invalidateAllNodes } from './engine/dirty.js';
import {
    getRunErrorNodeId, buildExecutionPlan, collectRequiredNodeIds, beginRunTrace, buildRunReport
} from './engine/runPlan.js';
import { publishRunReport } from './state/runHistory.js';
import { saveDraft, loadDraft, clearDraft, hasDraft } from './state/draft.js';
import { processNode } from './processNode.js';

let selectedCanvasConnection = null;
// La conexión seleccionada la fija shell.js desde los eventos del editor.
function setSelectedCanvasConnection(connection) {
    selectedCanvasConnection = connection;
}
function updateLocalDraftUI() {
    const button = document.querySelector('[data-ui-action="restore-draft"]');
    const available = hasDraft();
    if (button) {
        button.disabled = !available;
        button.setAttribute('aria-disabled', String(!available));
        button.title = available ? 'Restaurar el borrador guardado en este navegador' : 'No hay borrador local';
    }
    window.__JETL_HAS_LOCAL_DRAFT = available;
}

function resetEditorState() {
    editor.clear();
    clearAllRuntimeCaches();
    JETLClearObject(executionData);
    clearAllDirty();
    JETLEvents.emit('workspace:reset', { clearSelection: false });
    currentRunTimestamp = 0;
    JETLEvents.emit('canvas:fit');
}

function startNewProject() {
    const graph = _getGraphDataSafe();
    if (Object.keys(graph).length > 0 && !window.confirm('¿Crear un proyecto nuevo y borrar el flujo actual?')) return;
    resetEditorState();
    clearDraft();
    updateLocalDraftUI();
    if (typeof window.showToast === 'function') window.showToast('Proyecto nuevo', 'success');
}

function restoreLocalDraft() {
    try {
        const flow = loadDraft();
        if (!flow) {
            updateLocalDraftUI();
            if (typeof window.showToast === 'function') window.showToast('No hay borrador local', 'warning');
            return false;
        }
        resetEditorState();
        editor.import(flow);
        invalidateAllNodes('draft_restored');
        JETLEvents.emit('canvas:fit');
        if (typeof window.showToast === 'function') window.showToast('Borrador restaurado', 'success');
        return true;
    } catch (error) {
        console.error('[JETL] Borrador local inválido', error);
        clearDraft();
        updateLocalDraftUI();
        if (typeof window.showToast === 'function') window.showToast('El borrador local estaba dañado', 'error');
        return false;
    }
}

window.JETLProjects = { startNew: startNewProject, restoreDraft: restoreLocalDraft, hasDraft };




function getSingleSelectedCanvasNodeId() {
    const selected = Array.from(document.querySelectorAll('.drawflow-node.selected'));
    if (selected.length === 1 && selected[0].id) return selected[0].id.replace('node-', '');
    const editorSelection = editor?.node_selected?.id;
    return editorSelection ? String(editorSelection).replace('node-', '') : null;
}

function getSelectedCanvasConnection() {
    return selectedCanvasConnection ? { ...selectedCanvasConnection } : null;
}

function getConnectionNodePlacement(connection, fallbackRect) {
    const data = _getGraphDataSafe();
    const source = data[String(connection?.output_id)];
    const target = data[String(connection?.input_id)];
    if (!source || !target || !editor?.precanvas) {
        return { x: fallbackRect.width / 2 + fallbackRect.left, y: fallbackRect.height / 2 + fallbackRect.top };
    }
    const canvasRect = editor.precanvas.getBoundingClientRect();
    const zoom = Number(editor.zoom || 1);
    return {
        x: canvasRect.left + ((Number(source.pos_x || 0) + Number(target.pos_x || 0)) / 2) * zoom,
        y: canvasRect.top + ((Number(source.pos_y || 0) + Number(target.pos_y || 0)) / 2) * zoom
    };
}

function graphHasConnection(sourceId, targetId, outputPort, inputPort) {
    const source = _getGraphDataSafe()[String(sourceId)];
    return !!source?.outputs?.[outputPort]?.connections?.some((connection) =>
        String(connection.node) === String(targetId) && connection.output === inputPort);
}

function replaceConnectionWithNode(connection, nodeId) {
    if (!connection || !nodeId || typeof editor?.removeSingleConnection !== 'function' ||
        typeof editor?.addConnection !== 'function') return false;
    const data = _getGraphDataSafe();
    const sourceId = String(connection.output_id);
    const targetId = String(connection.input_id);
    const newId = String(nodeId);
    const source = data[sourceId];
    const target = data[targetId];
    const inserted = data[newId];
    const sourcePort = connection.output_class;
    const targetPort = connection.input_class;
    const insertedInput = Object.keys(inserted?.inputs || {})[0];
    const insertedOutput = Object.keys(inserted?.outputs || {})[0];
    if (!source?.outputs?.[sourcePort] || !target?.inputs?.[targetPort] || !insertedInput || !insertedOutput) return false;
    if (!graphHasConnection(sourceId, targetId, sourcePort, targetPort)) return false;

    const removed = editor.removeSingleConnection(sourceId, targetId, sourcePort, targetPort);
    if (!removed) return false;
    try {
        editor.addConnection(sourceId, newId, sourcePort, insertedInput);
        if (!graphHasConnection(sourceId, newId, sourcePort, insertedInput)) throw new Error('No se creó la conexión de entrada');
        editor.addConnection(newId, targetId, insertedOutput, targetPort);
        if (!graphHasConnection(newId, targetId, insertedOutput, targetPort)) throw new Error('No se creó la conexión de salida');
        selectedCanvasConnection = null;
        return true;
    } catch (error) {
        editor.removeSingleConnection(sourceId, newId, sourcePort, insertedInput);
        editor.removeSingleConnection(newId, targetId, insertedOutput, targetPort);
        if (!graphHasConnection(sourceId, targetId, sourcePort, targetPort)) {
            editor.addConnection(sourceId, targetId, sourcePort, targetPort);
        }
        console.warn('[JETL] No se pudo insertar el nodo en la conexión', error);
        return false;
    }
}
window.JETLReplaceConnectionWithNode = replaceConnectionWithNode;

// Dónde va un nodo que se encadena a otro, en coordenadas del lienzo. En pantallas
// anchas, a la derecha del origen. En móvil, en zigzag a dos columnas para que el
// flujo crezca hacia abajo: desde la columna izquierda se pasa a la derecha en la
// misma fila; desde la derecha se baja a la izquierda de la fila siguiente. Si el
// hueco está ocupado (otra rama del mismo origen) se baja hasta uno libre.
const CHAIN_GAP = 75;

function chainedNodeCanvasPosition(sourceId, graph = _getGraphDataSafe(), narrow = window.innerWidth <= 768) {
    const source = graph[String(sourceId)];
    if (!source) return null;
    const sx = Number(source.pos_x || 0);
    const sy = Number(source.pos_y || 0);
    if (!narrow) return { x: sx + 300, y: sy };
    const size = (id) => {
        const el = document.getElementById('node-' + id);
        return { w: el?.offsetWidth || 240, h: el?.offsetHeight || 120 };
    };
    const { w } = size(source.id);
    const nodes = Object.values(graph);
    const leftX = Math.min(...nodes.map((node) => Number(node.pos_x || 0)));
    let x;
    let y;
    if (sx < leftX + (w + CHAIN_GAP) / 2) {
        x = sx + w + CHAIN_GAP;
        y = sy;
    } else {
        const rowBottom = Math.max(...nodes
            .filter((node) => Math.abs(Number(node.pos_y || 0) - sy) < CHAIN_GAP)
            .map((node) => Number(node.pos_y || 0) + size(node.id).h));
        x = leftX;
        y = rowBottom + CHAIN_GAP;
    }
    const overlaps = (px, py) => nodes.some((node) => {
        const nx = Number(node.pos_x || 0);
        const ny = Number(node.pos_y || 0);
        const { w: nw, h: nh } = size(node.id);
        return px < nx + nw && px + w > nx && py < ny + nh && py + 100 > ny;
    });
    for (let guard = 0; guard < 200 && overlaps(x, y); guard++) y += 25;
    return { x, y };
}

function getConnectedNodePlacement(sourceId, fallbackRect) {
    const position = editor?.precanvas ? chainedNodeCanvasPosition(sourceId) : null;
    if (!position) {
        return { x: fallbackRect.width / 2 + fallbackRect.left, y: fallbackRect.height / 2 + fallbackRect.top };
    }
    const canvasRect = editor.precanvas.getBoundingClientRect();
    const zoom = Number(editor.zoom || 1);
    return {
        x: canvasRect.left + position.x * zoom,
        y: canvasRect.top + position.y * zoom
    };
}

function connectNewNodeFromSelection(sourceId, targetId) {
    if (!sourceId || !targetId || typeof editor?.addConnection !== 'function') return false;
    const data = _getGraphDataSafe();
    const source = data[String(sourceId)];
    const target = data[String(targetId)];
    if (!source || !target) return false;
    const outputPort = Object.keys(source.outputs || {})[0];
    const inputPort = Object.keys(target.inputs || {}).find((port) => !(target.inputs[port].connections || []).length);
    if (!outputPort || !inputPort) return false;
    try {
        editor.addConnection(String(sourceId), String(targetId), outputPort, inputPort);
        return true;
    } catch (error) {
        console.warn('[JETL] No se pudo autoconectar el nodo nuevo', error);
        return false;
    }
}
window.JETLConnectNewNodeFromSelection = connectNewNodeFromSelection;

function selectCanvasNode(nodeId) {
    const node = document.getElementById('node-' + nodeId);
    if (!node) return;
    document.querySelectorAll('.drawflow-node.selected').forEach((element) => element.classList.remove('selected'));
    node.classList.add('selected');
    editor.node_selected = node;
    editor.dispatch?.('nodeSelected', String(nodeId));
}

// Copia nodos con su configuración y las conexiones entre ellos, desplazados para
// que se vean; un solo paso de deshacer. Devuelve los ids nuevos en el mismo orden.
// No copia lo que vive fuera de node.data (p. ej. el archivo elegido en un lector
// local, que el navegador no permite duplicar).
function duplicateNodes(nodeIds) {
    const sources = nodeIds.map((id) => editor.getNodeFromId(id)).filter((node) => node && TOOL_REGISTRY[node.name]);
    const copyOf = {};
    const mutation = () => {
        sources.forEach((source) => {
            const id = addNode(source.name);
            copyOf[source.id] = id;
            editor.updateNodeDataFromId(id, JSON.parse(JSON.stringify(source.data || {})));
            moveNodeTo(id, source.pos_x + CANVAS_GRID_SIZE * 2, source.pos_y + CANVAS_GRID_SIZE * 2);
        });
        sources.forEach((source) => {
            Object.entries(source.outputs || {}).forEach(([output, port]) => {
                (port.connections || []).forEach((link) => {
                    if (copyOf[link.node]) editor.addConnection(copyOf[source.id], copyOf[link.node], output, link.output);
                });
            });
        });
    };
    if (typeof window.JETLHistoryTransaction === 'function') window.JETLHistoryTransaction(mutation);
    else mutation();
    // Guarda el borrador con la configuración copiada.
    Object.values(copyOf).forEach((id) => editor.dispatch('nodeDataChanged', String(id)));
    return sources.map((source) => copyOf[source.id]);
}

function duplicateNode(nodeId) {
    const [id] = duplicateNodes([nodeId]);
    if (id) selectCanvasNode(id);
    return id || null;
}

// Elimina varios nodos como un solo paso de deshacer.
function removeNodes(nodeIds) {
    const mutation = () => nodeIds.forEach((id) => editor.removeNodeId('node-' + id));
    if (typeof window.JETLHistoryTransaction === 'function') window.JETLHistoryTransaction(mutation);
    else mutation();
}

// Ajuste a la cuadrícula del lienzo (25 px, la misma que dibuja el fondo y que usa
// Desktop). Activado por defecto: con el dedo es difícil alinear a mano.
const CANVAS_GRID_SIZE = 25;
const GRID_SNAP_KEY = 'jetl_canvas_grid_enabled';

function isGridSnapEnabled() {
    return SafeStorage.load(GRID_SNAP_KEY) !== '0';
}

function setGridSnapEnabled(enabled) {
    SafeStorage.save(GRID_SNAP_KEY, enabled ? '1' : '0');
}

// Lleva el nodo al punto de la cuadrícula más cercano. Devuelve el desplazamiento
// aplicado ({ dx, dy }) o null si no hacía falta o el ajuste está desactivado.
function snapNodeToGrid(nodeId) {
    const node = editor.drawflow.drawflow.Home.data[nodeId];
    if (!node || !isGridSnapEnabled()) return null;
    const snap = (value) => Math.round(Number(value || 0) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE;
    const dx = snap(node.pos_x) - node.pos_x;
    const dy = snap(node.pos_y) - node.pos_y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
    moveNodeTo(nodeId, node.pos_x + dx, node.pos_y + dy);
    return { dx, dy };
}

// Ajusta el número de salidas de un nodo (lectores con una salida por capa, como
// Desktop). Nunca quita una salida conectada: si sobran y tienen cables, se quedan.
function setNodeOutputCount(nodeId, count) {
    const node = editor.getNodeFromId(nodeId);
    if (!node) return;
    const target = Math.max(1, count);
    let current = Object.keys(node.outputs || {}).length;
    while (current > target && !(node.outputs[`output_${current}`]?.connections || []).length) {
        editor.removeNodeOutput(nodeId, `output_${current}`);
        current--;
    }
    while (current < target) {
        editor.addNodeOutput(nodeId);
        current++;
    }
    editor.updateConnectionNodes('node-' + nodeId);
}

// Mueve un nodo (datos y DOM) y redibuja sus conexiones.
function moveNodeTo(nodeId, x, y) {
    const node = editor.drawflow.drawflow.Home.data[nodeId];
    if (!node) return;
    node.pos_x = x;
    node.pos_y = y;
    const el = document.getElementById('node-' + nodeId);
    if (el) {
        el.style.left = x + 'px';
        el.style.top = y + 'px';
    }
    editor.updateConnectionNodes('node-' + nodeId);
}

function addNodeClick(k) {
    const rect = document.getElementById('drawflow').getBoundingClientRect();
    const connection = getSelectedCanvasConnection();
    const tool = TOOL_REGISTRY[k];
    if (connection && (!tool || Number(tool.in || 0) < 1 || Number(tool.out || 0) < 1)) {
        if (typeof showToast === 'function') showToast('Ese nodo no puede insertarse: necesita entrada y salida', 'warning');
        return null;
    }
    const sourceId = connection ? null : getSingleSelectedCanvasNodeId();
    const placement = connection ? getConnectionNodePlacement(connection, rect) : sourceId ? getConnectedNodePlacement(sourceId, rect) : {
        x: rect.width / 2 + rect.left,
        y: rect.height / 2 + rect.top
    };
    let id = null;
    let connected = false;
    let inserted = false;
    const mutation = () => {
        id = addNode(k, placement.x, placement.y);
        if (connection) {
            inserted = replaceConnectionWithNode(connection, id);
            if (!inserted) {
                editor.removeNodeId('node-' + id);
                id = null;
            }
        } else {
            connected = sourceId ? connectNewNodeFromSelection(sourceId, id) : false;
        }
    };
    if (connection && typeof window.JETLHistoryTransaction === 'function') window.JETLHistoryTransaction(mutation);
    else mutation();
    if (!id) {
        if (typeof showToast === 'function') showToast('No se pudo insertar el nodo en esa conexión', 'error');
        return null;
    }
    selectCanvasNode(id);
    if (inserted && typeof showToast === 'function') showToast('Nodo insertado en la conexión', 'success');
    else if (connected && typeof showToast === 'function') showToast('Nodo añadido y conectado', 'success');
    if (window.innerWidth < 768) JETLEvents.emit('flow:show');
    return id;
}

function addNode(k, x, y) {
    const t = TOOL_REGISTRY[k];
    let pos = { x: 100, y: 100 };
    if (x && y) {
        // Cálculo de posición corregido por zoom
        pos.x = x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) - (editor.precanvas.getBoundingClientRect().x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
        pos.y = y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) - (editor.precanvas.getBoundingClientRect().y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));
    }

    const isJunc = k === 'util_junction';
    const helpIcon = t.help ? `<i class="fas fa-circle-info node-help" title="${t.help}"></i>` : '';
    const html = isJunc ? `<div class="junction-point"></div>` :
        `<div class="node-head" style="border-bottom:3px solid ${JETLEscapeHtml(t.color)}">
            <div style="display:flex;align-items:center;">
                <span class="count-badge node-badge-count">0</span>
                <span><i class="fas ${JETLEscapeHtml(t.icon)}"></i> ${JETLEscapeHtml(t.label)}</span>
                <span class="time-badge node-badge-time"></span>
            </div>
            <div class="node-actions">
                ${helpIcon}
                <i class="fas fa-play-circle node-btn node-action" data-node-action="run" title="Ejecutar hasta aqui"></i>
                <i class="fas fa-eye node-btn eye-btn node-action" data-node-action="view" title="Ver en Mapa"></i>
                <i class="fas fa-times node-action" data-node-action="delete" style="cursor:pointer;opacity:0.6;margin-left:4px" title="Eliminar nodo"></i>
            </div>
        </div>
        <div class="node-body">${t.tpl ? t.tpl() : ''}</div>`;

    // Crear nodo. Drawflow guarda 'html' en memoria tal cual se envía.
    const id = editor.addNode(k, t.in, t.out, pos.x, pos.y, isJunc ? 'junction' : '', {}, html);

    // 1. ACTUALIZACIÓN VISUAL (DOM)
    const el = document.getElementById('node-' + id);
    const animated = !!(el && window.JETLMotion);
    if (animated) window.JETLMotion.enterNode(el);
    JETLEvents.emit('node:added', { id, element: el, animated });
    return id;
}

// Cierra una ejecución: guarda su informe y anuncia cómo terminó. El monitor,
// el resumen del log, los contadores de los nodos y, en las parciales, el
// resultado del nodo destino se pintan en los suscriptores de 'run:finish'.
function finishRun(label, status, error = null, extra = {}) {
    const report = publishRunReport(buildRunReport(label, status, error));
    JETLEvents.emit('run:finish', {
        label, status, report,
        errorNodeId: status === 'error' ? getRunErrorNodeId() : null,
        ...extra
    });
}

async function runEngine() {
    JETLSetEngineCancelled(false);
    currentRunTimestamp = Date.now();
    const initialGraph = _getGraphDataSafe();
    beginRunTrace('Ejecución Total', 'full', Object.keys(initialGraph));
    log("--- INICIANDO EJECUCIÓN TOTAL ---");

    const runtime = typeof window.JETLEnsureRuntime === 'function'
        ? window.JETLEnsureRuntime()
        : window.JETLRuntimeReady;
    if (runtime && !(await runtime)) {
        const runtimeError = window.__JETL_RUNTIME_ERROR;
        finishRun('Ejecución Total', 'error', runtimeError?.message || 'El motor no pudo cargarse');
        log("FATAL: " + (runtimeError?.message || 'El motor no pudo cargarse'), "err");
        showToast("No se pudo preparar el motor", "error");
        return;
    }

    document.querySelectorAll('.count-badge').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.eye-btn').forEach(b => b.classList.remove('active'));

    await new Promise(r => setTimeout(r, 50));

    const exportData = editor.export().drawflow.Home.data;
    const nodes = Object.values(exportData);
    const roots = nodes.filter(n => TOOL_REGISTRY[n.name].in === 0);

    if (roots.length === 0) {
        finishRun('Ejecución Total', 'error', 'Añade un Reader para ejecutar el flujo');
        log("Error: Añade un Reader", "err");
        showToast("Añade un Reader", "warning");
        return;
    }

    try {
        const plan = buildExecutionPlan(exportData);
        for (let levelIndex = 0; levelIndex < plan.levels.length; levelIndex += 1) {
            const level = plan.levels[levelIndex];
            const loaderMsg = document.getElementById('loader-msg');
            if (loaderMsg) loaderMsg.innerText = `Ejecutando nivel ${levelIndex + 1}/${plan.levels.length}…`;
            for (const nodeId of level) {
                if (window.isEngineCancelled) throw new Error("Ejecución cancelada por el usuario.");
                await processNode(nodeId, exportData);
            }
        }
        if (window.isEngineCancelled) throw new Error("Ejecución cancelada por el usuario.");
        log("--- FIN EXITOSO ---");
        finishRun('Ejecución Total', 'ok');
        showToast("Proceso completado", "success");
    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            finishRun('Ejecución Total', 'cancelled');
            log("Ejecución cancelada por el usuario.", "warn");
            showToast("Ejecución cancelada", "warning");
        } else {
            finishRun('Ejecución Total', 'error', e && e.message ? e.message : String(e));
            log("FATAL: " + e.message, "err");
            showToast("Error en ejecución", "error");
        }
    }
}

function cancelEngineRun() {
    JETLSetEngineCancelled(true);
    if (typeof window.cancelWorkerTasks === 'function') {
        window.cancelWorkerTasks('Operacion cancelada por el usuario');
    }
    showToast("Cancelando operación... Por favor espera", "warning");
    const loaderMsg = document.getElementById('loader-msg');
    if (loaderMsg) loaderMsg.innerText = "Deteniendo...";
    const cancelBtn = document.getElementById('loader-cancel');
    if (cancelBtn) cancelBtn.hidden = true;
}

async function runEnginePartial(targetId) {
    JETLSetEngineCancelled(false);
    currentRunTimestamp = Date.now();
    const initialGraph = _getGraphDataSafe();
    beginRunTrace(`Parcial #${targetId}`, 'partial', collectRequiredNodeIds(targetId, initialGraph));

    const runtime = typeof window.JETLEnsureRuntime === 'function'
        ? window.JETLEnsureRuntime()
        : window.JETLRuntimeReady;
    if (runtime && !(await runtime)) {
        const runtimeError = window.__JETL_RUNTIME_ERROR;
        finishRun(`Parcial #${targetId}`, 'error', runtimeError?.message || 'El motor no pudo cargarse', { scope: 'partial', targetId });
        log("FATAL: " + (runtimeError?.message || 'El motor no pudo cargarse'), "err");
        showToast("No se pudo preparar el motor", "error");
        return;
    }

    log(`--- Ejecución Parcial hasta nodo #${targetId} ---`);

    try {
        const exportData = editor.export().drawflow.Home.data;
        // --- CORRECCIÓN: Validación de integridad tras Carga ---
        if (!exportData[targetId]) {
            throw new Error(`El nodo #${targetId} no existe en memoria. Intenta recargar la página.`);
        }

        await processNode(targetId, exportData);
        if (window.isEngineCancelled) throw new Error("Ejecución parcial cancelada.");

        log("--- Parcial Completado ---");
        finishRun(`Parcial #${targetId}`, 'ok', null, { scope: 'partial', targetId });
        showToast("Nodo actualizado", "success");

    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            finishRun(`Parcial #${targetId}`, 'cancelled', null, { scope: 'partial', targetId });
            log("Ejecución parcial cancelada por el usuario.", "warn");
            showToast("Ejecución parcial cancelada", "warning");
        } else {
            finishRun(`Parcial #${targetId}`, 'error', e && e.message ? e.message : String(e), { scope: 'partial', targetId });
            log("Error Parcial: " + e.message, "err");
            showToast("Error en ejecución parcial", "error");
        }
    }
}

function saveProject() {
    const exportData = editor.export();
    const project = window.JETLProjectPersistence?.createProject
        ? window.JETLProjectPersistence.createProject(exportData, document)
        : { version: "2026.03.05", timestamp: Date.now(), flow: exportData };
    // Las anotaciones viajan dentro de flow; se repiten en la raíz, donde las guarda Desktop.
    project.annotations = exportData.annotations || [];
    const workingCopyCount = Object.keys(project.reader_working_copies || {}).length;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flujo_jetl_${new Date().toISOString().slice(0, 10)}.jetl`;
    a.click();
    showToast(workingCopyCount
        ? `Proyecto guardado con ${workingCopyCount} ${workingCopyCount === 1 ? 'copia de trabajo' : 'copias de trabajo'}`
        : "Proyecto guardado correctamente", "success");
}

function loadProject(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            const parsedProject = window.JETLProjectPersistence?.parseProject
                ? window.JETLProjectPersistence.parseProject(json)
                : { flow: json.flow ? json.flow : json, readerWorkingCopies: {} };
            const flowData = parsedProject.flow;
            // Un proyecto con las anotaciones sólo en la raíz (formato Desktop).
            if (!Array.isArray(flowData.annotations) && Array.isArray(json?.annotations)) {
                flowData.annotations = json.annotations
                    .filter((note) => note && note.text)
                    .map((note) => ({ ...note, nodeId: note.nodeId ?? note.node_id ?? null }));
            }

            // No se requiere auto-reparación de HTML porque los nodos ahora usan delegación
            // y no incrustan su propio ID en el template.

            // Limpieza profunda (igual que antes)
            editor.clear();
            clearAllRuntimeCaches();
            JETLClearObject(executionData);
            clearAllDirty();
            invalidateAllNodes('project_loaded');
            JETLEvents.emit('workspace:reset', { clearSelection: true });
            currentRunTimestamp = 0;

            // El visor vacía sus capas al recibir workspace:reset (arriba).

            // Importamos los datos ya saneados
            editor.import(flowData);

            const restoreReport = window.JETLProjectPersistence?.restoreReaderWorkingCopies
                ? window.JETLProjectPersistence.restoreReaderWorkingCopies(document, parsedProject.readerWorkingCopies)
                : { restored: 0, skipped: 0 };

            saveDraft(flowData);
            JETLEvents.emit('workspace:replaced');
            if (restoreReport.skipped) {
                showToast(`Proyecto cargado; ${restoreReport.skipped} copias de trabajo no eran válidas`, "warning");
            } else if (restoreReport.restored) {
                showToast(`Proyecto cargado con ${restoreReport.restored} ${restoreReport.restored === 1 ? 'copia de trabajo' : 'copias de trabajo'}`, "success");
            } else {
                showToast("Proyecto cargado y reparado", "success");
            }
        } catch (err) {
            console.error(err);
            showToast("Error al leer el archivo .jetl", "error");
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// Comandos que se invocan por nombre desde la navegación de la cabecera, el smoke
// y las pruebas de la app (clásicos, no pueden importarlos).
Object.assign(window, { addNode, addNodeClick, runEngine, runEnginePartial, cancelEngineRun });

export {
    selectedCanvasConnection, setSelectedCanvasConnection, updateLocalDraftUI,
    startNewProject, restoreLocalDraft, addNode, addNodeClick, runEngine, runEnginePartial,
    cancelEngineRun, saveProject, loadProject, duplicateNode, duplicateNodes, removeNodes, moveNodeTo, setNodeOutputCount,
    snapNodeToGrid, isGridSnapEnabled, setGridSnapEnabled,
    getSingleSelectedCanvasNodeId
};

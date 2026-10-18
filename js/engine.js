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

function getConnectedNodePlacement(sourceId, fallbackRect) {
    const source = _getGraphDataSafe()[String(sourceId)];
    if (!source || !editor?.precanvas) {
        return { x: fallbackRect.width / 2 + fallbackRect.left, y: fallbackRect.height / 2 + fallbackRect.top };
    }
    const canvasRect = editor.precanvas.getBoundingClientRect();
    const zoom = Number(editor.zoom || 1);
    return {
        x: canvasRect.left + (Number(source.pos_x || 0) + 300) * zoom,
        y: canvasRect.top + Number(source.pos_y || 0) * zoom
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

// Copia de un nodo con su configuración, desplazada para que se vea; un solo
// paso de deshacer. No copia lo que vive fuera de node.data (p. ej. el archivo
// elegido en un lector local, que el navegador no permite duplicar).
function duplicateNode(nodeId) {
    const source = editor.getNodeFromId(nodeId);
    if (!source || !TOOL_REGISTRY[source.name]) return null;
    let id = null;
    const mutation = () => {
        id = addNode(source.name);
        editor.updateNodeDataFromId(id, JSON.parse(JSON.stringify(source.data || {})));
        const node = editor.drawflow.drawflow.Home.data[id];
        node.pos_x = source.pos_x + 40;
        node.pos_y = source.pos_y + 40;
        const el = document.getElementById('node-' + id);
        if (el) {
            el.style.left = node.pos_x + 'px';
            el.style.top = node.pos_y + 'px';
        }
    };
    if (typeof window.JETLHistoryTransaction === 'function') window.JETLHistoryTransaction(mutation);
    else mutation();
    // Guarda el borrador con la configuración copiada.
    editor.dispatch('nodeDataChanged', String(id));
    selectCanvasNode(id);
    return id;
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

            Object.values(mapLayers).forEach(l => {
                map.removeLayer(l);
                if (layerControl) layerControl.removeLayer(l);
            });
            JETLClearObject(mapLayers);

            if (layerControl) {
                map.removeControl(layerControl);
                layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
            }

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
    cancelEngineRun, saveProject, loadProject, duplicateNode, getSingleSelectedCanvasNodeId
};

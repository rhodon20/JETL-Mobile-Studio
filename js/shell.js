// Arranque de la aplicación y cableado del DOM: crea el editor, conecta sus
// eventos y enlaza botones y menús con los comandos (engine.js) y la interfaz.
// Es lo último que se carga (módulo ES): puede usar todo lo anterior.
import {
    renderSidebar, filterTools, syncCanvasViewport, createTouchIntentTracker, initFlowNavigator,
    openFlowNavigator, closeFlowNavigator, focusFlowNode, initQuickSearch, allowDrop, drop
} from './ui/catalog.js';
import { closeRunMonitor } from './ui/runPanel.js';
import './mobile.js';
import {
    selectedCanvasConnection, setSelectedCanvasConnection, updateLocalDraftUI,
    startNewProject, restoreLocalDraft, addNodeClick, cancelEngineRun, runEnginePartial, saveProject, loadProject
} from './engine.js';
import { clearNodeDirty, invalidateAllNodes, invalidateNodeAndDownstream } from './engine/dirty.js';
import { downloadRunReport } from './state/runHistory.js';
import { undo, redo, initHistory } from './state/history.js';
import { saveDraft } from './state/draft.js';
import { offerDraftRecovery } from './ui/draftPrompt.js';

let jetlAppInitialized = false;
// Duración de la animación de entrada de #boot-splash (ui-system.css); sin ella
// (movimiento reducido) no hay nada que esperar.
const BOOT_SPLASH_MIN_MS = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1200;

function setJETLStartupStatus(state, message) {
    const dot = document.getElementById('sys-status');
    if (!dot) return;
    const colors = { loading: '#f1c40f', ready: '#2ecc71', error: '#e74c3c' };
    dot.style.background = colors[state] || colors.loading;
    dot.title = message || 'JETL Studio';
    dot.setAttribute('aria-label', message || 'JETL Studio');
}

function initializeJETLApp() {
    if (jetlAppInitialized) return;
    if (window.__JETL_BOOT) window.__JETL_BOOT.stage = 'initializing-editor';
    jetlAppInitialized = true;
    setJETLStartupStatus('loading', 'Iniciando JETL Studio');

    try {
        // El catálogo es independiente del mapa y debe estar disponible de inmediato.
        renderSidebar('');

        if (typeof Drawflow === 'undefined') throw new Error('Drawflow no está disponible');
        const drawflowElement = document.getElementById('drawflow');
        if (!drawflowElement) throw new Error('No se encontró el lienzo de flujo');

    try {
        const originalValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        Object.defineProperty(HTMLInputElement.prototype, 'value', {
            set: function (val) {
                if (this.type === 'file' && val !== "") return;
                originalValueSetter.call(this, val);
            }
        });
    } catch (e) { console.warn("No se pudo aplicar el parche de input file", e); }

    editor = new Drawflow(drawflowElement);
    window.JETLEditor = editor;
    // En pantallas táctiles, los controles del nodo deben editarse y no iniciar
    // el arrastre del nodo. Drawflow excluye input/textarea/select con este modo.
    editor.draggable_inputs = false;
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.start();

    // La cuadrícula sigue al lienzo al panear y hacer zoom (syncCanvasViewport, ui/catalog.js).
    const scheduleCanvasViewportSync = () => window.requestAnimationFrame(syncCanvasViewport);
    editor.on('translate', scheduleCanvasViewportSync);
    editor.on('zoom', scheduleCanvasViewportSync);
    syncCanvasViewport();

    editor.on('connectionSelected', (connection) => {
        setSelectedCanvasConnection(connection ? {
            output_id: String(connection.output_id),
            input_id: String(connection.input_id),
            output_class: String(connection.output_class),
            input_class: String(connection.input_class)
        } : null);
        if (selectedCanvasConnection && typeof showToast === 'function') {
            showToast('Conexión seleccionada · añade un nodo para insertarlo', 'info');
        }
    });
    editor.on('connectionUnselected', () => { setSelectedCanvasConnection(null); });

    // El borrador local no se restaura silenciosamente: al terminar el arranque
    // se ofrece recuperarlo (y sigue en Proyecto > Restaurar).
    updateLocalDraftUI();

    ['nodeCreated', 'nodeRemoved', 'nodeMoved', 'connectionCreated', 'connectionRemoved'].forEach(ev => {
        editor.on(ev, (payload) => {
            if (ev === 'nodeRemoved') {
                const removedId = String(payload);
                clearNodeRuntimeCaches(removedId);
                delete executionData[removedId];
                clearNodeDirty(removedId);
                invalidateAllNodes('node_removed');
                if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts(removedId);
            } else if (ev === 'nodeCreated') {
                invalidateNodeAndDownstream(String(payload), 'node_created');
            } else if (ev === 'connectionCreated' || ev === 'connectionRemoved') {
                const srcId = payload && payload.output_id ? String(payload.output_id) : null;
                const dstId = payload && payload.input_id ? String(payload.input_id) : null;
                if (srcId) invalidateNodeAndDownstream(srcId, ev);
                if (dstId) invalidateNodeAndDownstream(dstId, ev);
                if (!srcId && !dstId) invalidateAllNodes(ev);
                if (ev === 'connectionRemoved' && selectedCanvasConnection &&
                    srcId === selectedCanvasConnection.output_id && dstId === selectedCanvasConnection.input_id) {
                    setSelectedCanvasConnection(null);
                }
            }
            saveDraft(editor.export());
            updateLocalDraftUI();
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => JETLSchemaUI.refreshAll(), 0);
            }
        });
    });
    editor.on('nodeDataChanged', (nodeId) => {
        invalidateNodeAndDownstream(String(nodeId), 'node_data_changed');
        saveDraft(editor.export());
        updateLocalDraftUI();
    });

    editor.on('click', (e) => {
        const el = e.target.closest('.drawflow-node');
        if (el) {
            const id = el.id.replace('node-', '');
            currentNodeId = id;
            document.querySelectorAll('.drawflow-node').forEach(n => n.classList.remove('selected'));
            el.classList.add('selected');
            if (executionData[id] && executionData[id].data) {
                if (typeof selectedRowSet !== 'undefined') selectedRowSet.clear();
                buildTable(executionData[id].data);
            }
        } else {
            document.querySelectorAll('.drawflow-node').forEach(n => n.classList.remove('selected'));
            currentNodeId = null;
        }
    });

    setJETLStartupStatus('ready', 'Sistema listo');
    if (window.__JETL_BOOT) window.__JETL_BOOT.stage = 'ready';
    offerDraftRecovery();
    // La pantalla de arranque se desvanece cuando ha terminado su animación de
    // entrada (~1,2 s desde la navegación; sólo retrasa arranques más rápidos que
    // eso). El segundo temporizador la retira aunque no haya transición
    // (movimiento reducido o pestaña en segundo plano).
    const bootSplash = document.getElementById('boot-splash');
    if (bootSplash) {
        setTimeout(() => {
            bootSplash.classList.add('is-done');
            bootSplash.addEventListener('transitionend', () => bootSplash.remove(), { once: true });
            setTimeout(() => bootSplash.remove(), 600);
        }, Math.max(0, BOOT_SPLASH_MIN_MS - performance.now()));
    }

    // El editor ya es utilizable. Los listeners auxiliares se conectan en el
    // siguiente fotograma para garantizar que Safari pueda pintar la interfaz.
    requestAnimationFrame(() => setTimeout(() => {
        const initializers = [
            ['controles principales', initEngineDelegation],
            ['historial', initHistory],
            ['menú contextual', initContextMenu],
            ['navegador de flujo', initFlowNavigator],
            ['búsqueda rápida', initQuickSearch]
        ];
        initializers.forEach(([label, initializer]) => {
            try {
                initializer();
            } catch (optionalError) {
                console.error(`[JETL] Error inicializando ${label}`, optionalError);
            }
        });

        try {
            const filterInput = document.getElementById('table-filter');
            if (filterInput) {
                filterInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') applyTableFilter();
                });
            }
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
                JETLSchemaUI.refreshAll();
            }
        } catch (optionalError) {
            console.error('[JETL] Error inicializando tabla o esquema', optionalError);
        }
    }, 0));
    } catch (error) {
        jetlAppInitialized = false;
        const errorMessage = error && error.message ? error.message : String(error || 'Error desconocido');
        setJETLStartupStatus('error', `Error de inicio: ${errorMessage}`);
        if (window.__JETL_BOOT) {
            window.__JETL_BOOT.stage = 'error';
            window.__JETL_BOOT.error = errorMessage;
        }
        document.getElementById('boot-splash')?.classList.add('is-error');
        const bootDiagnostic = document.getElementById('boot-diagnostic');
        if (bootDiagnostic) {
            bootDiagnostic.textContent = `No se pudo iniciar JETL Studio: ${errorMessage}`;
            bootDiagnostic.style.color = '#ff8a80';
        }
        console.error('[JETL] Error durante la inicialización', error);
        if (typeof window.showToast === 'function') {
            window.showToast(`No se pudo iniciar JETL Studio: ${errorMessage}`, 'error');
        }
    }
}

// Los scripts de arranque se sirven con `defer`. Durante su ejecución el
// documento ya puede estar en `interactive`, aunque DOMContentLoaded todavía
// no se haya emitido y queden módulos posteriores por ejecutar.
if (document.readyState === 'loading' || document.readyState === 'interactive') {
    document.addEventListener('DOMContentLoaded', initializeJETLApp, { once: true });
} else {
    queueMicrotask(initializeJETLApp);
}

// Permite reintentar el arranque si una dependencia esencial llegó tarde.
window.addEventListener('load', () => {
    if (!jetlAppInitialized) initializeJETLApp();
}, { once: true });

function initEngineDelegation() {
    document.addEventListener('click', (e) => {
        const schemaActionEl = e.target.closest('[data-schema-action]');
        if (schemaActionEl && !window.JETLSchemaUI) {
            e.preventDefault();
            e.stopPropagation();
            if (schemaActionEl.dataset.schemaLoading === '1') return;
            schemaActionEl.dataset.schemaLoading = '1';
            const extrasReady = typeof window.JETLEnsureExtras === 'function'
                ? window.JETLEnsureExtras()
                : Promise.reject(new Error('El cargador de editores no está disponible'));
            Promise.resolve(extrasReady).then(() => {
                if (!window.JETLSchemaUI) throw new Error('No se pudo preparar el editor del nodo');
                delete schemaActionEl.dataset.schemaLoading;
                schemaActionEl.click();
            }).catch((error) => {
                delete schemaActionEl.dataset.schemaLoading;
                console.error('[JETL] Error abriendo editor de nodo', error);
                if (typeof showToast === 'function') showToast('No se pudo abrir el editor del nodo', 'error');
            });
            return;
        }

        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');

        if (action === 'cancel-run') cancelEngineRun();
        else if (action === 'close-run-monitor') closeRunMonitor();
        else if (action === 'focus-run-error') {
            const nodeId = actionEl.dataset.nodeId;
            closeRunMonitor();
            window.JETLNativeNav?.('flow');
            if (nodeId) requestAnimationFrame(() => focusFlowNode(nodeId));
        }
        else if (action === 'toggle-sidebar') toggleSidebar();
        else if (action === 'undo' && typeof undo === 'function') undo();
        else if (action === 'redo' && typeof redo === 'function') redo();
        else if (action === 'clear-canvas') clearCanvas();
        else if (action === 'new-project') startNewProject();
        else if (action === 'restore-draft') restoreLocalDraft();
        else if (action === 'open-flow-navigator') openFlowNavigator();
        else if (action === 'close-flow-navigator') closeFlowNavigator();
        else if (action === 'save-project') saveProject();
        else if (action === 'open-project') {
            const upload = document.getElementById('upload-jetl');
            if (upload) upload.click();
        }
        else if (action === 'export-run-report') downloadRunReport('json');
        else if (action === 'export-run-report-csv') downloadRunReport('csv');
        else if (action === 'open-templates') {
            if (typeof openTemplatesModal === 'function') openTemplatesModal();
            else window.JETLEnsureExtras?.().then(() => window.openTemplatesModal?.());
        }
        else if (action === 'open-packages') {
            if (typeof openPackagesModal === 'function') openPackagesModal();
            else window.JETLEnsureExtras?.().then(() => window.openPackagesModal?.());
        }
        else if (action === 'apply-template-demo' && typeof applyTemplate === 'function') applyTemplate('demo');
        else if (action === 'zoom-all') zoomToAllLayers();
        else if (action === 'tab-map') switchTab('map', e);
        else if (action === 'tab-table') switchTab('table', e);
        else if (action === 'tab-logs') switchTab('logs', e);
        else if (action === 'toggle-map-expand' && typeof toggleMapPanelExpand === 'function') toggleMapPanelExpand();
        else if (action === 'toggle-panel') togglePanelHeight();
        else if (action === 'apply-symbology') applySymbology();
        else if (action === 'toggle-symbology') toggleSymbologyPanel();
        else if (action === 'ctx-run') ctxAction('run');
        else if (action === 'ctx-view') ctxAction('view');
        else if (action === 'ctx-delete') ctxAction('delete');
        else if (action === 'close-templates' && typeof closeTemplatesModal === 'function') closeTemplatesModal();
    });

    const sidebarFilterInput = document.getElementById('sidebar-filter-input');
    if (sidebarFilterInput) {
        sidebarFilterInput.addEventListener('input', (e) => {
            filterTools(e.target.value || '');
        });
    }

    const uploadJetl = document.getElementById('upload-jetl');
    if (uploadJetl) {
        uploadJetl.addEventListener('change', () => loadProject(uploadJetl));
    }

    const sidebar = document.getElementById('sidebar-content');
    if (sidebar) {
        let lastTouchSelection = 0;
        const touchIntent = createTouchIntentTracker(10);
        const activateSidebarItem = (e) => {
            const catTitle = e.target.closest('.cat-title[data-cat-toggle]');
            if (catTitle) {
                const itemsDiv = catTitle.nextElementSibling;
                if (itemsDiv && itemsDiv.classList.contains('cat-items')) {
                    itemsDiv.classList.toggle('open');
                    catTitle.classList.toggle('active');
                }
                return true;
            }

            const item = e.target.closest('.node-item');
            if (!item) return false;
            const k = item.dataset.k;
            if (k) addNodeClick(k);
            return true;
        };

        sidebar.addEventListener('touchstart', (e) => {
            const touch = e.touches && e.touches[0];
            const target = e.target.closest('.node-item, .cat-title[data-cat-toggle]');
            touchIntent.start(target, touch?.clientX || 0, touch?.clientY || 0);
        }, { passive: true });

        sidebar.addEventListener('touchmove', (e) => {
            const touch = e.touches && e.touches[0];
            if (!touch) return;
            touchIntent.move(touch.clientX, touch.clientY);
        }, { passive: true });

        sidebar.addEventListener('touchend', (e) => {
            const target = touchIntent.end();
            if (!target || !target.isConnected) return;
            if (!activateSidebarItem({ target })) return;
            lastTouchSelection = Date.now();
            e.preventDefault();
        }, { passive: false });

        sidebar.addEventListener('touchcancel', () => touchIntent.cancel(), { passive: true });

        sidebar.addEventListener('click', (e) => {
            if (Date.now() - lastTouchSelection < 700) return;
            activateSidebarItem(e);
        });

        sidebar.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.node-item');
            if (!item || !e.dataTransfer) return;
            e.dataTransfer.setData("node", item.dataset.k || '');
        });
    }

    const drawflowEl = document.getElementById('drawflow');
    if (drawflowEl) {
        drawflowEl.addEventListener('dragover', allowDrop);
        drawflowEl.addEventListener('drop', drop);

        drawflowEl.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-node-action]');
            if (!actionEl) return;
            e.stopPropagation();

            const nodeEl = actionEl.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.id) return;
            const nodeId = nodeEl.id.replace('node-', '');
            const action = actionEl.getAttribute('data-node-action');

            if (action === 'run') runEnginePartial(nodeId);
            else if (action === 'view') showOnMap(nodeId, null, true);
            else if (action === 'delete') editor.removeNodeId(nodeEl.id);
        });

        drawflowEl.addEventListener('change', (e) => {
            const fileInput = e.target.closest('input[type="file"][data-load-file]');
            if (fileInput) {
                loadFile(fileInput);
                return;
            }

            const modeSelect = e.target.closest('select[df-mode]');
            if (!modeSelect) return;
            const parent = modeSelect.parentElement;
            const bandsInput = parent ? parent.querySelector('[df-bands]') : null;
            if (bandsInput) bandsInput.style.display = modeSelect.value === 'select' ? 'block' : 'none';
        });
    }
}

// History logic (undo/redo) moved to js/state/history.js

let ctxNodeId = null;

function initContextMenu() {
    const menu = document.getElementById('ctx-menu');
    const drawflowEl = document.getElementById('drawflow');

    drawflowEl.addEventListener('contextmenu', (e) => {
        const node = e.target.closest('.drawflow-node');
        if (node) {
            e.preventDefault();
            ctxNodeId = node.id.replace('node-', '');
            menu.style.top = e.clientY + 'px';
            menu.style.left = e.clientX + 'px';
            menu.style.display = 'block';
        } else {
            menu.style.display = 'none';
        }
    });
    document.addEventListener('click', () => menu.style.display = 'none');
}

function ctxAction(action) {
    if (!ctxNodeId) return;
    if (action === 'delete') {
        editor.removeNodeId('node-' + ctxNodeId);
    } else if (action === 'run') {
        runEnginePartial(ctxNodeId);
    } else if (action === 'view') {
        showOnMap(ctxNodeId, null, true);
    }
    document.getElementById('ctx-menu').style.display = 'none';
}

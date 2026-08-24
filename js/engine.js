// =============================================
// 3. ENGINE & EVENTS
// =============================================
let editor, map, mapLayers = {}, executionData = {};
window.executionData = executionData;
window.lastRunReport = null;
let dirtyNodeMap = {};
let selectedCanvasConnection = null;
const LOCAL_DRAFT_KEY = 'jetl_flow_optimized';

function hasLocalDraft() {
    return !!SafeStorage.load(LOCAL_DRAFT_KEY);
}

function updateLocalDraftUI() {
    const button = document.querySelector('[data-ui-action="restore-draft"]');
    const available = hasLocalDraft();
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
    executionData = {};
    window.executionData = executionData;
    clearAllDirty();
    if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts();
    currentRunTimestamp = 0;
    window.JETLMobile?.fitFlowToViewport();
}

function startNewProject() {
    const graph = _getGraphDataSafe();
    if (Object.keys(graph).length > 0 && !window.confirm('¿Crear un proyecto nuevo y borrar el flujo actual?')) return;
    resetEditorState();
    SafeStorage.clear(LOCAL_DRAFT_KEY);
    updateLocalDraftUI();
    if (typeof window.showToast === 'function') window.showToast('Proyecto nuevo', 'success');
}

function restoreLocalDraft() {
    const saved = SafeStorage.load(LOCAL_DRAFT_KEY);
    if (!saved) {
        updateLocalDraftUI();
        if (typeof window.showToast === 'function') window.showToast('No hay borrador local', 'warning');
        return false;
    }
    try {
        const flow = JSON.parse(saved);
        resetEditorState();
        editor.import(flow);
        invalidateAllNodes('draft_restored');
        window.JETLMobile?.fitFlowToViewport();
        if (typeof window.showToast === 'function') window.showToast('Borrador restaurado', 'success');
        return true;
    } catch (error) {
        console.error('[JETL] Borrador local inválido', error);
        SafeStorage.clear(LOCAL_DRAFT_KEY);
        updateLocalDraftUI();
        if (typeof window.showToast === 'function') window.showToast('El borrador local estaba dañado', 'error');
        return false;
    }
}

window.JETLProjects = { startNew: startNewProject, restoreDraft: restoreLocalDraft, hasDraft: hasLocalDraft };

function _getGraphDataSafe() {
    try {
        if (!editor || typeof editor.export !== 'function') return {};
        return (((editor.export() || {}).drawflow || {}).Home || {}).data || {};
    } catch (_) {
        return {};
    }
}

function _collectDownstreamIds(startId, graphData) {
    const data = graphData || _getGraphDataSafe();
    const out = new Set();
    const q = [String(startId)];
    while (q.length) {
        const id = String(q.shift());
        if (out.has(id)) continue;
        out.add(id);
        const node = data[id];
        const outputs = (node && node.outputs) ? node.outputs : {};
        Object.keys(outputs).forEach((port) => {
            const conns = Array.isArray(outputs[port] && outputs[port].connections) ? outputs[port].connections : [];
            conns.forEach((c) => {
                const nextId = String(c && c.node ? c.node : '');
                if (nextId && !out.has(nextId)) q.push(nextId);
            });
        });
    }
    return out;
}

function markNodeDirty(nodeId, reason) {
    if (!nodeId) return;
    const id = String(nodeId);
    dirtyNodeMap[id] = reason || 'changed';
}

function clearNodeDirty(nodeId) {
    if (!nodeId) return;
    delete dirtyNodeMap[String(nodeId)];
}

function clearAllDirty() {
    dirtyNodeMap = {};
}

function invalidateAllNodes(reason) {
    dirtyNodeMap = {};
    const data = _getGraphDataSafe();
    Object.keys(data || {}).forEach((id) => {
        dirtyNodeMap[String(id)] = reason || 'invalidate_all';
    });
    if (reason && typeof log === 'function') log(`[DIRTY] invalidacion global: ${reason}`, 'info');
}

function invalidateNodeAndDownstream(nodeId, reason) {
    if (!nodeId) return;
    const data = _getGraphDataSafe();
    const ids = _collectDownstreamIds(String(nodeId), data);
    ids.forEach((id) => markNodeDirty(id, reason || 'downstream_change'));
}

function isNodeDirty(nodeId) {
    if (!nodeId) return false;
    return !!dirtyNodeMap[String(nodeId)];
}

window.JETLDirty = {
    isDirty: isNodeDirty,
    markNodeDirty,
    clearNodeDirty,
    clearAll: clearAllDirty,
    invalidateAll: invalidateAllNodes,
    invalidateNodeAndDownstream
};

function ensureRuntimeCaches() {
    if (!window._file_cache) window._file_cache = {};
    if (!window._tiff_cache) window._tiff_cache = {};
    if (!window._node_tiff_ref) window._node_tiff_ref = {};
}

function clearNodeRuntimeCaches(nodeId) {
    if (!nodeId) return;
    ensureRuntimeCaches();
    delete window._file_cache['file_' + nodeId];
    const tiffRef = window._node_tiff_ref[nodeId];
    if (tiffRef) {
        delete window._tiff_cache[tiffRef];
        delete window._node_tiff_ref[nodeId];
    }
}

function clearAllRuntimeCaches() {
    window._file_cache = {};
    window._tiff_cache = {};
    window._node_tiff_ref = {};
}

window.JETLRuntimeCache = {
    ensure: ensureRuntimeCaches,
    clearNode: clearNodeRuntimeCaches,
    clearAll: clearAllRuntimeCaches
};

function normalizeResult(res) {
    if (!res) return null;
    if (res.type === 'Feature') return turf.featureCollection([res]);
    if (res.type === 'FeatureCollection') return res;
    if (Array.isArray(res) && res.length && res[0].type) return turf.featureCollection(res);
    const keys = Object.keys(res || {});
    if (keys.some(k => k && k.startsWith && k.startsWith('output_'))) return res;
    if (res && res.geometry) return turf.featureCollection([turf.feature(res.geometry, res.properties || {})]);
    return res;
}

function resolvePort(parentRes, parentPort) {
    if (!parentRes) return null;
    if (parentRes.type === 'FeatureCollection' || parentRes.type === 'Feature') return normalizeResult(parentRes);
    if (typeof parentRes === 'object') {
        if (parentPort && parentRes[parentPort]) return normalizeResult(parentRes[parentPort]);
        if (parentRes.output_1) return normalizeResult(parentRes.output_1);
        if (parentRes.output) return normalizeResult(parentRes.output);
    }
    return null;
}

// WORKER SETUP (POOL) is now handled via js/core/workerPool.js


let jetlAppInitialized = false;

function setJETLStartupStatus(state, message) {
    const dot = document.getElementById('sys-status');
    if (!dot) return;
    const colors = { loading: '#f1c40f', ready: '#2ecc71', error: '#e74c3c' };
    dot.style.background = colors[state] || colors.loading;
    dot.title = message || 'JETL Studio';
    dot.setAttribute('aria-label', message || 'JETL Studio');
}

function ensureJETLMap() {
    if (map) return map;
    const mapElement = document.getElementById('map');
    if (!mapElement) throw new Error('No se encontró el contenedor del mapa');
    if (typeof L === 'undefined') throw new Error('Leaflet no está disponible');

    map = L.map(mapElement, { renderer: L.canvas() }).setView([40.416, -3.703], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM contributors'
    }).addTo(map);
    layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
    return map;
}
window.ensureJETLMap = ensureJETLMap;

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

    // Drawflow mueve y escala su lienzo interno, pero la cuadrícula pertenece
    // al contenedor. Sin sincronizarla, un flujo vacío parece inmóvil aunque
    // los gestos funcionen. Mantener ambos en el mismo sistema de coordenadas
    // da feedback visible inmediato para paneo y pinch-to-zoom.
    const syncCanvasViewport = () => {
        const zoom = Number.isFinite(editor.zoom) ? editor.zoom : 1;
        const x = Number.isFinite(editor.canvas_x) ? editor.canvas_x : 0;
        const y = Number.isFinite(editor.canvas_y) ? editor.canvas_y : 0;
        drawflowElement.style.backgroundPosition = x + 'px ' + y + 'px';
        drawflowElement.style.backgroundSize = (25 * zoom) + 'px ' + (25 * zoom) + 'px';
        drawflowElement.dataset.viewport = Math.round(x) + ',' + Math.round(y) + ',' + zoom.toFixed(2);
    };
    const scheduleCanvasViewportSync = () => window.requestAnimationFrame(syncCanvasViewport);
    editor.on('translate', scheduleCanvasViewportSync);
    editor.on('zoom', scheduleCanvasViewportSync);
    syncCanvasViewport();
    window.JETLSyncCanvasViewport = syncCanvasViewport;

    editor.on('connectionSelected', (connection) => {
        selectedCanvasConnection = connection ? {
            output_id: String(connection.output_id),
            input_id: String(connection.input_id),
            output_class: String(connection.output_class),
            input_class: String(connection.input_class)
        } : null;
        if (selectedCanvasConnection && typeof showToast === 'function') {
            showToast('Conexión seleccionada · añade un nodo para insertarlo', 'info');
        }
    });
    editor.on('connectionUnselected', () => { selectedCanvasConnection = null; });

    // El borrador local no se restaura silenciosamente. El usuario puede
    // recuperarlo desde Proyecto > Restaurar.
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
                    selectedCanvasConnection = null;
                }
            }
            SafeStorage.save(LOCAL_DRAFT_KEY, JSON.stringify(editor.export()));
            updateLocalDraftUI();
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => JETLSchemaUI.refreshAll(), 0);
            }
        });
    });
    editor.on('nodeDataChanged', (nodeId) => {
        invalidateNodeAndDownstream(String(nodeId), 'node_data_changed');
        SafeStorage.save(LOCAL_DRAFT_KEY, JSON.stringify(editor.export()));
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
    const bootDiagnostic = document.getElementById('boot-diagnostic');
    if (bootDiagnostic) bootDiagnostic.remove();

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

function renderSidebar(filter) {
    const container = document.getElementById('sidebar-content');
    container.innerHTML = '';
    const cats = {};
    Object.entries(TOOL_REGISTRY).forEach(([k, tool]) => {
        if (filter && !tool.label.toLowerCase().includes(filter.toLowerCase())) return;
        if (!cats[tool.cat]) cats[tool.cat] = [];
        cats[tool.cat].push({ k, ...tool });
    });

    const sortedCats = Object.keys(cats).sort();

    sortedCats.forEach(c => {
        const group = document.createElement('div');
        group.className = 'cat-group';

        const title = document.createElement('div');
        title.className = 'cat-title';
        title.setAttribute('data-cat-toggle', '1');
        title.innerHTML = `<span>${c}</span> <i class="fas fa-chevron-down"></i>`;

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'cat-items';

        if (filter && filter.length > 0) {
            itemsDiv.classList.add('open');
            title.classList.add('active');
        }

        const supportsDrag = !window.matchMedia('(pointer: coarse)').matches;
        cats[c].forEach(t => {
            itemsDiv.innerHTML += `<div class="node-item" draggable="${supportsDrag}" data-k="${t.k}">
                <i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label}
            </div>`;
        });

        group.appendChild(title);
        group.appendChild(itemsDiv);
        container.appendChild(group);
    });
}
function filterTools(val) { renderSidebar(val); }

function createTouchIntentTracker(threshold = 10) {
    let intent = null;
    return {
        start(target, x, y) { intent = target ? { target, x, y, moved: false } : null; },
        move(x, y) {
            if (!intent) return;
            if (Math.hypot(x - intent.x, y - intent.y) > threshold) intent.moved = true;
        },
        end() {
            const target = intent && !intent.moved ? intent.target : null;
            intent = null;
            return target;
        },
        cancel() { intent = null; }
    };
}
window.JETLCreateTouchIntentTracker = createTouchIntentTracker;

function buildFlowNavigatorEntries(flowData, registry, query = '') {
    const data = flowData && flowData.drawflow && flowData.drawflow.Home
        ? flowData.drawflow.Home.data || {}
        : {};
    const needle = String(query || '').trim().toLocaleLowerCase('es');
    return Object.entries(data).map(([id, node]) => {
        const tool = registry[node.name] || {};
        const label = tool.label || node.name || `Nodo ${id}`;
        const category = tool.cat || 'Sin categoría';
        const searchable = [id, node.name, label, category, JSON.stringify(node.data || {})]
            .join(' ')
            .toLocaleLowerCase('es');
        const inputs = Object.values(node.inputs || {}).reduce((total, input) => total + (input.connections || []).length, 0);
        const outputs = Object.values(node.outputs || {}).reduce((total, output) => total + (output.connections || []).length, 0);
        return {
            id: String(id), name: node.name || '', label, category,
            icon: tool.icon || 'fa-cube', color: tool.color || '#888',
            inputs, outputs, searchable
        };
    }).filter((entry) => !needle || entry.searchable.includes(needle))
        .sort((a, b) => Number(a.id) - Number(b.id));
}
window.buildFlowNavigatorEntries = buildFlowNavigatorEntries;

function escapeFlowNavigatorHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getFlowNavigatorSummary(flowData) {
    const data = flowData && flowData.drawflow && flowData.drawflow.Home
        ? flowData.drawflow.Home.data || {}
        : {};
    const nodes = Object.values(data);
    const connections = nodes.reduce((total, node) => total + Object.values(node.outputs || {})
        .reduce((sum, output) => sum + (output.connections || []).length, 0), 0);
    const categories = new Set(nodes.map((node) => TOOL_REGISTRY[node.name]?.cat).filter(Boolean)).size;
    return { nodes: nodes.length, connections, categories };
}

function renderFlowNavigator(query = '') {
    const list = document.getElementById('flow-navigator-list');
    const summary = document.getElementById('flow-navigator-summary');
    if (!list || !summary || !editor) return;
    const flowData = editor.export();
    const entries = buildFlowNavigatorEntries(flowData, TOOL_REGISTRY, query);
    const totals = getFlowNavigatorSummary(flowData);
    summary.innerHTML = `
        <span><strong>${totals.nodes}</strong> nodos</span>
        <span><strong>${totals.connections}</strong> conexiones</span>
        <span><strong>${totals.categories}</strong> categorías</span>`;

    if (!entries.length) {
        list.innerHTML = `<div class="flow-navigator-empty">
            <i class="fas fa-search"></i>
            <strong>${totals.nodes ? 'No hay coincidencias' : 'El flujo está vacío'}</strong>
            <span>${totals.nodes ? 'Prueba con otro nombre, atributo o ID.' : 'Añade nodos desde el catálogo para empezar.'}</span>
        </div>`;
        return;
    }

    list.innerHTML = entries.map((entry) => {
        const id = escapeFlowNavigatorHTML(entry.id);
        const label = escapeFlowNavigatorHTML(entry.label);
        const category = escapeFlowNavigatorHTML(entry.category);
        const color = /^#[0-9a-f]{3,8}$/i.test(entry.color) ? entry.color : '#888';
        const icon = String(entry.icon).split(/\s+/).filter((token) => /^fa[\w-]*$/.test(token)).join(' ');
        return `
        <button type="button" class="flow-navigator-item" data-flow-node-id="${id}">
            <span class="flow-navigator-icon" style="--node-accent:${color}"><i class="fas ${icon}"></i></span>
            <span class="flow-navigator-copy">
                <strong>${label}</strong>
                <small>#${id} · ${category}</small>
            </span>
            <span class="flow-navigator-ports" aria-label="${entry.inputs} entradas y ${entry.outputs} salidas">
                <span><i class="fas fa-arrow-right-to-bracket"></i>${entry.inputs}</span>
                <span><i class="fas fa-arrow-right-from-bracket"></i>${entry.outputs}</span>
            </span>
            <i class="fas fa-crosshairs flow-navigator-target" aria-hidden="true"></i>
        </button>`;
    }).join('');
}

function closeFlowNavigator() {
    const modal = document.getElementById('flow-navigator-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
}
window.JETLCloseFlowNavigator = closeFlowNavigator;

function openFlowNavigator() {
    const modal = document.getElementById('flow-navigator-modal');
    const input = document.getElementById('flow-navigator-filter');
    if (!modal) return false;
    initFlowNavigator();
    window.JETLNativeNav?.('flow');
    if (input) input.value = '';
    renderFlowNavigator('');
    modal.style.display = 'flex';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => input?.focus(), 0);
    return true;
}
window.JETLOpenFlowNavigator = openFlowNavigator;

function focusFlowNode(nodeId) {
    const id = String(nodeId || '');
    const node = document.getElementById('node-' + id);
    const viewport = document.getElementById('drawflow');
    if (!node || !viewport || !editor?.precanvas) return false;

    const zoom = Math.min(1, Math.max(editor.zoom_min || 0.5, window.innerWidth <= 768 ? 0.88 : (editor.zoom || 1)));
    const centerX = node.offsetLeft + node.offsetWidth / 2;
    const centerY = node.offsetTop + node.offsetHeight / 2;
    const x = viewport.clientWidth / 2 - centerX * zoom;
    const y = viewport.clientHeight / 2 - centerY * zoom;

    editor.canvas_x = x;
    editor.canvas_y = y;
    editor.zoom = zoom;
    editor.zoom_last_value = zoom;
    editor.precanvas.style.transformOrigin = '0 0';
    editor.precanvas.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    document.querySelectorAll('.drawflow-node').forEach((element) => element.classList.remove('selected'));
    node.classList.add('selected');
    editor.node_selected = node;
    currentNodeId = id;
    editor.dispatch?.('nodeSelected', id);
    if (executionData[id]?.data && typeof buildTable === 'function') buildTable(executionData[id].data);
    window.JETLSyncCanvasViewport?.();
    node.animate?.([
        { boxShadow: '0 0 0 3px rgba(52,152,219,.5)' },
        { boxShadow: '0 0 0 3px rgba(52,152,219,.24)' }
    ], { duration: 420, easing: 'ease-out' });
    return true;
}
window.JETLFocusFlowNode = focusFlowNode;

function initFlowNavigator() {
    const modal = document.getElementById('flow-navigator-modal');
    const input = document.getElementById('flow-navigator-filter');
    const list = document.getElementById('flow-navigator-list');
    if (!modal || !input || !list || modal.dataset.ready === 'true') return;
    modal.dataset.ready = 'true';
    input.addEventListener('input', () => renderFlowNavigator(input.value));
    list.addEventListener('click', (event) => {
        const item = event.target.closest('[data-flow-node-id]');
        if (!item) return;
        const id = item.getAttribute('data-flow-node-id');
        closeFlowNavigator();
        window.JETLNativeNav?.('flow');
        requestAnimationFrame(() => focusFlowNode(id));
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeFlowNavigator();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) closeFlowNavigator();
    });
}

let qsMousePos = { x: 0, y: 0 };

function initQuickSearch() {
    const qs = document.getElementById('quick-search');
    const input = document.getElementById('qs-input');
    const results = document.getElementById('qs-results');
    const workspace = document.getElementById('workspace');

    if (!qs || !input || !results || !workspace || qs.dataset.ready === 'true') return;
    qs.dataset.ready = 'true';
    const isMobileSearch = () => window.matchMedia('(max-width: 768px)').matches;

    workspace.addEventListener('mousemove', (e) => {
        if (qs.style.display !== 'block') {
            qsMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (!isMobileSearch() && e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
            if (qs.style.display !== 'block') {
                qs.style.top = Math.min(qsMousePos.y, window.innerHeight - 300) + 'px';
                qs.style.left = Math.min(qsMousePos.x, window.innerWidth - 300) + 'px';
                qs.style.display = 'block';
                input.value = '';
                input.focus();
                renderMatches('');
            }
        }
        if (e.key === 'Escape') closeQS();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const sel = results.querySelector('.selected');
            if (sel) {
                if (isMobileSearch()) addNodeClick(sel.dataset.k);
                else addNode(sel.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top));
                closeQS();
            }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const current = results.querySelector('.selected');
            const items = Array.from(results.querySelectorAll('.qs-item'));
            let idx = items.indexOf(current);
            if (idx === -1 && items.length > 0) idx = 0;
            else if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
            else idx = Math.max(idx - 1, 0);
            items.forEach(i => i.classList.remove('selected'));
            if (items[idx]) { items[idx].classList.add('selected'); items[idx].scrollIntoView({ block: 'nearest' }); }
        }
    });

    function renderMatches(value) {
        const val = String(value || '').trim().toLocaleLowerCase('es');
        results.innerHTML = '';
        const matches = Object.entries(TOOL_REGISTRY).filter(([k, t]) => t.label.toLowerCase().includes(val) || t.cat.toLowerCase().includes(val));

        matches.slice(0, 10).forEach(([k, t], i) => {
            const item = document.createElement('div');
            item.className = 'qs-item' + (i === 0 ? ' selected' : '');
            item.dataset.k = k;
            item.innerHTML = `<i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label} <span style="font-size:0.7em;opacity:0.5;margin-left:auto">${t.cat}</span>`;
            results.appendChild(item);
        });

        window.JETLMotion?.staggerIn(results.querySelectorAll('.qs-item'));

        qs.classList.toggle('has-results', matches.length > 0);
    }

    input.addEventListener('input', () => renderMatches(input.value));
    input.addEventListener('focus', () => {
        if (isMobileSearch()) renderMatches(input.value);
    });

    function closeQS() {
        qs.classList.remove('has-results');
        results.innerHTML = '';
        input.value = '';
        input.blur();
        if (!isMobileSearch()) qs.style.display = 'none';
    }

    document.addEventListener('click', (e) => {
        const open = qs.style.display === 'block' || (isMobileSearch() && qs.classList.contains('has-results'));
        if (open && !qs.contains(e.target)) closeQS();
    });
    results.addEventListener('click', (e) => {
        const item = e.target.closest('.qs-item');
        if (!item) return;
        if (isMobileSearch()) addNodeClick(item.dataset.k);
        else addNode(item.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top));
        closeQS();
    });
}

function countFeaturesFromResult(data) {
    if (!data) return 0;
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) return data.features.length;
    if (data.type === 'Feature') return 1;
    if (typeof data === 'object') {
        let total = 0;
        Object.keys(data).forEach((k) => {
            if (!/^output_\d+$/.test(k)) return;
            const out = data[k];
            if (out && out.type === 'FeatureCollection' && Array.isArray(out.features)) total += out.features.length;
        });
        return total;
    }
    return 0;
}

function countOutputsFromResult(data) {
    const out = {};
    if (!data) return out;
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        out.output_1 = data.features.length;
        return out;
    }
    if (data.type === 'Feature') {
        out.output_1 = 1;
        return out;
    }
    if (typeof data === 'object') {
        Object.keys(data).forEach((k) => {
            if (!/^output_\d+$/.test(k)) return;
            const v = data[k];
            if (v && v.type === 'FeatureCollection' && Array.isArray(v.features)) out[k] = v.features.length;
        });
    }
    return out;
}

let activeRunTrace = null;
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

function getRunErrorNodeId() {
    if (!activeRunTrace) return null;
    for (const [id, event] of activeRunTrace.nodes.entries()) if (event.status === 'error') return id;
    return null;
}

function buildExecutionPlan(graphData) {
    const data = graphData || {};
    const ids = Object.keys(data).map(String);
    const indegree = new Map(ids.map((id) => [id, 0]));
    const children = new Map(ids.map((id) => [id, []]));
    ids.forEach((id) => {
        const inputs = data[id]?.inputs || {};
        Object.values(inputs).forEach((input) => {
            (input.connections || []).forEach((connection) => {
                const parentId = String(connection.node);
                if (!indegree.has(parentId)) return;
                indegree.set(id, indegree.get(id) + 1);
                children.get(parentId).push(id);
            });
        });
    });

    let frontier = ids.filter((id) => indegree.get(id) === 0);
    const levels = [];
    const order = [];
    while (frontier.length) {
        const level = frontier.slice().sort((a, b) => Number(a) - Number(b));
        levels.push(level);
        order.push(...level);
        const next = [];
        level.forEach((id) => {
            children.get(id).forEach((childId) => {
                indegree.set(childId, indegree.get(childId) - 1);
                if (indegree.get(childId) === 0) next.push(childId);
            });
        });
        frontier = next;
    }
    if (order.length !== ids.length) {
        const cyclicIds = ids.filter((id) => !order.includes(id));
        throw new Error(`El flujo contiene un ciclo entre los nodos ${cyclicIds.map((id) => '#' + id).join(', ')}`);
    }
    return { order, levels };
}
window.JETLBuildExecutionPlan = buildExecutionPlan;

function collectRequiredNodeIds(targetId, graphData) {
    const data = graphData || {};
    const required = new Set();
    const visit = (id) => {
        const key = String(id);
        if (required.has(key) || !data[key]) return;
        required.add(key);
        Object.values(data[key].inputs || {}).forEach((input) => {
            (input.connections || []).forEach((connection) => visit(connection.node));
        });
    };
    visit(targetId);
    return [...required];
}

function beginRunTrace(label, scope, plannedIds) {
    activeRunTrace = {
        label,
        scope,
        startedAt: Date.now(),
        finishedAt: null,
        plannedIds: (plannedIds || []).map(String),
        nodes: new Map()
    };
    startRunMonitor(label, activeRunTrace.plannedIds);
    return activeRunTrace;
}

function markRunTraceNode(nodeId, patch) {
    if (!activeRunTrace) return;
    const id = String(nodeId);
    const previous = activeRunTrace.nodes.get(id) || { id, started_at: new Date().toISOString() };
    if (['ok', 'cached'].includes(previous.status) && ['ok', 'cached'].includes(patch?.status)) return;
    const now = new Date().toISOString();
    const nextPatch = { ...(patch || {}) };
    if (nextPatch.status === 'running') nextPatch.started_at = previous.started_at || now;
    if (['ok', 'cached', 'error', 'cancelled'].includes(nextPatch.status)) nextPatch.finished_at = now;
    activeRunTrace.nodes.set(id, { ...previous, ...nextPatch, id });
    updateRunMonitorNode(id, nextPatch);
}

function finishRunTrace() {
    if (activeRunTrace && !activeRunTrace.finishedAt) activeRunTrace.finishedAt = Date.now();
}

window.JETLRunTrace = { node: markRunTraceNode };

function buildRunReport(label, status, errorMessage) {
    const exportData = (editor && typeof editor.export === 'function')
        ? (((editor.export() || {}).drawflow || {}).Home || {}).data || {}
        : {};
    finishRunTrace();
    const trace = activeRunTrace;
    const nodes = Object.entries(exportData).map(([id, node]) => {
        const meta = executionData ? executionData[id] : null;
        const event = trace?.nodes?.get(String(id)) || null;
        const nodeName = node ? node.name : '';
        const tool = nodeName && window.TOOL_REGISTRY ? window.TOOL_REGISTRY[nodeName] : null;
        return {
            id: String(id),
            node: nodeName || 'unknown',
            label: tool ? tool.label : nodeName || 'unknown',
            category: tool?.cat || '',
            status: event?.status || 'not_run',
            ms: event ? Number(event?.ms ?? (meta && meta._ms) ?? 0) : 0,
            count: event ? countFeaturesFromResult(meta ? meta.data : null) : 0,
            outputs: event ? countOutputsFromResult(meta ? meta.data : null) : {},
            cached: event?.status === 'cached',
            error: event?.error || null,
            started_at: event?.started_at || null,
            finished_at: event?.finished_at || null
        };
    }).sort((a, b) => b.ms - a.ms);

    const totalMs = nodes.reduce((acc, n) => acc + (n.ms || 0), 0);
    const totalFeatures = nodes.reduce((acc, n) => acc + (n.count || 0), 0);
    const startedAt = trace?.startedAt || currentRunTimestamp || Date.now();
    const finishedAt = trace?.finishedAt || Date.now();
    return {
        version: '2.0',
        generated_at: new Date().toISOString(),
        run_id: currentRunTimestamp || Date.now(),
        label: label || 'Run',
        scope: trace?.scope || 'manual',
        started_at: new Date(startedAt).toISOString(),
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: Math.max(0, finishedAt - startedAt),
        status: status || 'ok',
        error: errorMessage || null,
        summary: {
            nodes: nodes.length,
            planned_nodes: trace?.plannedIds?.length || nodes.length,
            processed_nodes: nodes.filter((node) => !['not_run', 'pending'].includes(node.status)).length,
            executed_nodes: nodes.filter((node) => node.status === 'ok').length,
            cached_nodes: nodes.filter((node) => node.status === 'cached').length,
            error_nodes: nodes.filter((node) => node.status === 'error').length,
            cancelled_nodes: nodes.filter((node) => node.status === 'cancelled').length,
            total_ms: totalMs,
            total_features: totalFeatures
        },
        nodes
    };
}

const RUN_HISTORY_KEY = 'jetl_run_history_v1';
const RUN_HISTORY_LIMIT = 30;
let selectedRunHistoryId = null;
let runHistoryNodeFilter = '';

function loadRunHistory() {
    try {
        const raw = SafeStorage.load(RUN_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map((report, index) => ({
            ...report,
            history_id: report?.history_id || `legacy_${report?.run_id || report?.generated_at || index}_${index}`
        })) : [];
    } catch (error) {
        console.warn('[JETL] No se pudo leer el historial de ejecuciones', error);
        return [];
    }
}

function publishRunReport(report) {
    const entry = {
        ...report,
        history_id: report?.history_id || `run_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        captured_at: new Date().toISOString()
    };
    window.lastRunReport = entry;
    try {
        const history = loadRunHistory();
        history.unshift(entry);
        SafeStorage.save(RUN_HISTORY_KEY, JSON.stringify(history.slice(0, RUN_HISTORY_LIMIT)));
        selectedRunHistoryId = entry.history_id;
    } catch (error) {
        console.warn('[JETL] No se pudo guardar el historial de ejecuciones', error);
    }
    return entry;
}

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

function downloadRunReport(format = 'json', reportOverride = null) {
    const report = reportOverride || window.lastRunReport || buildRunReport('Manual', 'unknown', null);
    if (!report) {
        if (typeof showToast === 'function') showToast('Sin run report disponible', 'warn');
        return;
    }
    let content = '';
    let mime = 'application/json';
    let filename = `run_report_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    if (format === 'csv') {
        mime = 'text/csv';
        filename = filename.replace(/\.json$/, '.csv');
        const head = 'id,node,label,category,status,error,ms,count,output_1,output_2,output_3,cached';
        const rows = (report.nodes || []).map(n => [
            n.id,
            `"${String(n.node || '').replace(/"/g, '""')}"`,
            `"${String(n.label || '').replace(/"/g, '""')}"`,
            `"${String(n.category || '').replace(/"/g, '""')}"`,
            n.status || 'unknown',
            `"${String(n.error || '').replace(/"/g, '""')}"`,
            n.ms || 0,
            n.count || 0,
            (n.outputs && n.outputs.output_1) || 0,
            (n.outputs && n.outputs.output_2) || 0,
            (n.outputs && n.outputs.output_3) || 0,
            n.cached ? 'true' : 'false'
        ].join(','));
        content = [head, ...rows].join('\n');
    } else {
        content = JSON.stringify(report, null, 2);
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast(`Run report exportado (${format.toUpperCase()})`, 'success');
}

window.JETLRunReport = {
    build: buildRunReport,
    export: downloadRunReport
};

function drag(e) { e.dataTransfer.setData("node", e.target.dataset.k); }
function drop(e) { e.preventDefault(); const k = e.dataTransfer.getData("node"); if (k) addNode(k, e.clientX, e.clientY); }
function allowDrop(e) { e.preventDefault(); }

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
    if (window.innerWidth < 768) {
        window.JETLNativeNav?.('flow');
        window.JETLMobile?.fitFlowToViewport();
    }
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
        `<div class="node-head" style="border-bottom:3px solid ${t.color}">
            <div style="display:flex;align-items:center;">
                <span class="count-badge node-badge-count">0</span>
                <span><i class="fas ${t.icon}"></i> ${t.label}</span>
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
    if (el && window.JETLMotion) window.JETLMotion.enterNode(el);
    else if (el && typeof anim_NodeEnter === 'function') anim_NodeEnter(el);
    if (window.JETLSchemaUI && typeof JETLSchemaUI.updateNode === 'function') {
        setTimeout(() => JETLSchemaUI.updateNode(id), 0);
    }
    return id;
}

function initEngineDelegation() {
    document.addEventListener('click', (e) => {
        const schemaActionEl = e.target.closest('[data-schema-action]');
        const schemaAction = schemaActionEl?.getAttribute('data-schema-action');
        if (schemaActionEl && !window.JETLSchemaUI &&
            ['calc-open-editor', 'formatter-open-editor', 'list-concat-open-editor', 'substring-open-editor', 'splitter-open-editor', 'list-exploder-open-editor', 'strrep-open-editor', 'aggregator-open-editor', 'attr-manager-open-editor', 'attr-manager-v2-open-editor', 'geom-transform-open-editor'].includes(schemaAction)) {
            e.preventDefault();
            const nodeId = schemaActionEl.closest('.drawflow-node')?.id.replace('node-', '');
            window.JETLEnsureExtras?.().then(() => {
                if (!nodeId || !window.JETLSchemaUI) throw new Error('No se pudo preparar el editor del nodo');
                if (schemaAction === 'calc-open-editor') window.JETLSchemaUI.openCalcEditor(nodeId);
                else if (schemaAction === 'formatter-open-editor') window.JETLSchemaUI.openFormatterEditor(nodeId);
                else if (schemaAction === 'strrep-open-editor') window.JETLSchemaUI.openStringReplacerEditor(nodeId);
                else if (schemaAction === 'aggregator-open-editor') window.JETLSchemaUI.openAggregatorEditor(nodeId);
                else if (schemaAction === 'attr-manager-open-editor') window.JETLSchemaUI.openAttributeManagerEditor(nodeId, 'legacy');
                else if (schemaAction === 'attr-manager-v2-open-editor') window.JETLSchemaUI.openAttributeManagerEditor(nodeId, 'v2');
                else if (schemaAction === 'geom-transform-open-editor') window.JETLSchemaUI.openGeometryTransformEditor(nodeId);
                else {
                    const kind = { 'substring-open-editor': 'substring', 'splitter-open-editor': 'splitter', 'list-exploder-open-editor': 'exploder' }[schemaAction] || 'list';
                    window.JETLSchemaUI.openAttributeTextEditor(nodeId, kind);
                }
            }).catch((error) => {
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

async function runEngine() {
    window.isEngineCancelled = false;
    currentRunTimestamp = Date.now();
    const initialGraph = _getGraphDataSafe();
    beginRunTrace('Ejecución Total', 'full', Object.keys(initialGraph));
    log("--- INICIANDO EJECUCIÓN TOTAL ---");

    const runtime = typeof window.JETLEnsureRuntime === 'function'
        ? window.JETLEnsureRuntime()
        : window.JETLRuntimeReady;
    if (runtime && !(await runtime)) {
        const runtimeError = window.__JETL_RUNTIME_ERROR;
        publishRunReport(buildRunReport('Ejecución Total', 'error', runtimeError?.message || 'El motor no pudo cargarse'));
        log("FATAL: " + (runtimeError?.message || 'El motor no pudo cargarse'), "err");
        showToast("No se pudo preparar el motor", "error");
        finishRunMonitor('error');
        return;
    }

    document.querySelectorAll('.count-badge').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.eye-btn').forEach(b => b.classList.remove('active'));

    await new Promise(r => setTimeout(r, 50));

    const exportData = editor.export().drawflow.Home.data;
    const nodes = Object.values(exportData);
    const roots = nodes.filter(n => TOOL_REGISTRY[n.name].in === 0);

    if (roots.length === 0) {
        publishRunReport(buildRunReport('Ejecución Total', 'error', 'Añade un Reader para ejecutar el flujo'));
        log("Error: Añade un Reader", "err");
        showToast("Añade un Reader", "warning");
        finishRunMonitor('error');
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
        if (typeof logRunSummary === 'function') logRunSummary('Ejecución Total');
        publishRunReport(buildRunReport('Ejecución Total', 'ok', null));
        finishRunMonitor('ok');
        showToast("Proceso completado", "success");
        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            publishRunReport(buildRunReport('Ejecución Total', 'cancelled', null));
            finishRunMonitor('cancelled');
            log("Ejecución cancelada por el usuario.", "warn");
            showToast("Ejecución cancelada", "warning");
        } else {
            publishRunReport(buildRunReport('Ejecución Total', 'error', e && e.message ? e.message : String(e)));
            finishRunMonitor('error', getRunErrorNodeId());
            log("FATAL: " + e.message, "err");
            showToast("Error en ejecución", "error");
        }
    }
}

function cancelEngineRun() {
    window.isEngineCancelled = true;
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
    window.isEngineCancelled = false;
    currentRunTimestamp = Date.now();
    const initialGraph = _getGraphDataSafe();
    beginRunTrace(`Parcial #${targetId}`, 'partial', collectRequiredNodeIds(targetId, initialGraph));

    const runtime = typeof window.JETLEnsureRuntime === 'function'
        ? window.JETLEnsureRuntime()
        : window.JETLRuntimeReady;
    if (runtime && !(await runtime)) {
        const runtimeError = window.__JETL_RUNTIME_ERROR;
        publishRunReport(buildRunReport(`Parcial #${targetId}`, 'error', runtimeError?.message || 'El motor no pudo cargarse'));
        log("FATAL: " + (runtimeError?.message || 'El motor no pudo cargarse'), "err");
        showToast("No se pudo preparar el motor", "error");
        finishRunMonitor('error');
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
        if (typeof logRunSummary === 'function') logRunSummary(`Parcial #${targetId}`);
        publishRunReport(buildRunReport(`Parcial #${targetId}`, 'ok', null));
        finishRunMonitor('ok');
        showToast("Nodo actualizado", "success");

        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();

        if (executionData[targetId] && executionData[targetId].data) {
            const res = executionData[targetId].data;
            if (TOOL_REGISTRY[editor.getNodeFromId(targetId).name].out !== 0) {
                showOnMap(targetId);
                currentNodeId = String(targetId);
                if (typeof window.resolveNodeDisplayData === 'function') {
                    const info = window.resolveNodeDisplayData(String(targetId));
                    buildTable(info && info.data ? info.data : res);
                } else {
                    buildTable(res);
                }
            }
        }

    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            publishRunReport(buildRunReport(`Parcial #${targetId}`, 'cancelled', null));
            finishRunMonitor('cancelled');
            log("Ejecución parcial cancelada por el usuario.", "warn");
            showToast("Ejecución parcial cancelada", "warning");
        } else {
            publishRunReport(buildRunReport(`Parcial #${targetId}`, 'error', e && e.message ? e.message : String(e)));
            finishRunMonitor('error', getRunErrorNodeId());
            log("Error Parcial: " + e.message, "err");
            showToast("Error en ejecución parcial", "error");
        }
    }
}

function saveProject() {
    const exportData = editor.export();
    const project = {
        version: "2026.03.05",
        timestamp: Date.now(),
        flow: exportData
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flujo_jetl_${new Date().toISOString().slice(0, 10)}.jetl`;
    a.click();
    showToast("Proyecto guardado correctamente", "success");
}

function loadProject(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            const flowData = json.flow ? json.flow : json;

            // No se requiere auto-reparación de HTML porque los nodos ahora usan delegación
            // y no incrustan su propio ID en el template.

            // Limpieza profunda (igual que antes)
            editor.clear();
            clearAllRuntimeCaches();
            executionData = {};
            window.executionData = executionData;
            clearAllDirty();
            invalidateAllNodes('project_loaded');
            if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts();
            currentRunTimestamp = 0;
            if (typeof selectedRowSet !== 'undefined') selectedRowSet.clear();
            if (typeof symbologyByNode !== 'undefined') symbologyByNode = {};
            if (typeof currentSymbologyNode !== 'undefined') currentSymbologyNode = null;

            Object.values(mapLayers).forEach(l => {
                map.removeLayer(l);
                if (layerControl) layerControl.removeLayer(l);
            });
            mapLayers = {};

            if (layerControl) {
                map.removeControl(layerControl);
                layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
            }

            // Importamos los datos ya saneados
            editor.import(flowData);

            SafeStorage.save('jetl_flow_optimized', JSON.stringify(flowData));
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
            showToast("Proyecto cargado y reparado", "success");
        } catch (err) {
            console.error(err);
            showToast("Error al leer el archivo .jetl", "error");
        }
    };
    reader.readAsText(file);
    input.value = '';
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



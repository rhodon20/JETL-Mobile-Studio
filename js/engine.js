// =============================================
// 3. ENGINE & EVENTS
// =============================================
let editor, map, mapLayers = {}, executionData = {};
window.executionData = executionData;
window.lastRunReport = null;
let dirtyNodeMap = {};
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

function buildRunReport(label, status, errorMessage) {
    const exportData = (editor && typeof editor.export === 'function')
        ? (((editor.export() || {}).drawflow || {}).Home || {}).data || {}
        : {};
    const entries = Object.entries(executionData || {});
    const nodes = entries.map(([id, meta]) => {
        const node = exportData[id];
        const nodeName = node ? node.name : '';
        const tool = nodeName && window.TOOL_REGISTRY ? window.TOOL_REGISTRY[nodeName] : null;
        return {
            id: String(id),
            node: nodeName || 'unknown',
            label: tool ? tool.label : nodeName || 'unknown',
            ms: (meta && meta._ms) || 0,
            count: countFeaturesFromResult(meta ? meta.data : null),
            outputs: countOutputsFromResult(meta ? meta.data : null),
            cached: !!(meta && meta._runId !== currentRunTimestamp)
        };
    }).sort((a, b) => b.ms - a.ms);

    const totalMs = nodes.reduce((acc, n) => acc + (n.ms || 0), 0);
    const totalFeatures = nodes.reduce((acc, n) => acc + (n.count || 0), 0);
    return {
        version: '1.0',
        generated_at: new Date().toISOString(),
        run_id: currentRunTimestamp || Date.now(),
        label: label || 'Run',
        status: status || 'ok',
        error: errorMessage || null,
        summary: {
            nodes: nodes.length,
            total_ms: totalMs,
            total_features: totalFeatures
        },
        nodes
    };
}

const RUN_HISTORY_KEY = 'jetl_run_history_v1';
const RUN_HISTORY_LIMIT = 30;

function loadRunHistory() {
    try {
        const raw = SafeStorage.load(RUN_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[JETL] No se pudo leer el historial de ejecuciones', error);
        return [];
    }
}

function publishRunReport(report) {
    window.lastRunReport = report;
    try {
        const history = loadRunHistory();
        history.unshift(report);
        SafeStorage.save(RUN_HISTORY_KEY, JSON.stringify(history.slice(0, RUN_HISTORY_LIMIT)));
    } catch (error) {
        console.warn('[JETL] No se pudo guardar el historial de ejecuciones', error);
    }
    return report;
}

function getRunHistoryFocusId(report) {
    const partial = String(report?.label || '').match(/Parcial\s+#(.+)/i);
    if (partial) return partial[1];
    const executed = (report?.nodes || []).find((node) => !node.cached) || (report?.nodes || [])[0];
    return executed ? String(executed.id) : '';
}

function renderRunHistory() {
    const list = document.getElementById('run-history-list');
    if (!list) return;
    const history = loadRunHistory();
    if (!history.length) {
        list.innerHTML = `<div class="run-history-empty"><i class="fas fa-clock-rotate-left"></i><strong>Todavía no hay ejecuciones</strong><span>Las ejecuciones completas y parciales aparecerán aquí.</span></div>`;
        return;
    }
    const statusLabels = { ok: 'Completada', error: 'Error', cancelled: 'Cancelada', unknown: 'Sin estado' };
    list.innerHTML = history.map((report) => {
        const focusId = getRunHistoryFocusId(report);
        const date = new Date(report.generated_at || report.run_id || Date.now());
        const summary = report.summary || {};
        return `<article class="run-history-item run-status-${escapeFlowNavigatorHTML(report.status || 'unknown')}">
            <span class="run-history-status" aria-hidden="true"></span>
            <div class="run-history-copy">
                <strong>${escapeFlowNavigatorHTML(report.label || 'Ejecución')}</strong>
                <small>${escapeFlowNavigatorHTML(date.toLocaleString('es-ES'))} · ${summary.nodes || 0} nodos · ${Math.round(summary.total_ms || 0)} ms</small>
                ${report.error ? `<span class="run-history-error">${escapeFlowNavigatorHTML(report.error)}</span>` : ''}
            </div>
            <span class="run-history-badge">${escapeFlowNavigatorHTML(statusLabels[report.status] || report.status || 'Sin estado')}</span>
            ${focusId ? `<button type="button" class="run-history-focus" data-run-node-id="${escapeFlowNavigatorHTML(focusId)}" aria-label="Localizar nodo ${escapeFlowNavigatorHTML(focusId)}"><i class="fas fa-crosshairs"></i></button>` : ''}
        </article>`;
    }).join('');
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
            renderRunHistory();
            showToast('Historial borrado', 'success');
        }
        const focus = event.target.closest('[data-run-node-id]');
        if (focus) {
            const id = focus.getAttribute('data-run-node-id');
            closeRunHistory();
            window.JETLNativeNav?.('flow');
            requestAnimationFrame(() => focusFlowNode(id));
        }
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

function downloadRunReport(format = 'json') {
    const report = window.lastRunReport || buildRunReport('Manual', 'unknown', null);
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
        const head = 'id,node,label,ms,count,output_1,output_2,output_3,cached';
        const rows = (report.nodes || []).map(n => [
            n.id,
            `"${String(n.node || '').replace(/"/g, '""')}"`,
            `"${String(n.label || '').replace(/"/g, '""')}"`,
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

function addNodeClick(k) {
    const rect = document.getElementById('drawflow').getBoundingClientRect();
    addNode(k, rect.width / 2 + rect.left, rect.height / 2 + rect.top);
    if (window.innerWidth < 768) {
        window.JETLNativeNav?.('flow');
        window.JETLMobile?.fitFlowToViewport();
    }
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
    if (el && typeof anim_NodeEnter === 'function') anim_NodeEnter(el);
    if (window.JETLSchemaUI && typeof JETLSchemaUI.updateNode === 'function') {
        setTimeout(() => JETLSchemaUI.updateNode(id), 0);
    }
    return id;
}

function initEngineDelegation() {
    document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');

        if (action === 'cancel-run') cancelEngineRun();
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
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';
    log("--- INICIANDO EJECUCIÓN TOTAL ---");

    const runtime = typeof window.JETLEnsureRuntime === 'function'
        ? window.JETLEnsureRuntime()
        : window.JETLRuntimeReady;
    if (runtime && !(await runtime)) {
        const runtimeError = window.__JETL_RUNTIME_ERROR;
        publishRunReport(buildRunReport('Ejecución Total', 'error', runtimeError?.message || 'El motor no pudo cargarse'));
        log("FATAL: " + (runtimeError?.message || 'El motor no pudo cargarse'), "err");
        showToast("No se pudo preparar el motor", "error");
        loader.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
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
        loader.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
        return;
    }

    try {
        for (const r of roots) await processNode(r.id, exportData);
        if (window.isEngineCancelled) throw new Error("Ejecución cancelada por el usuario.");
        log("--- FIN EXITOSO ---");
        if (typeof logRunSummary === 'function') logRunSummary('Ejecución Total');
        publishRunReport(buildRunReport('Ejecución Total', 'ok', null));
        showToast("Proceso completado", "success");
        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            publishRunReport(buildRunReport('Ejecución Total', 'cancelled', null));
            log("Ejecución cancelada por el usuario.", "warn");
            showToast("Ejecución cancelada", "warning");
        } else {
            publishRunReport(buildRunReport('Ejecución Total', 'error', e && e.message ? e.message : String(e)));
            log("FATAL: " + e.message, "err");
            showToast("Error en ejecución", "error");
        }
    }
    loader.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
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
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function runEnginePartial(targetId) {
    window.isEngineCancelled = false;
    currentRunTimestamp = Date.now();
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';

    const runtime = typeof window.JETLEnsureRuntime === 'function'
        ? window.JETLEnsureRuntime()
        : window.JETLRuntimeReady;
    if (runtime && !(await runtime)) {
        const runtimeError = window.__JETL_RUNTIME_ERROR;
        publishRunReport(buildRunReport(`Parcial #${targetId}`, 'error', runtimeError?.message || 'El motor no pudo cargarse'));
        log("FATAL: " + (runtimeError?.message || 'El motor no pudo cargarse'), "err");
        showToast("No se pudo preparar el motor", "error");
        loader.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
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
            log("Ejecución parcial cancelada por el usuario.", "warn");
            showToast("Ejecución parcial cancelada", "warning");
        } else {
            publishRunReport(buildRunReport(`Parcial #${targetId}`, 'error', e && e.message ? e.message : String(e)));
            log("Error Parcial: " + e.message, "err");
            showToast("Error en ejecución parcial", "error");
        }
    }
    loader.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
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



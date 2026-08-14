// =============================================
// 3. ENGINE & EVENTS
// =============================================
let editor, map, mapLayers = {}, executionData = {};
window.executionData = executionData;
window.lastRunReport = null;
let dirtyNodeMap = {};

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

function initializeJETLApp() {
    if (jetlAppInitialized) return;
    jetlAppInitialized = true;
    try {
        const originalValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        Object.defineProperty(HTMLInputElement.prototype, 'value', {
            set: function (val) {
                if (this.type === 'file' && val !== "") return;
                originalValueSetter.call(this, val);
            }
        });
    } catch (e) { console.warn("No se pudo aplicar el parche de input file", e); }

    map = L.map('map', { renderer: L.canvas() }).setView([40.416, -3.703], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OSM contributors' }).addTo(map);
    layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);

    editor = new Drawflow(document.getElementById("drawflow"));
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.start();

    const saved = SafeStorage.load('jetl_flow_optimized');
    if (saved) {
        try { editor.import(JSON.parse(saved)); } catch (e) { console.error("Error importando flujo guardado:", e); }
    }

    ['nodeCreated', 'nodeRemoved', 'connectionCreated', 'connectionRemoved'].forEach(ev => {
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
            SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => JETLSchemaUI.refreshAll(), 0);
            }
        });
    });
    editor.on('nodeDataChanged', (nodeId) => {
        invalidateNodeAndDownstream(String(nodeId), 'node_data_changed');
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

    renderSidebar('');
    document.getElementById('sys-status').style.background = '#2ecc71';
    createGeoWorker();
    initQuickSearch();

    // --- CORRECCIÓN: Inicialización de Módulos Faltantes ---
    initHistory();
    initContextMenu();
    initEngineDelegation();

    const filterInput = document.getElementById('table-filter');
    if (filterInput) {
        filterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyTableFilter();
        });
    }
    if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
        setTimeout(() => JETLSchemaUI.refreshAll(), 0);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeJETLApp, { once: true });
} else {
    queueMicrotask(initializeJETLApp);
}

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

        cats[c].forEach(t => {
            itemsDiv.innerHTML += `<div class="node-item" draggable="true" data-k="${t.k}">
                <i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label}
            </div>`;
        });

        group.appendChild(title);
        group.appendChild(itemsDiv);
        container.appendChild(group);
    });
}
function filterTools(val) { renderSidebar(val); }

let qsMousePos = { x: 0, y: 0 };

function initQuickSearch() {
    const qs = document.getElementById('quick-search');
    const input = document.getElementById('qs-input');
    const results = document.getElementById('qs-results');
    const workspace = document.getElementById('workspace');

    workspace.addEventListener('mousemove', (e) => {
        if (qs.style.display !== 'block') {
            qsMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
            if (qs.style.display !== 'block') {
                qs.style.top = Math.min(qsMousePos.y, window.innerHeight - 300) + 'px';
                qs.style.left = Math.min(qsMousePos.x, window.innerWidth - 300) + 'px';
                qs.style.display = 'block';
                anime({ targets: qs, opacity: [0, 1], scale: [0.8, 1], duration: 200, easing: 'easeOutQuad' });
                input.value = '';
                input.focus();
            }
        }
        if (e.key === 'Escape') closeQS();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const sel = results.querySelector('.selected');
            if (sel) { addNode(sel.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top)); closeQS(); }
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

    input.addEventListener('keyup', (e) => {
        if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
        const val = input.value.toLowerCase();
        results.innerHTML = '';
        const matches = Object.entries(TOOL_REGISTRY).filter(([k, t]) => t.label.toLowerCase().includes(val) || t.cat.toLowerCase().includes(val));

        matches.slice(0, 10).forEach(([k, t], i) => {
            const item = document.createElement('div');
            item.className = 'qs-item' + (i === 0 ? ' selected' : '');
            item.dataset.k = k;
            item.innerHTML = `<i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label} <span style="font-size:0.7em;opacity:0.5;margin-left:auto">${t.cat}</span>`;
            results.appendChild(item);
        });

        anime({ targets: '.qs-item', opacity: [0, 1], translateX: [10, 0], delay: anime.stagger(30), duration: 300, easing: 'easeOutQuad' });
    });

    function closeQS() {
        anime({ targets: qs, opacity: 0, scale: 0.9, duration: 150, easing: 'easeInQuad', complete: () => { qs.style.display = 'none'; input.value = ''; document.activeElement.blur(); } });
    }

    document.addEventListener('click', (e) => { if (qs.style.display === 'block' && !qs.contains(e.target)) closeQS(); });
    results.addEventListener('click', (e) => {
        const item = e.target.closest('.qs-item');
        if (!item) return;
        addNode(item.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top));
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
    if (window.innerWidth < 768) toggleSidebar();
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
    if (el) {
        anim_NodeEnter(el);
    }
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
        else if (action === 'save-project') saveProject();
        else if (action === 'open-project') {
            const upload = document.getElementById('upload-jetl');
            if (upload) upload.click();
        }
        else if (action === 'export-run-report') downloadRunReport('json');
        else if (action === 'export-run-report-csv') downloadRunReport('csv');
        else if (action === 'open-templates' && typeof openTemplatesModal === 'function') openTemplatesModal();
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
        sidebar.addEventListener('click', (e) => {
            const catTitle = e.target.closest('.cat-title[data-cat-toggle]');
            if (catTitle) {
                const itemsDiv = catTitle.nextElementSibling;
                if (itemsDiv && itemsDiv.classList.contains('cat-items')) {
                    itemsDiv.classList.toggle('open');
                    catTitle.classList.toggle('active');
                }
                return;
            }

            const item = e.target.closest('.node-item');
            if (!item) return;
            const k = item.dataset.k;
            if (k) addNodeClick(k);
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
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';
    log("--- INICIANDO EJECUCIÓN TOTAL ---");

    currentRunTimestamp = Date.now();

    document.querySelectorAll('.count-badge').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.eye-btn').forEach(b => b.classList.remove('active'));

    await new Promise(r => setTimeout(r, 50));

    const exportData = editor.export().drawflow.Home.data;
    const nodes = Object.values(exportData);
    const roots = nodes.filter(n => TOOL_REGISTRY[n.name].in === 0);

    if (roots.length === 0) { log("Error: Añade un Reader", "err"); loader.style.display = 'none'; if (cancelBtn) cancelBtn.style.display = 'none'; return; }

    try {
        for (const r of roots) await processNode(r.id, exportData);
        if (window.isEngineCancelled) throw new Error("Ejecución cancelada por el usuario.");
        log("--- FIN EXITOSO ---");
        if (typeof logRunSummary === 'function') logRunSummary('Ejecución Total');
        window.lastRunReport = buildRunReport('Ejecución Total', 'ok', null);
        showToast("Proceso completado", "success");
        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            window.lastRunReport = buildRunReport('Ejecución Total', 'cancelled', null);
            log("Ejecución cancelada por el usuario.", "warn");
            showToast("Ejecución cancelada", "warning");
        } else {
            window.lastRunReport = buildRunReport('Ejecución Total', 'error', e && e.message ? e.message : String(e));
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
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';

    log(`--- Ejecución Parcial hasta nodo #${targetId} ---`);

    currentRunTimestamp = Date.now();

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
        window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'ok', null);
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
            window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'cancelled', null);
            log("Ejecución parcial cancelada por el usuario.", "warn");
            showToast("Ejecución parcial cancelada", "warning");
        } else {
            window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'error', e && e.message ? e.message : String(e));
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



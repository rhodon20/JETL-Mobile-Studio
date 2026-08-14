// =============================================
// VISUALIZACIÓN & UI HELPERS (CON SORTING)
// =============================================

// Variables de estado
let selectedFeatureIndex = null;
let currentSortCol = null;  // Nombre de la propiedad por la que ordenamos
let currentSortDir = 0;     // 0: Original, 1: Asc, -1: Desc
let selectedRowSet = new Set();
let tableFilter = { text: '', field: '' };
let symbologyByNode = {};
let currentSymbologyNode = null;
let tableToolbarBound = false;
let tableInteractionsBound = false;
let nodeViewPortById = {};
let portInspectorReady = false;
let featureCacheBrowserReady = false;
let mapPanelExpanded = false;
let prevBottomPanelHeight = '';
const FEATURE_CACHE_BROWSER_KEY = 'JETLFeatureCacheBrowserState';
let featureCacheBrowserState = { nodeId: '', port: '' };

function loadFeatureCacheBrowserState() {
    try {
        const raw = localStorage.getItem(FEATURE_CACHE_BROWSER_KEY);
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
            featureCacheBrowserState = {
                nodeId: obj.nodeId ? String(obj.nodeId) : '',
                port: obj.port ? String(obj.port) : ''
            };
        }
    } catch (_) { }
}

function saveFeatureCacheBrowserState() {
    try {
        localStorage.setItem(FEATURE_CACHE_BROWSER_KEY, JSON.stringify(featureCacheBrowserState));
    } catch (_) { }
}

loadFeatureCacheBrowserState();

function ensureStableFeatureIndex(fc) {
    if (!fc || !Array.isArray(fc.features)) return;
    const feats = fc.features;
    if (!feats.length) return;

    let valid = true;
    const seen = new Set();
    for (let i = 0; i < feats.length; i++) {
        const f = feats[i] || {};
        if (!f.properties || typeof f.properties !== 'object') f.properties = {};
        const idx = f.properties._idx;
        const ok = Number.isInteger(idx) && idx >= 0 && !seen.has(idx);
        if (!ok) { valid = false; break; }
        seen.add(idx);
    }
    if (valid) return;

    for (let i = 0; i < feats.length; i++) {
        const f = feats[i] || {};
        if (!f.properties || typeof f.properties !== 'object') f.properties = {};
        f.properties._idx = i;
    }
}
window.ensureStableFeatureIndex = ensureStableFeatureIndex;
window.resetNodeDisplayPorts = function (nodeId) {
    if (!nodeId) {
        nodeViewPortById = {};
        updatePortInspectorUI(null);
        return;
    }
    delete nodeViewPortById[String(nodeId)];
    updatePortInspectorUI(currentNodeId || null);
};

function ensurePortInspectorUI() {
    if (portInspectorReady) return;
    const contextBar = document.getElementById('results-context-bar');
    if (!contextBar) return;
    if (document.getElementById('port-inspector')) {
        portInspectorReady = true;
        return;
    }
    const wrap = document.createElement('div');
    wrap.id = 'port-inspector';
    wrap.style.marginLeft = '8px';
    wrap.style.display = 'none';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '6px';
    wrap.style.padding = '0 8px';
    wrap.style.borderLeft = '1px solid #333';
    wrap.innerHTML = `
        <span style="font-size:11px;color:#9aa0a6">Puerto</span>
        <select id="port-inspector-select" class="node-control" style="height:28px; min-width:92px; background:#111; color:#eee; border:1px solid #444; padding:2px 6px"></select>
    `;
    contextBar.appendChild(wrap);

    const sel = wrap.querySelector('#port-inspector-select');
    if (sel) {
        sel.addEventListener('change', async () => {
            const nodeId = sel.getAttribute('data-node-id');
            const port = sel.value;
            if (!nodeId || !port) return;
            nodeViewPortById[String(nodeId)] = port;
            if (String(currentNodeId || '') === String(nodeId) && executionData[nodeId]) {
                const info = resolveNodeDisplayData(nodeId, port);
                if (info && info.data) buildTable(info.data);
                if (mapLayers[nodeId]) {
                    await showOnMap(nodeId, port, false);
                }
            }
        });
    }
    portInspectorReady = true;
}

function updatePortInspectorUI(nodeId) {
    ensurePortInspectorUI();
    const wrap = document.getElementById('port-inspector');
    const sel = document.getElementById('port-inspector-select');
    if (!wrap || !sel) return;
    if (!nodeId || !executionData[nodeId]) {
        wrap.style.display = 'none';
        sel.innerHTML = '';
        sel.removeAttribute('data-node-id');
        return;
    }
    const info = _resolveNodePortData(nodeId, nodeViewPortById[nodeId] || null);
    const ports = info && Array.isArray(info.ports) ? info.ports : [];
    if (ports.length <= 1) {
        wrap.style.display = 'none';
        sel.innerHTML = '';
        sel.removeAttribute('data-node-id');
        return;
    }
    wrap.style.display = 'inline-flex';
    sel.setAttribute('data-node-id', String(nodeId));
    sel.innerHTML = ports.map((p) => `<option value="${p}">${p}</option>`).join('');
    const current = nodeViewPortById[nodeId] && ports.includes(nodeViewPortById[nodeId]) ? nodeViewPortById[nodeId] : ports[0];
    sel.value = current;
}
window.updatePortInspectorUI = updatePortInspectorUI;

function _countFromFC(fc) {
    return (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
}

function _getCachedNodeEntries() {
    const ids = Object.keys(executionData || {}).filter((id) => {
        const meta = executionData[id];
        if (!meta || !meta.data) return false;
        const d = meta.data;
        if (d && d.type === 'FeatureCollection') return true;
        return _listOutputPorts(d).length > 0;
    });

    ids.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return ids.map((id) => {
        const d = executionData[id].data;
        const ports = _listOutputPorts(d);
        const portCounts = {};
        let total = 0;
        if (d && d.type === 'FeatureCollection') {
            total = _countFromFC(d);
        } else {
            ports.forEach((p) => {
                portCounts[p] = _countFromFC(d[p]);
                total += portCounts[p];
            });
        }
        let label = `Nodo #${id}`;
        try {
            const n = editor && typeof editor.getNodeFromId === 'function' ? editor.getNodeFromId(id) : null;
            if (n && n.name && TOOL_REGISTRY[n.name]) label = `${TOOL_REGISTRY[n.name].label} (#${id})`;
        } catch (_) { }
        return { id: String(id), label, ports, portCounts, total };
    });
}

async function openFeatureCacheEntry(nodeId, preferredPort) {
    const id = String(nodeId || '');
    if (!id || !executionData[id]) return false;
    currentNodeId = id;
    let port = preferredPort ? String(preferredPort) : '';
    const info = resolveNodeDisplayData(id, port || null);
    if (!info || !info.data) return false;
    if (info.port) {
        nodeViewPortById[id] = info.port;
        port = info.port;
    }
    featureCacheBrowserState.nodeId = id;
    featureCacheBrowserState.port = port || '';
    saveFeatureCacheBrowserState();
    buildTable(info.data);
    await showOnMap(id, port || null, false);
    switchTab('table');
    return true;
}
window.openFeatureCacheEntry = openFeatureCacheEntry;

function ensureFeatureCacheBrowserUI() {
    if (featureCacheBrowserReady) return;
    const contextBar = document.getElementById('results-context-bar');
    if (!contextBar) return;
    if (document.getElementById('feature-cache-browser')) {
        featureCacheBrowserReady = true;
        return;
    }
    const wrap = document.createElement('div');
    wrap.id = 'feature-cache-browser';
    wrap.style.marginLeft = '8px';
    wrap.style.display = 'none';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '6px';
    wrap.style.padding = '0 8px';
    wrap.style.borderLeft = '1px solid #333';
    wrap.innerHTML = `
        <span style="font-size:11px;color:#9aa0a6">Cache</span>
        <select id="feature-cache-node" class="node-control" style="height:28px; min-width:170px; background:#111; color:#eee; border:1px solid #444; padding:2px 6px"></select>
        <select id="feature-cache-port" class="node-control" style="height:28px; min-width:96px; background:#111; color:#eee; border:1px solid #444; padding:2px 6px"></select>
        <button id="feature-cache-open" class="btn" style="height:28px;padding:0 10px" title="Abrir cache seleccionado">
            <i class="fas fa-database"></i>
        </button>
    `;
    contextBar.appendChild(wrap);

    const nodeSel = wrap.querySelector('#feature-cache-node');
    const portSel = wrap.querySelector('#feature-cache-port');
    const openBtn = wrap.querySelector('#feature-cache-open');

    const updatePorts = () => {
        const entries = _getCachedNodeEntries();
        const nodeId = nodeSel ? String(nodeSel.value || '') : '';
        const hit = entries.find((e) => e.id === nodeId);
        if (!portSel) return;
        if (!hit) {
            portSel.innerHTML = '<option value="">output_1</option>';
            portSel.disabled = true;
            return;
        }
        if (!hit.ports || hit.ports.length <= 1) {
            const fallbackPort = (hit.ports && hit.ports[0]) ? hit.ports[0] : 'output_1';
            portSel.innerHTML = `<option value="${fallbackPort}">${fallbackPort}</option>`;
            portSel.value = fallbackPort;
            portSel.disabled = true;
        } else {
            portSel.disabled = false;
            portSel.innerHTML = hit.ports.map((p) => {
                const c = hit.portCounts[p] || 0;
                return `<option value="${p}">${p} (${c})</option>`;
            }).join('');
            const preferred = featureCacheBrowserState.port && hit.ports.includes(featureCacheBrowserState.port)
                ? featureCacheBrowserState.port
                : hit.ports[0];
            portSel.value = preferred;
        }
    };

    if (nodeSel) {
        nodeSel.addEventListener('change', () => {
            featureCacheBrowserState.nodeId = String(nodeSel.value || '');
            featureCacheBrowserState.port = '';
            saveFeatureCacheBrowserState();
            updatePorts();
        });
    }
    if (portSel) {
        portSel.addEventListener('change', () => {
            featureCacheBrowserState.port = String(portSel.value || '');
            saveFeatureCacheBrowserState();
        });
    }
    if (openBtn) {
        openBtn.addEventListener('click', async () => {
            const id = nodeSel ? String(nodeSel.value || '') : '';
            const p = portSel ? String(portSel.value || '') : '';
            if (!id) return;
            await openFeatureCacheEntry(id, p || null);
        });
    }

    featureCacheBrowserReady = true;
}

function updateFeatureCacheBrowserUI() {
    ensureFeatureCacheBrowserUI();
    const wrap = document.getElementById('feature-cache-browser');
    const nodeSel = document.getElementById('feature-cache-node');
    const portSel = document.getElementById('feature-cache-port');
    if (!wrap || !nodeSel || !portSel) return;

    const entries = _getCachedNodeEntries();
    if (!entries.length) {
        wrap.style.display = 'none';
        nodeSel.innerHTML = '';
        portSel.innerHTML = '';
        return;
    }

    wrap.style.display = 'inline-flex';
    nodeSel.innerHTML = entries.map((e) => {
        return `<option value="${e.id}">${e.label} (${e.total})</option>`;
    }).join('');

    let selectedId = featureCacheBrowserState.nodeId && entries.some((e) => e.id === featureCacheBrowserState.nodeId)
        ? featureCacheBrowserState.nodeId
        : (currentNodeId && entries.some((e) => e.id === String(currentNodeId)) ? String(currentNodeId) : entries[0].id);
    nodeSel.value = selectedId;
    featureCacheBrowserState.nodeId = selectedId;

    const hit = entries.find((e) => e.id === selectedId);
    if (!hit || !hit.ports || hit.ports.length <= 1) {
        const fallbackPort = (hit && hit.ports && hit.ports[0]) ? hit.ports[0] : 'output_1';
        portSel.innerHTML = `<option value="${fallbackPort}">${fallbackPort}</option>`;
        portSel.value = fallbackPort;
        portSel.disabled = true;
        featureCacheBrowserState.port = fallbackPort;
    } else {
        portSel.disabled = false;
        portSel.innerHTML = hit.ports.map((p) => `<option value="${p}">${p} (${hit.portCounts[p] || 0})</option>`).join('');
        const chosenPort = featureCacheBrowserState.port && hit.ports.includes(featureCacheBrowserState.port)
            ? featureCacheBrowserState.port
            : hit.ports[0];
        portSel.value = chosenPort;
        featureCacheBrowserState.port = chosenPort;
    }
    saveFeatureCacheBrowserState();
}
window.updateFeatureCacheBrowserUI = updateFeatureCacheBrowserUI;

function bindTableToolbarActions() {
    if (tableToolbarBound) return;
    const toolbar = document.getElementById('table-toolbar');
    if (!toolbar) return;
    tableToolbarBound = true;

    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-table-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-table-action');
        if (action === 'apply-filter') applyTableFilter();
        else if (action === 'clear-filter') clearTableFilter();
        else if (action === 'export-geojson') exportSelection('geojson');
        else if (action === 'export-csv') exportSelection('csv');
        else if (action === 'clear-selection') clearSelection();
    });
}

function bindTableInteractions() {
    if (tableInteractionsBound) return;
    const container = document.getElementById('table-container');
    if (!container) return;
    tableInteractionsBound = true;

    container.addEventListener('click', (e) => {
        const sortHeader = e.target.closest('th[data-table-sort]');
        if (sortHeader) {
            const col = decodeURIComponent(sortHeader.getAttribute('data-table-sort') || '');
            if (col) handleSort(col, currentNodeId);
            return;
        }

        const row = e.target.closest('tr[data-row-index]');
        if (row && !e.target.closest('input[data-row-check]')) {
            const idx = parseInt(row.getAttribute('data-row-index'), 10);
            if (!isNaN(idx)) selectRow(idx, currentNodeId);
            return;
        }

        const checkAll = e.target.closest('input[data-table-check-all]');
        if (checkAll) toggleSelectAll(checkAll.checked);
    });

    container.addEventListener('change', (e) => {
        const rowCheck = e.target.closest('input[data-row-check]');
        if (!rowCheck) return;
        const idx = parseInt(rowCheck.getAttribute('data-row-check'), 10);
        if (isNaN(idx)) return;
        if (rowCheck.checked) selectedRowSet.add(idx);
        else selectedRowSet.delete(idx);
    });
}

// Función principal de pintado en el mapa
function zoomToAllLayers() {
    const group = new L.FeatureGroup();
    Object.values(mapLayers).forEach(layer => {
        if (layer) group.addLayer(layer);
    });
    if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
    } else {
        showToast("No hay capas visibles", "warn");
    }
}

function setMapPerfIndicator(info) {
    const mapEl = (map && typeof map.getContainer === 'function') ? map.getContainer() : document.getElementById('map');
    if (!mapEl) return;
    if (!mapEl.style.position || mapEl.style.position === 'static') mapEl.style.position = 'relative';

    let el = document.getElementById('map-perf-indicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'map-perf-indicator';
        el.style.position = 'absolute';
        el.style.right = '10px';
        el.style.bottom = '10px';
        el.style.zIndex = '1200';
        el.style.padding = '6px 10px';
        el.style.borderRadius = '6px';
        el.style.background = 'rgba(0,0,0,0.75)';
        el.style.border = '1px solid rgba(241,196,15,0.45)';
        el.style.color = '#f1c40f';
        el.style.fontSize = '12px';
        el.style.fontWeight = '600';
        el.style.pointerEvents = 'none';
        el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.35)';
        mapEl.appendChild(el);
    }

    if (!info || !info.total) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    if (info.reason === 'sampling') {
        el.textContent = `Modo rendimiento: mostrando ${info.shown.toLocaleString()} de ${info.total.toLocaleString()} entidades`;
    } else {
        el.textContent = `Modo rendimiento: interaccion limitada en ${info.total.toLocaleString()} entidades`;
    }
    el.style.display = 'block';
}

function _listOutputPorts(data) {
    if (!data || typeof data !== 'object' || data.type) return [];
    return Object.keys(data)
        .filter(k => /^output_\d+$/.test(k) && data[k] && data[k].type === 'FeatureCollection')
        .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10));
}

function _resolveNodePortData(nodeId, preferredPort) {
    const meta = executionData[nodeId];
    if (!meta || !meta.data) return { data: null, port: null, ports: [] };
    const raw = meta.data;
    if (raw && raw.type === 'FeatureCollection') return { data: raw, port: null, ports: [] };
    const ports = _listOutputPorts(raw);
    if (ports.length === 0) return { data: null, port: null, ports: [] };
    const chosen = (preferredPort && ports.includes(preferredPort))
        ? preferredPort
        : ((nodeViewPortById[nodeId] && ports.includes(nodeViewPortById[nodeId])) ? nodeViewPortById[nodeId] : ports[0]);
    return { data: raw[chosen] || null, port: chosen, ports };
}

function _choosePortInteractive(nodeId, ports) {
    if (!ports || ports.length <= 1) return Promise.resolve(ports && ports[0] ? ports[0] : null);
    const current = nodeViewPortById[nodeId] || ports[0];
    if (typeof window.showPortPickerToast === 'function') {
        return window.showPortPickerToast(nodeId, ports, current);
    }
    return Promise.resolve(current);
}

function resolveNodeDisplayData(nodeId, preferredPort = null) {
    const info = _resolveNodePortData(nodeId, preferredPort);
    if (info.port) nodeViewPortById[nodeId] = info.port;
    updatePortInspectorUI(nodeId);
    return info;
}
window.resolveNodeDisplayData = resolveNodeDisplayData;

async function showOnMap(id, preferredPort = null, askPort = false) {
    if (!map && typeof window.ensureJETLMap === 'function') window.ensureJETLMap();
    setMapPerfIndicator(null);
    let meta = executionData[id];
    if (!meta || !meta.data) { showToast("Nodo sin datos procesados", "error"); return; }

    // Normalizacion
    let data = null;
    let activePort = null;
    if (meta.data && meta.data.type === 'FeatureCollection') {
        data = meta.data;
    } else {
        const info = _resolveNodePortData(id, preferredPort);
        if (info.ports.length > 1 && askPort) {
            activePort = await _choosePortInteractive(id, info.ports);
            data = meta.data[activePort] || null;
        } else {
            activePort = info.port;
            data = info.data;
        }
        if (activePort) nodeViewPortById[id] = activePort;
        updatePortInspectorUI(id);
    }
    if (!data || !data.features || data.features.length === 0) { showToast("Geometría vacía", "warn"); return; }
    ensureStableFeatureIndex(data);

    // Limpieza
    if (mapLayers[id]) {
        map.removeLayer(mapLayers[id]);
        layerControl.removeLayer(mapLayers[id]);
        delete mapLayers[id];
    }

    const srcFeatures = Array.isArray(data.features) ? data.features : [];
    const isPointGeom = (f) => {
        const t = f && f.geometry && f.geometry.type;
        return t === 'Point' || t === 'MultiPoint';
    };
    const allPoints = srcFeatures.length > 0 && srcFeatures.every(isPointGeom);
    const PERF_POINT_THRESHOLD = 30000;
    const PERF_POINT_MAX_DRAW = 20000;
    const PERF_GENERIC_THRESHOLD = 12000;
    let drawData = data;
    let perfSampleInfo = null;

    // Modo rendimiento para capas masivas de puntos:
    // se aligera solo la vista del mapa sin tocar el dataset real del nodo.
    if (allPoints && srcFeatures.length > PERF_POINT_THRESHOLD) {
        const step = Math.ceil(srcFeatures.length / PERF_POINT_MAX_DRAW);
        const sampled = [];
        for (let i = 0; i < srcFeatures.length; i += step) sampled.push(srcFeatures[i]);
        drawData = turf.featureCollection(sampled);
        perfSampleInfo = { shown: sampled.length, total: srcFeatures.length, reason: 'sampling' };
    } else if (srcFeatures.length > PERF_GENERIC_THRESHOLD) {
        perfSampleInfo = { shown: srcFeatures.length, total: srcFeatures.length, reason: 'interaction' };
    }

    const nodeName = editor.getNodeFromId(id).name;
    const tool = TOOL_REGISTRY[nodeName];
    const customStyle = data._custom_style || null;
    const baseColor = (customStyle && customStyle.color) ? customStyle.color : (tool.color || '#3388ff');
    const portLabel = activePort ? ` [${activePort}]` : '';
    const layerName = `<span style="color:${baseColor}">■</span> ${tool.label} (#${id})${portLabel}`;
    currentSymbologyNode = id;
    setupSymbologyPanel(id, data);
    setMapPerfIndicator(perfSampleInfo);

    try {
        const perfMode = !!perfSampleInfo;
        const layer = L.geoJSON(drawData, {
            style: function (feature) {
                if (feature.properties && feature.properties._idx === selectedFeatureIndex) {
                    return { color: '#e74c3c', weight: 4, opacity: 1, fillColor: '#e74c3c', fillOpacity: 0.6 };
                }
                if (customStyle) return customStyle;
                if (feature.properties && feature.properties._custom_style) return feature.properties._custom_style;
                const symStyle = getSymbologyStyle(id, feature, baseColor);
                if (symStyle) return symStyle;
                return { color: baseColor, weight: 2, opacity: 0.8, fillColor: baseColor, fillOpacity: 0.2 };
            },
            pointToLayer: (feature, latlng) => {
                let c = baseColor;
                let r = perfMode ? 4 : 6;
                let w = perfMode ? 0 : 1;
                let border = perfMode ? baseColor : '#fff';

                if (feature.properties && feature.properties._idx === selectedFeatureIndex) {
                    c = '#e74c3c'; r = 9; w = 3; border = '#f1c40f';
                } else if (feature.properties && feature.properties.marker_color) {
                    c = feature.properties.marker_color;
                } else {
                    const symStyle = getSymbologyStyle(id, feature, baseColor);
                    if (symStyle && symStyle.color) c = symStyle.color;
                }
                return L.circleMarker(latlng, {
                    radius: r,
                    color: border,
                    weight: w,
                    fillColor: c,
                    fillOpacity: 0.9,
                    interactive: !perfMode
                });
            },
            onEachFeature: function (feature, layer) {
                if (perfMode) return;
                // Asignamos índice original inmutable
                if (!feature.properties || typeof feature.properties !== 'object') feature.properties = {};
                if (feature.properties._idx === undefined) {
                    feature.properties._idx = data.features.indexOf(feature);
                }

                layer.on('click', function (e) {
                    selectedFeatureIndex = feature.properties._idx;

                    if (mapLayers[id]) mapLayers[id].resetStyle();
                    if (layer.bringToFront) layer.bringToFront();

                    // Actualizar tabla si está visible
                    if (executionData[id]) {
                        // Importante: No reconstruimos todo para no perder el orden actual
                        // Pero debemos asegurar que la fila es visible (sync)
                        const tableContainer = document.getElementById('table-container');
                        if (tableContainer.style.display === 'block') {
                            // Si la fila está fuera de la ventana actual por el ordenamiento, reconstruimos
                            buildTable(executionData[id].data);
                        }
                    }
                    showToast(`Reg #${selectedFeatureIndex + 1} seleccionado.`, 'success');
                });

                if (feature.properties) {
                    let table = '<table style="font-size:10px; color: #333;">';
                    for (let k in feature.properties) {
                        if (k.startsWith('_')) continue;
                        let val = feature.properties[k];
                        if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(4);
                        table += `<tr><td><b>${k}</b></td><td>${val}</td></tr>`;
                    }
                    table += '</table>';
                    layer.bindPopup(table);
                }
            }
        }).addTo(map);

        layerControl.addOverlay(layer, layerName);
        mapLayers[id] = layer;

        syncMapFocus(id);
        switchTab('map');
        if (perfSampleInfo) {
            if (perfSampleInfo.reason === 'sampling') {
                showToast(`Modo rendimiento mapa: ${perfSampleInfo.shown}/${perfSampleInfo.total} puntos mostrados`, 'warn');
            } else {
                showToast(`Modo rendimiento mapa: interaccion limitada (${perfSampleInfo.total} entidades)`, 'warn');
            }
        }

    } catch (e) {
        console.error(e);
        showToast("Error renderizando mapa", "error");
    }
}

// Lógica de Ordenación
function sortFeatures(features) {
    if (!currentSortCol || currentSortDir === 0) return features; // Sin orden

    // Creamos una copia superficial para no mutar el orden original permanentemente si queremos volver
    // Pero necesitamos devolver un array ordenado para renderizar
    const sorted = [...features].sort((a, b) => {
        let valA = a.properties[currentSortCol];
        let valB = b.properties[currentSortCol];

        // Manejo de nulos
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        // Detección de números
        const isNum = typeof valA === 'number' && typeof valB === 'number';

        if (valA < valB) return isNum ? -1 * currentSortDir : -1 * currentSortDir;
        if (valA > valB) return isNum ? 1 * currentSortDir : 1 * currentSortDir;
        return 0;
    });
    return sorted;
}

function handleSort(colName, nodeId) {
    if (currentSortCol === colName) {
        // Ciclo: Asc (1) -> Desc (-1) -> Original (0)
        if (currentSortDir === 1) currentSortDir = -1;
        else if (currentSortDir === -1) currentSortDir = 0;
        else currentSortDir = 1;
    } else {
        currentSortCol = colName;
        currentSortDir = 1; // Default Asc
    }

    // Resetear ventana al ordenar para ver los primeros resultados
    // Opcional: intentar mantener la selección visible
    if (executionData[nodeId]) buildTable(executionData[nodeId].data);
}

// Construye tabla de atributos (CON SORTING + VENTANA)
function buildTable(data) {
    bindTableToolbarActions();
    bindTableInteractions();
    const container = document.getElementById('table-container');
    const toolbar = document.getElementById('table-toolbar');
    container.innerHTML = '';

    if (!data || !data.type) {
        if (currentNodeId) {
            const info = resolveNodeDisplayData(currentNodeId);
            data = info.data;
            updatePortInspectorUI(currentNodeId);
        } else {
            data = data && (data.output_1 || data.output_2 || data.output_3);
            updatePortInspectorUI(null);
        }
    }
    if (!data || !data.features || data.features.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'table-empty';
        empty.style.padding = '20px';
        empty.style.textAlign = 'center';
        empty.style.color = '#aaa';
        empty.innerText = 'Sin datos.';
        container.appendChild(empty);
        return;
    }
    ensureStableFeatureIndex(data);

    // 1. Obtener features y aplicar ordenación/filtro
    let features = data.features;

    // Filtro rápido
    let filtered = features;
    if (tableFilter.text && tableFilter.text.trim() !== '') {
        const q = tableFilter.text.toLowerCase();
        const field = tableFilter.field;
        filtered = features.filter(f => {
            const props = f.properties || {};
            if (field) {
                const v = props[field];
                return v !== undefined && String(v).toLowerCase().includes(q);
            }
            return Object.values(props).some(v => String(v).toLowerCase().includes(q));
        });
    }

    // Aplicamos ordenación visual (no afecta al mapa, solo a la tabla)
    const displayFeatures = sortFeatures(filtered);
    const total = displayFeatures.length;

    // 2. Buscar dónde quedó la selección tras ordenar
    let visualIndex = -1;
    if (selectedFeatureIndex !== null) {
        visualIndex = displayFeatures.findIndex(f => f.properties._idx === selectedFeatureIndex);
    }

    // 3. Ventana Deslizante basada en el índice visual
    const windowSize = 200;
    let start = 0;
    let end = Math.min(total, windowSize);

    if (visualIndex !== -1) {
        const half = Math.floor(windowSize / 2);
        if (visualIndex > half) {
            start = visualIndex - half;
            end = visualIndex + half;
            if (end > total) { end = total; start = Math.max(0, total - windowSize); }
        }
    }

    const firstProps = features[0].properties || {};
    const headers = Object.keys(firstProps).filter(k => !k.startsWith('_'));
    const fieldSel = document.getElementById('table-filter-field');
    if (fieldSel) {
        const prev = tableFilter.field || '';
        fieldSel.innerHTML = '';
        const optEmpty = document.createElement('option');
        optEmpty.value = '';
        optEmpty.textContent = 'Todos los campos';
        fieldSel.appendChild(optEmpty);
        headers.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            fieldSel.appendChild(opt);
        });
        fieldSel.value = headers.includes(prev) ? prev : '';
    }

    // Header HTML con iconos de ordenación
    let html = '<table class="attr-table"><thead><tr><th><input type="checkbox" data-table-check-all></th><th>#</th>';
    headers.forEach(h => {
        let icon = '';
        if (currentSortCol === h) {
            if (currentSortDir === 1) icon = ' <i class="fas fa-sort-up" style="color:#fff"></i>';
            if (currentSortDir === -1) icon = ' <i class="fas fa-sort-down" style="color:#fff"></i>';
        }
        // Añadimos onclick al header
        html += `<th data-table-sort="${encodeURIComponent(h)}" style="cursor:pointer; user-select:none;">${h}${icon}</th>`;
    });
    html += '</tr></thead><tbody>';

    if (start > 0) {
        html += `<tr><td colspan="${headers.length + 2}" style="text-align:center; background:#222; color:#777; font-style:italic; padding:8px;">... ${start} anteriores ...</td></tr>`;
    }

    for (let i = start; i < end; i++) {
        const f = displayFeatures[i];
        const globalIdx = f.properties._idx;
        const isSelected = (globalIdx === selectedFeatureIndex) ? 'style="background:#2c3e50; color:#fff; border-left: 4px solid #e74c3c;"' : '';
        const isChecked = selectedRowSet.has(globalIdx) ? 'checked' : '';

        // Usamos globalIdx para la selección lógica, pero mostramos i+1 visual si queremos posición relativa
        // O mejor, mostramos globalIdx+1 para coherencia con el mapa
        html += `<tr id="tr-row-${globalIdx}" data-row-index="${globalIdx}" ${isSelected} style="cursor:pointer; transition: background 0.2s">
                    <td><input type="checkbox" data-row-check="${globalIdx}" ${isChecked}></td>
                    <td>${globalIdx + 1}</td>`;

        const props = f.properties || {};
        headers.forEach(h => {
            let val = props[h];
            if (val === undefined || val === null) val = '';
            else if (typeof val === 'object') {
                try {
                    const txt = JSON.stringify(val);
                    val = txt.length > 120 ? txt.slice(0, 117) + '...' : txt;
                } catch (e) {
                    val = '[Obj]';
                }
            }
            else if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(4);
            const text = String(val);
            const esc = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            html += `<td title="${esc}">${esc}</td>`;
        });
        html += '</tr>';
    }

    if (end < total) {
        html += `<tr><td colspan="${headers.length + 2}" style="text-align:center; background:#222; color:#777; font-style:italic; padding:8px;">... ${total - end} restantes ...</td></tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
    if (toolbar) container.prepend(toolbar);

    if (selectedFeatureIndex !== null) syncTableFocus();
}

// Helper selección (Tabla -> Mapa)
function selectRow(idx, nodeId) {
    selectedFeatureIndex = idx;

    // Actualizar visualmente la fila seleccionada
    const allRows = document.querySelectorAll('#table-container tbody tr');
    allRows.forEach((r) => {
        // Importante: chequeamos ID porque el orden visual puede ser distinto
        if (r.id === `tr-row-${idx}`) {
            r.style.background = '#2c3e50';
            r.style.color = '#fff';
            r.style.borderLeft = '4px solid #e74c3c';
        } else if (r.id && r.id.startsWith('tr-row-')) {
            r.style.background = '';
            r.style.color = '';
            r.style.borderLeft = '';
        }
    });

    if (mapLayers[nodeId]) mapLayers[nodeId].resetStyle();
    showToast(`Registro #${idx + 1} enfocado.`, 'success');
}

function applyTableFilter() {
    const input = document.getElementById('table-filter');
    const fieldSel = document.getElementById('table-filter-field');
    tableFilter.text = input ? input.value : '';
    tableFilter.field = fieldSel ? fieldSel.value : '';
    if (currentNodeId && executionData[currentNodeId]) buildTable(executionData[currentNodeId].data);
}

function clearTableFilter() {
    const input = document.getElementById('table-filter');
    const fieldSel = document.getElementById('table-filter-field');
    if (input) input.value = '';
    if (fieldSel) fieldSel.value = '';
    tableFilter.text = '';
    tableFilter.field = '';
    if (currentNodeId && executionData[currentNodeId]) buildTable(executionData[currentNodeId].data);
}

function toggleSelectAll(cbOrChecked) {
    if (!currentNodeId || !executionData[currentNodeId]) return;
    const checked = typeof cbOrChecked === 'boolean'
        ? cbOrChecked
        : !!(cbOrChecked && cbOrChecked.checked);
    let data = executionData[currentNodeId].data;
    if (!data || !data.type) {
        const info = resolveNodeDisplayData(currentNodeId);
        data = info.data;
    }
    if (!data || !data.features) return;
    if (checked) {
        data.features.forEach(f => {
            if (f.properties && f.properties._idx !== undefined) selectedRowSet.add(f.properties._idx);
        });
    } else {
        selectedRowSet.clear();
    }
    buildTable(data);
}

function clearSelection() {
    selectedRowSet.clear();
    if (currentNodeId && executionData[currentNodeId]) buildTable(executionData[currentNodeId].data);
}

function exportSelection(fmt) {
    if (!currentNodeId || !executionData[currentNodeId]) return;
    let data = executionData[currentNodeId].data;
    if (!data || !data.type) {
        const info = resolveNodeDisplayData(currentNodeId);
        data = info.data;
    }
    if (!data || !data.features) return;
    const selected = data.features.filter(f => f.properties && selectedRowSet.has(f.properties._idx));
    if (selected.length === 0) { showToast("No hay selección", "warn"); return; }
    const fc = turf.featureCollection(selected);
    if (fmt === 'csv') download(toCSV(fc), 'selection.csv', 'text/csv');
    else download(JSON.stringify(fc), 'selection.geojson', 'application/json');
}

function updateBadges() {
    Object.keys(executionData).forEach(id => {
        const meta = executionData[id];
        const nodeEl = document.getElementById('node-' + id);
        if (!nodeEl) return;

        let badge = nodeEl.querySelector('.node-badge-count');
        let timeBadge = nodeEl.querySelector('.node-badge-time');

        // Soporte a proyectos antiguos (Legacy)
        if (!badge) {
            badge = document.getElementById('b-' + id);
            timeBadge = document.getElementById('t-' + id);
        }

        if (!badge) return;

        let count = 0;
        const d = meta.data;
        if (d && d.features) count = d.features.length;
        else if (d && d.output_1) count = d.output_1.features.length + (d.output_2?.features.length || 0);

        badge.style.display = 'inline-block';
        badge.className = 'count-badge node-badge-count';
        if (meta._runId === currentRunTimestamp) badge.classList.add('badge-green');
        else badge.classList.add('badge-orange');

        let startVal = 0;
        const currentText = badge.innerText;
        if (currentText && currentText.length > 0) {
            if (currentText.includes('k')) startVal = parseFloat(currentText) * 1000;
            else startVal = parseInt(currentText) || 0;
        }

        if (startVal === count) {
            badge.innerText = count > 1000 ? (count / 1000).toFixed(1) + 'k' : count;
            if (timeBadge) timeBadge.innerText = formatMs(meta._ms);
            return;
        }

        const animObj = { val: startVal };
        anime({
            targets: animObj,
            val: count,
            easing: 'easeOutExpo',
            round: 1,
            duration: 1500,
            update: function () {
                const current = animObj.val;
                badge.innerText = current > 1000 ? (current / 1000).toFixed(1) + 'k' : current;
            }
        });
        if (timeBadge) timeBadge.innerText = formatMs(meta._ms);
    });
    updateFeatureCacheBrowserUI();
}

function formatMs(ms) {
    if (ms === null || ms === undefined) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// =============================================
// HELPERS UI
// =============================================
function toggleSidebar() {
    const s = document.getElementById('sidebar');
    s.classList.toggle('open');
    const ov = document.getElementById('sidebar-overlay');
    if (ov) ov.style.display = s.classList.contains('open') ? 'block' : 'none';
}

function togglePanelHeight() {
    if (mapPanelExpanded) return;
    const body = document.body;
    const button = document.getElementById('btn-panel-collapse');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) {
        body.classList.remove('mobile-results-open');
        if (window.JETLMobile) window.JETLMobile.closeTransientViews();
        document.querySelectorAll('[data-mobile-view]').forEach((item) => {
            item.classList.toggle('active', item.dataset.mobileView === 'flow');
        });
        return;
    }

    const collapsed = body.classList.toggle('panel-collapsed');
    if (button) {
        button.setAttribute('aria-expanded', String(!collapsed));
        button.setAttribute('aria-label', collapsed ? 'Mostrar visor' : 'Ocultar visor');
        button.title = collapsed ? 'Mostrar visor' : 'Ocultar visor';
        button.innerHTML = collapsed
            ? '<i class="fas fa-chevron-up"></i><span class="panel-action-label">Mostrar</span>'
            : '<i class="fas fa-chevron-down"></i><span class="panel-action-label">Ocultar</span>';
    }
    setTimeout(() => {
        if (map && typeof map.invalidateSize === 'function') map.invalidateSize();
    }, 350);
}

function updateMapExpandButton() {
    const btn = document.getElementById('btn-map-expand');
    if (!btn) return;
    btn.title = mapPanelExpanded ? 'Restaurar mapa' : 'Ampliar mapa';
    btn.innerHTML = mapPanelExpanded
        ? '<i class="fas fa-down-left-and-up-right-to-center"></i>'
        : '<i class="fas fa-up-right-and-down-left-from-center"></i>';
}

function toggleMapPanelExpand(forceState) {
    const body = document.body;
    const panel = document.getElementById('bottom-panel');
    if (!body || !panel) return;
    const targetState = (typeof forceState === 'boolean') ? forceState : !mapPanelExpanded;
    if (targetState === mapPanelExpanded) return;

    if (targetState) {
        prevBottomPanelHeight = panel.style.height || '';
        mapPanelExpanded = true;
        body.classList.add('map-panel-maximized');
        switchTab('map');
    } else {
        mapPanelExpanded = false;
        body.classList.remove('map-panel-maximized');
        panel.style.height = prevBottomPanelHeight || '40vh';
    }
    updateMapExpandButton();
    setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
    }, 220);
}
window.toggleMapPanelExpand = toggleMapPanelExpand;

function switchTab(t) {
    if (!['map', 'table', 'logs'].includes(t)) return false;
    document.querySelectorAll('#panel-tabs [data-results-view]').forEach((button) => {
        const active = button.getAttribute('data-results-view') === t;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    });

    ['map', 'logs', 'table-container'].forEach(x => {
        const el = document.getElementById(x);
        if (el) el.style.display = 'none';
    });

    const showId = (t === 'table') ? 'table-container' : t;
    const toShow = document.getElementById(showId);
    if (toShow) toShow.style.display = 'block';

    if (document.body.classList.contains('panel-collapsed')) togglePanelHeight();

    if (t === 'map') {
        if (!map && typeof window.ensureJETLMap === 'function') window.ensureJETLMap();
        setTimeout(() => {
            if (map && typeof map.invalidateSize === 'function') map.invalidateSize();
            if (selectedFeatureIndex !== null && currentNodeId) syncMapFocus(currentNodeId);
        }, 300);
        const panel = document.getElementById('symbology-panel');
        if (panel && currentSymbologyNode) panel.style.display = 'none';
    } else if (t === 'table') {
        setTimeout(() => {
            syncTableFocus();
        }, 100);
        const panel = document.getElementById('symbology-panel');
        if (panel) panel.style.display = 'none';
    } else {
        const panel = document.getElementById('symbology-panel');
        if (panel) panel.style.display = 'none';
    }
    return true;
}
window.switchTab = switchTab;

// Sincronización
function syncMapFocus(nodeId) {
    if (selectedFeatureIndex === null || !mapLayers[nodeId]) return;

    const layerGroup = mapLayers[nodeId];
    const layers = layerGroup.getLayers ? layerGroup.getLayers() : [];
    const target = layers.find(l => l.feature && l.feature.properties._idx === selectedFeatureIndex);

    if (target) {
        if (target.getBounds) map.fitBounds(target.getBounds(), { maxZoom: 18, padding: [50, 50] });
        else if (target.getLatLng) map.setView(target.getLatLng(), 18);
        target.openPopup();
    }
}

function syncTableFocus() {
    if (selectedFeatureIndex === null) return;
    const row = document.getElementById(`tr-row-${selectedFeatureIndex}`);
    if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        anime({ targets: row, backgroundColor: ['#e74c3c', '#2c3e50'], duration: 1000, easing: 'linear' });
    }
}

function log(m, t) {
    const l = document.getElementById('logs');
    if (!l) return;
    const ts = new Date().toLocaleTimeString();
    const color = t === 'err' ? '#e74c3c' : (t === 'success' ? '#2ecc71' : (t === 'warn' ? '#f1c40f' : '#bbb'));
    l.innerHTML += `<div style="color:${color};margin-bottom:4px;font-family:monospace;font-size:0.9em">
                        <span style="opacity:0.5;margin-right:5px">[${ts}]</span>${m}
                    </div>`;
    l.scrollTop = l.scrollHeight;
}

let toastAutoHideTimer = null;
let toastInteractiveCleanup = null;

function clearToastInteractive() {
    if (typeof toastInteractiveCleanup === 'function') {
        try { toastInteractiveCleanup(); } catch (_) { }
    }
    toastInteractiveCleanup = null;
}

function showToast(m, type) {
    const t = document.getElementById('toast');
    if (!t) return console.log(m);
    const msgEl = document.getElementById('toast-msg');
    clearToastInteractive();
    if (toastAutoHideTimer) {
        clearTimeout(toastAutoHideTimer);
        toastAutoHideTimer = null;
    }
    if (msgEl) msgEl.innerText = m;

    t.style.borderLeft = `4px solid ${type === 'error' ? '#e74c3c' : (type === 'warn' ? '#f1c40f' : '#2ecc71')}`;
    t.style.pointerEvents = 'none';
    t.className = 'visible';
    anime.remove(t);
    anime({ targets: t, translateY: [50, 0], opacity: [0, 1], scale: [0.9, 1], easing: 'spring(1, 80, 10, 0)', duration: 800 });
    toastAutoHideTimer = setTimeout(() => {
        anime({ targets: t, opacity: 0, translateY: 20, duration: 300, easing: 'easeInQuad', complete: () => { t.className = ''; } });
    }, 3000);
}

function showPortPickerToast(nodeId, ports, currentPort) {
    return new Promise((resolve) => {
        const t = document.getElementById('toast');
        const msgEl = document.getElementById('toast-msg');
        if (!t || !msgEl || !ports || ports.length === 0) return resolve(currentPort || null);

        clearToastInteractive();
        if (toastAutoHideTimer) {
            clearTimeout(toastAutoHideTimer);
            toastAutoHideTimer = null;
        }
        const fallback = currentPort || ports[0];
        const buttons = ports.map((p) => {
            const active = p === fallback;
            const bg = active ? '#2ecc71' : '#2a2a2a';
            const color = active ? '#111' : '#ddd';
            return `<button type="button" data-toast-port="${p}" style="border:1px solid #555;background:${bg};color:${color};padding:4px 8px;border-radius:12px;cursor:pointer;font-size:12px">${p}</button>`;
        }).join('');

        msgEl.innerHTML = `<span style="margin-right:6px">Nodo #${nodeId}: elige puerto</span>${buttons}`;
        t.style.borderLeft = '4px solid #3498db';
        t.style.pointerEvents = 'auto';
        t.className = 'visible';
        anime.remove(t);
        anime({ targets: t, translateY: [50, 0], opacity: [0, 1], scale: [0.9, 1], easing: 'spring(1, 80, 10, 0)', duration: 500 });

        const onClick = (e) => {
            const btn = e.target.closest('[data-toast-port]');
            if (!btn) return;
            finish(btn.getAttribute('data-toast-port') || fallback);
        };
        const finish = (chosen) => {
            clearToastInteractive();
            t.style.pointerEvents = 'none';
            anime({ targets: t, opacity: 0, translateY: 20, duration: 220, easing: 'easeInQuad', complete: () => { t.className = ''; } });
            resolve(chosen || fallback);
        };
        const onEsc = (e) => {
            if (e.key === 'Escape') finish(fallback);
        };

        t.addEventListener('click', onClick);
        document.addEventListener('keydown', onEsc);
        const ttl = setTimeout(() => finish(fallback), 7000);

        toastInteractiveCleanup = () => {
            t.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onEsc);
            clearTimeout(ttl);
        };
    });
}
window.showPortPickerToast = showPortPickerToast;

async function loadFile(input, _) {
    const file = input.files[0];
    if (!file) return;

    let nodeId = '';
    const nodeEl = input.closest('.drawflow-node');
    if (nodeEl) nodeId = nodeEl.id.replace('node-', '');

    // Suport for legacy or new template
    let lbl = null;
    if (nodeId) lbl = document.getElementById('lbl-' + nodeId);
    if (!lbl && input.parentElement) lbl = input.parentElement.querySelector('.file-lbl');

    if (lbl) lbl.innerText = "Leyendo...";

    try {
        const loader = document.getElementById('loader');
        const loaderMsg = document.getElementById('loader-msg');
        if (file.size > 5 * 1024 * 1024 && loader) {
            loader.style.display = 'flex';
            if (loaderMsg) loaderMsg.innerText = "Leyendo archivo pesado...";
        }

        if (file.name.match(/\.tif|\.tiff$/i)) {
            if (lbl) { lbl.innerText = `${file.name}`; lbl.style.color = "#2ecc71"; }
            if (loader) loader.style.display = 'none';
            return;
        }

        let geojson = null;
        if (window.JETLFormats && JETLFormats.readFile) {
            geojson = await JETLFormats.readFile(file);
        }

        if (!geojson) throw new Error("Formato no soportado en vista previa");
        if (typeof ensureFC === 'function') geojson = ensureFC(geojson);

        if (!window._file_cache) window._file_cache = {};
        if (nodeId) window._file_cache['file_' + nodeId] = geojson;

        // Mantener legacy si el template es el antiguo
        if (nodeId) {
            const hiddenInput = document.getElementById('d-' + nodeId);
            if (hiddenInput) hiddenInput.value = JSON.stringify(geojson);
        }
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();

        if (lbl) { lbl.innerText = `${file.name} (${geojson.features.length} fts)`; lbl.style.color = "#2ecc71"; }
        if (loader) loader.style.display = 'none';
    } catch (e) {
        console.warn(e);
        if (lbl) { lbl.innerText = "Error/Pendiente"; lbl.style.color = "#e67e22"; }
        showToast(e.message || "Error leyendo archivo", "error");
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
}

function logRunSummary(label) {
    const entries = Object.entries(executionData || {});
    if (entries.length === 0) return;
    const list = entries
        .map(([id, meta]) => {
            const name = editor.getNodeFromId(id).name;
            const tool = TOOL_REGISTRY[name];
            const count = meta && meta.data && meta.data.features ? meta.data.features.length : 0;
            return { id, label: tool ? tool.label : name, ms: meta._ms || 0, count };
        })
        .sort((a, b) => b.ms - a.ms);
    log(`--- Resumen ${label || ''} ---`, 'info');
    list.slice(0, 12).forEach(n => {
        log(`#${n.id} ${n.label} | ${n.ms}ms | ${n.count} fts`, 'info');
    });
}

function download(c, n, t) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: t })); a.download = n; a.click(); }

function toCSV(g) {
    if (!g || !g.features || g.features.length === 0) return "";
    const props = new Set();
    g.features.forEach(f => Object.keys(f.properties || {}).forEach(k => !k.startsWith('_') && props.add(k)));
    const h = Array.from(props);
    const escape = v => {
        if (v === null || v === undefined) return '';
        let s = String(v);
        if (s.includes('"')) s = s.replace(/"/g, '""');
        if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
        return s;
    };
    const rows = g.features.map(f => h.map(k => escape(f.properties ? f.properties[k] : '')).join(','));
    return h.join(',') + '\n' + rows.join('\n');
}

function clearCanvas() {
    if (!confirm("¿Borrar todo?")) return;
    editor.clear();
    if (window.JETLRuntimeCache && typeof window.JETLRuntimeCache.clearAll === 'function') {
        window.JETLRuntimeCache.clearAll();
    }
    SafeStorage.clear('jetl_flow_optimized');
    Object.values(mapLayers).forEach(l => { map.removeLayer(l); layerControl.removeLayer(l); });
    mapLayers = {};
    executionData = {};
    window.executionData = executionData;
    if (window.JETLDirty && typeof window.JETLDirty.clearAll === 'function') window.JETLDirty.clearAll();
    if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts();
    featureCacheBrowserState = { nodeId: '', port: '' };
    saveFeatureCacheBrowserState();
    updateFeatureCacheBrowserUI();
    selectedFeatureIndex = null;
    currentSortCol = null;
    currentSortDir = 0;
    selectedRowSet.clear();
    tableFilter = { text: '', field: '' };
    symbologyByNode = {};
    currentSymbologyNode = null;
    const panel = document.getElementById('symbology-panel');
    if (panel) panel.style.display = 'none';
    log("Canvas limpio.", "warn");
}

function anim_NodeEnter(domElement) { if (!domElement) return; anime({ targets: domElement, scale: [0, 1], opacity: [0, 1], duration: 800, easing: 'easeOutElastic(1, .6)' }); }
function anim_NodeError(id) { const el = document.getElementById('node-' + id); if (!el) return; anime({ targets: el, translateX: [-10, 10, -5, 5, 0], duration: 500, easing: 'easeInOutQuad' }); }
function anim_NodeSuccess(id) { const el = document.getElementById('node-' + id); if (!el) return; anime({ targets: el, scale: [1, 1.1, 1], boxShadow: ['0 0 0 0px rgba(46, 204, 113, 0.7)', '0 0 0 10px rgba(46, 204, 113, 0)'], duration: 600, easing: 'easeOutQuad' }); }
function anim_CableFlow(nodeId) {
    const selector = `.drawflow .connection.node_in_node-${nodeId} .main-path`;
    const cables = document.querySelectorAll(selector);
    if (cables.length === 0) return;
    cables.forEach(c => { c.style.strokeDasharray = ''; c.style.strokeDashoffset = ''; });
    anime({
        targets: cables,
        stroke: [{ value: '#00ffcc', duration: 200, easing: 'linear' }, { value: '#777', duration: 500, delay: 1000, easing: 'easeInQuad' }],
        strokeWidth: [{ value: 5, duration: 200 }, { value: 3, duration: 500, delay: 1000 }],
        strokeDasharray: [{ value: '20 10', duration: 100 }],
        strokeDashoffset: [{ value: [200, 0], duration: 1200, easing: 'linear' }],
        complete: function (anim) { cables.forEach(c => { c.style.stroke = ''; c.style.strokeWidth = ''; c.style.strokeDasharray = ''; c.style.strokeDashoffset = ''; }); }
    });
}

// =============================================
// Symbology
// =============================================
function setupSymbologyPanel(nodeId, data) {
    const panel = document.getElementById('symbology-panel');
    const fieldSelect = document.getElementById('symbology-field');
    if (!panel || !fieldSelect) return;
    panel.style.display = 'block';
    fieldSelect.innerHTML = '';
    const features = data.features || [];
    if (!features.length) return;
    const sampleProps = features[0].properties || {};
    const fields = Object.keys(sampleProps).filter(k => !k.startsWith('_'));
    fields.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        fieldSelect.appendChild(opt);
    });
    const existing = symbologyByNode[nodeId];
    if (existing && existing.field) fieldSelect.value = existing.field;
}

function applySymbology() {
    if (!currentSymbologyNode) return;
    const field = document.getElementById('symbology-field').value;
    const mode = document.getElementById('symbology-mode').value;
    const meta = executionData[currentSymbologyNode];
    if (!meta || !meta.data || !meta.data.features) return;
    const values = meta.data.features.map(f => f.properties ? f.properties[field] : null)
        .filter(v => v !== undefined && v !== null);
    if (values.length === 0) {
        showToast("Campo sin valores válidos", "warn");
        return;
    }
    const cfg = { field, mode, palette: {}, breaks: [] };
    if (mode === 'categorical') {
        const uniq = Array.from(new Set(values.map(v => String(v)))).slice(0, 20);
        uniq.forEach((v, idx) => cfg.palette[v] = pickColor(idx));
    } else {
        const nums = values.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
        const q = [0.2, 0.4, 0.6, 0.8];
        cfg.breaks = q.map(p => nums[Math.floor(p * (nums.length - 1))]);
    }
    symbologyByNode[currentSymbologyNode] = cfg;
    showOnMap(currentSymbologyNode);
    showToast("Simbología aplicada", "success");
}

function toggleSymbologyPanel() {
    const panel = document.getElementById('symbology-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function getSymbologyStyle(nodeId, feature, fallback) {
    const cfg = symbologyByNode[nodeId];
    if (!cfg || !feature.properties) return null;
    const val = feature.properties[cfg.field];
    if (val === undefined || val === null) return null;
    if (cfg.mode === 'categorical') {
        const key = String(val);
        const color = cfg.palette[key] || fallback;
        return { color, weight: 2, opacity: 0.8, fillColor: color, fillOpacity: 0.4 };
    } else {
        const num = Number(val);
        if (isNaN(num)) return null;
        const b = cfg.breaks;
        let idx = 0;
        if (num > b[3]) idx = 4;
        else if (num > b[2]) idx = 3;
        else if (num > b[1]) idx = 2;
        else if (num > b[0]) idx = 1;
        const color = pickColor(idx);
        return { color, weight: 2, opacity: 0.8, fillColor: color, fillOpacity: 0.4 };
    }
}

function pickColor(i) {
    const palette = ['#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#f1c40f', '#2ecc71', '#95a5a6'];
    return palette[i % palette.length];
}





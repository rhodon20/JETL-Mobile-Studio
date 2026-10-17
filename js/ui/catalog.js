// Catálogo de herramientas (barra lateral y arrastrar al lienzo), navegador
// del flujo y búsqueda rápida.
import { addNode, addNodeClick } from '../engine.js';

// Durante el arranque el motor pinta el catálogo una sola vez, después de registrar
// también los paquetes comunitarios: antes de que el editor esté montado no se repinta.
JETLEvents.on('tools:changed', () => {
    if (!(window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready')) return;
    const f = document.getElementById('sidebar-filter-input');
    renderSidebar(f ? String(f.value || '') : '');
});

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
        title.innerHTML = `<span>${JETLEscapeHtml(c)}</span> <i class="fas fa-chevron-down"></i>`;

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'cat-items';

        if (filter && filter.length > 0) {
            itemsDiv.classList.add('open');
            title.classList.add('active');
        }

        const supportsDrag = !window.matchMedia('(pointer: coarse)').matches;
        cats[c].forEach(t => {
            itemsDiv.innerHTML += `<div class="node-item" draggable="${supportsDrag}" data-k="${JETLEscapeHtml(t.k)}">
                <i class="fas ${JETLEscapeHtml(t.icon)}" style="color:${JETLEscapeHtml(t.color)}"></i> ${JETLEscapeHtml(t.label)}
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

// Drawflow mueve y escala su lienzo interno, pero la cuadrícula pertenece
// al contenedor. Sin sincronizarla, un flujo vacío parece inmóvil aunque
// los gestos funcionen. Mantener ambos en el mismo sistema de coordenadas
// da feedback visible inmediato para paneo y pinch-to-zoom.
function syncCanvasViewport() {
    const drawflowElement = document.getElementById('drawflow');
    if (!editor || !drawflowElement) return;
    const zoom = Number.isFinite(editor.zoom) ? editor.zoom : 1;
    const x = Number.isFinite(editor.canvas_x) ? editor.canvas_x : 0;
    const y = Number.isFinite(editor.canvas_y) ? editor.canvas_y : 0;
    drawflowElement.style.backgroundPosition = x + 'px ' + y + 'px';
    drawflowElement.style.backgroundSize = (25 * zoom) + 'px ' + (25 * zoom) + 'px';
    drawflowElement.dataset.viewport = Math.round(x) + ',' + Math.round(y) + ',' + zoom.toFixed(2);
}
window.JETLSyncCanvasViewport = syncCanvasViewport;

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
            item.innerHTML = `<i class="fas ${JETLEscapeHtml(t.icon)}" style="color:${JETLEscapeHtml(t.color)}"></i> ${JETLEscapeHtml(t.label)} <span style="font-size:0.7em;opacity:0.5;margin-left:auto">${JETLEscapeHtml(t.cat)}</span>`;
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

function drag(e) { e.dataTransfer.setData("node", e.target.dataset.k); }
function drop(e) { e.preventDefault(); const k = e.dataTransfer.getData("node"); if (k) addNode(k, e.clientX, e.clientY); }
function allowDrop(e) { e.preventDefault(); }

export {
    renderSidebar, filterTools, syncCanvasViewport, createTouchIntentTracker, escapeFlowNavigatorHTML,
    initFlowNavigator, openFlowNavigator, closeFlowNavigator, focusFlowNode, initQuickSearch, allowDrop, drop
};

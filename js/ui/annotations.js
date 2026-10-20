// Anotaciones del flujo (Desktop: JETLAnnotations). Se guardan en
// editor.drawflow.annotations, así viajan solas con el borrador, el proyecto
// .jetl y el historial. Dos formas, pensadas para el móvil:
// - nota suelta: pósit en el lienzo; se arrastra (con ajuste a la cuadrícula) y
//   se edita al tocarla;
// - anotación de un nodo: franja dentro del propio nodo, que lo acompaña sin
//   tapar la otra columna del zigzag. Un nodo tiene como mucho una.
import { addToHistory } from '../state/history.js';
import { saveDraft } from '../state/draft.js';

const COLORS = ['#f1c40f', '#3498db', '#2ecc71', '#e74c3c'];
const GRID = 25;
const TAP_SLOP = 8;

function notes() {
    if (!Array.isArray(editor.drawflow.annotations)) editor.drawflow.annotations = [];
    return editor.drawflow.annotations;
}

function findNote(id) {
    return notes().find((note) => note.id === id) || null;
}

function noteForNode(nodeId) {
    return notes().find((note) => String(note.nodeId) === String(nodeId)) || null;
}

function commit() {
    addToHistory();
    saveDraft(editor.export());
    renderAnnotations();
}

function nextId() {
    const used = new Set(notes().map((note) => note.id));
    let n = notes().length + 1;
    while (used.has(`annotation_${n}`)) n++;
    return `annotation_${n}`;
}

// Hueco libre para una nota nueva: el centro de la vista o, si ahí hay un nodo
// u otra nota, la primera posición libre por debajo.
function freeSpotNearViewportCenter() {
    const view = document.getElementById('drawflow').getBoundingClientRect();
    const canvas = editor.precanvas.getBoundingClientRect();
    const zoom = Number(editor.zoom || 1);
    const snap = (v) => Math.round(v / GRID) * GRID;
    const x = snap((view.left + view.width / 2 - canvas.left) / zoom - 110);
    let y = snap((view.top + view.height / 2 - canvas.top) / zoom - 50);
    const boxes = [
        ...[...document.querySelectorAll('.drawflow-node')].map((el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })),
        ...notes().filter((note) => !note.nodeId).map((note) => ({ x: Number(note.x) || 0, y: Number(note.y) || 0, w: 220, h: 80 }))
    ];
    const hits = (py) => boxes.some((b) => x < b.x + b.w && x + 220 > b.x && py < b.y + b.h && py + 80 > b.y);
    for (let guard = 0; guard < 400 && hits(y); guard++) y += GRID;
    return { x, y };
}

function noteHtml(note, extraClass) {
    return `<div class="${extraClass}" data-annotation-id="${JETLEscapeHtml(note.id)}" style="--annotation-color:${JETLEscapeHtml(note.color || COLORS[0])}">
        <i class="fas fa-note-sticky" aria-hidden="true"></i><span>${JETLEscapeHtml(note.text)}</span></div>`;
}

function renderAnnotations() {
    if (!editor?.precanvas) return;
    let layer = document.getElementById('annotation-layer');
    if (!layer || layer.parentElement !== editor.precanvas) {
        layer = document.createElement('div');
        layer.id = 'annotation-layer';
        editor.precanvas.append(layer);
    }
    // Las anotaciones de nodos que ya no existen se descartan.
    const all = notes();
    for (let i = all.length - 1; i >= 0; i--) {
        if (all[i].nodeId && !document.getElementById('node-' + all[i].nodeId)) all.splice(i, 1);
    }
    layer.innerHTML = all.filter((note) => !note.nodeId).map((note) => {
        const html = noteHtml(note, 'canvas-note');
        return html.replace('style="', `style="left:${Number(note.x) || 0}px;top:${Number(note.y) || 0}px;`);
    }).join('');
    document.querySelectorAll('.drawflow-node > .node-note').forEach((el) => el.remove());
    all.filter((note) => note.nodeId).forEach((note) => {
        const nodeEl = document.getElementById('node-' + note.nodeId);
        nodeEl.insertAdjacentHTML('beforeend', noteHtml(note, 'node-note'));
        editor.updateConnectionNodes('node-' + note.nodeId);
    });
}

// --- Editor de una anotación -------------------------------------------------

let editing = null; // { id } de la existente o { nodeId, point } de la nueva

function ensureDialog() {
    let modal = document.getElementById('annotation-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'annotation-modal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'annotation-title');
    modal.innerHTML = `<div class="modal-content annotation-content">
        <div class="modal-header">
            <div class="modal-title"><i class="fas fa-note-sticky"></i><div><strong id="annotation-title">Nota</strong><small id="annotation-subtitle"></small></div></div>
            <button class="modal-close" type="button" data-annotation-cancel aria-label="Cerrar"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body annotation-body">
            <textarea id="annotation-text" rows="4" placeholder="Escribe la nota…"></textarea>
            <div class="annotation-colors" role="radiogroup" aria-label="Color">${COLORS.map((c) =>
                `<button type="button" role="radio" data-annotation-color="${c}" style="--swatch:${c}" aria-label="Color ${c}"></button>`).join('')}</div>
        </div>
        <div class="modal-footer">
            <button class="btn annotation-delete" type="button" data-annotation-delete><i class="fas fa-trash-can"></i> Eliminar</button>
            <button class="btn" type="button" data-annotation-cancel>Cancelar</button>
            <button class="btn btn-primary" type="button" data-annotation-save>Guardar</button>
        </div>
    </div>`;
    modal.addEventListener('click', (event) => {
        const swatch = event.target.closest('[data-annotation-color]');
        if (swatch) {
            modal.querySelectorAll('[data-annotation-color]').forEach((b) => b.setAttribute('aria-checked', String(b === swatch)));
            return;
        }
        if (event.target === modal || event.target.closest('[data-annotation-cancel]')) closeNoteEditor();
        else if (event.target.closest('[data-annotation-save]')) saveFromDialog();
        else if (event.target.closest('[data-annotation-delete]')) deleteFromDialog();
    });
    document.body.append(modal);
    return modal;
}

function openNoteEditor(target) {
    const modal = ensureDialog();
    editing = target;
    const note = target.id ? findNote(target.id) : null;
    const nodeId = note ? note.nodeId : target.nodeId;
    const node = nodeId && editor.getNodeFromId(nodeId);
    const tool = node && TOOL_REGISTRY[node.name];
    document.getElementById('annotation-title').textContent = note ? 'Editar nota' : 'Nueva nota';
    document.getElementById('annotation-subtitle').textContent = node ? `Anotación de ${tool ? tool.label : node.name} #${nodeId}` : 'Nota en el lienzo';
    const text = document.getElementById('annotation-text');
    text.value = note ? note.text : '';
    const color = note ? note.color : COLORS[0];
    modal.querySelectorAll('[data-annotation-color]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.annotationColor === color)));
    modal.querySelector('[data-annotation-delete]').hidden = !note;
    modal.style.display = 'flex';
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    setTimeout(() => text.focus(), 50);
}

function closeNoteEditor() {
    const modal = document.getElementById('annotation-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    editing = null;
    if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
}

function saveFromDialog() {
    const text = document.getElementById('annotation-text').value.trim();
    const color = document.querySelector('#annotation-modal [data-annotation-color][aria-checked="true"]')?.dataset.annotationColor || COLORS[0];
    if (!text) {
        showToast('Escribe algo en la nota', 'warning');
        return;
    }
    const now = Date.now();
    const existing = editing?.id ? findNote(editing.id) : null;
    if (existing) {
        Object.assign(existing, { text, color, updatedAt: now });
    } else {
        const point = editing?.nodeId ? { x: 0, y: 0 } : freeSpotNearViewportCenter();
        notes().push({
            id: nextId(), type: 'custom', title: editing?.nodeId ? 'Anotación vinculada' : 'Anotación',
            text, color, nodeId: editing?.nodeId ? String(editing.nodeId) : null,
            x: point.x, y: point.y, width: 220, createdAt: now, updatedAt: now
        });
    }
    closeNoteEditor();
    commit();
}

function deleteFromDialog() {
    const id = editing?.id;
    const list = notes();
    const index = list.findIndex((note) => note.id === id);
    closeNoteEditor();
    if (index < 0) return;
    list.splice(index, 1);
    commit();
    showToast('Nota eliminada · Deshacer la recupera', 'success');
}

// Nota suelta (sin selección) o anotación del nodo (crea o edita la suya).
function annotate(nodeId = null) {
    const existing = nodeId ? noteForNode(nodeId) : null;
    openNoteEditor(existing ? { id: existing.id } : { nodeId });
}

// --- Tocar y arrastrar ------------------------------------------------------

let drag = null; // { id, el, startX, startY, x, y, moved }

function onPointerDown(event) {
    const el = event.target.closest('.canvas-note, .node-note');
    // En multiselección un toque sólo marca nodos.
    if (!el || document.body.classList.contains('multi-select-mode')) return;
    // Que Drawflow no arrastre el lienzo ni el nodo.
    event.stopPropagation();
    const note = findNote(el.dataset.annotationId);
    if (!note) return;
    drag = { id: note.id, el, startX: event.clientX, startY: event.clientY, x: Number(note.x) || 0, y: Number(note.y) || 0, moved: false, free: !note.nodeId };
    if (drag.free) el.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
    if (!drag || !drag.free) return;
    const zoom = Number(editor.zoom || 1);
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < TAP_SLOP) return;
    drag.moved = true;
    drag.el.style.left = `${drag.x + dx}px`;
    drag.el.style.top = `${drag.y + dy}px`;
}

function onPointerUp(event) {
    if (!drag) return;
    const current = drag;
    drag = null;
    if (!current.moved) {
        openNoteEditor({ id: current.id });
        return;
    }
    const note = findNote(current.id);
    const zoom = Number(editor.zoom || 1);
    const snap = (v) => Math.round(v / GRID) * GRID;
    note.x = snap(current.x + (event.clientX - current.startX) / zoom);
    note.y = snap(current.y + (event.clientY - current.startY) / zoom);
    note.updatedAt = Date.now();
    commit();
}

function initAnnotations() {
    const canvas = document.getElementById('drawflow');
    if (!canvas || canvas.dataset.annotationsReady) return;
    canvas.dataset.annotationsReady = '1';
    canvas.addEventListener('pointerdown', onPointerDown, true);
    // Drawflow escucha mousedown/touchstart: tampoco deben llegarle desde una nota.
    ['mousedown', 'touchstart'].forEach((type) => canvas.addEventListener(type, (event) => {
        if (event.target.closest('.canvas-note, .node-note')) event.stopPropagation();
    }, true));
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    editor.on('import', () => renderAnnotations());
    editor.on('nodeRemoved', () => renderAnnotations());
    JETLEvents.on('workspace:reset', () => renderAnnotations());
    JETLEvents.on('workspace:replaced', () => renderAnnotations());
    renderAnnotations();
}

export { initAnnotations, annotate, renderAnnotations, noteForNode };

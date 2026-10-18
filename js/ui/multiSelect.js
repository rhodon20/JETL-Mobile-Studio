// Multiselección táctil del lienzo. En el modo de selección tocar un nodo lo
// marca o desmarca (sus controles y puertos no reaccionan) y arrastrar uno
// marcado arrastra a todos. Las acciones sobre el grupo las ofrece el panel
// «Acciones»; este módulo sólo guarda la selección y la pinta.
import { moveNodeTo } from '../engine.js';

const picked = new Set();
let active = false;
let dragLast = null;   // { id, x, y }: última posición vista del nodo arrastrado
let pressStart = null; // punto donde empezó el toque, para distinguir toque de arrastre
const TAP_SLOP = 8;

function nodeData(id) {
    return editor.drawflow.drawflow.Home.data[id];
}

function paint() {
    document.querySelectorAll('.drawflow-node').forEach((el) => {
        el.classList.toggle('is-picked', picked.has(el.id.replace('node-', '')));
    });
    const banner = document.getElementById('multi-select-banner');
    if (banner) banner.querySelector('span').textContent = `${picked.size} ${picked.size === 1 ? 'nodo' : 'nodos'}`;
}

function isSelecting() {
    return active;
}

function pickedIds() {
    // Sólo los que siguen existiendo (deshacer o eliminar pueden quitarlos).
    return [...picked].filter((id) => nodeData(id));
}

function startSelection(initialId) {
    active = true;
    picked.clear();
    if (initialId) picked.add(String(initialId));
    document.body.classList.add('multi-select-mode');
    paint();
}

function stopSelection() {
    active = false;
    picked.clear();
    dragLast = null;
    document.body.classList.remove('multi-select-mode');
    paint();
}

function setPicked(ids) {
    picked.clear();
    ids.forEach((id) => picked.add(String(id)));
    paint();
}

function pickAll() {
    setPicked(Object.keys(editor.drawflow.drawflow.Home.data));
}

function onCanvasClick(event) {
    if (!active) return;
    const nodeEl = event.target.closest('.drawflow-node');
    if (!nodeEl) return;
    // En el modo de selección un toque sólo marca: ni acciones del nodo ni editores.
    event.stopPropagation();
    event.preventDefault();
    // Al soltar un arrastre el navegador también lanza click: no debe desmarcar.
    if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > TAP_SLOP) return;
    const id = nodeEl.id.replace('node-', '');
    if (picked.has(id)) picked.delete(id);
    else picked.add(id);
    paint();
}

// Drawflow mueve sólo el nodo que se arrastra; el resto del grupo le sigue con
// el mismo desplazamiento. Las posiciones quedan en los datos antes de que
// Drawflow anuncie nodeMoved, así el historial guarda el grupo en un paso.
function onMouseMove() {
    if (!active || !editor.drag || !editor.ele_selected) {
        dragLast = null;
        return;
    }
    const id = editor.ele_selected.id.replace('node-', '');
    if (!picked.has(id)) return;
    const node = nodeData(id);
    if (!dragLast || dragLast.id !== id) return;
    const dx = node.pos_x - dragLast.x;
    const dy = node.pos_y - dragLast.y;
    if (!dx && !dy) return;
    dragLast = { id, x: node.pos_x, y: node.pos_y };
    picked.forEach((other) => {
        if (other === id) return;
        const data = nodeData(other);
        if (data) moveNodeTo(other, data.pos_x + dx, data.pos_y + dy);
    });
}

function initMultiSelect() {
    const canvas = document.getElementById('drawflow');
    if (!canvas || document.getElementById('multi-select-banner')) return;
    canvas.addEventListener('click', onCanvasClick, true);
    // Al empezar a arrastrar un nodo marcado se toma su posición de partida.
    canvas.addEventListener('pointerdown', (event) => {
        pressStart = { x: event.clientX, y: event.clientY };
        const id = event.target.closest('.drawflow-node')?.id.replace('node-', '');
        const node = active && id && picked.has(id) ? nodeData(id) : null;
        dragLast = node ? { id, x: node.pos_x, y: node.pos_y } : null;
    }, true);
    editor.on('mouseMove', onMouseMove);
    editor.on('nodeRemoved', (id) => { picked.delete(String(id)); paint(); });
    JETLEvents.on('workspace:reset', stopSelection);
    // Deshacer/rehacer rehace el lienzo: se conserva la selección que siga existiendo.
    // Cargar un proyecto o una plantilla sí termina el modo.
    JETLEvents.on('workspace:replaced', (e) => {
        if (e && e.source === 'history') setPicked(pickedIds());
        else stopSelection();
    });

    const banner = document.createElement('div');
    banner.id = 'multi-select-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<i class="fas fa-object-group" aria-hidden="true"></i> Seleccionando · <span>0 nodos</span><button type="button">Listo</button>';
    banner.querySelector('button').addEventListener('click', stopSelection);
    document.body.append(banner);
}

export { initMultiSelect, isSelecting, pickedIds, startSelection, stopSelection, setPicked, pickAll };

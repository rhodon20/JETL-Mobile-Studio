// Color propio de un nodo (Acciones > Color): marca el nodo en el lienzo y su capa
// en el mapa, para reconocer qué se está viendo. Se guarda en node.data.jetl_color,
// así viaja con el borrador, el proyecto .jetl y al duplicar sin más código. Como
// el resto de la configuración del nodo, no entra en deshacer (state/history.js sólo
// guarda nodos, posiciones y conexiones).
import { saveDraft } from '../state/draft.js';

const NODE_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#ec407a'];
const KEY = 'jetl_color';

function nodeData(nodeId) {
    return (editor && editor.drawflow && editor.drawflow.drawflow.Home.data[nodeId]) || null;
}

// Sólo colores de la paleta: el valor llega de proyectos importados y acaba en estilos.
function getNodeColor(nodeId) {
    const node = nodeData(nodeId);
    const color = node && node.data ? node.data[KEY] : null;
    return NODE_COLORS.includes(color) ? color : null;
}

function applyNodeColor(nodeId) {
    const el = document.getElementById('node-' + nodeId);
    if (!el) return;
    const color = getNodeColor(nodeId);
    el.classList.toggle('has-node-color', !!color);
    if (color) el.style.setProperty('--node-color', color);
    else el.style.removeProperty('--node-color');
}

function applyAllNodeColors() {
    const nodes = editor && editor.drawflow ? editor.drawflow.drawflow.Home.data : {};
    Object.keys(nodes || {}).forEach(applyNodeColor);
}

// null quita el color. Se guarda el borrador; no se avisa con
// nodeDataChanged: eso invalidaría el resultado del nodo, y el color no lo cambia.
function setNodeColor(nodeId, color) {
    const node = nodeData(nodeId);
    if (!node) return;
    const value = NODE_COLORS.includes(color) ? color : null;
    const data = { ...(node.data || {}) };
    if (value) data[KEY] = value;
    else delete data[KEY];
    editor.updateNodeDataFromId(nodeId, data);
    applyNodeColor(nodeId);
    saveDraft(editor.export());
}

function initNodeColors() {
    editor.on('nodeDataChanged', (id) => applyNodeColor(id));
    JETLEvents.on('workspace:replaced', applyAllNodeColors);
    applyAllNodeColors();
}

export { NODE_COLORS, getNodeColor, setNodeColor, initNodeColors };

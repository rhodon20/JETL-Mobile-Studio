// Color del resultado de un nodo en el mapa (Acciones > Color en mapa), para reconocer qué
// capa es cada una. El nodo no cambia en el lienzo. Se guarda en node.data.jetl_color,
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
    JETLEvents.emit('node:color', { id: String(nodeId), color: value });
    saveDraft(editor.export());
}

export { NODE_COLORS, getNodeColor, setNodeColor };

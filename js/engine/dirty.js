// Nodos cuyo resultado ya no vale (dueño único de dirtyNodeMap). El motor
// re-ejecuta un nodo sucio aunque tenga caché; editar un nodo o sus conexiones
// ensucia también todo lo que cuelga de él.
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

export {
    _getGraphDataSafe, markNodeDirty, clearNodeDirty, clearAllDirty, invalidateAllNodes,
    invalidateNodeAndDownstream, isNodeDirty
};

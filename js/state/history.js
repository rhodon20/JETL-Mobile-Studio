const historyStack = [];
let historyIndex = -1;
let isUndoRedoAction = false;
let historyShadowState = null;
let historyTransactionDepth = 0;
let historyTransactionPending = false;

const HISTORY_LIMIT = 200;

function _cloneState(state) {
    if (typeof structuredClone === 'function') {
        try { return structuredClone(state); } catch (e) { }
    }
    if (typeof window !== 'undefined' && typeof window.JETLCloneFallback === 'function') {
        return window.JETLCloneFallback(state);
    }
    return state;
}

function _exportState() {
    return _cloneState(editor.export());
}

function _getHomeData(state) {
    return (((state || {}).drawflow || {}).Home || {}).data || {};
}

function _edgeKey(edge) {
    return `${edge.from}|${edge.output}|${edge.to}|${edge.input}`;
}

function _collectEdges(state) {
    const data = _getHomeData(state);
    const edges = [];
    Object.keys(data).forEach((id) => {
        const outputs = (data[id] && data[id].outputs) || {};
        Object.keys(outputs).forEach((outPort) => {
            const conns = Array.isArray(outputs[outPort].connections) ? outputs[outPort].connections : [];
            conns.forEach((c) => {
                edges.push({
                    from: String(id),
                    output: outPort,
                    to: String(c.node),
                    input: c.output
                });
            });
        });
    });
    return edges;
}

function _shallowNodeEqual(a, b) {
    if (!a || !b) return false;
    return a.pos_x === b.pos_x && a.pos_y === b.pos_y;
}

function _computeDiff(prevState, nextState) {
    const prevData = _getHomeData(prevState);
    const nextData = _getHomeData(nextState);

    const addedNodes = {};
    const removedNodes = {};
    const movedNodes = {};

    const allIds = new Set([...Object.keys(prevData), ...Object.keys(nextData)]);
    allIds.forEach((id) => {
        const prevNode = prevData[id];
        const nextNode = nextData[id];
        if (!prevNode && nextNode) {
            addedNodes[id] = _cloneState(nextNode);
            return;
        }
        if (prevNode && !nextNode) {
            removedNodes[id] = _cloneState(prevNode);
            return;
        }
        if (prevNode && nextNode && !_shallowNodeEqual(prevNode, nextNode)) {
            movedNodes[id] = {
                from: { x: prevNode.pos_x, y: prevNode.pos_y },
                to: { x: nextNode.pos_x, y: nextNode.pos_y }
            };
        }
    });

    const prevEdges = _collectEdges(prevState);
    const nextEdges = _collectEdges(nextState);
    const prevMap = new Map(prevEdges.map((e) => [_edgeKey(e), e]));
    const nextMap = new Map(nextEdges.map((e) => [_edgeKey(e), e]));

    const addedEdges = [];
    const removedEdges = [];

    nextMap.forEach((edge, key) => {
        if (!prevMap.has(key)) addedEdges.push(edge);
    });
    prevMap.forEach((edge, key) => {
        if (!nextMap.has(key)) removedEdges.push(edge);
    });

    const hasNodeDelta = Object.keys(addedNodes).length || Object.keys(removedNodes).length || Object.keys(movedNodes).length;
    const hasEdgeDelta = addedEdges.length || removedEdges.length;
    if (!hasNodeDelta && !hasEdgeDelta) return null;

    return { addedNodes, removedNodes, movedNodes, addedEdges, removedEdges };
}

function _invertDiff(diff) {
    const invMoved = {};
    Object.keys(diff.movedNodes || {}).forEach((id) => {
        const m = diff.movedNodes[id];
        invMoved[id] = { from: _cloneState(m.to), to: _cloneState(m.from) };
    });
    return {
        addedNodes: _cloneState(diff.removedNodes || {}),
        removedNodes: _cloneState(diff.addedNodes || {}),
        movedNodes: invMoved,
        addedEdges: _cloneState(diff.removedEdges || []),
        removedEdges: _cloneState(diff.addedEdges || [])
    };
}

function _trimFutureHistory() {
    if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
    }
}

function _enforceHistoryLimit() {
    while (historyStack.length > HISTORY_LIMIT) {
        historyStack.shift();
        historyIndex--;
    }
    if (historyIndex < 0 && historyStack.length) historyIndex = 0;
}

function _ensurePort(arrObj, key) {
    if (!arrObj[key]) arrObj[key] = { connections: [] };
    if (!Array.isArray(arrObj[key].connections)) arrObj[key].connections = [];
}

function _addEdge(data, edge) {
    const from = data[edge.from];
    const to = data[edge.to];
    if (!from || !to) return;

    from.outputs = from.outputs || {};
    to.inputs = to.inputs || {};
    _ensurePort(from.outputs, edge.output);
    _ensurePort(to.inputs, edge.input);

    const outConns = from.outputs[edge.output].connections;
    const inConns = to.inputs[edge.input].connections;
    if (!outConns.some((c) => String(c.node) === String(edge.to) && c.output === edge.input)) {
        outConns.push({ node: String(edge.to), output: edge.input });
    }
    if (!inConns.some((c) => String(c.node) === String(edge.from) && c.input === edge.output)) {
        inConns.push({ node: String(edge.from), input: edge.output });
    }
}

function _removeEdge(data, edge) {
    const from = data[edge.from];
    const to = data[edge.to];
    if (!from || !to) return;

    if (from.outputs && from.outputs[edge.output] && Array.isArray(from.outputs[edge.output].connections)) {
        from.outputs[edge.output].connections = from.outputs[edge.output].connections.filter(
            (c) => !(String(c.node) === String(edge.to) && c.output === edge.input)
        );
    }
    if (to.inputs && to.inputs[edge.input] && Array.isArray(to.inputs[edge.input].connections)) {
        to.inputs[edge.input].connections = to.inputs[edge.input].connections.filter(
            (c) => !(String(c.node) === String(edge.from) && c.input === edge.output)
        );
    }
}

function _applyDiffToState(baseState, diff) {
    const state = _cloneState(baseState);
    const data = _getHomeData(state);

    Object.keys(diff.removedNodes || {}).forEach((id) => { delete data[id]; });
    Object.keys(diff.addedNodes || {}).forEach((id) => { data[id] = _cloneState(diff.addedNodes[id]); });

    Object.keys(diff.movedNodes || {}).forEach((id) => {
        if (!data[id]) return;
        const next = diff.movedNodes[id].to;
        data[id].pos_x = next.x;
        data[id].pos_y = next.y;
    });

    (diff.removedEdges || []).forEach((e) => _removeEdge(data, e));
    (diff.addedEdges || []).forEach((e) => _addEdge(data, e));

    return state;
}

function _importHistoryState(state) {
    editor.clear();
    editor.import(_cloneState(state));
    SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
    if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
        setTimeout(() => JETLSchemaUI.refreshAll(), 0);
    }
}

function addToHistory() {
    if (isUndoRedoAction) return;
    if (historyTransactionDepth > 0) {
        historyTransactionPending = true;
        return;
    }

    const current = _exportState();

    if (historyIndex < 0 || historyStack.length === 0 || !historyShadowState) {
        historyStack.length = 0;
        historyStack.push({ kind: 'checkpoint', state: current });
        historyIndex = 0;
        historyShadowState = current;
        return;
    }

    _trimFutureHistory();

    const diff = _computeDiff(historyShadowState, current);
    if (!diff) return;

    historyStack.push({
        kind: 'delta',
        forward: diff,
        backward: _invertDiff(diff)
    });
    historyIndex = historyStack.length - 1;
    historyShadowState = current;
    _enforceHistoryLimit();
}

function runHistoryTransaction(callback) {
    historyTransactionDepth++;
    try {
        return callback();
    } finally {
        historyTransactionDepth--;
        if (historyTransactionDepth === 0 && historyTransactionPending) {
            historyTransactionPending = false;
            addToHistory();
        }
    }
}

window.JETLHistoryTransaction = runHistoryTransaction;

function undo() {
    if (historyIndex <= 0) return;
    const entry = historyStack[historyIndex];
    if (!entry || entry.kind !== 'delta') return;

    isUndoRedoAction = true;
    try {
        const state = _exportState();
        const prev = _applyDiffToState(state, entry.backward);
        _importHistoryState(prev);
        historyIndex--;
        historyShadowState = _exportState();
        showToast("Deshacer", "info");
    } finally {
        isUndoRedoAction = false;
    }
}

function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    const nextEntry = historyStack[historyIndex + 1];
    if (!nextEntry) return;

    isUndoRedoAction = true;
    try {
        if (nextEntry.kind === 'checkpoint') {
            _importHistoryState(nextEntry.state);
        } else if (nextEntry.kind === 'delta') {
            const state = _exportState();
            const next = _applyDiffToState(state, nextEntry.forward);
            _importHistoryState(next);
        }
        historyIndex++;
        historyShadowState = _exportState();
        showToast("Rehacer", "info");
    } finally {
        isUndoRedoAction = false;
    }
}

function initHistory() {
    const events = ['nodeCreated', 'nodeRemoved', 'nodeMoved', 'connectionCreated', 'connectionRemoved'];
    events.forEach((ev) => editor.on(ev, () => addToHistory()));
    addToHistory();

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });
}

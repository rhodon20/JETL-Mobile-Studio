// Plan de ejecución (orden topológico), traza de la ejecución en curso e
// informe final. La traza anuncia su progreso con los eventos run:start y
// run:node; quien lo pinta (js/ui/runPanel.js) se suscribe.
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

let activeRunTrace = null;

function getRunErrorNodeId() {
    if (!activeRunTrace) return null;
    for (const [id, event] of activeRunTrace.nodes.entries()) if (event.status === 'error') return id;
    return null;
}

function buildExecutionPlan(graphData) {
    const data = graphData || {};
    const ids = Object.keys(data).map(String);
    const indegree = new Map(ids.map((id) => [id, 0]));
    const children = new Map(ids.map((id) => [id, []]));
    ids.forEach((id) => {
        const inputs = data[id]?.inputs || {};
        Object.values(inputs).forEach((input) => {
            (input.connections || []).forEach((connection) => {
                const parentId = String(connection.node);
                if (!indegree.has(parentId)) return;
                indegree.set(id, indegree.get(id) + 1);
                children.get(parentId).push(id);
            });
        });
    });

    let frontier = ids.filter((id) => indegree.get(id) === 0);
    const levels = [];
    const order = [];
    while (frontier.length) {
        const level = frontier.slice().sort((a, b) => Number(a) - Number(b));
        levels.push(level);
        order.push(...level);
        const next = [];
        level.forEach((id) => {
            children.get(id).forEach((childId) => {
                indegree.set(childId, indegree.get(childId) - 1);
                if (indegree.get(childId) === 0) next.push(childId);
            });
        });
        frontier = next;
    }
    if (order.length !== ids.length) {
        const cyclicIds = ids.filter((id) => !order.includes(id));
        throw new Error(`El flujo contiene un ciclo entre los nodos ${cyclicIds.map((id) => '#' + id).join(', ')}`);
    }
    return { order, levels };
}
window.JETLBuildExecutionPlan = buildExecutionPlan;

function collectRequiredNodeIds(targetId, graphData) {
    const data = graphData || {};
    const required = new Set();
    const visit = (id) => {
        const key = String(id);
        if (required.has(key) || !data[key]) return;
        required.add(key);
        Object.values(data[key].inputs || {}).forEach((input) => {
            (input.connections || []).forEach((connection) => visit(connection.node));
        });
    };
    visit(targetId);
    return [...required];
}

function beginRunTrace(label, scope, plannedIds) {
    activeRunTrace = {
        label,
        scope,
        startedAt: Date.now(),
        finishedAt: null,
        plannedIds: (plannedIds || []).map(String),
        nodes: new Map()
    };
    JETLEvents.emit('run:start', { label, plannedIds: activeRunTrace.plannedIds });
    return activeRunTrace;
}

function markRunTraceNode(nodeId, patch) {
    if (!activeRunTrace) return;
    const id = String(nodeId);
    const previous = activeRunTrace.nodes.get(id) || { id, started_at: new Date().toISOString() };
    if (['ok', 'cached'].includes(previous.status) && ['ok', 'cached'].includes(patch?.status)) return;
    const now = new Date().toISOString();
    const nextPatch = { ...(patch || {}) };
    if (nextPatch.status === 'running') nextPatch.started_at = previous.started_at || now;
    if (['ok', 'cached', 'error', 'cancelled'].includes(nextPatch.status)) nextPatch.finished_at = now;
    activeRunTrace.nodes.set(id, { ...previous, ...nextPatch, id });
    JETLEvents.emit('run:node', { id, patch: nextPatch });
}

function finishRunTrace() {
    if (activeRunTrace && !activeRunTrace.finishedAt) activeRunTrace.finishedAt = Date.now();
}

window.JETLRunTrace = { node: markRunTraceNode };

function buildRunReport(label, status, errorMessage) {
    const exportData = (editor && typeof editor.export === 'function')
        ? (((editor.export() || {}).drawflow || {}).Home || {}).data || {}
        : {};
    finishRunTrace();
    const trace = activeRunTrace;
    const nodes = Object.entries(exportData).map(([id, node]) => {
        const meta = executionData ? executionData[id] : null;
        const event = trace?.nodes?.get(String(id)) || null;
        const nodeName = node ? node.name : '';
        const tool = nodeName && window.TOOL_REGISTRY ? window.TOOL_REGISTRY[nodeName] : null;
        return {
            id: String(id),
            node: nodeName || 'unknown',
            label: tool ? tool.label : nodeName || 'unknown',
            category: tool?.cat || '',
            status: event?.status || 'not_run',
            ms: event ? Number(event?.ms ?? (meta && meta._ms) ?? 0) : 0,
            count: event ? countFeaturesFromResult(meta ? meta.data : null) : 0,
            outputs: event ? countOutputsFromResult(meta ? meta.data : null) : {},
            cached: event?.status === 'cached',
            error: event?.error || null,
            started_at: event?.started_at || null,
            finished_at: event?.finished_at || null
        };
    }).sort((a, b) => b.ms - a.ms);

    const totalMs = nodes.reduce((acc, n) => acc + (n.ms || 0), 0);
    const totalFeatures = nodes.reduce((acc, n) => acc + (n.count || 0), 0);
    const startedAt = trace?.startedAt || currentRunTimestamp || Date.now();
    const finishedAt = trace?.finishedAt || Date.now();
    return {
        version: '2.0',
        generated_at: new Date().toISOString(),
        run_id: currentRunTimestamp || Date.now(),
        label: label || 'Run',
        scope: trace?.scope || 'manual',
        started_at: new Date(startedAt).toISOString(),
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: Math.max(0, finishedAt - startedAt),
        status: status || 'ok',
        error: errorMessage || null,
        summary: {
            nodes: nodes.length,
            planned_nodes: trace?.plannedIds?.length || nodes.length,
            processed_nodes: nodes.filter((node) => !['not_run', 'pending'].includes(node.status)).length,
            executed_nodes: nodes.filter((node) => node.status === 'ok').length,
            cached_nodes: nodes.filter((node) => node.status === 'cached').length,
            error_nodes: nodes.filter((node) => node.status === 'error').length,
            cancelled_nodes: nodes.filter((node) => node.status === 'cancelled').length,
            total_ms: totalMs,
            total_features: totalFeatures
        },
        nodes
    };
}

export {
    countFeaturesFromResult, countOutputsFromResult, getRunErrorNodeId, buildExecutionPlan,
    collectRequiredNodeIds, beginRunTrace, markRunTraceNode, finishRunTrace, buildRunReport
};

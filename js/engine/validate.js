// Validación del flujo antes de ejecutar (Desktop: validateCurrentFlow). Sólo
// comprobaciones genéricas: las de Desktop por nodo leen claves de configuración
// que en Studio se llaman distinto (docs/NODE_CATALOG_PARITY.md) y darían avisos
// falsos. Función pura: recibe el grafo exportado y lo que necesita saber de fuera.
//
// Niveles: 'error' (la ejecución fallará), 'warn' (probablemente falle o dé un
// resultado vacío) e 'info' (conviene revisarlo).

const PARAM_REF = /\$\{([A-Za-z0-9_.-]+)\}/g;
const LEVEL_ORDER = { error: 0, warn: 1, info: 2 };

function inputConnections(node, port) {
    return (node.inputs && node.inputs[port] && node.inputs[port].connections) || [];
}

function hasAnyConnection(node) {
    const ports = [...Object.values(node.inputs || {}), ...Object.values(node.outputs || {})];
    return ports.some((port) => (port.connections || []).length > 0);
}

// Nodos que forman parte de algún ciclo (el motor no puede ordenarlos).
function nodesInCycles(graph) {
    const next = {};
    Object.values(graph).forEach((node) => {
        next[node.id] = Object.values(node.outputs || {}).flatMap((port) => (port.connections || []).map((link) => String(link.node)));
    });
    const state = {};   // 1: en la pila, 2: terminado
    const stack = [];
    const inCycle = new Set();
    const visit = (id) => {
        state[id] = 1;
        stack.push(id);
        (next[id] || []).forEach((to) => {
            if (state[to] === 1) stack.slice(stack.indexOf(to)).forEach((n) => inCycle.add(n));
            else if (!state[to] && next[to]) visit(to);
        });
        stack.pop();
        state[id] = 2;
    };
    Object.keys(next).forEach((id) => { if (!state[id]) visit(String(id)); });
    return inCycle;
}

function validateFlow(graph, { registry = {}, params = {}, hasReaderSource = () => true } = {}) {
    const nodes = Object.values(graph || {});
    const issues = [];
    const add = (level, node, message) => issues.push({ level, nodeId: node ? String(node.id) : null, message });

    if (!nodes.length) {
        add('warn', null, 'El flujo está vacío');
        return issues;
    }

    const cycles = nodesInCycles(graph);
    nodes.forEach((node) => {
        const tool = registry[node.name];
        if (!tool) {
            add('error', node, `Tipo de nodo desconocido (${node.name})`);
            return;
        }
        const required = Number(tool.in || 0);
        for (let i = 1; i <= required; i++) {
            if (!inputConnections(node, `input_${i}`).length) {
                add('error', node, required === 1 ? 'Entrada sin conectar' : `Entrada ${i} de ${required} sin conectar`);
            }
        }
        if (cycles.has(String(node.id))) add('error', node, 'Forma parte de un ciclo: el flujo no puede ordenarse');
        if (/^reader_/.test(node.name) && required === 0 && !hasReaderSource(String(node.id), node)) {
            add('warn', node, 'Lector sin archivo u origen configurado');
        }
        const missing = new Set();
        JSON.stringify(node.data || {}).replace(PARAM_REF, (match, key) => {
            if (!(key in params)) missing.add(key);
            return match;
        });
        missing.forEach((key) => add('warn', node, `Usa \${${key}}, que no está en Parámetros`));
        if (nodes.length > 1 && required === 0 && !hasAnyConnection(node)) {
            add('info', node, 'No está conectado a ningún otro nodo');
        }
    });
    return issues.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

export { validateFlow };

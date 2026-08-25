async function processNode(id, allNodes) {
    const nodeData = allNodes[id];

    // --- CORRECCIÓN: Validación de Seguridad ---
    if (!nodeData) {
        throw new Error(`Error interno: Datos del nodo #${id} no encontrados. Intenta guardar y recargar.`);
    }

    const tool = TOOL_REGISTRY[nodeData.name];
    const dom = document.getElementById('node-' + id);

    // 1. OBTENER CONFIGURACIÓN ACTUAL DEL NODO (HASH)
    let configStr = "";
    if (dom) {
        const inputs = dom.querySelectorAll('input, select, textarea');
        inputs.forEach(el => {
            if (el.type === 'checkbox') configStr += el.checked + "|";
            else configStr += el.value + "|";
        });
    }

    // 2. RESOLVER INPUTS Y CHEQUEAR PADRES
    const inputs = [];
    let parentsRunId = "";

    for (let i = 1; i <= tool.in; i++) {
        try {
            const key = 'input_' + i;
            const inputSlot = nodeData.inputs && nodeData.inputs[key];
            if (!inputSlot || !inputSlot.connections || inputSlot.connections.length === 0) {
                inputs.push(null);
                continue;
            }

            const conns = inputSlot.connections;
            const parentId = conns[0].node;
            const parentPort = conns[0].input;

            const parentRes = await processNode(parentId, allNodes);

            if (executionData[parentId]) {
                parentsRunId += executionData[parentId]._contentHash + "_";
            }

            const resolved = resolvePort(parentRes, parentPort);
            inputs.push(resolved);
        } catch (e) { inputs.push(null); }
    }

    // 3. GENERAR HASH
    const currentContentHash = `CTX:${parentsRunId}__CFG:${configStr}`;
    const hasDirtyApi = !!(window.JETLDirty && typeof window.JETLDirty.isDirty === 'function');
    const isDirty = hasDirtyApi ? !!window.JETLDirty.isDirty(String(id)) : false;

    // 4. SMART CACHE CHECK
    if (!isDirty && executionData[id] && executionData[id]._contentHash === currentContentHash && executionData[id].data) {
        // HIT DE CACHÉ

        const alreadyProcessedInRun = executionData[id]._runId === currentRunTimestamp;

        // --- CORRECCIÓN CACHÉ VERDE ---
        // Actualizamos el timestamp del dato cachedo al tiempo actual
        // para que el sistema sepa que es "válido en esta tirada"
        executionData[id]._runId = currentRunTimestamp;
        executionData[id]._ms = executionData[id]._ms || 0;

        window.JETLRunTrace?.node(id, {
            status: alreadyProcessedInRun ? 'ok' : 'cached',
            ms: alreadyProcessedInRun ? executionData[id]._ms : 0
        });

        if (dom) dom.style.opacity = '1';
        return executionData[id].data;
    }

    // 5. EJECUCIÓN REAL (Cache Miss)
    if (dom) dom.style.opacity = '0.6';
    const loaderMsg = document.getElementById('loader-msg');
    if (loaderMsg) loaderMsg.innerText = `Ejecutando ${tool.label}...`;
    await new Promise(r => setTimeout(r, 10));

    let result = null;
    const t0 = performance.now();
    window.JETLRunTrace?.node(id, { status: 'running', ms: 0, error: null });
    try {
        if (window.isEngineCancelled) throw new Error("Operación cancelada por el usuario.");

        const safeInputs = inputs.map(i => {
            if (!i) return null;
            if (typeof window.JETLClone === 'function') return window.JETLClone(i);
            if (typeof structuredClone === 'function') {
                try { return structuredClone(i); } catch (e) {}
            }
            if (typeof window.JETLCloneFallback === 'function') return window.JETLCloneFallback(i);
            return i;
        });

        if (tool.in > 0) {
            const anyValid = safeInputs.some(s => s && s.features && s.features.length >= 0);
            if (!anyValid && tool.cat !== '1. READERS') throw new Error("Input vacío/inválido");
        }

        result = await tool.run(id, safeInputs, dom);
        result = normalizeResult(result);

    } catch (e) {
        const cancelled = !!window.isEngineCancelled || e?.cancelled || e?.name === 'CancelledError';
        window.JETLRunTrace?.node(id, {
            status: cancelled ? 'cancelled' : 'error',
            ms: Math.max(0, Math.round(performance.now() - t0)),
            error: e && e.message ? e.message : String(e)
        });
        log(`[${tool.label}] ERROR: ${e.message}`, "err");
        if (dom) {
            dom.style.boxShadow = "0 0 0 2px #c0392b";
            dom.style.opacity = '1';
            if (typeof anim_NodeError === 'function') anim_NodeError(id);
        }
        throw e;
    }

    if (dom) dom.style.opacity = '1';

    // 6. GUARDAR RESULTADO
    const t1 = performance.now();
    executionData[id] = {
        data: result,
        _runId: currentRunTimestamp, // Usamos la variable global sincronizada
        _contentHash: currentContentHash,
        _ms: Math.max(0, Math.round(t1 - t0))
    };
    window.JETLRunTrace?.node(id, { status: 'ok', ms: executionData[id]._ms, error: null });
    if (hasDirtyApi && typeof window.JETLDirty.clearNodeDirty === 'function') {
        window.JETLDirty.clearNodeDirty(String(id));
    }

    return result;
}

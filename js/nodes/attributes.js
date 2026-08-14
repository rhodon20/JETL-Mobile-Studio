// Cat: attributes
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
const SAFE_EXPR_MAX_LEN = 500;
const SAFE_EXPR_BLOCKLIST = [
    /\b(?:window|document|globalThis|self|Function|eval|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|caches|navigator|location)\b/i,
    /(?:__proto__|prototype|constructor)/i,
    /\b(?:import|export)\b/i
];

function validateSafeExpression(expr) {
    const source = String(expr || '').trim();
    if (!source) throw new Error("Expresion vacia");
    if (source.length > SAFE_EXPR_MAX_LEN) {
        throw new Error(`Expresion demasiado larga (max ${SAFE_EXPR_MAX_LEN} chars)`);
    }
    for (const rule of SAFE_EXPR_BLOCKLIST) {
        if (rule.test(source)) throw new Error("Expresion bloqueada por seguridad");
    }
    return source;
}

function compileSafeExpression(expr, argNames) {
    const source = validateSafeExpression(expr);
    const names = Array.isArray(argNames) ? argNames : [];
    return new Function(
        ...names,
        'Math',
        'turf',
        'window',
        'document',
        'globalThis',
        'self',
        'Function',
        'fetch',
        'XMLHttpRequest',
        `"use strict"; return (${source});`
    );
}

function parseCsvFields(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function resolveParamText(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}

function computeBasicStats(values) {
    const nums = values.filter((v) => typeof v === 'number' && !isNaN(v));
    if (!nums.length) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const avg = sum / nums.length;
    return { sum, min, max, avg, count: nums.length };
}

function writeFlatStatsToFeature(props, prefix, key, stats) {
    props[`${prefix}_${key}_sum`] = stats.sum;
    props[`${prefix}_${key}_min`] = stats.min;
    props[`${prefix}_${key}_max`] = stats.max;
    props[`${prefix}_${key}_avg`] = stats.avg;
    props[`${prefix}_${key}_count`] = stats.count;
}

function normalizeTestValue(raw, sampleVal) {
    const text = String(raw ?? '').trim();
    if (typeof sampleVal === 'number') {
        const n = Number(text);
        return isNaN(n) ? text : n;
    }
    if (typeof sampleVal === 'boolean') return text.toLowerCase() === 'true';
    return text;
}

function evalTestCondition(props, cond) {
    const left = props ? props[cond.field] : undefined;
    const op = String(cond.op || '==');
    const rightRaw = cond.value;
    const right = normalizeTestValue(rightRaw, left);

    if (op === 'like') return String(left ?? '').toLowerCase().includes(String(rightRaw ?? '').toLowerCase());
    if (op === 'starts') return String(left ?? '').toLowerCase().startsWith(String(rightRaw ?? '').toLowerCase());
    if (op === 'ends') return String(left ?? '').toLowerCase().endsWith(String(rightRaw ?? '').toLowerCase());
    if (op === 'in') {
        const list = String(rightRaw ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return list.includes(String(left ?? ''));
    }
    if (op === '>') return left > Number(right);
    if (op === '>=') return left >= Number(right);
    if (op === '<') return left < Number(right);
    if (op === '<=') return left <= Number(right);
    if (op === '!=') return left != right;
    return left == right;
}

function evalTestGroup(props, conditions) {
    if (!Array.isArray(conditions) || !conditions.length) return true;
    let acc = evalTestCondition(props, conditions[0]);
    for (let i = 1; i < conditions.length; i++) {
        const join = String(conditions[i].join || 'AND').toUpperCase();
        const cur = evalTestCondition(props, conditions[i]);
        acc = join === 'OR' ? (acc || cur) : (acc && cur);
    }
    return acc;
}

Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    attr_stats: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Stats Calc', icon: 'fa-calculator', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campos numericos</span>
                <input type="text" df-field class="node-control" placeholder="campo1, campo2">
            </div>
            <div df-stats-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Modo</span>
                <select df-mode class="node-control">
                    <option value="per_field">Stats por campo</option>
                    <option value="concat">Stats concatenadas</option>
                    <option value="both">Ambas</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (no rechazar)</option>
                    <option value="reject">Rechazar sin numericos</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666">Escribe columnas visibles: stats_*</div>`,
        run: async (id, inputs, dom) => {
            const fields = parseCsvFields(resolveParamText(dom.querySelector('[df-field]').value));
            const mode = dom.querySelector('[df-mode]')?.value || 'per_field';
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const prefix = 'stats';
            if (!fields.length) throw new Error("Define al menos un campo");

            if (onError !== 'reject' && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_stats',
                        features: inputs[0],
                        fields,
                        mode,
                        prefix
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Stats fallo, fallback local:", e);
                }
            }

            const fc = inputs[0];
            const byField = {};
            fields.forEach((field) => {
                const values = fc.features.map((f) => (f.properties || {})[field]);
                const s = computeBasicStats(values);
                if (s) byField[field] = s;
            });
            if (!Object.keys(byField).length) throw new Error("No hay valores numericos en los campos elegidos");

            let concatStats = null;
            if (mode === 'concat' || mode === 'both') {
                const concatValues = [];
                fc.features.forEach((f) => {
                    const p = (f && f.properties) || {};
                    fields.forEach((k) => {
                        const v = p[k];
                        if (typeof v === 'number' && !isNaN(v)) concatValues.push(v);
                    });
                });
                concatStats = computeBasicStats(concatValues);
            }

            fc.features.forEach((f) => {
                if (!f.properties) f.properties = {};
                if (mode === 'per_field' || mode === 'both') {
                    Object.keys(byField).forEach((field) => {
                        writeFlatStatsToFeature(f.properties, prefix, field, byField[field]);
                    });
                }
                if ((mode === 'concat' || mode === 'both') && concatStats) {
                    writeFlatStatsToFeature(f.properties, prefix, 'concat', concatStats);
                }
            });

            if (onError === 'reject') {
                const passed = [];
                const rejected = [];
                fc.features.forEach((f) => {
                    const p = f.properties || {};
                    const hasNumeric = fields.some((k) => typeof p[k] === 'number' && !isNaN(p[k]));
                    if (hasNumeric) passed.push(f);
                    else {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._stats_error = 'Sin valores numericos en campos objetivo';
                        rejected.push(rf);
                    }
                });
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }

            return fc;
        }
    },

    attr_renamer: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Renamer', icon: 'fa-tag', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Mapeo (Viejo:Nuevo)</span>
                <input type="text" df-map class="node-control" placeholder="old:new, id:uid">
                <div style="font-size:0.6em;color:#666;font-style:italic">Separar pares por comas</div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex;gap:4px;margin-top:2px">
                    <select df-rename-old class="node-control" style="flex:1"></select>
                    <input type="text" df-rename-new class="node-control" style="flex:1" placeholder="nuevo_nombre">
                    <button class="btn" style="padding:4px 8px" data-schema-action="renamer-add" title="Agregar mapeo">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (continuar)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const mapping = mapStr.split(',').map(p => p.split(':').map(s => s.trim())).filter(([a, b]) => a && b);
            if (!mapping.length) throw new Error("Define al menos un mapeo old:new");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_renamer',
                        features: inputs[0],
                        mapping,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Renamer fallo, fallback local:", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    mapping.forEach(([oldName, newName]) => {
                        if (f.properties[oldName] === undefined) throw new Error(`Campo no encontrado: ${oldName}`);
                        f.properties[newName] = f.properties[oldName];
                        delete f.properties[oldName];
                    });
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._renamer_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_keeper: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Keeper', icon: 'fa-check-square', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campos a mantener</span>
                <input type="text" df-keep class="node-control" placeholder="id, name, type">
                <div style="font-size:0.6em;color:#666;font-style:italic">El resto serÃ¡ borrado</div>
            </div>
            <div df-keeper-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (continuar)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const keepStr = resolveParamText(dom.querySelector('[df-keep]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const toKeep = new Set(keepStr.split(',').map(s => s.trim()));
            if (!toKeep.size) throw new Error("Define al menos un campo a mantener");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_keeper',
                        features: inputs[0],
                        keepList: Array.from(toKeep),
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Keeper fallo, fallback local:", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    let found = 0;
                    const newProps = {};
                    Object.keys(f.properties).forEach(k => {
                        if (toKeep.has(k)) {
                            newProps[k] = f.properties[k];
                            found++;
                        }
                    });
                    if (found === 0) throw new Error("Ningun campo objetivo presente");
                    f.properties = newProps;
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._keeper_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_creator: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attr Creator', icon: 'fa-plus-square', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nuevo Campo</span>
                <input type="text" df-name class="node-control" value="new_field">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Valor o FÃ³rmula (=)</span>
                <input type="text" df-val class="node-control" placeholder="Texto o =f.properties.id*2">
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-name]').value);
            const exprRaw = resolveParamText(dom.querySelector('[df-val]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const isFormula = exprRaw.startsWith('=');

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_creator',
                        features: inputs[0],
                        field,
                        exprRaw,
                        isFormula,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Attr Creator fallo, fallback local:", e);
                }
            }

            let formulaFn = null;
            let compileErr = null;
            if (isFormula) {
                try {
                    formulaFn = compileSafeExpression(exprRaw.substring(1), ['f']);
                } catch (e) {
                    compileErr = e;
                    console.warn("Error en fÃ³rmula Creator", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};

                if (isFormula && !formulaFn) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[field] = null;
                        rf.properties._creator_error = compileErr && compileErr.message ? compileErr.message : 'Formula invalida';
                        rejected.push(rf);
                    } else {
                        f.properties[field] = null;
                        passed.push(f);
                    }
                    return;
                }

                if (isFormula && formulaFn) {
                    try {
                        f.properties[field] = formulaFn(
                            f,
                            Math,
                            turf,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined
                        );
                        passed.push(f);
                    } catch (e) {
                        if (onError === 'reject') {
                            const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                            if (!rf.properties) rf.properties = {};
                            rf.properties[field] = null;
                            rf.properties._creator_error = e && e.message ? e.message : String(e);
                            rejected.push(rf);
                        } else {
                            f.properties[field] = null;
                            passed.push(f);
                        }
                    }
                } else {
                    f.properties[field] = exprRaw;
                    passed.push(f);
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_counter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Counter', icon: 'fa-sort-numeric-down', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre Campo ID</span>
                <input type="text" df-field class="node-control" value="_id">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Valor Inicial</span>
                <input type="number" df-start class="node-control" value="1">
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value);
            let count = parseInt(resolveParamText(dom.querySelector('[df-start]').value)) || 1;

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_counter',
                        features: inputs[0],
                        fieldName,
                        start: count
                    }, 30000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Counter fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach(f => {
                f.properties[fieldName] = count++;
            });
            return inputs[0];
        }
    },

    attr_sorter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Sorter', icon: 'fa-sort-alpha-down', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campo a Ordenar</span>
                <select df-field class="node-control"></select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">DirecciÃ³n</span>
                <select df-dir class="node-control">
                    <option value="asc">Ascendente (A-Z, 0-9)</option>
                    <option value="desc">Descendente (Z-A, 9-0)</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-field]').value);
            const dir = resolveParamText(dom.querySelector('[df-dir]').value) || 'asc';
            const features = [...inputs[0].features]; // Copia para sortear

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_sorter',
                        features: { type: 'FeatureCollection', features },
                        field,
                        dir
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Sorter fallÃƒÂ³, fallback local:", e);
                }
            }

            features.sort((a, b) => {
                const valA = a.properties[field];
                const valB = b.properties[field];

                if (valA === valB) return 0;

                // DetecciÃ³n automÃ¡tica de tipo (NÃºmero vs Texto)
                const isNum = typeof valA === 'number' && typeof valB === 'number';

                let comparison = 0;
                if (isNum) {
                    comparison = valA - valB;
                } else {
                    // ComparaciÃ³n segura de strings (nulls al final)
                    comparison = String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true });
                }

                return dir === 'asc' ? comparison : -comparison;
            });

            return turf.featureCollection(features);
        }
    },

    attr_string_formatter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'String Formatter', icon: 'fa-text-width', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campo(s) Objetivo</span>
                <input type="text" df-field class="node-control" placeholder="Ej: name, type">
            </div>
            <div df-formatter-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">OperaciÃ³n</span>
                <select df-op class="node-control">
                    <option value="upper">MayÃºsculas (UPPER)</option>
                    <option value="lower">MinÃºsculas (lower)</option>
                    <option value="capitalize">Capitalizar (Titulo)</option>
                    <option value="trim">Trim (Limpiar espacios)</option>
                    <option value="replace">Reemplazar (A -> B)</option>
                    <option value="concat">Concatenar (Suffix)</option>
                    <option value="pad">Rellenar (PadStart 001)</option>
                    <option value="template">Plantilla ({campo})</option>
                </select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Argumentos (Sep: | )</span>
                <input type="text" df-args class="node-control" placeholder="old|new Ã³ 000">
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (asignar vacio)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666;margin-top:2px">
                Para Replace: "buscar|reemplazo"<br>
                Para Template: "ID_{id}_zona"
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldRaw = resolveParamText(dom.querySelector('[df-field]').value);
            const op = resolveParamText(dom.querySelector('[df-op]').value) || 'upper';
            const argsRaw = resolveParamText(dom.querySelector('[df-args]').value || '');
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const fields = fieldRaw.split(',').map((s) => s.trim()).filter(Boolean);
            if (!fields.length) throw new Error("Campo objetivo vacio");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_string_formatter',
                        features: inputs[0],
                        fields,
                        op,
                        argsRaw,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker String Formatter fallo, fallback local:", e);
                }
            }

            // Parsear argumentos (separador pipe | para replace)
            const args = argsRaw.split('|');
            const arg1 = args[0];
            const arg2 = args[1] || '';
            const passed = [];
            const rejected = [];

            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    fields.forEach((field) => {
                        if (f.properties[field] === undefined && op !== 'template') {
                            throw new Error(`Campo no encontrado: ${field}`);
                        }
                        let val = f.properties[field];
                        if (val === undefined || val === null) val = '';
                        val = String(val);

                        switch (op) {
                            case 'upper': val = val.toUpperCase(); break;
                            case 'lower': val = val.toLowerCase(); break;
                            case 'trim': val = val.trim(); break;
                            case 'capitalize':
                                val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                                break;
                            case 'replace':
                                // Reemplazo global simple
                                val = val.split(arg1).join(arg2);
                                break;
                            case 'concat':
                                val = val + arg1;
                                break;
                            case 'pad': {
                                // Arg1: Longitud total, Arg2: CarÃ¡cter relleno (defecto '0')
                                const len = parseInt(arg1) || 3;
                                const char = arg2 || '0';
                                val = val.padStart(len, char);
                                break;
                            }
                            case 'template': {
                                // Reemplaza {campo} por el valor de ese campo
                                // El argumento es la plantilla completa, ignorando el valor original del campo objetivo
                                let tpl = argsRaw;
                                Object.keys(f.properties).forEach(k => {
                                    const regex = new RegExp(`{${k}}`, 'g');
                                    tpl = tpl.replace(regex, f.properties[k]);
                                });
                                val = tpl;
                                break;
                            }
                        }
                        f.properties[field] = val;
                    });
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._fmt_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        fields.forEach((field) => { f.properties[field] = ''; });
                        passed.push(f);
                    }
                }
            });

            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_feature_merger: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Feature Merger', icon: 'fa-code-branch', color: '#27ae60', in: 2, out: 3,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">RelaciÃ³n (Input1 : Input2)</span>
                <input type="text" df-map class="node-control" placeholder="tipo:TIPO, id:ID_REF">
                <div style="font-size:0.6em;color:#666;font-style:italic">Separar pares por comas.</div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex; gap:4px; margin-top:2px">
                    <select class="node-control" df-join-left style="flex:1"></select>
                    <select class="node-control" df-join-right style="flex:1"></select>
                    <button class="btn" style="padding:4px 8px" data-schema-action="join-add" title="Agregar par a la relacion">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:4px">
                Out 1: Merged<br>Out 2: Not Merged (Input 1)<br>Out 3: Unused (Input 2)
            </div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const reqFeatures = inputs[0].features; // Requestor (Mantiene geometrÃ­a)
            const supFeatures = inputs[1].features; // Supplier (Aporta atributos)

            // Parsear el mapeo "campo1:campo2, campoA:campoB"
            const joinPairs = mapStr.split(',').map(p => p.split(':').map(s => s.trim()));
            if (joinPairs.length === 0 || !joinPairs[0][0]) throw new Error("Define campos de uniÃ³n");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_feature_merger',
                        requestor: { type: 'FeatureCollection', features: reqFeatures },
                        supplier: { type: 'FeatureCollection', features: supFeatures },
                        joinPairs: joinPairs
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Feature Merger fallÃ³, fallback local:", e);
                }
            }

            // FunciÃ³n auxiliar para generar Hash Keys
            const getKey = (props, fields) => fields.map(f => String(props[f] || 'null')).join('|_|');

            // 1. Indexar el Supplier (Input 2)
            const supMap = new Map();
            const supKeys = joinPairs.map(p => p[1]); // Lado derecho del par

            supFeatures.forEach((f, idx) => {
                const key = getKey(f.properties, supKeys);
                // Si hay duplicados en el supplier, nos quedamos con el primero (First Match)
                if (!supMap.has(key)) {
                    supMap.set(key, { props: f.properties, originalIdx: idx, used: false });
                }
            });

            const merged = [];
            const notMerged = [];

            // 2. Procesar Requestor (Input 1)
            const reqKeys = joinPairs.map(p => p[0]); // Lado izquierdo del par

            reqFeatures.forEach(f => {
                const key = getKey(f.properties, reqKeys);

                if (supMap.has(key)) {
                    // Match encontrado!
                    const supData = supMap.get(key);
                    supData.used = true; // Marcamos supplier como usado

                    // Clonamos feature para no mutar original
                    const newF = JETLClone(f);
                    // Fusionamos atributos (Supplier sobrescribe a Requestor en caso de colisiÃ³n)
                    newF.properties = { ...newF.properties, ...supData.props };
                    merged.push(newF);
                } else {
                    // No match
                    notMerged.push(f);
                }
            });

            // 3. Recolectar Unused Suppliers (Input 2 que sobraron)
            const unusedSup = supFeatures.filter((f, idx) => {
                // Como supMap solo guarda el primero de cada serie duplicada, 
                // necesitamos una forma de saber si este feature especÃ­fico fue "tocado".
                // Una forma robusta es volver a generar su key y ver si esa key estÃ¡ marcada como usada en el mapa.
                const key = getKey(f.properties, supKeys);
                const mapEntry = supMap.get(key);
                // Si la entrada del mapa fue usada, consideramos todos los duplicados de esa clave como usados?
                // Generalmente en FeatureMerger 1:1, los duplicados del supplier que no se usaron son "Unused".
                // Pero para simplificar lÃ³gica visual: Si la clave se usÃ³, el "concepto" se usÃ³.
                // AquÃ­ seremos estrictos: Solo devolvemos los que NO fueron la fuente de datos.

                return !mapEntry || !mapEntry.used;
            });

            return {
                output_1: turf.featureCollection(merged),
                output_2: turf.featureCollection(notMerged),
                output_3: turf.featureCollection(unusedSup)
            };
        }
    },

    attr_join_adv: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attribute Join', icon: 'fa-link', color: '#27ae60', in: 2, out: 2,
        help: 'Join tabular por claves (left/inner).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Relacion (Input1 : Input2)</span>
                <input type="text" df-map class="node-control" placeholder="id:ID_REF, tipo:TYPE">
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex; gap:4px; margin-top:2px">
                    <select class="node-control" df-join-left style="flex:1"></select>
                    <select class="node-control" df-join-right style="flex:1"></select>
                    <button class="btn" style="padding:4px 8px" data-schema-action="join-add" title="Agregar par a la relacion">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tipo Join</span>
                <select df-join class="node-control">
                    <option value="left">Left</option>
                    <option value="inner">Inner</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo</span>
                <input type="text" df-prefix class="node-control" value="j_">
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Join | Out 2: Sin Match</div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const joinType = resolveParamText(dom.querySelector('[df-join]').value) || 'left';
            const prefix = resolveParamText(dom.querySelector('[df-prefix]').value) || 'j_';
            const left = inputs[0].features || [];
            const right = inputs[1].features || [];
            const joinPairs = mapStr.split(',').map(p => p.split(':').map(s => s.trim())).filter(p => p[0] && p[1]);
            if (joinPairs.length === 0) throw new Error("Define campos de union");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_join',
                        left: { type: 'FeatureCollection', features: left },
                        right: { type: 'FeatureCollection', features: right },
                        joinPairs,
                        joinType,
                        prefix
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Attribute Join fallÃ³, fallback local:", e);
                }
            }
            const getKey = (props, fields) => fields.map(f => String(props[f] || 'null')).join('|_|');
            const rightKeys = joinPairs.map(p => p[1]);
            const leftKeys = joinPairs.map(p => p[0]);
            const index = new Map();
            right.forEach(f => {
                const key = getKey(f.properties || {}, rightKeys);
                if (!index.has(key)) index.set(key, f);
            });
            const joined = [];
            const unmatched = [];
            left.forEach(f => {
                if (!f.properties) f.properties = {};
                const key = getKey(f.properties || {}, leftKeys);
                const match = index.get(key);
                if (match) {
                    const nf = JETLClone(f);
                    Object.keys(match.properties || {}).forEach(k => nf.properties[prefix + k] = match.properties[k]);
                    joined.push(nf);
                } else {
                    if (joinType === 'left') joined.push(f);
                    unmatched.push(f);
                }
            });
            return { output_1: turf.featureCollection(joined), output_2: turf.featureCollection(unmatched) };
        }
    },
    attr_calc_pro: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Field Calculator Pro', icon: 'fa-keyboard', color: '#27ae60', in: 1, out: 2,
        help: 'Expresiones JS con helpers: props, feat, Math, turf.',
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-keyboard"></i>
                <div><strong data-calc-summary>new_field</strong><small>Configura una expresión por elemento</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="calc-open-editor">
                <i class="fas fa-pen"></i> Abrir editor
            </button>
            <div class="node-editor-storage" aria-hidden="true">
                <input type="text" df-name class="node-control" value="new_field" tabindex="-1">
                <textarea df-expr class="node-control" tabindex="-1"></textarea>
                <select df-on-error class="node-control" tabindex="-1">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
                <select df-source-field class="node-control" tabindex="-1"></select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-name]').value);
            const exprRaw = resolveParamText(dom.querySelector('[df-expr]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            if (!field) throw new Error("Campo destino vacio");
            if (!exprRaw) throw new Error("Expresion vacia");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_calc_pro',
                        features: inputs[0],
                        field,
                        exprRaw,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Field Calculator Pro fallo, fallback local:", e);
                }
            }
            const fn = compileSafeExpression(exprRaw, ['props', 'feat']);
            const passed = [];
            const rejected = [];
            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    f.properties[field] = fn(
                        f.properties || {},
                        f,
                        Math,
                        turf,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined
                    );
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[field] = null;
                        rf.properties._calc_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[field] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },
    attr_area: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Area Calc', icon: 'fa-ruler-combined', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre del Campo</span>
                <input type="text" df-field class="node-control" value="_area" placeholder="_area">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Unidades</span>
                <select df-unit class="node-control">
                    <option value="1">Metros cuadrados (mÂ²)</option>
                    <option value="0.000001">KilÃ³metros cuadrados (kmÂ²)</option>
                    <option value="0.0001">HectÃ¡reas (ha)</option>
                    <option value="10.7639">Pies cuadrados (ftÂ²)</option>
                </select>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value) || '_area';
            const multiplier = parseFloat(dom.querySelector('[df-unit]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const passed = [];
            const rejected = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_area',
                        features: inputs[0],
                        fieldName,
                        multiplier,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Area Calc fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    // Turf siempre calcula en mÂ²
                    const areaSqM = turf.area(f);
                    // Aplicamos el factor de conversiÃ³n
                    f.properties[fieldName] = parseFloat((areaSqM * multiplier).toFixed(4));
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[fieldName] = null;
                        rf.properties._area_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[fieldName] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_length: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Length Calc', icon: 'fa-ruler-horizontal', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre del Campo</span>
                <input type="text" df-field class="node-control" value="_length" placeholder="_length">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Unidades</span>
                <select df-unit class="node-control">
                    <option value="kilometers">KilÃ³metros (km)</option>
                    <option value="meters">Metros (m)</option>
                    <option value="centimeters">CentÃ­metros (cm)</option>
                    <option value="miles">Millas</option>
                    <option value="feet">Pies</option>
                </select>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value) || '_length';
            const unit = resolveParamText(dom.querySelector('[df-unit]').value) || 'meters';
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const passed = [];
            const rejected = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_length',
                        features: inputs[0],
                        fieldName,
                        unit,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Length Calc fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    const gType = f && f.geometry ? f.geometry.type : null;
                    if (gType !== 'LineString' && gType !== 'MultiLineString') {
                        throw new Error('Geometria no lineal para Length Calc');
                    }
                    let length;

                    if (unit === 'centimeters') {
                        // Turf no tiene 'centimeters' nativo en versiones antiguas, calculamos en metros * 100
                        length = turf.length(f, { units: 'meters' }) * 100;
                    } else {
                        // Para el resto usamos la conversiÃ³n nativa de Turf
                        length = turf.length(f, { units: unit });
                    }

                    f.properties[fieldName] = parseFloat(length.toFixed(4));
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[fieldName] = null;
                        rf.properties._length_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[fieldName] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_matcher: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Matcher', icon: 'fa-clone', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:6px">
                <span style="font-size:0.7em;color:#aaa">Criterio de Coincidencia</span>
                <div style="display:flex; flex-direction:column; gap:4px; margin-top:2px">
                    <label style="font-size:0.8em; display:flex; align-items:center; color:#ddd">
                        <input type="checkbox" df-geo checked style="margin-right:6px"> GeometrÃ­a
                    </label>
                    <label style="font-size:0.8em; display:flex; align-items:center; color:#ddd">
                        <input type="checkbox" df-attr style="margin-right:6px"> Atributos
                    </label>
                </div>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Campos (Si Atributos = ON)</span>
                <input type="text" df-fields class="node-control" placeholder="Ej: id, type">
                <div df-matcher-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-top:4px"></div>
                <div style="font-size:0.6em;color:#666;font-style:italic">VacÃ­o = Todos los campos.</div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:4px">Out 1: Ãšnicos | Out 2: Duplicados</div>`,
        run: async (id, inputs, dom) => {
            const matchGeo = dom.querySelector('[df-geo]').checked;
            const matchAttr = dom.querySelector('[df-attr]').checked;
            const rawFields = resolveParamText(dom.querySelector('[df-fields]').value);

            const uniques = [];
            const duplicates = [];
            const seenHashes = new Set();

            const targetFields = rawFields ? rawFields.split(',').map(s => s.trim()).filter(s => s !== '') : null;

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_matcher',
                        features: { type: 'FeatureCollection', features: inputs[0].features || [] },
                        matchGeo,
                        matchAttr,
                        targetFields
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Matcher fallÃƒÂ³, fallback local:", e);
                }
            }

            inputs[0].features.forEach(f => {
                let hashParts = [];

                // 1. Huella de GeometrÃ­a
                if (matchGeo) {
                    // Usamos stringify de las coordenadas para comparaciÃ³n exacta
                    hashParts.push(JSON.stringify(f.geometry));
                }

                // 2. Huella de Atributos
                if (matchAttr) {
                    if (targetFields && targetFields.length > 0) {
                        // Concatenar solo campos especÃ­ficos
                        const attrVal = targetFields.map(k => {
                            const val = f.properties[k];
                            return val !== undefined && val !== null ? val : 'null';
                        }).join('_|_');
                        hashParts.push(attrVal);
                    } else {
                        // Concatenar todo el objeto de propiedades (ordenado para consistencia)
                        // Para evitar problemas de orden de claves, ordenamos keys
                        const sortedProps = {};
                        Object.keys(f.properties || {}).sort().forEach(key => {
                            sortedProps[key] = f.properties[key];
                        });
                        hashParts.push(JSON.stringify(sortedProps));
                    }
                }

                // Si no se selecciona nada, asumimos que no hay criterio => todos son Ãºnicos (o error)
                if (hashParts.length === 0) {
                    uniques.push(f);
                    return;
                }

                const finalHash = hashParts.join('###');

                if (seenHashes.has(finalHash)) {
                    duplicates.push(f);
                } else {
                    seenHashes.add(finalHash);
                    uniques.push(f);
                }
            });

            return {
                output_1: turf.featureCollection(uniques),
                output_2: turf.featureCollection(duplicates)
            };
        }
    },
    attr_test: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Tester', icon: 'fa-balance-scale', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div df-test-rows style="display:flex; flex-direction:column; gap:6px;"></div>
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="node-btn-mini" type="button" data-schema-action="test-add-row" title="Agregar condicion">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div style="font-size:0.62em;color:#777;margin-top:4px;">Operadores: =, !=, >, >=, <, <=, like, starts, ends, in</div>
        `,
        run: async (id, i, d) => {
            const rows = Array.from(d.querySelectorAll('[data-test-row]'));
            let conditions = rows
                .map((row, idx) => {
                    const field = resolveParamText(row.querySelector('[df-test-field]')?.value || '');
                    const op = row.querySelector('[df-test-op]')?.value || '==';
                    const value = resolveParamText(row.querySelector('[df-test-val]')?.value || '');
                    const join = idx === 0 ? 'AND' : (row.querySelector('[df-test-join]')?.value || 'AND');
                    if (!field) return null;
                    return { field, op, value, join };
                })
                .filter(Boolean);
            if (!conditions.length) {
                const legacyField = resolveParamText(d.querySelector('[df-l]')?.value || '');
                const legacyOp = d.querySelector('[df-op]')?.value || '==';
                const legacyVal = resolveParamText(d.querySelector('[df-r]')?.value || '');
                if (legacyField) conditions = [{ field: legacyField, op: legacyOp, value: legacyVal, join: 'AND' }];
            }
            if (!conditions.length) throw new Error("Define al menos una condicion");

            const p = [];
            const f = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_test',
                        features: i[0],
                        conditions
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Tester fallo, fallback local:", e);
                }
            }

            i[0].features.forEach((feat) => {
                const props = (feat && feat.properties) || {};
                const pass = evalTestGroup(props, conditions);
                if (pass) p.push(feat);
                else f.push(feat);
            });
            return { output_1: turf.featureCollection(p), output_2: turf.featureCollection(f) };
        }
    }
});







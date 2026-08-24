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

function normalizeSubstringIndex(index, length) {
    const parsed = Number.isFinite(Number(index)) ? parseInt(index, 10) : 0;
    return parsed < 0 ? length + parsed : parsed;
}

function extractFmeSubstring(value, start, end) {
    const text = String(value ?? '');
    const length = text.length;
    let from = Math.max(0, normalizeSubstringIndex(start, length));
    let to = Math.min(length - 1, normalizeSubstringIndex(end, length));
    if (from > to || from >= length) return '';
    return text.slice(from, to + 1);
}

function readNestedListValues(properties, path) {
    const parts = String(path || '').split(/\{\}\.?/).filter(Boolean);
    if (parts.length < 2) {
        const value = properties?.[parts[0] || path];
        return Array.isArray(value) ? value : [];
    }
    const list = properties?.[parts[0]];
    if (!Array.isArray(list)) return [];
    const childPath = parts.slice(1);
    return list.map((entry) => childPath.reduce((value, key) => value?.[key], entry));
}

function cloneFeatureForAttributeTool(feature) {
    if (typeof window !== 'undefined' && typeof window.JETLClone === 'function') return window.JETLClone(feature);
    return JSON.parse(JSON.stringify(feature));
}

function escapeRegExpLiteral(value) {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fmeRegexReplacementToJs(value) {
    return String(value ?? '').replace(/\\([0-9]+)/g, '$$$1');
}

function applyStringReplace(text, search, replacement, mode, caseSensitive) {
    const source = String(text ?? '');
    const needle = String(search ?? '');
    if (!needle) return { value: source, matched: false };
    const flags = `g${caseSensitive ? '' : 'i'}`;
    const pattern = mode === 'regex' ? needle : escapeRegExpLiteral(needle);
    const replacementText = mode === 'regex' ? fmeRegexReplacementToJs(replacement) : String(replacement ?? '');
    const regex = new RegExp(pattern, flags);
    let matched = false;
    const value = source.replace(regex, (...args) => {
        matched = true;
        if (mode === 'regex') return replacementText.replace(/\$([0-9]+)/g, (_, index) => args[Number(index)] ?? '');
        return replacementText;
    });
    return { value, matched };
}

function normalizeAttributeManagerRules(raw) {
    let parsed = raw;
    if (typeof raw === 'string') {
        try { parsed = JSON.parse(raw || '[]'); } catch (e) { throw new Error('Configuración inválida del Attribute Manager'); }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({
        enabled: row?.enabled !== false,
        action: String(row?.action || 'keep').trim().toLowerCase(),
        source: String(row?.source || row?.inputAttr || row?.input_attr || '').trim(),
        target: String(row?.target || row?.outputAttr || row?.output_attr || row?.name || '').trim(),
        value: String(row?.value ?? ''),
        cast: String(row?.cast || row?.valueType || row?.value_type || 'string').trim().toLowerCase(),
        condition: String(row?.condition || '')
    })).filter((row) => row.enabled);
}

function castAttributeManagerValue(value, castType) {
    const kind = String(castType || 'string').toLowerCase();
    if (value == null) return null;
    if (['string', 'varchar', 'text', 'datetime'].includes(kind)) return String(value);
    if (['number', 'real', 'double'].includes(kind)) {
        const number = Number(value);
        if (!Number.isFinite(number)) throw new Error(`No se puede convertir a number: ${value}`);
        return number;
    }
    if (['integer', 'int'].includes(kind)) {
        const number = Number(value);
        if (!Number.isFinite(number)) throw new Error(`No se puede convertir a integer: ${value}`);
        return Math.trunc(number);
    }
    if (['boolean', 'bool'].includes(kind)) {
        if (typeof value === 'boolean') return value;
        const text = String(value).trim().toLowerCase();
        if (['true', '1', 'yes', 'si', 'y'].includes(text)) return true;
        if (['false', '0', 'no', 'n', ''].includes(text)) return false;
        throw new Error(`No se puede convertir a boolean: ${value}`);
    }
    if (kind === 'json') return typeof value === 'object' ? value : JSON.parse(String(value));
    if (kind === 'date') {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) throw new Error(`No se puede convertir a date: ${value}`);
        return date.toISOString();
    }
    return value;
}

function readKeeperFieldsCompat(dom) {
    let fields = [];
    try { fields = JSON.parse(dom?.querySelector?.('[df-ak-fields]')?.value || '[]'); } catch (_) { fields = []; }
    if (!Array.isArray(fields) || !fields.length) fields = parseCsvFields(dom?.querySelector?.('[df-keep]')?.value || '');
    return Array.from(new Set((fields || []).map((field) => resolveParamText(field).trim()).filter(Boolean)));
}

function readCreatorCreationsCompat(dom) {
    let creations = [];
    try { creations = JSON.parse(dom?.querySelector?.('[df-ac-creations]')?.value || '[]'); } catch (_) { creations = []; }
    if (!Array.isArray(creations) || !creations.length) {
        const outputAttr = resolveParamText(dom?.querySelector?.('[df-name]')?.value || '').trim();
        const expression = resolveParamText(dom?.querySelector?.('[df-val]')?.value || '');
        if (outputAttr || expression) creations = [{ enabled: true, outputAttr, expression, defaultValue: dom?.querySelector?.('[df-default]')?.value ?? null, valueType: 'string' }];
    }
    return creations.filter((row) => row && row.enabled !== false && String(row.outputAttr || '').trim()).map((row) => ({
        enabled: row.enabled !== false,
        outputAttr: resolveParamText(row.outputAttr).trim(),
        expression: resolveParamText(row.expression ?? ''),
        defaultValue: row.defaultValue ?? null,
        valueType: String(row.valueType || 'string').toLowerCase()
    }));
}

function evaluateCreatorExpressionCompat(creation, feature) {
    const expression = String(creation.expression ?? '').trim();
    if (!expression) return creation.defaultValue ?? null;
    const properties = feature.properties || {};
    let value;
    if (expression.startsWith('=')) {
        const fn = compileSafeExpression(expression.slice(1), ['f', 'props']);
        value = fn(feature, properties, Math, turf, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    } else if (/^@Value\(([^)]+)\)$/.test(expression)) {
        value = properties[expression.match(/^@Value\(([^)]+)\)$/)[1]] ?? creation.defaultValue ?? null;
    } else if (/^@(round|floor|ceil)\(([^)]+)\)$/.test(expression)) {
        const match = expression.match(/^@(round|floor|ceil)\(([^)]+)\)$/); const raw = properties[match[2]] ?? match[2]; value = Math[match[1]](Number(raw));
    } else if (/^@(upper|lower|trim)\(([^)]+)\)$/.test(expression)) {
        const match = expression.match(/^@(upper|lower|trim)\(([^)]+)\)$/); const text = String(properties[match[2]] ?? ''); value = match[1] === 'upper' ? text.toUpperCase() : match[1] === 'lower' ? text.toLowerCase() : text.trim();
    } else if (expression.startsWith('@concat(') && expression.endsWith(')')) {
        value = expression.slice(8, -1).split(',').map((part) => { const token = part.trim(); const match = token.match(/^@Value\(([^)]+)\)$/); return match ? properties[match[1]] ?? '' : token.replace(/^["']|["']$/g, ''); }).join('');
    } else value = expression.replace(/^["']|["']$/g, '');
    return castAttributeManagerValue(value, creation.valueType);
}

function runAttributeManagerExpression(source, props, feature, originalProps) {
    const fn = compileSafeExpression(source, ['props', 'feat', 'originalProps']);
    return fn(props, feature, originalProps, Math, turf, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
}

function resolveAttributeManagerValue(row, feature, props, originalProps) {
    const raw = String(row.value ?? '').trim();
    const expression = raw.startsWith('=')
        ? raw.slice(1)
        : (raw.includes('@Value(') && /[+\-*/%<>!=]/.test(raw.replace(/@Value\([^)]+\)/g, ''))
            ? raw.replace(/@Value\(([^)]+)\)/g, (_, name) => `props[${JSON.stringify(String(name).trim())}]`)
            : null);
    return expression ? runAttributeManagerExpression(expression, props, feature, originalProps) : row.value;
}

function runAttributeManagerFeature(feature, rules, preserveOthers) {
    const clone = cloneFeatureForAttributeTool(feature);
    const original = { ...(feature.properties || {}) };
    const props = { ...original };
    const order = [];
    const remember = (field) => { const index = order.indexOf(field); if (index >= 0) order.splice(index, 1); if (field) order.push(field); };
    for (let index = 0; index < rules.length; index++) {
        const row = rules[index];
        const source = row.source || row.target;
        const target = row.target || row.source;
        if (row.action === 'keep') {
            if (!source || !Object.prototype.hasOwnProperty.call(props, source)) throw new Error(`Fila ${index + 1}: campo no encontrado ${source}`);
            remember(source);
        } else if (row.action === 'remove') {
            if (!source) throw new Error(`Fila ${index + 1}: campo vacío`);
            delete props[source];
            const position = order.indexOf(source); if (position >= 0) order.splice(position, 1);
        } else if (row.action === 'rename' || row.action === 'copy') {
            if (!source || !target) throw new Error(`Fila ${index + 1}: ${row.action} requiere source y target`);
            if (!Object.prototype.hasOwnProperty.call(props, source)) throw new Error(`Fila ${index + 1}: campo no encontrado ${source}`);
            props[target] = props[source];
            if (row.action === 'rename' && target !== source) delete props[source];
            remember(target);
        } else if (row.action === 'create') {
            if (!target) throw new Error(`Fila ${index + 1}: create requiere target`);
            props[target] = resolveAttributeManagerValue(row, clone, props, original);
            remember(target);
        } else if (row.action === 'formula') {
            if (!target) throw new Error(`Fila ${index + 1}: formula requiere target`);
            props[target] = runAttributeManagerExpression(String(row.value || ''), props, clone, original);
            remember(target);
        } else if (row.action === 'default') {
            if (!target) throw new Error(`Fila ${index + 1}: default requiere target`);
            if (props[target] == null || props[target] === '') props[target] = resolveAttributeManagerValue(row, clone, props, original);
            remember(target);
        } else if (row.action === 'cast') {
            if (!source || !target || !Object.prototype.hasOwnProperty.call(props, source)) throw new Error(`Fila ${index + 1}: cast requiere campo existente`);
            props[target] = castAttributeManagerValue(props[source], row.cast);
            remember(target);
        } else throw new Error(`Fila ${index + 1}: acción no soportada ${row.action}`);
    }
    const ordered = {};
    order.forEach((field) => { if (Object.prototype.hasOwnProperty.call(props, field)) ordered[field] = props[field]; });
    if (preserveOthers) Object.keys(original).concat(Object.keys(props)).forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(props, field) && !Object.prototype.hasOwnProperty.call(ordered, field)) ordered[field] = props[field];
    });
    clone.properties = ordered;
    return clone;
}

function splitAttributeFunctionArgs(source) {
    const args = []; let current = ''; let depth = 0;
    for (const char of String(source || '')) {
        if (char === ',' && depth === 0) { args.push(current); current = ''; continue; }
        if (char === '(') depth++; else if (char === ')') depth--;
        current += char;
    }
    if (current.trim()) args.push(current);
    return args;
}

function evaluateAttributeCondition(condition, props) {
    const operand = (raw) => {
        const text = String(raw || '').trim();
        const match = text.match(/^@Value\(([^)]+)\)$/);
        if (match) return props[match[1].trim()];
        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
        if (/^null$/i.test(text)) return null;
        if (/^(true|false)$/i.test(text)) return /^true$/i.test(text);
        if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
        return Object.prototype.hasOwnProperty.call(props, text) ? props[text] : text;
    };
    const match = String(condition || '').trim().match(/^(.+?)(==|!=|>=|<=|=|>|<)(.+)$/);
    if (!match) return Boolean(operand(condition));
    const left = operand(match[1]); const right = operand(match[3]); const op = match[2];
    const leftNumber = Number(left); const rightNumber = Number(right);
    const numeric = left !== '' && right !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
    const a = numeric ? leftNumber : String(left ?? ''); const b = numeric ? rightNumber : String(right ?? '');
    if (op === '=' || op === '==') return a === b;
    if (op === '!=') return a !== b;
    if (op === '>') return a > b; if (op === '>=') return a >= b;
    if (op === '<') return a < b; return a <= b;
}

function evaluateAttributeArithmetic(expression, props) {
    const resolved = String(expression || '').replace(/@Value\(([^)]+)\)/g, (_, name) => {
        const value = Number(props[String(name).trim()]);
        return Number.isFinite(value) ? String(value) : '0';
    });
    return runAttributeManagerExpression(resolved, props, { properties: props }, props);
}

function resolveAttributeV2Value(value, props, type) {
    const source = String(value ?? '').trim();
    if (/^null$/i.test(source)) return null;
    const direct = source.match(/^@Value\(([^)]+)\)$/);
    if (direct) return castAttributeManagerValue(props[direct[1].trim()], type);
    const math = source.match(/^@(round|floor|ceil)\((.+)\)$/);
    if (math) return castAttributeManagerValue(Math[math[1]](evaluateAttributeArithmetic(math[2], props)), type);
    const stringFn = source.match(/^@(upper|lower|trim)\((.+)\)$/);
    if (stringFn) {
        const inner = stringFn[2].match(/^@Value\(([^)]+)\)$/);
        const text = String(inner ? props[inner[1].trim()] ?? '' : stringFn[2]);
        return stringFn[1] === 'upper' ? text.toUpperCase() : stringFn[1] === 'lower' ? text.toLowerCase() : text.trim();
    }
    const concat = source.match(/^@concat\((.+)\)$/);
    if (concat) return splitAttributeFunctionArgs(concat[1]).map((part) => {
        const match = part.trim().match(/^@Value\(([^)]+)\)$/);
        return String(match ? props[match[1].trim()] ?? '' : part.trim());
    }).join('');
    const conditional = source.match(/^@if\((.+)\)$/);
    if (conditional) {
        const args = splitAttributeFunctionArgs(conditional[1]);
        if (args.length >= 3) return resolveAttributeV2Value(evaluateAttributeCondition(args[0], props) ? args[1] : args[2], props, type);
    }
    if (/[+\-*/%]/.test(source) && source.includes('@Value(')) return castAttributeManagerValue(evaluateAttributeArithmetic(source, props), type);
    return castAttributeManagerValue(source, type);
}

function runAttributeManagerV2Feature(feature, rules, preserveOthers) {
    const clone = cloneFeatureForAttributeTool(feature);
    const props = { ...(clone.properties || {}) };
    const managed = [];
    for (const rule of rules) {
        if (rule.enabled === false) continue;
        const action = String(rule.action || 'do_nothing');
        const source = String(rule.inputAttr || rule.source || '');
        const target = String(rule.outputAttr || rule.target || '');
        if (rule.condition && !evaluateAttributeCondition(rule.condition, props)) {
            if (['set', 'create'].includes(action) && (target || source)) {
                props[target || source] = null;
                managed.push(target || source);
            }
            continue;
        }
        if (action === 'remove') delete props[source];
        else if (action === 'rename' && source && target && Object.prototype.hasOwnProperty.call(props, source)) { props[target] = props[source]; delete props[source]; managed.push(target); }
        else if (action === 'set' && (target || source)) { props[target || source] = resolveAttributeV2Value(rule.value, props, rule.valueType); managed.push(target || source); }
        else if (action === 'create' && target) { props[target] = resolveAttributeV2Value(rule.value, props, rule.valueType); managed.push(target); }
        else if (action === 'do_nothing' && source) managed.push(source);
    }
    if (preserveOthers) clone.properties = props;
    else {
        clone.properties = {};
        managed.forEach((field) => { if (Object.prototype.hasOwnProperty.call(props, field)) clone.properties[field] = props[field]; });
    }
    return clone;
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
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Keeper', icon: 'fa-check-square', color: '#27ae60', in: 1, out: 1,
        help: 'Mantiene únicamente los atributos seleccionados. La configuración completa se abre en un modal.',
        tpl: () => `
            <div class="node-editor-summary"><i class="fas fa-check-square"></i><div><strong data-ak-count>0 campos</strong><small>Conservar atributos</small></div></div>
            <button type="button" class="btn node-editor-open" data-schema-action="keeper-open-editor"><i class="fas fa-pen"></i> Abrir editor</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-ak-fields class="node-control" tabindex="-1">[]</textarea><input df-on-error value="null" tabindex="-1"></div>`,
        run: async (id, inputs, dom) => {
            const source = inputs[0]; if (!source?.features) throw new Error('Sin datos');
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const toKeep = new Set(readKeeperFieldsCompat(dom));
            if (!toKeep.size) throw new Error("Define al menos un campo a mantener");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_keeper',
                        features: source,
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
            source.features.forEach((feature) => {
                const f = cloneFeatureForAttributeTool(feature); if (!f.properties) f.properties = {};
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
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attr Creator', icon: 'fa-plus-square', color: '#27ae60', in: 1, out: 1,
        help: 'Crea varios atributos con valores, referencias o expresiones en orden.',
        tpl: () => `
            <div class="node-editor-summary"><i class="fas fa-plus-square"></i><div><strong data-ac-count>0 atributos</strong><small>Creaciones ordenadas</small></div></div>
            <button type="button" class="btn node-editor-open" data-schema-action="creator-open-editor"><i class="fas fa-pen"></i> Abrir editor</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-ac-creations class="node-control" tabindex="-1">[]</textarea><input df-on-error value="null" tabindex="-1"></div>`,
        run: async (id, inputs, dom) => {
            const source = inputs[0]; if (!source?.features) throw new Error('Sin datos');
            const creations = readCreatorCreationsCompat(dom); const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            if (!creations.length) throw new Error('Define al menos una creación de atributo');

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_creator',
                        features: source,
                        creations,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Attr Creator fallo, fallback local:", e);
                }
            }

            const passed = [];
            const rejected = [];
            source.features.forEach((feature) => {
                const f = cloneFeatureForAttributeTool(feature); if (!f.properties) f.properties = {};
                let failed = null;
                creations.forEach((creation) => {
                    if (failed) return;
                    try { f.properties[creation.outputAttr] = evaluateCreatorExpressionCompat(creation, f); }
                    catch (error) { f.properties[creation.outputAttr] = creation.defaultValue ?? null; failed = error; }
                });
                if (failed && onError === 'reject') { f.properties._creator_error = failed.message || String(failed); rejected.push(f); }
                else passed.push(f);
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

    attr_list_concatenator: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'List Concatenator', icon: 'fa-list', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-list"></i>
                <div><strong data-attribute-text-summary>_list → concatenated</strong><small>Unir lista con “,”</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="list-concat-open-editor">
                <i class="fas fa-pen"></i> Configurar
            </button>
            <div class="node-editor-storage" aria-hidden="true">
                <textarea df-list-concat-config class="node-control" tabindex="-1">{"list_attr":"_list","target_attr":"concatenated","delimiter":",","drop_empty":false}</textarea>
            </div>`,
        run: async (id, inputs, dom) => {
            let config = { list_attr: '_list', target_attr: 'concatenated', delimiter: ',', drop_empty: false };
            try { config = { ...config, ...JSON.parse(dom.querySelector('[df-list-concat-config]')?.value || '{}') }; } catch (e) { /* defaults */ }
            const source = resolveParamText(config.list_attr).trim();
            const target = resolveParamText(config.target_attr).trim();
            if (!source || !target) throw new Error('Define los campos de lista y destino');
            const features = inputs[0].features.map((feature) => {
                const clone = cloneFeatureForAttributeTool(feature);
                clone.properties = clone.properties || {};
                let values = readNestedListValues(clone.properties, source)
                    .map((value) => value == null ? '' : String(value));
                if (config.drop_empty) values = values.filter((value) => value !== '');
                clone.properties[target] = values.join(String(config.delimiter ?? ','));
                return clone;
            });
            return turf.featureCollection(features);
        }
    },

    attr_substring: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Substring Extractor', icon: 'fa-i-cursor', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-i-cursor"></i>
                <div><strong data-attribute-text-summary>Fecha → Ano</strong><small>Caracteres 0–3 (inclusivo)</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="substring-open-editor">
                <i class="fas fa-pen"></i> Configurar
            </button>
            <div class="node-editor-storage" aria-hidden="true">
                <textarea df-substring-config class="node-control" tabindex="-1">{"source_attr":"Fecha","target_attr":"Ano","start":0,"end":3}</textarea>
            </div>`,
        run: async (id, inputs, dom) => {
            let config = { source_attr: 'Fecha', target_attr: 'Ano', start: 0, end: 3 };
            try { config = { ...config, ...JSON.parse(dom.querySelector('[df-substring-config]')?.value || '{}') }; } catch (e) { /* defaults */ }
            const source = resolveParamText(config.source_attr).trim();
            const target = resolveParamText(config.target_attr).trim();
            if (!source || !target) throw new Error('Define los campos de origen y destino');
            const features = inputs[0].features.map((feature) => {
                const clone = cloneFeatureForAttributeTool(feature);
                clone.properties = clone.properties || {};
                clone.properties[target] = extractFmeSubstring(clone.properties[source], config.start, config.end);
                return clone;
            });
            return turf.featureCollection(features);
        }
    },

    attr_aggregator: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Aggregator', icon: 'fa-layer-group', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div class="node-editor-summary"><i class="fas fa-layer-group"></i><div><strong data-aggregator-summary>MATRICULA</strong><small>Agrupar y producir Multi*</small></div></div>
            <button type="button" class="btn node-editor-open" data-schema-action="aggregator-open-editor"><i class="fas fa-pen"></i> Configurar</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-aggregator-config class="node-control" tabindex="-1">{"group_by":"MATRICULA","remove_geometry":false,"produce_multis":true,"preserve_multi_inputs":false}</textarea></div>`,
        run: async (id, inputs, dom) => {
            const defaults = { group_by: 'MATRICULA', remove_geometry: false, produce_multis: true, preserve_multi_inputs: false };
            let config = defaults;
            try { config = { ...defaults, ...JSON.parse(dom.querySelector('[df-aggregator-config], [df-g2-config]')?.value || '{}') }; } catch (e) { /* defaults */ }
            const fields = Array.isArray(config.group_by) ? config.group_by.map(String) : parseCsvFields(config.group_by);
            const read = (props, field) => {
                if (Object.prototype.hasOwnProperty.call(props || {}, field)) return props[field];
                const actual = Object.keys(props || {}).find((key) => key.toLowerCase() === field.toLowerCase());
                return actual ? props[actual] : '';
            };
            const groups = new Map();
            for (const feature of inputs[0].features) {
                const key = fields.map((field) => String(read(feature.properties, field) ?? '')).join('\u001f');
                if (!groups.has(key)) {
                    const item = cloneFeatureForAttributeTool(feature);
                    if (config.remove_geometry) item.geometry = null;
                    groups.set(key, { item, geometries: [] });
                }
                const group = groups.get(key);
                const target = group.item.properties || (group.item.properties = {});
                Object.entries(feature.properties || {}).forEach(([field, value]) => {
                    if (value !== null && value !== '' && (target[field] == null || target[field] === '')) target[field] = value;
                });
                if (!config.remove_geometry && feature.geometry) group.geometries.push(JSON.parse(JSON.stringify(feature.geometry)));
            }
            if (config.produce_multis && !config.remove_geometry) groups.forEach((group) => {
                const points = []; const lines = []; const polygons = []; const others = [];
                group.geometries.forEach((geometry) => {
                    const coordinates = geometry?.coordinates;
                    if (!coordinates) return;
                    if (geometry.type === 'Point') points.push(coordinates);
                    else if (geometry.type === 'MultiPoint') config.preserve_multi_inputs ? others.push(geometry) : points.push(...coordinates);
                    else if (geometry.type === 'LineString') lines.push(coordinates);
                    else if (geometry.type === 'MultiLineString') config.preserve_multi_inputs ? others.push(geometry) : lines.push(...coordinates);
                    else if (geometry.type === 'Polygon') polygons.push(coordinates);
                    else if (geometry.type === 'MultiPolygon') config.preserve_multi_inputs ? others.push(geometry) : polygons.push(...coordinates);
                    else others.push(geometry);
                });
                const populated = [points.length, lines.length, polygons.length, others.length].filter(Boolean).length;
                if (populated === 1 && points.length) group.item.geometry = { type: 'MultiPoint', coordinates: points };
                else if (populated === 1 && lines.length) group.item.geometry = { type: 'MultiLineString', coordinates: lines };
                else if (populated === 1 && polygons.length) group.item.geometry = { type: 'MultiPolygon', coordinates: polygons };
                else if (populated) group.item.geometry = { type: 'GeometryCollection', geometries: [
                    ...(points.length ? [{ type: 'MultiPoint', coordinates: points }] : []),
                    ...(lines.length ? [{ type: 'MultiLineString', coordinates: lines }] : []),
                    ...(polygons.length ? [{ type: 'MultiPolygon', coordinates: polygons }] : []), ...others
                ] };
                else group.item.geometry = null;
            });
            return turf.featureCollection(Array.from(groups.values(), (group) => group.item));
        }
    },

    attr_manager: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attribute Manager', icon: 'fa-table-columns', color: '#27ae60', in: 1, out: 2, hidden: true,
        tpl: () => `
            <div class="node-editor-summary"><i class="fas fa-table-columns"></i><div><strong data-attr-manager-summary>0 reglas</strong><small>Contrato legado Desktop</small></div></div>
            <button type="button" class="btn node-editor-open" data-schema-action="attr-manager-open-editor"><i class="fas fa-pen"></i> Abrir editor</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-attr-manager-config class="node-control" tabindex="-1">{"rules":[],"preserveOthers":true,"onError":"null"}</textarea></div>`,
        run: async (id, inputs, dom) => {
            let config = { rules: [], preserveOthers: true, onError: 'null' };
            try { config = { ...config, ...JSON.parse(dom.querySelector('[df-attr-manager-config]')?.value || '{}') }; } catch (e) { /* legacy fallback */ }
            if (!config.rules.length) {
                try { config.rules = JSON.parse(dom.querySelector('[df-rules]')?.value || '[]'); } catch (e) { config.rules = []; }
            }
            if (!dom.querySelector('[df-attr-manager-config]')) {
                const preserve = dom.querySelector('[df-preserve]');
                if (preserve) config.preserveOthers = !!preserve.checked;
                config.onError = dom.querySelector('[df-on-error]')?.value || config.onError;
            }
            const rules = normalizeAttributeManagerRules(config.rules);
            if (!rules.length) throw new Error('Define al menos una regla');
            const passed = []; const rejected = [];
            for (const feature of inputs[0].features) {
                try { passed.push(runAttributeManagerFeature(feature, rules, config.preserveOthers !== false)); }
                catch (error) {
                    const clone = cloneFeatureForAttributeTool(feature);
                    clone.properties = { ...(clone.properties || {}), _attr_manager_error: error.message || String(error) };
                    if (config.onError === 'reject') rejected.push(clone); else passed.push(clone);
                }
            }
            return config.onError === 'reject'
                ? { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) }
                : turf.featureCollection(passed);
        }
    },

    attr_manager_v2: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attribute Manager v2', icon: 'fa-table-columns', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div class="node-editor-summary"><i class="fas fa-table-columns"></i><div><strong data-attr-manager-summary>0 reglas</strong><small>Reglas estilo FME</small></div></div>
            <button type="button" class="btn node-editor-open" data-schema-action="attr-manager-v2-open-editor"><i class="fas fa-pen"></i> Abrir editor</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-attr-manager-v2-config class="node-control" tabindex="-1">{"rules":[],"preserveOthers":true}</textarea></div>`,
        run: async (id, inputs, dom) => {
            let config = { rules: [], preserveOthers: true };
            try { config = { ...config, ...JSON.parse(dom.querySelector('[df-attr-manager-v2-config]')?.value || '{}') }; } catch (e) { /* legacy fallback */ }
            if (!config.rules.length) {
                try { config.rules = JSON.parse(dom.querySelector('[df-amv2-rules]')?.value || '[]'); } catch (e) { config.rules = []; }
            }
            if (!dom.querySelector('[df-attr-manager-v2-config]')) {
                const preserve = dom.querySelector('[data-amv2-preserve]');
                if (preserve) config.preserveOthers = !!preserve.checked;
            }
            if (!Array.isArray(config.rules) || !config.rules.length) throw new Error('Define al menos una regla');
            return turf.featureCollection(inputs[0].features.map((feature) => runAttributeManagerV2Feature(feature, config.rules, config.preserveOthers !== false)));
        }
    },

    attr_splitter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attribute Splitter', icon: 'fa-cut', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-cut"></i>
                <div><strong data-attribute-text-summary>image → _list</strong><small>Separar por “_”</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="splitter-open-editor"><i class="fas fa-pen"></i> Configurar</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-splitter-config class="node-control" tabindex="-1">{"source_attr":"image","target_attr":"_list","delimiter":"_"}</textarea></div>`,
        run: async (id, inputs, dom) => {
            let config = { source_attr: 'image', target_attr: '_list', delimiter: '_' };
            try { config = { ...config, ...JSON.parse(dom.querySelector('[df-splitter-config]')?.value || '{}') }; } catch (e) { /* defaults */ }
            const source = resolveParamText(config.source_attr).trim();
            const target = resolveParamText(config.target_attr).trim();
            if (!source || !target) throw new Error('Define los campos de origen y destino');
            const delimiter = String(config.delimiter ?? '_');
            const features = inputs[0].features.map((feature) => {
                const clone = cloneFeatureForAttributeTool(feature);
                clone.properties = clone.properties || {};
                const value = clone.properties[source];
                clone.properties[target] = value == null ? [] : String(value).split(delimiter).filter((part) => part !== '');
                return clone;
            });
            return turf.featureCollection(features);
        }
    },

    attr_list_exploder: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'List Exploder', icon: 'fa-list-ol', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-list-ol"></i>
                <div><strong data-attribute-text-summary>_list</strong><small>Índice → _element_index</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="list-exploder-open-editor"><i class="fas fa-pen"></i> Configurar</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-list-exploder-config class="node-control" tabindex="-1">{"list_attr":"_list","index_attr":"_element_index"}</textarea></div>`,
        run: async (id, inputs, dom) => {
            let config = { list_attr: '_list', index_attr: '_element_index' };
            try { config = { ...config, ...JSON.parse(dom.querySelector('[df-list-exploder-config]')?.value || '{}') }; } catch (e) { /* defaults */ }
            const listAttr = resolveParamText(config.list_attr).trim();
            const indexAttr = resolveParamText(config.index_attr).trim();
            if (!listAttr || !indexAttr) throw new Error('Define los atributos de lista e índice');
            const features = [];
            for (const feature of inputs[0].features) {
                const raw = feature.properties?.[listAttr];
                const values = Array.isArray(raw) ? raw : (raw == null ? [] : [raw]);
                values.forEach((value, index) => {
                    const clone = cloneFeatureForAttributeTool(feature);
                    clone.properties = { ...(clone.properties || {}), [listAttr]: value, [indexAttr]: index };
                    features.push(clone);
                });
            }
            return turf.featureCollection(features);
        }
    },

    attr_string_replacer: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'String Replacer', icon: 'fa-exchange-alt', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-exchange-alt"></i>
                <div><strong data-strrep-summary>0 reglas</strong><small data-strrep-mode>Texto literal</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="strrep-open-editor"><i class="fas fa-pen"></i> Abrir editor</button>
            <div class="node-editor-storage" aria-hidden="true"><textarea df-strrep-config class="node-control" tabindex="-1">{"mode":"text","case_sensitive":true,"no_match_action":"none","no_match_value":"","rules":[]}</textarea></div>`,
        run: async (id, inputs, dom) => {
            let config = { mode: 'text', case_sensitive: true, no_match_action: 'none', no_match_value: '', rules: [] };
            try { config = { ...config, ...JSON.parse(dom.querySelector('[df-strrep-config]')?.value || '{}') }; } catch (e) { /* defaults */ }
            const rules = Array.isArray(config.rules)
                ? config.rules.filter((rule) => rule && rule.enabled !== false && String(rule.attribute || '').trim())
                : [];
            const features = inputs[0].features.map((feature) => {
                const clone = cloneFeatureForAttributeTool(feature);
                clone.properties = clone.properties || {};
                rules.forEach((rule) => {
                    const attribute = String(rule.attribute).trim();
                    const replaced = applyStringReplace(clone.properties[attribute], rule.search, rule.replace, config.mode, config.case_sensitive !== false);
                    if (replaced.matched) clone.properties[attribute] = replaced.value;
                    else if (config.no_match_action === 'null') clone.properties[attribute] = null;
                    else if (config.no_match_action === 'set') clone.properties[attribute] = config.no_match_value ?? '';
                });
                return clone;
            });
            return turf.featureCollection(features);
        }
    },

    attr_string_formatter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'String Formatter', icon: 'fa-text-width', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-text-width"></i>
                <div><strong data-formatter-summary>Sin campos</strong><small data-formatter-operation>Mayúsculas</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="formatter-open-editor">
                <i class="fas fa-pen"></i> Abrir editor
            </button>
            <div class="node-editor-storage" aria-hidden="true">
                <textarea df-config class="node-control" tabindex="-1">{"fields":[],"operation":"upper","arguments":"","onError":"null"}</textarea>
            </div>`,
        run: async (id, inputs, dom) => {
            let config = null;
            const configRaw = dom.querySelector('[df-config]')?.value;
            if (configRaw) {
                try { config = JSON.parse(configRaw); } catch (e) { config = null; }
            }
            const legacyField = dom.querySelector('[df-field]')?.value || '';
            const fieldRaw = resolveParamText(config
                ? (Array.isArray(config.fields) ? config.fields.join(',') : config.fields || '')
                : legacyField);
            const op = resolveParamText(config?.operation || dom.querySelector('[df-op]')?.value || 'upper');
            const argsRaw = resolveParamText(config?.arguments || dom.querySelector('[df-args]')?.value || '');
            const onError = config?.onError || dom.querySelector('[df-on-error]')?.value || 'null';
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
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'FeatureJoiner', icon: 'fa-link', color: '#27ae60', in: 2, out: 3,
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
            <div style="font-size:0.6em;color:#888">Out 1: Joined | Out 2: Unjoined Left | Out 3: Unused Right</div>`,
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
                if (!index.has(key)) index.set(key, []);
                index.get(key).push(f);
            });
            const joined = [];
            const unmatched = [];
            const rightUsed = new Set();
            left.forEach(f => {
                if (!f.properties) f.properties = {};
                const key = getKey(f.properties || {}, leftKeys);
                const matches = index.get(key) || [];
                if (matches.length) {
                    matches.forEach((match) => {
                        rightUsed.add(match);
                        const nf = JETLClone(f);
                        Object.keys(match.properties || {}).forEach(k => nf.properties[prefix + k] = match.properties[k]);
                        joined.push(nf);
                    });
                } else {
                    if (joinType === 'left') joined.push(f);
                    unmatched.push(f);
                }
            });
            const unusedRight = right.filter((feature) => !rightUsed.has(feature));
            return {
                output_1: turf.featureCollection(joined),
                output_2: turf.featureCollection(unmatched),
                output_3: turf.featureCollection(unusedRight)
            };
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
                    if (wres && wres.status === 'ok' && wres.data?.output_3) return wres.data;
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







// =============================================
// Dynamic Field Selectors (schema-driven node UI)
// =============================================
(function () {
    function _getEditor() {
        try { return typeof editor !== 'undefined' ? editor : null; } catch (e) { return null; }
    }

    function _safeGetNode(nodeId) {
        const ed = _getEditor();
        if (!ed || !ed.export || !ed.getNodeFromId) return { ed: null, node: null };
        try {
            const data = ed.export();
            const nodes = data && data.drawflow && data.drawflow.Home && data.drawflow.Home.data
                ? data.drawflow.Home.data
                : null;
            if (!nodes || !nodes[String(nodeId)]) return { ed, node: null };
            return { ed, node: ed.getNodeFromId(nodeId) };
        } catch (e) {
            return { ed, node: null };
        }
    }

    function _getExecutionData() {
        try {
            if (typeof executionData !== 'undefined') return executionData || {};
        } catch (e) { }
        return window.executionData || {};
    }

    function _pickFeatureCollection(data) {
        if (!data) return null;
        if (data.type === 'FeatureCollection') return data;
        if (data.type === 'Feature') return turf.featureCollection([data]);
        if (typeof data === 'object') {
            if (data.output_1 && data.output_1.type === 'FeatureCollection') return data.output_1;
            if (data.output_2 && data.output_2.type === 'FeatureCollection') return data.output_2;
            if (data.output_3 && data.output_3.type === 'FeatureCollection') return data.output_3;
        }
        return null;
    }

    function _schemaFromNodeData(nodeId) {
        if (!nodeId && nodeId !== 0) return [];

        const store = _getExecutionData();
        const fromExec = store[nodeId] && store[nodeId].data ? store[nodeId].data : null;
        const fromFile = window._file_cache ? window._file_cache['file_' + nodeId] : null;
        const data = fromExec || fromFile;

        const fc = _pickFeatureCollection(data);
        if (!fc || !fc.features || fc.features.length === 0) return [];

        const fields = new Set();
        const maxScan = Math.min(fc.features.length, 200);
        for (let i = 0; i < maxScan; i++) {
            const props = fc.features[i] && fc.features[i].properties ? fc.features[i].properties : {};
            Object.keys(props).forEach(k => {
                if (!k.startsWith('_')) fields.add(k);
            });
        }
        return Array.from(fields).sort((a, b) => a.localeCompare(b));
    }

    function _getParentNodeId(targetNode, inputKey) {
        const input = targetNode && targetNode.inputs ? targetNode.inputs[inputKey] : null;
        const conn = input && input.connections && input.connections.length ? input.connections[0] : null;
        return conn ? conn.node : null;
    }

    function _fillSelect(selectEl, fields, emptyLabel) {
        if (!selectEl) return;
        const prev = selectEl.value;
        selectEl.innerHTML = '';

        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = emptyLabel || 'Selecciona campo';
        selectEl.appendChild(empty);

        fields.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            selectEl.appendChild(opt);
        });

        if (fields.includes(prev)) selectEl.value = prev;
    }

    function updateJoinNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || (node.name !== 'attr_join_adv' && node.name !== 'attr_feature_merger')) return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;

        const leftSelect = dom.querySelector('[df-join-left]');
        const rightSelect = dom.querySelector('[df-join-right]');
        if (!leftSelect || !rightSelect) return;

        const p1 = _getParentNodeId(node, 'input_1');
        const p2 = _getParentNodeId(node, 'input_2');

        const leftFields = _schemaFromNodeData(p1);
        const rightFields = _schemaFromNodeData(p2);

        _fillSelect(leftSelect, leftFields, 'Campo Input 1');
        _fillSelect(rightSelect, rightFields, 'Campo Input 2');
    }

    function appendJoinPair(nodeId) {
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const left = dom.querySelector('[df-join-left]');
        const right = dom.querySelector('[df-join-right]');
        const mapInput = dom.querySelector('[df-map]');
        if (!left || !right || !mapInput) return;
        if (!left.value || !right.value) return;

        const pair = `${left.value}:${right.value}`;
        const current = (mapInput.value || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (!current.includes(pair)) current.push(pair);
        mapInput.value = current.join(', ');
    }

    function appendRenamerPair(nodeId) {
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const oldSel = dom.querySelector('[df-rename-old]');
        const newInp = dom.querySelector('[df-rename-new]');
        const mapInput = dom.querySelector('[df-map]');
        if (!oldSel || !newInp || !mapInput) return;
        const oldName = String(oldSel.value || '').trim();
        const newName = String(newInp.value || '').trim();
        if (!oldName || !newName) return;
        const pair = `${oldName}:${newName}`;
        const current = (mapInput.value || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (!current.includes(pair)) current.push(pair);
        mapInput.value = current.join(', ');
        newInp.value = '';
    }

    function updateCalcNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_calc_pro') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const sourceSelect = dom.querySelector('[df-source-field]');
        if (!sourceSelect) return;

        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _fillSelect(sourceSelect, fields, 'Campo de entrada');
    }

    function updateSorterNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_sorter') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const sortField = dom.querySelector('[df-field]');
        if (!sortField) return;

        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _fillSelect(sortField, fields, 'Campo de entrada');
    }

    function updateRenamerNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_renamer') return;
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const oldSel = dom.querySelector('[df-rename-old]');
        if (!oldSel) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _fillSelect(oldSel, fields, 'Campo origen');
    }

    function _renderKeeperFieldList(dom, fields) {
        const box = dom.querySelector('[df-keeper-fields]');
        const input = dom.querySelector('[df-keep]');
        if (!box || !input) return;
        const selected = new Set(
            (input.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        );
        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div style="font-size:0.7em;color:#777">Sin campos disponibles</div>';
            return;
        }
        fields.forEach((f) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.fontSize = '0.78em';
            row.style.color = '#ddd';
            row.style.marginBottom = '4px';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-keeper-field', f);
            cb.checked = selected.has(f);
            const txt = document.createElement('span');
            txt.textContent = f;
            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateKeeperNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_keeper') return;
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderKeeperFieldList(dom, fields);
    }

    const FORMATTER_OPERATION_LABELS = {
        upper: 'Mayúsculas', lower: 'Minúsculas', capitalize: 'Capitalizar', trim: 'Limpiar espacios',
        replace: 'Reemplazar', concat: 'Concatenar', pad: 'Rellenar', template: 'Plantilla'
    };

    function _readFormatterConfig(dom) {
        const raw = dom?.querySelector('[df-config]')?.value;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                return {
                    fields: Array.isArray(parsed.fields) ? parsed.fields : String(parsed.fields || '').split(','),
                    operation: parsed.operation || 'upper',
                    arguments: parsed.arguments || '',
                    onError: parsed.onError || 'null'
                };
            } catch (e) { /* Compatibilidad con nodos previos al editor modal. */ }
        }
        return {
            fields: String(dom?.querySelector('[df-field]')?.value || '').split(','),
            operation: dom?.querySelector('[df-op]')?.value || 'upper',
            arguments: dom?.querySelector('[df-args]')?.value || '',
            onError: dom?.querySelector('[df-on-error]')?.value || 'null'
        };
    }

    function _normaliseFormatterConfig(config) {
        return {
            fields: Array.from(new Set((config.fields || []).map(value => String(value).trim()).filter(Boolean))),
            operation: FORMATTER_OPERATION_LABELS[config.operation] ? config.operation : 'upper',
            arguments: String(config.arguments || ''),
            onError: config.onError === 'reject' ? 'reject' : 'null'
        };
    }

    function _syncFormatterSummary(dom, config) {
        const safeConfig = _normaliseFormatterConfig(config);
        const summary = dom?.querySelector('[data-formatter-summary]');
        const operation = dom?.querySelector('[data-formatter-operation]');
        if (summary) summary.textContent = safeConfig.fields.length ? safeConfig.fields.join(', ') : 'Sin campos';
        if (operation) operation.textContent = FORMATTER_OPERATION_LABELS[safeConfig.operation];
    }

    function updateStringFormatterNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_string_formatter') return;
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        _syncFormatterSummary(dom, _readFormatterConfig(dom));
    }

    function _renderMatcherFieldList(dom, fields) {
        const box = dom.querySelector('[df-matcher-fields]');
        const input = dom.querySelector('[df-fields]');
        if (!box || !input) return;

        const selected = new Set(
            (input.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        );

        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div style="font-size:0.7em;color:#777">Sin campos disponibles</div>';
            return;
        }

        fields.forEach((f) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.fontSize = '0.78em';
            row.style.color = '#ddd';
            row.style.marginBottom = '4px';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-matcher-field', f);
            cb.checked = selected.has(f);

            const txt = document.createElement('span');
            txt.textContent = f;

            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateMatcherNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_matcher') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderMatcherFieldList(dom, fields);
    }

    function _renderStatsFieldList(dom, fields) {
        const box = dom.querySelector('[df-stats-fields]');
        const input = dom.querySelector('[df-field]');
        if (!box || !input) return;

        const selected = new Set(
            (input.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        );

        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div style="font-size:0.7em;color:#777">Sin campos disponibles</div>';
            return;
        }

        fields.forEach((f) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.fontSize = '0.78em';
            row.style.color = '#ddd';
            row.style.marginBottom = '4px';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-stats-field', f);
            cb.checked = selected.has(f);

            const txt = document.createElement('span');
            txt.textContent = f;
            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateStatsNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_stats') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderStatsFieldList(dom, fields);
    }

    function _createTestRow(fields, rowState, index) {
        const row = document.createElement('div');
        row.setAttribute('data-test-row', '1');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '64px 1fr 54px 26px';
        row.style.gridTemplateAreas = '"join field op del" "join value value del"';
        row.style.gap = '4px';
        row.style.alignItems = 'center';
        row.style.marginBottom = '4px';

        const join = document.createElement('select');
        join.className = 'node-control';
        join.setAttribute('df-test-join', '');
        join.innerHTML = '<option value="AND">AND</option><option value="OR">OR</option>';
        join.value = index === 0 ? 'AND' : (rowState && rowState.join ? rowState.join : 'AND');
        join.disabled = index === 0;
        join.style.gridArea = 'join';
        join.style.marginBottom = '0';

        const field = document.createElement('select');
        field.className = 'node-control';
        field.setAttribute('df-test-field', '');
        const resolvedFields = Array.isArray(fields) ? [...fields] : [];
        if (rowState && rowState.field && !resolvedFields.includes(rowState.field)) {
            resolvedFields.push(rowState.field);
        }
        _fillSelect(field, resolvedFields, 'Campo');
        if (rowState && rowState.field && resolvedFields.includes(rowState.field)) field.value = rowState.field;
        field.style.gridArea = 'field';
        field.style.marginBottom = '0';
        field.style.minWidth = '0';

        const op = document.createElement('select');
        op.className = 'node-control';
        op.setAttribute('df-test-op', '');
        op.innerHTML = [
            '<option value="==">=</option>',
            '<option value="!=">!=</option>',
            '<option value=">">></option>',
            '<option value=">=">>=</option>',
            '<option value="<"><</option>',
            '<option value="<="><=</option>',
            '<option value="like">like</option>',
            '<option value="starts">starts</option>',
            '<option value="ends">ends</option>',
            '<option value="in">in</option>'
        ].join('');
        op.value = rowState && rowState.op ? rowState.op : '==';
        op.style.gridArea = 'op';
        op.style.marginBottom = '0';

        const val = document.createElement('input');
        val.className = 'node-control';
        val.setAttribute('df-test-val', '');
        val.placeholder = 'valor';
        val.value = rowState && rowState.value ? rowState.value : '';
        val.style.gridArea = 'value';
        val.style.marginBottom = '0';
        val.style.minWidth = '0';

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'node-btn-mini';
        del.setAttribute('data-schema-action', 'test-remove-row');
        del.title = 'Eliminar condicion';
        del.innerHTML = '<i class="fas fa-times"></i>';
        del.disabled = index === 0;
        del.style.gridArea = 'del';

        row.appendChild(join);
        row.appendChild(field);
        row.appendChild(op);
        row.appendChild(val);
        row.appendChild(del);
        return row;
    }

    function _collectTestRows(dom) {
        return Array.from(dom.querySelectorAll('[data-test-row]')).map((row, idx) => ({
            join: idx === 0 ? 'AND' : (row.querySelector('[df-test-join]')?.value || 'AND'),
            field: row.querySelector('[df-test-field]')?.value || '',
            op: row.querySelector('[df-test-op]')?.value || '==',
            value: row.querySelector('[df-test-val]')?.value || ''
        }));
    }

    function _renderTestRows(dom, fields, rowsState) {
        const box = dom.querySelector('[df-test-rows]');
        if (!box) return;
        const states = Array.isArray(rowsState) && rowsState.length ? rowsState : [{ join: 'AND', field: '', op: '==', value: '' }];
        box.innerHTML = '';
        states.forEach((s, idx) => box.appendChild(_createTestRow(fields, s, idx)));
    }

    function updateTesterNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_test') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        const current = _collectTestRows(dom);
        _renderTestRows(dom, fields, current);
    }

    function insertCalcField(nodeId) {
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const sourceSelect = dom.querySelector('[df-source-field]');
        const expr = dom.querySelector('[df-expr]');
        if (!sourceSelect || !expr || !sourceSelect.value) return;

        const token = `props["${sourceSelect.value}"]`;
        const start = typeof expr.selectionStart === 'number' ? expr.selectionStart : expr.value.length;
        const end = typeof expr.selectionEnd === 'number' ? expr.selectionEnd : expr.value.length;
        expr.value = expr.value.slice(0, start) + token + expr.value.slice(end);
        const nextPos = start + token.length;
        expr.focus();
        expr.setSelectionRange(nextPos, nextPos);
    }

    let currentCalcNodeId = null;

    function _commitNodeControl(control, value) {
        if (!control) return;
        control.value = value;
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function openCalcEditor(nodeId) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('calc-editor-modal');
        if (!nodeEl || !modal) return;
        currentCalcNodeId = String(nodeId);
        updateCalcNode(nodeId);

        const source = nodeEl.querySelector('[df-source-field]');
        const modalSource = document.getElementById('calc-editor-source');
        document.getElementById('calc-editor-name').value = nodeEl.querySelector('[df-name]')?.value || 'new_field';
        document.getElementById('calc-editor-expression').value = nodeEl.querySelector('[df-expr]')?.value || '';
        document.getElementById('calc-editor-error').value = nodeEl.querySelector('[df-on-error]')?.value || 'null';
        if (source && modalSource) modalSource.innerHTML = source.innerHTML;
        modal.style.display = 'flex';
    }

    function closeCalcEditor(save) {
        const modal = document.getElementById('calc-editor-modal');
        if (!modal) return;
        if (save && currentCalcNodeId) {
            const nodeEl = document.getElementById('node-' + currentCalcNodeId);
            if (nodeEl) {
                const name = document.getElementById('calc-editor-name').value.trim();
                _commitNodeControl(nodeEl.querySelector('[df-name]'), name || 'new_field');
                _commitNodeControl(nodeEl.querySelector('[df-expr]'), document.getElementById('calc-editor-expression').value);
                _commitNodeControl(nodeEl.querySelector('[df-on-error]'), document.getElementById('calc-editor-error').value);
                const summary = nodeEl.querySelector('[data-calc-summary]');
                if (summary) summary.textContent = name || 'new_field';
            }
        }
        modal.style.display = 'none';
        currentCalcNodeId = null;
    }

    function insertCalcFieldInModal() {
        const source = document.getElementById('calc-editor-source');
        const expression = document.getElementById('calc-editor-expression');
        if (!source?.value || !expression) return;
        const token = `props["${source.value}"]`;
        const start = typeof expression.selectionStart === 'number' ? expression.selectionStart : expression.value.length;
        const end = typeof expression.selectionEnd === 'number' ? expression.selectionEnd : expression.value.length;
        expression.setRangeText(token, start, end, 'end');
        expression.focus();
    }

    let currentFormatterNodeId = null;

    function _renderFormatterModalFields(fields, selectedFields) {
        const box = document.getElementById('formatter-editor-available-fields');
        if (!box) return;
        const selected = new Set(selectedFields);
        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div class="node-editor-empty">Ejecuta el nodo anterior para detectar sus campos, o escríbelos manualmente.</div>';
            return;
        }
        fields.forEach((field) => {
            const row = document.createElement('label');
            row.className = 'node-editor-field-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('data-formatter-modal-field', field);
            checkbox.checked = selected.has(field);
            const label = document.createElement('span');
            label.textContent = field;
            row.append(checkbox, label);
            box.appendChild(row);
        });
    }

    function _formatterAvailableFields(nodeId) {
        const node = _safeGetNode(nodeId).node;
        const parentId = _getParentNodeId(node, 'input_1');
        return _schemaFromNodeData(parentId);
    }

    function _syncFormatterModalChecks() {
        const input = document.getElementById('formatter-editor-fields');
        if (!input) return;
        const selected = new Set(input.value.split(',').map(value => value.trim()).filter(Boolean));
        document.querySelectorAll('[data-formatter-modal-field]').forEach((checkbox) => {
            checkbox.checked = selected.has(checkbox.getAttribute('data-formatter-modal-field'));
        });
    }

    function openFormatterEditor(nodeId) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('formatter-editor-modal');
        if (!nodeEl || !modal) return false;
        const config = _normaliseFormatterConfig(_readFormatterConfig(nodeEl));
        currentFormatterNodeId = String(nodeId);
        document.getElementById('formatter-editor-fields').value = config.fields.join(', ');
        document.getElementById('formatter-editor-operation').value = config.operation;
        document.getElementById('formatter-editor-arguments').value = config.arguments;
        document.getElementById('formatter-editor-error').value = config.onError;
        _renderFormatterModalFields(_formatterAvailableFields(nodeId), config.fields);
        modal.style.display = 'flex';
        return true;
    }

    function closeFormatterEditor(save) {
        const modal = document.getElementById('formatter-editor-modal');
        if (!modal) return;
        if (save && currentFormatterNodeId) {
            const nodeEl = document.getElementById('node-' + currentFormatterNodeId);
            if (nodeEl) {
                const config = _normaliseFormatterConfig({
                    fields: document.getElementById('formatter-editor-fields').value.split(','),
                    operation: document.getElementById('formatter-editor-operation').value,
                    arguments: document.getElementById('formatter-editor-arguments').value,
                    onError: document.getElementById('formatter-editor-error').value
                });
                const configControl = nodeEl.querySelector('[df-config]');
                if (configControl) {
                    _commitNodeControl(configControl, JSON.stringify(config));
                } else {
                    _commitNodeControl(nodeEl.querySelector('[df-field]'), config.fields.join(', '));
                    _commitNodeControl(nodeEl.querySelector('[df-op]'), config.operation);
                    _commitNodeControl(nodeEl.querySelector('[df-args]'), config.arguments);
                    _commitNodeControl(nodeEl.querySelector('[df-on-error]'), config.onError);
                }
                _syncFormatterSummary(nodeEl, config);
            }
        }
        modal.style.display = 'none';
        currentFormatterNodeId = null;
    }

    function updateNode(nodeId) {
        updateJoinNode(nodeId);
        updateCalcNode(nodeId);
        updateSorterNode(nodeId);
        updateRenamerNode(nodeId);
        updateKeeperNode(nodeId);
        updateStringFormatterNode(nodeId);
        updateMatcherNode(nodeId);
        updateStatsNode(nodeId);
        updateTesterNode(nodeId);
    }

    function refreshAll() {
        const ed = _getEditor();
        if (!ed || !ed.export) return;
        const data = ed.export();
        const nodes = data && data.drawflow && data.drawflow.Home && data.drawflow.Home.data
            ? data.drawflow.Home.data
            : {};
        Object.keys(nodes).forEach(updateNode);
    }

    function initDelegation() {
        document.addEventListener('click', (evt) => {
            const btn = evt.target.closest('[data-schema-action]');
            if (!btn) return;

            const nodeEl = btn.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.id) return;
            const nodeId = nodeEl.id.replace('node-', '');

            const action = btn.getAttribute('data-schema-action');
            if (action === 'calc-open-editor') {
                evt.stopPropagation();
                openCalcEditor(nodeId);
            } else if (action === 'formatter-open-editor') {
                evt.stopPropagation();
                openFormatterEditor(nodeId);
            } else if (action === 'join-add') {
                evt.stopPropagation();
                appendJoinPair(nodeId);
            } else if (action === 'renamer-add') {
                evt.stopPropagation();
                appendRenamerPair(nodeId);
            } else if (action === 'calc-insert') {
                evt.stopPropagation();
                insertCalcField(nodeId);
            } else if (action === 'test-add-row') {
                evt.stopPropagation();
                const dom = document.getElementById('node-' + nodeId);
                if (!dom) return;
                const rows = _collectTestRows(dom);
                rows.push({ join: 'AND', field: '', op: '==', value: '' });
                const ed = _getEditor();
                const node = ed ? ed.getNodeFromId(nodeId) : null;
                const p1 = _getParentNodeId(node, 'input_1');
                const fields = _schemaFromNodeData(p1);
                _renderTestRows(dom, fields, rows);
            } else if (action === 'test-remove-row') {
                evt.stopPropagation();
                const row = btn.closest('[data-test-row]');
                if (!row) return;
                const dom = document.getElementById('node-' + nodeId);
                if (!dom) return;
                row.remove();
                const rows = _collectTestRows(dom);
                const ed = _getEditor();
                const node = ed ? ed.getNodeFromId(nodeId) : null;
                const p1 = _getParentNodeId(node, 'input_1');
                const fields = _schemaFromNodeData(p1);
                _renderTestRows(dom, fields, rows);
            }
        });

        document.addEventListener('click', (evt) => {
            const action = evt.target.closest('[data-ui-action]')?.getAttribute('data-ui-action');
            if (action === 'close-calc-editor') closeCalcEditor(false);
            else if (action === 'save-calc-editor') closeCalcEditor(true);
            else if (action === 'calc-editor-insert') insertCalcFieldInModal();
            else if (action === 'close-formatter-editor') closeFormatterEditor(false);
            else if (action === 'save-formatter-editor') closeFormatterEditor(true);
        });

        document.addEventListener('dblclick', (evt) => {
            const nodeEl = evt.target.closest('.drawflow-node');
            if (nodeEl?.classList.contains('attr_calc_pro')) openCalcEditor(nodeEl.id.replace('node-', ''));
            else if (nodeEl?.classList.contains('attr_string_formatter')) openFormatterEditor(nodeEl.id.replace('node-', ''));
        });

        document.addEventListener('change', (evt) => {
            const checkbox = evt.target.closest('[data-formatter-modal-field]');
            if (!checkbox) return;
            const input = document.getElementById('formatter-editor-fields');
            if (!input) return;
            const available = new Set(Array.from(document.querySelectorAll('[data-formatter-modal-field]'))
                .map(element => element.getAttribute('data-formatter-modal-field')));
            const manual = input.value.split(',').map(value => value.trim())
                .filter(value => value && !available.has(value));
            const selected = Array.from(document.querySelectorAll('[data-formatter-modal-field]:checked'))
                .map(element => element.getAttribute('data-formatter-modal-field'));
            input.value = Array.from(new Set([...manual, ...selected])).join(', ');
        });

        document.getElementById('formatter-editor-fields')?.addEventListener('input', _syncFormatterModalChecks);

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-matcher-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-fields]');
            if (!input) return;

            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-matcher-field]:checked')
            ).map(el => el.getAttribute('data-matcher-field')).filter(Boolean);

            input.value = selected.join(', ');
        });

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-stats-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-field]');
            if (!input) return;
            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-stats-field]:checked')
            ).map(el => el.getAttribute('data-stats-field')).filter(Boolean);
            input.value = selected.join(', ');
        });

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-keeper-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-keep]');
            if (!input) return;
            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-keeper-field]:checked')
            ).map(el => el.getAttribute('data-keeper-field')).filter(Boolean);
            input.value = selected.join(', ');
        });

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-formatter-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-field]');
            if (!input) return;
            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-formatter-field]:checked')
            ).map(el => el.getAttribute('data-formatter-field')).filter(Boolean);
            input.value = selected.join(', ');
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-fields]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl) return;
            if (!nodeEl.querySelector('[df-matcher-fields]')) return;

            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-matcher-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-matcher-field'));
            });
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-field]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl) return;
            if (!nodeEl.querySelector('[df-stats-fields]')) return;

            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-stats-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-stats-field'));
            });
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-keep]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.querySelector('[df-keeper-fields]')) return;
            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-keeper-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-keeper-field'));
            });
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-field]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.querySelector('[df-formatter-fields]')) return;
            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-formatter-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-formatter-field'));
            });
        });
    }

    initDelegation();

    window.JETLSchemaUI = {
        updateNode,
        refreshAll,
        appendJoinPair,
        appendRenamerPair,
        insertCalcField,
        openCalcEditor,
        openFormatterEditor
    };
})();

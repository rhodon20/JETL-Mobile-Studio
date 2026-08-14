/* ---- js/schemaUI.js ---- */
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

    function _renderFormatterFieldList(dom, fields) {
        const box = dom.querySelector('[df-formatter-fields]');
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
            cb.setAttribute('data-formatter-field', f);
            cb.checked = selected.has(f);
            const txt = document.createElement('span');
            txt.textContent = f;
            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateStringFormatterNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_string_formatter') return;
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderFormatterFieldList(dom, fields);
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
                nodeEl.querySelector('[df-name]').value = name || 'new_field';
                nodeEl.querySelector('[df-expr]').value = document.getElementById('calc-editor-expression').value;
                nodeEl.querySelector('[df-on-error]').value = document.getElementById('calc-editor-error').value;
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
        });

        document.addEventListener('dblclick', (evt) => {
            const nodeEl = evt.target.closest('.drawflow-node');
            if (!nodeEl?.classList.contains('attr_calc_pro')) return;
            openCalcEditor(nodeEl.id.replace('node-', ''));
        });

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
        insertCalcField
    };
})();


/* ---- js/core/workerPool.js ---- */
let geoWorker = null;
let geoWorkerPool = null;
let geoWorkerPrewarmPromise = null;

function buildCancelledError(message) {
    const err = new Error(message || 'Operacion cancelada por el usuario');
    err.name = 'CancelledError';
    err.cancelled = true;
    return err;
}

class GeoWorkerPool {
    constructor(url, size) {
        this.url = url;
        this.size = size;
        this.workers = [];
        this.queue = [];
        this.pending = new Map();
        this._init();
    }

    _createWorker() {
        const w = new Worker(this.url);
        w._busy = false;
        w._currentTaskId = null;
        w.onmessage = (e) => this._onMessage(w, e);
        w.onerror = (e) => {
            console.error("âš ï¸ Error en GeoWorker:", e.message, "en", e.filename);
        };
        return w;
    }

    _replaceWorker(oldWorker) {
        const idx = this.workers.indexOf(oldWorker);
        if (idx === -1) return;
        try { oldWorker.terminate(); } catch (e) {}
        const fresh = this._createWorker();
        this.workers[idx] = fresh;
        if (idx === 0) geoWorker = fresh;
    }

    _init() {
        for (let i = 0; i < this.size; i++) {
            this.workers.push(this._createWorker());
        }
        geoWorker = this.workers[0] || null;
        console.log(`ðŸš€ Worker Pool iniciado (${this.workers.length})`);
    }

    _onMessage(worker, e) {
        const d = e.data || {};
        const taskId = d.taskId;
        if (!taskId || !this.pending.has(taskId)) return;
        const job = this.pending.get(taskId);
        this.pending.delete(taskId);
        clearTimeout(job.timer);
        worker._busy = false;
        worker._currentTaskId = null;
        if (d.status === 'ok' || d.status === 'partial') job.resolve(d);
        else job.reject(new Error(d.message || 'Worker error'));
        this._drain();
    }

    _drain() {
        const free = this.workers.find((w) => !w._busy);
        if (!free) return;
        const job = this.queue.shift();
        if (!job) return;
        free._busy = true;
        free._currentTaskId = job.taskId;
        job.worker = free;
        this.pending.set(job.taskId, job);
        try {
            free.postMessage(job.payload, job.transfer || []);
        } catch (e) {
            free._busy = false;
            free._currentTaskId = null;
            this.pending.delete(job.taskId);
            job.reject(e);
            this._drain();
        }
    }

    post(payload, timeoutMs = 30000, transfer = null) {
        return new Promise((resolve, reject) => {
            const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            payload.taskId = taskId;
            const job = {
                taskId,
                payload,
                transfer,
                resolve,
                reject,
                worker: null,
                timer: setTimeout(() => {
                    if (!this.pending.has(taskId)) return;
                    const current = this.pending.get(taskId);
                    this.pending.delete(taskId);
                    if (current && current.worker) {
                        current.worker._busy = false;
                        current.worker._currentTaskId = null;
                        this._replaceWorker(current.worker);
                    }
                    reject(new Error('Worker timeout'));
                    this._drain();
                }, timeoutMs)
            };
            this.queue.push(job);
            this._drain();
        });
    }

    cancelAll(reason = 'Operacion cancelada por el usuario') {
        while (this.queue.length) {
            const job = this.queue.shift();
            if (!job) continue;
            clearTimeout(job.timer);
            job.reject(buildCancelledError(reason));
        }

        for (const [taskId, job] of this.pending.entries()) {
            clearTimeout(job.timer);
            this.pending.delete(taskId);
            if (job.worker) {
                job.worker._busy = false;
                job.worker._currentTaskId = null;
                this._replaceWorker(job.worker);
            }
            job.reject(buildCancelledError(reason));
        }

        this._drain();
    }

    getLoad() {
        return { pending: this.pending.size, queued: this.queue.length };
    }
}

function createGeoWorker() {
    if (geoWorkerPool) return;
    try {
        const hc = navigator.hardwareConcurrency || 4;
        const size = Math.max(2, Math.min(hc - 1, 6));
        geoWorkerPool = new GeoWorkerPool('js/geo.worker.js', size);
        window.geoWorker = geoWorker;
        window.geoWorkerPool = geoWorkerPool;
    } catch (e) {
        console.warn('Worker pool init failed:', e);
        geoWorkerPool = null;
    }
}

function postWorkerTask(payload, timeoutMs = 30000, transfer = null) {
    return new Promise((resolve, reject) => {
        if (!geoWorkerPool) return reject(new Error('No worker pool'));
        if (window.isEngineCancelled) return reject(buildCancelledError());
        geoWorkerPool.post(payload, timeoutMs, transfer).then(resolve).catch(reject);
        const load = geoWorkerPool.getLoad();
        const loaderMsg = document.getElementById('loader-msg');
        if (loaderMsg) loaderMsg.innerText = `Procesando (${load.pending} en curso / ${load.queued} en cola)...`;
    });
}

function cancelWorkerTasks(reason) {
    if (!geoWorkerPool) return;
    geoWorkerPool.cancelAll(reason || 'Operacion cancelada por el usuario');
}

window.cancelWorkerTasks = cancelWorkerTasks;

function resetGeoWorkerPool(reason = 'Worker pool reset') {
    try {
        if (geoWorkerPool) {
            try { geoWorkerPool.cancelAll(reason); } catch (e) {}
            try {
                const ws = Array.isArray(geoWorkerPool.workers) ? geoWorkerPool.workers : [];
                ws.forEach((w) => { try { w.terminate(); } catch (e) {} });
            } catch (e) {}
        }
    } finally {
        geoWorkerPool = null;
        geoWorker = null;
        window.geoWorker = null;
        window.geoWorkerPool = null;
    }
    createGeoWorker();
}

window.resetGeoWorkerPool = resetGeoWorkerPool;

function prewarmGeoWorker(timeoutMs = 15000) {
    if (geoWorkerPrewarmPromise) return geoWorkerPrewarmPromise;
    geoWorkerPrewarmPromise = new Promise((resolve) => {
        try {
            createGeoWorker();
            const done = (ok) => {
                resolve(!!ok);
                geoWorkerPrewarmPromise = null;
            };
            if (!geoWorkerPool) return done(false);
            const prevCancelled = !!window.isEngineCancelled;
            window.isEngineCancelled = false;
            geoWorkerPool.post({ task: 'worker_health' }, timeoutMs).then(() => {
                window.isEngineCancelled = prevCancelled;
                done(true);
            }).catch(() => {
                window.isEngineCancelled = prevCancelled;
                done(false);
            });
        } catch (e) {
            resolve(false);
            geoWorkerPrewarmPromise = null;
        }
    });
    return geoWorkerPrewarmPromise;
}

window.prewarmGeoWorker = prewarmGeoWorker;

if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            try { prewarmGeoWorker(12000); } catch (e) {}
        }, 250);
    });
}


/* ---- js/state/history.js ---- */
const historyStack = [];
let historyIndex = -1;
let isUndoRedoAction = false;
let historyShadowState = null;

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


/* ---- js/engine.js ---- */
// =============================================
// 3. ENGINE & EVENTS
// =============================================
let editor, map, mapLayers = {}, executionData = {};
window.executionData = executionData;
window.lastRunReport = null;
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

function ensureRuntimeCaches() {
    if (!window._file_cache) window._file_cache = {};
    if (!window._tiff_cache) window._tiff_cache = {};
    if (!window._node_tiff_ref) window._node_tiff_ref = {};
}

function clearNodeRuntimeCaches(nodeId) {
    if (!nodeId) return;
    ensureRuntimeCaches();
    delete window._file_cache['file_' + nodeId];
    const tiffRef = window._node_tiff_ref[nodeId];
    if (tiffRef) {
        delete window._tiff_cache[tiffRef];
        delete window._node_tiff_ref[nodeId];
    }
}

function clearAllRuntimeCaches() {
    window._file_cache = {};
    window._tiff_cache = {};
    window._node_tiff_ref = {};
}

window.JETLRuntimeCache = {
    ensure: ensureRuntimeCaches,
    clearNode: clearNodeRuntimeCaches,
    clearAll: clearAllRuntimeCaches
};

function normalizeResult(res) {
    if (!res) return null;
    if (res.type === 'Feature') return turf.featureCollection([res]);
    if (res.type === 'FeatureCollection') return res;
    if (Array.isArray(res) && res.length && res[0].type) return turf.featureCollection(res);
    const keys = Object.keys(res || {});
    if (keys.some(k => k && k.startsWith && k.startsWith('output_'))) return res;
    if (res && res.geometry) return turf.featureCollection([turf.feature(res.geometry, res.properties || {})]);
    return res;
}

function resolvePort(parentRes, parentPort) {
    if (!parentRes) return null;
    if (parentRes.type === 'FeatureCollection' || parentRes.type === 'Feature') return normalizeResult(parentRes);
    if (typeof parentRes === 'object') {
        if (parentPort && parentRes[parentPort]) return normalizeResult(parentRes[parentPort]);
        if (parentRes.output_1) return normalizeResult(parentRes.output_1);
        if (parentRes.output) return normalizeResult(parentRes.output);
    }
    return null;
}

// WORKER SETUP (POOL) is now handled via js/core/workerPool.js


let jetlAppInitialized = false;

function setJETLStartupStatus(state, message) {
    const dot = document.getElementById('sys-status');
    if (!dot) return;
    const colors = { loading: '#f1c40f', ready: '#2ecc71', error: '#e74c3c' };
    dot.style.background = colors[state] || colors.loading;
    dot.title = message || 'JETL Studio';
    dot.setAttribute('aria-label', message || 'JETL Studio');
}

function ensureJETLMap() {
    if (map) return map;
    const mapElement = document.getElementById('map');
    if (!mapElement) throw new Error('No se encontró el contenedor del mapa');
    if (typeof L === 'undefined') throw new Error('Leaflet no está disponible');

    map = L.map(mapElement, { renderer: L.canvas() }).setView([40.416, -3.703], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM contributors'
    }).addTo(map);
    layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
    return map;
}
window.ensureJETLMap = ensureJETLMap;

function initializeJETLApp() {
    if (jetlAppInitialized) return;
    if (window.__JETL_BOOT) window.__JETL_BOOT.stage = 'initializing-editor';
    jetlAppInitialized = true;
    setJETLStartupStatus('loading', 'Iniciando JETL Studio');

    try {
        // El catálogo es independiente del mapa y debe estar disponible de inmediato.
        renderSidebar('');

        if (typeof Drawflow === 'undefined') throw new Error('Drawflow no está disponible');
        const drawflowElement = document.getElementById('drawflow');
        if (!drawflowElement) throw new Error('No se encontró el lienzo de flujo');

    try {
        const originalValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        Object.defineProperty(HTMLInputElement.prototype, 'value', {
            set: function (val) {
                if (this.type === 'file' && val !== "") return;
                originalValueSetter.call(this, val);
            }
        });
    } catch (e) { console.warn("No se pudo aplicar el parche de input file", e); }

    editor = new Drawflow(drawflowElement);
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.start();

    const saved = SafeStorage.load('jetl_flow_optimized');
    if (saved) {
        try { editor.import(JSON.parse(saved)); } catch (e) { console.error("Error importando flujo guardado:", e); }
    }

    ['nodeCreated', 'nodeRemoved', 'connectionCreated', 'connectionRemoved'].forEach(ev => {
        editor.on(ev, (payload) => {
            if (ev === 'nodeRemoved') {
                const removedId = String(payload);
                clearNodeRuntimeCaches(removedId);
                delete executionData[removedId];
                clearNodeDirty(removedId);
                invalidateAllNodes('node_removed');
                if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts(removedId);
            } else if (ev === 'nodeCreated') {
                invalidateNodeAndDownstream(String(payload), 'node_created');
            } else if (ev === 'connectionCreated' || ev === 'connectionRemoved') {
                const srcId = payload && payload.output_id ? String(payload.output_id) : null;
                const dstId = payload && payload.input_id ? String(payload.input_id) : null;
                if (srcId) invalidateNodeAndDownstream(srcId, ev);
                if (dstId) invalidateNodeAndDownstream(dstId, ev);
                if (!srcId && !dstId) invalidateAllNodes(ev);
            }
            SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => JETLSchemaUI.refreshAll(), 0);
            }
        });
    });
    editor.on('nodeDataChanged', (nodeId) => {
        invalidateNodeAndDownstream(String(nodeId), 'node_data_changed');
    });

    editor.on('click', (e) => {
        const el = e.target.closest('.drawflow-node');
        if (el) {
            const id = el.id.replace('node-', '');
            currentNodeId = id;
            document.querySelectorAll('.drawflow-node').forEach(n => n.classList.remove('selected'));
            el.classList.add('selected');
            if (executionData[id] && executionData[id].data) {
                if (typeof selectedRowSet !== 'undefined') selectedRowSet.clear();
                buildTable(executionData[id].data);
            }
        } else {
            document.querySelectorAll('.drawflow-node').forEach(n => n.classList.remove('selected'));
            currentNodeId = null;
        }
    });

    createGeoWorker();
    initQuickSearch();

    // --- CORRECCIÓN: Inicialización de Módulos Faltantes ---
    initHistory();
    initContextMenu();
    initEngineDelegation();

    const filterInput = document.getElementById('table-filter');
    if (filterInput) {
        filterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyTableFilter();
        });
    }
    if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
        setTimeout(() => JETLSchemaUI.refreshAll(), 0);
    }
    setJETLStartupStatus('ready', 'Sistema listo');
    if (window.__JETL_BOOT) window.__JETL_BOOT.stage = 'ready';
    const bootDiagnostic = document.getElementById('boot-diagnostic');
    if (bootDiagnostic) bootDiagnostic.remove();
    } catch (error) {
        jetlAppInitialized = false;
        const errorMessage = error && error.message ? error.message : String(error || 'Error desconocido');
        setJETLStartupStatus('error', `Error de inicio: ${errorMessage}`);
        if (window.__JETL_BOOT) {
            window.__JETL_BOOT.stage = 'error';
            window.__JETL_BOOT.error = errorMessage;
        }
        const bootDiagnostic = document.getElementById('boot-diagnostic');
        if (bootDiagnostic) {
            bootDiagnostic.textContent = `No se pudo iniciar JETL Studio: ${errorMessage}`;
            bootDiagnostic.style.color = '#ff8a80';
        }
        console.error('[JETL] Error durante la inicialización', error);
        if (typeof window.showToast === 'function') {
            window.showToast(`No se pudo iniciar JETL Studio: ${errorMessage}`, 'error');
        }
    }
}

// Los scripts de arranque se sirven con `defer`. Durante su ejecución el
// documento ya puede estar en `interactive`, aunque DOMContentLoaded todavía
// no se haya emitido y queden módulos posteriores por ejecutar.
if (document.readyState === 'loading' || document.readyState === 'interactive') {
    document.addEventListener('DOMContentLoaded', initializeJETLApp, { once: true });
} else {
    queueMicrotask(initializeJETLApp);
}

// Permite reintentar el arranque si una dependencia esencial llegó tarde.
window.addEventListener('load', () => {
    if (!jetlAppInitialized) initializeJETLApp();
}, { once: true });

function renderSidebar(filter) {
    const container = document.getElementById('sidebar-content');
    container.innerHTML = '';
    const cats = {};
    Object.entries(TOOL_REGISTRY).forEach(([k, tool]) => {
        if (filter && !tool.label.toLowerCase().includes(filter.toLowerCase())) return;
        if (!cats[tool.cat]) cats[tool.cat] = [];
        cats[tool.cat].push({ k, ...tool });
    });

    const sortedCats = Object.keys(cats).sort();

    sortedCats.forEach(c => {
        const group = document.createElement('div');
        group.className = 'cat-group';

        const title = document.createElement('div');
        title.className = 'cat-title';
        title.setAttribute('data-cat-toggle', '1');
        title.innerHTML = `<span>${c}</span> <i class="fas fa-chevron-down"></i>`;

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'cat-items';

        if (filter && filter.length > 0) {
            itemsDiv.classList.add('open');
            title.classList.add('active');
        }

        cats[c].forEach(t => {
            itemsDiv.innerHTML += `<div class="node-item" draggable="true" data-k="${t.k}">
                <i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label}
            </div>`;
        });

        group.appendChild(title);
        group.appendChild(itemsDiv);
        container.appendChild(group);
    });
}
function filterTools(val) { renderSidebar(val); }

let qsMousePos = { x: 0, y: 0 };

function initQuickSearch() {
    const qs = document.getElementById('quick-search');
    const input = document.getElementById('qs-input');
    const results = document.getElementById('qs-results');
    const workspace = document.getElementById('workspace');

    workspace.addEventListener('mousemove', (e) => {
        if (qs.style.display !== 'block') {
            qsMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
            if (qs.style.display !== 'block') {
                qs.style.top = Math.min(qsMousePos.y, window.innerHeight - 300) + 'px';
                qs.style.left = Math.min(qsMousePos.x, window.innerWidth - 300) + 'px';
                qs.style.display = 'block';
                anime({ targets: qs, opacity: [0, 1], scale: [0.8, 1], duration: 200, easing: 'easeOutQuad' });
                input.value = '';
                input.focus();
            }
        }
        if (e.key === 'Escape') closeQS();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const sel = results.querySelector('.selected');
            if (sel) { addNode(sel.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top)); closeQS(); }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const current = results.querySelector('.selected');
            const items = Array.from(results.querySelectorAll('.qs-item'));
            let idx = items.indexOf(current);
            if (idx === -1 && items.length > 0) idx = 0;
            else if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
            else idx = Math.max(idx - 1, 0);
            items.forEach(i => i.classList.remove('selected'));
            if (items[idx]) { items[idx].classList.add('selected'); items[idx].scrollIntoView({ block: 'nearest' }); }
        }
    });

    input.addEventListener('keyup', (e) => {
        if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
        const val = input.value.toLowerCase();
        results.innerHTML = '';
        const matches = Object.entries(TOOL_REGISTRY).filter(([k, t]) => t.label.toLowerCase().includes(val) || t.cat.toLowerCase().includes(val));

        matches.slice(0, 10).forEach(([k, t], i) => {
            const item = document.createElement('div');
            item.className = 'qs-item' + (i === 0 ? ' selected' : '');
            item.dataset.k = k;
            item.innerHTML = `<i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label} <span style="font-size:0.7em;opacity:0.5;margin-left:auto">${t.cat}</span>`;
            results.appendChild(item);
        });

        anime({ targets: '.qs-item', opacity: [0, 1], translateX: [10, 0], delay: anime.stagger(30), duration: 300, easing: 'easeOutQuad' });
    });

    function closeQS() {
        anime({ targets: qs, opacity: 0, scale: 0.9, duration: 150, easing: 'easeInQuad', complete: () => { qs.style.display = 'none'; input.value = ''; document.activeElement.blur(); } });
    }

    document.addEventListener('click', (e) => { if (qs.style.display === 'block' && !qs.contains(e.target)) closeQS(); });
    results.addEventListener('click', (e) => {
        const item = e.target.closest('.qs-item');
        if (!item) return;
        addNode(item.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top));
        closeQS();
    });
}

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

function buildRunReport(label, status, errorMessage) {
    const exportData = (editor && typeof editor.export === 'function')
        ? (((editor.export() || {}).drawflow || {}).Home || {}).data || {}
        : {};
    const entries = Object.entries(executionData || {});
    const nodes = entries.map(([id, meta]) => {
        const node = exportData[id];
        const nodeName = node ? node.name : '';
        const tool = nodeName && window.TOOL_REGISTRY ? window.TOOL_REGISTRY[nodeName] : null;
        return {
            id: String(id),
            node: nodeName || 'unknown',
            label: tool ? tool.label : nodeName || 'unknown',
            ms: (meta && meta._ms) || 0,
            count: countFeaturesFromResult(meta ? meta.data : null),
            outputs: countOutputsFromResult(meta ? meta.data : null),
            cached: !!(meta && meta._runId !== currentRunTimestamp)
        };
    }).sort((a, b) => b.ms - a.ms);

    const totalMs = nodes.reduce((acc, n) => acc + (n.ms || 0), 0);
    const totalFeatures = nodes.reduce((acc, n) => acc + (n.count || 0), 0);
    return {
        version: '1.0',
        generated_at: new Date().toISOString(),
        run_id: currentRunTimestamp || Date.now(),
        label: label || 'Run',
        status: status || 'ok',
        error: errorMessage || null,
        summary: {
            nodes: nodes.length,
            total_ms: totalMs,
            total_features: totalFeatures
        },
        nodes
    };
}

function downloadRunReport(format = 'json') {
    const report = window.lastRunReport || buildRunReport('Manual', 'unknown', null);
    if (!report) {
        if (typeof showToast === 'function') showToast('Sin run report disponible', 'warn');
        return;
    }
    let content = '';
    let mime = 'application/json';
    let filename = `run_report_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    if (format === 'csv') {
        mime = 'text/csv';
        filename = filename.replace(/\.json$/, '.csv');
        const head = 'id,node,label,ms,count,output_1,output_2,output_3,cached';
        const rows = (report.nodes || []).map(n => [
            n.id,
            `"${String(n.node || '').replace(/"/g, '""')}"`,
            `"${String(n.label || '').replace(/"/g, '""')}"`,
            n.ms || 0,
            n.count || 0,
            (n.outputs && n.outputs.output_1) || 0,
            (n.outputs && n.outputs.output_2) || 0,
            (n.outputs && n.outputs.output_3) || 0,
            n.cached ? 'true' : 'false'
        ].join(','));
        content = [head, ...rows].join('\n');
    } else {
        content = JSON.stringify(report, null, 2);
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast(`Run report exportado (${format.toUpperCase()})`, 'success');
}

window.JETLRunReport = {
    build: buildRunReport,
    export: downloadRunReport
};

function drag(e) { e.dataTransfer.setData("node", e.target.dataset.k); }
function drop(e) { e.preventDefault(); const k = e.dataTransfer.getData("node"); if (k) addNode(k, e.clientX, e.clientY); }
function allowDrop(e) { e.preventDefault(); }

function addNodeClick(k) {
    const rect = document.getElementById('drawflow').getBoundingClientRect();
    addNode(k, rect.width / 2 + rect.left, rect.height / 2 + rect.top);
    if (window.innerWidth < 768) toggleSidebar();
}

function addNode(k, x, y) {
    const t = TOOL_REGISTRY[k];
    let pos = { x: 100, y: 100 };
    if (x && y) {
        // Cálculo de posición corregido por zoom
        pos.x = x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) - (editor.precanvas.getBoundingClientRect().x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
        pos.y = y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) - (editor.precanvas.getBoundingClientRect().y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));
    }

    const isJunc = k === 'util_junction';
    const helpIcon = t.help ? `<i class="fas fa-circle-info node-help" title="${t.help}"></i>` : '';
    const html = isJunc ? `<div class="junction-point"></div>` :
        `<div class="node-head" style="border-bottom:3px solid ${t.color}">
            <div style="display:flex;align-items:center;">
                <span class="count-badge node-badge-count">0</span>
                <span><i class="fas ${t.icon}"></i> ${t.label}</span>
                <span class="time-badge node-badge-time"></span>
            </div>
            <div class="node-actions">
                ${helpIcon}
                <i class="fas fa-play-circle node-btn node-action" data-node-action="run" title="Ejecutar hasta aqui"></i>
                <i class="fas fa-eye node-btn eye-btn node-action" data-node-action="view" title="Ver en Mapa"></i>
                <i class="fas fa-times node-action" data-node-action="delete" style="cursor:pointer;opacity:0.6;margin-left:4px" title="Eliminar nodo"></i>
            </div>
        </div>
        <div class="node-body">${t.tpl ? t.tpl() : ''}</div>`;

    // Crear nodo. Drawflow guarda 'html' en memoria tal cual se envía.
    const id = editor.addNode(k, t.in, t.out, pos.x, pos.y, isJunc ? 'junction' : '', {}, html);

    // 1. ACTUALIZACIÓN VISUAL (DOM)
    const el = document.getElementById('node-' + id);
    if (el) {
        anim_NodeEnter(el);
    }
    if (window.JETLSchemaUI && typeof JETLSchemaUI.updateNode === 'function') {
        setTimeout(() => JETLSchemaUI.updateNode(id), 0);
    }
    return id;
}

function initEngineDelegation() {
    document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');

        if (action === 'cancel-run') cancelEngineRun();
        else if (action === 'toggle-sidebar') toggleSidebar();
        else if (action === 'undo' && typeof undo === 'function') undo();
        else if (action === 'redo' && typeof redo === 'function') redo();
        else if (action === 'clear-canvas') clearCanvas();
        else if (action === 'save-project') saveProject();
        else if (action === 'open-project') {
            const upload = document.getElementById('upload-jetl');
            if (upload) upload.click();
        }
        else if (action === 'export-run-report') downloadRunReport('json');
        else if (action === 'export-run-report-csv') downloadRunReport('csv');
        else if (action === 'open-templates' && typeof openTemplatesModal === 'function') openTemplatesModal();
        else if (action === 'apply-template-demo' && typeof applyTemplate === 'function') applyTemplate('demo');
        else if (action === 'zoom-all') zoomToAllLayers();
        else if (action === 'tab-map') switchTab('map', e);
        else if (action === 'tab-table') switchTab('table', e);
        else if (action === 'tab-logs') switchTab('logs', e);
        else if (action === 'toggle-map-expand' && typeof toggleMapPanelExpand === 'function') toggleMapPanelExpand();
        else if (action === 'toggle-panel') togglePanelHeight();
        else if (action === 'apply-symbology') applySymbology();
        else if (action === 'toggle-symbology') toggleSymbologyPanel();
        else if (action === 'ctx-run') ctxAction('run');
        else if (action === 'ctx-view') ctxAction('view');
        else if (action === 'ctx-delete') ctxAction('delete');
        else if (action === 'close-templates' && typeof closeTemplatesModal === 'function') closeTemplatesModal();
    });

    const sidebarFilterInput = document.getElementById('sidebar-filter-input');
    if (sidebarFilterInput) {
        sidebarFilterInput.addEventListener('input', (e) => {
            filterTools(e.target.value || '');
        });
    }

    const uploadJetl = document.getElementById('upload-jetl');
    if (uploadJetl) {
        uploadJetl.addEventListener('change', () => loadProject(uploadJetl));
    }

    const sidebar = document.getElementById('sidebar-content');
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const catTitle = e.target.closest('.cat-title[data-cat-toggle]');
            if (catTitle) {
                const itemsDiv = catTitle.nextElementSibling;
                if (itemsDiv && itemsDiv.classList.contains('cat-items')) {
                    itemsDiv.classList.toggle('open');
                    catTitle.classList.toggle('active');
                }
                return;
            }

            const item = e.target.closest('.node-item');
            if (!item) return;
            const k = item.dataset.k;
            if (k) addNodeClick(k);
        });

        sidebar.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.node-item');
            if (!item || !e.dataTransfer) return;
            e.dataTransfer.setData("node", item.dataset.k || '');
        });
    }

    const drawflowEl = document.getElementById('drawflow');
    if (drawflowEl) {
        drawflowEl.addEventListener('dragover', allowDrop);
        drawflowEl.addEventListener('drop', drop);

        drawflowEl.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-node-action]');
            if (!actionEl) return;
            e.stopPropagation();

            const nodeEl = actionEl.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.id) return;
            const nodeId = nodeEl.id.replace('node-', '');
            const action = actionEl.getAttribute('data-node-action');

            if (action === 'run') runEnginePartial(nodeId);
            else if (action === 'view') showOnMap(nodeId, null, true);
            else if (action === 'delete') editor.removeNodeId(nodeEl.id);
        });

        drawflowEl.addEventListener('change', (e) => {
            const fileInput = e.target.closest('input[type="file"][data-load-file]');
            if (fileInput) {
                loadFile(fileInput);
                return;
            }

            const modeSelect = e.target.closest('select[df-mode]');
            if (!modeSelect) return;
            const parent = modeSelect.parentElement;
            const bandsInput = parent ? parent.querySelector('[df-bands]') : null;
            if (bandsInput) bandsInput.style.display = modeSelect.value === 'select' ? 'block' : 'none';
        });
    }
}

async function runEngine() {
    window.isEngineCancelled = false;
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';
    log("--- INICIANDO EJECUCIÓN TOTAL ---");

    currentRunTimestamp = Date.now();

    document.querySelectorAll('.count-badge').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.eye-btn').forEach(b => b.classList.remove('active'));

    await new Promise(r => setTimeout(r, 50));

    const exportData = editor.export().drawflow.Home.data;
    const nodes = Object.values(exportData);
    const roots = nodes.filter(n => TOOL_REGISTRY[n.name].in === 0);

    if (roots.length === 0) { log("Error: Añade un Reader", "err"); loader.style.display = 'none'; if (cancelBtn) cancelBtn.style.display = 'none'; return; }

    try {
        for (const r of roots) await processNode(r.id, exportData);
        if (window.isEngineCancelled) throw new Error("Ejecución cancelada por el usuario.");
        log("--- FIN EXITOSO ---");
        if (typeof logRunSummary === 'function') logRunSummary('Ejecución Total');
        window.lastRunReport = buildRunReport('Ejecución Total', 'ok', null);
        showToast("Proceso completado", "success");
        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            window.lastRunReport = buildRunReport('Ejecución Total', 'cancelled', null);
            log("Ejecución cancelada por el usuario.", "warn");
            showToast("Ejecución cancelada", "warning");
        } else {
            window.lastRunReport = buildRunReport('Ejecución Total', 'error', e && e.message ? e.message : String(e));
            log("FATAL: " + e.message, "err");
            showToast("Error en ejecución", "error");
        }
    }
    loader.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function cancelEngineRun() {
    window.isEngineCancelled = true;
    if (typeof window.cancelWorkerTasks === 'function') {
        window.cancelWorkerTasks('Operacion cancelada por el usuario');
    }
    showToast("Cancelando operación... Por favor espera", "warning");
    const loaderMsg = document.getElementById('loader-msg');
    if (loaderMsg) loaderMsg.innerText = "Deteniendo...";
    const cancelBtn = document.getElementById('loader-cancel');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function runEnginePartial(targetId) {
    window.isEngineCancelled = false;
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';

    log(`--- Ejecución Parcial hasta nodo #${targetId} ---`);

    currentRunTimestamp = Date.now();

    try {
        const exportData = editor.export().drawflow.Home.data;
        // --- CORRECCIÓN: Validación de integridad tras Carga ---
        if (!exportData[targetId]) {
            throw new Error(`El nodo #${targetId} no existe en memoria. Intenta recargar la página.`);
        }

        await processNode(targetId, exportData);
        if (window.isEngineCancelled) throw new Error("Ejecución parcial cancelada.");

        log("--- Parcial Completado ---");
        if (typeof logRunSummary === 'function') logRunSummary(`Parcial #${targetId}`);
        window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'ok', null);
        showToast("Nodo actualizado", "success");

        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();

        if (executionData[targetId] && executionData[targetId].data) {
            const res = executionData[targetId].data;
            if (TOOL_REGISTRY[editor.getNodeFromId(targetId).name].out !== 0) {
                showOnMap(targetId);
                currentNodeId = String(targetId);
                if (typeof window.resolveNodeDisplayData === 'function') {
                    const info = window.resolveNodeDisplayData(String(targetId));
                    buildTable(info && info.data ? info.data : res);
                } else {
                    buildTable(res);
                }
            }
        }

    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'cancelled', null);
            log("Ejecución parcial cancelada por el usuario.", "warn");
            showToast("Ejecución parcial cancelada", "warning");
        } else {
            window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'error', e && e.message ? e.message : String(e));
            log("Error Parcial: " + e.message, "err");
            showToast("Error en ejecución parcial", "error");
        }
    }
    loader.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function saveProject() {
    const exportData = editor.export();
    const project = {
        version: "2026.03.05",
        timestamp: Date.now(),
        flow: exportData
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flujo_jetl_${new Date().toISOString().slice(0, 10)}.jetl`;
    a.click();
    showToast("Proyecto guardado correctamente", "success");
}

function loadProject(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            const flowData = json.flow ? json.flow : json;

            // No se requiere auto-reparación de HTML porque los nodos ahora usan delegación
            // y no incrustan su propio ID en el template.

            // Limpieza profunda (igual que antes)
            editor.clear();
            clearAllRuntimeCaches();
            executionData = {};
            window.executionData = executionData;
            clearAllDirty();
            invalidateAllNodes('project_loaded');
            if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts();
            currentRunTimestamp = 0;
            if (typeof selectedRowSet !== 'undefined') selectedRowSet.clear();
            if (typeof symbologyByNode !== 'undefined') symbologyByNode = {};
            if (typeof currentSymbologyNode !== 'undefined') currentSymbologyNode = null;

            Object.values(mapLayers).forEach(l => {
                map.removeLayer(l);
                if (layerControl) layerControl.removeLayer(l);
            });
            mapLayers = {};

            if (layerControl) {
                map.removeControl(layerControl);
                layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
            }

            // Importamos los datos ya saneados
            editor.import(flowData);

            SafeStorage.save('jetl_flow_optimized', JSON.stringify(flowData));
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
            showToast("Proyecto cargado y reparado", "success");
        } catch (err) {
            console.error(err);
            showToast("Error al leer el archivo .jetl", "error");
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// History logic (undo/redo) moved to js/state/history.js

let ctxNodeId = null;

function initContextMenu() {
    const menu = document.getElementById('ctx-menu');
    const drawflowEl = document.getElementById('drawflow');

    drawflowEl.addEventListener('contextmenu', (e) => {
        const node = e.target.closest('.drawflow-node');
        if (node) {
            e.preventDefault();
            ctxNodeId = node.id.replace('node-', '');
            menu.style.top = e.clientY + 'px';
            menu.style.left = e.clientX + 'px';
            menu.style.display = 'block';
        } else {
            menu.style.display = 'none';
        }
    });
    document.addEventListener('click', () => menu.style.display = 'none');
}

function ctxAction(action) {
    if (!ctxNodeId) return;
    if (action === 'delete') {
        editor.removeNodeId('node-' + ctxNodeId);
    } else if (action === 'run') {
        runEnginePartial(ctxNodeId);
    } else if (action === 'view') {
        showOnMap(ctxNodeId, null, true);
    }
    document.getElementById('ctx-menu').style.display = 'none';
}

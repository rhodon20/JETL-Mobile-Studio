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
        _syncKeeperSummary(dom, _readKeeperFields(dom));
    }

    function _parseFieldList(value) {
        return Array.from(new Set(String(value || '').split(/[,;\n]/).map((field) => field.trim()).filter(Boolean)));
    }

    function _readKeeperFields(nodeEl) {
        let fields = [];
        try { fields = JSON.parse(nodeEl?.querySelector('[df-ak-fields]')?.value || '[]'); } catch (e) { fields = []; }
        if (!Array.isArray(fields) || !fields.length) fields = _parseFieldList(nodeEl?.querySelector('[df-keep]')?.value || '');
        return Array.from(new Set(fields.map((field) => String(field || '').trim()).filter(Boolean)));
    }

    function _syncKeeperSummary(nodeEl, fields) {
        const count = Array.isArray(fields) ? fields.length : 0;
        const summary = nodeEl?.querySelector('[data-ak-count]');
        if (summary) summary.textContent = `${count} ${count === 1 ? 'campo' : 'campos'}`;
    }

    let currentKeeperEditor = null;

    function _keeperModalFields() {
        return Array.from(document.querySelectorAll('#keeper-editor-fields [data-keeper-editor-field]:checked')).map((input) => input.value);
    }

    function _syncKeeperEditorCount() {
        const fields = new Set([..._keeperModalFields(), ..._parseFieldList(document.getElementById('keeper-editor-manual')?.value)]);
        const count = fields.size;
        const label = document.getElementById('keeper-editor-count');
        if (label) label.textContent = `${count} ${count === 1 ? 'seleccionado' : 'seleccionados'}`;
    }

    function openKeeperEditor(nodeId) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('keeper-editor-modal');
        const node = _safeGetNode(nodeId).node;
        if (!nodeEl || !modal || node?.name !== 'attr_keeper') return false;
        const selected = _readKeeperFields(nodeEl);
        const detected = _schemaFromNodeData(_getParentNodeId(node, 'input_1'));
        const detectedSet = new Set(detected);
        const fieldsBox = document.getElementById('keeper-editor-fields');
        fieldsBox.innerHTML = '';
        if (!detected.length) fieldsBox.innerHTML = '<div class="reader-editor-empty">Ejecuta el nodo anterior para detectar campos. También puedes escribirlos manualmente.</div>';
        detected.forEach((field) => {
            const row = document.createElement('label');
            row.className = 'node-editor-check';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = field;
            input.checked = selected.includes(field);
            input.setAttribute('data-keeper-editor-field', '');
            const text = document.createElement('span');
            text.textContent = field;
            row.append(input, text);
            fieldsBox.appendChild(row);
        });
        document.getElementById('keeper-editor-manual').value = selected.filter((field) => !detectedSet.has(field)).join(', ');
        currentKeeperEditor = String(nodeId);
        _syncKeeperEditorCount();
        modal.style.display = 'flex';
        return true;
    }

    function closeKeeperEditor(save) {
        const modal = document.getElementById('keeper-editor-modal');
        if (!modal) return;
        if (save && currentKeeperEditor) {
            const nodeEl = document.getElementById('node-' + currentKeeperEditor);
            if (nodeEl) {
                const fields = Array.from(new Set([..._keeperModalFields(), ..._parseFieldList(document.getElementById('keeper-editor-manual')?.value)]));
                _commitNodeControl(nodeEl.querySelector('[df-ak-fields]'), JSON.stringify(fields));
                const legacy = nodeEl.querySelector('[df-keep]');
                if (legacy) _commitNodeControl(legacy, fields.join(','));
                _syncKeeperSummary(nodeEl, fields);
            }
        }
        modal.style.display = 'none';
        currentKeeperEditor = null;
    }

    function _readCreatorConfig(nodeEl) {
        let rows = [];
        try { rows = JSON.parse(nodeEl?.querySelector('[df-ac-creations]')?.value || '[]'); } catch (e) { rows = []; }
        if (!Array.isArray(rows) || !rows.length) {
            const outputAttr = nodeEl?.querySelector('[df-name]')?.value || '';
            const expression = nodeEl?.querySelector('[df-val]')?.value || '';
            if (outputAttr || expression) rows = [{ enabled: true, outputAttr, expression, defaultValue: nodeEl?.querySelector('[df-default]')?.value || '', valueType: 'string' }];
        }
        return rows.map((row) => ({ enabled: row?.enabled !== false, outputAttr: String(row?.outputAttr || ''), expression: String(row?.expression ?? ''), defaultValue: row?.defaultValue ?? '', valueType: String(row?.valueType || 'string') }));
    }

    function _syncCreatorSummary(nodeEl, rows) {
        const count = (rows || []).filter((row) => row.enabled !== false && String(row.outputAttr || '').trim()).length;
        const summary = nodeEl?.querySelector('[data-ac-count]');
        if (summary) summary.textContent = `${count} ${count === 1 ? 'atributo' : 'atributos'}`;
    }

    function updateCreatorNode(nodeId) {
        const node = _safeGetNode(nodeId).node;
        if (node?.name !== 'attr_creator') return;
        const nodeEl = document.getElementById('node-' + nodeId);
        if (nodeEl) _syncCreatorSummary(nodeEl, _readCreatorConfig(nodeEl));
    }

    let currentCreatorEditor = null;

    function _creatorEditorRuleRow(rule = {}) {
        const row = document.createElement('div');
        row.className = 'creator-editor-rule';
        row.innerHTML = `<input data-creator-enabled type="checkbox" aria-label="Activar atributo" ${rule.enabled === false ? '' : 'checked'}>
            <label class="form-field"><span>Atributo</span><input data-creator-output class="node-control" placeholder="nuevo_atributo"></label>
            <label class="form-field"><span>Valor o expresión</span><input data-creator-expression class="node-control" placeholder="@Value(campo) o =props.a + 1"></label>
            <label class="form-field"><span>Valor por defecto</span><input data-creator-default class="node-control" placeholder="Opcional"></label>
            <label class="form-field"><span>Tipo</span><select data-creator-type class="node-control"><option value="string">Texto</option><option value="number">Número</option><option value="integer">Entero</option><option value="boolean">Booleano</option></select></label>
            <button type="button" class="node-btn-mini" data-creator-remove-rule aria-label="Eliminar atributo"><i class="fas fa-times"></i></button>`;
        row.querySelector('[data-creator-output]').value = rule.outputAttr || '';
        row.querySelector('[data-creator-expression]').value = rule.expression ?? '';
        row.querySelector('[data-creator-default]').value = rule.defaultValue ?? '';
        row.querySelector('[data-creator-type]').value = ['string', 'number', 'integer', 'boolean'].includes(rule.valueType) ? rule.valueType : 'string';
        return row;
    }

    function _collectCreatorRules() {
        return Array.from(document.querySelectorAll('#creator-editor-rules .creator-editor-rule')).map((row) => ({
            enabled: row.querySelector('[data-creator-enabled]').checked,
            outputAttr: row.querySelector('[data-creator-output]').value.trim(),
            expression: row.querySelector('[data-creator-expression]').value,
            defaultValue: row.querySelector('[data-creator-default]').value,
            valueType: row.querySelector('[data-creator-type]').value
        })).filter((row) => row.outputAttr || row.expression || row.defaultValue);
    }

    function _syncCreatorEditorCount() {
        const count = _collectCreatorRules().filter((row) => row.enabled && row.outputAttr).length;
        const label = document.getElementById('creator-editor-count');
        if (label) label.textContent = `${count} ${count === 1 ? 'atributo' : 'atributos'}`;
    }

    function openCreatorEditor(nodeId) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('creator-editor-modal');
        if (!nodeEl || !modal || _safeGetNode(nodeId).node?.name !== 'attr_creator') return false;
        const rulesBox = document.getElementById('creator-editor-rules');
        rulesBox.innerHTML = '';
        const rows = _readCreatorConfig(nodeEl);
        (rows.length ? rows : [{}]).forEach((row) => rulesBox.appendChild(_creatorEditorRuleRow(row)));
        currentCreatorEditor = String(nodeId);
        _syncCreatorEditorCount();
        modal.style.display = 'flex';
        return true;
    }

    function closeCreatorEditor(save) {
        const modal = document.getElementById('creator-editor-modal');
        if (!modal) return;
        if (save && currentCreatorEditor) {
            const nodeEl = document.getElementById('node-' + currentCreatorEditor);
            if (nodeEl) {
                const rows = _collectCreatorRules();
                _commitNodeControl(nodeEl.querySelector('[df-ac-creations]'), JSON.stringify(rows));
                const first = rows.find((row) => row.enabled !== false) || rows[0];
                if (first) {
                    if (nodeEl.querySelector('[df-name]')) _commitNodeControl(nodeEl.querySelector('[df-name]'), first.outputAttr);
                    if (nodeEl.querySelector('[df-val]')) _commitNodeControl(nodeEl.querySelector('[df-val]'), first.expression);
                    if (nodeEl.querySelector('[df-default]')) _commitNodeControl(nodeEl.querySelector('[df-default]'), first.defaultValue);
                }
                _syncCreatorSummary(nodeEl, rows);
            }
        }
        modal.style.display = 'none';
        currentCreatorEditor = null;
    }

    function importCreatorFields() {
        if (!currentCreatorEditor) return;
        const node = _safeGetNode(currentCreatorEditor).node;
        const fields = _schemaFromNodeData(_getParentNodeId(node, 'input_1'));
        const rulesBox = document.getElementById('creator-editor-rules');
        const existing = new Set(_collectCreatorRules().map((row) => row.outputAttr));
        fields.filter((field) => !existing.has(field)).forEach((field) => rulesBox.appendChild(_creatorEditorRuleRow({ outputAttr: `${field}_new`, expression: `@Value(${field})`, valueType: 'string' })));
        _syncCreatorEditorCount();
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

    let currentAttributeTextEditor = null;

    const ATTRIBUTE_TEXT_KINDS = {
        list: { selector: '[df-list-concat-config]', defaults: { list_attr: '_list', target_attr: 'concatenated', delimiter: ',', drop_empty: false } },
        substring: { selector: '[df-substring-config]', defaults: { source_attr: 'Fecha', target_attr: 'Ano', start: 0, end: 3 } },
        splitter: { selector: '[df-splitter-config]', defaults: { source_attr: 'image', target_attr: '_list', delimiter: '_' } },
        exploder: { selector: '[df-list-exploder-config]', defaults: { list_attr: '_list', index_attr: '_element_index' } }
    };

    function _readAttributeTextConfig(nodeEl, kind) {
        const definition = ATTRIBUTE_TEXT_KINDS[kind] || ATTRIBUTE_TEXT_KINDS.list;
        try { return { ...definition.defaults, ...JSON.parse(nodeEl.querySelector(definition.selector)?.value || '{}') }; }
        catch (e) { return { ...definition.defaults }; }
    }

    function _syncAttributeTextSummary(nodeEl, kind, config) {
        const summary = nodeEl?.querySelector('[data-attribute-text-summary]');
        const detail = summary?.nextElementSibling;
        if (kind === 'substring') {
            if (summary) summary.textContent = `${config.source_attr} → ${config.target_attr}`;
            if (detail) detail.textContent = `Caracteres ${config.start}–${config.end} (inclusivo)`;
        } else if (kind === 'splitter') {
            if (summary) summary.textContent = `${config.source_attr} → ${config.target_attr}`;
            if (detail) detail.textContent = `Separar por “${config.delimiter}”`;
        } else if (kind === 'exploder') {
            if (summary) summary.textContent = config.list_attr;
            if (detail) detail.textContent = `Índice → ${config.index_attr}`;
        } else {
            if (summary) summary.textContent = `${config.list_attr} → ${config.target_attr}`;
            if (detail) detail.textContent = `Unir lista con “${config.delimiter}”${config.drop_empty ? ' · sin vacíos' : ''}`;
        }
    }

    function updateAttributeTextNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const node = safe.node;
        const kindsByNode = {
            attr_list_concatenator: 'list', attr_substring: 'substring',
            attr_splitter: 'splitter', attr_list_exploder: 'exploder'
        };
        const kind = kindsByNode[node?.name];
        if (!kind) return;
        const nodeEl = document.getElementById('node-' + nodeId);
        if (nodeEl) _syncAttributeTextSummary(nodeEl, kind, _readAttributeTextConfig(nodeEl, kind));
    }

    function openAttributeTextEditor(nodeId, kind) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('attribute-text-editor-modal');
        if (!nodeEl || !modal) return false;
        const resolvedKind = ATTRIBUTE_TEXT_KINDS[kind] ? kind : 'list';
        const config = _readAttributeTextConfig(nodeEl, resolvedKind);
        currentAttributeTextEditor = { nodeId: String(nodeId), kind: resolvedKind };

        const titles = { list: 'List Concatenator', substring: 'Substring Extractor', splitter: 'Attribute Splitter', exploder: 'List Exploder' };
        const subtitles = {
            list: 'Convierte una lista de atributos en texto', substring: 'Extrae un intervalo de caracteres con fin inclusivo',
            splitter: 'Divide texto en una lista', exploder: 'Crea una feature por elemento de la lista'
        };
        document.getElementById('attribute-text-editor-title').textContent = titles[resolvedKind];
        document.getElementById('attribute-text-editor-subtitle').textContent = subtitles[resolvedKind];
        document.getElementById('attribute-text-source-label').textContent = ['list', 'exploder'].includes(resolvedKind) ? 'Atributo de lista' : 'Campo de origen';
        document.getElementById('attribute-text-source').value = ['list', 'exploder'].includes(resolvedKind) ? config.list_attr : config.source_attr;
        document.getElementById('attribute-text-target').value = resolvedKind === 'exploder' ? config.index_attr : config.target_attr;
        document.getElementById('attribute-text-list-fields').hidden = !['list', 'splitter'].includes(resolvedKind);
        document.getElementById('attribute-text-drop-empty-field').hidden = resolvedKind !== 'list';
        document.getElementById('attribute-text-substring-fields').hidden = resolvedKind !== 'substring';
        if (resolvedKind === 'substring') {
            document.getElementById('attribute-text-start').value = config.start;
            document.getElementById('attribute-text-end').value = config.end;
            document.getElementById('attribute-text-editor-help').innerHTML = '<i class="fas fa-circle-info"></i> El índice final es inclusivo. Los índices negativos cuentan desde el final, igual que en Desktop.';
        } else if (resolvedKind === 'list') {
            document.getElementById('attribute-text-delimiter').value = config.delimiter;
            document.getElementById('attribute-text-drop-empty').checked = !!config.drop_empty;
            document.getElementById('attribute-text-editor-help').innerHTML = '<i class="fas fa-circle-info"></i> Admite listas directas y rutas anidadas como <code>items{}.name</code>.';
        } else if (resolvedKind === 'splitter') {
            document.getElementById('attribute-text-delimiter').value = config.delimiter;
            document.getElementById('attribute-text-editor-help').innerHTML = '<i class="fas fa-circle-info"></i> Los fragmentos vacíos se omiten, igual que en Desktop.';
        } else {
            document.getElementById('attribute-text-editor-help').innerHTML = '<i class="fas fa-circle-info"></i> Los valores que no sean listas producen una sola feature; null no produce ninguna.';
        }
        modal.style.display = 'flex';
        return true;
    }

    function closeAttributeTextEditor(save) {
        const modal = document.getElementById('attribute-text-editor-modal');
        if (!modal) return;
        if (save && currentAttributeTextEditor) {
            const { nodeId, kind } = currentAttributeTextEditor;
            const nodeEl = document.getElementById('node-' + nodeId);
            if (nodeEl) {
                const source = document.getElementById('attribute-text-source').value.trim();
                const target = document.getElementById('attribute-text-target').value.trim();
                let config;
                if (kind === 'substring') config = { source_attr: source || 'Fecha', target_attr: target || 'Ano', start: Number(document.getElementById('attribute-text-start').value), end: Number(document.getElementById('attribute-text-end').value) };
                else if (kind === 'splitter') config = { source_attr: source || 'image', target_attr: target || '_list', delimiter: document.getElementById('attribute-text-delimiter').value };
                else if (kind === 'exploder') config = { list_attr: source || '_list', index_attr: target || '_element_index' };
                else config = { list_attr: source || '_list', target_attr: target || 'concatenated', delimiter: document.getElementById('attribute-text-delimiter').value, drop_empty: document.getElementById('attribute-text-drop-empty').checked };
                const control = nodeEl.querySelector(ATTRIBUTE_TEXT_KINDS[kind].selector);
                _commitNodeControl(control, JSON.stringify(config));
                _syncAttributeTextSummary(nodeEl, kind, config);
            }
        }
        modal.style.display = 'none';
        currentAttributeTextEditor = null;
    }

    let currentStringReplacerNodeId = null;

    function _readStringReplacerConfig(nodeEl) {
        const defaults = { mode: 'text', case_sensitive: true, no_match_action: 'none', no_match_value: '', rules: [] };
        try { return { ...defaults, ...JSON.parse(nodeEl.querySelector('[df-strrep-config]')?.value || '{}') }; }
        catch (e) { return defaults; }
    }

    function _stringReplacerRuleRow(rule = {}) {
        const row = document.createElement('div');
        row.className = 'strrep-editor-rule';
        row.innerHTML = `<input data-strrep-enabled type="checkbox" aria-label="Activar regla" ${rule.enabled === false ? '' : 'checked'}>
            <input data-strrep-attribute class="node-control" placeholder="Atributo">
            <input data-strrep-search class="node-control" placeholder="Buscar">
            <input data-strrep-replace class="node-control" placeholder="Reemplazar">
            <button type="button" class="node-btn-mini" data-ui-action="strrep-remove-rule" aria-label="Eliminar regla"><i class="fas fa-times"></i></button>`;
        row.querySelector('[data-strrep-attribute]').value = rule.attribute || '';
        row.querySelector('[data-strrep-search]').value = rule.search || '';
        row.querySelector('[data-strrep-replace]').value = rule.replace || '';
        return row;
    }

    function _syncStringReplacerNoMatch() {
        const field = document.getElementById('strrep-editor-no-match-value-field');
        if (field) field.hidden = document.getElementById('strrep-editor-no-match')?.value !== 'set';
    }

    function _syncStringReplacerSummary(nodeEl, config) {
        const enabled = (config.rules || []).filter((rule) => rule.enabled !== false && rule.attribute).length;
        const summary = nodeEl?.querySelector('[data-strrep-summary]');
        const mode = nodeEl?.querySelector('[data-strrep-mode]');
        if (summary) summary.textContent = `${enabled} ${enabled === 1 ? 'regla' : 'reglas'}`;
        if (mode) mode.textContent = config.mode === 'regex' ? 'Expresión regular' : 'Texto literal';
    }

    function updateStringReplacerNode(nodeId) {
        const node = _safeGetNode(nodeId).node;
        if (node?.name !== 'attr_string_replacer') return;
        const nodeEl = document.getElementById('node-' + nodeId);
        if (nodeEl) _syncStringReplacerSummary(nodeEl, _readStringReplacerConfig(nodeEl));
    }

    function openStringReplacerEditor(nodeId) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('string-replacer-editor-modal');
        if (!nodeEl || !modal) return false;
        const config = _readStringReplacerConfig(nodeEl);
        currentStringReplacerNodeId = String(nodeId);
        document.getElementById('strrep-editor-mode').value = config.mode === 'regex' ? 'regex' : 'text';
        document.getElementById('strrep-editor-case').checked = config.case_sensitive !== false;
        document.getElementById('strrep-editor-no-match').value = ['none', 'null', 'set'].includes(config.no_match_action) ? config.no_match_action : 'none';
        document.getElementById('strrep-editor-no-match-value').value = config.no_match_value || '';
        const rules = document.getElementById('strrep-editor-rules');
        rules.innerHTML = '';
        (config.rules?.length ? config.rules : [{}]).forEach((rule) => rules.appendChild(_stringReplacerRuleRow(rule)));
        _syncStringReplacerNoMatch();
        modal.style.display = 'flex';
        return true;
    }

    function closeStringReplacerEditor(save) {
        const modal = document.getElementById('string-replacer-editor-modal');
        if (!modal) return;
        if (save && currentStringReplacerNodeId) {
            const nodeEl = document.getElementById('node-' + currentStringReplacerNodeId);
            if (nodeEl) {
                const rules = Array.from(document.querySelectorAll('#strrep-editor-rules .strrep-editor-rule')).map((row) => ({
                    enabled: row.querySelector('[data-strrep-enabled]').checked,
                    attribute: row.querySelector('[data-strrep-attribute]').value.trim(),
                    search: row.querySelector('[data-strrep-search]').value,
                    replace: row.querySelector('[data-strrep-replace]').value
                })).filter((rule) => rule.attribute || rule.search || rule.replace);
                const config = {
                    mode: document.getElementById('strrep-editor-mode').value,
                    case_sensitive: document.getElementById('strrep-editor-case').checked,
                    no_match_action: document.getElementById('strrep-editor-no-match').value,
                    no_match_value: document.getElementById('strrep-editor-no-match-value').value,
                    rules
                };
                _commitNodeControl(nodeEl.querySelector('[df-strrep-config]'), JSON.stringify(config));
                _syncStringReplacerSummary(nodeEl, config);
            }
        }
        modal.style.display = 'none';
        currentStringReplacerNodeId = null;
    }

    let currentAggregatorNodeId = null;

    function _readAggregatorConfig(nodeEl) {
        const defaults = { group_by: 'MATRICULA', remove_geometry: false, produce_multis: true, preserve_multi_inputs: false };
        try { return { ...defaults, ...JSON.parse(nodeEl.querySelector('[df-aggregator-config], [df-g2-config]')?.value || '{}') }; }
        catch (e) { return defaults; }
    }

    function _syncAggregatorSummary(nodeEl, config) {
        const summary = nodeEl?.querySelector('[data-aggregator-summary]');
        const group = Array.isArray(config.group_by) ? config.group_by.join(', ') : String(config.group_by || '').trim();
        if (summary) summary.textContent = group || 'Todas las features';
    }

    function updateAggregatorNode(nodeId) {
        const node = _safeGetNode(nodeId).node;
        if (node?.name !== 'attr_aggregator') return;
        const nodeEl = document.getElementById('node-' + nodeId);
        if (nodeEl) _syncAggregatorSummary(nodeEl, _readAggregatorConfig(nodeEl));
    }

    function openAggregatorEditor(nodeId) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('aggregator-editor-modal');
        if (!nodeEl || !modal) return false;
        const config = _readAggregatorConfig(nodeEl);
        currentAggregatorNodeId = String(nodeId);
        document.getElementById('aggregator-editor-group').value = Array.isArray(config.group_by) ? config.group_by.join(', ') : config.group_by || '';
        document.getElementById('aggregator-editor-remove-geometry').checked = !!config.remove_geometry;
        document.getElementById('aggregator-editor-produce-multis').checked = config.produce_multis !== false;
        document.getElementById('aggregator-editor-preserve-multis').checked = !!config.preserve_multi_inputs;
        modal.style.display = 'flex';
        return true;
    }

    function closeAggregatorEditor(save) {
        const modal = document.getElementById('aggregator-editor-modal');
        if (!modal) return;
        if (save && currentAggregatorNodeId) {
            const nodeEl = document.getElementById('node-' + currentAggregatorNodeId);
            if (nodeEl) {
                const config = {
                    group_by: document.getElementById('aggregator-editor-group').value.trim(),
                    remove_geometry: document.getElementById('aggregator-editor-remove-geometry').checked,
                    produce_multis: document.getElementById('aggregator-editor-produce-multis').checked,
                    preserve_multi_inputs: document.getElementById('aggregator-editor-preserve-multis').checked
                };
                _commitNodeControl(nodeEl.querySelector('[df-aggregator-config], [df-g2-config]'), JSON.stringify(config));
                _syncAggregatorSummary(nodeEl, config);
            }
        }
        modal.style.display = 'none';
        currentAggregatorNodeId = null;
    }

    let currentAttributeManagerEditor = null;

    const ATTRIBUTE_MANAGER_ACTIONS = {
        legacy: [['keep', 'Conservar'], ['remove', 'Eliminar'], ['rename', 'Renombrar'], ['copy', 'Copiar'], ['create', 'Crear'], ['formula', 'Fórmula'], ['default', 'Valor por defecto'], ['cast', 'Convertir tipo']],
        v2: [['do_nothing', 'Sin cambios'], ['remove', 'Eliminar'], ['rename', 'Renombrar'], ['set', 'Asignar'], ['create', 'Crear']]
    };

    function _readAttributeManagerConfig(nodeEl, version) {
        const legacy = version === 'legacy';
        const defaults = legacy ? { rules: [], preserveOthers: true, onError: 'null' } : { rules: [], preserveOthers: true };
        const selector = legacy ? '[df-attr-manager-config]' : '[df-attr-manager-v2-config]';
        let config = defaults;
        try { config = { ...defaults, ...JSON.parse(nodeEl.querySelector(selector)?.value || '{}') }; } catch (e) { config = { ...defaults }; }
        if (!Array.isArray(config.rules) || !config.rules.length) {
            const oldRules = nodeEl.querySelector(legacy ? '[df-rules]' : '[df-amv2-rules]')?.value;
            try { config.rules = JSON.parse(oldRules || '[]'); } catch (e) { config.rules = []; }
        }
        const oldPreserve = nodeEl.querySelector(legacy ? '[df-preserve]' : '[data-amv2-preserve]');
        if (!nodeEl.querySelector(selector) && oldPreserve) config.preserveOthers = !!oldPreserve.checked;
        if (legacy && !nodeEl.querySelector(selector)) config.onError = nodeEl.querySelector('[df-on-error]')?.value || 'null';
        return config;
    }

    function _attributeManagerRuleRow(rule = {}, version = 'legacy') {
        const row = document.createElement('div');
        row.className = 'attr-manager-editor-rule';
        const actions = ATTRIBUTE_MANAGER_ACTIONS[version] || ATTRIBUTE_MANAGER_ACTIONS.legacy;
        row.innerHTML = `<input data-attr-manager-enabled type="checkbox" aria-label="Activar regla" ${rule.enabled === false ? '' : 'checked'}>
            <select data-attr-manager-action class="node-control" aria-label="Acción">${actions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>
            <input data-attr-manager-source class="node-control" placeholder="Origen">
            <input data-attr-manager-target class="node-control" placeholder="Destino">
            <input data-attr-manager-value class="node-control" placeholder="Valor o expresión">
            <select data-attr-manager-type class="node-control" aria-label="Tipo"><option value="string">Texto</option><option value="number">Número</option><option value="integer">Entero</option><option value="boolean">Booleano</option><option value="date">Fecha</option><option value="json">JSON</option></select>
            <input data-attr-manager-condition class="node-control" placeholder="Condición, p. ej. @Value(tipo)==A" ${version === 'legacy' ? 'hidden' : ''}>
            <button type="button" class="node-btn-mini" data-ui-action="attribute-manager-remove-rule" aria-label="Eliminar regla"><i class="fas fa-times"></i></button>`;
        row.querySelector('[data-attr-manager-action]').value = String(rule.action || (version === 'v2' ? 'do_nothing' : 'keep'));
        row.querySelector('[data-attr-manager-source]').value = rule.source || rule.inputAttr || rule.input_attr || '';
        row.querySelector('[data-attr-manager-target]').value = rule.target || rule.outputAttr || rule.output_attr || rule.name || '';
        row.querySelector('[data-attr-manager-value]').value = rule.value ?? '';
        row.querySelector('[data-attr-manager-type]').value = rule.cast || rule.valueType || rule.value_type || 'string';
        row.querySelector('[data-attr-manager-condition]').value = rule.condition || '';
        return row;
    }

    function _syncAttributeManagerSummary(nodeEl, config) {
        const enabled = (config.rules || []).filter((rule) => rule.enabled !== false).length;
        const summary = nodeEl?.querySelector('[data-attr-manager-summary]');
        if (summary) summary.textContent = `${enabled} ${enabled === 1 ? 'regla' : 'reglas'}`;
    }

    function updateAttributeManagerNode(nodeId) {
        const node = _safeGetNode(nodeId).node;
        if (!['attr_manager', 'attr_manager_v2'].includes(node?.name)) return;
        const nodeEl = document.getElementById('node-' + nodeId);
        const version = node.name === 'attr_manager_v2' ? 'v2' : 'legacy';
        if (nodeEl) _syncAttributeManagerSummary(nodeEl, _readAttributeManagerConfig(nodeEl, version));
    }

    function openAttributeManagerEditor(nodeId, version = 'legacy') {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('attribute-manager-editor-modal');
        if (!nodeEl || !modal) return false;
        const resolvedVersion = version === 'v2' ? 'v2' : 'legacy';
        const config = _readAttributeManagerConfig(nodeEl, resolvedVersion);
        currentAttributeManagerEditor = { nodeId: String(nodeId), version: resolvedVersion };
        document.getElementById('attribute-manager-editor-title').textContent = resolvedVersion === 'v2' ? 'Attribute Manager v2' : 'Attribute Manager';
        document.getElementById('attribute-manager-editor-subtitle').textContent = resolvedVersion === 'v2' ? 'Editor FME actual de una salida' : 'Contrato Desktop legado con salida de rechazados';
        document.getElementById('attribute-manager-editor-preserve').checked = config.preserveOthers !== false;
        document.getElementById('attribute-manager-editor-error-field').hidden = resolvedVersion !== 'legacy';
        document.getElementById('attribute-manager-editor-error').value = config.onError === 'reject' ? 'reject' : 'null';
        const rules = document.getElementById('attribute-manager-editor-rules');
        rules.innerHTML = '';
        (config.rules.length ? config.rules : [{}]).forEach((rule) => rules.appendChild(_attributeManagerRuleRow(rule, resolvedVersion)));
        modal.style.display = 'flex';
        return true;
    }

    function closeAttributeManagerEditor(save) {
        const modal = document.getElementById('attribute-manager-editor-modal');
        if (!modal) return;
        if (save && currentAttributeManagerEditor) {
            const { nodeId, version } = currentAttributeManagerEditor;
            const nodeEl = document.getElementById('node-' + nodeId);
            if (nodeEl) {
                const rules = Array.from(document.querySelectorAll('#attribute-manager-editor-rules .attr-manager-editor-rule')).map((row) => {
                    const base = {
                        enabled: row.querySelector('[data-attr-manager-enabled]').checked,
                        action: row.querySelector('[data-attr-manager-action]').value,
                        value: row.querySelector('[data-attr-manager-value]').value
                    };
                    const source = row.querySelector('[data-attr-manager-source]').value.trim();
                    const target = row.querySelector('[data-attr-manager-target]').value.trim();
                    const type = row.querySelector('[data-attr-manager-type]').value;
                    if (version === 'v2') return { ...base, inputAttr: source, outputAttr: target, valueType: type, condition: row.querySelector('[data-attr-manager-condition]').value.trim() };
                    return { ...base, source, target, cast: type };
                }).filter((rule) => rule.inputAttr || rule.outputAttr || rule.source || rule.target || rule.value);
                const config = { rules, preserveOthers: document.getElementById('attribute-manager-editor-preserve').checked };
                if (version === 'legacy') config.onError = document.getElementById('attribute-manager-editor-error').value;
                const selector = version === 'v2' ? '[df-attr-manager-v2-config]' : '[df-attr-manager-config]';
                const configControl = nodeEl.querySelector(selector);
                if (configControl) _commitNodeControl(configControl, JSON.stringify(config));
                else {
                    _commitNodeControl(nodeEl.querySelector(version === 'v2' ? '[df-amv2-rules]' : '[df-rules]'), JSON.stringify(rules));
                    const preserve = nodeEl.querySelector(version === 'v2' ? '[data-amv2-preserve]' : '[df-preserve]');
                    if (preserve) {
                        preserve.checked = config.preserveOthers;
                        preserve.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (version === 'legacy') _commitNodeControl(nodeEl.querySelector('[df-on-error]'), config.onError);
                }
                _syncAttributeManagerSummary(nodeEl, config);
            }
        }
        modal.style.display = 'none';
        currentAttributeManagerEditor = null;
    }

    const GEOMETRY_TRANSFORM_EDITORS = {
        geo_crs_setter: {
            title: 'Coordinate System Setter', subtitle: 'Asigna metadatos CRS sin reproyectar',
            fields: [
                { key: 'crs', label: 'CRS', type: 'text', value: 'EPSG:4326', placeholder: 'EPSG:4326' },
                { key: 'overwrite', label: 'Sobrescribir CRS existente', type: 'checkbox', value: true }
            ],
            summary: (config) => String(config.crs || 'EPSG:4326')
        },
        geo_horizontal_angle_calculator: {
            title: 'Horizontal Angle Calculator', subtitle: 'Azimut y ángulo horizontal de líneas',
            fields: [
                { key: 'unit', label: 'Unidad', type: 'select', value: 'degrees', options: [['degrees', 'Grados'], ['radians', 'Radianes']] },
                { key: 'azimuth_attr', label: 'Atributo de azimut', type: 'text', value: '_azimuth' },
                { key: 'angle_attr', label: 'Atributo de ángulo', type: 'text', value: '_angle' }
            ],
            summary: (config) => config.unit === 'radians' ? 'Radianes' : 'Grados'
        },
        geo_rotator: {
            title: 'Rotator', subtitle: 'Rotación antihoraria con origen configurable',
            fields: [
                { key: 'angle_mode', label: 'Origen del ángulo', type: 'select', value: 'fixed', options: [['fixed', 'Valor fijo'], ['field', 'Atributo']] },
                { key: 'angle_value', label: 'Ángulo (grados)', type: 'number', value: 0 },
                { key: 'angle_field', label: 'Atributo de ángulo', type: 'text', value: '' },
                { key: 'origin_mode', label: 'Centro de rotación', type: 'select', value: 'centroid', options: [['centroid', 'Centroide'], ['bbox_center', 'Centro del bounding box'], ['custom', 'Coordenadas fijas'], ['fields', 'Atributos X/Y']] },
                { key: 'origin_x', label: 'Origen X', type: 'number', value: 0 },
                { key: 'origin_y', label: 'Origen Y', type: 'number', value: 0 },
                { key: 'origin_x_field', label: 'Atributo origen X', type: 'text', value: '' },
                { key: 'origin_y_field', label: 'Atributo origen Y', type: 'text', value: '' },
                { key: 'on_error', label: 'Si falla', type: 'select', value: 'reject', options: [['reject', 'Enviar a salida 2'], ['null', 'Conservar con diagnóstico']] }
            ],
            summary: (config) => `${config.angle_mode === 'field' ? config.angle_field || 'atributo' : Number(config.angle_value || 0) + '°'} · ${config.origin_mode || 'centroid'}`
        },
        geo_densifier: {
            title: 'Densifier', subtitle: 'Añade vértices a líneas y anillos',
            fields: [
                { key: 'mode', label: 'Distribución', type: 'select', value: 'uniform', options: [['uniform', 'Uniforme'], ['exact', 'Intervalo exacto']] },
                { key: 'interval_mode', label: 'Origen del intervalo', type: 'select', value: 'fixed', options: [['fixed', 'Valor fijo'], ['field', 'Atributo']] },
                { key: 'interval_value', label: 'Intervalo', type: 'number', value: 1, min: 0.000001 },
                { key: 'interval_field', label: 'Atributo de intervalo', type: 'text', value: '' },
                { key: 'on_error', label: 'Si falla', type: 'select', value: 'reject', options: [['reject', 'Enviar a salida 2'], ['null', 'Conservar con diagnóstico']] }
            ],
            summary: (config) => `${config.mode === 'exact' ? 'Exacto' : 'Uniforme'} · ${config.interval_mode === 'field' ? config.interval_field || 'atributo' : config.interval_value}`
        },
        geo_measure_extractor: {
            title: 'MeasureExtractor', subtitle: 'Lee la tercera coordenada como medida',
            fields: [
                { key: 'measure_type', label: 'Modo', type: 'select', value: 'whole', options: [['whole', 'Lista completa'], ['point', 'Primer punto'], ['vertex', 'Vértice por índice'], ['endpoints', 'Inicio y fin']] },
                { key: 'index', label: 'Índice de vértice', type: 'number', value: 0 },
                { key: 'point_attr', label: 'Atributo de medida', type: 'text', value: 'measure' },
                { key: 'start_attr', label: 'Atributo inicial', type: 'text', value: 'measure_start' },
                { key: 'end_attr', label: 'Atributo final', type: 'text', value: 'measure_end' },
                { key: 'list_attr', label: 'Atributo de lista', type: 'text', value: 'measures' }
            ],
            summary: (config) => ({ whole: `Lista ${config.list_attr || 'measures'}`, point: config.point_attr || 'measure', vertex: `Vértice ${config.index ?? 0}`, endpoints: 'Inicio + fin' }[config.measure_type] || 'Medidas')
        },
        geo_centerline_replacer: {
            title: 'Centerline Replacer', subtitle: 'Línea central mediante backend Geometry',
            fields: [
                { key: 'densify_distance', label: 'Distancia de densificación', type: 'text', value: 'auto' },
                { key: 'min_branch_length', label: 'Longitud mínima de rama', type: 'text', value: 'auto' },
                { key: 'simplify_tolerance', label: 'Tolerancia de simplificación', type: 'text', value: 'auto' },
                { key: 'extend', label: 'Extender extremos', type: 'checkbox', value: false },
                { key: 'timeout_seconds', label: 'Timeout (segundos)', type: 'number', value: 30, min: 1 }
            ],
            summary: (config) => `Centerline · ${config.densify_distance || 'auto'}`
        },
        geo_extruder: {
            title: 'Extruder', subtitle: 'Convierte geometría 2D en GeoJSON 3D',
            fields: [
                { key: 'height_mode', label: 'Origen de altura', type: 'select', value: 'fixed', options: [['fixed', 'Valor fijo'], ['field', 'Atributo']] },
                { key: 'height_value', label: 'Altura', type: 'number', value: 10 },
                { key: 'height_field', label: 'Atributo de altura', type: 'text', value: '' },
                { key: 'base_mode', label: 'Base Z', type: 'select', value: 'zero', options: [['zero', 'Cero'], ['value', 'Valor fijo'], ['field', 'Atributo']] },
                { key: 'base_value', label: 'Valor de base', type: 'number', value: 0 },
                { key: 'base_field', label: 'Atributo de base', type: 'text', value: '' },
                { key: 'on_error', label: 'Si falla', type: 'select', value: 'reject', options: [['reject', 'Enviar a salida 2'], ['null', 'Conservar con diagnóstico']] }
            ],
            summary: (config) => `Altura ${config.height_mode === 'field' ? config.height_field || 'atributo' : config.height_value}`
        },
        geo_line_builder: {
            title: 'Line Builder', subtitle: 'Agrupa y ordena puntos para construir líneas',
            fields: [
                { key: 'group_by', label: 'Agrupar por (separado por comas)', type: 'text', value: 'Job' },
                { key: 'sort_by', label: 'Ordenar por', type: 'text', value: 'img' },
                { key: 'remove_duplicates', label: 'Eliminar coordenadas duplicadas', type: 'checkbox', value: false }
            ],
            summary: (config) => `${config.group_by || 'sin grupo'} · ${config.sort_by || 'sin orden'}`
        },
        geo_multi_bufferer: {
            title: 'MultiBufferer', subtitle: 'Bandas de buffer o líneas paralelas',
            fields: [
                { key: 'output_mode', label: 'Salida', type: 'select', value: 'polygons', options: [['polygons', 'Bandas poligonales'], ['offset_lines', 'Líneas paralelas']] },
                { key: 'distances', label: 'Distancias', type: 'text', value: '10,20', placeholder: '10,20,50' },
                { key: 'unit', label: 'Unidad', type: 'select', value: 'meters', options: [['meters', 'Metros'], ['kilometers', 'Kilómetros'], ['miles', 'Millas'], ['degrees', 'Grados']] },
                { key: 'side', label: 'Lado de línea', type: 'select', value: 'both', options: [['both', 'Ambos'], ['left', 'Izquierda'], ['right', 'Derecha']] },
                { key: 'projected_crs', label: 'CRS de trabajo', type: 'text', value: 'EPSG:25830' }
            ],
            summary: (config) => `${config.output_mode === 'offset_lines' ? 'Paralelas' : 'Buffers'} ${config.distances || ''}`
        },
        geo_offsetter: {
            title: 'Offsetter', subtitle: 'Desplaza coordenadas X, Y y Z',
            fields: [
                { key: 'x_mode', label: 'Origen X', type: 'select', value: 'fixed', options: [['fixed', 'Valor fijo'], ['field', 'Atributo']] },
                { key: 'x_value', label: 'Offset X', type: 'number', value: 0 },
                { key: 'x_field', label: 'Atributo X', type: 'text', value: '' },
                { key: 'y_mode', label: 'Origen Y', type: 'select', value: 'fixed', options: [['fixed', 'Valor fijo'], ['field', 'Atributo']] },
                { key: 'y_value', label: 'Offset Y', type: 'number', value: 0 },
                { key: 'y_field', label: 'Atributo Y', type: 'text', value: '' },
                { key: 'z_mode', label: 'Origen Z', type: 'select', value: 'fixed', options: [['fixed', 'Valor fijo'], ['field', 'Atributo']] },
                { key: 'z_value', label: 'Offset Z', type: 'number', value: 0 },
                { key: 'z_field', label: 'Atributo Z', type: 'text', value: '' },
                { key: 'on_error', label: 'Si falla', type: 'select', value: 'reject', options: [['reject', 'Enviar a salida 2'], ['null', 'Conservar con diagnóstico']] }
            ],
            summary: (config) => `X ${config.x_mode === 'field' ? config.x_field || 'attr' : config.x_value} · Y ${config.y_mode === 'field' ? config.y_field || 'attr' : config.y_value}`
        },
        sp_anchored_snapper: {
            title: 'Anchored Snapper', subtitle: 'Ajusta candidatos contra una red de anchors',
            fields: [
                { key: 'snapping_type', label: 'Tipo de ajuste', type: 'select', value: 'segment', options: [['segment', 'Segmento'], ['vertex', 'Vértice']] },
                { key: 'distance', label: 'Distancia máxima', type: 'number', value: 10, min: 0 },
                { key: 'unit', label: 'Unidad', type: 'select', value: 'meters', options: [['meters', 'Metros'], ['kilometers', 'Kilómetros'], ['miles', 'Millas']] },
                { key: 'group_by', label: 'Agrupar por (separado por comas)', type: 'text', value: '' }
            ],
            summary: (config) => `${config.snapping_type === 'vertex' ? 'Vértice' : 'Segmento'} · ${config.distance ?? 10} ${{ meters: 'm', kilometers: 'km', miles: 'mi' }[config.unit] || config.unit}`
        },
        sp_neighbor_finder: {
            title: 'Neighbor Finder', subtitle: 'Encuentra el candidato más próximo',
            fields: [
                { key: 'max_distance', label: 'Distancia máxima (metros)', type: 'text', value: '', placeholder: 'Sin límite' },
                { key: 'distance_factor', label: 'Factor de distancia', type: 'text', value: '', placeholder: 'Opcional' },
                { key: 'merge_attrs', label: 'Incorporar atributos del vecino', type: 'checkbox', value: false }
            ],
            summary: (config) => String(config.max_distance ?? '').trim() ? `Máx. ${config.max_distance} m` : 'Sin límite'
        },
        sp_spatial_relator: {
            title: 'Spatial Relator', subtitle: 'Relaciona Requestors con Suppliers',
            fields: [
                { key: 'mode', label: 'Relación espacial', type: 'select', value: 'intersects', options: [['intersects', 'Intersects'], ['contains', 'Contains'], ['within', 'Within'], ['crosses', 'Crosses'], ['touches', 'Touches'], ['overlaps', 'Overlaps'], ['equals', 'Equals'], ['disjoint', 'Disjoint']] },
                { key: 'count_attr', label: 'Atributo de recuento', type: 'text', value: 'related_suppliers' },
                { key: 'group_by', label: 'Agrupar por (separado por comas)', type: 'text', value: '' },
                { key: 'merge_attrs', label: 'Incorporar atributos del Supplier', type: 'checkbox', value: false },
                { key: 'merge_mode', label: 'Modo de atributos', type: 'select', value: 'prefix', options: [['prefix', 'Añadir prefijo'], ['merge', 'Combinar']] },
                { key: 'supplier_selection', label: 'Supplier representativo', type: 'select', value: 'first', options: [['first', 'Primero'], ['last', 'Último']] },
                { key: 'prefix', label: 'Prefijo de atributos', type: 'text', value: 'supplier_' },
                { key: 'generate_list', label: 'Generar lista de relaciones', type: 'checkbox', value: false },
                { key: 'list_name', label: 'Nombre de la lista', type: 'text', value: '_relations' },
                { key: 'list_attrs', label: 'Incluir atributos en la lista', type: 'checkbox', value: true }
            ],
            summary: (config) => `${config.mode || 'intersects'} · ${config.count_attr || 'related_suppliers'}`
        },
        reader_feature_reader: {
            title: 'FeatureReader', subtitle: 'Lectura dinámica compatible con Desktop', storage: '[df-fr-config]',
            fields: [
                { key: 'format', label: 'Formato', type: 'select', value: 'csv', options: [['csv', 'CSV'], ['xlsx', 'Excel'], ['geojson', 'GeoJSON'], ['kml', 'KML'], ['gpx', 'GPX'], ['shp', 'SHP'], ['gdb', 'GDB'], ['gpkg', 'GeoPackage'], ['parquet', 'Parquet']] },
                { key: 'path_mode', label: 'Origen de ruta', type: 'select', value: 'attribute', options: [['attribute', 'Atributo iniciador'], ['static', 'Ruta fija'], ['template', 'Plantilla']] },
                { key: 'path_value', label: 'Atributo o ruta', type: 'text', value: '' },
                { key: 'path_expression', label: 'Plantilla de ruta', type: 'text', value: '' },
                { key: 'layer_mode', label: 'Origen de capa', type: 'select', value: 'none', options: [['none', 'Sin capa'], ['attribute', 'Atributo'], ['static', 'Valor fijo'], ['template', 'Plantilla']] },
                { key: 'layer_value', label: 'Atributo o capa', type: 'text', value: '' },
                { key: 'schema_policy', label: 'Política de esquema', type: 'select', value: 'union', options: [['union', 'Unión'], ['same_schema', 'Mismo esquema']] },
                { key: 'merge_initiator', label: 'Incorporar atributos iniciadores', type: 'checkbox', value: true },
                { key: 'initiator_prefix', label: 'Prefijo iniciador', type: 'text', value: 'init_' },
                { key: 'reader_prefix', label: 'Prefijo leído', type: 'text', value: '' },
                { key: 'cache_policy', label: 'Caché', type: 'select', value: 'per_dataset_layer', options: [['per_dataset_layer', 'Dataset + capa'], ['per_dataset', 'Dataset'], ['none', 'Sin caché']] },
                { key: 'missing_file_policy', label: 'Archivo ausente', type: 'select', value: 'reject', options: [['reject', 'Salida 2'], ['skip', 'Omitir'], ['error', 'Detener']] },
                { key: 'empty_read_policy', label: 'Lectura vacía', type: 'select', value: 'pass_empty_summary', options: [['pass_empty_summary', 'Resumen en salida 3'], ['reject', 'Salida 2'], ['skip', 'Omitir']] },
                { key: 'max_features_per_initiator', label: 'Máximo por iniciador (0 = ilimitado)', type: 'number', value: 0, min: 0 },
                { key: 'csv.lat_field', label: 'CSV · campo latitud', type: 'text', value: '' },
                { key: 'csv.lon_field', label: 'CSV · campo longitud', type: 'text', value: '' },
                { key: 'csv.delimiter', label: 'CSV · delimitador', type: 'text', value: 'auto' },
                { key: 'csv.encoding', label: 'CSV · codificación', type: 'text', value: 'utf-8' }
            ],
            summary: (config) => `${String(config.format || 'csv').toUpperCase()} · ${{ attribute: 'atributo', static: 'ruta fija', template: 'plantilla' }[config.path_mode] || config.path_mode}`
        },
        util_creator: {
            title: 'Creator', subtitle: 'Genera entidades sin depender de una fuente', storage: '[df-creator-config]',
            fields: [
                { key: 'count', label: 'Cantidad', type: 'number', value: 1, min: 1 },
                { key: 'geometry_mode', label: 'Geometría', type: 'select', value: 'none', options: [['none', 'Sin geometría'], ['point', 'Punto']] },
                { key: 'x', label: 'Coordenada X', type: 'number', value: 0 }, { key: 'y', label: 'Coordenada Y', type: 'number', value: 0 },
                { key: 'crs', label: 'CRS', type: 'text', value: '' }, { key: 'instance_attr', label: 'Atributo de instancia', type: 'text', value: '_creation_instance' },
                { key: 'attributes', label: 'Atributos (JSON)', type: 'json', value: [{ enabled: true, name: 'path', value: '', type: 'string' }] }
            ], summary: (config) => `${config.count || 1} entidades · ${config.geometry_mode === 'point' ? 'punto' : 'sin geometría'}`
        },
        util_http_caller: {
            title: 'HTTP Caller', subtitle: 'Petición HTTP ejecutada por el navegador', storage: '[df-http-config]',
            fields: [
                { key: 'url', label: 'URL', type: 'text', value: '' }, { key: 'method', label: 'Método', type: 'select', value: 'GET', options: [['GET','GET'],['POST','POST'],['PUT','PUT'],['PATCH','PATCH'],['DELETE','DELETE']] },
                { key: 'timeout', label: 'Timeout (s)', type: 'number', value: 15, min: 1 }, { key: 'auth', label: 'Autenticación', type: 'select', value: 'none', options: [['none','Ninguna'],['basic','Basic'],['bearer','Bearer'],['api_key','API key']] },
                { key: 'user', label: 'Usuario', type: 'text', value: '' }, { key: 'pass', label: 'Contraseña', type: 'password', value: '' }, { key: 'token', label: 'Token', type: 'password', value: '' },
                { key: 'api_key_header', label: 'Cabecera API key', type: 'text', value: 'X-API-Key' }, { key: 'api_key_value', label: 'API key', type: 'password', value: '' },
                { key: 'headers', label: 'Cabeceras (JSON)', type: 'json', value: {} }, { key: 'body', label: 'Body', type: 'textarea', value: '' }
            ], summary: (config) => `${config.method || 'GET'} · ${config.url || 'sin URL'}`
        },
        util_rest_request: {
            title: 'REST Request', subtitle: 'Endpoint REST con ruta y parámetros', storage: '[df-rest-config]',
            fields: [
                { key: 'base_url', label: 'URL base', type: 'text', value: '' }, { key: 'path', label: 'Ruta', type: 'text', value: '' },
                { key: 'method', label: 'Método', type: 'select', value: 'GET', options: [['GET','GET'],['POST','POST'],['PUT','PUT'],['PATCH','PATCH'],['DELETE','DELETE']] }, { key: 'timeout', label: 'Timeout (s)', type: 'number', value: 15, min: 1 },
                { key: 'auth', label: 'Autenticación', type: 'select', value: 'none', options: [['none','Ninguna'],['basic','Basic'],['bearer','Bearer'],['api_key','API key']] },
                { key: 'user', label: 'Usuario', type: 'text', value: '' }, { key: 'pass', label: 'Contraseña', type: 'password', value: '' }, { key: 'token', label: 'Token', type: 'password', value: '' },
                { key: 'api_key_header', label: 'Cabecera API key', type: 'text', value: 'X-API-Key' }, { key: 'api_key_value', label: 'API key', type: 'password', value: '' },
                { key: 'query', label: 'Query params (JSON)', type: 'json', value: {} }, { key: 'headers', label: 'Cabeceras (JSON)', type: 'json', value: {} }, { key: 'body', label: 'Body', type: 'textarea', value: '' }
            ], summary: (config) => `${config.method || 'GET'} · ${config.path || config.base_url || 'sin endpoint'}`
        },
        util_graphql_request: {
            title: 'GraphQL Request', subtitle: 'Consulta GraphQL ejecutada por el navegador', storage: '[df-graphql-config]',
            fields: [
                { key: 'endpoint', label: 'Endpoint', type: 'text', value: '' }, { key: 'operation_name', label: 'Operation name', type: 'text', value: '' },
                { key: 'query', label: 'Query', type: 'textarea', value: '' }, { key: 'variables', label: 'Variables (JSON)', type: 'json', value: {} }, { key: 'headers', label: 'Cabeceras (JSON)', type: 'json', value: {} },
                { key: 'timeout', label: 'Timeout (s)', type: 'number', value: 15, min: 1 }, { key: 'auth', label: 'Autenticación', type: 'select', value: 'none', options: [['none','Ninguna'],['basic','Basic'],['bearer','Bearer'],['api_key','API key']] },
                { key: 'user', label: 'Usuario', type: 'text', value: '' }, { key: 'pass', label: 'Contraseña', type: 'password', value: '' }, { key: 'token', label: 'Token', type: 'password', value: '' },
                { key: 'api_key_header', label: 'Cabecera API key', type: 'text', value: 'X-API-Key' }, { key: 'api_key_value', label: 'API key', type: 'password', value: '' }
            ], summary: (config) => config.operation_name || config.endpoint || 'Sin consulta'
        }
    };

    const READER_EDITOR_DEFINITIONS = {
        reader_geojson: { title: 'GeoJSON Reader', subtitle: 'Fuente, esquema y CRS', fields: [
            { key: 'schema_policy', label: 'Política de esquema', type: 'select', value: 'union', options: [['union','Unión de campos'],['same_schema','Mismo esquema']] }, { key: 'crs', label: 'CRS declarado', type: 'text', value: '' }
        ] },
        reader_kml: { title: 'KML Reader', subtitle: 'Fuente y esquema', fields: [
            { key: 'schema_policy', label: 'Política de esquema', type: 'select', value: 'union', options: [['union','Unión de campos'],['same_schema','Mismo esquema']] }, { key: 'crs', label: 'CRS declarado', type: 'text', value: '' }
        ] },
        reader_csv: { title: 'CSV Reader', subtitle: 'Delimitador, geometría y esquema', fields: [
            { key: 'delimiter', label: 'Delimitador', type: 'select', value: 'auto', options: [['auto','Detección automática'],[',','Coma'],[';','Punto y coma'],['\t','Tabulador']] },
            { key: 'lat_column', label: 'Campo latitud / Y', type: 'text', value: '' }, { key: 'lon_column', label: 'Campo longitud / X', type: 'text', value: '' }, { key: 'wkt_column', label: 'Campo WKT', type: 'text', value: '' },
            { key: 'schema_policy', label: 'Política multiarchivo', type: 'select', value: 'same_schema', options: [['same_schema','Exigir mismo esquema'],['union','Unir campos']] }, { key: 'crs', label: 'CRS declarado', type: 'text', value: '' }
        ] },
        reader_excel: { title: 'Excel Reader', subtitle: 'Hoja, geometría y esquema', fields: [
            { key: 'sheet_name', label: 'Hoja (vacío = primera)', type: 'text', value: '' }, { key: 'lat_column', label: 'Campo latitud / Y', type: 'text', value: '' }, { key: 'lon_column', label: 'Campo longitud / X', type: 'text', value: '' }, { key: 'wkt_column', label: 'Campo WKT', type: 'text', value: '' },
            { key: 'schema_policy', label: 'Política multiarchivo', type: 'select', value: 'same_schema', options: [['same_schema','Exigir mismo esquema'],['union','Unir campos']] }, { key: 'crs', label: 'CRS declarado', type: 'text', value: '' }
        ] },
        reader_shp: { title: 'SHP Reader', subtitle: 'Conjunto Shapefile y CRS', fields: [
            { key: 'schema_policy', label: 'Política de esquema', type: 'select', value: 'same_schema', options: [['same_schema','Exigir mismo esquema'],['union','Unir campos']] }, { key: 'crs', label: 'CRS de reemplazo (opcional)', type: 'text', value: '' }
        ] },
        reader_gpx: { title: 'GPX Reader', subtitle: 'Tracks, rutas y waypoints', fields: [ { key: 'crs', label: 'CRS', type: 'text', value: 'EPSG:4326' } ] },
        reader_gdb: { title: 'GDB Reader', subtitle: 'Capas mediante backend', fields: [
            { key: 'selected_layers', label: 'Capas seleccionadas (JSON)', type: 'json', value: [] }, { key: 'schema_policy', label: 'Política de esquema', type: 'select', value: 'same_schema', options: [['same_schema','Mismo esquema'],['union','Unión de campos']] }, { key: 'crs', label: 'CRS de reemplazo (opcional)', type: 'text', value: '' }
        ] }
    };

    let currentGeometryTransformEditor = null;

    function _geometryTransformGet(config, path) {
        return String(path).split('.').reduce((value, key) => value?.[key], config);
    }

    function _geometryTransformSet(config, path, value) {
        const keys = String(path).split('.'); let target = config;
        keys.slice(0, -1).forEach((key) => {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            target = target[key];
        });
        target[keys[keys.length - 1]] = value;
    }

    function _geometryTransformStorage(nodeEl, definition) {
        return nodeEl.querySelector(definition.storage || '[df-geom-transform-config]');
    }

    function _readGeometryTransformConfig(nodeEl, definition) {
        const defaults = {};
        definition.fields.forEach((field) => _geometryTransformSet(defaults, field.key, field.value));
        try {
            const saved = JSON.parse(_geometryTransformStorage(nodeEl, definition)?.value || '{}');
            return { ...defaults, ...saved, ...(defaults.csv || saved.csv ? { csv: { ...(defaults.csv || {}), ...(saved.csv || {}) } } : {}) };
        }
        catch (error) { return defaults; }
    }

    function _syncGeometryTransformSummary(nodeEl, definition, config) {
        const summary = nodeEl?.querySelector('[data-geom-transform-summary]');
        if (summary) summary.textContent = definition.summary(config);
    }

    function _geometryTransformField(field, value) {
        const label = document.createElement('label');
        label.className = field.type === 'checkbox' ? 'form-field form-inline' : 'form-field';
        let control;
        if (field.type === 'select') {
            control = document.createElement('select');
            (field.options || []).forEach(([optionValue, optionLabel]) => {
                const option = document.createElement('option'); option.value = optionValue; option.textContent = optionLabel; control.appendChild(option);
            });
            control.value = String(value ?? field.value ?? '');
        } else if (field.type === 'textarea' || field.type === 'json') {
            control = document.createElement('textarea'); control.rows = field.rows || 4;
            control.value = field.type === 'json' ? JSON.stringify(value ?? field.value ?? {}, null, 2) : (value ?? field.value ?? '');
        } else {
            control = document.createElement('input');
            control.type = field.type === 'checkbox' ? 'checkbox' : field.type;
            if (field.type === 'checkbox') control.checked = value !== false;
            else control.value = value ?? field.value ?? '';
            if (field.placeholder) control.placeholder = field.placeholder;
            if (field.min != null) control.min = String(field.min);
        }
        control.classList.add('node-control');
        control.dataset.geometryTransformField = field.key;
        const text = document.createElement('span'); text.textContent = field.label;
        if (field.type === 'checkbox') label.append(control, text); else label.append(text, control);
        return label;
    }

    let currentReaderEditor = null;

    function _readerFileStore() {
        if (!window.JETLReaderFileStore?.get || !window.JETLReaderFileStore?.set) window.JETLReaderFileStore = new WeakMap();
        return window.JETLReaderFileStore;
    }

    function _readerEditorDefinition(name) { return READER_EDITOR_DEFINITIONS[name] || null; }

    function _readerEditorConfig(nodeEl, definition) {
        const defaults = {}; definition.fields.forEach((field) => _geometryTransformSet(defaults, field.key, field.value));
        try { return { ...defaults, ...JSON.parse(nodeEl?.querySelector('[df-reader-config]')?.value || '{}') }; }
        catch (_) { return defaults; }
    }

    function _readerEditorFormConfig(definition) {
        const config = {};
        definition.fields.forEach((field) => {
            const control = document.querySelector(`#reader-editor-fields [data-geometry-transform-field="${field.key}"]`); if (!control) return;
            let value = field.type === 'checkbox' ? control.checked : field.type === 'number' ? Number(control.value) : control.value;
            if (field.type === 'json') { try { value = JSON.parse(control.value || '[]'); } catch (_) { value = field.value; } }
            _geometryTransformSet(config, field.key, value);
        });
        return config;
    }

    function _readerEditorSources(nodeEl) {
        const stored = nodeEl ? _readerFileStore().get(nodeEl) : null;
        if (Array.isArray(stored) && stored.length) return stored.filter(Boolean);
        return Array.from(nodeEl?.querySelector('[df-file]')?.files || []).filter(Boolean);
    }

    function _renderReaderEditorSources(nodeEl) {
        const target = document.getElementById('reader-editor-source-list'); if (!target) return;
        const files = _readerEditorSources(nodeEl);
        target.textContent = files.length ? files.map((file) => `${file.name}${file.size ? ` · ${(file.size / 1048576).toFixed(2)} MB` : ''}`).join(' · ') : 'Sin archivos seleccionados';
    }

    function _readerCell(value) {
        if (value == null) return '—'; if (typeof value === 'object') return JSON.stringify(value); return String(value);
    }

    function _readerClone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

    function _readerEditorStatus() {
        const status = document.getElementById('reader-editor-preview-status'); if (!status || !currentReaderEditor) return;
        const state = currentReaderEditor;
        const dirty = state.dirty ? ` · ${state.dirtyCount || 1} cambios pendientes` : '';
        status.textContent = `${state.featureCount == null ? 'Recuento no disponible' : `${state.featureCount} entidades`} · ${(state.geometryTypes || []).join(', ') || 'sin geometría'}${state.notice ? ` · ${state.notice}` : ''}${dirty}`;
        status.dataset.dirty = state.dirty ? '1' : '0';
    }

    function _readerCastEdit(value, previous) {
        if (value === '') return null;
        if (typeof previous === 'number') { const number = Number(value); return Number.isFinite(number) ? number : value; }
        if (typeof previous === 'boolean' && /^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
        if (previous && typeof previous === 'object') { try { return JSON.parse(value); } catch (_) { return value; } }
        return value;
    }

    function _readerVisibleFeatures() {
        if (!currentReaderEditor?.workingData?.features) return [];
        const search = String(currentReaderEditor.search || '').trim().toLowerCase();
        return currentReaderEditor.workingData.features.map((feature, index) => ({ feature, index })).filter(({ feature }) => {
            if (!search) return true;
            return Object.values(feature.properties || {}).some((value) => _readerCell(value).toLowerCase().includes(search));
        });
    }

    function _renderReaderDataTable() {
        if (!currentReaderEditor) return;
        const state = currentReaderEditor; const table = document.getElementById('reader-editor-preview-table'); const pagination = document.getElementById('reader-editor-pagination');
        if (!table || !pagination) return;
        table.innerHTML = '';
        const fields = state.fields || [];
        const entries = state.editable ? _readerVisibleFeatures() : (state.previewRows || []).map((properties, index) => ({ feature: { properties }, index }));
        if (!fields.length || !entries.length) { pagination.hidden = true; return; }
        const pageCount = Math.max(1, Math.ceil(entries.length / state.pageSize)); state.page = Math.min(Math.max(1, state.page || 1), pageCount);
        const rows = entries.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
        const head = document.createElement('thead'); const headRow = document.createElement('tr');
        if (state.editable) { const action = document.createElement('th'); action.textContent = ''; headRow.appendChild(action); }
        fields.forEach((field) => { const th = document.createElement('th'); th.textContent = field; headRow.appendChild(th); }); head.appendChild(headRow); table.appendChild(head);
        const body = document.createElement('tbody');
        rows.forEach(({ feature, index }) => {
            const tr = document.createElement('tr');
            if (state.editable) {
                const actionCell = document.createElement('td'); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn'; remove.dataset.readerDeleteRow = String(index); remove.title = 'Borrar fila'; remove.innerHTML = '<i class="fas fa-trash"></i>'; actionCell.appendChild(remove); tr.appendChild(actionCell);
            }
            fields.forEach((field) => {
                const td = document.createElement('td'); const value = feature.properties?.[field];
                if (state.editable) {
                    const input = document.createElement('input'); input.className = 'source-editor-cell'; input.value = value == null ? '' : _readerCell(value); input.dataset.readerRowIndex = String(index); input.dataset.readerField = field; input.setAttribute('aria-label', `${field}, fila ${index + 1}`); td.appendChild(input);
                } else { td.textContent = _readerCell(value); td.title = td.textContent; }
                tr.appendChild(td);
            }); body.appendChild(tr);
        }); table.appendChild(body);
        pagination.hidden = entries.length <= state.pageSize;
        const pageInfo = document.getElementById('reader-editor-page-info'); if (pageInfo) pageInfo.textContent = `Página ${state.page} / ${pageCount} · ${entries.length} filas`;
    }

    function _renderReaderPreview(result) {
        const schema = document.getElementById('reader-editor-schema'); const toolbar = document.getElementById('reader-editor-data-toolbar');
        if (!schema || !toolbar || !currentReaderEditor) return;
        Object.assign(currentReaderEditor, { featureCount: result.feature_count, geometryTypes: result.geometry_types || [], notice: result.notice || '', fields: result.fields || [], types: result.types || {}, previewRows: result.rows || [], editable: Boolean(result.editable), workingData: result.data ? _readerClone(result.data) : null, dirty: false, dirtyCount: 0, page: 1, search: '', persistedEdited: Boolean(result.edited) });
        const search = document.getElementById('reader-editor-search'); if (search) search.value = '';
        toolbar.hidden = !currentReaderEditor.editable;
        schema.innerHTML = ''; (result.fields || []).forEach((field) => { const chip = document.createElement('span'); chip.textContent = `${field}: ${result.types?.[field] || 'null'}`; schema.appendChild(chip); });
        const discard = toolbar.querySelector('[data-ui-action="reader-discard-edits"]'); if (discard) discard.hidden = !currentReaderEditor.persistedEdited;
        _readerEditorStatus(); _renderReaderDataTable();
    }

    async function refreshReaderEditorPreview() {
        if (!currentReaderEditor) return false;
        const { nodeId, name } = currentReaderEditor; const nodeEl = document.getElementById('node-' + nodeId); const definition = _readerEditorDefinition(name); const status = document.getElementById('reader-editor-preview-status');
        if (!nodeEl || !definition || !window.JETLReaderTools?.inspect) return false;
        if (status) status.textContent = 'Inspeccionando fuente…';
        try { _renderReaderPreview(await window.JETLReaderTools.inspect(nodeEl, name, _readerEditorFormConfig(definition))); return true; }
        catch (error) { if (status) status.textContent = `No se pudo inspeccionar: ${error.message}`; return false; }
    }

    function openReaderEditor(nodeId) {
        const node = _safeGetNode(nodeId).node; const definition = _readerEditorDefinition(node?.name); const nodeEl = document.getElementById('node-' + nodeId); const modal = document.getElementById('reader-editor-modal');
        if (!definition || !nodeEl || !modal) return false;
        currentReaderEditor = { nodeId: String(nodeId), name: node.name, page: 1, pageSize: 25, search: '', dirty: false, dirtyCount: 0 };
        document.getElementById('reader-editor-title').textContent = definition.title; document.getElementById('reader-editor-subtitle').textContent = definition.subtitle;
        const sourceInput = nodeEl.querySelector('[df-file]'); const picker = document.getElementById('reader-editor-file-input');
        if (picker) {
            picker.value = '';
            picker.accept = sourceInput?.accept || '';
            picker.multiple = sourceInput?.multiple !== false;
            picker.setAttribute('aria-label', `Cargar datos para ${definition.title}`);
        }
        const fields = document.getElementById('reader-editor-fields'); fields.innerHTML = ''; const config = _readerEditorConfig(nodeEl, definition);
        definition.fields.forEach((field) => fields.appendChild(_geometryTransformField(field, _geometryTransformGet(config, field.key))));
        _renderReaderEditorSources(nodeEl); modal.style.display = 'flex'; refreshReaderEditorPreview(); return true;
    }

    function _readerMarkDirty() {
        if (!currentReaderEditor) return; currentReaderEditor.dirty = true; currentReaderEditor.dirtyCount = (currentReaderEditor.dirtyCount || 0) + 1; _readerEditorStatus();
    }

    function addReaderEditorRow() {
        if (!currentReaderEditor?.editable || !currentReaderEditor.workingData) return false;
        const properties = Object.fromEntries((currentReaderEditor.fields || []).map((field) => [field, null]));
        currentReaderEditor.workingData.features.push({ type: 'Feature', geometry: null, properties }); currentReaderEditor.featureCount = currentReaderEditor.workingData.features.length; currentReaderEditor.page = Math.ceil(currentReaderEditor.featureCount / currentReaderEditor.pageSize); _readerMarkDirty(); _renderReaderDataTable(); return true;
    }

    function applyReaderEditorChanges() {
        if (!currentReaderEditor?.editable || !currentReaderEditor.workingData) return false;
        const nodeEl = document.getElementById('node-' + currentReaderEditor.nodeId); const storage = nodeEl?.querySelector('[df-reader-edited-data]'); if (!storage) return false;
        const data = _readerClone(currentReaderEditor.workingData); data.metadata = { ...(data.metadata || {}), edited_copy: true, source_mode: 'project_working_copy', feature_count: data.features.length };
        const serialized = JSON.stringify(data); const limits = window.JETLReaderTools?.editLimits || { features: 5000, chars: 2097152 };
        if (data.features.length > limits.features || serialized.length > limits.chars) { const status = document.getElementById('reader-editor-preview-status'); if (status) status.textContent = `No se puede aplicar: máximo ${limits.features} entidades y 2 MB por copia editable.`; return false; }
        _commitNodeControl(storage, serialized); currentReaderEditor.dirty = false; currentReaderEditor.dirtyCount = 0; currentReaderEditor.persistedEdited = true; currentReaderEditor.notice = 'Copia de trabajo aplicada; será la fuente de la próxima ejecución.';
        const discard = document.querySelector('#reader-editor-data-toolbar [data-ui-action="reader-discard-edits"]'); if (discard) discard.hidden = false;
        const summary = nodeEl.querySelector('[data-reader-file-summary]'); if (summary && !summary.textContent.includes('editada')) summary.textContent += ' · editada';
        _readerEditorStatus(); return true;
    }

    async function discardReaderEditorCopy() {
        if (!currentReaderEditor) return false; const nodeEl = document.getElementById('node-' + currentReaderEditor.nodeId); const storage = nodeEl?.querySelector('[df-reader-edited-data]');
        if (storage) _commitNodeControl(storage, '');
        const summary = nodeEl?.querySelector('[data-reader-file-summary]'); if (summary) { const files = _readerEditorSources(nodeEl); summary.textContent = files.length > 1 ? `${files.length} archivos` : files[0]?.name || 'Sin fuente'; }
        return await refreshReaderEditorPreview();
    }

    async function closeReaderEditor(save) {
        const modal = document.getElementById('reader-editor-modal'); if (!modal) return;
        if (save && currentReaderEditor) {
            if (currentReaderEditor.dirty && !applyReaderEditorChanges()) return;
            const { nodeId, name } = currentReaderEditor; const nodeEl = document.getElementById('node-' + nodeId); const definition = _readerEditorDefinition(name);
            if (nodeEl && definition) {
                const config = _readerEditorFormConfig(definition); _commitNodeControl(nodeEl.querySelector('[df-reader-config]'), JSON.stringify(config));
                const files = _readerEditorSources(nodeEl); const summary = nodeEl.querySelector('[data-reader-file-summary]'); if (summary) summary.textContent = files.length > 1 ? `${files.length} archivos` : files[0]?.name || 'Sin fuente';
            }
        }
        modal.style.display = 'none'; currentReaderEditor = null;
    }

    function updateGeometryTransformNode(nodeId) {
        const node = _safeGetNode(nodeId).node;
        const definition = GEOMETRY_TRANSFORM_EDITORS[node?.name];
        if (!definition) return;
        const nodeEl = document.getElementById('node-' + nodeId);
        if (nodeEl) _syncGeometryTransformSummary(nodeEl, definition, _readGeometryTransformConfig(nodeEl, definition));
    }

    function openGeometryTransformEditor(nodeId) {
        const node = _safeGetNode(nodeId).node;
        const definition = GEOMETRY_TRANSFORM_EDITORS[node?.name];
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('geometry-transform-editor-modal');
        if (!definition || !nodeEl || !modal) return false;
        const config = _readGeometryTransformConfig(nodeEl, definition);
        currentGeometryTransformEditor = { nodeId: String(nodeId), name: node.name };
        document.getElementById('geometry-transform-editor-title').textContent = definition.title;
        document.getElementById('geometry-transform-editor-subtitle').textContent = definition.subtitle;
        const fields = document.getElementById('geometry-transform-editor-fields');
        fields.innerHTML = '';
        definition.fields.forEach((field) => fields.appendChild(_geometryTransformField(field, _geometryTransformGet(config, field.key))));
        modal.style.display = 'flex';
        return true;
    }

    function closeGeometryTransformEditor(save) {
        const modal = document.getElementById('geometry-transform-editor-modal');
        if (!modal) return;
        if (save && currentGeometryTransformEditor) {
            const { nodeId, name } = currentGeometryTransformEditor;
            const definition = GEOMETRY_TRANSFORM_EDITORS[name];
            const nodeEl = document.getElementById('node-' + nodeId);
            if (definition && nodeEl) {
                // Preserve Desktop fields that Studio does not need to expose yet.
                // This keeps imported projects lossless after a mobile edit.
                const config = _readGeometryTransformConfig(nodeEl, definition);
                definition.fields.forEach((field) => {
                    const control = document.querySelector(`[data-geometry-transform-field="${field.key}"]`);
                    let value = field.type === 'checkbox' ? control.checked : field.type === 'number' ? Number(control.value) : control.value;
                    if (field.type === 'json') value = JSON.parse(control.value || '{}');
                    _geometryTransformSet(config, field.key, value);
                });
                _commitNodeControl(_geometryTransformStorage(nodeEl, definition), JSON.stringify(config));
                _syncGeometryTransformSummary(nodeEl, definition, config);
            }
        }
        modal.style.display = 'none';
        currentGeometryTransformEditor = null;
    }

    function updateNode(nodeId) {
        updateJoinNode(nodeId);
        updateCalcNode(nodeId);
        updateSorterNode(nodeId);
        updateRenamerNode(nodeId);
        updateKeeperNode(nodeId);
        updateCreatorNode(nodeId);
        updateStringFormatterNode(nodeId);
        updateMatcherNode(nodeId);
        updateStatsNode(nodeId);
        updateTesterNode(nodeId);
        updateAttributeTextNode(nodeId);
        updateStringReplacerNode(nodeId);
        updateAggregatorNode(nodeId);
        updateAttributeManagerNode(nodeId);
        updateGeometryTransformNode(nodeId);
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
            } else if (action === 'list-concat-open-editor') {
                evt.stopPropagation();
                openAttributeTextEditor(nodeId, 'list');
            } else if (action === 'substring-open-editor') {
                evt.stopPropagation();
                openAttributeTextEditor(nodeId, 'substring');
            } else if (action === 'splitter-open-editor') {
                evt.stopPropagation();
                openAttributeTextEditor(nodeId, 'splitter');
            } else if (action === 'list-exploder-open-editor') {
                evt.stopPropagation();
                openAttributeTextEditor(nodeId, 'exploder');
            } else if (action === 'strrep-open-editor') {
                evt.stopPropagation();
                openStringReplacerEditor(nodeId);
            } else if (action === 'aggregator-open-editor') {
                evt.stopPropagation();
                openAggregatorEditor(nodeId);
            } else if (action === 'attr-manager-open-editor') {
                evt.stopPropagation();
                openAttributeManagerEditor(nodeId, 'legacy');
            } else if (action === 'attr-manager-v2-open-editor') {
                evt.stopPropagation();
                openAttributeManagerEditor(nodeId, 'v2');
            } else if (action === 'keeper-open-editor') {
                evt.stopPropagation();
                openKeeperEditor(nodeId);
            } else if (action === 'creator-open-editor') {
                evt.stopPropagation();
                openCreatorEditor(nodeId);
            } else if (action === 'geom-transform-open-editor') {
                evt.stopPropagation();
                openGeometryTransformEditor(nodeId);
            } else if (action === 'reader-open-editor') {
                evt.stopPropagation();
                openReaderEditor(nodeId);
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
            else if (action === 'close-attribute-text-editor') closeAttributeTextEditor(false);
            else if (action === 'save-attribute-text-editor') closeAttributeTextEditor(true);
            else if (action === 'close-string-replacer-editor') closeStringReplacerEditor(false);
            else if (action === 'save-string-replacer-editor') closeStringReplacerEditor(true);
            else if (action === 'strrep-add-rule') document.getElementById('strrep-editor-rules')?.appendChild(_stringReplacerRuleRow());
            else if (action === 'strrep-remove-rule') evt.target.closest('.strrep-editor-rule')?.remove();
            else if (action === 'close-aggregator-editor') closeAggregatorEditor(false);
            else if (action === 'save-aggregator-editor') closeAggregatorEditor(true);
            else if (action === 'close-attribute-manager-editor') closeAttributeManagerEditor(false);
            else if (action === 'save-attribute-manager-editor') closeAttributeManagerEditor(true);
            else if (action === 'attribute-manager-add-rule' && currentAttributeManagerEditor) document.getElementById('attribute-manager-editor-rules')?.appendChild(_attributeManagerRuleRow({}, currentAttributeManagerEditor.version));
            else if (action === 'attribute-manager-remove-rule') evt.target.closest('.attr-manager-editor-rule')?.remove();
            else if (action === 'close-keeper-editor') closeKeeperEditor(false);
            else if (action === 'save-keeper-editor') closeKeeperEditor(true);
            else if (action === 'keeper-select-all') { document.querySelectorAll('#keeper-editor-fields [data-keeper-editor-field]').forEach((input) => { input.checked = true; }); _syncKeeperEditorCount(); }
            else if (action === 'keeper-select-none') { document.querySelectorAll('#keeper-editor-fields [data-keeper-editor-field]').forEach((input) => { input.checked = false; }); document.getElementById('keeper-editor-manual').value = ''; _syncKeeperEditorCount(); }
            else if (action === 'close-creator-editor') closeCreatorEditor(false);
            else if (action === 'save-creator-editor') closeCreatorEditor(true);
            else if (action === 'creator-add-rule') { document.getElementById('creator-editor-rules')?.appendChild(_creatorEditorRuleRow()); _syncCreatorEditorCount(); }
            else if (action === 'creator-import-fields') importCreatorFields();
            else if (evt.target.closest('[data-creator-remove-rule]')) { evt.target.closest('.creator-editor-rule')?.remove(); _syncCreatorEditorCount(); }
            else if (action === 'close-geometry-transform-editor') closeGeometryTransformEditor(false);
            else if (action === 'save-geometry-transform-editor') closeGeometryTransformEditor(true);
            else if (action === 'close-reader-editor') closeReaderEditor(false);
            else if (action === 'save-reader-editor') closeReaderEditor(true);
            else if (action === 'reader-refresh-preview') refreshReaderEditorPreview();
            else if (action === 'reader-add-row') addReaderEditorRow();
            else if (action === 'reader-apply-edits') applyReaderEditorChanges();
            else if (action === 'reader-discard-edits') discardReaderEditorCopy();
            else if (action === 'reader-prev-page' && currentReaderEditor) { currentReaderEditor.page = Math.max(1, currentReaderEditor.page - 1); _renderReaderDataTable(); }
            else if (action === 'reader-next-page' && currentReaderEditor) { currentReaderEditor.page += 1; _renderReaderDataTable(); }
            const deleteRow = evt.target.closest('[data-reader-delete-row]');
            if (deleteRow && currentReaderEditor?.editable) {
                const index = Number(deleteRow.dataset.readerDeleteRow); if (Number.isInteger(index) && currentReaderEditor.workingData?.features?.[index]) { currentReaderEditor.workingData.features.splice(index, 1); currentReaderEditor.featureCount = currentReaderEditor.workingData.features.length; _readerMarkDirty(); _renderReaderDataTable(); }
            }
        });

        document.addEventListener('dblclick', (evt) => {
            const nodeEl = evt.target.closest('.drawflow-node');
            if (nodeEl?.classList.contains('attr_calc_pro')) openCalcEditor(nodeEl.id.replace('node-', ''));
            else if (nodeEl?.classList.contains('attr_string_formatter')) openFormatterEditor(nodeEl.id.replace('node-', ''));
            else if (nodeEl?.classList.contains('attr_list_concatenator')) openAttributeTextEditor(nodeEl.id.replace('node-', ''), 'list');
            else if (nodeEl?.classList.contains('attr_substring')) openAttributeTextEditor(nodeEl.id.replace('node-', ''), 'substring');
            else if (nodeEl?.classList.contains('attr_splitter')) openAttributeTextEditor(nodeEl.id.replace('node-', ''), 'splitter');
            else if (nodeEl?.classList.contains('attr_list_exploder')) openAttributeTextEditor(nodeEl.id.replace('node-', ''), 'exploder');
            else if (nodeEl?.classList.contains('attr_string_replacer')) openStringReplacerEditor(nodeEl.id.replace('node-', ''));
            else if (nodeEl?.classList.contains('attr_aggregator')) openAggregatorEditor(nodeEl.id.replace('node-', ''));
            else if (nodeEl?.classList.contains('attr_manager_v2')) openAttributeManagerEditor(nodeEl.id.replace('node-', ''), 'v2');
            else if (nodeEl?.classList.contains('attr_manager')) openAttributeManagerEditor(nodeEl.id.replace('node-', ''), 'legacy');
            else if (nodeEl?.classList.contains('attr_keeper')) openKeeperEditor(nodeEl.id.replace('node-', ''));
            else if (nodeEl?.classList.contains('attr_creator')) openCreatorEditor(nodeEl.id.replace('node-', ''));
            else if (Object.keys(READER_EDITOR_DEFINITIONS).some((name) => nodeEl?.classList.contains(name))) openReaderEditor(nodeEl.id.replace('node-', ''));
            else if (Object.keys(GEOMETRY_TRANSFORM_EDITORS).some((name) => nodeEl?.classList.contains(name))) openGeometryTransformEditor(nodeEl.id.replace('node-', ''));
        });

        document.getElementById('strrep-editor-no-match')?.addEventListener('change', _syncStringReplacerNoMatch);

        document.addEventListener('change', (evt) => {
            if (evt.target.id === 'reader-editor-file-input') {
                if (!currentReaderEditor) return;
                const nodeEl = document.getElementById('node-' + currentReaderEditor.nodeId);
                const files = Array.from(evt.target.files || []).filter(Boolean);
                if (!nodeEl || !files.length) return;
                _readerFileStore().set(nodeEl, files);
                const sourceInput = nodeEl.querySelector('[df-file]');
                if (sourceInput) {
                    try { sourceInput.files = evt.target.files; } catch (_) { /* Safari usa el almacén temporal seguro. */ }
                }
                const editedStorage = nodeEl.querySelector('[df-reader-edited-data]');
                if (editedStorage?.value) _commitNodeControl(editedStorage, '');
                const summary = nodeEl.querySelector('[data-reader-file-summary]');
                if (summary) summary.textContent = files.length > 1 ? `${files.length} archivos` : files[0].name;
                _renderReaderEditorSources(nodeEl);
                const status = document.getElementById('reader-editor-preview-status');
                if (status) status.textContent = `${files.length} ${files.length === 1 ? 'archivo recibido' : 'archivos recibidos'} · preparando vista previa…`;
                refreshReaderEditorPreview();
                return;
            }
            const input = evt.target.closest('input[type="file"][df-file]');
            if (!input) return;
            const nodeEl = input.closest('.drawflow-node');
            if (nodeEl) _readerFileStore().set(nodeEl, Array.from(input.files || []).filter(Boolean));
            const summary = input.closest('.drawflow-node')?.querySelector('[data-reader-file-summary]');
            if (!summary) return;
            const files = Array.from(input.files || []);
            summary.textContent = files.length > 1 ? `${files.length} archivos` : files[0]?.name || 'Seleccionar archivo';
            const editedStorage = input.closest('.drawflow-node')?.querySelector('[df-reader-edited-data]'); if (editedStorage?.value) _commitNodeControl(editedStorage, '');
            if (currentReaderEditor && input.closest('.drawflow-node')?.id === 'node-' + currentReaderEditor.nodeId) {
                _renderReaderEditorSources(input.closest('.drawflow-node'));
                refreshReaderEditorPreview();
            }
        });

        document.addEventListener('input', (evt) => {
            if (evt.target.id === 'keeper-editor-manual') _syncKeeperEditorCount();
            if (evt.target.matches('#creator-editor-rules input, #creator-editor-rules select')) _syncCreatorEditorCount();
            if (evt.target.id === 'reader-editor-search' && currentReaderEditor) { currentReaderEditor.search = evt.target.value; currentReaderEditor.page = 1; _renderReaderDataTable(); return; }
            const cell = evt.target.closest('[data-reader-row-index][data-reader-field]');
            if (!cell || !currentReaderEditor?.editable) return;
            const index = Number(cell.dataset.readerRowIndex); const field = cell.dataset.readerField; const feature = currentReaderEditor.workingData?.features?.[index]; if (!feature || !field) return;
            feature.properties = feature.properties || {}; feature.properties[field] = _readerCastEdit(cell.value, feature.properties[field]); cell.classList.add('is-edited'); _readerMarkDirty();
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
            if (evt.target.matches('#keeper-editor-fields [data-keeper-editor-field]')) _syncKeeperEditorCount();
            if (evt.target.matches('#creator-editor-rules input, #creator-editor-rules select')) _syncCreatorEditorCount();
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
        insertCalcField,
        openCalcEditor,
        openFormatterEditor,
        openAttributeTextEditor,
        openStringReplacerEditor,
        openAggregatorEditor,
        openAttributeManagerEditor,
        openKeeperEditor,
        openCreatorEditor,
        openGeometryTransformEditor,
        openReaderEditor,
        refreshReaderEditorPreview,
        addReaderEditorRow,
        applyReaderEditorChanges,
        discardReaderEditorCopy
    };
})();

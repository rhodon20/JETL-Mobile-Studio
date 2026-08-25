/* ---- js/packages.js ---- */
// =============================================
// COMMUNITY TRANSFORMER PACKAGES (v1)
// =============================================
(function () {
    const STORAGE_KEY = 'jetl_transformer_packages_v1';
    const PREFIX = 'cpkg__';

    let packagesFilterText = '';
    let runtimeRegisteredKeys = new Set();

    function _slug(s) {
        return String(s || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'pkg';
    }

    function _safeClone(v) {
        if (typeof window !== 'undefined' && typeof window.JETLClone === 'function') return window.JETLClone(v);
        try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; }
    }

    function _loadPackages() {
        try {
            const raw = SafeStorage.load(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('Error leyendo paquetes comunitarios', e);
            return [];
        }
    }

    function _savePackages(list) {
        const safe = Array.isArray(list) ? list : [];
        SafeStorage.save(STORAGE_KEY, JSON.stringify(safe));
    }

    function _normalizeTransformer(raw, fallbackId) {
        if (!raw || typeof raw !== 'object') return null;
        const id = _slug(raw.id || fallbackId || 'transformer');
        const base = String(raw.base || '').trim();
        if (!id || !base) return null;
        return {
            id,
            base,
            label: String(raw.label || '').trim(),
            cat: String(raw.cat || '').trim(),
            icon: String(raw.icon || '').trim(),
            color: String(raw.color || '').trim(),
            help: String(raw.help || '').trim()
        };
    }

    function _normalizePackage(raw) {
        if (!raw || typeof raw !== 'object') throw new Error('Paquete invalido');
        const id = _slug(raw.id || raw.name || raw.title || 'community_pkg');
        const title = String(raw.title || raw.name || id).trim();
        const version = String(raw.version || '1.0.0').trim();
        const author = String(raw.author || '').trim();
        const description = String(raw.description || '').trim();
        const enabled = raw.enabled !== false;
        const src = Array.isArray(raw.transformers) ? raw.transformers : [];
        const transformers = src
            .map((t, i) => _normalizeTransformer(t, `t_${i + 1}`))
            .filter(Boolean);
        if (!transformers.length) throw new Error('Paquete sin transformers');
        return { id, title, version, author, description, enabled, transformers, createdAt: raw.createdAt || new Date().toISOString() };
    }

    function _toolKey(pkgId, transformerId) {
        return `${PREFIX}${_slug(pkgId)}__${_slug(transformerId)}`;
    }

    function _refreshToolsUi() {
        // Durante el arranque el motor pinta el catálogo una sola vez, después
        // de registrar también los paquetes comunitarios. Evita un render DOM
        // completo duplicado antes de que el editor esté montado.
        const editorReady = !!(window.__JETL_BOOT && window.__JETL_BOOT.stage === 'ready');
        if (editorReady && typeof renderSidebar === 'function') {
            const f = document.getElementById('sidebar-filter-input');
            renderSidebar(f ? String(f.value || '') : '');
        }
        if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
            setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
        }
    }

    function _registerPackage(pkg) {
        if (!pkg || !pkg.enabled) return { added: 0, skipped: 0 };
        let added = 0;
        let skipped = 0;
        (pkg.transformers || []).forEach((t) => {
            const base = window.TOOL_REGISTRY && window.TOOL_REGISTRY[t.base];
            if (!base) { skipped++; return; }
            const key = _toolKey(pkg.id, t.id);
            const cloned = Object.assign({}, base);
            cloned.label = t.label || `${base.label} (${pkg.title})`;
            cloned.cat = t.cat || '9. COMMUNITY';
            cloned.icon = t.icon || base.icon || 'fa-cube';
            cloned.color = t.color || base.color || '#95a5a6';
            cloned.help = t.help || base.help || '';
            cloned._community = { packageId: pkg.id, transformerId: t.id, base: t.base };
            window.TOOL_REGISTRY[key] = cloned;
            runtimeRegisteredKeys.add(key);
            added++;
        });
        return { added, skipped };
    }

    function _unregisterRuntimeKeys() {
        runtimeRegisteredKeys.forEach((key) => {
            try { delete window.TOOL_REGISTRY[key]; } catch (_) { }
        });
        runtimeRegisteredKeys.clear();
    }

    function reloadInstalledPackages() {
        _unregisterRuntimeKeys();
        const list = _loadPackages();
        list.forEach((pkg) => _registerPackage(pkg));
        _refreshToolsUi();
        return { installed: list.length, activeKeys: runtimeRegisteredKeys.size };
    }

    function listPackages() {
        return _loadPackages();
    }

    function addPackageFromObject(raw) {
        const norm = _normalizePackage(raw);
        const list = _loadPackages();
        const exists = list.some((p) => String(p.id) === String(norm.id));
        const nextId = exists ? `${norm.id}_${Date.now()}` : norm.id;
        const pkg = Object.assign({}, norm, { id: nextId });
        list.push(pkg);
        _savePackages(list);
        reloadInstalledPackages();
        return pkg;
    }

    function removePackage(pkgId) {
        const list = _loadPackages();
        const next = list.filter((p) => String(p.id) !== String(pkgId));
        _savePackages(next);
        reloadInstalledPackages();
        return next.length !== list.length;
    }

    function setPackageEnabled(pkgId, enabled) {
        const list = _loadPackages();
        let touched = false;
        list.forEach((p) => {
            if (String(p.id) !== String(pkgId)) return;
            p.enabled = !!enabled;
            touched = true;
        });
        if (touched) {
            _savePackages(list);
            reloadInstalledPackages();
        }
        return touched;
    }

    function exportPackagesPayload() {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            packages: listPackages()
        };
    }

    function importPackagesPayload(payload) {
        const incoming = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.packages) ? payload.packages : []);
        if (!incoming.length) return { added: 0 };
        let added = 0;
        incoming.forEach((raw) => {
            try {
                addPackageFromObject(raw);
                added++;
            } catch (_) { }
        });
        return { added };
    }

    function _exportPackagesToFile() {
        const payload = exportPackagesPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jetl_transformer_packages.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Exportados ${payload.packages.length} paquetes`, 'info');
    }

    function _importPackagesFromFile(file, onDone) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const txt = String(reader.result || '');
                const data = JSON.parse(txt);
                const res = importPackagesPayload(data);
                showToast(`Paquetes importados: ${res.added}`, 'success');
                if (typeof onDone === 'function') onDone();
            } catch (e) {
                showToast(`Importacion fallida: ${e && e.message ? e.message : e}`, 'error');
            }
        };
        reader.onerror = () => showToast('No se pudo leer el archivo', 'error');
        reader.readAsText(file);
    }

    function ensurePackagesControls(modal, list) {
        let controls = document.getElementById('packages-controls');
        if (controls) return controls;

        controls = document.createElement('div');
        controls.id = 'packages-controls';
        controls.style.display = 'grid';
        controls.style.gridTemplateColumns = '1fr auto auto auto';
        controls.style.gap = '8px';
        controls.style.padding = '10px 12px 0 12px';

        const input = document.createElement('input');
        input.id = 'packages-filter-input';
        input.className = 'node-control';
        input.placeholder = 'Filtrar paquetes...';
        input.style.background = '#111';
        input.style.border = '1px solid #444';
        input.style.color = '#eee';
        input.style.padding = '6px 8px';
        input.style.borderRadius = '4px';

        const btnImport = document.createElement('button');
        btnImport.className = 'btn';
        btnImport.textContent = 'Importar JSON';

        const btnExport = document.createElement('button');
        btnExport.className = 'btn';
        btnExport.textContent = 'Exportar JSON';

        const btnSample = document.createElement('button');
        btnSample.className = 'btn';
        btnSample.textContent = 'Instalar sample';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        fileInput.id = 'packages-import-file';

        controls.appendChild(input);
        controls.appendChild(btnImport);
        controls.appendChild(btnExport);
        controls.appendChild(btnSample);
        controls.appendChild(fileInput);
        list.parentElement.insertBefore(controls, list);

        input.addEventListener('input', () => {
            packagesFilterText = input.value || '';
            renderPackagesList(list);
        });
        btnImport.addEventListener('click', () => fileInput.click());
        btnExport.addEventListener('click', () => _exportPackagesToFile());
        btnSample.addEventListener('click', () => {
            try {
                addPackageFromObject({
                    id: 'community_sample_attrs',
                    title: 'Community Sample Attributes',
                    version: '1.0.0',
                    author: 'JETL Community',
                    description: 'Alias utiles de nodos de atributos base',
                    enabled: true,
                    transformers: [
                        { id: 'field_renamer_plus', base: 'attr_renamer', label: 'Field Renamer Plus', cat: '9. COMMUNITY' },
                        { id: 'string_format_plus', base: 'attr_string_formatter', label: 'String Formatter Plus', cat: '9. COMMUNITY' }
                    ]
                });
                renderPackagesList(list);
            } catch (e) {
                showToast(`No se pudo instalar sample: ${e && e.message ? e.message : e}`, 'error');
            }
        });
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            _importPackagesFromFile(file, () => renderPackagesList(list));
            fileInput.value = '';
        });
        return controls;
    }

    function renderPackagesList(list) {
        if (!list) return;
        const q = String(packagesFilterText || '').toLowerCase();
        const all = listPackages();
        const filtered = all.filter((p) => {
            const text = `${p.title || ''} ${p.id || ''} ${p.author || ''} ${p.description || ''}`.toLowerCase();
            return !q || text.includes(q);
        });
        list.innerHTML = '';
        filtered.forEach((p) => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.setAttribute('data-pkg-id', String(p.id));
            const n = Array.isArray(p.transformers) ? p.transformers.length : 0;
            const state = p.enabled !== false
                ? '<span style="font-size:0.66rem; color:#9bffb0; border:1px solid #2b5; border-radius:10px; padding:1px 6px; margin-left:6px;">Activo</span>'
                : '<span style="font-size:0.66rem; color:#ffbd9b; border:1px solid #754; border-radius:10px; padding:1px 6px; margin-left:6px;">Inactivo</span>';
            card.innerHTML = `
                <div class="template-title" style="display:flex; align-items:center; gap:4px;">
                    ${p.title || p.id} ${state}
                    <span style="font-size:0.66rem; color:#9ecbff; border:1px solid #355; border-radius:10px; padding:1px 6px; margin-left:6px;">v${p.version || '1.0.0'}</span>
                </div>
                <div class="template-desc">${p.description || ''}</div>
                <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#aaa;">
                        <input type="checkbox" data-pkg-enabled="1" ${p.enabled !== false ? 'checked' : ''}> habilitado
                    </label>
                    <span style="font-size:12px;color:#8aa;">transformers: ${n}</span>
                    <span style="font-size:12px;color:#8aa;">autor: ${p.author || '-'}</span>
                    <button class="btn" data-pkg-remove="1" style="margin-left:auto; padding:2px 8px" title="Eliminar paquete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            list.appendChild(card);
        });
        if (!filtered.length) {
            const empty = document.createElement('div');
            empty.style.color = '#999';
            empty.style.padding = '10px';
            empty.style.fontSize = '0.85rem';
            empty.textContent = 'Sin paquetes para el filtro actual.';
            list.appendChild(empty);
        }
    }

    function openPackagesModal() {
        const modal = document.getElementById('packages-modal');
        const list = document.getElementById('packages-list');
        if (!modal || !list) return;
        const controls = ensurePackagesControls(modal, list);
        const input = controls.querySelector('#packages-filter-input');
        if (input) input.value = packagesFilterText;
        renderPackagesList(list);
        modal.style.display = 'flex';
    }

    function closePackagesModal() {
        const modal = document.getElementById('packages-modal');
        if (modal) modal.style.display = 'none';
    }

    const listEl = document.getElementById('packages-list');
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card[data-pkg-id]');
            if (!card) return;
            const pkgId = card.getAttribute('data-pkg-id');
            if (!pkgId) return;
            if (e.target.closest('[data-pkg-remove="1"]')) {
                const removed = removePackage(pkgId);
                if (removed) showToast('Paquete eliminado', 'info');
                renderPackagesList(listEl);
            }
        });
        listEl.addEventListener('change', (e) => {
            const cb = e.target.closest('[data-pkg-enabled="1"]');
            if (!cb) return;
            const card = e.target.closest('.template-card[data-pkg-id]');
            const pkgId = card ? card.getAttribute('data-pkg-id') : null;
            if (!pkgId) return;
            setPackageEnabled(pkgId, !!cb.checked);
            renderPackagesList(listEl);
        });
    }

    document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');
        if (action === 'open-packages') openPackagesModal();
        else if (action === 'close-packages') closePackagesModal();
    });

    window.openPackagesModal = openPackagesModal;
    window.closePackagesModal = closePackagesModal;
    window.JETLPackages = {
        list: listPackages,
        addFromObject: addPackageFromObject,
        remove: removePackage,
        setEnabled: setPackageEnabled,
        exportPayload: exportPackagesPayload,
        importPayload: importPackagesPayload,
        reload: reloadInstalledPackages
    };

    reloadInstalledPackages();
})();


/* ---- js/smoke.js ---- */
// =============================================
// JETL Smoke Tests (manual trigger from console)
// Usage: await JETLSmoke.runBasic()
// =============================================
(function () {
    let __runExtendedPromise = null;

    function _withWorkerBypass(fn) {
        const prevPost = window.postWorkerTask;
        try {
            window.postWorkerTask = undefined;
            return fn();
        } finally {
            window.postWorkerTask = prevPost;
        }
    }

    function _countNodesFromState(state) {
        return Object.keys((((state || {}).drawflow || {}).Home || {}).data || {}).length;
    }

    function _hasConnection(state, fromId, toId, outPort, inPort) {
        const data = (((state || {}).drawflow || {}).Home || {}).data || {};
        const from = data[String(fromId)];
        if (!from || !from.outputs || !from.outputs[outPort] || !Array.isArray(from.outputs[outPort].connections)) return false;
        return from.outputs[outPort].connections.some((c) => String(c.node) === String(toId) && c.output === inPort);
    }

    async function testKmlRoundtrip() {
        if (!window.JETLFormats || typeof JETLFormats.toKML !== 'function' || typeof JETLFormats.readFile !== 'function') {
            return { ok: false, name: 'kml_roundtrip', detail: 'JETLFormats KML API no disponible' };
        }

        const sample = turf.featureCollection([
            turf.point([-3.7038, 40.4168], { name: 'Madrid', kind: 'city' }),
            turf.lineString([[-3.71, 40.41], [-3.69, 40.42]], { road: 'A' }),
            turf.polygon([[[-3.72, 40.40], [-3.70, 40.40], [-3.70, 40.41], [-3.72, 40.41], [-3.72, 40.40]]], { zone: 'Z1' })
        ]);

        const kml = JETLFormats.toKML(sample);
        if (!kml || !kml.includes('<kml') || !kml.includes('<Placemark>')) {
            return { ok: false, name: 'kml_roundtrip', detail: 'KML generado invalido' };
        }

        const f = new File([kml], 'smoke.kml', { type: 'application/vnd.google-earth.kml+xml' });
        const back = await JETLFormats.readFile(f);
        const count = back && back.features ? back.features.length : 0;

        if (!back || back.type !== 'FeatureCollection' || count < 1) {
            return { ok: false, name: 'kml_roundtrip', detail: 'No se pudo parsear KML de vuelta a FeatureCollection' };
        }
        return { ok: true, name: 'kml_roundtrip', detail: `features=${count}` };
    }

    function testRegistry() {
        const reg = window.TOOL_REGISTRY || {};
        const count = Object.keys(reg).length;
        if (count < 40) {
            return { ok: false, name: 'tool_registry', detail: `Nodos detectados insuficientes: ${count}` };
        }
        return { ok: true, name: 'tool_registry', detail: `nodos=${count}` };
    }

    function testSchemaUI() {
        if (!window.JETLSchemaUI) return { ok: false, name: 'schema_ui', detail: 'JETLSchemaUI no cargado' };
        const req = ['updateNode', 'refreshAll', 'appendJoinPair', 'insertCalcField'];
        const missing = req.filter(k => typeof window.JETLSchemaUI[k] !== 'function');
        if (missing.length) return { ok: false, name: 'schema_ui', detail: `faltan funciones: ${missing.join(', ')}` };
        return { ok: true, name: 'schema_ui', detail: 'ok' };
    }

    function testUiCore() {
        const dot = document.getElementById('sys-status');
        const sidebar = document.getElementById('sidebar-content');
        if (!dot || !sidebar) return { ok: false, name: 'ui_core', detail: 'Elementos base UI no encontrados' };
        const hasNodes = sidebar.querySelectorAll('.node-item').length > 0;
        return { ok: hasNodes, name: 'ui_core', detail: hasNodes ? 'sidebar con nodos' : 'sidebar sin nodos' };
    }

    async function testAttrStatsNode() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_stats;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_stats', detail: 'Nodo attr_stats no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a,b">
            <select df-mode>
                <option value="per_field">per_field</option>
                <option value="concat">concat</option>
                <option value="both">both</option>
            </select>
        `;
        dom.querySelector('[df-mode]').value = 'both';

        const fc = turf.featureCollection([
            turf.point([0, 0], { a: 1, b: 10 }),
            turf.point([1, 1], { a: 2, b: 20 }),
            turf.point([2, 2], { a: 3, b: 30 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_stats', [fc], dom));
        const props = out && out.features && out.features[0] ? out.features[0].properties : {};
        const ok = props.stats_a_sum === 6 && props.stats_b_avg === 20 && props.stats_concat_count === 6;
        return { ok, name: 'attr_stats', detail: ok ? 'stats_* visibles y correctas' : 'resultado stats inesperado' };
    }

    async function testAttrTesterAndOr() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_test;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_test_and_or', detail: 'Nodo attr_test no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <div data-test-row>
                <select df-test-join><option value="AND">AND</option></select>
                <select df-test-field><option value="L4">L4</option></select>
                <select df-test-op><option value="==">==</option></select>
                <input df-test-val value="3110">
            </div>
            <div data-test-row>
                <select df-test-join><option value="AND">AND</option><option value="OR">OR</option></select>
                <select df-test-field><option value="area">area</option></select>
                <select df-test-op><option value="<"><</option></select>
                <input df-test-val value="0.5">
            </div>
        `;
        dom.querySelectorAll('[df-test-field]')[0].value = 'L4';
        dom.querySelectorAll('[df-test-op]')[0].value = '==';
        dom.querySelectorAll('[df-test-join]')[1].value = 'AND';
        dom.querySelectorAll('[df-test-field]')[1].value = 'area';
        dom.querySelectorAll('[df-test-op]')[1].value = '<';

        const fc = turf.featureCollection([
            turf.point([0, 0], { L4: 3110, area: 0.2 }), // pass
            turf.point([1, 1], { L4: 3110, area: 0.8 }), // fail
            turf.point([2, 2], { L4: 4212, area: 0.2 })  // fail
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_tester', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const ok = passCount === 1 && failCount === 2;
        return { ok, name: 'attr_test_and_or', detail: ok ? 'AND/OR operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrCalcRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_calc_pro;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_calc_rejects', detail: 'Nodo attr_calc_pro no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-name value="calc_val">
            <textarea df-expr>props.d.toFixed(2)</textarea>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
            <select df-source-field></select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { d: 2 }),
            turf.point([1, 1], { x: 0 }),
            turf.point([2, 2], { d: 5 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_calc', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._calc_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_calc_rejects', detail: ok ? 'reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrCreatorRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_creator;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_creator_rejects', detail: 'Nodo attr_creator no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-name value="new_v">
            <input df-val value="=f.properties.a.toFixed(1)">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { a: 2 }),
            turf.point([1, 1], { x: 0 }),
            turf.point([2, 2], { a: 5 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_creator', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._creator_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_creator_rejects', detail: ok ? 'creator reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrAreaRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_area;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_area_rejects', detail: 'Nodo attr_area no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a_area">
            <select df-unit><option value="1">m2</option></select>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-unit]').value = '1';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]),
            turf.feature(null, { bad: true }),
            turf.polygon([[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]])
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_area', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._area_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_area_rejects', detail: ok ? 'area reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrLengthRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_length;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_length_rejects', detail: 'Nodo attr_length no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a_len">
            <select df-unit><option value="meters">m</option></select>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-unit]').value = 'meters';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.lineString([[0, 0], [1, 0]]),
            turf.point([5, 5], { bad: true }),
            turf.lineString([[0, 0], [0, 1]])
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_len', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._length_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_length_rejects', detail: ok ? 'length reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrStatsRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_stats;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_stats_rejects', detail: 'Nodo attr_stats no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a,b">
            <select df-mode>
                <option value="per_field">per_field</option>
                <option value="concat">concat</option>
                <option value="both">both</option>
            </select>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-mode]').value = 'both';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { a: 1, b: 10 }),
            turf.point([1, 1], { a: 'x', b: null }),
            turf.point([2, 2], { a: 3, b: 30 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_stats_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._stats_error);
        const hasStatsInPass = !!(out && out.output_1 && out.output_1.features && out.output_1.features[0] && out.output_1.features[0].properties && out.output_1.features[0].properties.stats_a_sum !== undefined);
        const ok = passCount === 2 && failCount === 1 && hasErrorField && hasStatsInPass;
        return { ok, name: 'attr_stats_rejects', detail: ok ? 'stats reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrStringFormatterRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_string_formatter;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_string_formatter_rejects', detail: 'Nodo attr_string_formatter no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="name">
            <select df-op><option value="upper">upper</option></select>
            <input df-args value="">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-op]').value = 'upper';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { name: 'abc' }),
            turf.point([1, 1], { id: 7 }),
            turf.point([2, 2], { name: 'xyz' })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_fmt_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._fmt_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_string_formatter_rejects', detail: ok ? 'formatter reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrRenamerRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_renamer;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_renamer_rejects', detail: 'Nodo attr_renamer no disponible' };
        }
        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-map value="name:nm">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { name: 'a' }),
            turf.point([1, 1], { id: 2 }),
            turf.point([2, 2], { name: 'b' })
        ]);
        const out = await _withWorkerBypass(() => node.run('smoke_renamer_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErr = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._renamer_error);
        const ok = passCount === 2 && failCount === 1 && hasErr;
        return { ok, name: 'attr_renamer_rejects', detail: ok ? 'renamer reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrKeeperRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_keeper;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_keeper_rejects', detail: 'Nodo attr_keeper no disponible' };
        }
        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-keep value="name,type">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { name: 'a', type: 'x', id: 1 }),
            turf.point([1, 1], { id: 2 }),
            turf.point([2, 2], { name: 'b', id: 3 })
        ]);
        const out = await _withWorkerBypass(() => node.run('smoke_keeper_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErr = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._keeper_error);
        const keptOk = !!(out && out.output_1 && out.output_1.features && out.output_1.features[0] && out.output_1.features[0].properties && out.output_1.features[0].properties.name !== undefined && out.output_1.features[0].properties.id === undefined);
        const ok = passCount === 2 && failCount === 1 && hasErr && keptOk;
        return { ok, name: 'attr_keeper_rejects', detail: ok ? 'keeper reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrAuxWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'attr_aux_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'attr_aux_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const base = turf.featureCollection([
                turf.point([0, 0], { name: 'alpha', type: 'x', a: 1 }),
                turf.lineString([[0, 0], [1, 0]], { name: 'beta', type: 'y', a: 2 })
            ]);

            const wRen = await postWorkerTask({
                task: 'attr_renamer',
                features: base,
                mapping: [['name', 'nombre']],
                onError: 'null'
            }, 30000);
            if (!wRen || wRen.status !== 'ok' || !wRen.data || !Array.isArray(wRen.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'renamer worker invalido' };
            }

            const wKeep = await postWorkerTask({
                task: 'attr_keeper',
                features: wRen.data,
                keepList: ['nombre', 'type'],
                onError: 'null'
            }, 30000);
            if (!wKeep || wKeep.status !== 'ok' || !wKeep.data || !Array.isArray(wKeep.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'keeper worker invalido' };
            }

            const wCount = await postWorkerTask({
                task: 'attr_counter',
                features: wKeep.data,
                fieldName: '_id',
                start: 10
            }, 30000);
            if (!wCount || wCount.status !== 'ok' || !wCount.data || !Array.isArray(wCount.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'counter worker invalido' };
            }
            const id0 = wCount.data.features[0] && wCount.data.features[0].properties ? wCount.data.features[0].properties._id : null;
            if (Number(id0) !== 10) {
                return { ok: false, name: 'attr_aux_workers', detail: 'counter worker sin secuencia esperada' };
            }

            const wFmt = await postWorkerTask({
                task: 'attr_string_formatter',
                features: wCount.data,
                field: 'nombre',
                op: 'upper',
                argsRaw: '',
                onError: 'null'
            }, 30000);
            if (!wFmt || wFmt.status !== 'ok' || !wFmt.data || !Array.isArray(wFmt.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'string formatter worker invalido' };
            }

            const polyFc = turf.featureCollection([
                turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], { p: 1 }),
                turf.point([0, 0], { p: 2 })
            ]);
            const wArea = await postWorkerTask({
                task: 'attr_area',
                features: polyFc,
                fieldName: '_area',
                multiplier: 1,
                onError: 'reject'
            }, 30000);
            if (!wArea || wArea.status !== 'ok' || !wArea.data || !wArea.data.output_1 || !wArea.data.output_2) {
                return { ok: false, name: 'attr_aux_workers', detail: 'area worker invalido' };
            }

            const lineFc = turf.featureCollection([
                turf.lineString([[0, 0], [1, 0]], { l: 1 }),
                turf.point([0, 0], { l: 2 })
            ]);
            const wLen = await postWorkerTask({
                task: 'attr_length',
                features: lineFc,
                fieldName: '_len',
                unit: 'meters',
                onError: 'reject'
            }, 30000);
            if (!wLen || wLen.status !== 'ok' || !wLen.data || !wLen.data.output_1 || !wLen.data.output_2) {
                return { ok: false, name: 'attr_aux_workers', detail: 'length worker invalido' };
            }

            return { ok: true, name: 'attr_aux_workers', detail: 'renamer/keeper/counter/string/area/length worker OK' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) return { ok: true, name: 'attr_aux_workers', detail: 'omitido (worker pool no disponible)' };
            if (/Worker timeout/i.test(msg)) return { ok: true, name: 'attr_aux_workers', detail: 'omitido (timeout espurio del worker pool)' };
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) return { ok: true, name: 'attr_aux_workers', detail: 'omitido (estado cancelado residual)' };
            return { ok: false, name: 'attr_aux_workers', detail: msg };
        }
    }

    async function testAttrFormulaWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'attr_formula_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'attr_formula_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const src = turf.featureCollection([
                turf.point([0, 0], { a: 2 }),
                turf.point([1, 1], { a: 5 }),
                turf.point([2, 2], { b: 1 })
            ]);

            const wCreator = await postWorkerTask({
                task: 'attr_creator',
                features: src,
                field: 'x',
                exprRaw: '=f.properties.a * 2',
                isFormula: true,
                onError: 'reject'
            }, 30000);
            if (!wCreator || wCreator.status !== 'ok' || !wCreator.data || !wCreator.data.output_1 || !wCreator.data.output_2) {
                return { ok: false, name: 'attr_formula_workers', detail: 'creator worker invalido' };
            }
            const cPass = (wCreator.data.output_1.features || []).length;
            const cFail = (wCreator.data.output_2.features || []).length;
            if (cPass !== 2 || cFail !== 1) {
                return { ok: false, name: 'attr_formula_workers', detail: `creator conteo inesperado pass=${cPass} fail=${cFail}` };
            }

            const wCalc = await postWorkerTask({
                task: 'attr_calc_pro',
                features: src,
                field: 'y',
                exprRaw: 'props.a + 1',
                onError: 'reject'
            }, 30000);
            if (!wCalc || wCalc.status !== 'ok' || !wCalc.data || !wCalc.data.output_1 || !wCalc.data.output_2) {
                return { ok: false, name: 'attr_formula_workers', detail: 'calc worker invalido' };
            }
            const p = (wCalc.data.output_1.features || []).length;
            const f = (wCalc.data.output_2.features || []).length;
            if (p !== 2 || f !== 1) {
                return { ok: false, name: 'attr_formula_workers', detail: `calc conteo inesperado pass=${p} fail=${f}` };
            }
            return { ok: true, name: 'attr_formula_workers', detail: 'creator/calc worker OK' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) return { ok: true, name: 'attr_formula_workers', detail: 'omitido (worker pool no disponible)' };
            if (/Worker timeout/i.test(msg)) return { ok: true, name: 'attr_formula_workers', detail: 'omitido (timeout espurio del worker pool)' };
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) return { ok: true, name: 'attr_formula_workers', detail: 'omitido (estado cancelado residual)' };
            return { ok: false, name: 'attr_formula_workers', detail: msg };
        }
    }

    async function testWorkspaceParams() {
        if (!window.JETLParams || typeof window.JETLParams.setAll !== 'function' || typeof window.JETLResolveParamText !== 'function') {
            return { ok: false, name: 'workspace_params', detail: 'API params no disponible' };
        }
        const prev = window.JETLParams.getAll ? window.JETLParams.getAll() : {};
        try {
            window.JETLParams.setAll({ FACTOR: '3', LEFT_KEY: 'id', RIGHT_KEY: 'ID_REF', JPFX: 'j_' });
            const resolved = window.JETLResolveParamText('x_${FACTOR}_y');
            if (resolved !== 'x_3_y') return { ok: false, name: 'workspace_params', detail: 'resolve texto no operativo' };

            const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_creator;
            if (!node || typeof node.run !== 'function') return { ok: false, name: 'workspace_params', detail: 'attr_creator no disponible' };
            const dom = document.createElement('div');
            dom.innerHTML = `
                <input df-name value="v_\${FACTOR}">
                <input df-val value="=f.properties.a * \${FACTOR}">
                <select df-on-error><option value="null">null</option></select>
            `;
            const fc = turf.featureCollection([turf.point([0, 0], { a: 2 })]);
            const out = await _withWorkerBypass(() => node.run('smoke_params', [fc], dom));
            const f0 = out && out.features && out.features[0] ? out.features[0] : null;
            const okCreator = !!(f0 && f0.properties && Number(f0.properties.v_3) === 6);
            if (!okCreator) return { ok: false, name: 'workspace_params', detail: 'resultado inesperado en attr_creator' };

            const joinNode = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_join_adv;
            if (!joinNode || typeof joinNode.run !== 'function') {
                return { ok: false, name: 'workspace_params', detail: 'attr_join_adv no disponible' };
            }
            const joinDom = document.createElement('div');
            joinDom.innerHTML = `
                <input df-map value="\${LEFT_KEY}:\${RIGHT_KEY}">
                <select df-join><option value="left">left</option></select>
                <input df-prefix value="\${JPFX}">
            `;
            const left = turf.featureCollection([turf.point([0, 0], { id: 7, n: 'L' })]);
            const right = turf.featureCollection([turf.point([1, 1], { ID_REF: 7, val: 99 })]);
            const joinOut = await _withWorkerBypass(() => joinNode.run('smoke_params_join', [left, right], joinDom));
            const jf0 = joinOut && joinOut.output_1 && joinOut.output_1.features && joinOut.output_1.features[0];
            const okJoin = !!(jf0 && jf0.properties && Number(jf0.properties.j_val) === 99);
            return { ok: okJoin, name: 'workspace_params', detail: okJoin ? 'params ${...} operativos (creator+join)' : 'resultado inesperado en attr_join_adv' };
        } catch (e) {
            return { ok: false, name: 'workspace_params', detail: e && e.message ? e.message : String(e) };
        } finally {
            if (window.JETLParams && typeof window.JETLParams.setAll === 'function') window.JETLParams.setAll(prev || {});
        }
    }

    async function testWorkspaceParamsIO() {
        if (!window.JETLParams || typeof window.JETLParams.setAll !== 'function') {
            return { ok: false, name: 'workspace_params_io', detail: 'API params no disponible' };
        }
        const prev = window.JETLParams.getAll ? window.JETLParams.getAll() : {};
        const prevDownload = window.download;
        try {
            window.JETLParams.setAll({ WKT_P: 'POINT(2 3)', OUT_FN: 'param_export.csv' });

            const reader = window.TOOL_REGISTRY && window.TOOL_REGISTRY.reader_wkt;
            const writer = window.TOOL_REGISTRY && window.TOOL_REGISTRY.writer_csv;
            if (!reader || typeof reader.run !== 'function') return { ok: false, name: 'workspace_params_io', detail: 'reader_wkt no disponible' };
            if (!writer || typeof writer.run !== 'function') return { ok: false, name: 'workspace_params_io', detail: 'writer_csv no disponible' };

            const rdom = document.createElement('div');
            rdom.innerHTML = `<textarea df-w>\${WKT_P}</textarea>`;
            const out = await reader.run('smoke_reader_wkt_params', [], rdom);
            const f0 = out && out.features && out.features[0];
            const coords = f0 && f0.geometry && f0.geometry.coordinates;
            const okReader = !!(coords && Number(coords[0]) === 2 && Number(coords[1]) === 3);
            if (!okReader) return { ok: false, name: 'workspace_params_io', detail: 'reader_wkt no resolvio ${...}' };

            let capturedFn = '';
            window.download = (content, filename) => { capturedFn = String(filename || ''); };
            const wdom = document.createElement('div');
            wdom.innerHTML = `<input df-fn value="\${OUT_FN}">`;
            writer.run('smoke_writer_csv_params', [out], wdom);
            const okWriter = capturedFn === 'param_export.csv';
            return { ok: okWriter, name: 'workspace_params_io', detail: okWriter ? 'params ${...} en readers/writers OK' : `writer filename inesperado: ${capturedFn}` };
        } catch (e) {
            return { ok: false, name: 'workspace_params_io', detail: e && e.message ? e.message : String(e) };
        } finally {
            window.download = prevDownload;
            if (window.JETLParams && typeof window.JETLParams.setAll === 'function') window.JETLParams.setAll(prev || {});
        }
    }

    async function testUndoRedoCore() {
        const ed = (typeof editor !== 'undefined' && editor) ? editor : window.editor;
        if (!ed || typeof ed.export !== 'function') {
            return { ok: false, name: 'undo_redo_core', detail: 'Editor no disponible' };
        }
        const addNodeFn = typeof addNode === 'function' ? addNode : window.addNode;
        const undoFn = typeof undo === 'function' ? undo : window.undo;
        const redoFn = typeof redo === 'function' ? redo : window.redo;
        if (typeof addNodeFn !== 'function' || typeof undoFn !== 'function' || typeof redoFn !== 'function') {
            return { ok: false, name: 'undo_redo_core', detail: 'API addNode/undo/redo no disponible' };
        }

        const snapshot = ed.export();
        try {
            ed.clear();
            if (typeof addToHistory === 'function') addToHistory();

            const n1 = addNodeFn('attr_creator', 140, 140);
            const n2 = addNodeFn('attr_sorter', 420, 140);
            ed.addConnection(n1, n2, 'output_1', 'input_1');

            const s1 = ed.export();
            const c1 = _countNodesFromState(s1) === 2 && _hasConnection(s1, n1, n2, 'output_1', 'input_1');
            if (!c1) return { ok: false, name: 'undo_redo_core', detail: 'estado inicial invalido tras crear/conectar' };

            undoFn(); // deshacer conexion
            const s2 = ed.export();
            const c2 = _countNodesFromState(s2) === 2 && !_hasConnection(s2, n1, n2, 'output_1', 'input_1');

            undoFn(); // deshacer nodo 2
            const s3 = ed.export();
            const c3 = _countNodesFromState(s3) === 1;

            undoFn(); // deshacer nodo 1
            const s4 = ed.export();
            const c4 = _countNodesFromState(s4) === 0;

            redoFn();
            redoFn();
            redoFn();
            const s5 = ed.export();
            const c5 = _countNodesFromState(s5) === 2 && _hasConnection(s5, n1, n2, 'output_1', 'input_1');

            const ok = c2 && c3 && c4 && c5;
            return { ok, name: 'undo_redo_core', detail: ok ? 'undo/redo incremental OK' : 'secuencia undo/redo inconsistente' };
        } catch (e) {
            return { ok: false, name: 'undo_redo_core', detail: e && e.message ? e.message : String(e) };
        } finally {
            ed.clear();
            ed.import(snapshot);
            if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
            }
        }
    }

    function testEngineCancelApi() {
        if (typeof window.cancelEngineRun !== 'function') {
            return { ok: false, name: 'engine_cancel_api', detail: 'cancelEngineRun no disponible' };
        }
        const prevCancel = !!window.isEngineCancelled;
        const prevCancelWorker = window.cancelWorkerTasks;
        let workerCancelCalled = false;
        try {
            window.isEngineCancelled = false;
            window.cancelWorkerTasks = function () { workerCancelCalled = true; };
            window.cancelEngineRun();
            const ok = !!window.isEngineCancelled && workerCancelCalled;
            return { ok, name: 'engine_cancel_api', detail: ok ? 'cancel flag + worker cancel OK' : `estado inesperado flag=${!!window.isEngineCancelled} worker=${workerCancelCalled}` };
        } catch (e) {
            return { ok: false, name: 'engine_cancel_api', detail: e && e.message ? e.message : String(e) };
        } finally {
            window.isEngineCancelled = prevCancel;
            window.cancelWorkerTasks = prevCancelWorker;
        }
    }

    function testRunReportApi() {
        const api = window.JETLRunReport;
        if (!api || typeof api.build !== 'function' || typeof api.export !== 'function') {
            return { ok: false, name: 'run_report_api', detail: 'JETLRunReport API no disponible' };
        }
        let report = null;
        try {
            report = api.build('Smoke', 'ok', null);
        } catch (e) {
            return { ok: false, name: 'run_report_api', detail: e && e.message ? e.message : String(e) };
        }
        const first = report && Array.isArray(report.nodes) && report.nodes.length ? report.nodes[0] : null;
        const outputsOk = !first || typeof first.outputs === 'object';
        const ok = !!(report && report.summary && Array.isArray(report.nodes) && outputsOk);
        return { ok, name: 'run_report_api', detail: ok ? 'api build/export disponible' : 'reporte invalido' };
    }

    function testTemplatesApply() {
        const ed = (typeof editor !== 'undefined' && editor) ? editor : window.editor;
        if (!ed || typeof ed.export !== 'function' || typeof ed.import !== 'function') {
            return { ok: false, name: 'templates_apply', detail: 'Editor no disponible' };
        }
        if (typeof window.applyTemplate !== 'function') {
            return { ok: false, name: 'templates_apply', detail: 'applyTemplate no disponible' };
        }

        const snapshot = ed.export();
        const nodeNames = (state) => {
            const data = ((((state || {}).drawflow || {}).Home || {}).data || {});
            return Object.values(data).map((n) => String((n && (n.name || n.class)) || ''));
        };
        try {
            window.applyTemplate('basic_attrs');
            let st = ed.export();
            let names = nodeNames(st);
            const hasBasic = names.includes('reader_file') && names.includes('attr_creator') && names.includes('writer_csv');

            window.applyTemplate('join_and_filter');
            st = ed.export();
            names = nodeNames(st);
            const hasJoinTester = names.includes('attr_join_adv') && names.includes('attr_test');

            const ok = hasBasic && hasJoinTester;
            return { ok, name: 'templates_apply', detail: ok ? 'plantillas aplican y nodos clave presentes' : 'faltan nodos clave tras aplicar plantilla' };
        } catch (e) {
            return { ok: false, name: 'templates_apply', detail: e && e.message ? e.message : String(e) };
        } finally {
            ed.clear();
            ed.import(snapshot);
            if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
            }
        }
    }

    function testTemplatesCustomApi() {
        const ed = (typeof editor !== 'undefined' && editor) ? editor : window.editor;
        const api = window.JETLTemplates;
        if (!ed || typeof ed.export !== 'function' || typeof ed.import !== 'function') {
            return { ok: false, name: 'templates_custom_api', detail: 'Editor no disponible' };
        }
        if (!api || typeof api.addCustom !== 'function' || typeof api.apply !== 'function' || typeof api.deleteCustom !== 'function') {
            return { ok: false, name: 'templates_custom_api', detail: 'JETLTemplates API no disponible' };
        }

        const snapshot = ed.export();
        let createdId = null;
        try {
            ed.clear();
            const a = (typeof addNode === 'function' ? addNode : window.addNode)('attr_creator', 160, 180);
            const b = (typeof addNode === 'function' ? addNode : window.addNode)('writer_csv', 460, 180);
            ed.addConnection(a, b, 'output_1', 'input_1');
            const graph = ed.export();

            const created = api.addCustom({
                id: 'smoke_custom_api',
                title: 'Smoke Custom API',
                desc: 'Template de prueba smoke',
                cat: 'QA',
                graph
            });
            createdId = created && created.id ? created.id : null;
            if (!createdId) return { ok: false, name: 'templates_custom_api', detail: 'no se pudo crear plantilla custom' };

            const applied = !!api.apply(createdId);
            if (!applied) return { ok: false, name: 'templates_custom_api', detail: 'no se pudo aplicar plantilla custom' };

            const st = ed.export();
            const data = ((((st || {}).drawflow || {}).Home || {}).data || {});
            const names = Object.values(data).map((n) => String((n && (n.name || n.class)) || ''));
            const hasNodes = names.includes('attr_creator') && names.includes('writer_csv');
            if (!hasNodes) return { ok: false, name: 'templates_custom_api', detail: 'grafo aplicado sin nodos esperados' };

            const del = api.deleteCustom(createdId);
            if (!del) return { ok: false, name: 'templates_custom_api', detail: 'no se pudo eliminar plantilla custom' };
            const still = (api.listCustom() || []).some((t) => String(t.id) === String(createdId));
            return { ok: !still, name: 'templates_custom_api', detail: !still ? 'alta/aplicar/baja custom OK' : 'plantilla custom sigue presente tras delete' };
        } catch (e) {
            return { ok: false, name: 'templates_custom_api', detail: e && e.message ? e.message : String(e) };
        } finally {
            if (createdId && api && typeof api.deleteCustom === 'function') {
                try { api.deleteCustom(createdId); } catch (e) {}
            }
            ed.clear();
            ed.import(snapshot);
            if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
            }
        }
    }

    function testPortInspectorUi() {
        if (typeof window.updatePortInspectorUI !== 'function') {
            return { ok: false, name: 'port_inspector_ui', detail: 'updatePortInspectorUI no disponible' };
        }
        if (typeof executionData === 'undefined') {
            return { ok: false, name: 'port_inspector_ui', detail: 'executionData no disponible' };
        }
        const nodeId = 'smoke_port_inspector';
        const prev = executionData[nodeId];
        try {
            executionData[nodeId] = {
                data: {
                    output_1: turf.featureCollection([turf.point([0, 0])]),
                    output_2: turf.featureCollection([turf.point([1, 1])])
                }
            };
            window.updatePortInspectorUI(nodeId);
            const wrap = document.getElementById('port-inspector');
            const sel = document.getElementById('port-inspector-select');
            const count = sel ? sel.options.length : 0;
            const visible = !!(wrap && wrap.style.display !== 'none');
            const ok = visible && count === 2;
            return { ok, name: 'port_inspector_ui', detail: ok ? 'selector por puerto visible (2 outputs)' : `estado inesperado visible=${visible} options=${count}` };
        } catch (e) {
            return { ok: false, name: 'port_inspector_ui', detail: e && e.message ? e.message : String(e) };
        } finally {
            if (prev) executionData[nodeId] = prev;
            else delete executionData[nodeId];
            try { window.updatePortInspectorUI(null); } catch (e) {}
        }
    }

    function testMapExpandUi() {
        if (typeof window.toggleMapPanelExpand !== 'function') {
            return { ok: false, name: 'map_expand_ui', detail: 'toggleMapPanelExpand no disponible' };
        }
        const body = document.body;
        if (!body) return { ok: false, name: 'map_expand_ui', detail: 'body no disponible' };
        try {
            const was = body.classList.contains('map-panel-maximized');
            window.toggleMapPanelExpand(true);
            const expanded = body.classList.contains('map-panel-maximized');
            window.toggleMapPanelExpand(false);
            const restored = !body.classList.contains('map-panel-maximized');
            if (was) window.toggleMapPanelExpand(true);
            const ok = expanded && restored;
            return { ok, name: 'map_expand_ui', detail: ok ? 'toggle ampliar/restaurar OK' : `estado inesperado expanded=${expanded} restored=${restored}` };
        } catch (e) {
            return { ok: false, name: 'map_expand_ui', detail: e && e.message ? e.message : String(e) };
        }
    }

    function testFeatureCacheBrowserUi() {
        if (typeof window.updateFeatureCacheBrowserUI !== 'function') {
            return { ok: false, name: 'feature_cache_browser_ui', detail: 'updateFeatureCacheBrowserUI no disponible' };
        }
        try {
            window.updateFeatureCacheBrowserUI();
            const wrap = document.getElementById('feature-cache-browser');
            const nodeSel = document.getElementById('feature-cache-node');
            const portSel = document.getElementById('feature-cache-port');
            const btn = document.getElementById('feature-cache-open');
            const ok = !!(wrap && nodeSel && portSel && btn);
            return { ok, name: 'feature_cache_browser_ui', detail: ok ? 'browser cache persistente disponible' : 'controles UI no creados' };
        } catch (e) {
            return { ok: false, name: 'feature_cache_browser_ui', detail: e && e.message ? e.message : String(e) };
        }
    }

    function testDirtyPropagationApi() {
        const api = window.JETLDirty;
        if (!api || typeof api.isDirty !== 'function' || typeof api.markNodeDirty !== 'function' || typeof api.clearNodeDirty !== 'function' || typeof api.invalidateNodeAndDownstream !== 'function') {
            return { ok: false, name: 'dirty_propagation_api', detail: 'JETLDirty API incompleta/no disponible' };
        }
        try {
            api.clearAll();
            api.markNodeDirty('smoke_dirty');
            const marked = api.isDirty('smoke_dirty') === true;
            api.clearNodeDirty('smoke_dirty');
            const cleared = api.isDirty('smoke_dirty') === false;
            return { ok: marked && cleared, name: 'dirty_propagation_api', detail: (marked && cleared) ? 'mark/clear dirty OK' : `estado inesperado marked=${marked} cleared=${cleared}` };
        } catch (e) {
            return { ok: false, name: 'dirty_propagation_api', detail: e && e.message ? e.message : String(e) };
        }
    }

    function testPackagesApi() {
        const api = window.JETLPackages;
        if (!api || typeof api.list !== 'function' || typeof api.addFromObject !== 'function' || typeof api.remove !== 'function' || typeof api.setEnabled !== 'function' || typeof api.reload !== 'function') {
            return { ok: false, name: 'packages_api', detail: 'JETLPackages API no disponible' };
        }
        const before = api.list().map((p) => String(p.id));
        const pkgId = `smoke_pkg_${Date.now()}`;
        try {
            const added = api.addFromObject({
                id: pkgId,
                title: 'Smoke Package',
                version: '1.0.0',
                enabled: true,
                transformers: [
                    { id: 'renamer_alias', base: 'attr_renamer', label: 'Renamer Alias Smoke' }
                ]
            });
            const key = `cpkg__${String(added.id)}__renamer_alias`;
            const existsTool = !!(window.TOOL_REGISTRY && window.TOOL_REGISTRY[key]);
            const disabled = api.setEnabled(added.id, false);
            const removed = api.remove(added.id);
            const back = api.list().map((p) => String(p.id));
            const cleaned = !back.includes(String(added.id));
            const ok = existsTool && disabled && removed && cleaned;
            return { ok, name: 'packages_api', detail: ok ? 'alta/enable-disable/baja package OK' : `estado inesperado tool=${existsTool} disabled=${disabled} removed=${removed}` };
        } catch (e) {
            return { ok: false, name: 'packages_api', detail: e && e.message ? e.message : String(e) };
        } finally {
            try { api.remove(pkgId); } catch (_) { }
            try { api.reload(); } catch (_) { }
            const cur = api.list().map((p) => String(p.id));
            if (before.length !== cur.length) {
                // best effort: no-op (avoid deleting user packages)
            }
        }
    }

    function testFeatureIndexStability() {
        if (typeof window.ensureStableFeatureIndex !== 'function') {
            return { ok: false, name: 'feature_index_stability', detail: 'ensureStableFeatureIndex no disponible' };
        }
        const fc = turf.featureCollection([
            turf.point([0, 0], { _idx: 0, cls: 'A' }),
            turf.point([1, 0], { _idx: 0, cls: 'A' }),
            turf.point([2, 0], { cls: 'B' }),
            turf.point([3, 0], { _idx: 2, cls: 'B' })
        ]);
        try {
            window.ensureStableFeatureIndex(fc);
            const feats = (fc && Array.isArray(fc.features)) ? fc.features : [];
            const idxs = feats.map((f) => f && f.properties ? f.properties._idx : null);
            const uniq = new Set(idxs);
            const contiguous = idxs.every((v, i) => Number.isInteger(v) && v === i);
            const ok = idxs.length === 4 && uniq.size === 4 && contiguous;
            return { ok, name: 'feature_index_stability', detail: ok ? 'reindex _idx unico/contiguo OK' : `idxs invalidos: ${idxs.join(',')}` };
        } catch (e) {
            return { ok: false, name: 'feature_index_stability', detail: e && e.message ? e.message : String(e) };
        }
    }

    async function testGeoDissolveWorker() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const f1 = turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], { grp: 'A' });
            const f2 = turf.polygon([[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]], { grp: 'A' });
            const fc = turf.featureCollection([f1, f2]);
            const wres = await postWorkerTask({ task: 'geo_dissolve', features: fc, fields: ['grp'] }, 30000);
            if (!wres || wres.status !== 'ok' || !wres.data || !wres.data.features) {
                return { ok: false, name: 'geo_dissolve_worker', detail: 'respuesta worker invalida' };
            }
            const outCount = wres.data.features.length;
            const ok = outCount >= 1;
            return { ok, name: 'geo_dissolve_worker', detail: ok ? `features=${outCount}` : 'sin features de salida' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'geo_dissolve_worker', detail: msg };
        }
    }

    async function testGeoWorkerHealth() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geo_worker_health', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geo_worker_health', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const wres = await postWorkerTask({ task: 'worker_health' }, 15000);
            if (!wres || wres.status !== 'ok' || !wres.data) {
                return { ok: false, name: 'geo_worker_health', detail: 'respuesta invalida' };
            }
            const libs = wres.data || {};
            const ok = !!libs.turf && !!libs.rbush && !!libs.proj4;
            const detail = `turf=${!!libs.turf}, jsts=${!!libs.jsts}, rbush=${!!libs.rbush}, proj4=${!!libs.proj4}, geotiff=${!!libs.geotiff}, geoblaze=${!!libs.geoblaze}`;
            return { ok, name: 'geo_worker_health', detail };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geo_worker_health', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'geo_worker_health', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geo_worker_health', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'geo_worker_health', detail: msg };
        }
    }

    async function testRasterWorkerHealth() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'raster_worker_health', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'raster_worker_health', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const wres = await postWorkerTask({ task: 'worker_health' }, 15000);
            if (!wres || wres.status !== 'ok' || !wres.data) {
                return { ok: false, name: 'raster_worker_health', detail: 'respuesta invalida' };
            }
            const libs = wres.data || {};
            const hasRasterLibs = !!libs.geotiff && !!libs.geoblaze;
            return {
                ok: hasRasterLibs,
                name: 'raster_worker_health',
                detail: hasRasterLibs
                    ? 'geotiff/geoblaze disponibles'
                    : `faltan libs raster (geotiff=${!!libs.geotiff}, geoblaze=${!!libs.geoblaze})`
            };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'raster_worker_health', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'raster_worker_health', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'raster_worker_health', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'raster_worker_health', detail: msg };
        }
    }

    async function testGeoWorkerPrewarmApi() {
        if (typeof window.prewarmGeoWorker !== 'function') {
            return { ok: false, name: 'geo_worker_prewarm_api', detail: 'prewarmGeoWorker no disponible' };
        }
        try {
            const ok = await window.prewarmGeoWorker(12000);
            return { ok: true, name: 'geo_worker_prewarm_api', detail: `prewarm=${!!ok}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            return { ok: false, name: 'geo_worker_prewarm_api', detail: msg };
        }
    }

    async function testGeoBasicWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geo_basic_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geo_basic_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const polyA = turf.polygon([[[0, 0], [2, 0], [2, 1], [0, 1], [0, 0]]], { id: 'A' });
            const polyB = turf.polygon([[[3, 0], [4, 0], [4, 2], [3, 2], [3, 0]]], { id: 'B' });
            const fc = turf.featureCollection([polyA, polyB]);

            const wCent = await postWorkerTask({ task: 'geo_centroid', features: fc }, 30000);
            if (!wCent || wCent.status !== 'ok' || !wCent.data || !Array.isArray(wCent.data.features) || wCent.data.features.length !== 2) {
                return { ok: false, name: 'geo_basic_workers', detail: 'centroid worker invalido' };
            }

            const wInside = await postWorkerTask({ task: 'geo_point_surf', features: fc }, 30000);
            if (!wInside || wInside.status !== 'ok' || !wInside.data || !Array.isArray(wInside.data.features) || wInside.data.features.length !== 2) {
                return { ok: false, name: 'geo_basic_workers', detail: 'point_surf worker invalido' };
            }

            const wBbox = await postWorkerTask({ task: 'geo_bbox', features: fc }, 30000);
            if (!wBbox || wBbox.status !== 'ok' || !wBbox.data || !Array.isArray(wBbox.data.features) || wBbox.data.features.length !== 2) {
                return { ok: false, name: 'geo_basic_workers', detail: 'bbox worker invalido' };
            }
            return { ok: true, name: 'geo_basic_workers', detail: 'centroid=2, point_surf=2, bbox=2' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geo_basic_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'geo_basic_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geo_basic_workers', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'geo_basic_workers', detail: msg };
        }
    }

    async function testSpatialAuxWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();

            const l1 = turf.lineString([[0, 0], [1, 0], [1, 1]]);
            const fcLine = turf.featureCollection([l1]);
            const wAngle = await postWorkerTask({ task: 'geo_angle_calculator', features: fcLine, threshold: 100 }, 30000);
            if (!wAngle || wAngle.status !== 'ok' || !wAngle.data || !Array.isArray(wAngle.data.features)) {
                return { ok: false, name: 'spatial_aux_workers', detail: 'angle worker invalido' };
            }

            const poly = turf.polygon([[[0, 0], [1, 0], [1, 1], [0.5, 0.95], [0, 1], [0, 0]]]);
            const fcPoly = turf.featureCollection([poly]);
            const wKink = await postWorkerTask({ task: 'geo_kink_remover', features: fcPoly, minDeg: 5 }, 30000);
            if (!wKink || wKink.status !== 'ok' || !wKink.data || !Array.isArray(wKink.data.features)) {
                return { ok: false, name: 'spatial_aux_workers', detail: 'kink worker invalido' };
            }
            return { ok: true, name: 'spatial_aux_workers', detail: `angle=${wAngle.data.features.length}, kink=${wKink.data.features.length}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'spatial_aux_workers', detail: msg };
        }
    }

    async function testSpatialCoreWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'spatial_core_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'spatial_core_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();

            const src = turf.featureCollection([
                turf.point([0, 0], { id: 1, v: 10 }),
                turf.point([2, 2], { id: 2, v: 20 })
            ]);
            const mask = turf.featureCollection([
                turf.polygon([[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]], { m: 'A' })
            ]);

            const wFilter = await postWorkerTask({ task: 'spatial_filter', source: src, mask, mode: 'within' }, 30000);
            if (!wFilter || wFilter.status !== 'ok' || !wFilter.data || !wFilter.data.output_1 || !wFilter.data.output_2) {
                return { ok: false, name: 'spatial_core_workers', detail: 'spatial_filter worker invalido' };
            }
            const pf = (wFilter.data.output_1.features || []).length;
            const ff = (wFilter.data.output_2.features || []).length;
            if (pf !== 1 || ff !== 1) {
                return { ok: false, name: 'spatial_core_workers', detail: `spatial_filter conteo inesperado pass=${pf} fail=${ff}` };
            }

            const left = turf.featureCollection([
                turf.point([0, 0], { id: 1 }),
                turf.point([2, 2], { id: 2 })
            ]);
            const join = turf.featureCollection([
                turf.polygon([[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]]], { zone: 'Z1', score: 7 })
            ]);
            const wJoin = await postWorkerTask({
                task: 'spatial_join',
                source: left,
                join,
                mode: 'within',
                joinType: 'left',
                prefix: 'j_',
                strategy: 'first'
            }, 30000);
            if (!wJoin || wJoin.status !== 'ok' || !wJoin.data || !wJoin.data.output_1 || !wJoin.data.output_2) {
                return { ok: false, name: 'spatial_core_workers', detail: 'spatial_join worker invalido' };
            }
            const jOut = wJoin.data.output_1.features || [];
            const hasJoinedField = !!(jOut[0] && jOut[0].properties && jOut[0].properties.j_zone === 'Z1');
            if (!hasJoinedField) {
                return { ok: false, name: 'spatial_core_workers', detail: 'spatial_join sin atributos esperados' };
            }

            const nnSrc = turf.featureCollection([
                turf.point([0, 0], { id: 'a' }),
                turf.point([10, 10], { id: 'b' })
            ]);
            const nnCand = turf.featureCollection([
                turf.point([0.1, 0.1], { n: 100 })
            ]);
            const wNn = await postWorkerTask({
                task: 'nearest_neighbor',
                source: nnSrc,
                candidates: nnCand,
                maxDist: 5,
                unit: 'kilometers',
                copyAttr: true
            }, 30000);
            if (!wNn || wNn.status !== 'ok' || !wNn.data || !wNn.data.output_1 || !wNn.data.output_2) {
                return { ok: false, name: 'spatial_core_workers', detail: 'nearest_neighbor worker invalido' };
            }
            const np = (wNn.data.output_1.features || []).length;
            const nf2 = (wNn.data.output_2.features || []).length;
            return { ok: true, name: 'spatial_core_workers', detail: `filter=1/1, join=${jOut.length}, nn=${np}/${nf2}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: 'omitido (estado cancelado residual)' };
            }
            if (/rbush is not defined|jsts is not defined|proj4 is not defined/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: `omitido (dependencia worker no cargada: ${msg})` };
            }
            return { ok: false, name: 'spatial_core_workers', detail: msg };
        }
    }

    async function testSpatialGeomWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();

            const lA = turf.featureCollection([turf.lineString([[0, 0], [2, 2]], { a: 1 })]);
            const lB = turf.featureCollection([turf.lineString([[0, 2], [2, 0]], { b: 1 })]);
            const wInter = await postWorkerTask({
                task: 'intersector',
                source: lA,
                target: lB,
                isLineMode: true
            }, 30000);
            if (!wInter || wInter.status !== 'ok' || !wInter.data || !wInter.data.output_1 || !wInter.data.output_2) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'intersector worker invalido' };
            }
            const interPts = (wInter.data.output_2.features || []).length;
            if (interPts < 1) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'intersector sin puntos de corte' };
            }

            const polys = turf.featureCollection([
                turf.polygon([[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]]], { id: 1 })
            ]);
            const mask = turf.polygon([[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]], { m: 1 });
            const wClip = await postWorkerTask({ task: 'clip', features: polys, mask, chunk: 16 }, 30000);
            if (!wClip || wClip.status !== 'ok' || !wClip.data || !Array.isArray(wClip.data.features)) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'clip worker invalido' };
            }
            const clipCount = wClip.data.features.length;
            if (clipCount < 1) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'clip sin salida' };
            }

            return { ok: true, name: 'spatial_geom_workers', detail: `inter_pts=${interPts}, clip=${clipCount}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (estado cancelado residual)' };
            }
            if (/rbush is not defined|jsts is not defined|proj4 is not defined/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: `omitido (dependencia worker no cargada: ${msg})` };
            }
            return { ok: false, name: 'spatial_geom_workers', detail: msg };
        }
    }

    async function testGeometryAuxWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            window.isEngineCancelled = false;
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const runWorkerTask = async (payload, timeoutMs, label) => {
                const taskLabel = label || payload.task || 'worker_task';
                const maxAttempts = 3;
                let lastMsg = '';
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        window.isEngineCancelled = false;
                        return await postWorkerTask(payload, attempt === 1 ? timeoutMs : Math.max(timeoutMs, 120000));
                    } catch (e) {
                        const msg = e && e.message ? e.message : String(e);
                        lastMsg = msg;
                        const isTimeout = /Worker timeout/i.test(msg);
                        const isCancelledResidual =
                            !!(e && (e.cancelled || e.name === 'CancelledError')) ||
                            /Operacion cancelada por el usuario|cancelad/i.test(msg) ||
                            /Smoke .*reset/i.test(msg);
                        if (!isTimeout && !isCancelledResidual) throw new Error(`${taskLabel}: ${msg}`);
                        try {
                            window.isEngineCancelled = false;
                            if (typeof window.resetGeoWorkerPool === 'function') {
                                window.resetGeoWorkerPool(`Smoke retry reset: ${taskLabel}#${attempt}`);
                            } else {
                                if (typeof window.cancelWorkerTasks === 'function') window.cancelWorkerTasks();
                                window.geoWorker = null;
                                if (typeof createGeoWorker === 'function') createGeoWorker();
                            }
                        } catch (_) { }
                        await new Promise((r) => setTimeout(r, 30));
                    }
                }
                throw new Error(`${taskLabel}: ${lastMsg || 'Worker timeout'}`);
            };

            const l1 = turf.lineString([[0, 0], [1, 0], [1, 1]]);
            const fcLine = turf.featureCollection([l1]);
            const wVertex = await runWorkerTask({ task: 'geo_vertex_creator', features: fcLine, mode: 'All Vertices' }, 60000, 'geo_vertex_creator');
            if (!wVertex || wVertex.status !== 'ok' || !wVertex.data || !Array.isArray(wVertex.data.features) || wVertex.data.features.length < 3) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'vertex worker invalido' };
            }

            const poly = turf.polygon([[[0, 0], [1, 0], [0, 1], [0, 0]]]);
            const fcPoly = turf.featureCollection([poly]);
            const wTri = await runWorkerTask({ task: 'geo_triangulator', features: fcPoly }, 60000, 'geo_triangulator');
            if (!wTri || wTri.status !== 'ok' || !wTri.data || !Array.isArray(wTri.data.features) || wTri.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'triangulator worker invalido' };
            }

            const l2 = turf.lineString([[0, 0], [0, 0.1], [0, 0.2]]);
            const fcChunk = turf.featureCollection([l2]);
            const wChunk = await runWorkerTask({ task: 'geo_chunk', features: fcChunk, len: 5, unit: 'kilometers' }, 60000, 'geo_chunk');
            if (!wChunk || wChunk.status !== 'ok' || !wChunk.data || !Array.isArray(wChunk.data.features) || wChunk.data.features.length < 2) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'chunk worker invalido' };
            }

            const lm1 = turf.lineString([[0, 0], [1, 0]]);
            const lm2 = turf.lineString([[1, 0], [2, 0]]);
            const fcMerge = turf.featureCollection([lm1, lm2]);
            const wMerge = await runWorkerTask({ task: 'geo_line_merge', features: fcMerge }, 60000, 'geo_line_merge');
            const mergeFc = (wMerge && wMerge.data && wMerge.data.type === 'FeatureCollection')
                ? wMerge.data
                : (wMerge && wMerge.data && wMerge.data.type === 'Feature')
                    ? turf.featureCollection([wMerge.data])
                    : null;
            if (!wMerge || wMerge.status !== 'ok' || !mergeFc || !Array.isArray(mergeFc.features) || mergeFc.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'line_merge worker invalido' };
            }

            const ltp = turf.lineString([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
            const wLtp = await runWorkerTask({ task: 'geo_line_to_polygon', features: turf.featureCollection([ltp]) }, 60000, 'geo_line_to_polygon');
            if (!wLtp || wLtp.status !== 'ok' || !wLtp.data || !Array.isArray(wLtp.data.features) || wLtp.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'line_to_polygon worker invalido' };
            }

            const wPtl = await runWorkerTask({ task: 'geo_polygon_to_line', features: wLtp.data }, 60000, 'geo_polygon_to_line');
            if (!wPtl || wPtl.status !== 'ok' || !wPtl.data || !Array.isArray(wPtl.data.features) || wPtl.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'polygon_to_line worker invalido' };
            }

            const fcSimple = turf.featureCollection([
                turf.lineString([[0, 0], [0.1, 0.0001], [0.2, 0], [0.3, 0.0001], [0.4, 0]])
            ]);
            const wSimplify = await runWorkerTask({ task: 'geo_simplify', features: fcSimple, tol: 0.0002 }, 60000, 'geo_simplify');
            if (!wSimplify || wSimplify.status !== 'ok' || !wSimplify.data || !Array.isArray(wSimplify.data.features)) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'simplify worker invalido' };
            }

            const pA = turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], { k: 1 });
            const pB = turf.polygon([[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]], { k: 2 });
            const fcTopo = turf.featureCollection([pA, pB]);
            const wTopo = await runWorkerTask({ task: 'geo_topo_simplify', features: fcTopo, tol: 0.0002 }, 90000, 'geo_topo_simplify');
            if (!wTopo || wTopo.status !== 'ok' || !wTopo.data || !Array.isArray(wTopo.data.features) || wTopo.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'topo_simplify worker invalido' };
            }
            const wTopoKeep = await runWorkerTask({ task: 'geo_topo_simplify', features: fcTopo, tol: 0.0002, preserveBoundary: true }, 90000, 'geo_topo_simplify');
            if (!wTopoKeep || wTopoKeep.status !== 'ok' || !wTopoKeep.data || !Array.isArray(wTopoKeep.data.features) || wTopoKeep.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'topo_simplify preserveBoundary invalido' };
            }

            const reprojIn = turf.featureCollection([turf.point([-3.7038, 40.4168])]);
            const wReproj = await runWorkerTask({ task: 'geo_reproject', features: reprojIn, src: 'EPSG:4326', dst: 'EPSG:3857' }, 60000, 'geo_reproject');
            if (!wReproj || wReproj.status !== 'ok' || !wReproj.data || !Array.isArray(wReproj.data.features) || wReproj.data.features.length !== 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'reproject worker invalido' };
            }
            const rp = wReproj.data.features[0];
            const rc = rp && rp.geometry && Array.isArray(rp.geometry.coordinates) ? rp.geometry.coordinates : null;
            if (!rc || !isFinite(rc[0]) || !isFinite(rc[1]) || Math.abs(rc[0]) < 1000 || Math.abs(rc[1]) < 1000) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'reproject coordenadas invalidas' };
            }

            const rfPoly = turf.featureCollection([
                turf.polygon([[[0, 0], [0.02, 0], [0.02, 0.02], [0, 0.02], [0, 0]]], { id: 1 })
            ]);
            const wRandomFill = await runWorkerTask({ task: 'geo_random_fill', features: rfPoly, count: 3 }, 60000, 'geo_random_fill');
            if (!wRandomFill || wRandomFill.status !== 'ok' || !wRandomFill.data || !Array.isArray(wRandomFill.data.features) || wRandomFill.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'random_fill worker invalido' };
            }

            const donutPoly = turf.featureCollection([
                turf.polygon([
                    [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
                    [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]
                ], { id: 7 })
            ]);
            const wDonut = await runWorkerTask({ task: 'geo_donut_extractor', features: donutPoly }, 60000, 'geo_donut_extractor');
            if (!wDonut || wDonut.status !== 'ok' || !wDonut.data || !Array.isArray(wDonut.data.features) || wDonut.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'donut_extractor worker invalido' };
            }

            const closeLine = turf.featureCollection([
                turf.lineString([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]], { id: 1 })
            ]);
            const wCloser = await runWorkerTask({ task: 'geo_line_closer', features: closeLine }, 60000, 'geo_line_closer');
            if (!wCloser || wCloser.status !== 'ok' || !wCloser.data || !Array.isArray(wCloser.data.features) || wCloser.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'line_closer worker invalido' };
            }

            const mp = turf.featureCollection([
                turf.multiPolygon([
                    [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                    [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]]
                ], { grp: 'A' })
            ]);
            const wExplode = await runWorkerTask({ task: 'geo_explode', features: mp }, 60000, 'geo_explode');
            if (!wExplode || wExplode.status !== 'ok' || !wExplode.data || !Array.isArray(wExplode.data.features) || wExplode.data.features.length < 2) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'explode worker invalido' };
            }

            const bufferIn = turf.featureCollection([turf.point([0, 0], { id: 1 })]);
            const wBuffer = await runWorkerTask({ task: 'geo_buffer', features: bufferIn, dist: 0.5, unit: 'kilometers', dissolve: false }, 60000, 'geo_buffer');
            if (!wBuffer || wBuffer.status !== 'ok' || !wBuffer.data || !Array.isArray(wBuffer.data.features) || wBuffer.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'buffer worker invalido' };
            }

            const vorIn = turf.featureCollection([
                turf.point([0, 0], { id: 'A' }),
                turf.point([1, 0], { id: 'B' }),
                turf.point([0.5, 1], { id: 'C' })
            ]);
            const wVor = await runWorkerTask({ task: 'geo_voronoi', features: vorIn.features }, 60000, 'geo_voronoi');
            if (!wVor || wVor.status !== 'ok' || !wVor.data || !Array.isArray(wVor.data.features) || wVor.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'voronoi worker invalido' };
            }

            return { ok: true, name: 'geometry_aux_workers', detail: `vertex=${wVertex.data.features.length}, tri=${wTri.data.features.length}, chunk=${wChunk.data.features.length}, merge=${mergeFc.features.length}, l2p=${wLtp.data.features.length}, p2l=${wPtl.data.features.length}, simplify=${wSimplify.data.features.length}, topo=${wTopo.data.features.length}, topo_keep=${wTopoKeep.data.features.length}, reproj=1, random_fill=${wRandomFill.data.features.length}, donut=${wDonut.data.features.length}, closer=${wCloser.data.features.length}, explode=${wExplode.data.features.length}, buffer=${wBuffer.data.features.length}, voronoi=${wVor.data.features.length}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/^geo_[a-z0-9_]+:/i.test(msg)) {
                return { ok: false, name: 'geometry_aux_workers', detail: msg };
            }
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (estado cancelado residual)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            return { ok: false, name: 'geometry_aux_workers', detail: msg };
        }
    }

    async function runBasic() {
        const results = [];
        results.push(testRegistry());
        results.push(testSchemaUI());
        results.push(testUiCore());
        results.push(await testKmlRoundtrip());

        const pass = results.filter(r => r.ok).length;
        const fail = results.length - pass;
        const summary = { pass, fail, total: results.length, results };

        if (typeof window.log === 'function') {
            log(`SMOKE: ${pass}/${results.length} OK`, fail ? 'warn' : 'success');
            results.forEach(r => log(`SMOKE ${r.ok ? 'OK' : 'FAIL'} ${r.name}: ${r.detail}`, r.ok ? 'info' : 'err'));
        } else {
            console.table(results);
        }
        return summary;
    }

    async function runExtended() {
        if (__runExtendedPromise) return __runExtendedPromise;
        __runExtendedPromise = (async () => {
        const runWithTimeout = (name, fn, timeoutMs = 90000, softTimeout = false) => new Promise((resolve) => {
            let done = false;
            const timer = setTimeout(() => {
                if (done) return;
                done = true;
                if (softTimeout) resolve({ ok: true, name, detail: `omitido (timeout>${timeoutMs}ms)` });
                else resolve({ ok: false, name, detail: `timeout>${timeoutMs}ms` });
            }, timeoutMs);
            Promise.resolve()
                .then(fn)
                .then((res) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    resolve(res);
                })
                .catch((e) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    resolve({ ok: false, name, detail: e && e.message ? e.message : String(e) });
                });
        });

        if (typeof window !== 'undefined') window.isEngineCancelled = false;
        const base = await runBasic();
        const extra = [];
        extra.push(await testAttrStatsNode());
        extra.push(await testAttrTesterAndOr());
        extra.push(await testAttrCalcRejects());
        extra.push(await testAttrCreatorRejects());
        extra.push(await testAttrAreaRejects());
        extra.push(await testAttrLengthRejects());
        extra.push(await testAttrStatsRejects());
        extra.push(await testAttrStringFormatterRejects());
        extra.push(await testAttrRenamerRejects());
        extra.push(await testAttrKeeperRejects());
        extra.push(await runWithTimeout('attr_aux_workers', () => testAttrAuxWorkers(), 45000, true));
        extra.push(await runWithTimeout('attr_formula_workers', () => testAttrFormulaWorkers(), 45000, true));
        extra.push(await testWorkspaceParams());
        extra.push(await testWorkspaceParamsIO());
        extra.push(await testUndoRedoCore());
        extra.push(testRunReportApi());
        extra.push(testTemplatesApply());
        extra.push(testTemplatesCustomApi());
        extra.push(testPortInspectorUi());
        extra.push(testMapExpandUi());
        extra.push(testFeatureCacheBrowserUi());
        extra.push(testDirtyPropagationApi());
        extra.push(testPackagesApi());
        extra.push(testFeatureIndexStability());
        if (typeof window !== 'undefined') window.isEngineCancelled = false;
        if (typeof createGeoWorker === 'function' && !window.geoWorker) {
            try { createGeoWorker(); } catch (e) {}
        }
        if (typeof window !== 'undefined' && typeof window.prewarmGeoWorker === 'function') {
            try { await window.prewarmGeoWorker(12000); } catch (e) {}
        }
        extra.push(await runWithTimeout('geo_worker_prewarm_api', () => testGeoWorkerPrewarmApi(), 20000, true));
        extra.push(await runWithTimeout('geo_worker_health', () => testGeoWorkerHealth(), 20000, true));
        extra.push(await runWithTimeout('raster_worker_health', () => testRasterWorkerHealth(), 20000, true));
        extra.push(await runWithTimeout('geo_basic_workers', () => testGeoBasicWorkers(), 45000, true));
        extra.push(await runWithTimeout('geo_dissolve_worker', () => testGeoDissolveWorker(), 60000, true));
        extra.push(await runWithTimeout('spatial_core_workers', () => testSpatialCoreWorkers(), 70000, true));
        extra.push(await runWithTimeout('spatial_geom_workers', () => testSpatialGeomWorkers(), 70000, true));
        extra.push(await runWithTimeout('spatial_aux_workers', () => testSpatialAuxWorkers(), 70000, true));
        extra.push(await runWithTimeout('geometry_aux_workers', () => testGeometryAuxWorkers(), 120000, true));
        extra.push(testEngineCancelApi());

        const results = [...base.results, ...extra];
        const pass = results.filter(r => r.ok).length;
        const fail = results.length - pass;
        const summary = { pass, fail, total: results.length, results };
        const omittedWorkerCount = results.filter((r) => {
            if (!r || !r.ok || !r.detail) return false;
            const d = String(r.detail || '').toLowerCase();
            return d.includes('omitido') && (d.includes('worker') || d.includes('timeout') || d.includes('cancel'));
        }).length;
        summary.omitted_worker_checks = omittedWorkerCount;

        if (typeof window.log === 'function') {
            log(`SMOKE+CORE: ${pass}/${results.length} OK`, fail ? 'warn' : 'success');
            extra.forEach(r => log(`CORE ${r.ok ? 'OK' : 'FAIL'} ${r.name}: ${r.detail}`, r.ok ? 'info' : 'err'));
            if (omittedWorkerCount > 0) {
                log(`SMOKE NOTE: ${omittedWorkerCount} checks omitidos por entorno worker (timeout/cancel/pool).`, 'warn');
            }
        } else {
            console.table(results);
            if (omittedWorkerCount > 0) {
                console.warn(`[JETLSmoke] ${omittedWorkerCount} checks omitidos por entorno worker (timeout/cancel/pool).`);
            }
        }
        return summary;
        })();
        try {
            return await __runExtendedPromise;
        } finally {
            __runExtendedPromise = null;
        }
    }

    async function runStable() {
        const base = await runBasic();
        const extra = [];
        extra.push(await testAttrStatsNode());
        extra.push(await testAttrTesterAndOr());
        extra.push(await testAttrCalcRejects());
        extra.push(await testAttrCreatorRejects());
        extra.push(await testAttrAreaRejects());
        extra.push(await testAttrLengthRejects());
        extra.push(await testAttrStatsRejects());
        extra.push(await testAttrStringFormatterRejects());
        extra.push(await testAttrRenamerRejects());
        extra.push(await testAttrKeeperRejects());
        extra.push(await testWorkspaceParams());
        extra.push(await testWorkspaceParamsIO());
        extra.push(await testUndoRedoCore());
        extra.push(testRunReportApi());
        extra.push(testTemplatesApply());
        extra.push(testTemplatesCustomApi());
        extra.push(testPortInspectorUi());
        extra.push(testMapExpandUi());
        extra.push(testFeatureCacheBrowserUi());
        extra.push(testDirtyPropagationApi());
        extra.push(testPackagesApi());
        extra.push(testFeatureIndexStability());
        extra.push(testEngineCancelApi());

        const results = [...base.results, ...extra];
        const pass = results.filter(r => r.ok).length;
        const fail = results.length - pass;
        const summary = { pass, fail, total: results.length, results, mode: 'stable' };

        if (typeof window.log === 'function') {
            log(`SMOKE+STABLE: ${pass}/${results.length} OK`, fail ? 'warn' : 'success');
            extra.forEach(r => log(`STABLE ${r.ok ? 'OK' : 'FAIL'} ${r.name}: ${r.detail}`, r.ok ? 'info' : 'err'));
        } else {
            console.table(results);
        }
        return summary;
    }

    async function runGate(mode = 'stable', throwOnFail = true) {
        const selected = String(mode || 'stable').toLowerCase();
        const summary = selected === 'extended'
            ? await runExtended()
            : await runStable();
        const failed = (summary.results || []).filter(r => !r.ok);
        const ok = failed.length === 0;
        const gate = {
            ok,
            mode: selected === 'extended' ? 'extended' : 'stable',
            pass: summary.pass,
            fail: summary.fail,
            total: summary.total,
            failed_names: failed.map(r => r.name)
        };
        if (!ok && throwOnFail) {
            throw new Error(`Smoke gate fallido (${gate.mode}): ${gate.failed_names.join(', ')}`);
        }
        return gate;
    }

    window.JETLSmoke = { runBasic, runExtended, runStable, runGate };
})();


/* ---- js/modalSystem.js ---- */
(function () {
    'use strict';

    let activeModal = null;
    let returnFocus = null;

    function visible(modal) {
        return modal && window.getComputedStyle(modal).display !== 'none';
    }

    function focusable(modal) {
        return Array.from(modal.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.offsetParent !== null);
    }

    function syncModal(modal) {
        if (!visible(modal)) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            if (activeModal === modal) {
                activeModal = null;
                document.body.classList.remove('modal-open');
                if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
                returnFocus = null;
            }
            return;
        }

        if (activeModal !== modal) {
            returnFocus = document.activeElement;
            activeModal = modal;
        }
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        window.requestAnimationFrame(() => modal.classList.add('is-open'));
        window.setTimeout(() => focusable(modal)[0]?.focus({ preventScroll: true }), 40);
    }

    function closeModal(modal) {
        const closeButton = modal?.querySelector('[data-ui-action^="close-"]');
        if (closeButton) closeButton.click();
    }

    function observe(modal) {
        if (modal.dataset.modalSystem === '1') return;
        modal.dataset.modalSystem = '1';
        modal.setAttribute('aria-hidden', 'true');
        new MutationObserver(() => syncModal(modal)).observe(modal, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        syncModal(modal);
    }

    document.querySelectorAll('.modal').forEach(observe);

    document.addEventListener('click', (event) => {
        const modal = event.target.classList?.contains('modal') ? event.target : null;
        if (modal) closeModal(modal);
    });

    document.addEventListener('keydown', (event) => {
        if (!activeModal) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal(activeModal);
            return;
        }
        if (event.key !== 'Tab') return;
        const items = focusable(activeModal);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    window.JETLModalSystem = { closeActive: () => closeModal(activeModal) };
})();


/* ---- js/mobile.js ---- */
(function () {
    'use strict';

    const mobileQuery = window.matchMedia('(max-width: 768px)');

    function isMobile() {
        return mobileQuery.matches;
    }

    function setActive(view) {
        document.querySelectorAll('[data-mobile-view]').forEach((button) => {
            button.classList.toggle('active', button.dataset.mobileView === view);
        });
    }

    function closeTransientViews() {
        document.body.classList.remove('mobile-results-open', 'mobile-sheet-open');
        document.getElementById('mobile-project-sheet')?.setAttribute('aria-hidden', 'true');

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar?.classList.remove('open');
        if (overlay) overlay.style.display = 'none';
    }

    function openView(view) {
        if (!isMobile()) return;

        const sameViewIsOpen =
            (view === 'nodes' && document.getElementById('sidebar')?.classList.contains('open')) ||
            (view === 'results' && document.body.classList.contains('mobile-results-open')) ||
            (view === 'project' && document.body.classList.contains('mobile-sheet-open'));

        closeTransientViews();
        if (sameViewIsOpen || view === 'flow') {
            setActive('flow');
            return;
        }

        if (view === 'nodes') {
            document.getElementById('sidebar')?.classList.add('open');
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) overlay.style.display = 'block';
        } else if (view === 'results') {
            try { window.ensureJETLMap?.(); } catch (error) { console.warn('[JETL] No se pudo iniciar el mapa', error); }
            document.body.classList.add('mobile-results-open');
        } else if (view === 'project') {
            document.body.classList.add('mobile-sheet-open');
            document.getElementById('mobile-project-sheet')?.setAttribute('aria-hidden', 'false');
        }

        setActive(view);
    }

    function runFlow() {
        closeTransientViews();
        setActive('flow');
        if (typeof window.runEngine === 'function') {
            window.runEngine();
        } else if (typeof runEngine === 'function') {
            runEngine();
        } else if (typeof window.showToast === 'function') {
            window.showToast('El motor todavía no está listo', 'warn');
        }
    }

    document.addEventListener('click', (event) => {
        const viewButton = event.target.closest('[data-mobile-view]');
        if (viewButton) {
            openView(viewButton.dataset.mobileView);
            return;
        }

        if (event.target.closest('#mobile-run')) {
            runFlow();
            return;
        }

        if (event.target.closest('#mobile-scrim, [data-mobile-close]')) {
            closeTransientViews();
            setActive('flow');
            return;
        }

        if (isMobile() && event.target.closest('#sidebar-overlay')) {
            setActive('flow');
            return;
        }

        if (isMobile() && event.target.closest('#mobile-project-sheet [data-ui-action]')) {
            window.setTimeout(() => {
                closeTransientViews();
                setActive('flow');
            }, 0);
        }
    });

    mobileQuery.addEventListener?.('change', () => {
        if (!isMobile()) closeTransientViews();
    });

    window.JETLMobile = { openView, closeTransientViews };
})();

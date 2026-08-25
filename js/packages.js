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

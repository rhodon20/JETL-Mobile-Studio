// =============================================
// FLOW TEMPLATES
// =============================================
(function () {
    const CUSTOM_TEMPLATES_KEY = 'jetl_custom_templates_v1';

    const hasTool = (k) => !!(window.TOOL_REGISTRY && window.TOOL_REGISTRY[k]);
    const missingTools = (keys) => (keys || []).filter(k => !hasTool(k));

    const BUILTIN_TEMPLATES = [
        {
            id: 'demo',
            title: 'Demo OSM Buffer',
            desc: 'Descarga OSM, crea buffer y exporta GeoJSON.',
            cat: 'Vector',
            requires: ['reader_osm', 'geo_buffer', 'geo_dissolve', 'writer_geojson'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_osm', 120, 120);
                const n2 = addNode('geo_buffer', 420, 120);
                const n3 = addNode('geo_dissolve', 720, 120);
                const n4 = addNode('writer_geojson', 1020, 120);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
            }
        },
        {
            id: 'basic_attrs',
            title: 'Atributos Rapidos',
            desc: 'Carga archivo, crea/calcula campo y exporta CSV.',
            cat: 'Atributos',
            requires: ['reader_file', 'attr_creator', 'writer_csv'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 120, 200);
                const n2 = addNode('attr_creator', 420, 200);
                const n3 = addNode('writer_csv', 720, 200);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
            }
        },
        {
            id: 'qa_match_duplicates',
            title: 'QA Duplicados',
            desc: 'Separa unicos y duplicados por geometria/atributos.',
            cat: 'QA',
            requires: ['reader_file', 'attr_matcher', 'writer_geojson', 'writer_csv'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 120, 180);
                const n2 = addNode('attr_matcher', 430, 180);
                const n3 = addNode('writer_geojson', 760, 120);
                const n4 = addNode('writer_csv', 760, 260);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
                editor.addConnection(n2, n4, 'output_2', 'input_1');
            }
        },
        {
            id: 'join_and_filter',
            title: 'Join + Tester',
            desc: 'Une por atributos y divide pass/fail por condicion.',
            cat: 'Atributos',
            requires: ['reader_file', 'attr_join_adv', 'attr_test', 'writer_geojson'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 90, 120);
                const n2 = addNode('reader_file', 90, 300);
                const n3 = addNode('attr_join_adv', 430, 210);
                const n4 = addNode('attr_test', 760, 210);
                const n5 = addNode('writer_geojson', 1080, 150);
                const n6 = addNode('writer_geojson', 1080, 300);
                editor.addConnection(n1, n3, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_2');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
                editor.addConnection(n4, n5, 'output_1', 'input_1');
                editor.addConnection(n4, n6, 'output_2', 'input_1');
            }
        },
        {
            id: 'line_to_polygon_flow',
            title: 'Lineas a Poligonos',
            desc: 'Trocea, recompone lineas y convierte a poligono.',
            cat: 'Vector',
            requires: ['reader_file', 'geo_chunk', 'geo_line_merge', 'geo_line_to_polygon', 'writer_geojson'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 100, 180);
                const n2 = addNode('geo_chunk', 370, 180);
                const n3 = addNode('geo_line_merge', 640, 180);
                const n4 = addNode('geo_line_to_polygon', 910, 180);
                const n5 = addNode('writer_geojson', 1180, 180);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
                editor.addConnection(n4, n5, 'output_1', 'input_1');
            }
        },
        {
            id: 'raster_sample_points',
            title: 'Raster + Puntos',
            desc: 'Muestreo multibanda sobre GeoTIFF y export CSV.',
            cat: 'Raster',
            requires: ['reader_file', 'sp_point_sampling', 'writer_csv'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 90, 120);
                const n2 = addNode('reader_file', 90, 300);
                const n3 = addNode('sp_point_sampling', 430, 210);
                const n4 = addNode('writer_csv', 760, 210);
                editor.addConnection(n1, n3, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_2');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
            }
        }
    ];

    let templateFilterText = '';
    let templateFilterCat = 'Todas';

    function resetWorkspace() {
        if (editor) editor.clear();
        if (window.JETLRuntimeCache && typeof window.JETLRuntimeCache.clearAll === 'function') {
            window.JETLRuntimeCache.clearAll();
        }
        executionData = {};
        window.executionData = executionData;
        currentRunTimestamp = 0;
        if (typeof historyStack !== 'undefined') {
            historyStack.length = 0;
            historyIndex = -1;
        }
        Object.values(mapLayers).forEach(l => {
            try { map.removeLayer(l); } catch (e) {}
            try { if (layerControl) layerControl.removeLayer(l); } catch (e) {}
        });
        mapLayers = {};
        if (layerControl) {
            try { map.removeControl(layerControl); } catch (e) {}
            layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
        }
        if (typeof addToHistory === 'function') addToHistory();
        SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
        if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') window.JETLSchemaUI.refreshAll();
    }

    function slugify(text) {
        return String(text || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'template_custom';
    }

    function getCustomTemplates() {
        try {
            const raw = SafeStorage.load(CUSTOM_TEMPLATES_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(t => t && typeof t === 'object' && t.id && t.title && t.graph);
        } catch (e) {
            console.warn('Error leyendo plantillas custom', e);
            return [];
        }
    }

    function saveCustomTemplates(list) {
        const safe = Array.isArray(list) ? list : [];
        SafeStorage.save(CUSTOM_TEMPLATES_KEY, JSON.stringify(safe));
    }

    function getAllTemplates() {
        const custom = getCustomTemplates().map((t) => ({ ...t, source: 'custom' }));
        return [...BUILTIN_TEMPLATES, ...custom];
    }

    function collectRequiredToolsFromGraph(graph) {
        const home = (((graph || {}).drawflow || {}).Home || {});
        const nodes = Object.values(home.data || {});
        const keys = nodes.map(n => String((n && (n.name || n.class)) || '')).filter(Boolean);
        return Array.from(new Set(keys));
    }

    function ensureUniqueId(baseId, existing) {
        const taken = new Set((existing || []).map(t => String(t.id || '')));
        if (!taken.has(baseId)) return baseId;
        let i = 2;
        while (taken.has(`${baseId}_${i}`)) i++;
        return `${baseId}_${i}`;
    }

    function saveCurrentAsTemplate(opts) {
        const fromOpts = opts && typeof opts === 'object';
        const name = fromOpts
            ? String(opts.title || '').trim()
            : (prompt('Nombre de la plantilla', 'Mi plantilla') || '').trim();
        if (!name) return null;
        const desc = fromOpts
            ? String(opts.desc || '').trim()
            : (prompt('Descripcion (opcional)', 'Plantilla creada desde el workspace actual') || '').trim();
        const cat = fromOpts
            ? String(opts.cat || 'Custom').trim()
            : (prompt('Categoria', 'Custom') || 'Custom').trim();

        const graph = editor && typeof editor.export === 'function' ? editor.export() : null;
        if (!graph || !graph.drawflow) {
            showToast('No se pudo capturar el workspace actual', 'error');
            return null;
        }

        const existing = getCustomTemplates();
        const forcedId = fromOpts ? String(opts.id || '').trim() : '';
        const id = ensureUniqueId(forcedId || slugify(name), existing);
        const tpl = {
            id,
            title: name,
            desc: desc || 'Plantilla custom',
            cat: cat || 'Custom',
            requires: collectRequiredToolsFromGraph(graph),
            graph,
            createdAt: new Date().toISOString()
        };
        existing.push(tpl);
        saveCustomTemplates(existing);
        showToast('Plantilla guardada', 'success');
        return tpl;
    }

    function addCustomTemplateObject(raw) {
        if (!raw || typeof raw !== 'object' || !raw.graph) {
            throw new Error('Plantilla custom invalida');
        }
        const existing = getCustomTemplates();
        const id = ensureUniqueId(slugify(raw.id || raw.title || 'template_custom'), existing);
        const title = String(raw.title || 'Plantilla custom').trim();
        const desc = String(raw.desc || 'Plantilla custom').trim();
        const cat = String(raw.cat || 'Custom').trim() || 'Custom';
        const requires = Array.isArray(raw.requires)
            ? raw.requires.map(x => String(x || '').trim()).filter(Boolean)
            : collectRequiredToolsFromGraph(raw.graph);
        const tpl = {
            id,
            title,
            desc,
            cat,
            requires,
            graph: raw.graph,
            createdAt: raw.createdAt || new Date().toISOString()
        };
        existing.push(tpl);
        saveCustomTemplates(existing);
        return tpl;
    }

    function exportCustomTemplates() {
        const custom = getCustomTemplates();
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            templates: custom
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jetl_templates_custom.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Exportadas ${custom.length} plantillas custom`, 'info');
    }

    function importTemplatesFromFile(file, onDone) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const txt = String(reader.result || '');
                const data = JSON.parse(txt);
                const incoming = Array.isArray(data) ? data : (Array.isArray(data.templates) ? data.templates : []);
                if (!incoming.length) throw new Error('JSON sin plantillas');

                const existing = getCustomTemplates();
                const merged = [...existing];
                incoming.forEach((raw, idx) => {
                    if (!raw || typeof raw !== 'object' || !raw.graph) return;
                    const baseId = slugify(raw.id || raw.title || `import_${idx + 1}`);
                    const id = ensureUniqueId(baseId, merged);
                    const title = String(raw.title || `Importada ${idx + 1}`).trim();
                    const desc = String(raw.desc || 'Plantilla importada').trim();
                    const cat = String(raw.cat || 'Custom').trim() || 'Custom';
                    const requires = Array.isArray(raw.requires)
                        ? raw.requires.map(x => String(x || '').trim()).filter(Boolean)
                        : collectRequiredToolsFromGraph(raw.graph);
                    merged.push({
                        id,
                        title,
                        desc,
                        cat,
                        requires,
                        graph: raw.graph,
                        createdAt: raw.createdAt || new Date().toISOString()
                    });
                });

                saveCustomTemplates(merged);
                showToast('Plantillas importadas', 'success');
                if (typeof onDone === 'function') onDone();
            } catch (e) {
                showToast(`Importacion fallida: ${e && e.message ? e.message : e}`, 'error');
            }
        };
        reader.onerror = () => showToast('No se pudo leer el archivo', 'error');
        reader.readAsText(file);
    }

    function deleteCustomTemplate(id) {
        const list = getCustomTemplates();
        const next = list.filter(t => String(t.id) !== String(id));
        saveCustomTemplates(next);
        showToast('Plantilla eliminada', 'info');
        return list.length !== next.length;
    }

    function ensureTemplateControls(modal, list) {
        let controls = document.getElementById('templates-controls');
        if (controls) return controls;

        controls = document.createElement('div');
        controls.id = 'templates-controls';
        controls.style.display = 'grid';
        controls.style.gridTemplateColumns = '1fr 160px auto auto auto';
        controls.style.gap = '8px';
        controls.style.padding = '10px 12px 0 12px';

        const input = document.createElement('input');
        input.id = 'templates-filter-input';
        input.className = 'node-control';
        input.placeholder = 'Filtrar plantillas...';
        input.style.background = '#111';
        input.style.border = '1px solid #444';
        input.style.color = '#eee';
        input.style.padding = '6px 8px';
        input.style.borderRadius = '4px';

        const select = document.createElement('select');
        select.id = 'templates-filter-cat';
        select.className = 'node-control';
        select.style.background = '#111';
        select.style.border = '1px solid #444';
        select.style.color = '#eee';
        select.style.padding = '6px 8px';
        select.style.borderRadius = '4px';

        const btnSave = document.createElement('button');
        btnSave.className = 'btn';
        btnSave.textContent = 'Guardar actual';
        btnSave.title = 'Guardar workspace actual como plantilla custom';

        const btnImport = document.createElement('button');
        btnImport.className = 'btn';
        btnImport.textContent = 'Importar JSON';

        const btnExport = document.createElement('button');
        btnExport.className = 'btn';
        btnExport.textContent = 'Exportar JSON';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        fileInput.id = 'templates-import-file';

        controls.appendChild(input);
        controls.appendChild(select);
        controls.appendChild(btnSave);
        controls.appendChild(btnImport);
        controls.appendChild(btnExport);
        controls.appendChild(fileInput);
        list.parentElement.insertBefore(controls, list);

        input.addEventListener('input', () => {
            templateFilterText = input.value || '';
            renderTemplateList(list);
        });
        select.addEventListener('change', () => {
            templateFilterCat = select.value || 'Todas';
            renderTemplateList(list);
        });
        btnSave.addEventListener('click', () => {
            saveCurrentAsTemplate();
            renderTemplateList(list);
            const sel = controls.querySelector('#templates-filter-cat');
            if (sel) {
                const cats = ['Todas', ...Array.from(new Set(getAllTemplates().map(t => t.cat || 'General'))).sort()];
                sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
                if (cats.includes(templateFilterCat)) sel.value = templateFilterCat;
            }
        });
        btnImport.addEventListener('click', () => fileInput.click());
        btnExport.addEventListener('click', () => exportCustomTemplates());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            importTemplatesFromFile(file, () => renderTemplateList(list));
            fileInput.value = '';
        });

        return controls;
    }

    function renderTemplateList(list) {
        if (!list) return;
        const all = getAllTemplates();

        list.innerHTML = '';
        const q = String(templateFilterText || '').toLowerCase();
        const cat = templateFilterCat || 'Todas';
        const filtered = all.filter((t) => {
            const textOk = !q || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
            const catOk = cat === 'Todas' || (t.cat || 'General') === cat;
            return textOk && catOk;
        });

        filtered.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.setAttribute('data-template-id', t.id);
            const catBadge = `<span style="font-size:0.66rem; color:#9ecbff; border:1px solid #355; border-radius:10px; padding:1px 6px; margin-left:6px;">${t.cat || 'General'}</span>`;
            const srcBadge = t.source === 'custom'
                ? '<span style="font-size:0.66rem; color:#ffd39b; border:1px solid #664a24; border-radius:10px; padding:1px 6px; margin-left:6px;">Custom</span>'
                : '';
            const delBtn = t.source === 'custom'
                ? '<button class="btn" data-template-del="1" style="margin-left:auto; padding:2px 6px" title="Eliminar plantilla"><i class="fas fa-trash"></i></button>'
                : '';
            card.innerHTML = `
                <div class="template-title" style="display:flex; align-items:center; gap:4px;">${t.title}${catBadge}${srcBadge}${delBtn}</div>
                <div class="template-desc">${t.desc}</div>
            `;
            list.appendChild(card);
        });

        if (!filtered.length) {
            const empty = document.createElement('div');
            empty.style.gridColumn = '1 / -1';
            empty.style.color = '#999';
            empty.style.padding = '8px';
            empty.style.fontSize = '0.85rem';
            empty.textContent = 'Sin plantillas para el filtro actual.';
            list.appendChild(empty);
        }
    }

    function openTemplatesModal() {
        const modal = document.getElementById('templates-modal');
        const list = document.getElementById('templates-list');
        if (!modal || !list) return;

        const controls = ensureTemplateControls(modal, list);
        const input = controls.querySelector('#templates-filter-input');
        const select = controls.querySelector('#templates-filter-cat');
        if (input) input.value = templateFilterText;
        if (select) {
            const cats = ['Todas', ...Array.from(new Set(getAllTemplates().map(t => t.cat || 'General'))).sort()];
            select.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
            select.value = cats.includes(templateFilterCat) ? templateFilterCat : 'Todas';
        }
        renderTemplateList(list);
        modal.style.display = 'flex';
    }

    function closeTemplatesModal() {
        const modal = document.getElementById('templates-modal');
        if (modal) modal.style.display = 'none';
    }

    function applyTemplate(id) {
        const tpl = getAllTemplates().find(t => String(t.id) === String(id));
        if (!tpl) return false;

        const missing = missingTools(tpl.requires || []);
        if (missing.length) {
            showToast(`Plantilla no disponible. Faltan nodos: ${missing.join(', ')}`, 'error');
            return false;
        }

        try {
            if (typeof tpl.apply === 'function') {
                tpl.apply();
            } else if (tpl.graph && editor && typeof editor.import === 'function') {
                resetWorkspace();
                editor.import(tpl.graph);
                if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                    setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
                }
                if (typeof addToHistory === 'function') addToHistory();
                SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
            } else {
                throw new Error('Plantilla invalida');
            }
            showToast('Plantilla aplicada', 'success');
            return true;
        } catch (e) {
            showToast(`Error aplicando plantilla: ${e && e.message ? e.message : e}`, 'error');
            return false;
        }
    }

    const listEl = document.getElementById('templates-list');
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const delBtn = e.target.closest('[data-template-del="1"]');
            if (delBtn) {
                const card = e.target.closest('.template-card[data-template-id]');
                const id = card ? card.getAttribute('data-template-id') : null;
                if (id) {
                    deleteCustomTemplate(id);
                    renderTemplateList(listEl);
                }
                return;
            }

            const card = e.target.closest('.template-card[data-template-id]');
            if (!card) return;
            const id = card.getAttribute('data-template-id');
            if (!id) return;
            applyTemplate(id);
            closeTemplatesModal();
        });
    }

    window.openTemplatesModal = openTemplatesModal;
    window.closeTemplatesModal = closeTemplatesModal;
    window.applyTemplate = applyTemplate;
    window.JETLTemplates = {
        listAll: () => getAllTemplates(),
        listCustom: () => getCustomTemplates(),
        saveCurrent: (opts) => saveCurrentAsTemplate(opts),
        addCustom: (tpl) => addCustomTemplateObject(tpl),
        deleteCustom: (id) => deleteCustomTemplate(id),
        exportPayload: () => ({
            version: 1,
            exportedAt: new Date().toISOString(),
            templates: getCustomTemplates()
        }),
        importPayload: (payload) => {
            const incoming = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.templates) ? payload.templates : []);
            if (!incoming.length) return { added: 0 };
            let added = 0;
            incoming.forEach((raw) => {
                try {
                    addCustomTemplateObject(raw);
                    added++;
                } catch (e) {}
            });
            return { added };
        },
        apply: (id) => applyTemplate(id)
    };
})();

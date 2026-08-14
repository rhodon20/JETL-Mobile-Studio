// =============================================
// WORKSPACE PARAMS UI
// =============================================
(function () {
    function ensureRowsContainer() {
        return document.getElementById('params-rows');
    }

    function getParamMapFromUI() {
        const rows = Array.from(document.querySelectorAll('#params-rows [data-param-row]'));
        const out = {};
        rows.forEach((row) => {
            const k = (row.querySelector('[data-param-key]')?.value || '').trim();
            const v = row.querySelector('[data-param-val]')?.value || '';
            if (!k) return;
            out[k] = v;
        });
        return out;
    }

    function addParamRow(key = '', value = '') {
        const rows = ensureRowsContainer();
        if (!rows) return;
        const row = document.createElement('div');
        row.setAttribute('data-param-row', '1');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr auto';
        row.style.gap = '6px';
        row.style.marginBottom = '6px';
        row.innerHTML = `
            <input data-param-key class="node-control" placeholder="param_key" value="${String(key).replace(/"/g, '&quot;')}">
            <input data-param-val class="node-control" placeholder="valor" value="${String(value).replace(/"/g, '&quot;')}">
            <button class="btn" data-ui-action="remove-param-row" title="Eliminar"><i class="fas fa-times"></i></button>
        `;
        rows.appendChild(row);
    }

    function openParamsModal() {
        const modal = document.getElementById('params-modal');
        const rows = ensureRowsContainer();
        if (!modal || !rows) return;
        rows.innerHTML = '';
        const data = (window.JETLParams && typeof window.JETLParams.getAll === 'function')
            ? window.JETLParams.getAll()
            : {};
        const keys = Object.keys(data || {});
        if (!keys.length) addParamRow('', '');
        else keys.forEach((k) => addParamRow(k, data[k]));
        modal.style.display = 'flex';
    }

    function closeParamsModal() {
        const modal = document.getElementById('params-modal');
        if (modal) modal.style.display = 'none';
    }

    function saveParamsFromModal() {
        const map = getParamMapFromUI();
        if (window.JETLParams && typeof window.JETLParams.setAll === 'function') {
            window.JETLParams.setAll(map);
        }
        closeParamsModal();
        if (typeof showToast === 'function') showToast('Parametros guardados', 'success');
    }

    document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');
        if (action === 'open-params') openParamsModal();
        else if (action === 'close-params') closeParamsModal();
        else if (action === 'save-params') saveParamsFromModal();
        else if (action === 'add-param-row') addParamRow('', '');
        else if (action === 'remove-param-row') {
            const row = actionEl.closest('[data-param-row]');
            if (row) row.remove();
        }
    });

    window.openParamsModal = openParamsModal;
    window.closeParamsModal = closeParamsModal;
})();

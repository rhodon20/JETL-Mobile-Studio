// Borrador local del flujo (dueño único): se guarda en cada cambio para poder
// recuperarlo si el navegador cierra la app. La clave del flujo se conserva para
// leer borradores antiguos; los metadatos (fecha y nodos) van aparte.
const DRAFT_KEY = 'jetl_flow_optimized';
const DRAFT_META_KEY = 'jetl_flow_draft_meta';

const countNodes = (flow) => Object.keys(flow?.drawflow?.Home?.data || {}).length;

function saveDraft(flow) {
    SafeStorage.save(DRAFT_KEY, JSON.stringify(flow));
    SafeStorage.save(DRAFT_META_KEY, JSON.stringify({ savedAt: Date.now(), nodes: countNodes(flow) }));
}

// Flujo guardado, o null si no hay. Lanza si el borrador está dañado.
function loadDraft() {
    const saved = SafeStorage.load(DRAFT_KEY);
    return saved ? JSON.parse(saved) : null;
}

function clearDraft() {
    SafeStorage.clear(DRAFT_KEY);
    SafeStorage.clear(DRAFT_META_KEY);
}

function hasDraft() {
    return !!SafeStorage.load(DRAFT_KEY);
}

// { savedAt, nodes } del borrador, o null si no hay o está dañado. savedAt es null
// en borradores guardados antes de existir los metadatos.
function draftInfo() {
    let flow;
    try { flow = loadDraft(); } catch (error) { return null; }
    if (!flow) return null;
    let meta = {};
    try { meta = JSON.parse(SafeStorage.load(DRAFT_META_KEY) || '{}') || {}; } catch (error) { meta = {}; }
    return { savedAt: Number.isFinite(meta.savedAt) ? meta.savedAt : null, nodes: countNodes(flow) };
}

export { saveDraft, loadDraft, clearDraft, hasDraft, draftInfo };

// Accesos directos de la app instalada (manifest.json > shortcuts): abren la app
// con ?action=… Se atienden una vez y se quitan de la URL para que recargar no
// los repita. Devuelve true si la acción ya decidió qué hacer con el borrador.
import { restoreLocalDraft } from '../engine.js';
import { offerDraftRecovery } from './draftPrompt.js';

const ACTIONS = {
    // Flujo vacío. Si hay un borrador se sigue ofreciendo: el acceso directo no
    // debe hacer perder trabajo sin preguntar.
    new: () => {
        if (!offerDraftRecovery()) showToast('Proyecto nuevo', 'success');
    },
    draft: () => {
        if (!restoreLocalDraft()) offerDraftRecovery();
    },
    // El navegador exige un toque para abrir el selector de archivos: se abre la
    // hoja Proyecto con «Abrir» a mano.
    open: () => {
        window.JETLNativeNav?.('project');
        document.querySelector('#mobile-project-sheet [data-ui-action="open-project"]')?.focus();
        offerDraftRecovery();
    },
    history: () => {
        offerDraftRecovery();
        window.JETLOpenRunHistory?.();
    }
};

// Arranque: atiende ?action=… o, si no hay, ofrece el borrador como siempre.
function runLaunchAction() {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action !== null) {
        params.delete('action');
        const query = params.toString();
        history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
    }
    (ACTIONS[action] || offerDraftRecovery)();
}

export { runLaunchAction };

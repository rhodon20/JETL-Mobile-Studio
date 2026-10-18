// Aviso de recuperación al abrir la app. El borrador nunca se restaura en
// silencio (un flujo que bloquee la app la dejaría inservible al reabrir), pero
// tampoco puede perderse sin querer: la primera edición lo sobrescribiría. Por
// eso el aviso exige elegir entre recuperar y descartar.
import { draftInfo, clearDraft } from '../state/draft.js';
import { restoreLocalDraft, updateLocalDraftUI } from '../engine.js';

const UNITS = [['day', 86400000], ['hour', 3600000], ['minute', 60000]];

// «hace 2 horas», «ayer»… o null si la fecha no se conoce.
function describeDraftAge(savedAt, now = Date.now()) {
    if (!Number.isFinite(savedAt)) return null;
    const elapsed = Math.max(0, now - savedAt);
    const format = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    for (const [unit, ms] of UNITS) {
        if (elapsed >= ms) return format.format(-Math.floor(elapsed / ms), unit);
    }
    return 'hace un momento';
}

function closeDraftRecovery(modal) {
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
}

// Muestra el aviso si hay un borrador con nodos. Devuelve si lo ha mostrado.
function offerDraftRecovery() {
    const modal = document.getElementById('draft-recovery-modal');
    const info = draftInfo();
    if (!modal || !info || info.nodes === 0) return false;
    const age = describeDraftAge(info.savedAt);
    const nodes = `${info.nodes} ${info.nodes === 1 ? 'nodo' : 'nodos'}`;
    document.getElementById('draft-recovery-detail').textContent = age ? `Guardado ${age} · ${nodes}` : nodes;
    modal.onclick = (event) => {
        const choice = event.target.closest('[data-draft-recovery]')?.getAttribute('data-draft-recovery');
        if (!choice) return;
        closeDraftRecovery(modal);
        if (choice === 'restore') {
            restoreLocalDraft();
        } else {
            clearDraft();
            updateLocalDraftUI();
        }
    };
    modal.style.display = 'flex';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modal.querySelector('[data-draft-recovery="restore"]')?.focus();
    return true;
}

export { offerDraftRecovery, describeDraftAge };

// Historial de ejecuciones guardado en el navegador y exportación de informes.
import { buildRunReport } from '../engine/runPlan.js';

window.lastRunReport = null;
const RUN_HISTORY_KEY = 'jetl_run_history_v1';
const RUN_HISTORY_LIMIT = 30;

function loadRunHistory() {
    try {
        const raw = SafeStorage.load(RUN_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map((report, index) => ({
            ...report,
            history_id: report?.history_id || `legacy_${report?.run_id || report?.generated_at || index}_${index}`
        })) : [];
    } catch (error) {
        console.warn('[JETL] No se pudo leer el historial de ejecuciones', error);
        return [];
    }
}

function publishRunReport(report) {
    const entry = {
        ...report,
        history_id: report?.history_id || `run_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        captured_at: new Date().toISOString()
    };
    window.lastRunReport = entry;
    try {
        const history = loadRunHistory();
        history.unshift(entry);
        SafeStorage.save(RUN_HISTORY_KEY, JSON.stringify(history.slice(0, RUN_HISTORY_LIMIT)));
        JETLEvents.emit('run:recorded', entry);
    } catch (error) {
        console.warn('[JETL] No se pudo guardar el historial de ejecuciones', error);
    }
    return entry;
}

function downloadRunReport(format = 'json', reportOverride = null) {
    const report = reportOverride || window.lastRunReport || buildRunReport('Manual', 'unknown', null);
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
        const head = 'id,node,label,category,status,error,ms,count,output_1,output_2,output_3,cached';
        const rows = (report.nodes || []).map(n => [
            n.id,
            `"${String(n.node || '').replace(/"/g, '""')}"`,
            `"${String(n.label || '').replace(/"/g, '""')}"`,
            `"${String(n.category || '').replace(/"/g, '""')}"`,
            n.status || 'unknown',
            `"${String(n.error || '').replace(/"/g, '""')}"`,
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

export { RUN_HISTORY_KEY, loadRunHistory, publishRunReport, downloadRunReport };

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
        geoWorkerPool = new GeoWorkerPool('js/geo.worker.js?v=20260824-2', size);
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
        const liveMonitor = document.getElementById('loader')?.dataset.status === 'running';
        if (loaderMsg && !liveMonitor) loaderMsg.innerText = `Procesando (${load.pending} en curso / ${load.queued} en cola)...`;
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
// El pool se crea bajo demanda al ejecutar una operación espacial. Arrancar
// varios Workers durante la primera pintura penaliza especialmente a Safari.

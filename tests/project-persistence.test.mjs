import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/projectPersistence.js', import.meta.url), 'utf8');
const schemaUI = readFileSync(new URL('../js/schemaUI.js', import.meta.url), 'utf8');

function loadPersistence() {
    const context = { window: {}, globalThis: {}, JSON, Object, Array, String, Date };
    vm.runInNewContext(source, context, { filename: 'projectPersistence.js' });
    return context.window.JETLProjectPersistence;
}

function featureCollection(name = 'Editado') {
    return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: null, properties: { id: 1, name } }]
    };
}

test('exportar un proyecto declara sus copias editables de Readers', () => {
    const persistence = loadPersistence();
    const copy = featureCollection();
    const node = {
        id: 'node-42',
        querySelector(selector) {
            return selector === '[df-reader-edited-data]' ? { value: JSON.stringify(copy) } : null;
        }
    };
    const project = persistence.createProject({ drawflow: {} }, { querySelectorAll: () => [node] }, 123);

    assert.equal(project.version, '2026.08.25');
    assert.equal(project.timestamp, 123);
    assert.equal(project.reader_working_copies['42'].features[0].properties.name, 'Editado');
    assert.equal(project.reader_working_copies['42'].metadata.source_mode, 'project_working_copy');
});

test('importar restaura la copia sin necesitar la ruta ni el archivo original', () => {
    const persistence = loadPersistence();
    const storage = { value: '' };
    const summary = { textContent: '' };
    const node = {
        querySelector(selector) {
            if (selector === '[df-reader-edited-data]') return storage;
            if (selector === '[data-reader-file-summary]') return summary;
            return null;
        }
    };
    const report = persistence.restoreReaderWorkingCopies(
        { getElementById: (id) => id === 'node-7' ? node : null },
        { 7: featureCollection('Persistente') }
    );

    assert.deepEqual({ ...report }, { restored: 1, skipped: 0 });
    assert.equal(JSON.parse(storage.value).features[0].properties.name, 'Persistente');
    assert.equal(summary.textContent, 'Copia del proyecto · 1 entidades');
});

test('la importación rechaza copias manipuladas o fuera de límite', () => {
    const persistence = loadPersistence();
    const tooMany = { type: 'FeatureCollection', features: Array.from({ length: 5001 }, () => ({ type: 'Feature', geometry: null, properties: {} })) };
    const report = persistence.restoreReaderWorkingCopies(
        { getElementById: () => ({ querySelector: () => ({ value: '' }) }) },
        { bad: { type: 'Point', coordinates: [0, 0] }, huge: tooMany }
    );

    assert.deepEqual({ ...report }, { restored: 0, skipped: 2 });
});

test('los proyectos anteriores siguen importándose sin sobre de copias', () => {
    const persistence = loadPersistence();
    const legacyFlow = { drawflow: { Home: { data: {} } } };
    const parsed = persistence.parseProject({ version: '2026.03.05', flow: legacyFlow });
    assert.equal(parsed.flow, legacyFlow);
    assert.deepEqual({ ...parsed.readerWorkingCopies }, {});
});

test('el editor identifica una copia restaurada aunque iOS ya no conserve el archivo', () => {
    assert.match(schemaUI, /Copia portable del proyecto/);
    assert.match(schemaUI, /function _readerNodeSummary[\s\S]+Copia del proyecto/);
    assert.match(schemaUI, /closeReaderEditor\(save\)[\s\S]+_readerNodeSummary\(nodeEl\)/);
});

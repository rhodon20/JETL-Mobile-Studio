import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const visualization = readFileSync(new URL('../js/visualization.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../css/ui-system.css', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../css/mobile.css', import.meta.url), 'utf8');

test('las pestañas y los selectores de caché ocupan barras independientes', () => {
    assert.match(index, /<div id="panel-tabs">[\s\S]*?<\/div>\s*<div id="results-context-bar"/);
    assert.match(visualization, /contextBar\.appendChild\(wrap\)/);
    assert.doesNotMatch(visualization, /tabs\.insertBefore\(wrap, tabs\.lastElementChild\)/);
    assert.match(ui, /#results-context-bar:empty\s*\{\s*display: none;/);
    assert.match(mobile, /#panel-tabs\s*\{[\s\S]*?flex: 0 0 54px;[\s\S]*?overflow: hidden;/);
});

test('la apariencia final neutraliza los colores de demostración de Drawflow', () => {
    const vendorPosition = index.indexOf('background:#0ff');
    const neutralPosition = index.indexOf('.drawflow .drawflow-node,\n.drawflow .drawflow-node.selected');
    assert.ok(vendorPosition >= 0, 'la prueba debe detectar el estilo heredado');
    assert.ok(neutralPosition > vendorPosition, 'el override neutral debe cargarse después del proveedor');
    assert.match(ui, /\.drawflow \.drawflow-node\.selected\s*\{[\s\S]*?background: var\(--node\);/);
    assert.match(ui, /border-color: var\(--accent\) !important;/);
});

test('la revisión publicada invalida la caché del runtime modificado', () => {
    assert.match(index, /const JETL_RUNTIME_VERSION = '20260824-15'/);
    assert.match(index, /js\/engine\.js\?v=20260824-24/);
});

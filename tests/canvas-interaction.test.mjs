import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const shell = readFileSync(new URL('../js/shell.js', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../js/ui/catalog.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('el paneo del editor desplaza también la cuadrícula visible', () => {
    assert.match(shell, /editor\.on\('translate', scheduleCanvasViewportSync\)/);
    assert.match(catalog, /backgroundPosition = x \+ 'px ' \+ y \+ 'px'/);
    assert.match(catalog, /dataset\.viewport = Math\.round\(x\)/);
});

test('el zoom del editor escala también la cuadrícula visible', () => {
    assert.match(shell, /editor\.on\('zoom', scheduleCanvasViewportSync\)/);
    assert.match(catalog, /backgroundSize = \(25 \* zoom\) \+ 'px ' \+ \(25 \* zoom\) \+ 'px'/);
});

test('Pages solicita la revisión del motor que contiene el feedback del lienzo', () => {
    assert.match(index, /js\/engine\.js\?v=20261017-1/);
});

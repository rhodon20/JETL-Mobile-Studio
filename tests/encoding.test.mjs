import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
// UTF-8 leído como Latin-1/CP1252 y guardado otra vez: una «í» se ve como «A con
// tilde» seguida de otro carácter. Escapado para no detectarse a sí mismo.
const MOJIBAKE = /[\u00C3\u00C2][\u0080-\u00BF]|\u00E2\u20AC/;

test('el código y la documentación no tienen texto con la codificación rota', () => {
    const files = execFileSync('git', ['ls-files', '*.js', '*.mjs', '*.css', '*.html', '*.md', '*.json'], { cwd: root, encoding: 'utf8' })
        .split('\n').filter((file) => file && !file.includes('vendor/'));
    const broken = files.flatMap((file) => readFileSync(new URL(file, root), 'utf8').split('\n')
        .map((line, i) => (MOJIBAKE.test(line) ? `${file}:${i + 1}` : null)).filter(Boolean));
    assert.deepEqual(broken, []);
});

// index.html inlines startup-critical CSS and JS (fewer requests before first
// paint; it was added for Safari startup). The files under css/ and js/ are the
// source of truth: this script copies them into the inline blocks.
//
// Inside <style data-jetl-critical-css> and <script data-jetl-core-inline>, every
// `/* ---- path ---- */` line starts a copy of that file, which runs until the next
// marker. `/* ---- end of inlined files ---- */` closes the last one; anything after
// it is hand-written and kept as is.
//
// Usage: node scripts/inline-assets.mjs           rewrite index.html
//        node scripts/inline-assets.mjs --check   exit 1 if index.html is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const BLOCKS = [/(<style data-jetl-critical-css>\n)([\s\S]*?)(\n\s*<\/style>)/, /(<script data-jetl-core-inline>\n)([\s\S]*?)(\n\s*<\/script>)/];
const MARKER = /^\/\* ---- (.+?) ---- \*\/$/;
const END = 'end of inlined files';

export function inlineAssets(html) {
    for (const re of BLOCKS) {
        const m = html.match(re);
        if (!m) throw new Error(`inline block not found: ${re}`);
        const lines = m[2].split('\n');
        const out = [];
        let skipping = false;
        for (const line of lines) {
            const mk = line.match(MARKER);
            if (mk) {
                out.push(line);
                if (mk[1] === END) {
                    skipping = false;
                } else {
                    out.push(fs.readFileSync(path.join(ROOT, mk[1]), 'utf8').replace(/\n+$/, ''));
                    skipping = true;
                }
                continue;
            }
            if (!skipping) out.push(line);
        }
        html = html.replace(re, (_, open, _body, close) => open + out.join('\n') + close);
    }
    return html;
}

const current = fs.readFileSync(INDEX, 'utf8');
const next = inlineAssets(current);
if (process.argv.includes('--check')) {
    if (next !== current) {
        console.error('[inline-assets] index.html is out of date: run `npm run inline` after editing inlined files');
        process.exit(1);
    }
    console.log('[inline-assets] OK');
} else {
    fs.writeFileSync(INDEX, next);
    console.log('[inline-assets] index.html updated');
}

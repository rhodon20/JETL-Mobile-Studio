const fs = require('fs');
const path = require('path');

const extractNodes = (source) => {
    let nodes = [];
    let startIdx = source.indexOf('const TOOL_REGISTRY = {');
    if (startIdx === -1) return [];

    let blockStart = source.indexOf('{', startIdx) + 1;

    let currentKey = '';
    let currentContentStart = -1;
    let braceCount = 0;

    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let inSingleComment = false;
    let inMultiComment = false;

    for (let i = blockStart; i < source.length; i++) {
        const char = source[i];
        const nextChar = source[i + 1] || '';

        // Comment handling
        if (!inString && !inTemplate && !inSingleComment && !inMultiComment) {
            if (char === '/' && nextChar === '/') { inSingleComment = true; i++; continue; }
            if (char === '/' && nextChar === '*') { inMultiComment = true; i++; continue; }
        } else if (inSingleComment) {
            if (char === '\n') { inSingleComment = false; }
            continue;
        } else if (inMultiComment) {
            if (char === '*' && nextChar === '/') { inMultiComment = false; i++; }
            continue;
        }

        // String/Template handling
        if (!inString && !inTemplate) {
            if (char === "'" || char === '"') { inString = true; stringChar = char; }
            else if (char === '`') { inTemplate = true; }
        } else if (inString) {
            if (char === '\\') { i++; continue; }
            if (char === stringChar) { inString = false; }
            continue;
        } else if (inTemplate) {
            if (char === '\\') { i++; continue; }
            if (char === '`') { inTemplate = false; }
            continue;
        }

        if (braceCount === 0) {
            let keyMatch = source.substring(i).match(/^\s*([a-zA-Z0-9_]+)\s*:\s*\{/);
            if (keyMatch) {
                currentKey = keyMatch[1];
                currentContentStart = i + keyMatch[0].indexOf('{');
                i = currentContentStart;
                braceCount = 1;
                continue;
            }
            if (char === '}') break; // End of TOOL_REGISTRY
        } else {
            if (char === '{') braceCount++;
            else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    let content = source.substring(currentContentStart, i + 1);
                    let catMatch = content.match(/cat\s*:\s*['"`](.*?)['"`]/);
                    let cat = catMatch ? catMatch[1] : 'MISC';
                    nodes.push({ key: currentKey, content: content, cat: cat });
                }
            }
        }
    }
    return nodes;
};

const main = () => {
    const mainFilePath = path.join(__dirname, 'js', 'tools.js');
    console.log("Leyendo: " + mainFilePath);
    const code = fs.readFileSync(mainFilePath, 'utf8');

    const nodes = extractNodes(code);
    if (nodes.length === 0) {
        console.log("Error: No se encontraron nodos para dividir.");
        return;
    }

    const groups = {};
    nodes.forEach(n => {
        let prefix = 'misc';
        if (n.cat.includes('READERS')) prefix = 'readers';
        else if (n.cat.includes('GEOMETRY')) prefix = 'geometry';
        else if (n.cat.includes('SPATIAL') || n.cat.includes('OPERATIONS')) prefix = 'spatial';
        else if (n.cat.includes('ATTRIBUTES')) prefix = 'attributes';
        else if (n.cat.includes('RASTER')) prefix = 'raster';
        else if (n.cat.includes('WRITERS')) prefix = 'writers';
        else if (n.cat.includes('UTILS') || n.cat.includes('EXT')) prefix = 'utils';

        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(`    ${n.key}: ${n.content}`);
    });

    const nodesDir = path.join(__dirname, 'js', 'nodes');
    if (!fs.existsSync(nodesDir)) fs.mkdirSync(nodesDir, { recursive: true });

    let indexHtmlScripts = '';

    for (let g in groups) {
        // En lugar de sobreescribir const, extendemos el objeto
        let fileContent = `// Cat: ${g}\nwindow.TOOL_REGISTRY = window.TOOL_REGISTRY || {};\nObject.assign(window.TOOL_REGISTRY, {\n${groups[g].join(',\n\n')}\n});\n`;
        const filePath = path.join(nodesDir, `${g}.js`);
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log(`Creado ${g}.js con ${groups[g].length} herramientas.`);
        indexHtmlScripts += `    <script src="js/nodes/${g}.js"></script>\n`;
    }

    // Actualizar tools.js
    const newToolsContent = `// =================================================================
// 🛠️ JETL TOOL REGISTRY - MODULED ROOT
// =================================================================
window.TOOL_REGISTRY = window.TOOL_REGISTRY || {};
// Los nodos están definidos dentro de js/nodes/
`;
    fs.writeFileSync(mainFilePath, newToolsContent, 'utf8');

    console.log("\n======= ¡Módulos divididos con éxito! =======");
    console.log("Ahora debes actualizar tu index.html para cargar todos los scripts generados en la carpeta js/nodes/, justo antes de js/tools.js:\n");
    console.log(indexHtmlScripts);
};

main();

const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'js', 'nodes');
if (fs.existsSync(nodesDir)) {
    const files = fs.readdirSync(nodesDir);
    for (const file of files) {
        if (file.endsWith('.js')) {
            const filePath = path.join(nodesDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            content = content.replace(/window\.TOOL_REGISTRY/g, "(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY");
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
    console.log("Archivos adaptados.");
}

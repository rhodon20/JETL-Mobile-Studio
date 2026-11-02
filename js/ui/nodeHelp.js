// Ayuda de un nodo: al tocar el icono (i) de su cabecera se abre una tarjeta con el
// nombre, la explicación y el nombre de referencia (alias: el habitual en otras
// herramientas). En pantalla táctil no hay «pasar el ratón», así que el title no basta.
let card = null;

function ensureCard() {
    if (card) return card;
    card = document.createElement('div');
    card.id = 'node-help-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.hidden = true;
    card.innerHTML = `<div class="node-help-head"><i class="fas" aria-hidden="true"></i><div><strong></strong><small></small></div>
        <button type="button" class="node-help-close" aria-label="Cerrar ayuda"><i class="fas fa-times" aria-hidden="true"></i></button></div><p></p>`;
    card.querySelector('.node-help-close').addEventListener('click', closeNodeHelp);
    document.body.appendChild(card);
    // Tocar fuera la cierra; el propio icono de ayuda la abre (no la cierra al vuelo).
    document.addEventListener('pointerdown', (event) => {
        if (!card.hidden && !card.contains(event.target) && !event.target.closest('.node-help')) closeNodeHelp();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !card.hidden) closeNodeHelp();
    });
    return card;
}

function showNodeHelp(nodeId) {
    const node = editor?.drawflow?.drawflow?.Home?.data?.[nodeId];
    const tool = node && TOOL_REGISTRY[node.name];
    if (!tool || !tool.help) return;
    const el = ensureCard();
    el.querySelector('.node-help-head > i').className = `fas ${tool.icon || 'fa-cube'}`;
    el.querySelector('.node-help-head > i').style.color = tool.color || '';
    el.querySelector('strong').textContent = tool.label;
    el.querySelector('small').textContent = tool.alias ? `También conocido como «${tool.alias}»` : '';
    el.querySelector('p').textContent = tool.help;
    el.hidden = false;
}

function closeNodeHelp() {
    if (card) card.hidden = true;
}

export { showNodeHelp, closeNodeHelp };

// Mapa del visor de resultados con MapLibre GL (WebGL). Sustituye a Leaflet: con
// 174.022 polígonos, mover un mapa de Leaflet tardaba 7,4 s por paso y MapLibre
// lo hace en ~33 ms (ROADMAP > Visor con MapLibre), así que se pintan todas las
// entidades en lugar de una muestra.
//
// Este módulo sólo sabe pintar: cada nodo tiene una fuente GeoJSON ligera
// (geometría en EPSG:4326 y, por entidad, su índice `_idx` y su color `__c`).
// Qué se selecciona, la tabla y la simbología siguen en visualization.js.

const BLANK_STYLE = {
    version: 8,
    sources: {},
    layers: [{ id: 'jetl-background', type: 'background', paint: { 'background-color': '#121212' } }]
};
const POLYGONS = ['Polygon', 'MultiPolygon'];
const LINES = ['LineString', 'MultiLineString'];
const POINTS = ['Point', 'MultiPoint'];
const FOCUS = 'jetl-focus';
// Margen al tocar: con el dedo una línea o un punto pequeños son difíciles de acertar.
const TAP_TOLERANCE = 10;

const nodeLayers = new Map();   // nodeId -> { label, color, data, bounds, count, visible }
let focusData = null;
let popup = null;
let layerListRefresh = () => {};

const sourceId = (nodeId) => `jetl-src-${nodeId}`;
const layerIds = (nodeId) => [`jetl-${nodeId}-fill`, `jetl-${nodeId}-line`, `jetl-${nodeId}-circle`];
const geometryIs = (types) => ['in', ['geometry-type'], ['literal', types]];

function emptyCollection() {
    return { type: 'FeatureCollection', features: [] };
}

function addNodeToStyle(map, nodeId, entry) {
    if (!map.getSource(sourceId(nodeId))) map.addSource(sourceId(nodeId), { type: 'geojson', data: entry.data });
    // Por debajo del resaltado de la selección, que siempre queda encima.
    const before = map.getLayer(`${FOCUS}-fill`) ? `${FOCUS}-fill` : undefined;
    const visibility = entry.visible ? 'visible' : 'none';
    const [fill, line, circle] = layerIds(nodeId);
    map.addLayer({ id: fill, type: 'fill', source: sourceId(nodeId), filter: geometryIs(POLYGONS), layout: { visibility }, paint: { 'fill-color': ['get', '__c'], 'fill-opacity': 0.3 } }, before);
    map.addLayer({ id: line, type: 'line', source: sourceId(nodeId), filter: geometryIs([...LINES, ...POLYGONS]), layout: { visibility }, paint: { 'line-color': ['get', '__c'], 'line-width': 1.5, 'line-opacity': 0.9 } }, before);
    map.addLayer({
        id: circle, type: 'circle', source: sourceId(nodeId), filter: geometryIs(POINTS), layout: { visibility },
        paint: {
            'circle-color': ['get', '__c'],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 14, 5, 18, 7],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 0, 14, 1],
            'circle-opacity': 0.9
        }
    }, before);
}

function addFocusToStyle(map) {
    if (map.getSource(FOCUS)) return;
    map.addSource(FOCUS, { type: 'geojson', data: focusData || emptyCollection() });
    map.addLayer({ id: `${FOCUS}-fill`, type: 'fill', source: FOCUS, filter: geometryIs(POLYGONS), paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.45 } });
    map.addLayer({ id: `${FOCUS}-line`, type: 'line', source: FOCUS, filter: geometryIs([...LINES, ...POLYGONS]), paint: { 'line-color': '#e74c3c', 'line-width': 4 } });
    map.addLayer({ id: `${FOCUS}-circle`, type: 'circle', source: FOCUS, filter: geometryIs(POINTS), paint: { 'circle-color': '#e74c3c', 'circle-radius': 9, 'circle-stroke-color': '#f1c40f', 'circle-stroke-width': 3 } });
}

// Un estilo nuevo (el mapa base al cargar o al caer a OpenStreetMap) borra las
// fuentes y capas propias: se vuelven a poner encima.
function restoreLayers(map) {
    addFocusToStyle(map);
    nodeLayers.forEach((entry, nodeId) => addNodeToStyle(map, nodeId, entry));
}

// Si el estilo admite ya fuentes y capas propias. No vale map.isStyleLoaded(): en
// MapLibre 5 devuelve false mientras cargan teselas (del mapa base, por ejemplo) y
// la capa se quedaba sin añadir. Se sigue con los eventos del estilo.
function styleReady(map) {
    return !!(map && map.__jetlStyleReady);
}

class FitControl {
    constructor(onFit) { this.onFit = onFit; }
    onAdd() {
        this.el = document.createElement('div');
        this.el.className = 'maplibregl-ctrl maplibregl-ctrl-group jetl-fit-control';
        const button = document.createElement('button');
        button.type = 'button';
        button.title = 'Encuadrar capas';
        button.setAttribute('aria-label', 'Encuadrar capas');
        button.innerHTML = '<i class="fas fa-expand" aria-hidden="true"></i>';
        button.addEventListener('click', () => this.onFit());
        this.el.appendChild(button);
        return this.el;
    }
    onRemove() { this.el.remove(); }
}

// Lista de capas con su color y una casilla para mostrarla u ocultarla.
class LayerListControl {
    constructor(map) { this.map = map; }
    onAdd() {
        this.el = document.createElement('div');
        this.el.className = 'maplibregl-ctrl maplibregl-ctrl-group jetl-layer-control';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.title = 'Capas';
        toggle.setAttribute('aria-label', 'Capas');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i class="fas fa-layer-group" aria-hidden="true"></i>';
        this.list = document.createElement('div');
        this.list.className = 'jetl-layer-list';
        this.list.hidden = true;
        toggle.addEventListener('click', () => {
            this.list.hidden = !this.list.hidden;
            toggle.setAttribute('aria-expanded', String(!this.list.hidden));
        });
        this.el.append(toggle, this.list);
        layerListRefresh = () => this.render();
        this.render();
        return this.el;
    }
    render() {
        this.el.hidden = nodeLayers.size === 0;
        this.list.replaceChildren(...[...nodeLayers].map(([nodeId, entry]) => {
            const row = document.createElement('label');
            row.className = 'jetl-layer-row';
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.checked = entry.visible;
            check.addEventListener('change', () => setNodeLayerVisible(this.map, nodeId, check.checked));
            const swatch = document.createElement('span');
            swatch.className = 'jetl-layer-swatch';
            swatch.style.background = entry.color;
            const name = document.createElement('span');
            name.textContent = entry.label;
            row.append(check, swatch, name);
            return row;
        }));
    }
    onRemove() { this.el.remove(); layerListRefresh = () => {}; }
}

// Crea el mapa; lanza un error si el dispositivo no tiene WebGL.
export function createMap(container, { onFitAll, onTap }) {
    const map = new maplibregl.Map({
        container,
        style: BLANK_STYLE,
        center: [-3.703, 40.416],
        zoom: 5,
        fadeDuration: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: { compact: true }
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new FitControl(onFitAll), 'top-left');
    map.addControl(new LayerListControl(map), 'top-right');
    map.on('styledataloading', () => { map.__jetlStyleReady = false; });
    map.on('style.load', () => { map.__jetlStyleReady = true; restoreLayers(map); });
    map.on('click', (event) => {
        const { x, y } = event.point;
        const ids = [...nodeLayers.keys()].flatMap(layerIds).filter((id) => map.getLayer(id));
        if (!ids.length) return;
        const hit = map.queryRenderedFeatures([[x - TAP_TOLERANCE, y - TAP_TOLERANCE], [x + TAP_TOLERANCE, y + TAP_TOLERANCE]], { layers: ids })[0];
        if (!hit) return;
        const nodeId = String(hit.source).replace('jetl-src-', '');
        onTap(nodeId, Number(hit.properties._idx), event.lngLat);
    });
    return map;
}

// Pinta (o vuelve a pintar) la capa de un nodo. `collection` ya está en EPSG:4326
// y cada entidad trae `_idx` y `__c` en sus propiedades.
export function setNodeLayer(map, nodeId, { collection, label, color }) {
    const id = String(nodeId);
    const previous = nodeLayers.get(id);
    const entry = {
        label, color, data: collection, count: collection.features.length,
        bounds: collection.features.length ? turf.bbox(collection) : null,
        visible: previous ? previous.visible : true
    };
    nodeLayers.set(id, entry);
    if (styleReady(map)) {
        if (map.getSource(sourceId(id))) map.getSource(sourceId(id)).setData(collection);
        else addNodeToStyle(map, id, entry);
    }
    layerListRefresh();
    return entry;
}

export function getNodeLayer(nodeId) {
    return nodeLayers.get(String(nodeId)) || null;
}

export function setNodeLayerVisible(map, nodeId, visible) {
    const entry = nodeLayers.get(String(nodeId));
    if (!entry) return;
    entry.visible = visible;
    if (styleReady(map)) layerIds(nodeId).forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'));
    layerListRefresh();
}

export function clearNodeLayers(map) {
    if (map && styleReady(map)) {
        nodeLayers.forEach((entry, nodeId) => {
            layerIds(nodeId).forEach((id) => map.getLayer(id) && map.removeLayer(id));
            if (map.getSource(sourceId(nodeId))) map.removeSource(sourceId(nodeId));
        });
    }
    nodeLayers.clear();
    setFocus(map, null);
    layerListRefresh();
}

// Resalta una entidad (ya en EPSG:4326) por encima de todas las capas; null la quita.
export function setFocus(map, feature) {
    focusData = feature ? { type: 'FeatureCollection', features: [feature] } : null;
    if (map && styleReady(map) && map.getSource(FOCUS)) map.getSource(FOCUS).setData(focusData || emptyCollection());
    if (!feature && popup) { popup.remove(); popup = null; }
}

export function showPopup(map, lngLat, html) {
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px', className: 'jetl-popup' }).setLngLat(lngLat).setHTML(html).addTo(map);
}

// Encuadra [minX, minY, maxX, maxY]. Sin animación: el visor acaba de abrirse y
// el usuario quiere ver los datos ya.
export function fitBounds(map, bounds, maxZoom = 17) {
    if (!map || !bounds || !bounds.every(Number.isFinite)) return false;
    map.resize();
    const [minX, minY, maxX, maxY] = bounds;
    map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 30, maxZoom, duration: 0 });
    return true;
}

export function visibleBounds() {
    const boxes = [...nodeLayers.values()].filter((e) => e.visible && e.bounds).map((e) => e.bounds);
    if (!boxes.length) return null;
    return [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))];
}

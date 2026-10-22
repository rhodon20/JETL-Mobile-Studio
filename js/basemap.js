// Dark basemap without API keys, as the style of the MapLibre map.
// Primary: OpenFreeMap "dark" vector style (no key, no request limits). CARTO's
// dark_all, used before, now needs an API key.
// Fallback: OpenStreetMap raster tiles, darkened with raster paint properties,
// when the style does not load in time. Setting a style removes the data layers;
// js/ui/mapEngine.js puts them back on 'style.load'.
(function () {
    const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
    const STYLE_TIMEOUT_MS = 8000;
    const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

    // Inverted and hue-rotated, like the CSS filter used with Leaflet before.
    const OSM_STYLE = {
        version: 8,
        sources: { osm: { type: 'raster', tiles: [OSM_URL], tileSize: 256, maxzoom: 19, attribution: OSM_ATTRIBUTION } },
        layers: [
            { id: 'jetl-background', type: 'background', paint: { 'background-color': '#121212' } },
            { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-brightness-min': 0.95, 'raster-brightness-max': 0.05, 'raster-hue-rotate': 180, 'raster-contrast': -0.1 } }
        ]
    };

    async function fetchStyle() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), STYLE_TIMEOUT_MS);
        try {
            const response = await fetch(STYLE_URL, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    // Resolves to the basemap in use: 'openfreemap' or 'osm'.
    async function addBasemap(map) {
        try {
            map.setStyle(await fetchStyle(), { diff: false });
            return 'openfreemap';
        } catch (error) {
            console.warn('[basemap] OpenFreeMap no disponible, se usa OpenStreetMap:', error && error.message ? error.message : error);
            map.setStyle(OSM_STYLE, { diff: false });
            return 'osm';
        }
    }

    window.JETLAddBasemap = addBasemap;
})();

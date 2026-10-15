// Dark basemap without API keys.
// Primary: OpenFreeMap "dark" vector style (no key, no request limits) drawn by
// MapLibre GL through its Leaflet plugin; both are loaded on demand because
// MapLibre is ~1 MB. CARTO's dark_all, used before, now needs an API key.
// Fallback: OpenStreetMap raster tiles darkened with a CSS filter, used when
// WebGL/MapLibre is unavailable or the style does not load in time.
(function () {
    const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
    const STYLE_TIMEOUT_MS = 8000;
    const OPENFREEMAP_ATTRIBUTION =
        '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
        '&copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
        'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
    const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

    function ensureStyles() {
        if (document.getElementById('jetl-basemap-styles')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'js/vendor/maplibre/maplibre-gl.css';
        document.head.appendChild(link);
        const style = document.createElement('style');
        style.id = 'jetl-basemap-styles';
        style.textContent = '.jetl-basemap-dark { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }';
        document.head.appendChild(style);
    }

    function addFallback(map, reason) {
        if (map.__jetlBasemapFallback) return;
        console.warn('[basemap] OpenFreeMap no disponible, se usa OpenStreetMap:', reason);
        map.__jetlBasemapFallback = L.tileLayer(OSM_URL, {
            maxZoom: 19,
            attribution: OSM_ATTRIBUTION,
            className: 'jetl-basemap-dark'
        }).addTo(map);
    }

    async function addBasemap(map) {
        ensureStyles();
        let glLayer = null;
        try {
            await window.JETLLoadScriptOnce('js/vendor/maplibre/maplibre-gl.js', 'maplibregl');
            await window.JETLLoadScriptOnce('js/vendor/maplibre/leaflet-maplibre-gl.js', 'MaplibreGLLeaflet');
            glLayer = L.maplibreGL({ style: STYLE_URL, attribution: OPENFREEMAP_ATTRIBUTION }).addTo(map);
        } catch (error) {
            addFallback(map, error && error.message ? error.message : error);
            return 'osm';
        }

        // Tile errors after the style is ready are transient; only a style that never
        // loads means the provider is unreachable.
        const glMap = glLayer.getMaplibreMap();
        return new Promise((resolve) => {
            let settled = false;
            const fail = (reason) => {
                if (settled) return;
                settled = true;
                map.removeLayer(glLayer);
                addFallback(map, reason);
                resolve('osm');
            };
            const timer = setTimeout(() => fail('timeout'), STYLE_TIMEOUT_MS);
            glMap.once('style.load', () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve('openfreemap');
            });
            glMap.on('error', (e) => {
                if (!glMap.isStyleLoaded()) fail(e && e.error && e.error.message ? e.error.message : 'style error');
            });
        });
    }

    // Resolves to the basemap in use: 'openfreemap' or 'osm'.
    window.JETLAddBasemap = addBasemap;
})();

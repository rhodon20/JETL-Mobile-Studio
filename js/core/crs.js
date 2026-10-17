// Sistemas de referencia para pintar: el mapa trabaja en grados (EPSG:4326), así
// que una colección en otro CRS se reproyecta al dibujarla, sin tocar los datos del
// nodo. El CRS se lee con la misma convención que los nodos (metadata.crs, el `crs`
// de GeoJSON o properties._crs de las entidades).

// Definiciones proj4 disponibles sin red (proj4 ya trae EPSG:4326 y EPSG:3857).
const CRS_DEFS = {
    'EPSG:25829': '+proj=utm +zone=29 +ellps=GRS80 +units=m +no_defs +type=crs',
    'EPSG:25830': '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs +type=crs',
    'EPSG:25831': '+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs +type=crs',
    'EPSG:23030': '+proj=utm +zone=30 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs'
};

// 'EPSG:25830', '25830', 'urn:ogc:def:crs:EPSG::25830' -> 'EPSG:25830'; CRS84 -> 'EPSG:4326'.
function normalizeCrs(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    if (/CRS84$/i.test(text)) return 'EPSG:4326';
    const code = text.match(/^(\d+)$/) || text.match(/EPSG:{1,2}(\d+)/i);
    return code ? `EPSG:${code[1]}` : text.toUpperCase();
}

export function detectCrs(collection) {
    const tagged = (collection?.features || []).find((feature) => feature?.properties?._crs);
    return normalizeCrs(collection?.metadata?.crs || collection?.crs?.properties?.name || tagged?.properties?._crs);
}

function projectionTo4326(crs) {
    if (typeof proj4 === 'undefined') return null;
    if (!proj4.defs(crs) && CRS_DEFS[crs]) proj4.defs(crs, CRS_DEFS[crs]);
    if (!proj4.defs(crs)) return null;
    return proj4(crs, 'EPSG:4326');
}

function mapCoordinates(coordinates, transform) {
    return typeof coordinates[0] === 'number' ? transform(coordinates) : coordinates.map((part) => mapCoordinates(part, transform));
}

function geometryTo4326(geometry, projection) {
    if (!geometry) return geometry;
    if (geometry.type === 'GeometryCollection') {
        return { ...geometry, geometries: (geometry.geometries || []).map((part) => geometryTo4326(part, projection)) };
    }
    if (!Array.isArray(geometry.coordinates)) return geometry;
    return { ...geometry, coordinates: mapCoordinates(geometry.coordinates, (coordinate) => projection.forward([coordinate[0], coordinate[1]])) };
}

// `crs` permite pasar el CRS ya detectado (p. ej. en los datos completos cuando se
// pinta una muestra). Devuelve { collection, crs, unsupported }. Las entidades nuevas conservan el mismo
// objeto `properties`, del que depende la selección entre tabla y mapa (_idx).
// Si hay un CRS pero no su definición, la colección se devuelve tal cual y
// unsupported=true para que la interfaz lo avise.
export function toDisplayCrs(collection, crs = detectCrs(collection)) {
    if (!crs || crs === 'EPSG:4326') return { collection, crs, unsupported: false };
    const projection = projectionTo4326(crs);
    if (!projection) return { collection, crs, unsupported: true };
    return {
        collection: {
            ...collection,
            features: collection.features.map((feature) => ({ ...feature, geometry: geometryTo4326(feature.geometry, projection) }))
        },
        crs,
        unsupported: false
    };
}

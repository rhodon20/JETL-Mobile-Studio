# JETL Studio - JavaScript ETL Geoespacial (v2026.03.05)

JETL es una webapp ETL geoespacial visual y client-side (sin backend obligatorio), inspirada en flujos tipo FME Workbench.

## Estado actual
- App funcional en navegador moderno (Chrome/Edge/Firefox).
- Smoke test integrado en runtime (`JETLSmoke.runExtended()`), validado 38/38.
- Registro base de nodos estable y extensible via paquetes comunitarios.
- Pipeline de lectura, transformacion, visualizacion y export funcionando en pruebas manuales.

## Capacidades principales
- Editor visual de nodos con Drawflow.
- Mapa interactivo con Leaflet.
- Tabla de atributos con:
  - ordenacion por columnas,
  - filtro rapido (texto/campo),
  - seleccion multiple,
  - export de seleccion (GeoJSON/CSV).
- Ejecucion total y parcial por nodo.
- Plantillas de flujo.
- Simbologia por atributos (categorica y cuantiles).
- Persistencia local de flujo (`LocalStorage`) y carga/guardado de proyectos `.jetl`.

## I/O y formatos
- Readers: GeoJSON/JSON/KML/ZIP Shapefile, OSM, GeoTIFF, GPKG (experimental), Parquet (experimental).
- Writers: GeoJSON, CSV, KML, GPKG (experimental), Parquet (experimental).
- KML import/export reparado y validado en smoke basico.

## Mejoras recientes (2026-03-05)
- Schema UI reactivo:
  - `Attribute Join` con desplegables de campos por Input 1/Input 2.
  - `Field Calculator Pro` con insercion guiada de campos.
- Hardening UI:
  - migracion masiva de handlers inline a delegacion de eventos (`data-ui-action`, `data-node-action`, `data-table-action`).
- Seguridad minima en formulas:
  - evaluador con validacion de expresion y bloqueo de tokens peligrosos para calculators de atributos.
- Gestion de cache runtime:
  - limpieza unificada de `_file_cache` y `_tiff_cache`,
  - referencia `node -> tiffRef` para evitar fugas al recargar GeoTIFF en el mismo nodo.

## Estructura clave
- `index.html`: shell UI principal.
- `js/engine.js`: orquestacion, eventos, carga/guardado.
- `js/processNode.js`: ejecucion de nodos.
- `js/visualization.js`: mapa, tabla, filtros, export.
- `js/schemaUI.js`: schema discovery y UI dinamica en nodos de atributos.
- `js/formats.js`: lectura/escritura de formatos.
- `js/smoke.js`: smoke tests integrados.
- `js/templates.js`: plantillas de flujo.
- `ROADMAP.md`: plan operativo y log de avance.

## Smoke test rapido
En consola del navegador:

```js
await JETLSmoke.runBasic()
```

Salida esperada: `pass: 4, fail: 0`.

Suite ampliada (smoke + core nodos atributos):

```js
await JETLSmoke.runExtended()
```

Incluye validaciones de:
- `Stats Calc` (columnas `stats_*` visibles y correctas),
- `Tester` con condiciones combinadas `AND/OR`.

Suite estable de regresion (sin checks worker volatiles):

```js
await JETLSmoke.runStable()
```

Gate de release (lanza error si falla):

```js
await JETLSmoke.runGate('stable')
```

Protocolo completo de pruebas: `TESTING.md`.

## Limitaciones actuales
- Proyecto en evolucion: la suite automatizada completa aun esta en construccion.
- GPKG y Parquet siguen en estado experimental.
- Datasets muy grandes pueden requerir ajustes de performance.

## Roadmap
El roadmap vivo y el historial de iteraciones estan en `ROADMAP.md`.

## Calidad y release
- Matriz de compatibilidad por navegador: `COMPATIBILITY_MATRIX.md`.
- Checklist estandar de release/regresion: `RELEASE_CHECKLIST.md`.

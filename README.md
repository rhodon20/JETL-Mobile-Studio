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
Scripts clásicos (globales compartidos) organizados en capas. Cada capa sólo usa
las inferiores; `npm run check` (tests/check-graph.mjs) lo comprueba en CI y hoy
el grafo no tiene violaciones ni ciclos.

| Capa | Archivos | Qué hace |
|---|---|---|
| boot | script inline de la cabecera | estado de arranque, informe de errores, `JETLLoadScriptOnce` |
| core | `js/core.js`, `js/params.js` (inline) | estado compartido con dueño único, `JETLEvents`, `log`/`showToast`, utilidades |
| services | `js/formats.js`, `js/core/workerPool.js`, `js/basemap.js`, `js/motion.js`, cargador inline | formatos, workers, mapa base, animación, carga diferida |
| nodes | `js/nodes/*.js`, `js/tools.js` | catálogo de herramientas (`TOOL_REGISTRY`) |
| engine | `js/processNode.js`, `js/engine/dirty.js`, `js/engine/runPlan.js` | ejecución de nodos, nodos sucios, plan, traza e informe |
| state | `js/state/history.js`, `js/state/runHistory.js`, `js/projectPersistence.js`, `js/packages.js` | deshacer/rehacer, historial de ejecuciones, proyecto, paquetes |
| app | `js/engine.js`, `js/templates.js` | comandos: proyecto, nodos, ejecutar |
| ui | `js/visualization.js`, `js/schemaUI.js`, `js/modalSystem.js`, `js/mobile.js`, `js/ui/*.js`, navegación inline (`data-jetl-nav`) | mapa, tabla, controles de nodo, monitor, catálogo, vista móvil |
| shell | `js/shell.js` | arranque y cableado del DOM (se carga el último) |

Las capas inferiores no llaman a la interfaz: anuncian lo ocurrido con
`JETLEvents.emit` y la UI se suscribe (`log`, `toast`, `run:start`, `run:node`,
`run:finish`, `node:added`, `node:error`, `tools:changed`, `workspace:reset`,
`workspace:replaced`, `canvas:fit`, `flow:show`, `results:closed`).

`index.html` incrusta core, params, formats y el CSS crítico para el primer
pintado: se regeneran desde los archivos con `npm run inline` (nunca a mano).
Las versiones de caché (`?v=`) no se escriben a mano: `npm run build` las pone en
`dist/` con el hash del contenido de cada archivo.

Pruebas: `npm test` (grafo, unitarias, smoke, flujo de la app y mapa base).

Versión desplegada: pulsa «JETL Studio» en la cabecera. Muestra el despliegue
que estás viendo y avisa (con botón Recargar) si hay uno más reciente; el sello
lo pone `scripts/build.mjs` en `index.html` y `version.json`.

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

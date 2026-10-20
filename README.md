# JETL Mobile Studio

ETL geoespacial visual que se ejecuta entero en el navegador (sin backend),
adaptado a móvil a partir de JETL Desktop. Se publica en GitHub Pages:
https://rhodon20.github.io/JETL-Mobile-Studio/

## Qué hace
- Editor visual de flujos (Drawflow) con ejecución total o hasta un nodo.
- Mapa (Leaflet + mapa base oscuro de OpenFreeMap, sin API key; si no responde,
  OpenStreetMap oscurecido) y tabla de atributos con orden, filtro, selección y
  export de la selección.
- Monitor de ejecución, historial de las últimas 30 ejecuciones con tiempos por
  nodo, e inspector de datos por puerto.
- Plantillas de flujo, parámetros globales (`${param}`), paquetes de
  transformadores, simbología por atributos.
- Proyectos `.jetl` (guardar/cargar) y borrador local en el navegador, con aviso
  para recuperarlo o descartarlo al abrir la app.
- Interfaz móvil: barra inferior (Nodos / Historial / Acciones / Resultados /
  Proyecto); cada destino es una hoja que sube desde abajo con la misma
  apariencia (Resultados ocupa casi toda la pantalla). Al encadenar nodos el
  flujo crece hacia abajo en dos columnas, en zigzag. «Acciones» abre un panel según el contexto:
  sin selección, ejecutar todo, buscar en el lienzo, validar el flujo (lista de
  problemas que lleva a cada nodo), nota en el lienzo, encuadrar, plantillas y
  parámetros; con un nodo seleccionado, ejecutar hasta él, ver su resultado,
  anotarlo (la nota va dentro del nodo), duplicarlo, centrarlo o eliminarlo. «Seleccionar varios» activa un modo en el que
  tocar un nodo lo marca y arrastrar uno marcado mueve el grupo; el panel ofrece
  entonces duplicar (con sus conexiones), eliminar, todos y ninguno. Durante una
  ejecución, el botón la cancela.

### Formatos
- Lectura: GeoJSON/JSON, KML, Shapefile (ZIP), OSM (Overpass), WKT, GeoTIFF,
  GPKG y Parquet (experimentales).
- Escritura: GeoJSON, CSV, KML, GPKG y Parquet (experimentales).
- Estado por navegador: `COMPATIBILITY_MATRIX.md`.

## Desarrollo

```sh
npm ci                     # dependencias de las pruebas (Playwright, acorn)
python3 -m http.server     # servir el repo y abrir http://localhost:8000
npm test                   # todo lo que se exige antes de publicar
npm run build              # genera dist/ (lo que se despliega)
```

Usa Node 22 (como el CI). La app debe servirse por HTTP, no con `file://`:
usa módulos ES y workers.

Reglas que conviene saber antes de tocar código:
- `index.html` incrusta core, params, formats y el CSS crítico. Edita los
  archivos de `js/` y `css/` y ejecuta `npm run inline`; `npm run check` falla si
  `index.html` quedó desfasado.
- No escribas versiones `?v=` a mano: las pone el build.
- Iconos y pantallas de arranque (Android/iOS) salen de `icons/icon.svg`:
  `node scripts/generate-icons.mjs` los regenera y enlaza en `index.html`.
- Respeta las capas (abajo). `npm run check` falla si un archivo usa algo de una
  capa superior, si aparece un ciclo o si se usa por nombre algo privado de otro
  módulo.
- Pruebas y criterios: `TESTING.md`. Publicar: `RELEASE_CHECKLIST.md`.

## Estructura clave
Módulos ES organizados en capas. Cada capa sólo usa las inferiores;
`npm run check` (tests/check-graph.mjs) lo comprueba en CI y hoy el grafo no tiene
violaciones ni ciclos.

- Son scripts clásicos sólo el núcleo incrustado en `index.html` (core, params,
  formats: estado compartido y utilidades globales para el primer pintado), la
  cabecera (arranque y navegación) y el cargador, más `basemap.js` y `motion.js`,
  que se cargan con el cargador de librerías.
- Los módulos se importan entre sí (`import`/`export`). Lo que necesita código
  clásico o el HTML (onclick, navegación de la cabecera, smoke) se publica
  explícitamente con `Object.assign(window, {...})`; el resto es privado.
- Los módulos bajo demanda (`visualization`, `schemaUI`, `modalSystem`,
  `templates`, `packages`) los carga el cargador con `import()`; nadie puede
  importarlos de forma estática sin perder la carga diferida. Lo que ellos
  importan (p. ej. `ui/notify.js`, registro y avisos) también va versionado.
- `visualization.js` (mapa, tabla, inspector de puertos, caché de entidades,
  simbología y paneles) es un único módulo a propósito: comparten la selección y
  el puerto mostrado de cada nodo y se llaman entre sí.

| Capa | Archivos | Qué hace |
|---|---|---|
| boot | script inline de la cabecera | estado de arranque, informe de errores, `JETLLoadScriptOnce` |
| core | `js/core.js`, `js/params.js` (inline) | estado compartido con dueño único, `JETLEvents`, `log`/`showToast`, utilidades |
| services | `js/formats.js`, `js/core/workerPool.js`, `js/core/crs.js`, `js/basemap.js`, `js/motion.js`, cargador inline | formatos, workers, CRS para pintar, mapa base, animación, carga diferida |
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

## Despliegue
Cada push a `main` pasa el CI (`.github/workflows/ci.yml`): comprobaciones,
pruebas unitarias, smoke, flujo de la app y mapa base, build de `dist/` y las
mismas pruebas contra `dist/`. Si todo pasa, publica `dist/` en GitHub Pages.

## Limitaciones conocidas
- **Sin modo sin conexión.** El service worker está retirado (`sw.js` se
  desregistra) desde un bloqueo de arranque en Safari; es el siguiente bloque
  del roadmap.
- GPKG y Parquet son experimentales; los nodos raster de Desktop están fuera de
  alcance (`docs/NODE_CATALOG_PARITY.md`).
- Datos grandes: falta perfilar ejecuciones lentas reales.
- En Safari anterior a 16.4 (sin *import maps*) la app funciona, pero los
  módulos importados se descargan sin versión de caché.

## Documentación
- `ROADMAP.md`: estado y próximos pasos (y el registro histórico).
- `HANDOFF.md`: cómo retomar el trabajo.
- `TESTING.md`, `RELEASE_CHECKLIST.md`, `COMPATIBILITY_MATRIX.md`.
- `docs/`: paridad con JETL Desktop (nodos e interfaz).

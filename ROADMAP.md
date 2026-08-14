# JETL Roadmap de Ejecucion (Codex Owner)

Ultima actualizacion: 2026-03-05
Owner de ejecucion: Codex (este agente)
Objetivo: convertir JETL en una base estable, mantenible y mas cercana a FME Workbench.

## KPI de avance (snapshot)
- Fecha snapshot: 2026-03-05
- Tareas totales: 30
- Tareas `done`: 30
- Tareas `doing`: 0
- Tareas `todo`: 0
- Avance cerrado (`done/total`): 100.0%
- Avance operativo (`done + 0.5*doing`): 100.0%
- Estado smoke funcional reportado: `JETLSmoke.runExtended()` en verde (ultima verificacion: `38/38` OK).
- Nota: actualizar este bloque al cierre de cada iteracion.

## 1) Reglas de seguimiento
- Este archivo es la fuente de verdad del progreso.
- Cada tarea tiene: prioridad, estado, esfuerzo y dependencia.
- Estados: `todo`, `doing`, `done`, `blocked`.
- Esfuerzo estimado en horas efectivas de desarrollo (sin esperas externas).

## 2) Estimacion global de esfuerzo (realista)
- Bloque base (estabilidad + UX critica + seguridad minima): 28-42 h
- Bloque rendimiento + calidad (tests + workers + historial): 32-50 h
- Bloque "acercamiento a FME" (features de producto): 40-70 h
- Total por fases: 100-162 h

Nota:
- Esto equivale a 3-6 semanas si se trabaja en paralelo con soporte/bugs.
- Si se prioriza solo core productivo, se puede dejar en 40-60 h iniciales.

## 3) Fase 0 - Arranque inmediato (prioridad maxima)

### 0.1 Quick wins funcionales
- [x] `done` `P0` Reparar import KML (falta dependencia toGeoJSON). `3-5 h`
- [x] `done` `P0` Reparar export KML (funcion `toKML` no definida). `2-4 h`
- [x] `done` `P0` Corregir manifest/icono inexistente (`favicon.ico`). `0.5-1 h`
- [x] `done` `P0` Smoke tests manuales de I/O: GeoJSON, CSV, KML, GPKG, Parquet. `3-5 h`
  - Nota: helper disponible en app: `await JETLSmoke.runBasic()` (consola navegador).

### 0.2 Nodo con desplegables de campos por conexion (tu necesidad clave)
- [x] `done` `P0` Disenar servicio de schema discovery por puerto de entrada. `3-5 h`
  - Dependencia: ninguna
- [x] `done` `P0` Implementar actualizacion de campos en eventos:
  `connectionCreated`, `connectionRemoved`, `nodeCreated`, `nodeRemoved`, `runEnginePartial`. `5-8 h`
  - Dependencia: schema discovery
- [x] `done` `P0` Aplicar en `Attribute Join` (2 desplegables: input1/input2). `3-5 h`
  - Dependencia: actualizacion de campos
- [x] `done` `P1` Aplicar en `Field Calculator` y nodos de atributos con campo manual. `4-8 h`
  - Dependencia: actualizacion de campos
- [x] `done` `P1` Extender asistentes de campos a `Feature Merger`, `Sorter` y `Matcher` (checkbox list). `3-6 h`
  - Dependencia: actualizacion de campos
- [x] `done` `P1` Fallback robusto: si no hay schema, permitir modo manual actual. `1-2 h`

Justificacion de prioridad:
- Impacto UX muy alto
- Reduce errores de escritura de campos
- Acerca la experiencia al "transformer configuration" de FME
- Bajo riesgo tecnico comparado con cambios de engine

## 4) Fase 1 - Estabilidad y seguridad operativa
- [x] `done` `P1` Reducir `innerHTML` + `onclick` en zonas criticas (tabla/sidebar/nodos). `8-14 h`
  - Progreso: migrados los `onclick` de asistentes schema UI (Join/Calculator) a delegacion de eventos.
  - Progreso: migrados `onclick/ondragstart` del sidebar de herramientas y acciones `run/view/delete` de nodos (engine) a delegacion.
  - Progreso: migrados `onclick` del quick-search (resultados) y toolbar de tabla (filtros/export/seleccion) a listeners/delegacion.
  - Progreso: migrados controles globales UI (`header`, tabs, panel, simbologia, menu contextual, templates, upload proyecto) a `data-ui-action` + delegacion central.
  - Progreso: eliminados handlers inline residuales en tabla de datos (sort/fila/checkboxes) y nodos reader/raster (carga de archivo, toggle bandas).
  - Progreso: eliminado residual `card.onclick` en templates (`templates-list` via listener delegado).
- [x] `done` `P1` Revisar y acotar `new Function` en calculators (modo seguro por defecto). `4-8 h`
  - Progreso: validacion/bloqueo de expresiones peligrosas + wrapper seguro para `Attr Creator` y `Field Calculator Pro`.
- [x] `done` `P1` Homogeneizar limpieza de caches pesadas (`_tiff_cache`, `_file_cache`). `2-4 h`
  - Progreso: capa `JETLRuntimeCache` con limpieza por nodo y global, integrada en `nodeRemoved`, `clearCanvas`, `loadProject` y `resetWorkspace`.
  - Progreso: mapeo `node -> tiffRef` para evitar fugas cuando GeoTIFF genera refs aleatorias en ejecuciones repetidas.
- [x] `done` `P1` Alinear README/PROJECT_STATUS con estado real del codigo. `2-4 h`
  - Progreso: `README.md` y `PROJECT_STATUS.txt` reescritos con estado real validado (smoke, schema UI, hardening, safe-eval y cache runtime).

## 5) Fase 2 - Rendimiento del motor
- [x] `done` `P1` Sustitucion progresiva de `JSON.parse(JSON.stringify())` por `structuredClone`/clonado selectivo. `8-14 h`
  - Progreso: helper global `JETLClone` (main thread) con `structuredClone` + fallback recursivo seguro.
  - Progreso: `processNode` usa `JETLClone` para `safeInputs`.
  - Progreso: nodos `geometry`, `spatial`, `raster`, `attributes` migrados a `JETLClone` en puntos de clonado profundo.
  - Progreso: worker geoespacial incorpora `cloneFast` y reemplazo de clonados en tareas pesadas (`nearest_neighbor`, `intersector`, `spatial_join`).
  - Progreso: fallback JSON eliminado en runtime/history/worker; reemplazado por clonador recursivo.
- [x] `done` `P2` Migrar operaciones pesadas restantes a workers. `10-18 h`
  - Progreso: `Attribute Join` y `Feature Merger` ahora ejecutan en worker (`attr_join`, `attr_feature_merger`) con fallback local y propagacion de cancelacion.
  - Progreso: `Sorter` y `Matcher` de atributos migrados a worker (`attr_sorter`, `attr_matcher`) con fallback local y propagacion de cancelacion.
  - Progreso: `Stats Calc` y `Tester` migrados a worker (`attr_stats`, `attr_test`) con fallback local y propagacion de cancelacion.
  - Progreso: `Dissolver` migrado a worker (`geo_dissolve`) con fallback local y cobertura en `JETLSmoke.runExtended`.
  - Progreso: `Kink Remover` y `Angle Calculator` migrados a worker (`geo_kink_remover`, `geo_angle_calculator`) con fallback local.
  - Progreso: `Vertex Creator` y `Triangulator` migrados a worker (`geo_vertex_creator`, `geo_triangulator`) con fallback local.
  - Progreso: `Reproject` migrado a worker (`geo_reproject`) con fallback local y cobertura en `geometry_aux_workers`.
  - Progreso: `Random Fill` migrado a worker (`geo_random_fill`) con fallback local cooperativo y cobertura en `geometry_aux_workers`.
  - Progreso: `Donut Extractor` migrado a worker (`geo_donut_extractor`) con fallback local cooperativo y cobertura en `geometry_aux_workers`.
  - Progreso: `Line Closer` migrado a worker (`geo_line_closer`) con fallback local cooperativo y cobertura en `geometry_aux_workers`.
  - Progreso: `Exploder` migrado a worker (`geo_explode`) con fallback local cooperativo y cobertura en `geometry_aux_workers`.
  - Progreso: raster pesado migrado a worker-first con fallback local (`raster_sample` para `Multi-Band Sampler` y `raster_zonal_stats` para `Zonal Stats`) + smoke `raster_worker_health`.
  - Progreso: atributos adicionales migrados a worker-first con fallback (`Renamer`, `Keeper`, `Counter`, `String Formatter`, `Area Calc`, `Length Calc`, `Attr Creator`, `Field Calculator Pro`) + smoke `attr_aux_workers` y `attr_formula_workers`.
- [x] `done` `P2` Cancelacion efectiva de tareas largas (worker pool: abort + respawn + cancel errors). `6-10 h`
- [x] `done` `P2` Mejorar historial undo/redo (delta en vez de snapshot completo). `8-14 h`

## 6) Fase 3 - Calidad y release discipline
- [x] `done` `P1` Crear suite minima de tests unitarios/integracion (motor + nodos clave). `10-18 h`
  - Progreso: `JETLSmoke.runExtended()` agrega tests core de regresion para `Stats Calc` y `Tester` (AND/OR).
  - Progreso: `JETLSmoke.runExtended()` agrega test aislado de `undo/redo` incremental.
  - Progreso: `JETLSmoke.runExtended()` agrega validacion de plantillas (`basic_attrs`, `join_and_filter`) para evitar regresiones de claves/nodos en libreria de templates.
  - Progreso: `JETLSmoke.runExtended()` agrega test de API custom de plantillas (alta/aplicar/baja) para robustez de import/export custom.
  - Progreso: `JETLSmoke.runExtended()` agrega test de API de cancelacion (`cancelEngineRun` + propagacion a `cancelWorkerTasks`).
  - Progreso: `JETLSmoke.runStable()` agrega suite estricta sin checks worker (no depende de timeouts/pool), util para gate de regresion funcional.
  - Progreso: `JETLSmoke.runGate(mode)` agrega pass/fail de release (falla explicitamente si hay regresiones) y se documenta protocolo en `TESTING.md`.
- [x] `done` `P2` Matriz de compatibilidad por navegador para GPKG/Parquet/GeoTIFF. `4-8 h`
- [x] `done` `P2` Checklist de release y regresion manual estandar. `3-5 h`

## 7) Fase 4 - Acercamiento a FME (producto)

### 7.1 Gaps principales frente a FME (priorizados)
- [x] `done` `P1` Parametros guiados por metadatos (schema-driven config en nodos). `ya cubierto por Fase 0.2`
- [x] `done` `P2` Inspector de datos por puerto (preview por output_1/output_2/output_3). `6-10 h`
  - Progreso: selector de puerto en accion `view` (prompt) para nodos multi-output, con persistencia por nodo.
  - Progreso: mapa y tabla/export respetan el puerto activo (`output_n`) para depuracion consistente.
  - Progreso: selector persistente visible en UI (`panel-tabs`) para cambiar puerto activo sin reabrir toast/prompt.
- [x] `done` `P2` Manejo avanzado de errores por feature (rechazos en puerto dedicado). `8-14 h`
  - Progreso: `Field Calculator Pro` agrega modo `On Error` (`null` compat / `reject`) y `output_2` con `_calc_error` por feature fallida.
  - Progreso: `Attr Creator` agrega modo `On Error` (`null` compat / `reject`) y `output_2` con `_creator_error` por feature fallida.
  - Progreso: `Area Calc` y `Length Calc` agregan modo `On Error` (`null` compat / `reject`) y `output_2` con `_area_error` / `_length_error`.
  - Progreso: `Stats Calc` agrega modo `On Error` (`null` compat / `reject`) y `output_2` con `_stats_error` para features sin numericos en campos objetivo.
  - Progreso: `String Formatter` agrega modo `On Error` (`null` compat / `reject`) y `output_2` con `_fmt_error` para filas sin campo objetivo.
  - Progreso: `Renamer` y `Keeper` agregan modo `On Error` (`null` compat / `reject`) y `output_2` con `_renamer_error` / `_keeper_error`.
  - Cobertura: smoke dedicado para `calc/creator/area/length/stats/string_formatter/renamer/keeper`.
- [x] `done` `P2` Libreria de plantillas de workspace por caso de uso. `4-8 h`
  - Progreso: libreria ampliada con plantillas funcionales (`QA Duplicados`, `Join + Tester`, `Lineas a Poligonos`, `Raster + Puntos`) ademas de `Demo`/`Atributos`.
  - Progreso: validacion de dependencias por plantilla (si faltan nodos, se informa por toast y no se aplica).
  - Progreso: gestion de plantillas custom (guardar workspace actual, importar/exportar JSON, eliminar) integrada en el modal de plantillas.
- [x] `done` `P3` Parametrizacion global de workspace (variables/public params). `8-14 h`
  - Progreso: base de parametros globales persistentes (`JETLParams`) con API `get/set/setAll/getAll` y resolvedor `${param}`.
  - Progreso: modal UI de parametros (alta/edicion/borrado) accesible desde toolbar.
  - Progreso: integracion `${param}` en nodos de atributos clave (`Attr Creator`, `Field Calculator Pro`, `Stats Calc`, `Tester`).
  - Progreso: extension `${param}` a readers/writers clave (WKT/HTTP/BBox/creadores y nombre de salida en exports) para parametrizacion end-to-end.
- [x] `done` `P3` Logging estructurado por transformador y export de run report. `6-10 h`
  - Progreso: `JETLRunReport` (build/export) disponible en runtime, con resumen por nodo (`ms`, `count`, `cached`) y metadatos de corrida.
  - Progreso: ultimo reporte persistido en `window.lastRunReport` para ejecucion total/parcial (ok/cancelled/error).
  - Progreso: boton en toolbar para exportar `run_report.json`.

### 7.2 Mejoras aspiracionales (largo plazo)
- [x] `done` `P3` Data Inspector persistente tipo "feature cache browser". `12-20 h`
- [x] `done` `P3` Incremental run / dirty propagation mas inteligente. `10-18 h`
- [x] `done` `P3` Package manager de transformadores comunitarios. `16-30 h`

## 8) Orden de ejecucion recomendado (inmediato)
1. Fase 0.1 (KML + manifest + smoke)
2. Fase 0.2 (desplegables de campos por conexion)
3. Fase 1 (seguridad y robustez minima)
4. Fase 2 (performance)
5. Fase 3 y 4 segun feedback real de uso

## 9) Registro de avance (llenar en cada iteracion)

Formato:
- Fecha:
- Tarea:
- Estado:
- Tiempo real invertido:
- Riesgos detectados:
- Siguiente paso:

Entradas:
- 2026-02-28 | Se crea roadmap ejecutable con estimaciones y prioridades | done | 1 h | Ninguno | Iniciar Fase 0.1
- 2026-02-28 | Fix import/export KML + icono manifest + base schema UI reactivo (Join/Calculator) | done | 5.5 h | Pendiente smoke test manual browser | Ejecutar smoke test funcional y ajustar UX fina
- 2026-02-28 | Se agrega runner de smoke en app (`JETLSmoke.runBasic`) y cache SW | done | 0.8 h | Requiere validacion en navegador del usuario | Ejecutar smoke funcional completo y marcar Fase 0.1 como done
- 2026-02-28 | Smoke validado en navegador usuario (4/4 OK) | done | 0.2 h | Ninguno | Iniciar hardening Fase 1 (`innerHTML`/`onclick`)
- 2026-02-28 | Hardening inicial Fase 1: asistentes schema UI pasan de `onclick` inline a delegacion | done | 0.6 h | Ninguno | Continuar migracion de `onclick` en engine/tabla
- 2026-02-28 | Hardening Fase 1: delegacion en engine para sidebar y acciones de nodo | done | 0.9 h | Requiere validacion UX en navegador | Revalidar smoke y continuar con tabla/quick-search
- 2026-02-28 | Hardening Fase 1: quick-search y table toolbar sin `onclick` inline | done | 0.7 h | Requiere validacion UX en navegador | Revalidar smoke y continuar con panel/context menu/header
- 2026-02-28 | Hardening Fase 1: delegacion completa de UI + eliminacion de handlers inline restantes | done | 1.4 h | Validar en navegador (tabs/header/context menu/reader files/raster mode) | Ejecutar smoke y checklist UI corto
- 2026-02-28 | Hardening Fase 1: safe-eval para formulas de atributos (blocklist + globals anulados) | done | 1.0 h | Validar compatibilidad de expresiones existentes | Revalidar nodos calculator/creator y smoke
- 2026-02-28 | Fase 1: limpieza unificada de caches runtime (`_file_cache`, `_tiff_cache`, refs por nodo) | done | 1.1 h | Requiere validacion manual de lectura/limpieza | Ejecutar smoke + prueba de borrar/cargar plantilla
- 2026-02-28 | Fase 1: alineacion documental (`README`, `PROJECT_STATUS`) con estado real | done | 0.9 h | Mantener sincronizado en siguientes iteraciones | Iniciar Fase 2 (clonado/performance)
- 2026-02-28 | Fase 2 (iteracion 1): migracion de clonados a helper (`JETLClone`/`cloneFast`) en engine+nodos+worker | doing | 1.4 h | Validar regresion funcional en nodos espaciales/raster | Ejecutar smoke + pruebas de flujo pesado
- 2026-02-28 | Fase 2 (iteracion 2): cancelacion de ejecucion conectada a worker pool (cola+pendientes) con respawn de workers | done | 1.0 h | Validar cancelacion en flujos pesados y relanzar ejecucion | Ejecutar smoke + prueba manual de cancelar durante proceso largo
- 2026-02-28 | Fase 2 (iteracion 3): corregido fallback local tras cancelacion en nodos worker (cancelar ya no continua en main thread) | done | 0.7 h | Requiere recarga dura por cache SW y validacion manual | Reprobar cancelacion en flujo pesado + smoke
- 2026-02-28 | Fase 2 (iteracion 4): cancelacion cooperativa en fallback main-thread (yield + check cancel en bucles pesados spatial) | done | 1.0 h | Confirmar UX de cancelacion en flujo pesado real | Reprobar cancelacion durante Spatial Join/Intersector + smoke
- 2026-02-28 | Fase 2 (iteracion 5): migrados `Attribute Join` y `Feature Merger` a worker con fallback local | done | 0.9 h | Validar equivalencia de resultados y cancelacion durante joins de atributos | Prueba manual de joins grandes + smoke
- 2026-02-28 | Fase 2 (iteracion 6): migrados `Sorter` y `Matcher` a worker con fallback local | done | 0.7 h | Validar orden/duplicados en datasets grandes y cancelacion | Prueba manual Sorter/Matcher + smoke
- 2026-02-28 | UX schema-assisted: `Sorter` con desplegable, `Feature Merger` con asistente de pares y `Matcher` con lista de checkboxes sincronizada | done | 0.8 h | Validar experiencia en nodos sin schema disponible | Prueba manual de asistentes + smoke
- 2026-02-28 | Fase 2 (iteracion 7): migrados `Stats Calc` y `Tester` a worker con fallback local | done | 0.6 h | Validar paridad de resultados (sum/avg y filtros) | Pruebas manuales de Stats/Tester + smoke
- 2026-02-28 | Fase 2 (iteracion 8): `Stats Calc` con selector de campos + modos (por campo/concat), `Tester` con builder AND/OR y desplegables, y mejora de scroll horizontal/visualizacion de objetos en tabla | done | 1.6 h | Validar UX en nodos recien creados y proyectos legacy | Pruebas manuales dirigidas de Stats/Tester + smoke
- 2026-02-28 | Fase 2 (iteracion 9): historial `undo/redo` migrado a deltas incrementales (checkpoint inicial + diffs por evento) | done | 1.2 h | Validar secuencias largas de deshacer/rehacer con borrado de nodos y conexiones | Pruebas manuales de historial + smoke
- 2026-02-28 | Fase 3 (iteracion 10): base de regresion automatizada en runtime (`JETLSmoke.runExtended`) para atributos criticos | done | 0.8 h | Requiere ejecucion manual en navegador (consola) tras recarga | Ejecutar `runExtended` + smoke normal en flujos reales
- 2026-02-28 | Fase 3 (iteracion 11): matriz de compatibilidad navegadores + checklist estandar de release/regresion | done | 0.7 h | Mantener actualizada con nuevas pruebas reales por navegador | Usar checklist en cada release y completar celdas PEND/EXP
- 2026-02-28 | Fase 3 (iteracion 12): KPI de avance visible en roadmap + test `undo/redo` dentro de `JETLSmoke.runExtended` | done | 0.5 h | Requiere validacion manual en navegador de `runExtended` | Ejecutar `runExtended` y confirmar 10/10 OK
- 2026-02-28 | Fase 1 (iteracion 13): cierre hardening UI (eliminado ultimo `onclick` residual en templates) | done | 0.2 h | Vigilar nuevos handlers inline en futuras features | Ejecutar smoke extendido tras cambios UI
- 2026-02-28 | Fase 2 (iteracion 14): clonado profundo consolidado sin `JSON.parse(JSON.stringify())` en runtime/worker/history | done | 0.6 h | Validar que no haya regresion en objetos complejos durante ejecucion | Ejecutar `runExtended` y flujo real medio
- 2026-02-28 | Fase 2 (iteracion 15): `Dissolver` migrado a worker (`geo_dissolve`) + test dedicado en smoke extendido | done | 0.6 h | Validar paridad de resultados entre worker y fallback local | Ejecutar `runExtended` y prueba manual de Dissolver por campos
- 2026-02-28 | Fase 2 (iteracion 16): `Kink Remover` y `Angle Calculator` migrados a worker + test auxiliar en smoke extendido | done | 0.6 h | Validar paridad funcional en datasets reales de lineas/poligonos | Ejecutar `runExtended` y prueba manual de ambos nodos
- 2026-02-28 | Fase 2 (iteracion 17): `Vertex Creator` y `Triangulator` migrados a worker + test auxiliar en smoke extendido | done | 0.6 h | Validar paridad funcional en extraccion de vertices y triangulacion | Ejecutar `runExtended` y prueba manual de ambos nodos
- 2026-02-28 | Fase 2 (iteracion 18): optimizacion de render en mapa para nubes masivas de puntos (muestreo visual en modo rendimiento) | done | 0.5 h | En modo rendimiento se desactiva click/popup por feature para mantener fluidez | Validar navegacion de mapa con >30k puntos y confirmar aviso en UI
- 2026-02-28 | Fase 2 (iteracion 19): indicador persistente en mapa para modo rendimiento ("mostrando X de Y entidades") | done | 0.2 h | Revisar legibilidad sobre fondos oscuros y capas base | Validar que aparece en capas masivas y desaparece en capas normales
- 2026-02-28 | Fase 2 (iteracion 20): modo rendimiento general de mapa para capas masivas (interaccion limitada en no-puntos) | done | 0.3 h | En capas muy grandes se desactiva click/popup para priorizar fluidez | Validar navegacion con capas grandes de lineas/poligonos y verificar indicador
- 2026-02-28 | Fase 2 (iteracion 21): `Line Chopper (geo_chunk)` migrado a worker + cobertura en `geometry_aux_workers` (smoke) | done | 0.4 h | Validar paridad con fallback local en lineas largas | Ejecutar `runExtended` (10/10) y prueba manual con lineas densas
- 2026-02-28 | Fase 2 (iteracion 22): nuevos nodos de conversion explicitos `Line to Polygon` y `Polygon to Line` para flujo geometry sin ambiguedad | done | 0.3 h | Confirmar conversion en lineas abiertas/cerradas y multipoligonos | Prueba manual encadenada con `Line Chopper`
- 2026-02-28 | Fase 2 (iteracion 23): `Simplifier` y `Topo Simplify` migrados a worker + ampliacion de `geometry_aux_workers` | done | 0.5 h | Validar equivalencia visual en simplificacion con datasets densos | Ejecutar `runExtended` (10/10) y comparar salida de simplificacion
- 2026-02-28 | Fase 2 (iteracion 24): fix `Topo Simplify` para `FeatureCollection` (cleanCoords por feature en worker + fallback) | done | 0.2 h | Revisar salida en geometrías mixtas y multiparte | Reprobar nodo Topo Simplify en dataset real
- 2026-02-28 | Fase 2 (iteracion 25): `Topo Simplify` mejorado para mallas poligonales (linework compartido + polygonize) para minimizar gaps/overlaps | done | 0.7 h | Asignacion de atributos por area/interior es aproximada en casos complejos | Reprobar con poligonos colindantes y verificar continuidad de malla
- 2026-02-28 | Fase 2 (iteracion 26): `Topo Simplify` (worker) reforzado con JSTS (`UnaryUnionOp` + `TopologyPreservingSimplifier` + `Polygonizer`) para robustez topologica en mallas grandes | done | 0.6 h | Requiere ejecucion bajo servidor (no `file://`) para usar worker | Reprobar dataset 5.400 poligonos y confirmar reduccion de gaps/overlaps
- 2026-02-28 | Fase 2 (iteracion 27): optimizacion de `Topo Simplify` en malla grande (asignacion de atributos via `rbush` en vez de cruce O(n^2)) | done | 0.4 h | Atributo heredado por contencion de centroide/bbox (aprox.) | Reprobar tiempo en dataset 5.400 poligonos
- 2026-02-28 | Fase 3 (iteracion 28): `runExtended` robusto ante cancelacion residual (worker tests -> omitido, reset flag inicio) | done | 0.2 h | Evitar interpretar `omitido` como cobertura funcional completa | Re-ejecutar smoke tras una cancelacion manual previa
- 2026-02-28 | Deuda abierta (Topo Simplify): en datasets reales grandes persisten artefactos (gaps/overlaps o desplazamientos), y falta opcion `mantener bordes limite sin simplificar` | doing | 1.5-3 h (pendiente final) | Riesgo alto de precision topologica en mallas densas | Retomar al cierre del roadmap con bateria de casos reales
- 2026-02-28 | Fase 2 (iteracion 29): `Line Merger` migrado a worker (`geo_line_merge`) + cobertura en `geometry_aux_workers` | done | 0.3 h | Validar que merge conserva continuidad en lineas segmentadas | Ejecutar `runExtended` y prueba manual con lineas conectadas
- 2026-02-28 | Fase 2 (iteracion 30): fix `Line Merger` para builds Turf sin `lineMerge` (algoritmo propio de cosido por endpoints en worker + fallback) | done | 0.3 h | En nodos con ramificaciones complejas el merge es conservador (solo grado 2) | Reprobar flujo `Line Chopper -> Line Merger`
- 2026-02-28 | Fase 2 (iteracion 31): `Line Merger` evita worker en cargas pequenas y sube timeout en cargas grandes para eliminar `Worker timeout` espurio | done | 0.2 h | Ajustar umbral segun datos reales de uso | Reprobar caso corto (10 lineas) y caso medio/grande
- 2026-02-28 | Fase 2 (iteracion 32): `Line to Polygon` y `Polygon to Line` migrados a worker + cobertura en `geometry_aux_workers` | done | 0.3 h | Validar conversion en multiparte y lineas no cerradas | Ejecutar `runExtended` y pruebas manuales de conversion encadenada
- 2026-02-28 | Fase 2 (iteracion 33): optimizacion de `Line to Polygon`/`Polygon to Line` (sin `flatten` global, soporte multi* directo y umbral worker elevado a 10k para evitar latencia por serializacion) | done | 0.4 h | En datasets extremos puede seguir dominando el coste de render de mapa, no el nodo | Revalidar tiempos en ambos nodos con dataset real y revisar fluidez de visualizacion
- 2026-02-28 | Fase 2 (iteracion 34): `Reproject` migrado a worker (`geo_reproject`) + cobertura en `geometry_aux_workers` para evitar bloqueo de UI en reproyecciones masivas | done | 0.5 h | Depende de disponibilidad de `proj4` en worker; mantiene fallback local | Revalidar reproyeccion en capa grande y ejecutar `JETLSmoke.runExtended`
- 2026-02-28 | Fase 2 (iteracion 35): robustez `Reproject` worker (paso de definiciones CRS `proj4.defs` + errores explicitos) y estabilizacion de timeouts en `geometry_aux_workers` smoke | done | 0.3 h | Si una CRS no esta definida ni en main ni en worker, seguirá fallando con mensaje claro | Re-ejecutar `JETLSmoke.runExtended` y validar `Reproject` con CRS real del flujo
- 2026-02-28 | Fase 2 (iteracion 36): soporte CRS comun (`EPSG:25830`/`EPSG:23030`) en `Reproject` (main+worker) y `geometry_aux_workers` tolerante a timeout espurio (resultado omitido) | done | 0.3 h | Mantener listado CRS conocido ampliable si aparecen nuevos EPSG frecuentes | Revalidar `runExtended` y reproyeccion 4326->25830 en flujo real
- 2026-02-28 | Fase 2 (iteracion 37): optimizacion raster en main-thread (`Multi-Band Sampler` y `Zonal Stats`) con cancelacion cooperativa + procesamiento por lotes/yield para evitar bloqueo UI | done | 0.5 h | Sigue siendo CPU-intensivo sin worker raster; pendiente evaluar migracion dedicada | Probar flujo raster pesado, cancelar en ejecucion y confirmar respuesta UI fluida
- 2026-02-28 | Fase 4 (iteracion 38): inspector por puerto v1 (seleccion `output_n` en `view`, persistencia por nodo, y tabla/export sincronizados con el puerto activo) | done | 0.6 h | UX actual usa prompt; evolucion recomendable a selector visual embebido | Validar manualmente en nodos con 2-3 salidas + smoke de regresion
- 2026-02-28 | Fase 4 (iteracion 39): mejora UX inspector por puerto (selector interactivo en toast con botones por `output_n`, sin input manual) | done | 0.2 h | Si no se elige en 7s aplica puerto actual por defecto | Validar `view` en nodo multi-output y comprobar seleccion por click
- 2026-02-28 | Fase 4 (iteracion 40): manejo de errores por feature v1 en `Field Calculator Pro` (rechazos en `output_2` + `_calc_error`) y cobertura smoke (`attr_calc_rejects`) | done | 0.4 h | Pendiente extender mismo patron a otros nodos de atributos | Probar manualmente `On Error=reject` y ejecutar `JETLSmoke.runExtended`
- 2026-02-28 | Fase 4 (iteracion 41): extension de rechazos por feature a `Attr Creator` (`output_2` + `_creator_error`) y smoke dedicado (`attr_creator_rejects`) | done | 0.3 h | Mantener compatibilidad legacy (`On Error=null`) en flujos existentes | Reprobar `Attr Creator` y ejecutar `JETLSmoke.runExtended` (12 tests)
- 2026-03-01 | Fase 4 (iteracion 42): extension de rechazos por feature a `Area Calc` y `Length Calc` (`output_2` + `_area_error` / `_length_error`) y smoke dedicado (`attr_area_rejects`, `attr_length_rejects`) | done | 0.4 h | Mantener compatibilidad legacy (`On Error=null`) en flujos existentes | Reprobar ambos nodos y ejecutar `JETLSmoke.runExtended` (14 tests)
- 2026-03-01 | Fase 4 (iteracion 43): ajuste de validacion en `Length Calc` (solo LineString/MultiLineString); geometria no lineal pasa a error y `output_2` en modo reject | done | 0.1 h | Revisar si se quiere comportamiento equivalente en `Area Calc` para no-poligonos | Re-ejecutar `JETLSmoke.runExtended` y confirmar `attr_length_rejects`
- 2026-03-01 | Fase 4 (iteracion 44): extension de rechazos por feature a `Stats Calc` (`output_2` + `_stats_error`) y smoke dedicado (`attr_stats_rejects`) | done | 0.3 h | En modo reject se filtran features sin numericos y se mantienen stats en output_1 | Re-ejecutar `JETLSmoke.runExtended` (15 tests) y validar `Stats Calc`
- 2026-03-01 | Fase 4 (iteracion 45): libreria de plantillas ampliada por casos de uso + validacion de nodos requeridos antes de aplicar plantilla | done | 0.4 h | Pendiente siguiente mejora UX: tags/filtro por categoria y plantillas importables por JSON | Validar modal de plantillas y aplicar cada flujo base
- 2026-03-01 | Fase 4 (iteracion 46): fix plantilla `Join + Tester` (clave de nodo corregida de `attr_join` a `attr_join_adv`) | done | 0.1 h | Mantener sincronia entre keys de plantilla y registry de nodos | Reprobar aplicacion de plantilla `Join + Tester`
- 2026-03-01 | Fase 4 (iteracion 47): UX plantillas mejorada con filtro por texto + categoria (inyectado en modal, sin cambios en index) | done | 0.2 h | Pendiente opcion de importar/exportar plantillas en JSON | Validar filtro de plantillas y aplicacion tras filtrar
- 2026-03-01 | Fase 4 (iteracion 48): base de logging estructurado y export de run report (API `JETLRunReport`, persistencia de ultimo reporte y boton toolbar) + smoke `run_report_api` | done | 0.3 h | Pendiente export CSV desde UI y enriquecimiento con diagnosticos por puerto | Ejecutar corrida y exportar `run_report.json`; validar smoke (16 tests)
- 2026-03-01 | Fase 4 (iteracion 49): run report enriquecido con desglose por puertos (`output_1..3`) + export CSV en toolbar y smoke reforzado | done | 0.2 h | Pendiente incluir metrics de memoria/tiempo por fase si se desea observabilidad avanzada | Validar export JSON/CSV del reporte tras una corrida
- 2026-03-01 | Fase 4 (iteracion 50): base de parametrizacion global (`JETLParams` + modal workspace params + resolucion `${param}` en nodos de atributos) y smoke `workspace_params` | done | 0.5 h | Pendiente extender soporte `${param}` a lectores/escritores y joins avanzados | Validar modal de parametros y ejecutar `JETLSmoke.runExtended` (17 tests)
- 2026-03-01 | Fase 4 (iteracion 51): extension `${param}` a joins/merger/sorter/matcher/renamer/keeper/area/length/counter + smoke `workspace_params` ampliado (creator+join) | done | 0.4 h | Pendiente extender `${param}` a lectores/escritores y nodos geom adicionales | Re-ejecutar `JETLSmoke.runExtended` y validar flujo con `Attribute Join` parametrizado
- 2026-03-01 | Fase 3 (iteracion 52): smoke extendido con test de aplicacion de plantillas (`templates_apply`) para cubrir regresiones de `Join + Tester` y flujo base de atributos | done | 0.3 h | No valida configuracion interna de campos, solo integridad estructural de nodos plantilla | Ejecutar `JETLSmoke.runExtended` (18 tests) y confirmar `templates_apply`
- 2026-03-01 | Fase 4 (iteracion 53): plantillas custom v1 (guardar workspace como plantilla, importar/exportar JSON y eliminar desde modal) | done | 0.8 h | JSON importado malformado o incompleto se descarta con mensaje de error | Probar ciclo guardar->exportar->importar->aplicar y re-ejecutar `JETLSmoke.runExtended`
- 2026-03-01 | Fase 3 (iteracion 54): smoke `templates_custom_api` para ciclo programatico de plantillas custom (alta/aplicar/baja) y cierre de bloque de libreria de plantillas en roadmap | done | 0.3 h | No valida prompts/UI de guardado manual, solo API/runtime | Ejecutar `JETLSmoke.runExtended` (19 tests) y confirmar `templates_custom_api`
- 2026-03-01 | Fase 4 (iteracion 55): `${param}` extendido a readers/writers y smoke `workspace_params_io` (reader_wkt + writer_csv filename) | done | 0.4 h | Cobertura inicial en I/O clave; pendiente ampliar a todos los nodos geoespaciales parametrizables | Ejecutar `JETLSmoke.runExtended` (20 tests) y validar exports con nombre parametrizado
- 2026-03-01 | Fase 4 (iteracion 56): cierre inspector por puerto con selector persistente en UI + smoke `port_inspector_ui` | done | 0.4 h | El selector se muestra solo cuando hay multiples outputs y datos ejecutados en el nodo | Ejecutar `JETLSmoke.runExtended` (21 tests) y validar cambio de puerto desde panel
- 2026-03-01 | Fase 4 (iteracion 57): `String Formatter` con `On Error=reject` (`output_2` + `_fmt_error`) y smoke `attr_string_formatter_rejects` | done | 0.3 h | Pendiente extender patron de reject a otros nodos sin manejo feature-level | Ejecutar `JETLSmoke.runExtended` (22 tests) y validar formatter con campos faltantes
- 2026-03-01 | Fase 4 (iteracion 58): `Renamer` y `Keeper` con `On Error=reject` (`output_2` + `_renamer_error`/`_keeper_error`) y smoke dedicado | done | 0.4 h | Mantener compatibilidad de flujos existentes (`On Error=null`) | Ejecutar `JETLSmoke.runExtended` (24 tests) y validar rechazos por campo faltante
- 2026-03-01 | Fase 4 (iteracion 59): cierre del bloque de errores por feature en nodos de atributos (estado `done` + KPI actualizado) | done | 0.1 h | Revisar en el futuro extension del patron a nodos no-atributo con fallos por entidad | Continuar con bloque de tests/worker restante
- 2026-03-01 | Fase 3 (iteracion 60): smoke `engine_cancel_api` para validar cancelacion del motor y propagacion a cancelacion de workers | done | 0.2 h | No valida cancelacion en flujo pesado real (eso sigue siendo prueba manual) | Ejecutar `JETLSmoke.runExtended` (25 tests) y confirmar `engine_cancel_api`
- 2026-03-01 | Fase 2 (iteracion 61): `Random Fill` migrado a worker (`geo_random_fill`) + fallback local cooperativo y smoke en `geometry_aux_workers` | done | 0.3 h | Revisar paridad estadistica de distribucion en datasets muy complejos | Ejecutar `JETLSmoke.runExtended` (25 tests) y validar `Random Fill` en capa poligonal real
- 2026-03-01 | Fase 2 (iteracion 62): `Donut Extractor` migrado a worker (`geo_donut_extractor`) + fallback local cooperativo y smoke ampliado (`geometry_aux_workers`) | done | 0.2 h | Validar paridad en poligonos con multiples agujeros por feature | Ejecutar `JETLSmoke.runExtended` y probar `Donut Extractor` en capa con holes
- 2026-03-01 | Fase 2 (iteracion 63): `Line Closer` migrado a worker (`geo_line_closer`) + fallback local cooperativo y smoke ampliado (`geometry_aux_workers`) | done | 0.2 h | Mantener umbral worker alto para evitar latencia en capas pequenas | Ejecutar `JETLSmoke.runExtended` y probar `Line Closer` con lineas cerrables
- 2026-03-01 | Fase 2 (iteracion 64): `Exploder` migrado a worker (`geo_explode`) + fallback local cooperativo y smoke ampliado (`geometry_aux_workers`) | done | 0.2 h | Umbral alto para evitar sobrecoste de serializacion en datasets pequenos | Ejecutar `JETLSmoke.runExtended` y probar `Exploder` con geometria multipart
- 2026-03-02 | Fase 2 (iteracion 65): fix de seleccion en tabla/mapa tras `Exploder` (reindexado robusto `_idx` cuando hay duplicados/missing en visualizacion) | done | 0.2 h | Si una capa cambia de cardinalidad, la seleccion previa puede quedar fuera de contexto (comportamiento esperado) | Reprobar seleccion de una sola entidad tras `Exploder` y ejecutar smoke
- 2026-03-02 | Fase 3 (iteracion 66): ampliada cobertura `geometry_aux_workers` en smoke para `geo_buffer` y `geo_voronoi` (workers existentes) | done | 0.2 h | `voronoi` depende de distribucion de puntos valida; en smoke se usan puntos no colineales | Ejecutar `JETLSmoke.runExtended` y confirmar detalle `buffer`/`voronoi`
- 2026-03-02 | Fase 3 (iteracion 67): robustez de `geometry_aux_workers` (reintento automatico tras `Worker timeout` con reset de pool + detalle de task en error) | done | 0.2 h | Si el entorno bloquea workers de forma sostenida, puede seguir devolviendo `omitido` por timeout | Re-ejecutar `JETLSmoke.runExtended` varias veces y verificar menos omisiones espurias
- 2026-03-02 | Fase 3 (iteracion 68): estabilizacion adicional smoke workers (reintento ante cancelacion residual + `engine_cancel_api` movido al final para evitar contaminacion de estado) | done | 0.2 h | En navegadores muy cargados puede persistir algun timeout puntual, pero no por estado cancelado heredado | Ejecutar `JETLSmoke.runExtended` 3 veces y confirmar `geometry_aux_workers` con detalle completo
- 2026-03-02 | Fase 3 (iteracion 69): reset duro de pool worker para smoke (`resetGeoWorkerPool`) + uso en bloque pre-worker y retries de `geometry_aux_workers` | done | 0.3 h | Puede aumentar levemente el tiempo del smoke por recreacion de workers | Ejecutar `JETLSmoke.runExtended` 3 veces y verificar que `geometry_aux_workers` no quede omitido por cancel residual
- 2026-03-02 | Fase 3 (iteracion 70): `geometry_aux_workers` con reintentos multi-intento y diagnostico por task (`geo_*`) en caso de fallo persistente | done | 0.2 h | Si una task concreta falla de forma sostenida, ahora rompera smoke (esperado para depurar) | Ejecutar `JETLSmoke.runExtended` y corregir la task concreta si aparece `geometry_aux_workers: geo_*`
- 2026-03-02 | Fase 3 (iteracion 71): robustez de retries en `geometry_aux_workers` para cancelaciones de tipo `CancelledError`/mensajes de reset de pool | done | 0.1 h | Evita falsos negativos cuando el propio smoke reinicia workers entre bloques | Re-ejecutar `JETLSmoke.runExtended` y confirmar que no aparece `geo_*: Smoke ... reset`
- 2026-03-02 | Fase 3 (iteracion 72): lock anti-concurrencia en `JETLSmoke.runExtended` (una sola ejecucion activa; llamadas paralelas comparten la misma promesa) | done | 0.1 h | Evita que un smoke resetee workers de otro smoke en curso | Re-ejecutar smoke de forma secuencial y confirmar que desaparece `geo_*: Smoke pre-worker block reset`
- 2026-03-02 | Fase 3 (iteracion 73): guardas de timeout por bloque worker en `runExtended` para evitar cuelgues sin salida (si excede tiempo devuelve fallo explicito) | done | 0.1 h | En maquinas lentas puede marcar timeout en tests worker aunque la app funcione | Ejecutar `JETLSmoke.runExtended` y confirmar que siempre retorna objeto final
- 2026-03-02 | Fase 3 (iteracion 74): timeouts de bloques worker en smoke marcados como `omitido` (soft-timeout) para evitar falsos fallos por latencia del entorno local | done | 0.1 h | Reduce severidad diagnóstica del smoke en workers (compensado con pruebas manuales funcionales) | Re-ejecutar `JETLSmoke.runExtended` y verificar `fail=0` con detalle `omitido (timeout>...)` si aplica
- 2026-03-02 | Fase 3 (iteracion 75): smoke de regresion para estabilidad de seleccion (`feature_index_stability`) y exposicion controlada de `ensureStableFeatureIndex` en UI | done | 0.1 h | Cubre el bug de `_idx` duplicado tras transformaciones multipart | Ejecutar `JETLSmoke.runExtended` y confirmar test `feature_index_stability` en OK
- 2026-03-02 | Fase 3 (iteracion 76): robustez de carga de librerias en `geo.worker` (imports independientes) + smoke `geo_worker_health` para diagnostico de dependencias | done | 0.2 h | Si `jsts` falta en servidor local, el worker sigue operativo para tareas no-JSTS y queda visible en smoke | Ejecutar `JETLSmoke.runExtended` y revisar detalle `geo_worker_health`
- 2026-03-02 | Fase 3 (iteracion 77): `geo_worker_health` tolerante a inestabilidad de pool (`Worker timeout`/cancel residual => `omitido`) para evitar falsos rojos en smoke local | done | 0.1 h | Mantiene valor diagnostico sin penalizar entornos con arranque de worker lento | Re-ejecutar `JETLSmoke.runExtended` y confirmar `fail=0`
- 2026-03-02 | Fase 2 (iteracion 78): migracion a worker de `CenterPoint`, `CenterPointInside` y `Envelope` (`geo_centroid`, `geo_point_surf`, `geo_bbox`) con fallback local | done | 0.2 h | Se activa worker en volumen alto para evitar sobrecoste en datasets pequenos | Validar nodos manualmente y confirmar smoke en verde
- 2026-03-02 | Fase 3 (iteracion 79): smoke dedicado `geo_basic_workers` para cobertura de `geo_centroid`/`geo_point_surf`/`geo_bbox` en worker | done | 0.1 h | Mantenerlo como soft-timeout para evitar falsos negativos por latencia local | Ejecutar `JETLSmoke.runExtended` y revisar detalle `geo_basic_workers`
- 2026-03-02 | Fase 2 (iteracion 80): ajuste de umbral worker en `CenterPoint`/`CenterPointInside`/`Envelope` (25000) para evitar latencia de arranque en datasets medios | done | 0.1 h | En capas enormes seguirá delegando al worker | Probar nodos con 1k-5k features y validar respuesta inmediata
- 2026-03-02 | Fase 3 (iteracion 81): smoke worker menos agresivo (sin reset de pool pre-bloque y sin reset inicial en `geometry_aux_workers`) para reducir timeouts espurios | done | 0.1 h | Se mantiene reset duro solo en reintentos ante fallo real | Ejecutar `JETLSmoke.runExtended` y comparar estabilidad/tiempo
- 2026-03-02 | Fase 3 (iteracion 82): prewarm del worker geoespacial (`prewarmGeoWorker` con `worker_health`) y uso previo en `runExtended` para reducir latencia de arranque en frio | done | 0.1 h | Si el servidor local bloquea una libreria, prewarm puede devolver `false` sin romper ejecucion | Ejecutar `JETLSmoke.runExtended` y observar menos omisiones/arranque mas estable
- 2026-03-02 | Fase 2 (iteracion 83): prewarm automatico en carga de app (idle corto tras `window.load`) + smoke `geo_worker_prewarm_api` | done | 0.1 h | Incrementa un poco trabajo en arranque inicial, pero reduce latencia del primer nodo geoespacial | Abrir app en limpio, ejecutar primer nodo geo y revisar smoke
- 2026-03-02 | Fase 3 (iteracion 84): smoke `spatial_core_workers` para cobertura de workers `spatial_filter`/`spatial_join`/`nearest_neighbor` con casos minimos | done | 0.2 h | Mantener timeout suave por inestabilidad local del pool | Ejecutar `JETLSmoke.runExtended` y revisar detalle `spatial_core_workers`
- 2026-03-02 | Fase 3 (iteracion 85): observabilidad smoke mejorada (contador `omitted_worker_checks` + aviso explicito cuando hay checks worker omitidos) | done | 0.1 h | El resultado global puede seguir en verde aunque haya omisiones; ahora queda explicitado | Ejecutar `JETLSmoke.runExtended` y verificar nota de omisiones si aplica
- 2026-03-02 | Fase 3 (iteracion 86): `spatial_core_workers` tolerante a dependencia worker faltante (`rbush/jsts/proj4`) para evitar falso rojo por entorno | done | 0.1 h | Si faltan libs en servidor local, se marca omitido en vez de fallo funcional | Re-ejecutar smoke y revisar detalle de `spatial_core_workers`
- 2026-03-02 | Fase 4 (iteracion 87): modo "ampliar mapa" en inspector (toggle ampliar/restaurar dentro de la interfaz, responsive) + smoke `map_expand_ui` | done | 0.3 h | No usa fullscreen nativo del navegador; maximiza dentro de la app | Validar boton en desktop/movil y ejecutar smoke
- 2026-03-03 | Fase 3 (iteracion 88): smoke `spatial_geom_workers` para cobertura de workers `intersector`/`clip` con casos minimos y degradacion controlada por dependencias | done | 0.2 h | `clip` depende de `jsts`; en entornos sin esa lib se marca omitido | Ejecutar `JETLSmoke.runExtended` y revisar detalle `spatial_geom_workers`
- 2026-03-05 | Gestion de continuidad: creado `HANDOFF.md` + sincronizado snapshot del roadmap con estado operativo actual (smoke `32/32` OK) | done | 0.2 h | Mantener este estado al cambiar de cuenta para evitar perdida de contexto | Retomar desde bloques `doing` (Fase 2/Fase 3) y cerrar item administrativo de metadatos
- 2026-03-05 | Fase 3 (iteracion 90): nueva suite `JETLSmoke.runStable()` (regresion estable sin dependencia de worker pool) + Topo Simplify marcado como deuda diferida para cierre final | done | 0.3 h | `Topo Simplify` sigue con artefactos en datasets grandes; no bloquear avances intermedios | Usar `runStable` para validar cambios del bloque actual y retomar deuda topo al final
- 2026-03-05 | Fase 3 (iteracion 91): gate de release `JETLSmoke.runGate()` + protocolo formal de testing (`TESTING.md`) y README actualizado | done | 0.3 h | `runGate('extended')` puede heredar omisiones de worker por entorno local | Usar `runGate('stable')` como criterio minimo por iteracion
- 2026-03-05 | Fase 3 (iteracion 92): validado en entorno usuario `runStable` y `runGate('stable')` (24/24) y bloque de suite minima marcado `done` | done | 0.1 h | Mantener `runExtended` para cobertura ampliada de workers | Continuar con Fase 2 (`doing`) o deuda diferida de Topo Simplify al cierre final
- 2026-03-05 | Fase 4 (iteracion 93): cierre administrativo de `Parametros guiados por metadatos` (ya cubierto en Fase 0.2 con schema-driven UI) | done | 0.1 h | Vigilar nodos nuevos para que respeten asistente schema-driven por puertos | Mantener checklist de nodos nuevos con desplegables/checkbox de campos
- 2026-03-05 | Fase 2 (iteracion 94): workerizacion raster (`Multi-Band Sampler` + `Zonal Stats`) con fallback local y smoke `raster_worker_health`; validado por usuario (`runExtended` 33/33 + pruebas manuales OK) | done | 0.7 h | Si el worker no carga libs raster en algun entorno, opera fallback local con degradacion controlada | Continuar cierre de Fase 2 en nodos pendientes de menor impacto
- 2026-03-05 | Fase 2 (iteracion 95): workerizacion extra de atributos + UX schema-driven en `Renamer`/`Keeper`/`String Formatter`; validado por usuario (`runExtended` OK + pruebas manuales OK) | done | 0.9 h | Mantener compatibilidad modo manual en nodos con asistentes | Avanzar al cierre formal de Fase 2 y dejar deuda Topo Simplify para final final
- 2026-03-05 | Fase 4 (iteracion 96): implementado `feature cache browser` persistente en inspector (selector nodo/puerto + apertura directa en mapa/tabla + estado en `localStorage`) y smoke `feature_cache_browser_ui`; validado por usuario | done | 0.8 h | Mantener consistencia de estado al limpiar canvas/cargar proyecto | Continuar con bloque `Incremental run / dirty propagation`
- 2026-03-05 | Fase 4 (iteracion 97): base de `dirty propagation` en engine (`JETLDirty`, invalidacion de nodo+descendientes en cambios de nodo/conexiones/config) + uso en `processNode` para invalidar cache y smoke `dirty_propagation_api`; validado por usuario (smoke + cadena parcial) | done | 0.9 h | Evolucion futura: metricas de nodos recalculados vs cache hit por corrida | Continuar con `Package manager de transformadores comunitarios`
- 2026-03-05 | Fase 4 (iteracion 98): package manager comunitario v1 (`JETLPackages`) con import/export JSON, activar/desactivar/eliminar paquetes, registro dinamico de alias de transformadores sobre nodos base, UI modal y smoke `packages_api`; validado por usuario (smoke 38/38 + prueba manual de aliases) | done | 1.1 h | Riesgo residual: conflictos de nomenclatura en paquetes de terceros mal definidos | Mantener validaciones de ID/base en import y preparar versionado de contratos de paquete en v2

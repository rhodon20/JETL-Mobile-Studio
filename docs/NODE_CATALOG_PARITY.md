# Paridad del catálogo de nodos Desktop → Studio

## Objetivo de producto

Studio debe ofrecer el mismo catálogo funcional vectorial y tabular que JETL Desktop. La
adaptación a navegador o a pantalla táctil puede cambiar la forma de configurar
un nodo, pero no es motivo para que el nodo desaparezca silenciosamente.

**Límite de producto:** los nodos Raster y LiDAR quedan expresamente fuera del
catálogo objetivo. Studio no está diseñado para procesar esos volúmenes masivos
en un navegador móvil. Los nodos de esas familias que ya existen se conservan
para no romper proyectos, pero se consideran compatibilidad heredada y no deuda
de paridad. La regla ejecutable vive en `studio-node-scope.json`.

Un nodo cuenta como equivalente únicamente si conserva:

- identidad, categoría, entradas y salidas;
- parámetros, valores predeterminados y validaciones;
- semántica de ejecución, errores y resultados;
- lectura y escritura bidireccional en proyectos Desktop/Studio;
- un recorrido completo y probado en navegador.

Cuando una capacidad dependa del sistema de archivos, Python o un backend, el
nodo seguirá inventariado y se clasificará como **adaptado**, **requiere
backend** o **bloqueado por plataforma**, con explicación visible. Ocultarlo no
es paridad.

## Línea base verificable

A 24 de agosto de 2026, el Code Graph canónico de Desktop registra **134 nodos**.
El alcance Studio excluye 19 (14 Raster, tres lectores/escritores Raster/LiDAR
y dos callers dependientes del sistema),
PythonCaller y SystemCaller también quedan fuera: el navegador no dispone de un
runtime Python ni de acceso seguro al sistema operativo. Por tanto, el catálogo
objetivo verificable es de **115 nodos**. Studio registra ahora 119: los **115
nodos del alcance están compartidos** y no quedan ausencias objetivo.

## Editor avanzado de Readers

El editor está implementado para GeoJSON, KML, CSV, Excel, SHP, GPX y GDB como
modal centrado y táctil. Agrupa selección de fuentes, opciones específicas del
formato, política de esquema, CRS, tipos, geometrías y datos paginados antes de
ejecutar. CSV, Excel y GeoJSON admiten búsqueda, edición de celdas, altas y bajas
sobre una copia de trabajo persistida dentro del nodo. Al exportar un proyecto,
Studio también declara esas copias por ID de nodo y las valida y restaura al
importarlo, de modo que no dependen de rutas locales ni del `FileList` de iOS.
Esa copia gobierna las
ejecuciones posteriores. KML, GPX, SHP y GDB permanecen en inspección de solo
lectura porque reescribirlos exige reempaquetado o backend. Los archivos de más
de 25 MB omiten la previsualización para no bloquear el navegador móvil, pero
siguen disponibles para ejecución.

La selección se realiza con un `input[type=file]` nativo y visible dentro del
modal. No depende de invocar programáticamente un control oculto: los archivos
se conservan en un almacén temporal asociado al nodo y llegan al runtime aunque
Safari no permita reasignar su `FileList`.

Hay una limitación web real: Safari no permite conservar rutas ni sobrescribir de
forma fiable archivos locales como Desktop. Studio conserva una copia editable
en el proyecto (máximo 5.000 entidades y 2 MB) y nunca presenta esa copia como
una modificación del original. Al seleccionar otra fuente se descarta la copia
anterior. `reader_file` es una abstracción exclusiva de Studio.

| Familia | Desktop | Compartidos | Faltan | Cobertura IDs |
| --- | ---: | ---: | ---: | ---: |
| Attributes | 22 | 22 | 0 | 100 % |
| Readers | 19 | 18 | 1 | 94,7 % (100 % del alcance) |
| Spatial | 18 | 18 | 0 | 100 % |
| Geometry | 37 | 37 | 0 | 100 % |
| Raster | 14 | 2 | 12 | Fuera de alcance |
| Utils | 14 | 12 | 2 | 85,7 % (100 % del alcance) |
| Writers | 10 | 9 | 1 | 90 % (100 % del alcance) |

Los 16 ausentes totales están fuera del alcance objetivo. El manifiesto
trazable está en `desktop-node-manifest.json` y conserva el estado de runtime de
cada nodo; el informe separa `missingByRuntime` de `targetMissingByRuntime` para
que una dependencia excluida no altere la priorización.

El control local se ejecuta con:

```bash
node scripts/audit-node-parity.mjs
node scripts/audit-node-parity.mjs docs/desktop-node-manifest.json docs/studio-node-scope.json
```

El segundo comando termina con error si faltan identificadores Desktop dentro
del alcance Studio. Raster y LiDAR siguen apareciendo en el informe, pero no
hacen fallar el gate ni se contabilizan como deuda.

## Paridad de configuración (revisión de octubre de 2026)

Revisado contra JETL Desktop `7797aa1` (17 de julio de 2026). El manifiesto
(`desktop-node-manifest.json`) coincide con el *code graph* actual de Desktop
(mismo blob `f191f87`): los 115 nodos del alcance siguen compartidos y sin
discrepancias de puertos.

Compartir identificador y puertos no basta: el criterio de equivalencia de este
documento incluye parámetros, valores por defecto y lectura de proyectos.
`scripts/audit-node-params.mjs` lo mide comparando los campos `df-*` que cada
plantilla guarda en el proyecto:

```bash
node scripts/audit-node-params.mjs <ruta-a-un-clon-de-JETL-Desktop> --summary
```

Resultado: **53 de los 115 nodos difieren en su configuración.** Clasificados a
mano a partir del informe y del código:

### 1. Funcionalidad que falta en Studio
| Nodo | Falta |
|---|---|
| `attr_counter` | contar por grupos (`group-by`) |
| `geo_chunk` | modo por número de vértices (`mode`, `max-vertices`) |
| `geo_angle_calculator` | modo azimut horizontal (`mode`, `azimuth-attr`, `angle-attr`) |
| `geo_vertex_creator` | modo «From Attributes» (`x-field`, `y-field`, `z-field`, `output-crs`) |
| `writer_*` (8) | CRS de salida, división de la salida por atributo (`split-field`/`split-enabled`), nombre de capa y modo/campo de salida. Las opciones de carpeta, plantilla de ruta, sobrescritura y modo silencioso dependen del sistema de archivos: no aplican en navegador |

### 2. Valores por defecto o codificación distintos
| Nodo | Desktop → Studio |
|---|---|
| `attr_area` | la unidad se guarda como nombre (`sq_meters`, `sq_km`, `hectares`, `sq_ft`) en Desktop y como factor (`1`, `0.000001`, …) en Studio: un proyecto de Desktop trae un valor que Studio no entiende |
| `geo_reproject` | origen `""` → `EPSG:4326`; destino `EPSG:4326` → `EPSG:3857` |
| `util_creator` | Desktop crea 1 entidad con un atributo `path`; Studio parte de `{}` |

### 3. Misma configuración guardada de otra forma
Desktop guarda la configuración de estos nodos en un JSON (`*-config`) y Studio
en campos sueltos u otro JSON, o al revés. Funcionan en su propio producto, pero
un proyecto de uno abierto en el otro puede perder la configuración:
`attr_aggregator` (Studio ya acepta también `g2-config`), `attr_list_concatenator`,
`attr_list_exploder`, `attr_splitter`, `attr_manager`, `attr_manager_v2`,
`attr_string_formatter`, `attr_stats`, `attr_test`, `attr_join_adv`,
`attr_feature_merger`, `attr_matcher`, `attr_renamer`, `geo_buffer`,
`geo_dissolve`, `geo_line_builder`, `sp_spatial_filter`, `sp_spatial_join`,
`sp_spatial_relator`, `sp_anchored_snapper`, `sp_neighbor_finder`,
`sp_intersector`, `geo_snap`, `util_http_caller`, `util_rest_request`,
`util_graphql_request`, `reader_csv`/`reader_excel` (lat/lon dentro de
`reader-config`) y los lectores con editor (`reader-config`, `reader-edited-data`).
Diferencias sólo de nombre sin efecto: `reader_gpkg`/`reader_parquet` (el archivo
no se guarda en el proyecto en ninguno de los dos).

### 4. Prioridad de lectura de la configuración (no es una brecha real)
En Desktop, 11 nodos de atributos leen primero los datos del nodo en el proyecto
(`getAttributeNodeRuntimeData`: `node.data` de Drawflow) con claves semánticas
(`source_attr`, `group_by`, `selectedFields`…), después su JSON y por último los
campos sueltos: `attr_manager`, `attr_keeper`, `attr_splitter`,
`attr_list_exploder`, `attr_list_concatenator`, `attr_substring`,
`attr_string_replacer`, `attr_aggregator`, `attr_counter`, `attr_sorter`,
`attr_test`. Pero la interfaz de Desktop no escribe esas claves (sólo sus
lectores usan `updateNodeDataFromId`): las generan los scripts de migración FME
(`scripts/generate_panoramicas_*.mjs`), cuyos proyectos ejecuta el backend Python.
No se porta: no aporta nada a proyectos creados en la interfaz de Desktop y, en
Studio, unas claves antiguas en `node.data` ganarían a lo editado en el modal.

La brecha real al abrir un proyecto creado con la interfaz de Desktop es el
grupo 3: Drawflow importa el HTML y los datos del nodo de Desktop, y donde los
campos se llaman distinto Studio no encuentra los suyos y usa los valores por
defecto (hoy sólo `attr_aggregator` acepta también el nombre de Desktop).

### Proyectos de Desktop que no son objetivo
Los proyectos de `versions/` de Desktop (migraciones de FME, «golden»/«scaffold»)
usan 20 tipos `fme_*` que no están en el catálogo de 134 y que ejecuta el backend
Python de Desktop (`backend/jetl_backend/backend_run.py`). No son ejecutables en
un navegador y quedan fuera del alcance, igual que PythonCaller.

### Limitaciones de la medición
El script lee los campos `df-*` de `input`, `select` y `textarea` de la plantilla
inicial; no ve configuración guardada en otros elementos (p. ej. el `df-test-rows`
de Tester en Studio) ni la semántica de ejecución. La clasificación anterior está
revisada a mano en el código para los casos citados; el resto del grupo 3 debe
verificarse nodo a nodo al portarlo.

## Orden de trabajo

1. **P0 — Manifiesto y compatibilidad:** exportar el catálogo canónico de
   Desktop, fijar identificadores compartidos y generar la brecha real.
   **Completado:** manifiesto de 134 nodos y gate automático.
2. **P0 — Contratos compartidos:** corregir primero puertos y resultados de los
   nodos que ya existen en ambos productos. FeatureJoiner, Snapper y Clipper ya
   recuperan sus salidas Desktop. **Completado:** Keeper y Attribute Creator
   muestran el único puerto de Desktop y disponen de editores modales equivalentes;
   los proyectos antiguos que guardaron una segunda salida de rechazados siguen
   importándose y ejecutándose mediante compatibilidad dinámica. El gate registra
   cero discrepancias de contrato en los 115 nodos objetivo.
3. **P1 — Nodos de flujo habitual:** portar primero lectores, transformaciones,
   operaciones espaciales y escritores que puedan ejecutarse enteramente en web.
   **Attributes completada (22/22):** List Concatenator, Substring Extractor,
   Attribute Splitter, List Exploder, String Replacer, Aggregator y las dos
   generaciones de Attribute Manager, Keeper y Attribute Creator multirregla
   conservan contrato, configuración y semántica Desktop con editor modal adaptado.
   El manager legado permanece
   oculto para importar proyectos antiguos y conserva su salida de rechazados.
   **Geometry completada en catálogo (37/37):** las transformaciones locales
   conservan contratos y configuración Desktop. Area Builder, Extruder,
   Generalizer, Geometry Coercer, Line Builder, MultiBufferer y Offsetter se
   ejecutan en navegador. Centerline Replacer conserva sus dos salidas y exige
   explícitamente el backend Python, sin simular un resultado local incorrecto.
   **Utils completada en alcance (12/12):** Creator, HTTP Caller, REST Request,
   GraphQL Request y Response Inspector se ejecutan en navegador; Workspace
   Runner conserva proyectos Desktop como paso transparente. PythonCaller y
   SystemCaller se excluyen porque no existe un runtime honesto para ellos.
   **Writers completada en alcance (9/9):** XLSX y SHP exportan localmente en el
   navegador. GDB conserva el contrato Desktop, entradas múltiples y delegación
   explícita en un backend compatible; nunca genera un archivo simulado.
   **Spatial completada (18/18):** los seis Overlayers Point/Line/Area conservan
   dos entradas, salidas matched/unmatched, multiplicidad de coincidencias y
   prefijos de atributos. Anchored Snapper conserva sus cuatro salidas Desktop;
   Neighbor Finder separa matched/unmatched; Spatial Relator mantiene relaciones,
   agrupación, recuentos, atributos y listas, con límite explícito para backend.
   **Readers completada dentro del alcance (17/17):** CSV, Excel, GeoJSON, KML,
   GPX y SHP ZIP disponen de lectura local; GPX conserva 16 salidas por capas.
   GDB conserva sus 16 salidas y FeatureReader sus tres, con dependencia de
   backend explícita porque el sandbox móvil no admite rutas dinámicas ni GDAL
   pesado. GeoTIFF y LiDAR quedan fuera del objetivo; GeoTIFF se mantiene como
   compatibilidad heredada.
4. **P1 — Configuración equivalente:** extender el modal de Desktop a todos los
   nodos complejos y garantizar importación/exportación sin pérdida.
   **Pendiente, medido:** 53/115 nodos difieren (ver «Paridad de configuración»):
   4 nodos y los writers con funcionalidad que falta, 3 con valores por defecto
   o codificación distintos y el resto con la configuración guardada de otra
   forma (lo que hace perder configuración al abrir proyectos de Desktop).
5. **P2 — Capacidades con backend:** mantener el nodo visible, definir contrato
   de servicio y ofrecer diagnóstico accionable cuando el backend no exista.
6. **Fuera de alcance — Raster y LiDAR:** conservar sólo compatibilidad de
   lectura de proyectos existentes; no portar nodos ni visores de datos masivos.
   El visor 3D vectorial de Desktop también queda fuera (decisión del 18 de
   octubre de 2026): poco valor en móvil para su peso.

La paridad del catálogo es el eje principal del roadmap. El pulido visual y el
movimiento avanzan en paralelo, pero no sustituyen capacidad funcional.

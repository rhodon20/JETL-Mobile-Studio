# Matriz viva de paridad Desktop → Studio

Referencia revisada: `rhodon20/JETL-Desktop` `main` en `7797aa1` (17 de julio de
2026), revisión del 18 de octubre de 2026. Cada estado se ha comprobado en el
código de ambos repositorios (no en su documentación); entre paréntesis, el
archivo de Desktop que lo implementa.

La paridad significa conservar la capacidad y adaptar la interacción a móvil;
no copiar literalmente paneles de escritorio ni dependencias de Python o del
sistema de archivos.

**Regla no negociable:** Studio debe converger al catálogo vectorial y tabular de
Desktop. Raster y LiDAR quedan fuera de alcance por su volumen; las capacidades
heredadas no se eliminan, pero tampoco se cuentan como deuda. El inventario de
nodos, su configuración y el control automático están en
[`NODE_CATALOG_PARITY.md`](./NODE_CATALOG_PARITY.md).

Estados: **Implementado**, **Parcial**, **Pendiente**, **No aplica** (depende
del backend Python, de `pywebview` o del sistema de archivos).

## Flujo y edición

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Catálogo objetivo de nodos | 115/115 identificadores y puertos compartidos; **53/115 difieren en configuración** | Ver `NODE_CATALOG_PARITY.md` > Paridad de configuración |
| Catálogo y QuickSearch | Implementado | Mantener búsqueda por nombre/categoría y acceso táctil |
| Encadenar al insertar con una selección | Implementado | Búsqueda y catálogo conectan al primer puerto compatible |
| Insertar un nodo sobre una conexión | Implementado | Dividir la conexión, preservar puertos y un solo deshacer |
| Pan, zoom, selección y centrado | Implementado | Regresión táctil en Safari y Chromium móvil |
| Navegador del flujo | Parcial: búsqueda de nodos sí; sin minimapa (`canvasNavigator.js`); la búsqueda «por atributos» mira la configuración del nodo, no los campos de los datos como Desktop | Minimapa y búsqueda por campos del esquema |
| Multiselección y operaciones en lote | Pendiente (`engine.js`: selección por recuadro, duplicar, autoorganizar, insertar Junction) | Modo de selección táctil; mover, duplicar y eliminar el conjunto |
| Marcadores/grupos y anotaciones | Pendiente (`engine.js`: grupos plegables con color y anotaciones, guardados en el proyecto) | Crear, plegar, editar y persistir en `.jetl` |
| Selector de puerto asistido | Pendiente (`portSemantics.js`) | Elegir puerto al conectar en vez del primero compatible |
| Menú contextual | Parcial: ejecutar, ver, eliminar (Desktop añade duplicar, junction, marcador, anotación, autoorganizar, crear transformador, validar) | Acciones de nodo completas con pulsación larga |
| Validar el flujo antes de ejecutar | Pendiente (`validateCurrentFlow`) | Lista de problemas con salto al nodo |
| Soltar un archivo en el lienzo crea su lector | Pendiente (`_handleDroppedFile`) | En móvil: abrir archivo → lector adecuado |
| Ajuste a cuadrícula | Pendiente (`snapNodeToCanvasGrid`) | Opcional en móvil |
| Deshacer/rehacer | Implementado | Cubrir también conexiones y cambios de formulario |
| Atajos de teclado configurables | Pendiente (`appSettings.js`) | Baja prioridad en móvil |
| Nodo compacto + editor modal estilo Desktop | Implementado en Attributes, Geometry, Spatial, Readers, FeatureReader y Utils | Extender a Writers avanzados |

## Ejecución y diagnóstico

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Ejecutar flujo completo | Implementado; Desktop ejecuta en paralelo los nodos de cada nivel (`Promise.all`), Studio uno tras otro | Medir antes de paralelizar (ver perfilado en `ROADMAP.md`) |
| Ejecutar nodo y dependencias | Implementado | Mantener acción Play por nodo |
| Caché por nodo e invalidación | Implementado (sin compactación de caché) | Hacer visibles aciertos, invalidación y tamaño |
| Cancelación | Implementado | — |
| Monitor y diagnóstico durante el run | Implementado (más detallado que Desktop) | — |
| Historial e informe JSON/CSV | Implementado (exporta la ejecución seleccionada; Desktop también todo el historial) | — |
| Perfiles normal/baja memoria/automático | **Pendiente** (`core.js` `getJETLRuntimeProfile`); antes figuraba como Parcial, pero Studio sólo tiene umbrales fijos al pintar el mapa | Perfil automático en móvil: límites de mapa/tabla y compactación |
| Aviso al terminar una ejecución | Pendiente (`_notifyRunCompletion`) | API Notification web |
| Ejecución por lotes y workspace runner | No aplica (`batchDeploy.js`, `workspaceRunner.js` usan `pywebview` y el backend) | — |

## Datos y visualización

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Consola, tabla y mapa | Implementado | Conservar tabs táctiles y estado por salida |
| Reproyectar a EPSG:4326 al pintar | **Pendiente** (`reprojectGeoJSONTo4326`): datos en otro CRS no se pintan bien en el mapa | Pintar correctamente cualquier salida con CRS conocido |
| Tabla: centrar la entidad en el mapa al tocar una fila, columnas fijas, mostrar/ocultar campos, carga progresiva | Pendiente (`focusTableFeatureOnMap`, `toggleTablePinnedField`) | Prioritario en móvil por el ancho de las tablas |
| Gestor de capas | Parcial: control estándar de Leaflet (Desktop: aislar, renombrar, zoom) | — |
| Herramienta de medir | Pendiente (`toggleMeasure`) | — |
| Visor 3D vectorial | **Pendiente** (`vectorViewer3D.js`, JS puro sin backend: portable) | — |
| Raster y LiDAR | Fuera de alcance | Conservar proyectos heredados |
| Esquema y metadatos | **Pendiente**: Studio no propaga esquemas sin ejecutar (`schemaEngine.js`) ni tiene inspector de campos/estadísticas | Inspector móvil con tipos, campos y estadísticas |
| Visualización progresiva | Parcial: muestreo y umbrales fijos; sin filtro por vista ni nivel de detalle (`progressiveViz.js`) | Evitar bloquear la UI con datasets grandes |

## Proyecto y extensibilidad

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Importar/exportar proyecto | Implementado (descarga/subida). Desktop guarda además marcadores, anotaciones y transformadores custom; los parámetros globales no van en el proyecto en ninguno de los dos | Lectura sin pérdida de proyectos Desktop (ver configuración de nodos) |
| Autoguardado y recuperación | Parcial: borrador en cada cambio, restauración manual sin aviso (Desktop: `autosave.js` con aviso de recuperación) | Aviso de recuperación al abrir; IndexedDB |
| Proyectos recientes | Pendiente (Desktop lo guarda en el backend) | IndexedDB con miniatura |
| Editor de Readers | Implementado con copias de trabajo en el proyecto (Desktop además escribe en el archivo original, que no aplica) | Recuperación/versionado |
| Transformadores custom | **Pendiente** (`customTransformers.js`: subgrafo desde una selección) | Depende de la multiselección |
| Paquetes | **Implementado** (antes figuraba como Pendiente) | — |
| Plantillas | **Implementado** (antes figuraba como Pendiente) | — |
| Parámetros globales | Implementado | — |
| Ajustes y apariencia | **Pendiente** (`appSettings.js`, `uiAppearance.js`); Studio sólo respeta la preferencia del sistema de reducir movimiento | Preferencias por dispositivo |
| Idioma | No es objetivo: el i18n de Desktop existe pero no se usa; ambas interfaces están en español | — |
| Modo sin conexión | Pendiente en Studio (service worker retirado; ver `ROADMAP.md`) | — |
| Backend y sistema de archivos local | No aplica: Readers locales cuando es viable; GDB/FeatureReader declaran que requieren servicio | Sustituir sólo cuando exista una API web segura |

## Prioridades para un usuario móvil
Propuesta de orden, por impacto en el uso real en un teléfono:
1. Reproyectar al pintar (corrección: hoy un resultado en otro CRS no se ve bien).
2. Lectura sin pérdida de la configuración de proyectos Desktop.
3. Recuperación automática del borrador (los navegadores móviles cierran pestañas).
4. Perfil de baja memoria.
5. Tabla: centrar la entidad al tocar la fila y columnas visibles.
6. Multiselección táctil con operaciones en lote; después, grupos plegables.
7. Validación del flujo antes de ejecutar.
8. Inspector de esquema sin ejecutar.

## Regla de mantenimiento

Toda funcionalidad nueva de Studio debe indicar qué capacidad de Desktop cubre,
qué adaptación móvil introduce y qué prueba la protege. Una capacidad no se
considera equivalente por mostrar controles: debe completar su recorrido
funcional con feedback visible y persistencia cuando corresponda.

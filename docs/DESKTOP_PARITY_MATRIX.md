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
| Multiselección y operaciones en lote | Implementado en móvil: «Seleccionar varios» en el panel «Acciones»; tocar marca, arrastrar uno marcado mueve el grupo, duplicar conserva las conexiones internas y eliminar; todo con un solo deshacer. Sin selección por recuadro, autoorganizar ni insertar Junction (Desktop `engine.js`) | Selección por recuadro si el uso lo pide |
| Marcadores/grupos y anotaciones | Parcial: anotaciones implementadas (Acciones > Nota / Anotar): notas sueltas en el lienzo que se arrastran y anotación dentro del nodo; color, deshacer, borrador y `.jetl` (también en la raíz del proyecto, como Desktop, que se lee al cargar). Sin anotación automática (resumen de configuración) ni grupos plegables | Grupos plegables |
| Selector de puerto asistido | Pendiente (`portSemantics.js`) | Elegir puerto al conectar en vez del primero compatible |
| Menú contextual | Parcial: el panel «Acciones» del dock ofrece, para el nodo seleccionado, ejecutar hasta él, ver resultado, duplicar, centrar y eliminar (Desktop añade junction, marcador, anotación, autoorganizar, crear transformador, validar). El menú de clic derecho sólo aparece en Android: Safari no lo lanza con pulsación larga | — |
| Validar el flujo antes de ejecutar | Implementado (Acciones > Validar flujo; `js/engine/validate.js`): flujo vacío, tipo desconocido, entradas sin conectar, ciclos, lectores sin origen, `${parámetros}` no definidos y nodos aislados; tocar una incidencia lleva al nodo. Sin las comprobaciones por nodo de Desktop (campos inexistentes en el esquema, extensión del writer…), que leen claves de configuración distintas en Studio | Comprobaciones por nodo cuando se unifique la configuración |
| Soltar un archivo en el lienzo crea su lector | Pendiente (`_handleDroppedFile`) | En móvil: abrir archivo → lector adecuado |
| Ajuste a cuadrícula | Implementado: 25 px como Desktop, activado por defecto al crear y al soltar nodos (un grupo se ajusta entero); se desactiva en Proyecto > Cuadrícula | — |
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
| Perfiles normal/baja memoria/automático | Parcial, por medición: en móvil Desktop activa siempre el perfil de baja memoria, así que Studio aplica directamente sus límites donde se midió el problema. El mapa pinta como mucho 5.000 líneas/polígonos y 20.000 puntos (50.000 polígonos: de 293 MB y 1,5 s a 31 MB y 0,4 s); la tabla ya pagina. Sin portar, por no haberse medido como problema: compactar la caché de resultados (3 nodos × 50.000 entidades ≈ 120 MB) ni limitar los workers (hasta 6) | Medir en un teléfono real antes de compactar la caché o reducir workers |
| Aviso al terminar una ejecución | Pendiente (`_notifyRunCompletion`) | API Notification web |
| Ejecución por lotes y workspace runner | No aplica (`batchDeploy.js`, `workspaceRunner.js` usan `pywebview` y el backend) | — |

## Datos y visualización

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Consola, tabla y mapa | Implementado | Conservar tabs táctiles y estado por salida |
| Reproyectar a EPSG:4326 al pintar | Implementado (`js/core/crs.js`): reproyecta sólo para pintar, con el CRS de `metadata.crs`, el `crs` de GeoJSON o `_crs`; avisa si no conoce el CRS. Desktop además descarga definiciones de epsg.io | Ampliar definiciones sin red si hacen falta más CRS |
| Tabla: centrar la entidad en el mapa al tocar una fila, columnas fijas, mostrar/ocultar campos, carga progresiva | Parcial: tocar una fila abre el mapa centrado en la entidad (también si quedó fuera del muestreo del mapa) y «Columnas» muestra u oculta campos por nodo durante la sesión. Sin columnas fijas (`toggleTablePinnedField`); la tabla ya pinta por ventanas de 200 filas | Columnas fijas si el uso real lo pide |
| Gestor de capas | Parcial: control estándar de Leaflet (Desktop: aislar, renombrar, zoom) | — |
| Herramienta de medir | Pendiente (`toggleMeasure`) | — |
| Visor 3D vectorial | Fuera de alcance (decisión del 18 de octubre de 2026): aporta poco en móvil y es pesado, aunque `vectorViewer3D.js` sea JS sin backend | — |
| Raster y LiDAR (nodos y visores) | Fuera de alcance | Conservar proyectos heredados |
| Esquema y metadatos | **Pendiente**: Studio no propaga esquemas sin ejecutar (`schemaEngine.js`) ni tiene inspector de campos/estadísticas | Inspector móvil con tipos, campos y estadísticas |
| Visualización progresiva | Parcial: muestreo y umbrales fijos; sin filtro por vista ni nivel de detalle (`progressiveViz.js`) | Evitar bloquear la UI con datasets grandes |

## Proyecto y extensibilidad

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Importar/exportar proyecto | Implementado (descarga/subida). Desktop guarda además marcadores, anotaciones y transformadores custom; los parámetros globales no van en el proyecto en ninguno de los dos | Lectura sin pérdida de proyectos Desktop (ver configuración de nodos) |
| Autoguardado y recuperación | Implementado: borrador en cada cambio (`js/state/draft.js`) y aviso al abrir con antigüedad y nodos para recuperar o descartar (`js/ui/draftPrompt.js`). A diferencia de Desktop, no caduca a las 24 h: en móvil la app puede pasar días cerrada | IndexedDB si el tamaño de `localStorage` se queda corto |
| Proyectos recientes | Pendiente (Desktop lo guarda en el backend) | IndexedDB con miniatura |
| Editor de Readers | Implementado con copias de trabajo en el proyecto (Desktop además escribe en el archivo original, que no aplica) | Recuperación/versionado |
| Transformadores custom | **Pendiente** (`customTransformers.js`: subgrafo desde una selección) | Depende de la multiselección |
| Paquetes | **Implementado** (antes figuraba como Pendiente) | — |
| Plantillas | **Implementado** (antes figuraba como Pendiente) | — |
| Parámetros globales | Implementado | — |
| Ajustes y apariencia | **Pendiente** (`appSettings.js`, `uiAppearance.js`); Studio sólo respeta la preferencia del sistema de reducir movimiento | Preferencias por dispositivo |
| Idioma | No es objetivo: el i18n de Desktop existe pero no se usa; ambas interfaces están en español | — |
| Modo sin conexión | Implementado (`sw.js`): la app desplegada abre y ejecuta sin red; mapa base y lectores de red necesitan conexión | Validar en dispositivos |
| Backend y sistema de archivos local | No aplica: Readers locales cuando es viable; GDB/FeatureReader declaran que requieren servicio | Sustituir sólo cuando exista una API web segura |

## Prioridades para un usuario móvil
Propuesta de orden, por impacto en el uso real en un teléfono:
1. ~~Reproyectar al pintar~~ (hecho).
2. Lectura sin pérdida de la configuración de proyectos Desktop (aplazado por decisión del usuario; ver `ROADMAP.md`).
3. ~~Recuperación automática del borrador~~ (hecho).
4. ~~Perfil de baja memoria~~ (hecho en el mapa; ver la fila de perfiles).
5. ~~Tabla: centrar la entidad al tocar la fila y columnas visibles~~ (hecho).
6. ~~Multiselección táctil con operaciones en lote~~ (hecho); después, grupos plegables.
7. ~~Validación del flujo antes de ejecutar~~ (hecho).
8. Inspector de esquema sin ejecutar.

## Regla de mantenimiento

Toda funcionalidad nueva de Studio debe indicar qué capacidad de Desktop cubre,
qué adaptación móvil introduce y qué prueba la protege. Una capacidad no se
considera equivalente por mostrar controles: debe completar su recorrido
funcional con feedback visible y persistencia cuando corresponda.

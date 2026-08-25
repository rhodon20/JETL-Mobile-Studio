# Matriz viva de paridad Desktop → Studio

Referencia auditada: `rhodon20/JETL-Desktop`, rama `main`, 24 de agosto de 2026.
La paridad significa conservar la capacidad y adaptar la interacción a móvil;
no copiar literalmente paneles de escritorio ni dependencias de Python o del
sistema de archivos.

**Regla no negociable:** Studio debe converger al catálogo vectorial y tabular de
Desktop. Raster y LiDAR quedan fuera de alcance por su volumen; las capacidades
heredadas no se eliminan, pero tampoco se cuentan como deuda. El inventario, los estados de compatibilidad y el control automático se
mantienen en [`NODE_CATALOG_PARITY.md`](./NODE_CATALOG_PARITY.md).

## Flujo y edición

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Catálogo objetivo de nodos | 115 Desktop en alcance / 115 IDs compartidos | Catálogo objetivo cerrado; mantener contratos y compatibilidad bidireccional |
| Contratos de puertos compartidos | 115/115 alineados; Keeper y Attribute Creator recuperan el puerto único Desktop | Mantener el gate sin discrepancias y proteger proyectos antiguos con salida dinámica de rechazados |
| Catálogo y QuickSearch | Equivalente móvil | Mantener búsqueda por nombre/categoría y acceso táctil |
| Encadenar al insertar con una selección | Implementado | Búsqueda y catálogo conectan al primer puerto compatible |
| Pan, zoom, selección y centrado | Implementado | Regresión táctil en Safari y Chromium móvil |
| Navegador/resumen de flujo | Parcial | Añadir minimapa y navegación en flujos grandes |
| Insertar un nodo sobre una conexión | Implementado | Dividir la conexión, preservar puertos y agruparlo en un solo deshacer |
| Multiselección y operaciones en lote | Pendiente | Mover, duplicar y eliminar el conjunto |
| Marcadores y anotaciones de canvas | Pendiente | Crear, editar, localizar y persistir |
| Deshacer/rehacer | Implementado | Cubrir también conexiones y cambios de formulario |
| Nodo compacto + editor modal estilo Desktop | Attributes —incluidos Keeper y Creator multirregla—, Geometry, Spatial, Readers, FeatureReader y Utils comparten resumen + JSON + Guardar/Cancelar | Extender el patrón a Writers avanzados |

## Ejecución y diagnóstico

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Ejecutar flujo completo | Implementado | Procesar todo DAG, ramas y componentes desconectados; detectar ciclos |
| Ejecutar nodo y dependencias | Implementado | Mantener acción Play por nodo |
| Historial maestro/detalle | Implementado v2 | KPIs, detalle por nodo, filtro, errores y salto al canvas |
| Exportar informe JSON/CSV | Implementado | Exportar la ejecución seleccionada |
| Perfiles normal/baja memoria/automático | Parcial | Exponer perfil efectivo y justificar la selección |
| Ejecución por lotes y workspace runner | Compatibilidad de proyecto; ejecución externa requiere servicio | Diseñar cola persistente compatible con las APIs web |
| Diagnóstico progresivo durante el run | Implementado v1 | Estado por nodo, avance real, tiempos, cancelación y salto al error |

## Datos y visualización

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Consola, tabla y mapa | Implementado | Conservar tabs táctiles y estado por salida |
| Visores vector y 3D web | Parcial | Inventariar herramientas y validar cada tipo de salida compatible |
| Raster y LiDAR masivos | Fuera de alcance | Conservar proyectos heredados sin ampliar el catálogo ni prometer ejecución web |
| Esquema y metadatos | Parcial | Inspector móvil con tipos, campos y estadísticas |
| Visualización progresiva | Parcial | Evitar bloquear UI con datasets grandes |
| Caché por nodo | Implementado | Hacer visibles hits, invalidación y tamaño |

## Proyecto y extensibilidad

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Importar/exportar proyecto | Implementado v2; las copias editables de CSV, Excel y GeoJSON se declaran, validan y restauran sin depender de rutas locales | Ampliar validación bidireccional Desktop/Studio y versionado del esquema |
| Autoguardado y recuperación | Parcial | Versionado, conflicto y restauración explícitos |
| Editor de Readers | Implementado para GeoJSON, KML, CSV, Excel, SHP, GPX y GDB; selector nativo táctil, edición de filas y copias portables en CSV, Excel y GeoJSON | Mantener límites honestos y añadir recuperación/versionado del proyecto |
| Transformers, paquetes y plantillas | Pendiente | Catálogo compatible con el runtime web |
| Ajustes, apariencia e idioma | Parcial | Completar preferencias reproducibles por proyecto/dispositivo |
| Backend y sistema de archivos local | Adaptación explícita: Readers locales cuando es viable; GDB/FeatureReader requieren servicio | Sustituir solo cuando exista una Web API segura |

## Regla de mantenimiento

Toda funcionalidad nueva de Studio debe indicar qué capacidad de Desktop cubre,
qué adaptación móvil introduce y qué test de confianza la protege. Una capacidad
no se considera equivalente por mostrar controles: debe completar su recorrido
funcional con feedback visible y persistencia cuando corresponda.

# Matriz viva de paridad Desktop → Studio

Referencia auditada: `rhodon20/JETL-Desktop`, rama `main`, 14 de agosto de 2026.
La paridad significa conservar la capacidad y adaptar la interacción a móvil;
no copiar literalmente paneles de escritorio ni dependencias de Python o del
sistema de archivos.

## Flujo y edición

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Catálogo y QuickSearch | Equivalente móvil | Mantener búsqueda por nombre/categoría y acceso táctil |
| Encadenar al insertar con una selección | Implementado | Búsqueda y catálogo conectan al primer puerto compatible |
| Pan, zoom, selección y centrado | Implementado | Regresión táctil en Safari y Chromium móvil |
| Navegador/resumen de flujo | Parcial | Añadir minimapa y navegación en flujos grandes |
| Insertar un nodo sobre una conexión | Implementado | Dividir la conexión, preservar puertos y agruparlo en un solo deshacer |
| Multiselección y operaciones en lote | Pendiente | Mover, duplicar y eliminar el conjunto |
| Marcadores y anotaciones de canvas | Pendiente | Crear, editar, localizar y persistir |
| Deshacer/rehacer | Implementado | Cubrir también conexiones y cambios de formulario |
| Nodo compacto + configuración modal móvil | Pendiente priorizado | Mantener puertos/estado en canvas y editar en una hoja inferior |

## Ejecución y diagnóstico

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Ejecutar flujo completo | Implementado | Procesar todo DAG, ramas y componentes desconectados; detectar ciclos |
| Ejecutar nodo y dependencias | Implementado | Mantener acción Play por nodo |
| Historial maestro/detalle | Implementado v2 | KPIs, detalle por nodo, filtro, errores y salto al canvas |
| Exportar informe JSON/CSV | Implementado | Exportar la ejecución seleccionada |
| Perfiles normal/baja memoria/automático | Parcial | Exponer perfil efectivo y justificar la selección |
| Ejecución por lotes y workspace runner | Pendiente web | Diseñar cola persistente compatible con las APIs web |
| Diagnóstico progresivo durante el run | Implementado v1 | Estado por nodo, avance real, tiempos, cancelación y salto al error |

## Datos y visualización

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Consola, tabla y mapa | Implementado | Conservar tabs táctiles y estado por salida |
| Visores vector/raster/3D/LiDAR | Parcial | Inventariar herramientas y validar cada tipo de salida |
| Esquema y metadatos | Parcial | Inspector móvil con tipos, campos y estadísticas |
| Visualización progresiva | Parcial | Evitar bloquear UI con datasets grandes |
| Caché por nodo | Implementado | Hacer visibles hits, invalidación y tamaño |

## Proyecto y extensibilidad

| Capacidad Desktop | Estado Studio | Próximo criterio de aceptación |
| --- | --- | --- |
| Importar/exportar proyecto | Implementado | Compatibilidad bidireccional de versión y validación |
| Autoguardado y recuperación | Parcial | Versionado, conflicto y restauración explícitos |
| Editor de fuentes | Pendiente | Diseñar alternativa web segura y limitada |
| Transformers, paquetes y plantillas | Pendiente | Catálogo compatible con el runtime web |
| Ajustes, apariencia e idioma | Parcial | Completar preferencias reproducibles por proyecto/dispositivo |
| Backend y sistema de archivos local | No directo | Sustituir solo cuando exista una Web API segura |

## Regla de mantenimiento

Toda funcionalidad nueva de Studio debe indicar qué capacidad de Desktop cubre,
qué adaptación móvil introduce y qué test de confianza la protege. Una capacidad
no se considera equivalente por mostrar controles: debe completar su recorrido
funcional con feedback visible y persistencia cuando corresponda.

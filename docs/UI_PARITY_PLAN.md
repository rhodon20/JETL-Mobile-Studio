# Plan de convergencia de interfaz: Desktop → Mobile Studio

Este documento ordena la aproximación visual y operativa de JETL Mobile Studio
a JETL Desktop. Desktop es únicamente la referencia de producto: no se modifica
ni se trasladan contratos que dependan de Python o del sistema de archivos local.

## Principios

- Una sola estructura funcional con adaptaciones por tamaño de pantalla.
- Paridad de lenguaje visual y de interacción, no copia literal del escritorio.
- El lienzo y los nodos Drawflow mantienen geometría, puertos y comportamiento.
- Todas las operaciones posibles permanecen locales y compatibles con PWA.
- Raster y LiDAR masivos quedan fuera de alcance; la convergencia funcional se
  limita al catálogo vectorial y tabular de Desktop.
- En móvil, los paneles secundarios se presentan como hojas y nunca bloquean la
  barra de navegación de forma accidental. Los editores de nodos conservan, en
  cambio, el contrato modal de Desktop.
- Movimiento limitado a opacidad y `transform`, respetando
  `prefers-reduced-motion`.

## Matriz de equivalencias

| Área Desktop | Mobile Studio | Estado |
| --- | --- | --- |
| Barra de herramientas completa | Dock inferior + hoja Proyecto | Implementado |
| Catálogo lateral colapsable | Hoja lateral Nodos con búsqueda | Implementado |
| Panel inferior con estado colapsado | Visor con acción fija Mostrar/Ocultar | Implementado |
| Mapa, datos y consola | Hoja Resultados con pestañas | Implementado |
| Superficies y movimiento coherentes | Tokens y transiciones compartidas | En curso |
| Diálogos de configuración | Sistema modal accesible y adaptable | Base implementada |
| Historial de ejecución | Maestro/detalle local con KPIs, nodos, errores y exportación | Implementado v2 |
| Navegador de flujo | Búsqueda de nodos y atributos | Implementado v1 |
| Apariencia classic/material | Preferencia visual local | Pendiente |
| Backend, lotes y filesystem | Alternativas Web API cuando existan | Fuera de paridad directa |

## Fases

### Fase 1 — Base móvil

- Navegación inferior.
- Safe areas y viewport dinámico.
- Proyecto, catálogo y resultados como superficies independientes.
- Caché PWA actualizada.

### Fase 2 — Visor y modales

- Estado del visor basado en clase, no en alturas inline.
- Acciones del visor separadas de la zona desplazable de pestañas.
- Botón Mostrar/Ocultar siempre visible, con estado y etiquetas accesibles.
- Cabecera, cuerpo y pie consistentes en los modales existentes.
- Cierre con Escape, clic en backdrop, trampa de foco y restauración del foco.

#### Editor modal de nodos (referencia Desktop)

La referencia funcional es `JETL-Desktop/docs/guides/MODAL_EDITOR_GUIDE.md`:

- El nodo mantiene en el canvas una representación compacta con resumen y una
  acción explícita para abrir el editor.
- La configuración completa se conserva como JSON en un campo oculto del nodo.
- El editor es un modal con cabecera, cuerpo desplazable y pie con
  **Cancelar** y **Guardar y cerrar**.
- Guardar actualiza el JSON y el resumen compacto; cancelar no modifica el nodo.
- En pantallas amplias el diálogo permanece centrado. En teléfonos se adapta a
  casi toda la superficie disponible, sin convertirse en inspector lateral ni
  en hoja inferior.

Implementado como patrón inicial en **Field Calculator Pro**, **String
Formatter**, **List Concatenator** y **Substring Extractor**. Los editores conservan la configuración en JSON y admiten la apertura
mediante botón o doble clic, con compatibilidad de lectura y guardado para los
flujos creados antes de esta migración.

### Fase 3 — Navegación del flujo

- Buscador global de nodos y atributos. Implementado v1.
- Centrado y selección desde resultados. Implementado v1.
- Miniresumen del flujo en proyectos grandes. Implementado v1 con recuento de nodos, conexiones y categorías.
- Inserción encadenada: con una única selección, el nodo nuevo se coloca a la
  derecha, se conecta al primer puerto compatible y pasa a ser la selección.
  Implementado.

### Fase 4 — Ejecución y diagnóstico

- Historial local de las últimas 30 ejecuciones. Implementado v2.
- Maestro/detalle con KPIs, estado, duración, caché, features, salidas, errores,
  filtro y acceso al nodo afectado. Implementado v2.
- Ejecución total topológica de todos los nodos —incluidas ramas y componentes
  desconectados— desde el dock; ejecución parcial desde cada nodo. Implementado.
- Detección explícita de ciclos antes de ejecutar. Implementado.
- Monitor de ejecución en tiempo real con nodo activo, progreso, tiempos,
  estados de caché/error/cancelación y salto al nodo afectado. Implementado v1.
- Exportación de informes desde Proyecto/Resultados.

La cobertura funcional completa se mantiene en
[`DESKTOP_PARITY_MATRIX.md`](./DESKTOP_PARITY_MATRIX.md); este plan deja de ser
una lista implícita y cada evolución de Studio debe actualizar esa matriz.

### Fase 5 — Apariencia y pulido

- Tokens visuales convergentes con Desktop.
- Capa central de movimiento con carga diferida, preferencia normal/reducida y
  degradación segura a Web Animations.
- **Anime.js** como motor habitual para entradas breves, listas, feedback y
  cambios de estado. Ya forma parte del repositorio y se prepara tras el primer
  render, no al iniciar el motor GIS.
- **GSAP** reservado para secuencias coordinadas que realmente necesiten una
  timeline (plan de ejecución, historial y transiciones entre varios paneles).
  No se cargará para microinteracciones que Anime.js o CSS resuelvan mejor.
- **Morphicons** para parejas de iconos SVG con estado —abrir/cerrar,
  reproducir/cancelar, expandir/contraer— conforme se sustituyan los glifos de
  Font Awesome correspondientes. No se intentará deformar iconos de fuente.
- Presupuesto: sólo `opacity` y `transform`, sin movimiento infinito decorativo,
  sin escalados elásticos y sin bloquear interacción o carga en Safari.
- Auditoría táctil, teclado, lector de pantalla y regresión de escritorio.

La prioridad inmediata es consolidar la capa Anime.js y sus tests. Después se
aplicará Morphicons a controles con dos estados y GSAP al primer recorrido que
necesite coordinación temporal real. La paridad funcional del catálogo de nodos
continúa siendo el criterio principal de planificación.

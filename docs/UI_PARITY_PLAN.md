# Plan de convergencia de interfaz: Desktop → Mobile Studio

Este documento ordena la aproximación visual y operativa de JETL Mobile Studio
a JETL Desktop. Desktop es únicamente la referencia de producto: no se modifica
ni se trasladan contratos que dependan de Python o del sistema de archivos local.

## Principios

- Una sola estructura funcional con adaptaciones por tamaño de pantalla.
- Paridad de lenguaje visual y de interacción, no copia literal del escritorio.
- El lienzo y los nodos Drawflow mantienen geometría, puertos y comportamiento.
- Todas las operaciones posibles permanecen locales y compatibles con PWA.
- En móvil, los paneles secundarios se presentan como hojas y nunca bloquean la
  barra de navegación de forma accidental.
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
| Historial de ejecución | Historial local PWA | Implementado v1 |
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

### Fase 3 — Navegación del flujo

- Buscador global de nodos y atributos. Implementado v1.
- Centrado y selección desde resultados. Implementado v1.
- Miniresumen del flujo en proyectos grandes. Implementado v1 con recuento de nodos, conexiones y categorías.

### Fase 4 — Ejecución y diagnóstico

- Historial local de las últimas 30 ejecuciones. Implementado v1.
- Estados, duración, errores y acceso al nodo afectado. Implementado v1.
- Ejecución total inequívoca desde el dock y ejecución parcial desde cada nodo. Implementado.
- Exportación de informes desde Proyecto/Resultados.

### Fase 5 — Apariencia y pulido

- Tokens visuales convergentes con Desktop.
- Preferencia de movimiento normal/reducido.
- Auditoría táctil, teclado, lector de pantalla y regresión de escritorio.

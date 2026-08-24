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
El alcance Studio excluye 17 (14 Raster y tres lectores/escritores Raster/LiDAR),
por lo que el catálogo objetivo verificable es de **117 nodos**. Studio registra
ahora 102: 98 compartidos dentro de alcance y 19 ausencias objetivo.
`reader_file` es una abstracción exclusiva de Studio.

| Familia | Desktop | Compartidos | Faltan | Cobertura IDs |
| --- | ---: | ---: | ---: | ---: |
| Attributes | 22 | 22 | 0 | 100 % |
| Readers | 19 | 10 | 9 | 52,6 % |
| Spatial | 18 | 18 | 0 | 100 % |
| Geometry | 37 | 37 | 0 | 100 % |
| Raster | 14 | 2 | 12 | Fuera de alcance |
| Utils | 14 | 6 | 8 | 42,9 % |
| Writers | 10 | 6 | 4 | 60,0 % |

De los 33 ausentes totales, 19 están dentro del alcance objetivo. El manifiesto
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

## Orden de trabajo

1. **P0 — Manifiesto y compatibilidad:** exportar el catálogo canónico de
   Desktop, fijar identificadores compartidos y generar la brecha real.
   **Completado:** manifiesto de 134 nodos y gate automático.
2. **P0 — Contratos compartidos:** corregir primero puertos y resultados de los
   nodos que ya existen en ambos productos. FeatureJoiner, Snapper y Clipper ya
   recuperan sus salidas Desktop; las salidas de rechazo adicionales de Keeper y
   Attr Creator requieren una decisión explícita de compatibilidad.
3. **P1 — Nodos de flujo habitual:** portar primero lectores, transformaciones,
   operaciones espaciales y escritores que puedan ejecutarse enteramente en web.
   **Attributes completada (22/22):** List Concatenator, Substring Extractor,
   Attribute Splitter, List Exploder, String Replacer, Aggregator y las dos
   generaciones de Attribute Manager conservan contrato, configuración y
   semántica Desktop con editor modal adaptado. El manager legado permanece
   oculto para importar proyectos antiguos y conserva su salida de rechazados.
   **Geometry completada en catálogo (37/37):** las transformaciones locales
   conservan contratos y configuración Desktop. Area Builder, Extruder,
   Generalizer, Geometry Coercer, Line Builder, MultiBufferer y Offsetter se
   ejecutan en navegador. Centerline Replacer conserva sus dos salidas y exige
   explícitamente el backend Python, sin simular un resultado local incorrecto.
   **Spatial completada (18/18):** los seis Overlayers Point/Line/Area conservan
   dos entradas, salidas matched/unmatched, multiplicidad de coincidencias y
   prefijos de atributos. Anchored Snapper conserva sus cuatro salidas Desktop;
   Neighbor Finder separa matched/unmatched; Spatial Relator mantiene relaciones,
   agrupación, recuentos, atributos y listas, con límite explícito para backend.
4. **P1 — Configuración equivalente:** extender el modal de Desktop a todos los
   nodos complejos y garantizar importación/exportación sin pérdida.
5. **P2 — Capacidades con backend:** mantener el nodo visible, definir contrato
   de servicio y ofrecer diagnóstico accionable cuando el backend no exista.
6. **Fuera de alcance — Raster y LiDAR:** conservar sólo compatibilidad de
   lectura de proyectos existentes; no portar nodos ni visores de datos masivos.

La paridad del catálogo es el eje principal del roadmap. El pulido visual y el
movimiento avanzan en paralelo, pero no sustituyen capacidad funcional.

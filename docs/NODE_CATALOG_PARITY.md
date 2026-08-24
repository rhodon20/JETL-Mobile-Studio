# Paridad del catálogo de nodos Desktop → Studio

## Objetivo de producto

Studio debe ofrecer el mismo catálogo funcional de nodos que JETL Desktop. La
adaptación a navegador o a pantalla táctil puede cambiar la forma de configurar
un nodo, pero no es motivo para que el nodo desaparezca silenciosamente.

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

A 24 de agosto de 2026, el Code Graph canónico de Desktop registra **134 nodos**
y Studio registra **67**. Comparten 66 identificadores; faltan 68 nodos Desktop
y `reader_file` es una abstracción exclusiva de Studio.

| Familia | Desktop | Compartidos | Faltan | Cobertura IDs |
| --- | ---: | ---: | ---: | ---: |
| Attributes | 22 | 14 | 8 | 63,6 % |
| Readers | 19 | 10 | 9 | 52,6 % |
| Spatial | 18 | 9 | 9 | 50,0 % |
| Geometry | 37 | 20 | 17 | 54,1 % |
| Raster | 14 | 2 | 12 | 14,3 % |
| Utils | 14 | 5 | 9 | 35,7 % |
| Writers | 10 | 6 | 4 | 60,0 % |

De los 68 ausentes, 43 son frontend, 21 backend-ready y 4 híbridos en Desktop.
El manifiesto trazable está en `desktop-node-manifest.json` y conserva el estado
de runtime de cada nodo.

El control local se ejecuta con:

```bash
node scripts/audit-node-parity.mjs
node scripts/audit-node-parity.mjs /ruta/desktop-node-manifest.json
```

El segundo comando termina con error si Desktop contiene identificadores que no
existen en Studio, de modo que la diferencia pueda protegerse en CI.

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
4. **P1 — Configuración equivalente:** extender el modal de Desktop a todos los
   nodos complejos y garantizar importación/exportación sin pérdida.
5. **P2 — Capacidades con backend:** mantener el nodo visible, definir contrato
   de servicio y ofrecer diagnóstico accionable cuando el backend no exista.
6. **P2 — Visores especializados:** vector, raster, 3D y LiDAR con sus metadatos
   y límites de rendimiento.

La paridad del catálogo es el eje principal del roadmap. El pulido visual y el
movimiento avanzan en paralelo, pero no sustituyen capacidad funcional.

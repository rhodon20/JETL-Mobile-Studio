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

A 24 de agosto de 2026, Studio registra **67 tipos de nodo** distribuidos en
siete módulos. Esta cifra no se declara equivalente a Desktop hasta importar el
manifiesto canónico de Desktop y comparar ambos catálogos por identificador.

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
2. **P1 — Nodos de flujo habitual:** portar primero lectores, transformaciones,
   operaciones espaciales y escritores que puedan ejecutarse enteramente en web.
3. **P1 — Configuración equivalente:** extender el modal de Desktop a todos los
   nodos complejos y garantizar importación/exportación sin pérdida.
4. **P2 — Capacidades con backend:** mantener el nodo visible, definir contrato
   de servicio y ofrecer diagnóstico accionable cuando el backend no exista.
5. **P2 — Visores especializados:** vector, raster, 3D y LiDAR con sus metadatos
   y límites de rendimiento.

La paridad del catálogo es el eje principal del roadmap. El pulido visual y el
movimiento avanzan en paralelo, pero no sustituyen capacidad funcional.

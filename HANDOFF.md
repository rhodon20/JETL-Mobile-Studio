# HANDOFF - Continuidad de Trabajo JETL

Fecha: 2026-03-05  
Proyecto: `JETL_260209_EV`  
Fuente de verdad de avance: `ROADMAP.md`

## 1) Estado actual (resumen ejecutivo)
- Estado funcional reportado por usuario: **Smoke OK 32/32**.
- Roadmap (snapshot vigente en `ROADMAP.md`):
  - `done`: 24
  - `doing`: 2
  - `todo`: 4
  - Avance cerrado: 80.0%
  - Avance operativo: 83.3%

Nota: el conteo de tests smoke puede crecer por iteraciones; usar siempre el resultado real de `JETLSmoke.runExtended()` al retomar.

## 2) Qué está ya consolidado
- UX/estabilidad base completada (Fase 0 y Fase 1 principales).
- Workerización avanzada de múltiples nodos de atributos y geometría.
- Cancelación de ejecución operativa.
- Inspector por puertos, plantillas, parámetros de workspace y run report activos.
- Botón de mapa ampliado/restaurado (modo “pantalla de app”) implementado.

## 3) Bloques abiertos reales
- `doing`:
  - Fase 2: Migrar operaciones pesadas restantes a workers.
  - Fase 3: Suite mínima de tests unitarios/integración (actualmente muy apoyado en smoke extendido).
- `todo`:
  - Parámetros guiados por metadatos (anotado como “ya cubierto por Fase 0.2”; falta cierre administrativo en roadmap).
  - Data Inspector persistente tipo feature cache browser.
  - Incremental run / dirty propagation inteligente.
  - Package manager de transformadores comunitarios.

## 4) Incidencias/restricciones conocidas
- En entornos locales con workers, algunos checks pueden aparecer como `omitido` por timeout/cancel residual del pool.
- Se añadió manejo defensivo para evitar falsos rojos en smoke; validar funcionalidad real además del verde del smoke.
- Si el servidor local no sirve bien libs de worker (`jsts`, etc.), pueden aparecer degradaciones controladas.

## 5) Protocolo de arranque recomendado (nueva sesión/cuenta)
1. Leer `ROADMAP.md` + este `HANDOFF.md`.
2. Abrir app en `localhost` (no `file://`) para workers.
3. Ejecutar en consola:
   - `await JETLSmoke.runExtended()`
4. Si smoke falla:
   - revisar detalle por bloque (`geometry_aux_workers`, `geo_worker_health`, `spatial_*`),
   - distinguir fallo real vs omitido por entorno.
5. Continuar por orden:
   - cerrar Fase 2 (`doing` -> `done`),
   - cerrar Fase 3 (`doing` -> `done`),
   - limpiar ítem “Parámetros guiados por metadatos” (si ya cubierto, marcar `done`).

## 6) Criterio de “hecho” inmediato para reducir abiertos
- Objetivo corto: pasar de 6 abiertos a 3 abiertos cerrando:
  - Fase 2 `doing` (workerización restante),
  - Fase 3 `doing` (suite mínima formalizada),
  - `todo` de metadatos ya cubierto.

## 7) Instrucción de continuidad (prompt sugerido)
Usar este texto al iniciar en otra cuenta:

`Lee ROADMAP.md y HANDOFF.md, valida estado con await JETLSmoke.runExtended() y continúa desde el bloque en curso de Fase 2 sin rehacer tareas cerradas.`


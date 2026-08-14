# TESTING - Protocolo de Regresion JETL

## 1) Modo recomendado para cada iteracion
En consola del navegador:

```js
await JETLSmoke.runStable()
```

Objetivo: validar regresion funcional sin depender de inestabilidad de worker pool.

## 2) Validacion completa (incluye workers)
En consola del navegador:

```js
await JETLSmoke.runExtended()
```

Nota:
- Puede marcar checks worker como `omitido` por timeout/cancel residual del entorno.
- Usar este modo para cobertura amplia y diagnostico de entorno.

## 3) Gate de release (pass/fail directo)
Gate estable (recomendado):

```js
await JETLSmoke.runGate('stable')
```

Gate completo:

```js
await JETLSmoke.runGate('extended')
```

Comportamiento:
- Si todo va bien, devuelve resumen `{ ok: true, ... }`.
- Si falla, lanza error con nombres de checks fallidos.

## 4) Criterio de aceptacion rapido
- Minimo por iteracion: `runStable` en verde.
- Antes de release: `runStable` en verde + `runExtended` revisado (sin fallos funcionales reales).

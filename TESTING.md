# TESTING - Pruebas de JETL Mobile Studio

## 1) Antes de cada commit

```sh
npm test
```

Ejecuta, en este orden (para en el primer fallo):

| Paso | Archivo | Qué comprueba |
|---|---|---|
| `npm run check` | `scripts/inline-assets.mjs --check` | `index.html` incrusta la versión actual de core/params/formats y del CSS crítico |
| | `tests/check-graph.mjs` | capas, ciclos, dueño único del estado global, nombres privados de módulos usados desde fuera; las violaciones conocidas están en `tests/graph-baseline.json` (hoy ninguna) y la lista sólo puede encoger |
| `npm run test:unit` | `tests/*.test.mjs` | unitarias con `node:test`: nodos (paridad con Desktop), plan de ejecución, monitor, historial, navegación móvil, persistencia, build |
| `npm run test:smoke` | `tests/run-smoke.mjs` | suite `JETLSmoke.runStable()` dentro de Chromium (Playwright), en tamaño móvil |
| | `tests/app-flow.mjs` | flujos reales de la app: ejecución total, parcial y fallida, monitor, contadores, historial, proyecto nuevo, cuadrícula del lienzo, módulos bajo demanda, panel de versión y que ningún script se descargue dos veces |
| | `tests/basemap.mjs` | mapa base: OpenFreeMap si responde, OpenStreetMap si no, y que nunca se pida CARTO ni una API key |

Extra (también en CI):

```sh
npm run test:extended          # JETLSmoke.runExtended(): añade las pruebas con workers
npm run build                  # genera dist/
node tests/run-smoke.mjs --root dist
node tests/app-flow.mjs --root dist
```

Contra `dist/` se comprueba además que cada script se pide con su versión de
contenido. `tests/build.test.mjs` (dentro de las unitarias) construye en un
directorio temporal y verifica las versiones, el *import map* y el sello de
despliegue.

## 2) CI
`.github/workflows/ci.yml` ejecuta todo lo anterior en cada push y pull request.
En `main`, si pasa, publica `dist/` en GitHub Pages.

## 3) Escribir pruebas
- Un bug reproducible lleva prueba de regresión. Compruébala contra el código
  anterior: debe fallar sin el arreglo.
- Para flujos de la app, añade comprobaciones a `tests/app-flow.mjs`; usa sólo
  lectores sin red (`reader_bbox_gen`, `reader_wkt`).
- Las unitarias que leen el código fuente cortan funciones por nombre; si mueves
  código, actualiza el archivo que leen, no lo que afirman.
- Los nodos se cargan en las unitarias como *scripts* en un sandbox: no les
  añadas `import`/`export`.

## 4) Rendimiento

```sh
node tests/boot-timing.mjs --root dist
```

Arranque en un perfil de móvil lento (150 ms de latencia, 1,6 Mbps, CPU ×4):
mediana de 5 hasta que el editor está listo. Es una herramienta de comparación
(antes/después en la misma máquina), no una prueba con umbral.

## 5) En el navegador
La suite smoke también se puede lanzar a mano desde la consola:

```js
await JETLSmoke.runStable()        // regresión funcional, sin workers
await JETLSmoke.runExtended()      // añade workers
await JETLSmoke.runGate('stable')  // lanza error si algo falla
```

## 6) Validación en dispositivo
Lo automático corre en Chromium. Los cambios de arranque, carga de módulos o
interfaz móvil se validan además en un iPhone real (Safari) tras desplegar;
ver `RELEASE_CHECKLIST.md`.

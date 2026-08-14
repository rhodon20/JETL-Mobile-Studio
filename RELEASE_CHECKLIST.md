# Checklist de Release y Regresion

Ultima actualizacion: 2026-02-28

## 1) Pre-release tecnico
- [ ] Cargar app en `index.html` con cache limpio (`Ctrl+F5`).
- [ ] Verificar indicador de estado en verde.
- [ ] Ejecutar `await JETLSmoke.runBasic()` y confirmar `fail: 0`.
- [ ] Ejecutar `await JETLSmoke.runExtended()` y confirmar `fail: 0`.

## 2) Regresion UI base
- [ ] Sidebar: click en herramienta agrega nodo.
- [ ] Sidebar: drag and drop al lienzo funciona.
- [ ] Nodo: botones `run`, `view`, `delete` funcionan.
- [ ] Tabla: filtro por campo y texto funciona.
- [ ] Tabla: seleccion multiple + export GeoJSON/CSV funciona.
- [ ] Undo/Redo: secuencia de crear/mover/conectar/borrar revierte y rehace bien.

## 3) Regresion nodos atributos criticos
- [ ] `Attribute Join`: combos de campos por `input_1/input_2` + add pair.
- [ ] `Feature Merger`: asistente de pares de campos operativo.
- [ ] `Field Calculator Pro`: insercion de campos y calculo sin errores.
- [ ] `Matcher`: lista checkbox de campos sincronizada con input.
- [ ] `Stats Calc`: resultados visibles en columnas `stats_*`.
- [ ] `Tester`: constructor de condiciones (`AND/OR`) y salida correcta.

## 4) Regresion motor y ejecucion
- [ ] Ejecucion completa de flujo medio sin errores en consola.
- [ ] Cancelacion manual de flujo pesado responde correctamente.
- [ ] Reejecucion tras cancelar sigue funcionando.
- [ ] `Clear Canvas` limpia nodos, mapa, cache y estado.
- [ ] Plantilla demo aplica y ejecuta.

## 5) I/O y formatos
- [ ] KML import/export roundtrip correcto.
- [ ] GeoJSON read/write correcto.
- [ ] CSV write correcto.
- [ ] GPKG (experimental): probar lectura y export.
- [ ] Parquet (experimental): probar lectura y export.

## 6) Evidencias de release
- [ ] Guardar captura de `SMOKE`/`SMOKE+CORE`.
- [ ] Guardar nota breve de navegadores validados.
- [ ] Actualizar `PROJECT_STATUS.txt` con fecha y resultado.
- [ ] Actualizar `ROADMAP.md` con iteracion cerrada.

## 7) Gate de salida
- [ ] No hay fallos criticos abiertos.
- [ ] `SMOKE` y `SMOKE+CORE` en verde.
- [ ] Checklist completado al 100% o con excepciones documentadas.


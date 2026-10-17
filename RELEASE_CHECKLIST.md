# Checklist de publicación

Publicar es llevar `main` al commit deseado: el CI despliega en GitHub Pages si
todo pasa. Ver `TESTING.md` para el detalle de cada prueba.

## 1) Antes de llevar a `main`
- [ ] `npm test` en verde en local.
- [ ] CI en verde en la rama (incluye smoke extendido y pruebas contra `dist/`).
- [ ] Si el cambio toca el arranque o la carga de scripts: comparar
      `node tests/boot-timing.mjs --root dist` antes y después.
- [ ] Documentación al día si cambia la estructura, las pruebas o el proceso.

## 2) Después de desplegar
- [ ] El CI de `main` termina en verde (incluye el despliegue).
- [ ] En el dispositivo: pulsar «JETL Studio» en la cabecera. Debe mostrar el
      despliegue nuevo y «Es la última versión publicada». Si avisa de una más
      reciente, pulsar Recargar.

## 3) Regresión manual en iPhone (Safari)
Prioriza lo que toque el cambio.
- [ ] Arranque: el contador llega al final y el editor responde.
- [ ] Barra inferior: Nodos, Historial, Ejecutar todo, Resultados, Proyecto.
- [ ] Añadir nodos (catálogo, búsqueda rápida), conectar, insertar en una conexión.
- [ ] Ejecutar todo: monitor, contadores en los nodos, resumen en el log.
- [ ] Ejecutar hasta un nodo: resultado en tabla y mapa.
- [ ] Flujo con error: botón para ir al nodo y nodo marcado.
- [ ] Historial: lista, detalle con tiempos por nodo, filtro, exportar.
- [ ] Deshacer/rehacer, menú contextual, plantillas, proyecto nuevo,
      guardar/cargar `.jetl`.
- [ ] Mapa: mapa base, zoom, capas.

## 4) Formatos (cuando el cambio les afecte)
- [ ] GeoJSON, KML, CSV: leer, transformar, exportar y reabrir.
- [ ] GeoTIFF, GPKG, Parquet: según `COMPATIBILITY_MATRIX.md`; actualizar la
      matriz con lo validado.

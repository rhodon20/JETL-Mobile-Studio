# Matriz de Compatibilidad (Navegadores)

Ultima actualizacion: 2026-10-18  
Alcance: la app en general y los formatos complejos `GeoTIFF`, `GPKG`, `Parquet`.

## App (arranque, editor, ejecución, historial)
| Entorno | Estado | Notas |
|---|---|---|
| Chromium (CI, Playwright) | OK | `npm test` y pruebas contra `dist/` en cada push. |
| iOS Safari (iPhone) | OK | Validado por el usuario en octubre de 2026 tras cada fase: arranque, añadir/conectar nodos, ejecutar (incluido OSM Reader), historial, panel de versión. |
| Safari < 16.4 | PARCIAL (simulado) | Sin *import maps*: funciona, pero los módulos importados se descargan sin versión de caché. |
| Sin conexión | OK (Chromium, CI) | Service worker en el sitio desplegado: abre y ejecuta flujos sin red (smoke estable sin red en CI). Sin mapa base ni lectores de red. Pendiente validar en iPhone y Android. |

## Leyenda
- `OK`: flujo validado manualmente en navegador.
- `PARCIAL`: funciona con limitaciones.
- `EXP`: experimental / sin garantia.
- `PEND`: pendiente de validar.

## Lectura (Reader)
| Formato | Chrome (desktop) | Edge (desktop) | Firefox (desktop) | Safari (desktop) | Android Chrome | iOS Safari | Notas |
|---|---|---|---|---|---|---|---|
| GeoTIFF | OK | OK | OK | PARCIAL | OK | PARCIAL | Datasets muy grandes pueden degradar memoria/tiempo. |
| GPKG | EXP | EXP | EXP | PEND | PEND | PEND | Depende de libreria WASM/SQLite en cliente. |
| Parquet | EXP | EXP | EXP | PEND | PEND | PEND | Dependencia WASM Arrow/Parquet; validar limites de RAM. |

## Escritura (Writer)
| Formato | Chrome (desktop) | Edge (desktop) | Firefox (desktop) | Safari (desktop) | Android Chrome | iOS Safari | Notas |
|---|---|---|---|---|---|---|---|
| GeoTIFF | N/A | N/A | N/A | N/A | N/A | N/A | No writer GeoTIFF en JETL actual. |
| GPKG | EXP | EXP | EXP | PEND | PEND | PEND | Export experimental; validar apertura en QGIS/FME. |
| Parquet | EXP | EXP | EXP | PEND | PEND | PEND | Export experimental; revisar schema/tipos. |

## Casos de prueba estandar por formato
1. Cargar archivo de muestra pequeno (100-1k features o raster pequeno).
2. Ejecutar transformador simple intermedio (`attr_creator` o `geo_buffer`).
3. Visualizar en mapa y tabla.
4. Exportar (si aplica) y reabrir archivo exportado.
5. Verificar que el log no muestra errores; `npm test` cubre la regresión general.

## Criterios para subir de EXP a OK
1. Validacion en Chrome + Edge + Firefox desktop.
2. Sin errores en 3 ejecuciones consecutivas.
3. Archivo exportado legible en herramienta externa (QGIS como minimo).
4. Sin bloqueo de UI ni fugas evidentes de memoria.


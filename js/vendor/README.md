# Librerías de formatos

Se cargan sólo cuando se usan (lector o escritor del formato) y el service worker
las guarda, así que después funcionan sin conexión. Se copian tal cual de npm; para
actualizarlas, cambia el archivo y ejecuta `node tests/formats-io.mjs`.

| Archivo | Paquete npm | Licencia | Uso |
|---|---|---|---|
| `geopackage.min.js` | `@ngageoint/geopackage@3.0.0` (`dist/geopackage.min.js`) | MIT | Leer y escribir GeoPackage (global `geopackage`) |
| `parquet-wasm/parquet_wasm.js`, `parquet_wasm_bg.wasm` | `parquet-wasm@0.6.1` (`esm/`) | MIT o Apache-2.0 | Parquet ↔ Arrow IPC (módulo ES) |
| `arrow.es2015.min.js` | `apache-arrow@21.2.0` (`Arrow.es2015.min.js`) | Apache-2.0 | Tablas Arrow (global `Arrow`); desde la 15 entiende `LargeUtf8`/`LargeBinary` de pandas, GeoPandas o DuckDB |
| `xlsx.full.min.js` | `xlsx@0.18.5` (`dist/xlsx.full.min.js`) | Apache-2.0 | Leer y escribir Excel (global `XLSX`) |
| `shpwrite.js` | `@mapbox/shp-write@0.4.3` (`shpwrite.js`) | BSD-2-Clause | Escribir Shapefile en ZIP (global `shpwrite`) |

"""Genera los archivos de ejemplo de tests/formats-io.mjs: tres ciudades en cada formato.

Uso: python3 tests/fixtures/formats/make-fixtures.py  (necesita pyarrow, openpyxl y pyshp)
"""
import datetime, decimal, json, os, sqlite3, struct, zipfile

import openpyxl
import pyarrow as pa
import pyarrow.parquet as pq
import shapefile

HERE = os.path.dirname(os.path.abspath(__file__))
CITIES = [('Madrid', -3.70, 40.42, 3300000), ('Sevilla', -5.98, 37.39, 680000), ('Valladolid', -4.72, 41.65, 300000)]
WGS84_WKT = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
UTM30_WKT = ('PROJCS["ETRS89 / UTM zone 30N",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",'
             'SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],'
             'PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-3],'
             'PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1]]')


def path(name):
    return os.path.join(HERE, name)


def wkb_point(x, y):
    return struct.pack('<bIdd', 1, 1, x, y)


def geopackage(name, tables):
    """GeoPackage mínimo conforme a la norma. tables: [(tabla, srs_id, srs_name, srs_wkt, puntos)]."""
    if os.path.exists(path(name)):
        os.remove(path(name))
    db = sqlite3.connect(path(name))
    db.execute('PRAGMA application_id=1196444487')
    db.execute('PRAGMA user_version=10300')
    db.executescript("""
    CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL,
      organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
    CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE,
      description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER);
    CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL,
      srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL, CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name));
    """)
    db.executemany('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,NULL)', [
        ('Undefined cartesian', -1, 'NONE', -1, 'undefined'), ('Undefined geographic', 0, 'NONE', 0, 'undefined'),
        ('WGS 84', 4326, 'EPSG', 4326, WGS84_WKT)])
    for table, srs_id, srs_name, srs_wkt, points in tables:
        if srs_id != 4326:
            db.execute('INSERT OR IGNORE INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,NULL)', (srs_name, srs_id, 'EPSG', srs_id, srs_wkt))
        db.execute(f'CREATE TABLE {table} (fid INTEGER PRIMARY KEY AUTOINCREMENT, geom POINT, nombre TEXT, poblacion INTEGER)')
        db.execute("INSERT INTO gpkg_contents (table_name,data_type,identifier,srs_id) VALUES (?,'features',?,?)", (table, table, srs_id))
        db.execute("INSERT INTO gpkg_geometry_columns VALUES (?,'geom','POINT',?,0,0)", (table, srs_id))
        for nombre, x, y, poblacion in points:
            header = b'GP' + bytes([0, 1]) + struct.pack('<i', srs_id)  # versión 0, little endian, sin envolvente
            db.execute(f'INSERT INTO {table} (geom,nombre,poblacion) VALUES (?,?,?)', (header + wkb_point(x, y), nombre, poblacion))
    db.commit()
    db.close()


MADRID_UTM = [('Madrid', 440300, 4474500, 3300000)]
geopackage('ciudades.gpkg', [('ciudades', 4326, 'WGS 84', WGS84_WKT, CITIES)])
geopackage('madrid_25830.gpkg', [('ciudades', 25830, 'ETRS89 / UTM zone 30N', UTM30_WKT, MADRID_UTM)])
# Dos tablas en sistemas distintos: una salida por tabla y todo pasado a EPSG:4326.
geopackage('varias_tablas.gpkg', [('ciudades', 4326, 'WGS 84', WGS84_WKT, CITIES),
                                  ('madrid_utm', 25830, 'ETRS89 / UTM zone 30N', UTM30_WKT, MADRID_UTM)])

# GeoParquet 1.1 estándar (geometría WKB y metadatos «geo»), Parquet con WKT y Parquet sin geometría.
names = [c[0] for c in CITIES]
population = pa.array([c[3] for c in CITIES], pa.int64())
geoparquet = pa.table({'nombre': names, 'poblacion': population, 'geometry': [wkb_point(c[1], c[2]) for c in CITIES]})
geo = {'version': '1.1.0', 'primary_column': 'geometry', 'columns': {'geometry': {'encoding': 'WKB', 'geometry_types': ['Point']}}}
pq.write_table(geoparquet.replace_schema_metadata({b'geo': json.dumps(geo).encode()}), path('ciudades.geoparquet.parquet'))
pq.write_table(pa.table({'nombre': names, 'poblacion': population, 'geometry': [f'POINT ({c[1]} {c[2]})' for c in CITIES]}), path('ciudades_wkt.parquet'))
pq.write_table(pa.table({'nombre': names, 'poblacion': population}), path('tabla.parquet'))
# Tipos que generan pandas, GeoPandas o DuckDB: texto y binario «large», diccionario, fechas, decimal, listas...
geo_large = {'version': '1.1.0', 'primary_column': 'geometry', 'columns': {'geometry': {'encoding': 'WKB', 'geometry_types': ['Point']}}}
varied = pa.table({
    'nombre': pa.array(names, pa.large_string()),
    'provincia': pa.array(names).dictionary_encode(),
    'poblacion': pa.array([c[3] for c in CITIES], pa.uint64()),
    'rango': pa.array([1, 2, 3], pa.int8()),
    'densidad': pa.array([5390.5, 4900.25, 1500.0], pa.float32()),
    'capital': pa.array([True, False, False]),
    'fundacion': pa.array([datetime.date(852, 1, 1), datetime.date(712, 1, 1), datetime.date(1072, 1, 1)], pa.date32()),
    'actualizado': pa.array([datetime.datetime(2026, 10, 21, 12, 0, tzinfo=datetime.timezone.utc)] * 3, pa.timestamp('us', tz='UTC')),
    'superficie': pa.array([decimal.Decimal('604.45'), decimal.Decimal('140.80'), decimal.Decimal('197.91')], pa.decimal128(10, 2)),
    'barrios': pa.array([[1, 2], [3], []], pa.list_(pa.int32())),
    'centro': pa.array([{'x': c[1], 'y': c[2]} for c in CITIES]),
    'vacia': pa.array([None, None, None], pa.null()),
    'geometry': pa.array([wkb_point(c[1], c[2]) for c in CITIES], pa.large_binary()),
})
pq.write_table(varied.replace_schema_metadata({b'geo': json.dumps(geo_large).encode()}), path('tipos_variados.parquet'))

json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [x, y]},
           'properties': {'nombre': n, 'poblacion': p}} for n, x, y, p in CITIES]}, open(path('ciudades.geojson'), 'w'))
open(path('ciudades.kml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>' + ''.join(
    f'<Placemark><name>{n}</name><ExtendedData><Data name="poblacion"><value>{p}</value></Data></ExtendedData>'
    f'<Point><coordinates>{x},{y}</coordinates></Point></Placemark>' for n, x, y, p in CITIES) + '</Document></kml>')
open(path('ciudades.gpx'), 'w').write('<?xml version="1.0"?><gpx version="1.1" creator="jetl" xmlns="http://www.topografix.com/GPX/1/1">' + ''.join(
    f'<wpt lat="{y}" lon="{x}"><name>{n}</name></wpt>' for n, x, y, p in CITIES) + '</gpx>')
open(path('ciudades_latlon.csv'), 'w').write('nombre;lat;lon;poblacion\n' + ''.join(f'{n};{y};{x};{p}\n' for n, x, y, p in CITIES))
open(path('ciudades_wkt.csv'), 'w').write('nombre,poblacion,wkt\n' + ''.join(f'{n},{p},"POINT ({x} {y})"\n' for n, x, y, p in CITIES))

book = openpyxl.Workbook()
sheet = book.active
sheet.append(['nombre', 'lat', 'lon', 'poblacion'])
for n, x, y, p in CITIES:
    sheet.append([n, y, x, p])
book.save(path('ciudades.xlsx'))

base = path('ciudades')
writer = shapefile.Writer(base, shapeType=shapefile.POINT)
writer.field('nombre', 'C')
writer.field('poblacion', 'N')
for n, x, y, p in CITIES:
    writer.point(x, y)
    writer.record(n, p)
writer.close()
open(base + '.prj', 'w').write(WGS84_WKT)
with zipfile.ZipFile(path('ciudades.shp.zip'), 'w') as archive:
    for ext in ('shp', 'shx', 'dbf', 'prj'):
        archive.write(f'{base}.{ext}', f'ciudades.{ext}')
        os.remove(f'{base}.{ext}')
print('ok')

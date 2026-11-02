# Revisión de nodos

Posibles fallos encontrados al leer el código de cada nodo para escribir su ayuda
(2 de noviembre de 2026). Son sospechas a comprobar, no fallos confirmados: sirven de
punto de partida para probar cada nodo con datos reales. Al confirmar o descartar uno,
se anota aquí y, si se corrige, se añade una prueba que lo proteja.

Los números de línea son aproximados (el fichero cambió al traducir los nombres).

## Entradas

- [ ] **Lector GeoJSON** (`reader_geojson`, l. ~282): readerCollectionCompat crea los metadatos finales sin 'crs': el «CRS declarado» del editor (geojson/kml/csv/excel) se pierde.
- [ ] **Lector CSV** (`reader_csv`, l. ~274): same_schema sólo compara los campos de la primera entidad de cada archivo; 'union' sólo se salta esa comprobación.
- [ ] **Lector Shapefile** (`reader_shp`, l. ~395): shpjs ya reproyecta a WGS84 con el .prj, pero el «CRS de reemplazo» se escribe en metadata.crs y puede etiquetar mal (doble reproyección).
- [ ] **Lector GPX** (`reader_gpx`, l. ~405): Declara 16 salidas pero sólo usa 3 (tracks, rutas, waypoints); salidas sin nombre.
- [ ] **Lector OSM** (`reader_osm`, l. ~526): Overpass sólo pide 'way': se pierden nodos (servicios) y relaciones (multipolígonos).
- [ ] **Lector OSM** (`reader_osm`, l. ~498): Sólo se recorta el máximo (2200 m): mínimo y NaN sin validar.
- [ ] **GeoJSON desde URL** (`reader_http`, l. ~577): No comprueba r.ok ni que sea GeoJSON.
- [ ] **Texto WKT** (`reader_wkt`, l. ~579): WKT inválido crea en silencio una entidad sin geometría.
- [ ] **Crear extensión (BBox)** (`reader_bbox_gen`, l. ~581): No valida cuatro números: genera coordenadas NaN.
- [ ] **Lector GeoTIFF** (`reader_geotiff`, l. ~613): Extensión en el CRS nativo del TIFF, sin reproyectar ni guardar CRS: mal en el mapa si está proyectado.
- [ ] **Lector de archivo** (`reader_file`, l. ~543): Sin 'accept' ni aviso de formatos; un CSV da 'Formato no soportado'.
- [ ] **Crear malla** (`gen_grid`, l. ~636): Extensión fija en Madrid; opciones 'Hex'/'Square' en inglés.
- [ ] **Puntos aleatorios** (`gen_random`, l. ~638): Zona fija en Madrid; N no numérico da NaN sin validar.
- [ ] **Lector GeoPackage** (`reader_gpkg`, l. ~549): GPKG y Parquet leen al elegir el archivo: al reabrir un proyecto hay que volver a elegirlo; más de 16 tablas sólo avisa en el registro.

## Geometría

- [ ] **Construir áreas** (`geo_area_builder`, l. ~368): Todos los polígonos reciben los atributos de la primera línea de entrada.
- [ ] **Línea central** (`geo_centerline_replacer`, l. ~381): En el navegador siempre lanza error (necesita el servicio de escritorio); textos mencionan «Desktop».
- [ ] **Extruir** (`geo_extruder`, l. ~402): Con on_error='null' devuelve una colección aunque declara 2 salidas; igual en offsetter (508), rotator (574), densifier (593).
- [ ] **Extruir** (`geo_extruder`, l. ~210): Los huecos se extruyen como anillos con tapas: quedan rellenos.
- [ ] **Generalizar** (`geo_generalizer`, l. ~408): Duplicado exacto de Simplificar topología.
- [ ] **Forzar tipo de geometría** (`geo_geometry_coercer`, l. ~423): Destino 'polygon' sólo clona sin convertir; con 'line' los puntos se descartan sin aviso.
- [ ] **Construir líneas** (`geo_line_builder`, l. ~335): Ordena como texto ('10' antes que '2'); valores por defecto 'Job'/'img' de un caso concreto.
- [ ] **Buffer múltiple** (`geo_multi_bufferer`, l. ~468): En líneas paralelas ignora 'unit'; sólo conoce algunos CRS; las entidades con error se repiten por cada distancia.
- [ ] **Desplazar** (`geo_offsetter`, l. ~164): Suma en grados con EPSG:4326 (quien piense en metros mueve kilómetros).
- [ ] **Ángulo horizontal** (`geo_horizontal_angle_calculator`, l. ~532): Parámetros mode/angle_type/calculation_model sin usar; en multilíneas sólo la primera parte.
- [ ] **Rotar** (`geo_rotator`, l. ~103): Rotación plana en grados: deforma en EPSG:4326.
- [ ] **Densificar** (`geo_densifier`, l. ~117): Distancia plana en unidades del CRS: el intervalo 1 por defecto es 1 grado (~111 km).
- [ ] **Extraer medidas** (`geo_measure_extractor`, l. ~145): Lee la Z como si fuera la medida M.
- [ ] **Extraer coordenadas** (`geo_coordinate_extractor`, l. ~630): Guarda X/Y/Z como texto; índice fuera de rango se ajusta sin avisar.
- [ ] **Extraer SRC** (`geo_crs_extractor`, l. ~651): crs_name repite el código, crs_wkt siempre null; entrada vacía lanza error.
- [ ] **Envolvente** (`geo_hull_creator`, l. ~683): Exige 4 entidades; el cóncavo puede dar null y error; sale sin atributos.
- [ ] **Punto central** (`geo_centroid`, l. ~714): Media de vértices, no centro de masas.
- [ ] **Simplificar** (`geo_simplify`, l. ~727): Tolerancia 0 se convierte en 0.0001 (también topo_simplify 760).
- [ ] **Simplificar topología** (`geo_topo_simplify`, l. ~761): 'Mantener bordes límite' sólo funciona en el worker.
- [ ] **Unir líneas** (`geo_line_merge`, l. ~852): Sin entrada, turf.flatten(undefined) lanza error.
- [ ] **Reproyectar** (`geo_reproject`, l. ~999): 'if (!proj4)' lanza ReferenceError si no existe; pocas definiciones conocidas.
- [ ] **Reparar geometría** (`geo_repair`, l. ~1046): Resultado distinto con o sin worker (aplana multipartes en local).
- [ ] **Trocear líneas** (`geo_chunk`, l. ~1076): Longitud vacía da NaN en el cálculo local.
- [ ] **Disolver** (`geo_dissolve`, l. ~1199): El resultado sale sin atributos, ni los de agrupación; sólo admite polígonos; sin entrada lanza TypeError (también vertex_creator 1258).
- [ ] **Crear vértices** (`geo_vertex_creator`, l. ~1305): Dangles sin atributos y sin Z; inicio/fin no generan nada con puntos; opciones en inglés.
- [ ] **Cerrar líneas** (`geo_line_closer`, l. ~1421): Prácticamente igual que Línea a polígono.
- [ ] **Punto interior** (`geo_point_surf`, l. ~1591): Sin worker no conserva atributos.
- [ ] **Rectángulo envolvente** (`geo_bbox`, l. ~1612): Sin worker no conserva atributos.
- [ ] **Polígonos de Voronoi** (`geo_voronoi`, l. ~1669): Al filtrar celdas vacías, los atributos se desplazan a celdas equivocadas.
- [ ] **Buffer** (`geo_buffer`, l. ~1696): 'Estilo Borde' no se usa; entrada vacía lanza error; con unión, sin atributos.
- [ ] **Relleno aleatorio** (`geo_random_fill`, l. ~1757): Valor por defecto 10 en run vs 50 en la plantilla; puede generar menos puntos sin avisar.

## Superposición y análisis espacial

- [ ] **Ajustar a referencia** (`sp_anchored_snapper`, l. ~210): snapping_type y group_by no se usan; salida 3 siempre vacía; orden de entradas invertido respecto a Ajustar.
- [ ] **Buscar vecinos** (`sp_neighbor_finder`, l. ~241): distance_factor no se usa.
- [ ] **Relación espacial** (`sp_spatial_relator`, l. ~187): Añade siempre Join_Count y TARGET_FID; con 15000+ objetos lanza error si no hay servidor.
- [ ] **Punto sobre punto** (`sp_point_point_overlayer`, l. ~27): Entrada 2 vacía lanza error en todos los nodos de superposición (debería mandar todo a la salida 2).
- [ ] **Área sobre área** (`sp_area_area_overlayer`, l. ~78): Las partes sin solape de un polígono parcialmente solapado se pierden.
- [ ] **Quitar quiebros** (`geo_kink_remover`, l. ~373): El 'umbral en grados' es una tolerancia de simplificación (≈28 m con 5), no un ángulo; flatten separa multipartes.
- [ ] **Calcular ángulos** (`geo_angle_calculator`, l. ~489): _parent_id es el índice tras separar partes.
- [ ] **Fusionar áreas pequeñas** (`sp_min_area_solver`, l. ~597): Los polígonos fusionados (salida 2) pierden los atributos.
- [ ] **Ajustar** (`geo_snap`, l. ~631): Salidas 2 y 3 siempre vacías aunque la plantilla las anuncia.
- [ ] **Filtro espacial** (`sp_spatial_filter`, l. ~723): 'disjoint' mal en el worker; no ofrece 'intersects'.
- [ ] **Unión espacial** (`sp_spatial_join`, l. ~899): En modo Left los sin coincidencia salen en las dos salidas.
- [ ] **Vecino más cercano** (`sp_nearest_neighbor`, l. ~992): Campo _neighbor_id en local y _neighbor_idx en el worker; ventana de búsqueda mala a latitudes altas.
- [ ] **Intersectar** (`sp_intersector`, l. ~1022): Entradas mixtas línea/polígono mal tratadas; en polígonos la salida 2 siempre vacía.
- [ ] **Recortar** (`sp_clip`, l. ~1145): El worker nunca se usa (formato distinto); puntos y líneas que tocan la máscara van enteros fuera; la máscara se simplifica ~1 m.

## Atributos

- [ ] **Estadísticas** (`attr_stats`, l. ~500): El camino local modifica los elementos de entrada (los del nodo anterior); con «Rechazar» y ningún número lanza error.
- [ ] **Renombrar campos** (`attr_renamer`, l. ~588): El camino local modifica la entrada; un fallo en el 2º par deja el 1º ya renombrado.
- [ ] **Mantener campos** (`attr_keeper`, l. ~621): Rama 'reject' muerta (sin interfaz, out:1); sin campos coincidentes sale con todos los atributos.
- [ ] **Crear campos** (`attr_creator`, l. ~687): Rama 'reject' muerta; si una creación falla, las siguientes se omiten; tipos distintos local/worker.
- [ ] **Contador** (`attr_counter`, l. ~745): Valor inicial 0 se convierte en 1; local falla con properties null; campo vacío crea la clave ''.
- [ ] **Ordenar** (`attr_sorter`, l. ~820): Nulos primero (comentario dice al final); 0 y false se tratan como vacíos; falla con properties null.
- [ ] **Agrupar** (`attr_aggregator`, l. ~922): Sin múltiples ni descartar geometría, sólo se conserva la del primer elemento.
- [ ] **Gestor de campos** (`attr_manager_v2`, l. ~1001): Un error de conversión de tipo hace fallar todo el nodo.
- [ ] **Reemplazar texto** (`attr_string_replacer`, l. ~96): 'buscar' vacío aplica la acción de sin coincidencia; regex inválida hace fallar el nodo.
- [ ] **Formatear texto** (`attr_string_formatter`, l. ~1183): Plantilla con nombres de campo sin escapar en RegExp; un error vacía todos los campos objetivo.
- [ ] **Combinar entidades** (`attr_feature_merger`, l. ~1263): Claves 0/''/false = nulo en local pero no en el worker; sólo valida el primer par; falla sin entrada 2.
- [ ] **Unir por atributo** (`attr_join_adv`, l. ~1375): Worker 1:1 sin salida 3 vs local 1:N; prefijo vacío no permitido; en modo izquierda duplica en salidas 1 y 2.
- [ ] **Calculadora de campos** (`attr_calc_pro`, l. ~6): La lista de bloqueo impide campos como props["constructor_id"].
- [ ] **Calcular área** (`attr_area`, l. ~1542): El resultado del worker siempre se descarta (calcula dos veces); 4 decimales en km² da 0 en áreas pequeñas.
- [ ] **Buscar coincidencias** (`attr_matcher`, l. ~1734): Camino local falla con properties null en campos concretos.

## Utilidades

- [ ] **Petición REST** (`util_rest_request`, l. ~95): URL base vacía lanza 'Invalid URL' sin traducir.
- [ ] **Petición HTTP** (`util_http_caller`, l. ~82): Una sola petición con la primera entidad, no una por entidad.
- [ ] **Petición HTTP** (`util_http_caller`, l. ~19): auth 'oauth2' es código muerto (el editor no lo ofrece).
- [ ] **Petición HTTP** (`util_http_caller`, l. ~1): privacy.html no cubre los nodos de petición web (HTTP/REST/GraphQL) ni el servidor de JETL.
- [ ] **Filtrar por geometría** (`util_filter_geo`, l. ~130): turf.getType falla con entidades sin geometría; GeometryCollection va a puntos; etiquetas en inglés.
- [ ] **Muestra aleatoria** (`util_sampler`, l. ~236): Aleatorio con sort(() => 0.5 - Math.random()) sesgado; N negativo inesperado; parámetros sin resolver.

## Ráster

- [ ] **Muestrear bandas** (`sp_point_sampling`, l. ~165): No reproyecta: falla si el ráster no está en EPSG:4326.
- [ ] **Estadística zonal** (`sp_zonal_stats`, l. ~266): Sólo la primera banda; no reproyecta los polígonos.

## Exportar

- [ ] **Exportar GeoPackage** (`writer_gpkg`, l. ~93): createObjectURL no se libera (también writer_parquet 106).
- [ ] **Exportar Excel** (`writer_xlsx`, l. ~140): Nombre de hoja sin resolver parámetros ni limpiar caracteres prohibidos por Excel.
- [ ] **WKT en consola** (`writer_wkt`, l. ~148): Falla sin entrada y no maneja entidades sin geometría.
- [ ] **writer_gdb** (`writer_gdb`, l. ~119): Si la primera entrada está vacía pero hay otras, el dato principal es undefined.

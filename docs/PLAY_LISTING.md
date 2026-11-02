# Ficha de JETL Studio en Google Play

Textos y respuestas para Play Console. Las capturas, el gráfico destacado y el
icono salen del workflow **Store assets** (ver `docs/ANDROID.md`).

## Detalles de la aplicación

- **Nombre** (máx. 30): `JETL Studio`
- **Descripción breve** (máx. 80):
  `Crea flujos ETL geoespaciales en tu móvil, también sin conexión.`
- **Descripción completa** (máx. 4000):

```
JETL Studio es un constructor visual de flujos ETL geoespaciales pensado para el móvil. Encadena nodos para leer, transformar y exportar datos geográficos, y mira el resultado al momento en el mapa o en la tabla.

Todo se procesa en tu dispositivo: tus archivos no se suben a ningún servidor, no hay cuentas ni publicidad, y la app funciona también sin conexión.

QUÉ PUEDES HACER
• Leer GeoJSON, KML, GPX, Shapefile, CSV, Excel, GeoPackage, Parquet, GeoTIFF y WKT, o descargar datos de OpenStreetMap y de una URL.
• Transformar geometrías: buffer, centroides, Voronoi, disolver, simplificar, reproyectar, recortar y muchas más.
• Trabajar con atributos: crear, renombrar, calcular áreas y longitudes, filtrar, ordenar y agregar.
• Cruzar capas con operaciones espaciales y de superposición.
• Exportar a GeoJSON, KML, CSV, Excel, Shapefile, GeoPackage y Parquet.

PENSADO PARA LA PANTALLA TÁCTIL
• Los nodos se encadenan hacia abajo, a la medida de una pantalla vertical.
• Botón de Acciones que cambia según lo que tengas seleccionado: ejecutar, ver el resultado, duplicar, anotar…
• Selección múltiple, ajuste a la cuadrícula, notas en el lienzo y validación del flujo antes de ejecutarlo.
• Mapa y tabla enlazados: toca una fila y el mapa te lleva a esa entidad.

TU TRABAJO, A SALVO
• El borrador se guarda solo y la app te ofrece recuperarlo al volver.
• Historial de ejecuciones con duración, entidades y errores de cada nodo.
• Proyectos .jetl para guardar y compartir tus flujos.

JETL Studio es la versión móvil de JETL Desktop.
```

- **Categoría**: Productividad (alternativa: Herramientas)
- **Etiquetas**: mapas, SIG, GIS, datos, ETL
- **Correo de contacto**: el que quieras hacer público (la política de privacidad
  remite a él).
- **Sitio web**: `https://jetl-studio.javierlorenzom93.workers.dev`
- **Política de privacidad**: `https://jetl-studio.javierlorenzom93.workers.dev/privacy.html`

## Contenido de la aplicación (formularios)

- **Acceso a la aplicación**: toda la funcionalidad está disponible sin
  restricciones (no hay inicio de sesión).
- **Anuncios**: no contiene anuncios.
- **Clasificación de contenido**: categoría *Utilidad, productividad,
  comunicación u otros*; responder «No» a violencia, sexo, lenguaje, drogas,
  apuestas, interacción entre usuarios, compras y ubicación.
- **Público objetivo**: mayores de 18 (es una herramienta profesional; evita
  los requisitos de apps para menores).
- **Seguridad de los datos**:
  - ¿Recoge o comparte datos de usuario? **No**.
  - Los datos se procesan sólo en el dispositivo; las peticiones a servicios
    de mapas (OpenFreeMap, OpenStreetMap, Nominatim, Overpass) no los
    recogen para la app, así que no se declaran como recogidos.
  - ¿Cifrado en tránsito? Sí (HTTPS).
  - ¿Se pueden eliminar los datos? No aplica: no se recogen (lo local se borra
    desde la app o borrando los datos de la aplicación).
- **Aplicación de noticias / sanitaria / financiera / gubernamental**: No.
- **Funciones de seguridad (ID de publicidad)**: no usa el ID de publicidad.

## Cuestionario de acceso a producción (borrador)

Al pulsar «Solicitar acceso a producción» (tras 14 días seguidos con 12 testers o
más en la prueba cerrada), Google pregunta por la prueba. Borrador preparado el 2 de
noviembre de 2026; las preguntas exactas pueden variar: comprobar con «Vista previa
de las preguntas» y responder con detalles concretos (Google desconfía de las
respuestas genéricas). Sólo cuenta Android: no mencionar iPhone ni iPad.

**Sobre la prueba**

- **¿Cómo conseguiste testers?** Contactos personales y profesionales del sector SIG
  y comunidades de desarrolladores que se prueban las apps entre sí. Los testers se
  unían a un Google Group y aceptaban la prueba desde el enlace de participación.
- **¿Fue fácil?** Al principio costó: parte de la gente desconfiaba de dar su correo.
  Usar un Google Group, al que cada uno se apunta por su cuenta, lo resolvió.
- **¿Cómo se usó la app y qué comentarios recibiste?** Los testers crearon flujos,
  leyeron archivos GeoPackage y Parquet y vieron los resultados en el mapa, en móvil y
  en tablet. Los comentarios llegaron por correo y mensajería: lectores que no leían a
  la primera, capas que no se veían tras un geoproceso, mapa lento con archivos
  grandes e interfaz poco adaptada a tablet y al móvil en horizontal.

**Sobre los cambios**

Durante la prueba se publicaron correcciones casi a diario:

- lectura de GeoPackage (todas las tablas, una salida por tabla) y de Parquet;
- los datos se pasan a EPSG:4326 al leerlos, para que los geoprocesos y el mapa
  funcionen bien;
- visor con MapLibre (WebGL), que mueve cientos de miles de entidades con fluidez;
- color por capa en el mapa;
- interfaz adaptada a tablet y al móvil en horizontal;
- alojamiento cambiado para evitar bloqueos de red puntuales.

**Sobre la app y su público**

- **¿Para quién es?** Profesionales y estudiantes de SIG, topografía e ingeniería que
  necesitan transformar datos geoespaciales desde el móvil o la tablet, también sin
  conexión. Gratuita, sin anuncios y sin recogida de datos.
- **¿Qué aporta?** Permite construir flujos ETL geoespaciales de forma visual y sin
  servidor: todo se procesa en el dispositivo y los datos del usuario no salen de él.
- **Instalaciones previstas el primer año:** una cifra prudente, p. ej. 100–1.000.

**¿Cómo sabes que está lista?** Todos los fallos que encontraron los testers están
corregidos y cubiertos por pruebas automáticas que se ejecutan antes de cada
publicación. Se ha usado en Android de distintos tamaños, en vertical y en
horizontal, sin cierres inesperados.

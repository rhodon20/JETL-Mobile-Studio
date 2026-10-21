# App de Android (Google Play)

La app de Android es una **Trusted Web Activity (TWA)**: un envoltorio mínimo que
abre la web publicada en Cloudflare (`https://jetl-studio.javierlorenzom93.workers.dev`)
a pantalla completa con Chrome. La app no lleva el código de JETL Studio: cada
despliegue de la web llega a los usuarios sin publicar una versión nueva en Play.

| Dato | Valor |
| --- | --- |
| Paquete | `es.jetljlm.studio` (no se puede cambiar una vez publicado) |
| Proyecto | `android/`, generado con Bubblewrap 1.27.0 a partir de `manifest.json` |
| Configuración | `android/twa-manifest.json` (fuente de verdad del envoltorio) |
| Compilación | `.github/workflows/android.yml` → artefacto `jetl-studio-android` |
| Verificación de dominio | `.well-known/assetlinks.json`, publicado por el build |

## Cuándo hay que recompilar la app

Sólo cuando cambia el envoltorio: nombre, iconos, colores, accesos directos,
dominio o versión de Android de destino. Entonces:

1. Sube `appVersionCode` (y `appVersionName`) en `android/twa-manifest.json`.
   Play rechaza un `versionCode` repetido.
2. Regenera el proyecto: `cd android && npx @bubblewrap/cli@1.27.0 update`
   (necesita JDK 17 y el SDK de Android; Bubblewrap los instala si faltan).
3. Al subir los cambios, el workflow compila `jetl-studio.aab` (para Play) y
   `jetl-studio.apk` (para instalarla directamente en un móvil de prueba).

## Firma

- La **clave de subida** firma lo que se sube a Play. Vive sólo en los secretos
  del repositorio `ANDROID_UPLOAD_KEYSTORE_B64` (el `.jks` en base64) y
  `ANDROID_UPLOAD_KEYSTORE_PASSWORD` (alias `upload`, misma contraseña para el
  almacén y la clave). Nunca en el repositorio (`android/.gitignore`).
- Google Play vuelve a firmar la app con su **clave de firma de la app**
  (Play App Signing). Si se pierde la clave de subida, se puede pedir a Google
  que la sustituya; la de la app no se pierde porque la guarda Google.
- Sin los secretos, el workflow publica el `.aab` y el `.apk` sin firmar: sirve
  para comprobar que el proyecto compila, no para subirlo.

## Verificación de dominio (`assetlinks.json`)

Android sólo abre la app sin barra de direcciones si el dominio publica la
huella SHA-256 del certificado que firma la app instalada. `assetlinks.json`
debe llevar:

- la huella de la **clave de subida** (para el `.apk` instalado a mano), y
- la huella de la **clave de firma de la app** de Play (Play Console →
  *Probar y publicar* → *Configuración* → *Integridad de la app* → *Firma de
  aplicaciones*), en cuanto Play la genere tras la primera subida.

Si falta la huella correcta, la app funciona, pero con una barra de navegador
arriba. `tests/pwa-assets.test.mjs` comprueba que paquete, dominio y accesos
directos coinciden entre la web, `twa-manifest.json` y `assetlinks.json`, y el
paso *Verify the live site* de la CI comprueba que se publica.

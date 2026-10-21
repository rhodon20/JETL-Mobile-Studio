import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const index = readFileSync(new URL('index.html', root), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));

// Ancho y alto de un PNG (cabecera IHDR).
function pngSize(file) {
    const bytes = readFileSync(new URL(file, root));
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${file} no es un PNG`);
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test('el manifiesto declara iconos PNG que existen con su tamaño, incluido uno maskable', () => {
    for (const icon of manifest.icons) {
        assert.ok(existsSync(new URL(icon.src, root)), `falta ${icon.src}`);
        if (icon.type === 'image/png') assert.deepEqual(pngSize(icon.src), icon.sizes.split('x').map(Number), icon.src);
    }
    assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable' && icon.sizes === '512x512'));
});

test('iOS tiene icono de inicio y una pantalla de arranque del tamaño exacto de cada iPhone', () => {
    const touchIcon = index.match(/<link rel="apple-touch-icon" href="([^"]+)">/)?.[1];
    assert.ok(touchIcon, 'falta apple-touch-icon');
    assert.deepEqual(pngSize(touchIcon), [180, 180]);
    const startup = [...index.matchAll(/<link rel="apple-touch-startup-image" media="\(device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\)[^"]*" href="([^"]+)">/g)];
    assert.ok(startup.length >= 10, 'faltan pantallas de arranque');
    for (const [, width, height, ratio, file] of startup) {
        assert.deepEqual(pngSize(file), [width * ratio, height * ratio], file);
    }
});

test('cada acceso directo del manifiesto abre una acción que la app atiende, con icono PNG', () => {
    const launch = readFileSync(new URL('js/ui/launchActions.js', root), 'utf8');
    const handled = [...launch.matchAll(/^    (\w+): \(\) =>/gm)].map((m) => m[1]);
    assert.ok(manifest.shortcuts.length > 0 && manifest.shortcuts.length <= 4, 'Android muestra como mucho 4');
    for (const shortcut of manifest.shortcuts) {
        const action = new URL(shortcut.url, 'https://x/').searchParams.get('action');
        assert.ok(handled.includes(action), `${shortcut.name}: acción ${action} sin atender`);
        for (const icon of shortcut.icons) assert.deepEqual(pngSize(icon.src), icon.sizes.split('x').map(Number));
    }
});

test('la política de privacidad existe y se publica', () => {
    const privacy = readFileSync(new URL('privacy.html', root), 'utf8');
    assert.match(privacy, /<title>Privacidad · JETL Studio<\/title>/);
    for (const host of ['openfreemap.org', 'nominatim.openstreetmap.org', 'overpass-api.de', 'unpkg.com', 'jsdelivr.com']) {
        assert.ok(privacy.includes(host), `la política debe mencionar ${host}`);
    }
    assert.match(readFileSync(new URL('scripts/build.mjs', root), 'utf8'), /'privacy\.html'/);
});

test('la app Android (TWA) y la verificación de dominio coinciden con la web publicada', () => {
    const twa = JSON.parse(readFileSync(new URL('android/twa-manifest.json', root), 'utf8'));
    const [links] = JSON.parse(readFileSync(new URL('.well-known/assetlinks.json', root), 'utf8'));
    assert.equal(twa.packageId, 'es.jetljlm.studio', 'el paquete de Play no se puede cambiar una vez publicado');
    assert.equal(links.target.package_name, twa.packageId);
    assert.ok(links.target.sha256_cert_fingerprints.length > 0);
    for (const fingerprint of links.target.sha256_cert_fingerprints) assert.match(fingerprint, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    assert.equal(new URL(twa.webManifestUrl).host, twa.host);
    assert.equal(twa.startUrl, `/${manifest.start_url.replace(/^\.\//, '')}`);
    assert.deepEqual(twa.shortcuts.map((s) => new URL(s.url).search), manifest.shortcuts.map((s) => new URL(s.url, 'https://x/').search));
    const gradle = readFileSync(new URL('android/app/build.gradle', root), 'utf8');
    assert.ok(gradle.includes(`hostName: '${twa.host}'`) && gradle.includes(`applicationId "${twa.packageId}"`), 'build.gradle desactualizado: regenerar con bubblewrap update');
    assert.ok(!/127\.0\.0\.1|localhost/.test(gradle), 'build.gradle apunta a un servidor local');
    // androidbrowserhelper exige Android 7.0 (API 24); con menos no compila.
    assert.ok(twa.minSdkVersion >= 24 && gradle.includes(`minSdkVersion ${twa.minSdkVersion}`), 'minSdkVersion distinto en twa-manifest.json y build.gradle');
});

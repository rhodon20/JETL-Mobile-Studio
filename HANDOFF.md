# HANDOFF - Cómo retomar el trabajo

Última actualización: 2026-10-18

## 1) Leer primero
1. `README.md`: qué es, cómo se ejecuta y la estructura en capas.
2. `ROADMAP.md`: estado actual, próximos pasos y deuda conocida.
3. `TESTING.md`: qué prueba cada cosa y cómo escribir pruebas.

## 2) Comprobar el estado

```sh
npm ci
npm test                 # debe estar todo en verde
npm run test:extended
```

En el dispositivo, pulsar «JETL Studio» en la cabecera de
https://rhodon20.github.io/JETL-Mobile-Studio/ muestra el despliegue que se está
viendo y si es el último.

## 3) Forma de trabajar acordada
- Desarrollar en una rama, con commits pequeños y descriptivos; publicar es
  llevar `main` al commit cuando el CI de la rama está en verde (el CI de `main`
  despliega). Ver `RELEASE_CHECKLIST.md`.
- Analizar antes de modificar; cambios quirúrgicos; no mezclar refactorización
  con funcionalidad. Los problemas que se detecten fuera del alcance se anotan
  (`ROADMAP.md` > Deuda conocida), no se corrigen a escondidas.
- Medir antes de optimizar (`tests/boot-timing.mjs` para el arranque).
- Los cambios de arranque, carga de módulos o interfaz móvil se validan en un
  iPhone real además de en CI: Safari es el entorno que más ha fallado.

## 4) Trampas conocidas
- `index.html` incrusta archivos de `js/` y `css/`: editar los archivos y
  ejecutar `npm run inline`.
- Un módulo ES no puede tener a la vez etiqueta `<script>` e `import` (se
  ejecutaría dos veces); el build lo rechaza y `app-flow` lo detecta.
- Los módulos bajo demanda (`visualization`, `schemaUI`, `modalSystem`,
  `templates`, `packages`) no se importan de forma estática: dejarían de ser
  diferidos. Lo que usan otros archivos lo publican en `window`.
- Los nodos (`js/nodes/*.js`) se cargan en las pruebas unitarias como scripts:
  sin `import`/`export`.
- El service worker está retirado a propósito (`sw.js` se desregistra) hasta el
  bloque de modo sin conexión.

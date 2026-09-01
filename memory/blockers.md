# Blockers / Gotchas — cosas que ya costaron tiempo (leer antes de tocar)

## B1. El nombre de un gear es ambiguo → SIEMPRE preguntar
Cuando Gabriel pide agrandar/cambiar un gear por su nombre (ej. "el CrimsonAttack"), preguntar si se refiere al **avión (gear)**, la **bala estándar** o el **misil**. Ya pasó: se agrandó la bala (0.75) cuando quería el avión. Aclaración de Gabriel: "el gear, el misil ya está grande" → el avión.

## B2. La bala estándar del CrimsonAttack debe quedar en radio 0.5 (por ahora)
Por la aclaración de Gabriel, la STD del CrimsonAttack quedó en `SphereGeometry(0.5,...)` (línea ~4369). NO volver a poner 0.75 sin confirmar. El misil "ya está grande".

## B3. El avión del CrimsonAttack se escala en DOS puntos, no uno
Para agrandar SOLO el avión del gear CrimsonAttack hay que escalar en:
1. El bloque de cambio de gear (`newModel.scale.multiplyScalar(1.5)` cuando `cfg.modelKey==='crimson'`, ~línea 1396).
2. `swapModelIfReady` (cuando carga el .glb, `instance.scale...`, ~línea 3885).
Si se cambia sólo uno, el tamaño no queda consistente. No duplicar la escala (swapModelIfReady reemplaza a los hijos del ship, así que no se apila).

## B4. FPS headless es RUINOSO
Medir FPS con Chrome headless es poco fiable (varía 9–51 según estado del juego/CPU del VM). NO confiar en el número absoluto de FPS del harness; confiar en: 0 page errors + que NO se creen materiales/geometrías por frame + valores esperados (escalas, counts).

## B5. No usar internet para copiar código del AO
La fuente de verdad es `D:\server` (AO real) y `referencias/` del repo. (El usuario pidió una guía de memoria por internet, pero el CÓDIGO del juego viene de refs locales.)

## B6. GitHub Pages tarda 1-2 min + Ctrl+F5
Después de cada push, avisar a Gabriel que espere y haga **Ctrl+F5** (por caché). No borrar/limpiar caché sin avisar.

## B7. Jets/games: hay un solo juego, no dos
Aunque hay referencias a varios gears y a `enchants.js`, es UN juego con 4 gears. No asumir que son proyectos/archivos separados. (Escenario de confusión ya ocurrido.)

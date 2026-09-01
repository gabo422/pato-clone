# Patterns — Convenciones del repo y del código

## Repo / git
- Commits en español, mensajes `Fix: ...` con detalle de QUÉ y CÓMO se verificó. Ver `git log --oneline`.
- Rama única `main`. Push después de cada arreglo verificado.
- `index.html` puede tener saltos de línea LF/CRLF (aviso de git, inocuo).

## Código (index.html y *.js)
- Three.js: meshes, grupos, `new THREE.Group()`, materiales `MeshStandardMaterial`/`MeshBasicMaterial`/`PointsMaterial`.
- Patrón de un solo juego con 4 gears vía `GEAR_CONFIGS` (cada gear: name, role, weapons, stats, skills, modelKey).
- `builders = { duck, teddy, mecano, crimson }` (línea ~1391) elige el builder del modelo por `modelKey`.
- Gear CrimsonAttack usa `modelKey: 'crimson'` (único a ese gear). MecanoTank=`mecano`, TeddyBomb=`teddy`, HealDuck=`duck`.
- Proyectiles: `PROJ_BY_GEAR` + `getProjBuilders()` (línea ~4317); la bala estándar del CrimsonAttack es `SphereGeometry(0.5,...)`.
- Partículas: `aceSpawnParticles(preset, position, array)` centraliza la emisión. **Usar SIEMPRE `aceGetParticleMat(color,size)` para el material** (cache, evita crear PointsMaterial nuevo por llamada → evita bajón de FPS). No volver a crear `new THREE.PointsMaterial` inline en emisores frecuentes.
- Constantes del motor nuevos se registran en `ACE` (ej: `ACE.missileTrail` para estela de misiles).
- Los helpers de harness de prueba viven en TEMP (`C:\Users\GMULLI~1.ITP\AppData\Local\Temp\opencode\`), NO en el repo salvo que se pidan.

## Verificación obligatoria antes de commit
1. `node check_syntax.js` → "Script block 0: OK".
2. Harness CDP (`cdp_*.js`) → 0 page errors y se confirman los valores esperados.
3. Commit + push + avisar Ctrl+F5.

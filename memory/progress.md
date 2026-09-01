# Progress — estado de trabajo

## DONE
- [x] 4 gears con armas STD/ADV y stats AO (crimsonAttack, mecanoTank, teddyBomb, healDuck).
- [x] Homing ADV por gear (`turn`).
- [x] Mobs: no orbitan, no siguen en vertical, media vuelta, distancias de ataque. (verif. harness)
- [x] Boss: misiles salen del barco, no baja del piso, contenido en paredes. (verif. harness)
- [x] **Avión del gear CrimsonAttack agrandado 50% (×1.5 → 4.35), SOLO CrimsonAttack.** Commits: `b921671`.
- [x] **Optimización FPS de partículas:** cache de material (estela misiles, muzzle flash, explosiones/impactos); estela más barata. Commit: `ed82921` (parcial) + `b921671` (muzzle flash).
- [x] Flujo: `node check_syntax.js` OK + harness CDP 0 page errors antes de cada push.

## IN PROGRESS
- Esperando feedback de Gabriel tras el push `b921671` (avión CrimsonAttack grande + FPS).
  - Confirmar en su navegador (Ctrl+F5) que el avión del CrimsonAttack se ve más grande y que los otros 3 gears no cambiaron.
  - Confirmar que al disparar misiles ya no baja el FPS.

## NEXT (pendientes propuestos, NO empezados)
- (Según reportes de Gabriel) agrandar avión de OTRO gear si lo pide.
- Si Gabriel percibe que la bala estándar del CrimsonAttack quedó chica, decidir si agrandarla (de momento quedó en 0.5 por su aclaración).
- documentar en los harness CDP en el repo si Gabriel pide reproducibilidad (hoy están en TEMP).

## Log de últimos commits
- `b921671` — avión CrimsonAttack ×1.5 + FPS muzzle flash cache + revert bala a 0.5.
- `ed82921` — estela misil barata + cache material (estela) + bala 0.75 (luego revertido).
- `af37ef7` — boss 3 fixes.
- `2b4c9de` — mobs no sig. vertical + media vuelta.
- `43990ee` — ADV homing por gear.

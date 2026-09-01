# Decisions — decisiones y POR QUÉ (importante: evita re-trabajo)

## D1. Mobs no orbitan ni siguen en vertical (commit 1627f8f / 2b4c9de / af37ef7)
- **Qué:** los mobs SIEMPRE se dirigen al jugador (chase homing), tejen con QuickTurns pequeños, respetan una distancia mínima de ataque (AO `MONSTER_MIN_ATTACK_DISTANCE`), y NO siguen al jugador en Y (mantienen altura de crucero baja).
- **Por qué:** copiado del AO real (`UpdateMoveInfoAttack` del NPCMonster.cpp). Antes orbitaban o te seguían al subir/bajar.
- **No revertir:** es comportamiento intencional verificado con harness.

## D2. Media vuelta (FBDirect FRONT/BACK) en combate (commit 2b4c9de)
- **Qué:** el mob se acerca en diagonal, dispara y hace "media vuelta" (FBDirect=-1) retrocediendo un momento antes de volver (ir y volver), como el AO.
- **Por qué:** fiel a `UpdatePositionVector` FBDirect. Fuera de rango persigue directo sin media vuelta.

## D3. Boss: disparos salen del barco, no baja del piso, no atraviesa paredes (commit af37ef7)
- **Qué:** `fireBossCannons` calcula el origen SIEMPRE sobre el boss (escala de mundo, no cannonPoints locales que con scale enorme quedaban dispersos). Boss mantiene y=90 y no se hunde (`clampEnemyToRoom` mantiene enemigos dentro de ±(roomW/2-10)).
- **Por qué:** fixes verificados con harness cdp_bossfix.js.

## D4. Arma ADV con homing por gear (commit 43990ee)
- **Qué:** `GEAR_CONFIGS` tiene campo `turn` por arma. Mass Drive del MecanoTank `0.35` (recto), Arrow/Bawoo `5.5` (homing fuerte).
- **Por qué:** fiel al AO, antes todos homing-eaban igual (4.2).

## D5. Avión del gear CrimsonAttack agrandado 50% — SOLO CrimsonAttack (commit b921671)
- **Qué:** se escala el modelo del pato del gear CrimsonAttack ×1.5. Duck `lib.scale` 2.9 → 4.35. Se aplica en **dos** puntos: el cambio de gear (bloque builders ~1396) y `swapModelIfReady` (cuando se intercambia el .glb, ~3885).
- **Cómo elegir el gear:** la condición es `cfg.modelKey === 'crimson'`, único al gear CrimsonAttack → **no afecta a los otros 3 gears**.
- **Por qué / historia:** Gabriel primero pidió "agrandar el CrimsonAttack" y el asistente agrandó la bala estándar (0.5→0.75). Gabriel aclaró que quería el **avión**, no el arma. Se revirtió la bala a 0.5 y se agrandó el avión. Verificado en harness: `crimsonPlaneScaleX=4.350`, `stdRadius=0.5`.

## D6. Optimización FPS de partículas — cache de material (fix general, commits af37ef7/b921671)
- **Qué:** nuevo `aceGetParticleMat(color,size)` que cachea el `PointsMaterial` por color+tamaño. Se usa en `aceSpawnParticles`, `aceMuzzleFlash`, y la estela de misiles. Antes se creaba un PointsMaterial NUEVO en cada emisión = bajón de FPS (más con voleas de misiles).
- **Estela de misil:** `ACE.missileTrail` glow 3→1, plume 2→1; intervalos del trail 0.05s→0.09s.
- **Por qué:** la creación repetida de materiales/geometrías por frame era la causa del bajón FPS al disparar misiles. Si hay futuro código de partículas frecuente, DEBE usar `aceGetParticleMat` (ver patterns.md).

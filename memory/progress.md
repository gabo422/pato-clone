# Progress — estado de trabajo

## DONE
- [x] 4 gears con armas STD/ADV y stats AO (crimsonAttack, mecanoTank, teddyBomb, healDuck).
- [x] Homing ADV por gear (`turn`).
- [x] Mobs: no orbitan, no siguen en vertical, media vuelta, distancias de ataque. (verif. harness)
- [x] Boss: misiles salen del barco, no baja del piso, contenido en paredes. (verif. harness)
- [x] **Avión del gear CrimsonAttack agrandado 50% (×1.5 → 4.35), SOLO CrimsonAttack.** Commit: `b921671`.
- [x] **Optimización FPS de partículas:** cache de material (estela misiles, muzzle flash, explosiones/impactos); estela más barata. Commit: `ed82921` (parcial) + `b921671` (muzzle flash).
- [x] **Barra de carga real con %** durante el preload de modelos. Versión `v1.2.2.0`. Commit `12a7c1f`.
- [x] **Texturas fotográficas CC0 (ambientCG)** en piso y paredes + normal maps + repeat proporcional. Commits `bbc295f`, `83a5084`.
- [x] **Rediseño Nivel 1 como casa real** (sin props de guerra) + proporciones reales 1u ≈ 1.33 cm (cama 90x200, ventana 1.2 m, cajas 0.5 m). Commits `efcf7a8`, `71051f6`. Versión del juego **v1.2.3.1**.
- [x] **Verificación 12/sep/2026 (PC personal):** confirmado en `index.html` v1.2.3.1 que TODOS los features están en el código (flash recursivo `flashMeshWhite`, CrimsonAttack ×1.5 en los 2 puntos, bala STD 0.5, barra de carga, texturas CC0, casa real). El memory bank viejo (v1.2.2.0) quedó actualizado a v1.2.3.1.

## IN PROGRESS
- Esperando que Gabriel pruebe **v1.2.3.1** en su navegador (**Ctrl+F5**) y confirme: casa real del Nivel 1, texturas, avión CrimsonAttack grande, FPS con misiles, flash/destrucción de objetos.
- **CAMBIO DE UBICACIÓN (12/sep/2026):** el proyecto se trabaja SOLO en la PC personal de Gabriel → `E:\OneDrive - IT PRO\Documentos\Default Project` (raíz del repo). La estación anterior (`D:\PatoClon-Proyecto`) queda en desuso; su `server\` (AO real) y `harness\` (CDP) NO se copiaron a esta PC → no hay harness CDP ni `server.js` acá (ver AGENTS.md sección 9).

## NEXT (pendientes propuestos, NO empezados)
- Elegir con Gabriel la paleta de colores de la casa (Roadmap Fase 1; NO tocar el mapa sin su paleta — D10).
- Si Gabriel pide agrandar avión de OTRO gear → preguntar avión/bala/misil (B1) y escalar en los DOS puntos (B3).
- Decidir si agrandar la bala STD del CrimsonAttack (hoy 0.5, NO tocar sin confirmar — B2).
- Si un destructible "no desaparece" en su navegador → pedir Ctrl+F5 (versión cacheada) y nivel/objeto exactos.
- Re-crear validación de sintaxis local (extraer `<script>` + `node --check`) ya que no está `check_syntax.js`.

## Log de últimos commits
- `71051f6` — Fix: proporciones reales en Nivel 1 (1u ~ 1.33 cm) → v1.2.3.1.
- `efcf7a8` — Rediseño Nivel 1 como casa real (sin props de guerra).
- `83a5084` — Fix: repeat proporcional de texturas de piso y paredes.
- `bbc295f` — Feature: texturas fotográficas CC0 (ambientCG) en piso y paredes.
- `32e0534` / `086e431` — docs: reglas D10 (es una casa; no puede explotar; rendimiento siempre).
- `12a7c1f` — Feature: barra de carga real con % (v1.2.2.0).
- `2618ecc` — docs: consolidar paths en D:\PatoClon-Proyecto (histórico, ya no es la ubicación).
- `d9ff357` — AGENTS.md completo (estado v1.2.1.1).
- `ac6e192` — flash de impacto en destructibles + indicador de versión v1.2.1.1.
- `d29a588` — renombre de gears (Rayo→CrimsonAttack, Muro→MecanoTank, Trueno→TeddyBomb, Viento→HealDuck).
- `019fb00` — eliminar nombres viejos de referencias/.
- `b921671` — avión CrimsonAttack ×1.5 + FPS muzzle flash cache + revert bala a 0.5.
- `ed82921` — estela misil barata + cache material (estela) + bala 0.75 (luego revertido).
- `af37ef7` — boss 3 fixes.
- `2b4c9de` — mobs no siguen vertical + media vuelta.
- `43990ee` — ADV homing por gear.

# Guerra de Juguetes - Resumen del Proyecto

## Estructura
- **Archivo único:** `repo\index.html` (~8900 líneas) — dentro de `D:\PatoClon-Proyecto\`
- **Remoto:** `https://github.com/gabo422/pato-clone.git`
- **Live:** `https://gabo422.github.io/pato-clone/`
- **Idioma:** Español

## Reglas del Usuario (Gabriel Mullin, gabo422)
- NO pay-to-win, NO gacha, NO item shop
- NO inventar nada de Ace Online — copiar exactamente del source
- **Branding:** "Gear" → "Juguete", "Ace Online" → "Juego Madre" (variables internas quedan como AO)
- No sabe programar — todoManagerInterface, listo para jugar
- Dice "a todos los gear" = actualizar TODOS los gears, no solo uno

## Escala del Juego
- 1 game unit ≈ 1 AO unit
- roomSize=2000, wallHeight=800, GRAVITY=98

## Archivos de Datos de Ace Online
- **Source code:** `D:\PatoClon-Proyecto\server\` (7 archives extraidos)
- **Cliente deployado:** `D:\02.1ClientAceOnline_EP46_EnglishVer\ClientAceOnline_EP46_EnglishVer\`
  - `Res-Tex\omi.tex` — base de datos binaria de TODOS los items/skills (ITEM struct serializada)
- **OpenAO:** `C:\Users\gmullin.ITPRO\Downloads\OpenAO\OpenAo-master\`

## Modelos 3D (Draco-compressed) — en `repo\modelos\`
- `pato.glb` (27MB) — M-Gear (HealDuck)
- `oso.glb` (10MB) — B-Gear (TeddyBomb) / teddy bear
- `boat.glb` (7MB) — bote
- `Crimson.glb` (19MB) — I-Gear (CrimsonAttack)
- `Mecano.glb` (7.5MB) — A-Gear (MecanoTank)
- DRACOLoader desde CDN: `three@0.128.0/examples/js/loaders/DRACOLoader.js`
- Git LFS NO funciona con GitHub Pages (solo sirve pointer files)

## Iconos
- `repo\icons\skills_ace\` — iconos de skills AO
- `repo\icons\skills_ace_all\` — TODOS los iconos AO (93 extraidos)
- SKILL_ICON_MAP en el código mapea skillId → archivo de icono

## Estructura de Archivos de Referencia
```
referencias/
├── 00-RESUMEN-JUEGO.md          ← Este archivo
├── 01-SKILLS-AO-VALORES.md      ← Todos los skills con duración/cooldown reales de AO
├── 02-GEAR-CONFIGS.md           ← Stats y weapons de cada gear
├── 03-SISTEMAS-COMBATE.md       ← Cómo funciona el daño, misiles, etc
├── 04-FISICA-DE-PLANO.md        ← Movimiento, cámara, física
├── 05-MODELOS-Y-VFX.md         ← Modelos, efectos, animaciones
└── 06-BASE-DE-DATOS-OMI.md     ← Cómo parsear omi.tex y estructura ITEM
```

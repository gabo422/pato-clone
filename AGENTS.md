# Pato-Clone — Memory Bank (AGENTS.md)

Memoria persistente para el asistente de IA. Léela al inicio de cada sesión y consúltala antes de tocar código.

## Regla de oro
- **Usuario: Gabriel (gabo422)** — NO es programador. Habla en español. Reporta bugs en lenguaje natural.
- Juego publicado en `https://gabo422.github.io/pato-clone/` (GitHub Pages). Después de push hay que esperar 1-2 min y Gabriel hace **Ctrl+F5**.
- **PROHIBIDO usar internet para copiar código**: se copia de `D:\server` (el AO real) o de la carpeta local `referencias/` del repo.
- **Un solo juego** con 4 gears: CrimsonAttack(I)=crimson, MecanoTank(A)=mecano, TeddyBomb(B)=teddy, HealDuck(M)=duck.

## Cómo trabajar
1. Localizar el código con grep/read (ir a `file:line`).
2. Editar en `D:\Pato-Clone\index.html` (y en varios `*.js` adjuntos).
3. Verificar sintaxis: `node check_syntax.js` (harness en temp, no en el repo).
4. Verificar comportamiento con harness CDP (`cdp_*.js` en temp) que lanza Chrome headless.
5. Commit + push en español (mensajes `Fix: ...`), esperar, pedir Ctrl+F5 + feedback.
6. **Al finalizar cada commit, informar el peso de TODOS los archivos** (tamaño de la carpeta `D:\Pato-Clone` y tamaño del repo git `git count-objects -vH`). Referencia base: carpeta ~88,55 MB en 4109 archivos; pack git ~189,61 MiB; archivos pesados en `modelos/` (pato.glb 26,68, Crimson.glb 19,13, barco.stl 10,76, oso.glb 10,11, Mecano.glb 7,48, boat.glb 6,72). Ningún archivo supera 100 MB (límite de push de GitHub), repo < 1 GB.

## Archivos de memoria (léelos según necesidad)
- `memory/projectbrief.md` — qué es el proyecto y su alcance.
- `memory/productContext.md` — para quién es y qué problema resuelve.
- `memory/patterns.md` — convenciones de código y del repo.
- `memory/decisions.md` — decisiones tomadas y POR QUÉ (evita repetir trabajo).
- `memory/progress.md` — DONE / IN PROGRESS / NEXT.
- `memory/blockers.md` — gotchas no obvios que ya costaron tiempo.

## Dónde está todo (mapa rápido)
- `D:\Pato-Clone\index.html` — el juego completo (8869 líneas).
- `D:\Pato-Clone\enchants.js` — mejora/enchants (layer del mismo juego).
- `D:\Pato-Clone\referencias\` — docs propios (configs de gears, modelos, historial de bugs).
- `D:\server` — el código del AO real (fuente de verdad para comportamiento).
- `C:\Users\GMULLI~1.ITP\AppData\Local\Temp\opencode\` — harness `check_syntax.js` y `cdp_*.js` + `server.js` (servidor local :8123).
- Repo git: `gabo422/pato-clone`, rama `main`.

## Estado actual (resumen) — ver decisions.md y progress.md
- 4 gears con arma STD y ADV diferenciadas, homing por gear (`turn`).
- Mobs/boss fieles al AO (no orbitan, no siguen en vertical, media vuelta, boss no se hunde ni atraviesa paredes).
- **Avión del gear CrimsonAttack agrandado un 50%** (escala x1.5, duck 2.9 → 4.35; SOLO crimsonAttack, no afecta a los otros 3 gears). La bala estándar quedó en radio 0.5 (se revirtió el cambio erróneo a 0.75).
- Optimización FPS de partículas: cache de `PointsMaterial` (`aceGetParticleMat`) aplicado a estela de misiles, muzzle flash y explosiones/impactos. Estela del misil más barata (glow 1, plume 1, cada 0.09s).

## Lo que Gabriel está probando AHORA
Prueba los 4 gears de a uno. Reportó (último): quería agrandar el **avión** del CrimsonAttack (ya hecho), y revisar que el bajón de FPS no pase en ningún caso de emisión de partículas (hecho, ver decisions.md).

SEGUIR: esperar feedback de Gabriel tras el push del avión CrimsonAttack + optimización FPS. Si viene un nuevo reporte, actualizar progress/decisions ANTES y DESPUÉS de trabajar.

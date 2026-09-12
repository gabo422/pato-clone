# Pato-Clone — Guía del proyecto (AGENTS.md)

Memoria persistente para que cualquier instancia/IA continúe el proyecto sin perder contexto. **Léelo al inicio de cada sesión** y consulta `memory/` antes de tocar código.

Última actualización: versión **v1.2.3.1**. Ubicación actual: **PC personal de Gabriel** — `E:\OneDrive - IT PRO\Documentos\Default Project` (raíz del repo git; ya no se trabaja en la estación `D:\PatoClon-Proyecto`).

---

## 1. Visión general

- **Qué es:** clon web del juego *Ace Online* (AO), un solo archivo `index.html` con Three.js. Recrea el combate aéreo/tanque del AO: 4 gears, armas estándar (STD) y avanzada (ADV), mobs y un boss con IA fiel al juego original.
- **Para quién:** Gabriel (gabo422), ex-jugador de AO con **10 años** de experiencia. NO es programador; reporta bugs en lenguaje natural y tiene ojo fino para la fidelidad al AO.
- **Objetivo de diseño:** fidelidad al AO real en mecánicas (movimiento de mobs, boss, armas, homing, "feeling"). El código se copia/adapta del AO real, no inventa mecánicas.
- **Entrega:** publicado en GitHub Pages (`https://gabo422.github.io/pato-clone/`), rama `main`. Tras cada push, Gabriel espera 1-2 min y hace **Ctrl+F5**.

### Reglas de oro
- Usuario: Gabriel. Responder en español (rioplatense, voseo: "déjame", NUNCA "déjamo").
- **PROHIBIDO usar internet para copiar código**: se copia de `D:\PatoClon-Proyecto\server` (AO real) o de `referencias/` del repo. Internet solo sirve para consultas conceptuales.
- **Es UN solo juego con 4 gears** (no 4 proyectos). `enchants.js` es un layer del mismo juego.
- **NO puede explotar**: ninguna feature puede romper el juego o crashear. Siempre verificar con harness CDP (0 page errors) antes de push.
- **Cuidar SIEMPRE el rendimiento**: FPS estables, cachear materiales/geometrías por frame, no bloquear el hilo principal, cargas con progreso.
- **El mapa es una CASA (interior doméstico)**: coherencia visual con muebles/cajas/lego/objetos de casa. NO decoraciones de guerra/militares/industriales (a Gabriel le "explotan" los ojos).
- **Pulido incremental**: tocar UN punto a la vez, no reventar el mapa/decoraciones sin pedirle la paleta a Gabriel.

---

## 2. Stack técnico (estado actual, no instalación)

| Componente | Detalle |
|---|---|
| Lenguaje | JavaScript (ES5/ES6+) puro, sin bundler ni build |
| Motor | Three.js **r128** (`three.min.js`) + loaders GLTF/DRACO/STL desde CDN |
| UI | HTML + CSS inline en el mismo `index.html` (sin frameworks) |
| Servidor | Node.js **solo para desarrollo** (`server.js` en el harness, puerto 8123; sirve estático). En esta PC no está el harness: usar `python -m http.server` o `npx http-server` |
| Publicación | GitHub Pages auto (sin build; CNAME/raíz del repo) |
| Testing | Node + Chrome headless vía CDP (harness). **NO disponible en esta PC** (quedó en la otra estación); verificar sintaxis con `node --check` sobre los `<script>` |
| Repo | Sin `package.json`, sin `README.md`, sin dependencias npm. `.gitignore` ignora `*.crx`, `*.pem` y `reporte-iDUHF-claude.md` |

**Archivos del juego:**
- `index.html` → 0.43 MB (432 KB, ~8930 líneas), juego completo.
- `enchants.js` → 0.02 MB (22 KB), mejora/enchants.

---

## 3. Estructura del proyecto

**Estructura actual (PC personal de Gabriel, raíz = repo git rama `main`):**
```
E:\OneDrive - IT PRO\Documentos\Default Project\
├── index.html          Juego completo (HTML + CSS + todo el JS, v1.2.3.1, ~8930 líneas)
├── enchants.js         Capa de mejora/enchants
├── AGENTS.md           Este archivo
├── .gitignore          *.crx, *.pem, reporte-iDUHF-claude.md
├── memory\             Memoria persistente (leer siempre):
│   ├── projectbrief.md      qué es y alcance
│   ├── productContext.md    por qué existe, contexto
│   ├── patterns.md          convenciones de código y repo
│   ├── decisions.md         decisiones D1..D11 y su POR QUÉ (evita re-trabajo)
│   ├── progress.md          DONE / IN PROGRESS / NEXT + log de commits
│   └── blockers.md          gotchas B1..B7 que ya costaron tiempo
├── referencias\        Docs propios del equipo (configs/valores del AO):
│   00-RESUMEN-JUEGO, 01-SKILLS-AO-VALORES, 02-GEAR-CONFIGS,
│   03-SISTEMAS-COMBATE, 04-FISICA-DE-PLANO, 05-MODELOS-Y-VFX,
│   06-BASE-DE-DATOS-OMI, 07-HISTORIAL-BUGS
├── modelos\            Modelos 3D (subidos al repo):
│   pato.glb 26.68 MB, Crimson.glb 19.13 MB, barco.stl 10.76 MB,
│   oso.glb 10.11 MB, Mecano.glb 7.48 MB, boat.glb 6.72 MB
├── texturas\           Texturas CC0 (ambientCG): floor_color/normalgl + wall_color/normalgl (~3.8 MB)
└── clippicker\         Extensión de Chrome ClipPicker (proyecto aparte, versionada en el mismo repo)
```

**Dependencias externas al repo (importantes para continuar):**
- En la estación anterior (`D:\PatoClon-Proyecto\`) quedaron `server\` (código del AO real, **fuente de verdad** del comportamiento) y `harness\` (`server.js`, `check_syntax.js`, `cdp_*.js`, `parse_omi*.js`). **En esta PC NO están.** Si hace falta copiar mecánica nueva del AO o verificación CDP, pedirlas/regenerarlas desde `referencias/`.

**Mapa de código (líneas aprox. de `index.html` v1.2.3.1):**
- `GEAR_CONFIGS` — config de los 4 gears (nombre, armas, stats, skills, `modelKey`).
- `builders = { duck, teddy, mecano, crimson }` — elige builder por `modelKey`.
- `buildLegoWall`, colliders destructibles (`worldColliders`).
- `swapModelIfReady` — intercambio del .glb. Escala CrimsonAttack ×1.5 en **dos** puntos: cambio de gear (~1433) y swap (~3923).
- `PROJ_BY_GEAR` + `getProjBuilders()` — proyectiles; bala STD CrimsonAttack `SphereGeometry(0.5,8,6)` (~4412).
- `aceGetParticleMat` / `aceSpawnParticles` — partículas cacheadas (obligatorio su uso).
- `ACE.*` — constantes del motor registradas en el objeto `ACE`.
- `hitDestructible` / `hitWorldCollider` — daño/rotura; usan `flashMeshWhite`.
- `flashMeshWhite` (~7445) — flash blanco recursivo de impacto (recorre `traverse` porque los destructibles son `THREE.Group`).
- Línea 442 CSS de `#versionTag`; div ~1170; `GAME_VERSION` ~1185; setea el texto ~1186.

---

## 4. Decisiones de diseño (resumen; ver `memory/decisions.md` para el detalle)

- **D1.** Mobs NO orbitan ni siguen en vertical: chase homing + QuickTurns chicos, respetan `MONSTER_MIN_ATTACK_DISTANCE`, mantienen altura de crucero. (fiel al AO `UpdateMoveInfoAttack`).
- **D2.** Media vuelta (FBDirect FRONT/BACK) en combate: se acercan, disparan y retroceden ("ir y volver").
- **D3.** Boss: disparos salen SIEMPRE del barco (escala de mundo), mantiene altura y no atraviesa paredes (`clampEnemyToRoom`).
- **D4.** Arma ADV con homing por gear: campo `turn` por arma (Mass Drive MecanoTank 0.35 recto; Arrow/Bawoo 5.5 homing).
- **D5.** Avión del gear **CrimsonAttack** agrandado ×1.5 (2.9 → **4.35**), SOLO para `modelKey==='crimson'`. Se aplica en DOS puntos: cambio de gear (~1396) y `swapModelIfReady` (~3885). La bala STD quedó en radio **0.5** (se revirtió el 0.75: Gabriel quería el avión, no el arma).
- **D6.** Cache de `PointsMaterial` en `aceGetParticleMat(color,size)` para TODA emisión frecuente (estela misiles, muzzle flash, explosiones): crear material por llamada causaba bajón de FPS. Estela del misil barata (glow 1, plume 1, cada 0.09s).
- **D7.** Flash de impacto recursivo `flashMeshWhite`: los destructibles son `THREE.Group` sin `.material`, por lo que el viejo `mesh.material.emissive.set(...)` no flasheaba. Recorre `traverse`, setea emissive blanco y lo devuelve a negro tras ~80ms.
- **D8.** Versionado visible: `GAME_VERSION = '1.2.1.1'` (línea 1158) + `<div id="versionTag">` abajo a la derecha (CSS 442). **Subir `GAME_VERSION` en cada cambio publicado.**
- **D9.** Nomenclatura de gears (renombre, commit `d29a588`): Rayo→**CrimsonAttack** (I), Muro→**MecanoTank** (A), Trueno→**TeddyBomb** (B), Viento→**HealDuck** (M). `modelKey` intactos: `crimson/mecano/teddy/duck`. Los nombres viejos quedaron **eliminados de todo el proyecto** (código, memory, referencias). Los nombres reales del AO son: I=Sting (ST), A=Detonator (DT), B=Boom (BT), M=Overlord (OT) — si Gabriel usa estos, mapear.

---

## 5. Estado actual del desarrollo

**TERMINADO (todo presente en `index.html` v1.2.3.1, verificado en repo el 12/sep/2026):**
- 4 gears con armas STD/ADV y stats AO (crimsonAttack, mecanoTank, teddyBomb, healDuck).
- Homing ADV por gear (`turn`).
- Mobs como el AO (no orbitan, no siguen en vertical, media vuelta, distancias de ataque por rol).
- Boss como el AO (misiles del barco, no se hunde, contenido en paredes).
- Avión CrimsonAttack ×1.5 (4.35) solo ese gear; bala STD 0.5.
- Optimización FPS partículas (cache de material).
- Renombre completo a los 4 nombres nuevos (código + referencias + memory).
- Destrucción de objetos + flash de impacto recursivo (`flashMeshWhite`) en todos los destructibles (D7).
- Versión visible abajo a la derecha (`#versionTag`, `GAME_VERSION`) — hoy **v1.2.3.1** (D8).
- Barra de carga real con % durante el preload de modelos (v1.2.2.0, commit `12a7c1f`).
- Texturas CC0 (ambientCG) en piso y paredes, con normal maps y repeat proporcional (commits `bbc295f`, `83a5084`).
- **Nivel 1 rediseñado como casa real** (sin props de guerra) + proporciones reales 1u ≈ 1.33 cm (commits `efcf7a8`, `71051f6`).

**PENDIENTE de feedback (no es WIP de código):**
- Que Gabriel pruebe **v1.2.3.1** en su navegador (**Ctrl+F5**) y confirme: casa real del Nivel 1, texturas, avión CrimsonAttack grande, FPS estable con misiles, flash/destrucción de objetos.

**NEXT / pendientes propuestos (NO empezados):**
- Elegir con Gabriel la paleta de colores de la casa (Roadmap Fase 1 visual; NO tocar el mapa sin pedirle la paleta, regla de oro D10).
- Agrandar avión de OTRO gear si Gabriel lo pide (preguntar avión/bala/misil — B1 — y escalar en los DOS puntos — B3).
- Decidir si agrandar la bala STD del CrimsonAttack (hoy 0.5, por ahora NO tocar — B2).
- Si Gabriel ve un destructible que NO desaparece en su navegador → pedir Ctrl+F5 (versión cacheada) y nivel/objeto exactos.
- Sintaxis: validar con `node --check` sobre los bloques `<script>` (no hay `check_syntax.js` en esta PC).

---

## 6. Cómo correr el proyecto

No hay build (sin package.json). Dos formas de jugar:

1. **Producción (lo que juega Gabriel):** push a `main` → GitHub Pages despliega en 1-2 min. URL `https://gabo422.github.io/pato-clone/`.
2. **Local (para desarrollo):**
   - Servir estático desde la raíz del repo: `python -m http.server 8123` (o `npx http-server -p 8123`).
   - Abrir `http://localhost:8123/index.html`. Los `.glb` y `texturas/` se sirven desde el repo.
   - Requisitos: Python o Node instalado, carpetas `modelos/` y `texturas/` presentes.
   - NO hay `server.js` en esta PC (quedó en la otra estación). Para validar sintaxis: extraer los bloques `<script>` de `index.html` y correr `node --check` en cada uno (debe dar OK sin errores).

---

## 7. Roadmap / ideas

- Cerrar el feedback de Gabriel sobre v1.2.3.1 (casa real Nivel 1, texturas, avión, FPS, flash/destrucción).
- Paleta de colores de la casa con Gabriel (Roadmap Fase 1 visual; no tocar el mapa sin su paleta).
- Evaluar HP de destructibles si Gabriel insiste en que "todo el objeto queda" (cajas 4-6, lego 10, muebles 3-12 vs daño 1 por bala; hoy se muere de a golpes).
- Si se pide reproducibilidad: versionar los harness CDP dentro del repo (hay que re-crearlos en esta PC).
- Seguir roadmap del AO según lo que Gabriel priorice (más niveles, más gear mechanics, skills con enchants.js).

---

## 8. Problemas conocidos / deudas técnicas / gotchas

- **B1.** Nombre de gear ambiguo ("el CrimsonAttack") → SIEMPRE preguntar si habla del **avión (gear)**, la **bala STD** o el **misil**. Ya costó un revert.
- **B2.** Bala STD del CrimsonAttack = radio **0.5** por ahora. NO volver a 0.75 sin confirmación.
- **B3.** El avión del CrimsonAttack se escala en DOS puntos (cambio de gear ~1396 y `swapModelIfReady` ~3885); tocar solo uno deja el tamaño inconsistente. No duplicar la escala.
- **B4.** FPS con Chrome headless es RUINOSO (9–51 según estado). No confiar en el número; confiar en 0 page errors + que no se creen materiales/geometrías por frame + valores esperados.
- **B5.** No usar internet para copiar código del AO; fuente de verdad = `D:\PatoClon-Proyecto\server` + `referencias/`.
- **B6.** GitHub Pages tarda 1-2 min en desplegar y el caché del navegador juega en contra: SIEMPRE pedir **Ctrl+F5** tras un push.
- **B7.** Es UN juego con 4 gears; no asumir proyectos separados.
- **Ubicación (mudanza de PC cerrada el 12/sep/2026):** el proyecto ya NO se trabaja en `D:\PatoClon-Proyecto`. Vive SOLO en la PC personal de Gabriel: `E:\OneDrive - IT PRO\Documentos\Default Project` (raíz del repo). El `server\` (AO real) y `harness\` quedaron en la estación anterior y NO se copiaron acá → no planificar usando harness CDP ni `server.js` en esta PC hasta que se re-extraigan.
- Hay `.gitignore` (`.crx`, `.pem`, `reporte-iDUHF-claude.md`): cuidado con archivos sueltos que inflen el repo (size-pack actual: 169.66 MiB; repo sin .git ~92 MB).

---

## 9. Comandos de trabajo

Flujo estándar por cada tarea (verificación OBLIGATORIA antes de commit):

1. **Servir local** (si no está corriendo): `python -m http.server 8123` desde la raíz del repo → `http://localhost:8123/index.html`. (En esta PC no hay `server.js`.)
2. **Sintaxis:** extraer los bloques `<script>` de `index.html` y correr `node --check` en cada uno → debe decir OK sin errores (reemplaza al viejo `check_syntax.js`).
3. **Harness CDP:** NO disponible en esta PC (quedó en la otra estación). Fallback: revisión manual/DevTools y confirmación de Gabriel con Ctrl+F5.
4. **Git:**
   - `git add <archivos>` / `git commit -m "Fix: ..."` (mensajes en ESPAÑOL, estilo `Fix:`, con QUÉ y cómo se verificó).
   - `git push origin main` (rama única `main`).
   - Antes de push: revisar `git status` y `git diff`.
5. **Peso (regla general, reportar al final de CADA commit):**
   - Carpeta repo total sin `.git` (referencia: ~92 MB; ningún archivo .glb > 30 MB, repo < 1 GB).
   - `git count-objects -vH` → `size-pack` (referencia actual: 169.66 MiB).
   - Peso individual de los archivos tocados (referencia: `index.html` 0.43 MB, `enchants.js` 0.02 MB, `modelos/*` en sección 3).
6. **Versión:** si el cambio se publica, subir `GAME_VERSION` en `index.html` (~1185) y actualizar el `#versionTag` (div ~1170). Registrar en `memory/progress.md` con el hash del commit.
7. **Feedback:** avisar a Gabriel que espere "un momento" y haga **Ctrl+F5**. Actualizar `memory/progress.md` y `memory/decisions.md` ANTES y DESPUÉS de trabajar.

**Orden de lectura de memoria:** `memory/blockers.md` (gotchas primero) → `memory/decisions.md` → `memory/progress.md` → el resto según necesidad.
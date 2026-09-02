# Pato-Clone — Guía del proyecto (AGENTS.md)

Memoria persistente para que cualquier instancia/IA continúe el proyecto sin perder contexto. **Léelo al inicio de cada sesión** y consulta `memory/` antes de tocar código.

Última actualización: versión **v1.2.1.1** + **paths consolidados en `D:\PatoClon-Proyecto\`** (repo/server/harness).

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

---

## 2. Stack técnico (estado actual, no instalación)

| Componente | Detalle |
|---|---|
| Lenguaje | JavaScript (ES5/ES6+) puro, sin bundler ni build |
| Motor | Three.js **r128** (`three.min.js`) + loaders GLTF/DRACO/STL desde CDN |
| UI | HTML + CSS inline en el mismo `index.html` (sin frameworks) |
| Servidor | Node.js **solo para desarrollo** (`server.js` en el harness, puerto 8123; sirve estático) |
| Publicación | GitHub Pages auto (sin build; CNAME/raíz del repo) |
| Testing | Node + Chrome headless vía CDP (harness en `D:\PatoClon-Proyecto\harness`, ver sección 9) |
| Repo | Sin `package.json`, sin `README.md`, sin `.gitignore`, sin dependencias npm |

**Archivos del juego:**
- `index.html` → 0.41 MB (411 KB), juego completo (~8900 líneas).
- `enchants.js` → 0.02 MB (22 KB), mejora/enchants.

---

## 3. Estructura del proyecto

**Estructura consolidada (todo el proyecto en UNA carpeta, lista para copiar a otra PC):**
```
D:\PatoClon-Proyecto\
├── repo\               Repo git (rama main) + juego:
│   ├── index.html          Juego completo (HTML + CSS + todo el JS del motor del juego)
│   ├── enchants.js         Capa de mejora/enchants
│   ├── AGENTS.md           Este archivo
│   ├── memory\             Memoria persistente (leer siempre):
│   │   ├── projectbrief.md      qué es y alcance
│   │   ├── productContext.md    por qué existe, contexto
│   │   ├── patterns.md          convenciones de código y repo
│   │   ├── decisions.md         decisiones D1..D9 y su POR QUÉ (evita re-trabajo)
│   │   ├── progress.md          DONE / IN PROGRESS / NEXT + log de commits
│   │   └── blockers.md          gotchas B1..B7 que ya costaron tiempo
│   ├── referencias\        Docs propios del equipo (configs/valores del AO):
│   │   00-RESUMEN-JUEGO, 01-SKILLS-AO-VALORES, 02-GEAR-CONFIGS,
│   │   03-SISTEMAS-COMBATE, 04-FISICA-DE-PLANO, 05-MODELOS-Y-VFX,
│   │   06-BASE-DE-DATOS-OMI, 07-HISTORIAL-BUGS
│   └── modelos\            Modelos 3D locales (subidos al repo):
│       pato.glb 26.68 MB, Crimson.glb 19.13 MB, barco.stl 10.76 MB,
│       oso.glb 10.11 MB, Mecano.glb 7.48 MB, boat.glb 6.72 MB
├── server\             Código del AO real (fuente de verdad para comportamiento)
└── harness\            Herramientas de desarrollo (NO van al repo):
    server.js, check_syntax.js, cdp_*.js, parse_omi*.js, extract_*.ps1
```

**Dependencias EXTERNAS al repo (importantes para continuar):**
- `D:\PatoClon-Proyecto\server\` — código del AO real. **Fuente de verdad** para comportamiento (mobs, boss, armas).
- `D:\PatoClon-Proyecto\harness\` — herramientas de desarrollo. NO está en el repo. Ya vive DENTRO de `D:\PatoClon-Proyecto` (consolidado); sus scripts tienen paths hardcodeados al repo (`D:/PatoClon-Proyecto/repo`). Si en otra PC cambia la letra de disco o la ruta, hay que actualizarlos (ver sección 8).

**Mapa de código (líneas aprox. de `index.html`):**
- `GEAR_CONFIGS` — config de los 4 gears (nombre, armas, stats, skills, `modelKey`).
- `builders = { duck, teddy, mecano, crimson }` (~1391) — elige builder por `modelKey`.
- `buildLegoWall` (~1868), colliders destructibles (`worldColliders`, ~2449).
- `swapModelIfReady` (~3885) — intercambio del .glb.
- `PROJ_BY_GEAR` + `getProjBuilders()` (~4317) — proyectiles; bala STD CrimsonAttack `SphereGeometry(0.5,…)`.
- `aceGetParticleMat` / `aceSpawnParticles` — partículas cacheadas (obligatorio su uso).
- `ACE.*` — constantes del motor registradas en el objeto `ACE`.
- `hitDestructible` (~7411) y `hitWorldCollider` (~7451) — daño/rotura; usan `flashMeshWhite`.
- `flashMeshWhite` (~7407) — flash blanco recursivo de impacto.
- Línea 442 CSS de `#versionTag`; 1149 el div; 1158 `GAME_VERSION`; 1159 setea el texto.

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

**TERMINADO (verificado con harness CDP, 0 page errors):**
- 4 gears con armas STD/ADV y stats AO (crimsonAttack, mecanoTank, teddyBomb, healDuck).
- Homing ADV por gear (`turn`).
- Mobs como el AO (no orbitan, no siguen en vertical, media vuelta, distancias de ataque por rol).
- Boss como el AO (misiles del barco, no se hunde, contenido en paredes).
- Avión CrimsonAttack ×1.5 (4.35) solo ese gear; bala STD 0.5.
- Optimización FPS partículas (cache de material).
- Renombre completo a los 4 nombres nuevos (código + referencias + memory).
- **Destrucción de objetos (pulido):** verificados los 5 niveles en harness (L1 18 colliders, L2 12, L3 4, L4 5, L5 9; todos `fails=[]`; `parentIsScene=true`; el collider muerto sale de la escena). Los objetos SÍ desaparecen al morir.
- **Flash de impacto** en todos los destructibles (D7) — commit `ac6e192`.
- **Versión v1.2.1.1 visible** abajo a la derecha (D8) — commit `ac6e192`.

**EN PROGRESO (WIP) / esperando feedback de Gabriel:**
- Confirmar en su navegador (Ctrl+F5) el flash al golpear objetos destructibles y el indicador de versión.
- (Anterior, sin confirmar) avión CrimsonAttack grande + FPS de misiles.

**NEXT / pendientes propuestos (NO empezados):**
- Si Gabriel reporta que un objeto destructible NO desaparece en su navegador → pedir Ctrl+F5 primero (probable versión vieja cacheada o HP alto), y de persistir, verificar nivel y objeto exacto.
- Agrandar avión de OTRO gear si Gabriel lo pide.
- Decidir si agrandar la bala STD del CrimsonAttack (hoy 0.5, por ahora NO tocar).
- Mover el harness DENTRO del repo (hoy vive en `D:\PatoClon-Proyecto\harness`, consolidado con el proyecto pero sin versionar) si Gabriel pide reproducibilidad.

---

## 6. Cómo correr el proyecto

No hay build (sin package.json). Dos formas de jugar:

1. **Producción (lo que juega Gabriel):** push a `main` → GitHub Pages despliega en 1-2 min. URL `https://gabo422.github.io/pato-clone/`.
2. **Local (para desarrollo/harness):**
   - Servir estático: `node server.js` (está en `D:\PatoClon-Proyecto\harness`; escucha en `:8123`, sirve desde `D:/PatoClon-Proyecto/repo`).
   - Abrir `http://localhost:8123/index.html`.
   - Requisitos: Node instalado, Chrome instalado (para harness), la carpeta `modelos/` presente (los .glb se sirven desde el repo).
   - En la PC nueva: ajustar el path del repo en `server.js` y `check_syntax.js` si el proyecto ya no está en `D:\PatoClon-Proyecto\repo`.

---

## 7. Roadmap / ideas

- Verificar y cerrar feedback de Gabriel sobre flash de impacto + versión (WIP actual).
- Evaluar HP de destructibles si Gabriel insiste en que "todo el objeto queda" (cajas 4-6, lego 10, muebles 3-12 vs daño 1 por bala; hoy se muere de a golpes).
- Si se pide reproducibilidad: versionar los harness CDP dentro del repo.
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
- **Paths hardcodeados (crítico para la mudanza de PC):** el harness y el juego referencian `D:\PatoClon-Proyecto\...`. Todo el proyecto quedó consolidado en `D:\PatoClon-Proyecto\` (repo/server/harness). En la PC nueva: copiar esa carpeta completa y, si cambia la letra de disco o la ruta, actualizar los scripts del harness (principalmente `server.js`, `check_syntax.js`, `cdp_*.js`) y esta guía.
- No hay README ni .gitignore: cuidado con archivos sueltos que puedan inflar el repo (el pack git ya va en 189.61 MiB).

---

## 9. Comandos de trabajo

Flujo estándar por cada tarea (verificación OBLIGATORIA antes de commit):

1. **Servir local** (si no está corriendo): `node server.js` → `http://localhost:8123/index.html`.
2. **Sintaxis:** `node check_syntax.js` → debe decir **"Script block 0: OK"**. (Lee `D:\PatoClon-Proyecto\repo\index.html` hardcodeado.)
3. **Harness CDP (comportamiento):** `node cdp_*.js` según lo que se pruebe (ej. `cdp_fps.js`, `cdp_destru.js`, `cdp_realshot.js`). Buscar **"PAGE_ERRORS[0]"** y los valores esperados del caso. Lanzan Chrome headless por CDP.
4. **Git:**
   - `git add <archivos>` / `git commit -m "Fix: ..."` (mensajes en ESPAÑOL, estilo `Fix:`, con QUÉ y cómo se verificó).
   - `git push origin main` (rama única `main`).
   - Antes de push: revisar `git status` y `git diff`.
5. **Peso (regla general, reportar al final de CADA commit):**
   - Carpeta `D:\PatoClon-Proyecto\repo` total (referencia: ~88.56 MB / 4109 archivos; ningún archivo > 100 MB, repo < 1 GB).
   - `git count-objects -vH` → `size-pack` (referencia: 189.61 MiB).
   - Peso individual de los archivos tocados (referencia: `index.html` 0.40 MB, `enchants.js` 0.02 MB, `modelos/*` pesados listados en sección 3).
6. **Versión:** si el cambio se publica, subir `GAME_VERSION` en `index.html` (línea 1158) y actualizar el `#versionTag` (texto por defecto ~1149). Registrar en `memory/progress.md` con el hash del commit.
7. **Feedback:** avisar a Gabriel que espere "un momento" y haga **Ctrl+F5**. Actualizar `memory/progress.md` y `memory/decisions.md` ANTES y DESPUÉS de trabajar.

**Orden de lectura de memoria:** `memory/blockers.md` (gotchas primero) → `memory/decisions.md` → `memory/progress.md` → el resto según necesidad.
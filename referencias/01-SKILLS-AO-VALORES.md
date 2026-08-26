# Skills Ace Online - Valores Reales (Nivel Alto)
# Extraídos de omi.tex del cliente EP46 English
# Campo: ItemNum | Nombre | Time(ms) | ReAttacktime(ms)

# ═══════════════════════════════════════════════════════════════
# FORMA DE LEER EL omi.tex
# ═══════════════════════════════════════════════════════════════
# - Archivo: D:\02.1ClientAceOnline_EP46_EnglishVer\...\Res-Tex\omi.tex
# - Header: int32 nType + int32 nDataCount (8 bytes)
# - Cada ITEM son 576 bytes (sizeof(ITEM) con MSVC 32-bit)
# - Primer sector: type=0, count=15758 items
# - ItemName en offset +5 (char[40])
# - ReAttacktime en offset +168 (UINT, ms)
# - Time (duration) en offset +172 (INT, ms)
# - Kind: 50=SKILL_ATTACK, 51=SKILL_DEFENSE, 52=SKILL_SUPPORT, 53=SKILL_ATTRIBUTE

# ═══════════════════════════════════════════════════════════════
# I-GEAR (Rayo) — BaseNums 783xxxx
# ═══════════════════════════════════════════════════════════════

# --- Buff Skills (Duration activa + Cooldown) ---
# | Skill               | Duración | Cooldown | Efecto |
Fire Shot             | 420s     | 410s     | +Daño arma estándar (DES_MINATTACK_01, DES_MAXATTACK_01)
Missile Shot          | 420s     | 410s     | +Daño arma avanzada (DES_MINATTACK_02, DES_MAXATTACK_02)
Concentration         | 420s     | 410s     | +Accuracy ambas armas (DES_ATTACKPROBABILITY_01, _02)
Frenzy                | 300s     | 290s     | +Daño, +1 ShotNum, +5° ángulo
Berserker             | 30s      | 900s     | +2 ShotNum, +2 MultiNum, -30% ReattackTime (DES_REATTACKTIME_01 como negativo)
Defense Up            | 300s     | 290s     | +Defensa (DES_DEFENSE_01)
Evasion Up            | 300s     | 290s     | +Evasión (DES_DEFENSEPROBABILITY_01)
Hyper Moving          | 60s      | 50s      | +10% giro y strafe (DES_SKILL_ENGINEANGLE, DES_SKILL_REACTIONSPEED)

# --- Control Skills (Instant + Cooldown) ---
Overbooster           | 3s       | 25s      | Dash 600m/s, invulnerable (DES_HYPER_BOOSTER=166 → HYPER_BOOSTER_MAX)
Chain Rolling         | 8s       | 20s      | Dash lateral encadenado (DES_SKILL_ROLLING_TIME=170 → bool TRUE)
Turnaround            | -        | 8s       | Giro 180° instantáneo
Back Move Mach        | -        | 15s      | Retroceso 1000m a 600m/s

# --- Util Skills ---
Drain                 | 20s      | 20s      | +25% HP robado al dañar
Scanning              | 10s      | 3s       | Revela enemigos invisibles (DES_SKILL_SCANNING=144)

# ═══════════════════════════════════════════════════════════════
# A-GEAR (Muro) — BaseNums 782xxxx
# ═══════════════════════════════════════════════════════════════
Fire Shot             | 420s     | 410s     | +Daño arma estándar
Missile Shot          | 420s     | 410s     | +Daño arma avanzada
Concentration         | 420s     | 410s     | +Accuracy ambas armas
Defense Up            | 300s     | 290s     | +Defensa
Snare Shot            | 10s      | 50s      | Disparos ralentizan enemigos 50% (DES_SKILL_SLOWMOVING=138)
Barrier               | 15s      | 60s      | +5 HP de escudo temporal
Siege Mode            | 15s      | 20s      | Torreta inmóvil, +100% daño, +rango
Air Siege Mode        | 12s      | 22s      | Siege mode en el aire
Hyper Shot            | -        | 30s      | Disparo AoE que ignora defensa
Remedy                | -        | 10s      | Cura efectos negativos
Reflect               | 15s      | 25s      | Refleja daño al recibir golpe
Ground Accelerator    | 180s     | 170s     | +60% velocidad (passive en nuestro juego)

# ═══════════════════════════════════════════════════════════════
# B-GEAR (Trueno) — BaseNums 780xxxx
# ═══════════════════════════════════════════════════════════════
Fire Shot             | 420s     | 410s     | +Daño arma estándar
Missile Shot          | 420s     | 410s     | +Daño arma avanzada
Concentration         | 420s     | 410s     | +Accuracy ambas armas
Defense Up            | 300s     | 290s     | +Defensa
Deploy Chaffs         | 60s      | 120s     | Chaffs absorben hits enemigos
Reduce Damage         | 120s     | 180s     | -25% daño recibido (passive en nuestro juego)
Ground Bombing Mode   | toggle   | -        | Arma avanzada cae al suelo (spPerSec)
Air Bombing Mode      | toggle   | -        | Arma avanzada se lanza + cae (spPerSec)
Charge Shot           | -        | 12s      | Arma estándar cargada, alto daño
Multi-Target Mode     | 12s      | 18s      | Misiles atacan múltiples objetivos
Big Boom              | -        | 1800s    | Explosión masiva

# ═══════════════════════════════════════════════════════════════
# M-GEAR (Viento) — BaseNums 781xxxx
# ═══════════════════════════════════════════════════════════════
Fire Shot             | 420s     | 410s     | +Daño arma estándar
Missile Shot          | 420s     | 410s     | +Daño arma avanzada
Concentration         | 420s     | 410s     | +Accuracy ambas armas
Defense Up            | 300s     | 290s     | +Defensa
Evasion Up            | 300s     | 290s     | +Evasión
Elevation             | 300s     | 290s     | +30% daño arma estándar (passive en nuestro juego)
Raging Fire           | 420s     | 410s     | +Ataque a formación
Raging Defense        | 420s     | 410s     | +Defensa a formación
Raging Evasion        | 420s     | 410s     | +Evasión a formación
Healing Field         | -        | 1s       | Instant cast en AO (nosotros: heal over time 15s)
Energizing Field      | -        | 1s       | Instant cast en AO (nosotros: SP regen 15s)
Heal Target           | -        | 1s       | Cura instantánea +3 HP
Energise Target       | -        | 1s       | +30 SP instantáneo
Full Recovery         | -        | 900s     | HP + escudo completos (15 min cooldown!)
Scan                  | 10s      | 3s       | Revela enemigos invisibles
Reverse Engine        | -        | 0s       | Frena + elimina misiles cercanos
Smart SP              | 300s     | 290s     | -30% SP cost (passive en nuestro juego)
Invincible            | 8s       | 600s     | Invulnerabilidad total

# ═══════════════════════════════════════════════════════════════
# IMPORTANTES: Berserker MECÁNICA REAL
# ═══════════════════════════════════════════════════════════════
# Berserker pone DES_REATTACKTIME_01 a un valor MUY negativo
# → El reattack time se vuelve casi 0 (disparo ultrarrápido)
# → Hay anti-cheat que detecta si reattack≈0 sin Berserker activo
# → Source: WeaponItemInfo.cpp:200
# → Berserker y Frenzy se pueden usar juntos (restricción removida 2007-02-01)
# → Source: Skill.cpp:247-255, 2351-2356 (comentado)

# ═══════════════════════════════════════════════════════════════
# IMPORTANTES: Chain Rolling MECÁNICA REAL
# ═══════════════════════════════════════════════════════════════
# Activa DES_SKILL_ROLLING_TIME=170 → flag booleano
# Cuando el jugador recibe daño en vuelo y el flag está TRUE:
#   → Daño se niega, jugador hace animación de roll (esquivar)
#   → "30 seconds flight damage avoidance time limit"
#   → Source: AtumParam.h:2088, FieldIOCPSocket2.cpp:6307-6326

# ═══════════════════════════════════════════════════════════════
# IMPORTANTES: Efectos son DATABASE-DRIVEN
# ═══════════════════════════════════════════════════════════════
# Cada skill tiene ArrDestParameter[8] y ArrParameterValue[8]
# Se aplican como SUMA DIRECTA (flat additive) a CParamFactor
# Source: FieldSkillManager.cpp:1571-1586, FieldIOCPSocket2.cpp:4990+
# Los valores exactos NO están en el source, solo en la DB (omi.tex)

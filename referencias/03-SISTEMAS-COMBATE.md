# Sistemas de Combate - Ace Online

# ═══════════════════════════════════════════════════════════════
# CÓMO SE APLICAN LOS EFECTOS DE SKILLS
# ═══════════════════════════════════════════════════════════════
# Source: FieldSkillManager.cpp:1571-1586 (SetSkillParamFactor)
# Source: FieldIOCPSocket2.cpp:4990+ (SetParamFactor)

# Cada skill tiene ArrDestParameter[8] y ArrParameterValue[8]
# Se itera el array y cada par se aplica como SUMA DIRECTA a CParamFactor
# NO es porcentaje — es valor flat (excepto los que tienen prefijo pfm_)

# Prefijo pfm_ = MULTIPLICATIVO (* con el stat base)
# Prefijo pfp_ = ADITIVO (+ valor directo)

# ═══════════════════════════════════════════════════════════════
# DESTPARAMETERS IMPORTANTES
# ═══════════════════════════════════════════════════════════════

# --- ARMA ESTÁNDAR (Weapon 1) ---
# DES_MINATTACK_01  = 18  | Min attack power (*)  | AtumParam.h:1920
# DES_MAXATTACK_01  = 71  | Max attack power (*)  | AtumParam.h:1921
# DES_ATTACKPROBABILITY_01 = 20 | Accuracy (hit rate) | AtumParam.h:1924
# DES_REATTACKTIME_01 = 31 | Fire delay (*)  | AtumParam.h:1939
# DES_RANGE_01      = 35  | Effective range (*)   | AtumParam.h:1943
# DES_SHOTNUM_01    = 44  | Shots per attack      | AtumParam.h:1955
# DES_MULTINUM_01   = 45  | Multi-target count    | AtumParam.h:1957
# DES_ATTACK_RANGE_01 = 129 | Attack range (*)   | AtumParam.h:2037

# --- ARMA AVANZADA (Weapon 2) ---
# DES_MINATTACK_02  = 19  | Min attack power (*)  | AtumParam.h:1922
# DES_MAXATTACK_02  = 72  | Max attack power (*)  | AtumParam.h:1923
# DES_ATTACKPROBABILITY_02 = 21 | Accuracy (hit rate) | AtumParam.h:1925
# DES_REATTACKTIME_02 = 32 | Fire delay (*)  | AtumParam.h:1940
# DES_RANGE_02      = 36  | Effective range (*)   | AtumParam.h:1944
# DES_SHOTNUM_02    = 69  | Shots per attack      | AtumParam.h:1956
# DES_MULTINUM_02   = 70  | Multi-target count    | AtumParam.h:1958
# DES_ATTACK_RANGE_02 = 130 | Attack range (*)   | AtumParam.h:2038

# --- DEFENSA / EVASIÓN ---
# DES_DEFENSE_01    = 22  | Defense value 01      | AtumParam.h:1926
# DES_DEFENSE_02    = 23  | Defense value 02      | AtumParam.h:1927
# DES_DEFENSEPROBABILITY_01 = 24 | Evasion (dodge) | AtumParam.h:1928
# DES_DEFENSEPROBABILITY_02 = 25 | Evasion 02     | AtumParam.h:1929

# --- MOVIMIENTO ---
# DES_SPEED         = 28  | Movement speed        | AtumParam.h:1936
# DES_HP            = 13  | Max HP bonus          | AtumParam.h:1914
# DES_DP            = 89  | Max DP bonus          | AtumParam.h:1915
# DES_SP            = 14  | SP recovery           | AtumParam.h:1916

# --- SKILLS ESPECIALES ---
# DES_SKILL_SCANNING      = 144 | Reveal invisible   | AtumParam.h:2052
# DES_SKILL_ROLLING_TIME  = 170 | Chain Rolling buff | AtumParam.h:2088
# DES_SKILL_NO_WARNING    = 169 | Disable missile warning | AtumParam.h:2087
# DES_SKILL_INVINCIBLE    = 122 | Invincibility      | AtumParam.h:2030
# DES_SKILL_SLOWMOVING    = 138 | Slow target (*)    | AtumParam.h:2046
# DES_SKILL_REACTIONSPEED = 154 | Engine reaction (*)| AtumParam.h:2062
# DES_SKILL_ENGINEANGLE   = 155 | Engine rotation (*)| AtumParam.h:2063
# DES_SKILL_SMARTSP       = 148 | SP cost reduction (*)| AtumParam.h:2056
# DES_HYPER_BOOSTER       = 166 | Hyper Booster      | AtumParam.h:2082

# --- DRAIN ---
# DES_IMMEDIATE_HP_UP     = 59  | Instant HP heal    | AtumParam.h:1976
# DES_SKILL_MON_DRAIN     = 217 | Monster drain DOT  | AtumParam.h:2158
# DES_PAIR_DRAIN_1_RATE   = 220 | Drain trigger rate | AtumParam.h:2164
# DES_PAIR_DRAIN_2_HP_DP_UP_RATE = 221 | HP→DP conv% | AtumParam.h:2165
# DES_ANTI_DRAIN_RATE     = 222 | Anti-drain resist  | AtumParam.h:2166

# ═══════════════════════════════════════════════════════════════
# ARMAS POR TIPO EN AO
# ═══════════════════════════════════════════════════════════════
# ITEMKIND_MISSILE = 9 | ITEMKIND_ROCKET = 8
# ITEMKIND_SKILL_ATTACK = 50 | ITEMKIND_SKILL_DEFENSE = 51
# ITEMKIND_SKILL_SUPPORT = 52 | ITEMKIND_SKILL_ATTRIBUTE = 53

# Tipos de arma en nuestro juego:
# gatling, vulcan → arma estándar (weapon 1)
# rifle → arma estándar (weapon 1) M-Gear
# cannon → arma estándar (weapon 1) A-Gear
# missiles → arma avanzada (weapon 2) M-Gear
# bawoo → arma avanzada (weapon 2) B-Gear (Bawoos = ITEMKIND_MISSILE=9)
# massdrive → arma avanzada (weapon 2) A-Gear
# rifle → arma avanzada (weapon 2) I-Gear

# ═══════════════════════════════════════════════════════════════
# GBM / ABM (Bombing Modes)
# ═══════════════════════════════════════════════════════════════
# GBM (Ground Bombing Mode):
#   - Arma avanzada cae al suelo con gravedad
#   - Gravedad: -180 * dt por frame
#   - Sin steering (misiles van en línea recta + gravedad)
#   - Explotan en suelo o por proximidad al target
#   - Source: WeaponItemInfo.cpp, ShuttleChild.cpp:15142

# ABM (Air Bombing Mode):
#   - Arma avanzada se lanza hacia adelante y cae
#   - Target 3D: pos + fwd3d * radarRange (400)
#   - Sin steering, sin gravedad
#   - Explotan por distancia o cuando pasan el target
#   - Source: WeaponItemInfo.cpp, ShuttleChild.cpp:15203

# AMBOS son toggle (spPerSec: 3, duration: 999)
# NO son "buffs" — son modos de ataque

# ═══════════════════════════════════════════════════════════════
# MISSILE EXPLOSION DETECTION
# ═══════════════════════════════════════════════════════════════
# Misiles SIN steering (nuestro caso):
# 1. dist < 30 → explosión por proximidad
# 2. passedTarget → dot product check: si dist aumentando + velocity lejos del target
# 3. groundHit (GBM only) → cuando y <= 2

# Reticle:
# ABM: en espacio 3D, lookAt(ship) para billboard, se actualiza cada frame
# GBM: en suelo y=2, 80m ahead, rotación plana

# ═══════════════════════════════════════════════════════════════
# SKILL SLOT SYSTEM
# ═══════════════════════════════════════════════════════════════
# skillSlots[0..9] → teclas 1-0
# skillCooldowns[0..9] → tiempo restante de cooldown (se decrementa cada frame)
# skillActiveTimers[skillId] → tiempo restante de buff activo
# activeSkillEffects[skillId] → true si está activo
# Al activar: skillCooldowns[slot] = sk.cooldown
# Al expirar: delete skillActiveTimers[id], applySkillEffect(id, false)
# Toggle (spPerSec): se activa/desactiva manualmente, drena SP cada frame

# ═══════════════════════════════════════════════════════════════
# SKILL NUMBERING SCHEME (AO)
# ═══════════════════════════════════════════════════════════════
# Digits 1-2: 78 (skill prefix)
# Digit 3: UnitKind (3=I-Gear, 1=M-Gear, 2=A-Gear, 0=B-Gear)
# Digit 4: Skill kind (0=Attack, 1=Defense, 2=Control, 3=Attribute/Ultimate)
# Digits 5-6: Skill number
# Digit 7: Skill level (0 = BaseNum)

# Macros:
# SKILL_BASE_NUM(x)   = ((int)x/10)*10
# SKILL_LEVEL(x)      = (x - ((int)x/10)*10)
# SKILL_NUMBER(x)     = ((int)x/10) - ((int)x/1000)*100
# SKILL_KIND(x)       = ((int)x/1000) - ((int)x/10000)*10
# SKILL_UNIT_KIND(x)  = ((int)x/10000) - ((int)x/100000)*10
# Source: AtumParam.h:2431-2451

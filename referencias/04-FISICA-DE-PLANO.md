# Física de Vuelo y Cámara - Ace Online

# ═══════════════════════════════════════════════════════════════
# CÁMARA (AO Chase Camera)
# ═══════════════════════════════════════════════════════════════
# Cámara detrás del ship, sigue dirección de movimiento
# LookAt target = ship.position
# Distancia configurable, smoothing con lerp
# Camera shake al recibir daño

# ═══════════════════════════════════════════════════════════════
# MOVIMIENTO
# ═══════════════════════════════════════════════════════════════
# W/S: acelerar/frenar
# A/D: strafe lateral (invertido en commit anterior)
# Shift: boost (boostMaxSpeed)
# SpeedMin: velocidad mínima (si bajas de esto, caes)
# Si speed < speedMin → activates landing/grounded state
# C key: land/takeoff toggle
# GRAVITY = 98 (game units)

# ═══════════════════════════════════════════════════════════════
# TURNAROUND
# ═══════════════════════════════════════════════════════════════
# Giro 180° instantáneo
# Guarda startYaw, interpola deltaYaw en 0.35s
#movementAnim.turnaround

# ═══════════════════════════════════════════════════════════════
# BACK MOVE MACH
# ═══════════════════════════════════════════════════════════════
# Retroceso 1000m a 600m/s
# Guarda startPos, interpola posición en 0.3s
# movementAnim.backMove

# ═══════════════════════════════════════════════════════════════
# TARGETING (AO Style)
# ═══════════════════════════════════════════════════════════════
# Tab para target más cercano
# Auto-target mobs que te atacan
# Reticle en target seleccionado
# Radar range para ABM: 400 units

# ═══════════════════════════════════════════════════════════════
# SIEGE MODE (A-Gear)
# ═══════════════════════════════════════════════════════════════
# Ship queda inmóvil
# +100% daño, +rango
# Fusión con turret (torreta)
# Can mover mira con mouse
# Source: AtumParam.h:2473 (AGEAR_SKILL_BASENUM_SIEGEMODE=7820050)

# ═══════════════════════════════════════════════════════════════
# OVERHEAT SYSTEM
# ═══════════════════════════════════════════════════════════════
# stdHeat / advHeat se acumulan al disparar
# overheatTime: segundos hasta overheat
# Si stdOverheated/advOverheated = true → no puede disparar esa arma
# Enfria con el tiempo (stdHeat -= dt, advHeat -= dt)

# ═══════════════════════════════════════════════════════════════
# Firing Patterns
# ═══════════════════════════════════════════════════════════════
# pattern: [shotNum, multiNum]
# shotNum: cuántos proyectiles por ráfaga
# multiNum: cuántos targets simultáneos
# shotNum=4, multiNum=1 → 4 balas a 1 target
# shotNum=1, multiNum=2 → 1 bala a 2 targets

# ═══════════════════════════════════════════════════════════════
# DAMAGE FORMULA
# ═══════════════════════════════════════════════════════════════
# baseDamage = random(minDmg, maxDmg) + skill bonuses
# Crit: multiplied by critMultiplier
# Pierce: ignores defense
# AoE: radius check from explosion point
# registerHit() usa 'dmg' no 'damage' (bug fix anterior)

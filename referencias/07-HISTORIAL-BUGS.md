# Historial de Commits y Bug Fixes Importantes

# ═══════════════════════════════════════════════════════════════
# COMMITS RECIENTES (orden cronológico)
# ═══════════════════════════════════════════════════════════════

# 1. f423cb5 - "feat: Added 15s cooldown for non-toggle buff skills (SKILL_TYPE_BUFF)"
#    - Agregó cooldown 15s para buff skills que no son toggle
#    - Problem: también afectó GBM/ABM que NO son buffs

# 2. 0ab0b7d - "fix: Only apply cooldown to true buffs, not GBM/ABM attack modes"
#    - Revert: GBM/ABM vuelven a cd=0
#    - Agregó cooldown-after-expiry: si cd=0 and duration>0 and !spPerSec → cd=duration-10
#    - Esto hacía que al expirar un buff, el cooldown se pusiera automáticamente

# 3. 22ec54e - "feat: Changed skill duration from 60s to 240s (4 minutes)"
#    - Todos los skills buff cambiados de 60s a 240s duration

# 4. 57c962c - "feat: Updated all skills to AO high-level values"
#    - TODOS los skills de TODOS los gears actualizados con stats reales de AO
#    - Data source: omi.tex parseado del cliente EP46
#    - Incluyó HealDuck raging skills

# 5. 2898769 - "feat: Updated M-Gear (HealDuck) skills to AO high-level values"
#    - HealDuck: healingField, energizingField, healTarget, energiseTarget, reverseEngine, fullRecovery, scan

# ═══════════════════════════════════════════════════════════════
# BUG FIXES HISTÓRICOS (verificados en código)
# ═══════════════════════════════════════════════════════════════

# turnaround - El giro 180° se desactivaba solo
# missile dmg - Daño de misiles no se aplicaba
# berserker reattack - Cooldown de berserker no funcionaba
# invisible vs boss - Jefes no veían jugadores invisibles
# Q/E slots - Skills no se asignaban a Q y E
# deployChaffs - Chaffs no funcionaban
# gear selection - Selección de gear no funcionaba
# standard weapon firing - Arma estándar no disparaba
# damage vs dmg - Variable 'damage' no existía, era 'dmg' en registerHit
# speedMin fix - speedMin no existía como propiedad del gear
# A/D strafe inversion - A iba a la derecha y B a la izquierda
# Cat event removed - Evento de gato eliminado (commit 04993fe)
# GBM/ABM reworked - Bomb system eliminado, GBM/ABM son weapon mode modifiers
# skill panel + drag-and-drop - Panel de skills con drag-and-drop
# model system made generic - swapDuckModelIfReady → swapModelIfReady
# Git LFS removed - LFS no funciona con GitHub Pages
# ABM targeting fix - Target 3D, reticle en espacio 3D no en suelo
# GBM/ABM missile flight - NO steering, GBM gravedad, ABM línea recta

# ═══════════════════════════════════════════════════════════════
# ARCHIVOS CRÍTICOS EN EL CÓDIGO
# ═══════════════════════════════════════════════════════════════
# Línea ~875:   GEAR_CONFIGS (stats, weapons, skills de cada gear)
# Línea ~1434:  SKILL_ICON_MAP (mapeo skillId → icono)
# Línea ~2790:  GEAR_MODELS (modelKey por gear)
# Línea ~3570:  FIRE_WEAPON por tipo (gatling, missiles, bawoo, etc)
# Línea ~3650:  Firing pattern (shotNum, multiNum)
# Línea ~3715:  MISSILE_HOMING_SPEED
# Línea ~3805:  Boss configuration (scale, speed, hp, etc)
# Línea ~4195:  updateSkills() - decrement cooldowns, check expiry
# Línea ~4250:  activateSkill() - set cooldowns, apply effects
# Línea ~5095:  applySkillEffect() - toggle effects on/off

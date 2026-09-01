# Gear Configs - Stats y Weapons de Ace Online

# ═══════════════════════════════════════════════════════════════
# CÓDIGO EN EL JUEGO
# ═══════════════════════════════════════════════════════════════
# GEAR_CONFIGS está en index.html alrededor de la línea 875
# Cada gear tiene: name, role, icon, desc, weapons, stats, passives, activeSkills, movement, modelKey

# ═══════════════════════════════════════════════════════════════
# I-GEAR (CrimsonAttack) — Interceptor
# ═══════════════════════════════════════════════════════════════
# Model: Crimson.glb | modelKey: 'crimson'
# Role: "El más rápido del campo de batalla. Daño y evasión."
# BaseNums: 783xxxx

# Weapons:
# Standard: Vulcan  | pattern [4,1] | dmg 32 | speed 220 | reattack 0.6s | overheat 15s | accuracy 65%
# Advanced: Rifle   | pattern [1,1] | dmg 120| speed 260 | reattack 0.55s| overheat 24s | accuracy 85%
# AO real: Vulcan 4x1, 30-50 dmg, 0.6s reattack
# AO real: Rifle 1x1, 90-140 dmg, 0.55s reattack

# Stats:
# maxSpeed: 110 | boostMax: 280 | speedMin: 80 | accel: 55 | boostAccel: 90
# defense: 2 | evasion: 8 | shield: 2 | hp: 4

# Passives: (ninguno por ahora)

# Skills:
# Fire Shot       | Ataque    | spCost:10 | cd:410 | dur:420
# Missile Shot    | Ataque    | spCost:10 | cd:410 | dur:420
# Frenzy          | Ataque    | spCost:35 | cd:290 | dur:300
# Berserker       | Ataque    | spCost:40 | cd:900 | dur:30
# Concentration   | Atributo  | spCost:10 | cd:410 | dur:420
# Overbooster     | Control   | spCost:30 | cd:25  | dur:3
# Chain Rolling   | Control   | spCost:25 | cd:20  | dur:8
# Hyper Moving    | Atributo  | spCost:30 | cd:50  | dur:60
# Defense Up      | Defensa   | spCost:10 | cd:290 | dur:300
# Evasion Up      | Defensa   | spCost:10 | cd:290 | dur:300
# Drain           | Ataque    | spCost:25 | cd:20  | dur:20
# Scanning        | Atributo  | spCost:15 | cd:3   | dur:10

# Movement:
# Q: Turnaround (cd:8) — Giro 180° instantáneo
# E: Back Move Mach (cd:15) — Retroceso 1000m a 600m/s

# ═══════════════════════════════════════════════════════════════
# A-GEAR (MecanoTank) — Tanque / Asedio
# ═══════════════════════════════════════════════════════════════
# Model: Mecano.glb | modelKey: 'mecano'
# Role: "Pesado y letal. Siege mode y defensa."
# BaseNums: 782xxxx

# Weapons:
# Standard: Cañón  | pattern [1,1] | dmg 175| speed 180 | reattack 0.45s| overheat 30s | accuracy 85% | pierce
# Advanced: Mass Drive | pattern [1,1] | dmg 130| speed 240 | reattack 0.43s| overheat 28s | accuracy 100% | pierce
# AO real: Cannon 1x1, 157-197 dmg, 0.45s reattack, 85% accuracy, 28-50s overheat, 1200m range

# Stats:
# maxSpeed: 55 | boostMax: 140 | speedMin: 40 | accel: 20 | boostAccel: 40
# defense: 8 | evasion: 1 | shield: 8 | hp: 10

# Passives:
# Collision Absorption | -40% daño de choques (collisionDmgReduction: 0.4)
# Siege Defense | +50% defensa extra en siege (siegeDefenseBonus: 0.5)
# Ground Accelerator | +60% velocidad (speedBonus: 0.6)

# Skills:
# Fire Shot       | Ataque    | spCost:10 | cd:410 | dur:420
# Missile Shot    | Ataque    | spCost:10 | cd:410 | dur:420
# Concentration   | Atributo  | spCost:10 | cd:410 | dur:420
# Siege Mode      | Ataque    | spCost:25 | cd:20  | dur:15
# Air Siege Mode  | Ataque    | spCost:30 | cd:22  | dur:12
# Hyper Shot      | Ataque    | spCost:35 | cd:30  | dur:0
# Snare Shot      | Ataque    | spCost:15 | cd:50  | dur:10
# Defense Up      | Defensa   | spCost:10 | cd:290 | dur:300
# Barrier         | Defensa   | spCost:30 | cd:60  | dur:15
# Reflect         | Defensa   | spCost:30 | cd:25  | dur:15
# Remedy          | Defensa   | spCost:10 | cd:10  | dur:0

# Movement: null (no tiene)

# ═══════════════════════════════════════════════════════════════
# B-GEAR (TeddyBomb) — Bombardero
# ═══════════════════════════════════════════════════════════════
# Model: oso.glb (teddy bear) | modelKey: 'teddy'
# Role: "Versátil y destructivo. Daño masivo de una sola ráfaga."
# BaseNums: 780xxxx

# Weapons:
# Standard: Gatling | pattern [3,1] | dmg 22 | speed 210 | reattack 0.5s | overheat 11s | accuracy 80%
# Advanced: Bawoos  | pattern [2,3] | dmg 85 | speed 80  | reattack 1.8s | overheat 20s | accuracy 70% | aoeRadius:30
# AO real: Gatling 3x1, lower base dmg, fast fire, 11s overheat
# AO real: Missiles 2x2, slow, AoE bombing

# Stats:
# maxSpeed: 80 | boostMax: 180 | speedMin: 60 | accel: 45 | boostAccel: 75
# defense: 5 | evasion: 3 | shield: 5 | hp: 7

# Passives:
# Reduce Damage | -25% daño recibido (dmgReduction: 0.25)

# Skills:
# Fire Shot           | Ataque    | spCost:10 | cd:410 | dur:420
# Missile Shot        | Ataque    | spCost:10 | cd:410 | dur:420
# Concentration       | Atributo  | spCost:10 | cd:410 | dur:420
# Ground Bombing Mode | Ataque    | spCost:0  | cd:0   | dur:999 | spPerSec:3 (toggle)
# Air Bombing Mode    | Ataque    | spCost:0  | cd:0   | dur:999 | spPerSec:3 (toggle)
# Charging Shot       | Ataque    | spCost:20 | cd:12  | dur:0
# Multi-Target Mode   | Ataque    | spCost:25 | cd:18  | dur:12
# Deploy Chaffs       | Defensa   | spCost:20 | cd:120 | dur:60
# Defense Up          | Defensa   | spCost:10 | cd:290 | dur:300
# Big Boom            | Atributo  | spCost:50 | cd:1800| dur:0

# Movement:
# Q: Turnaround (cd:8) — Giro 180° instantáneo
# E: Back Move Mach (cd:15) — Retroceso 1000m a 600m/s

# ═══════════════════════════════════════════════════════════════
# M-GEAR (HealDuck) — Soporte
# ═══════════════════════════════════════════════════════════════
# Model: pato.glb (duck) | modelKey: 'duck'
# Role: "La columna vertebral del equipo. Curación y buffs."
# BaseNums: 781xxxx

# Weapons:
# Standard: Rifle   | pattern [1,1] | dmg 45 | speed 230 | reattack 0.55s| overheat 24s | accuracy 90%
# Advanced: Misiles | pattern [1,2] | dmg 35 | speed 130 | reattack 1.9s | overheat 16s | accuracy 80%
# AO real: 0-speed hover engine, Rifle 1x1 high accuracy low damage

# Stats:
# maxSpeed: 65 | boostMax: 150 | speedMin: 45 | accel: 30 | boostAccel: 55
# defense: 6 | evasion: 5 | shield: 6 | hp: 7

# Passives:
# Elevation | +30% daño arma estándar (stdDmgBonus: 0.3)
# Smart SP | -30% SP cost de todas las skills (spCostReduction: 0.3)

# Skills:
# Healing Field      | Defensa   | spCost:20 | cd:1   | dur:15
# Energizing Field   | Atributo  | spCost:15 | cd:1   | dur:15
# Heal Target        | Defensa   | spCost:20 | cd:1   | dur:0
# Energise Target    | Atributo  | spCost:10 | cd:1   | dur:0
# Reverse Engine     | Aire      | spCost:25 | cd:0   | dur:0
# Full Recovery      | Atributo  | spCost:50 | cd:900 | dur:0
# Scan               | Atributo  | spCost:15 | cd:3   | dur:10
# Raging Fire        | Atributo  | spCost:20 | cd:410 | dur:420
# Raging Defence     | Atributo  | spCost:20 | cd:410 | dur:420
# Raging Evasion     | Atributo  | spCost:20 | cd:410 | dur:420

# Movement: null (no tiene)

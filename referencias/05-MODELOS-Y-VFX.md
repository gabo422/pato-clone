# Modelos 3D y VFX - Referencia

# ═══════════════════════════════════════════════════════════════
# ARCHIVOS DE MODELOS (Draco-compressed)
# ═══════════════════════════════════════════════════════════════
# Directorio: D:\Pato-Clone\modelos\
# Compresión: @gltf-transform/cli draco
# Loader: DRACOLoader desde CDN (three@0.128.0/examples/js/loaders/DRACOLoader.js)
# Decoder path: https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/

# pato.glb    (27MB) → M-Gear (HealDuck)   → modelKey: 'duck'
# oso.glb     (10MB) → B-Gear (TeddyBomb)  → modelKey: 'teddy'
# boat.glb    (7MB)  → Bote decorativo
# Crimson.glb (19MB) → I-Gear (CrimsonAttack) → modelKey: 'crimson'
# Mecano.glb  (7.5MB)→ A-Gear (MecanoTank)   → modelKey: 'mecano'

# ═══════════════════════════════════════════════════════════════
# CÓMO SE CARGAN
# ═══════════════════════════════════════════════════════════════
# preloadModels() usa GLTFLoader + DRACOLoader
# DRACOLoader configurado con path al decoder:
#   dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/')
# Resultado guardado en modelCache[modelKey] = gltf.scene
# swapModelIfReady() reemplaza el modelo actual por el nuevo

# ═══════════════════════════════════════════════════════════════
# MODELO POR GEAR
# ═══════════════════════════════════════════════════════════════
# I-Gear (CrimsonAttack): Crimson.glb, escala ~0.3, scale vec(0.3, 0.3, 0.3)
# A-Gear (MecanoTank): Mecano.glb, escala ~0.3, scale vec(0.3, 0.3, 0.3)
# B-Gear (TeddyBomb): oso.glb, escala ~0.4, scale vec(0.4, 0.4, 0.4)
# M-Gear (HealDuck): pato.glb, escala ~0.3, scale vec(0.3, 0.3, 0.3)

# ═══════════════════════════════════════════════════════════════
# VFX SYSTEM
# ═══════════════════════════════════════════════════════════════
# Efectos al activar skills: flashes, auras, particles
# Explosiones de misiles: sphere + flash + debris
# Contrails en proyectiles
# Overheat: glow rojo en el modelo

# ═══════════════════════════════════════════════════════════════
# ICONOS
# ═══════════════════════════════════════════════════════════════
# icons/skills_ace/      → iconos AO filtrados
# icons/skills_ace_all/  → TODOS los iconos AO (93 archivos)
# SKILL_ICON_MAP en código mapea skillId → nombre de archivo

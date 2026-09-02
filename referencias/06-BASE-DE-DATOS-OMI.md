# Base de Datos OMI.TEX - Cómo Parsear

# ═══════════════════════════════════════════════════════════════
# ARCHIVO
# ═══════════════════════════════════════════════════════════════
# Ruta: D:\02.1ClientAceOnline_EP46_EnglishVer\ClientAceOnline_EP46_EnglishVer\Res-Tex\omi.tex
# Tamaño: 14,034,532 bytes
# Formato: binario con items ITEM serializados

# ═══════════════════════════════════════════════════════════════
# HEADER (8 bytes)
# ═══════════════════════════════════════════════════════════════
# Bytes 0-3:  int32 nType     (0 = first section)
# Bytes 4-7:  int32 nDataCount (15,758 items en primer sector)

# ═══════════════════════════════════════════════════════════════
# ITEM STRUCT (576 bytes cada uno)
# ═══════════════════════════════════════════════════════════════
# sizeof(ITEM) = 576 bytes con MSVC 32-bit
# Source: D:\PatoClon-Proyecto\server\Common\AtumParam.h (línea ~3000)

# Offsets importantes:
# +0:    int32   UniqueNumber (ItemNum)
# +5:    char[40] ItemName
# +46:   char[50] Description
# +97:   int32   Kind (1=PKG, 9=MISSILE, 50-53=Skill types)
# +101:  int32   TargetType (1=enemy, 2=self, 3=friendly, 4=area)
# +105:  int32   Rarity (0=common, 1=uncommon, 2=rare, 3=epic)
# +113:  int32   ReqUnitKind (bitmask: 1=BI, 2=AI, 4=KI, 8=MI)
# +117:  int32   ReqSPCost
# +121:  int32   ReqSkillLevel (0 = base)
# +133:  int32   ReAttackTime (ms) — ← COOLDOWN REAL
# +137:  int32   Time (ms) — ← DURACIÓN REAL
# +168:  uint32  ReAttacktime (UINT, ms) ← alternative offset
# +172:  int32   Time (INT, ms) ← alternative offset
# +181:  int32   Range (para scanning, reticle distance)
# +185:  int32   AttackProbability
# +189:  float   Damage (for weapons)

# DES PARAMETERS (desde +193 en adelante):
# Size_MAX_DESPARAM_COUNT_IN_ITEM = 8 slots
# Cada slot tiene:
#   ArrDestParameter[i]: int32 (DesParam ID)
#   ArrParameterValue[i]: float (valor)

# ═══════════════════════════════════════════════════════════════
# TIPOS DE ITEM (Kind)
# ═══════════════════════════════════════════════════════════════
# 1  = PKG (package/box)
# 2  = BULLET (standard weapon ammo)
# 3  = CASH (premium currency)
# 4  = GIFT (gift item)
# 5  = KEY (key item)
# 6  = AUDIO (audio file)
# 7  = EFFECT (effect)
# 8  = ROCKET
# 9  = MISSILE
# 10 = SHIELD
# 11 = ARMOR
# 12 = ENGIN
# 13 = PLUGIN
# 14 = UNITUID
# 15 = QUEST
# 16 = PREMIUM
# 17 = SKILL (old, not used)
# 50 = SKILL_ATTACK
# 51 = SKILL_DEFENSE
# 52 = SKILL_SUPPORT
# 53 = SKILL_ATTRIBUTE

# ═══════════════════════════════════════════════════════════════
# CÓMO PARSEARLO (Python o Node.js)
# ═══════════════════════════════════════════════════════════════
# Python:
#   import struct
#   with open('omi.tex', 'rb') as f:
#       header = f.read(8)
#       nType, nDataCount = struct.unpack('<ii', header)
#       for i in range(nDataCount):
#           item_data = f.read(576)
#           itemNum = struct.unpack('<i', item_data[0:4])[0]
#           name = item_data[5:45].split(b'\x00')[0].decode('utf-8', errors='ignore')
#           kind = struct.unpack('<i', item_data[97:101])[0]
#           reqUnitKind = struct.unpack('<i', item_data[113:117])[0]
#           spCost = struct.unpack('<i', item_data[117:121])[0]
#           reqSkillLevel = struct.unpack('<i', item_data[121:125])[0]
#           reAttackTime = struct.unpack('<I', item_data[168:172])[0]  # UINT
#           time = struct.unpack('<i', item_data[172:176])[0]          # INT

# # Skills I-Gear (ReqUnitKind bitmask incluye bit 2 = 4 = ST/IGEAR):
# for i in range(nDataCount):
#     item_data = f.read(576)
#     reqUnitKind = struct.unpack('<i', item_data[113:117])[0]
#     if reqUnitKind & 4:  # I-Gear
#         kind = struct.unpack('<i', item_data[97:101])[0]
#         if kind in (50,51,52,53):  # skill types
#             # print item info

# ═══════════════════════════════════════════════════════════════
# MAPEO DE ReqUnitKind A GEARS
# ═══════════════════════════════════════════════════════════════
# Bit 0 (1) = B-GEAR (BT/TeddyBomb)
# Bit 1 (2) = M-GEAR (OT/HealDuck)
# Bit 2 (4) = I-GEAR (ST/CrimsonAttack)
# Bit 3 (8) = A-GEAR (DT/MecanoTank)

# ═══════════════════════════════════════════════════════════════
# EXCEL-SERVER (alternate parsing)
# ═══════════════════════════════════════════════════════════════
# Source: D:\PatoClon-Proyecto\server\GameServer\AtumMonitor\LoadExcelFile.cpp
# Mapea columnas CSV a campos de ITEM:
# case 48: pITEM->ReAttacktime = atoi(pToken) ← UINT
# case 49: pITEM->Time = atoi(pToken) ← INT
# case 50: pITEM->Range = atoi(pToken)
# case 52: pITEM->Repeat = atoi(pToken)
# case 58: pITEM->ReqSPCost = atoi(pToken)
# case 74-81: pITEM->ArrDestParameter[0-7]
# case 82-89: pITEM->ArrParameterValue[0-7]
# case 90: pITEM->Factor = atof(pToken)
# case 98: pITEM->LinkItem = atoi(pToken)

# ═══════════════════════════════════════════════════════════════
# BASENUMS DE SKILLS EN EL ARCHIVO
# ═══════════════════════════════════════════════════════════════
# I-Gear (ST): 783xxxx → ReqUnitKind = 4
# M-Gear (OT): 781xxxx → ReqUnitKind = 2
# A-Gear (DT): 782xxxx → ReqUnitKind = 8
# B-Gear (BT): 780xxxx → ReqUnitKind = 1

# Encontrados en el archivo:
# 7830040/7830041/7830042 (Kind=50) → I-Gear weapons
# 7833050/7833051/7833052 (Kind=51) → I-Gear defense skills
# 7834010/7834011/7834012 (Kind=52) → I-Gear support skills
# 7835010/7835011/7835012 (Kind=53) → I-Gear attribute skills

# Weapons encontrados para I-Gear:
# 7810010/7810011 (Kind=50) → Rifle (reqUnitKind=2, M-Gear)
# 7810030/7810031 (Kind=50) → Misiles (reqUnitKind=2, M-Gear)
# 7820010/7820011 (Kind=50) → Cañón (reqUnitKind=8, A-Gear)
# 7820030/7820031 (Kind=50) → Mass Drive (reqUnitKind=8, A-Gear)
# 7830010/7830011 (Kind=50) → Vulcan (reqUnitKind=4, I-Gear)
# 7830030/7830031 (Kind=50) → Rifle (reqUnitKind=4, I-Gear)
# 7840010/7840011 (Kind=50) → Gatling (reqUnitKind=1, B-Gear)
# 7840030/7840031 (Kind=50) → Bawoos (reqUnitKind=1, B-Gear)

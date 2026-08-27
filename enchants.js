// ================= SISTEMA DE CARTAS DE ENCHANT =================
// Archivo separado para mantener index.html limpio
// Dependencias: variables globales de index.html (selectedGear, waveNumber, etc.)

// ================= 1. DEFINICIÓN DE CARTAS =================
const ENCHANT_CARDS = [
  // ATTACK (daño arma estándar)
  { id: 'atk_common',    name: 'Attack I',    stat: 'stdDmgBonus',    rarity: 'common',    baseValue: 0.05, icon: '⚔️' },
  { id: 'atk_rare',      name: 'Attack II',   stat: 'stdDmgBonus',    rarity: 'rare',      baseValue: 0.10, icon: '⚔️' },
  { id: 'atk_epic',      name: 'Attack III',  stat: 'stdDmgBonus',    rarity: 'epic',      baseValue: 0.15, icon: '⚔️' },
  { id: 'atk_legendary', name: 'Attack IV',   stat: 'stdDmgBonus',    rarity: 'legendary', baseValue: 0.20, icon: '⚔️' },

  // ACCURACY (precisión)
  { id: 'acc_common',    name: 'Accuracy I',    stat: 'accuracyBonus', rarity: 'common',    baseValue: 0.05, icon: '🎯' },
  { id: 'acc_rare',      name: 'Accuracy II',   stat: 'accuracyBonus', rarity: 'rare',      baseValue: 0.10, icon: '🎯' },
  { id: 'acc_epic',      name: 'Accuracy III',  stat: 'accuracyBonus', rarity: 'epic',      baseValue: 0.15, icon: '🎯' },
  { id: 'acc_legendary', name: 'Accuracy IV',   stat: 'accuracyBonus', rarity: 'legendary', baseValue: 0.20, icon: '🎯' },

  // DEFENSE (defensa)
  { id: 'def_common',    name: 'Defense I',    stat: 'defenseBonus', rarity: 'common',    baseValue: 0.05, icon: '🛡️' },
  { id: 'def_rare',      name: 'Defense II',   stat: 'defenseBonus', rarity: 'rare',      baseValue: 0.10, icon: '🛡️' },
  { id: 'def_epic',      name: 'Defense III',  stat: 'defenseBonus', rarity: 'epic',      baseValue: 0.15, icon: '🛡️' },
  { id: 'def_legendary', name: 'Defense IV',   stat: 'defenseBonus', rarity: 'legendary', baseValue: 0.20, icon: '🛡️' },

  // EVASION (evasión)
  { id: 'eva_common',    name: 'Evasion I',    stat: 'evasionBonus', rarity: 'common',    baseValue: 0.05, icon: '💨' },
  { id: 'eva_rare',      name: 'Evasion II',   stat: 'evasionBonus', rarity: 'rare',      baseValue: 0.10, icon: '💨' },
  { id: 'eva_epic',      name: 'Evasion III',  stat: 'evasionBonus', rarity: 'epic',      baseValue: 0.15, icon: '💨' },
  { id: 'eva_legendary', name: 'Evasion IV',   stat: 'evasionBonus', rarity: 'legendary', baseValue: 0.20, icon: '💨' },

  // OVERHEAT (reducción de recarga)
  { id: 'ovh_common',    name: 'Overheat I',    stat: 'overheatReduction', rarity: 'common',    baseValue: 0.05, icon: '🔥' },
  { id: 'ovh_rare',      name: 'Overheat II',   stat: 'overheatReduction', rarity: 'rare',      baseValue: 0.10, icon: '🔥' },
  { id: 'ovh_epic',      name: 'Overheat III',  stat: 'overheatReduction', rarity: 'epic',      baseValue: 0.15, icon: '🔥' },
  { id: 'ovh_legendary', name: 'Overheat IV',   stat: 'overheatReduction', rarity: 'legendary', baseValue: 0.20, icon: '🔥' },

  // SP REDUCTION (costo de skills)
  { id: 'sp_common',    name: 'SP I',    stat: 'spCostReduction', rarity: 'common',    baseValue: 0.05, icon: '💫' },
  { id: 'sp_rare',      name: 'SP II',   stat: 'spCostReduction', rarity: 'rare',      baseValue: 0.10, icon: '💫' },
  { id: 'sp_epic',      name: 'SP III',  stat: 'spCostReduction', rarity: 'epic',      baseValue: 0.15, icon: '💫' },
  { id: 'sp_legendary', name: 'SP IV',   stat: 'spCostReduction', rarity: 'legendary', baseValue: 0.20, icon: '💫' },

  // PIERCE (ignora defensa)
  { id: 'prc_common',    name: 'Pierce I',    stat: 'pierceBonus', rarity: 'common',    baseValue: 0.05, icon: '🗡️' },
  { id: 'prc_rare',      name: 'Pierce II',   stat: 'pierceBonus', rarity: 'rare',      baseValue: 0.10, icon: '🗡️' },
  { id: 'prc_epic',      name: 'Pierce III',  stat: 'pierceBonus', rarity: 'epic',      baseValue: 0.15, icon: '🗡️' },
  { id: 'prc_legendary', name: 'Pierce IV',   stat: 'pierceBonus', rarity: 'legendary', baseValue: 0.20, icon: '🗡️' },
];

const ENCHANT_RARITY_COLORS = {
  common:    '#aaaaaa',
  rare:      '#4488ff',
  epic:      '#aa44ff',
  legendary: '#ffaa00'
};

const ENCHANT_RARITY_LABELS = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary'
};

const CARD_STAT_LABELS = {
  stdDmgBonus:     '+Daño Estándar',
  accuracyBonus:   '+Precisión',
  defenseBonus:    '+Defensa',
  evasionBonus:    '+Evasión',
  overheatReduction: '-Recarga',
  spCostReduction: '-Costo SP',
  pierceBonus:     '+Pierce'
};

// ================= 2. SISTEMA DE SEED =================
let currentRunSeed = null;

function generateRunSeed() {
  return Math.floor(1000 + Math.random() * 9000);
}

function calculateDrop(seed, waveNumber, gearKey, bossEncounters) {
  const rarityRoll = (seed + waveNumber * 7 + bossEncounters * 31) % 100;
  const gearMod = { rayo: 0, muro: 1, trueno: 2, viento: 3 };
  const typeRoll = (seed + waveNumber * 3 + (gearMod[gearKey] || 0) * 13) % 7;

  const rarity = getRarityFromRoll(rarityRoll);
  if (!rarity) return null;

  const cardTypes = ['atk', 'acc', 'def', 'eva', 'ovh', 'sp', 'prc'];
  const cardType = cardTypes[typeRoll];

  return { id: cardType + '_' + rarity, type: cardType, rarity: rarity };
}

function getRarityFromRoll(roll) {
  if (roll >= 90) return 'legendary';
  if (roll >= 75) return 'epic';
  if (roll >= 45) return 'rare';
  if (roll >= 15) return 'common';
  return null;
}

function getCardData(cardId) {
  return ENCHANT_CARDS.find(function(c) { return c.id === cardId; });
}

function getCardValue(cardId, level) {
  var data = getCardData(cardId);
  if (!data) return 0;
  return data.baseValue + (level - 1) * 0.01;
}

// ================= 3. ESTADO DEL JUGADOR =================
var playerInventory = {
  cards: [],
  energy: 100,
  maxEnergy: 100,
  energyRegenRate: 1
};

var gearEnchants = {
  rayo:   [null, null],
  muro:   [null, null],
  trueno: [null, null],
  viento: [null, null]
};

// ================= 4. PERSISTENCIA =================
function saveInventory() {
  try {
    localStorage.setItem('patoClone_inventory', JSON.stringify(playerInventory));
    localStorage.setItem('patoClone_enchants', JSON.stringify(gearEnchants));
    if (currentRunSeed !== null) localStorage.setItem('patoClone_runSeed', String(currentRunSeed));
  } catch (e) {}
}

function loadInventory() {
  try {
    var inv = localStorage.getItem('patoClone_inventory');
    var ench = localStorage.getItem('patoClone_enchants');
    var seed = localStorage.getItem('patoClone_runSeed');
    if (inv) playerInventory = JSON.parse(inv);
    if (ench) gearEnchants = JSON.parse(ench);
    if (seed) currentRunSeed = parseInt(seed);
  } catch (e) {}
}

// ================= 5. FUNCIONES DE INVENTARIO =================
function addCardToInventory(card) {
  var existing = null;
  for (var i = 0; i < playerInventory.cards.length; i++) {
    if (playerInventory.cards[i].id === card.id) {
      existing = playerInventory.cards[i];
      break;
    }
  }
  if (existing) {
    existing.level++;
  } else {
    playerInventory.cards.push({ id: card.id, level: 1 });
  }
  saveInventory();
  renderInventoryUI();
}

function removeCardFromInventory(cardId) {
  for (var i = playerInventory.cards.length - 1; i >= 0; i--) {
    if (playerInventory.cards[i].id === cardId) {
      playerInventory.cards.splice(i, 1);
      break;
    }
  }
  saveInventory();
}

function upgradeCard(cardId) {
  var card = null;
  for (var i = 0; i < playerInventory.cards.length; i++) {
    if (playerInventory.cards[i].id === cardId) {
      card = playerInventory.cards[i];
      break;
    }
  }
  if (!card) return false;

  var cost = 10 + (card.level - 1) * 5;
  if (playerInventory.energy < cost) return false;
  if (card.level >= 10) return false;

  playerInventory.energy -= cost;
  card.level++;
  saveInventory();
  renderInventoryUI();
  return true;
}

function equipCard(cardId, gearKey, slotIndex) {
  var invCard = null;
  for (var i = 0; i < playerInventory.cards.length; i++) {
    if (playerInventory.cards[i].id === cardId) {
      invCard = playerInventory.cards[i];
      break;
    }
  }
  if (!invCard) return false;
  if (!gearEnchants[gearKey] || slotIndex >= gearEnchants[gearKey].length) return false;

  var oldCard = gearEnchants[gearKey][slotIndex];
  if (oldCard) {
    removeCardFromInventory(oldCard.id);
  }

  gearEnchants[gearKey][slotIndex] = { id: cardId, level: invCard.level };
  removeCardFromInventory(cardId);
  saveInventory();
  renderEnchantSlots();
  return true;
}

function unequipCard(gearKey, slotIndex) {
  if (!gearEnchants[gearKey] || slotIndex >= gearEnchants[gearKey].length) return false;
  var ench = gearEnchants[gearKey][slotIndex];
  if (!ench) return false;

  var data = getCardData(ench.id);
  if (data) {
    addCardToInventory({ id: ench.id, rarity: data.rarity });
  }
  gearEnchants[gearKey][slotIndex] = null;
  saveInventory();
  renderEnchantSlots();
  return true;
}

// ================= 6. ENCHANT BONUSES =================
function getEnchantBonus(stat) {
  var bonus = 0;
  var enchants = gearEnchants[selectedGear] || [];
  for (var i = 0; i < enchants.length; i++) {
    if (!enchants[i]) continue;
    var data = getCardData(enchants[i].id);
    if (data && data.stat === stat) {
      bonus += getCardValue(enchants[i].id, enchants[i].level);
    }
  }
  return bonus;
}

// ================= 7. DROPS =================
function tryDropCard(enemy, wave, gear, bossEnc) {
  if (typeof scene === 'undefined' || typeof ship === 'undefined') return;
  if (!currentRunSeed) return;

  var drop = null;

  if (enemy.isBoss) {
    var seed = (currentRunSeed + wave * 7 + bossEnc * 31) % 100;
    var gearMod = { rayo: 0, muro: 1, trueno: 2, viento: 3 };
    var typeRoll = (currentRunSeed + wave * 3 + (gearMod[gear] || 0) * 13) % 7;
    var rarityRoll = Math.max(seed, 45);

    var rarity = getRarityFromRoll(rarityRoll);
    if (!rarity) rarity = 'rare';

    var cardTypes = ['atk', 'acc', 'def', 'eva', 'ovh', 'sp', 'prc'];
    drop = { id: cardTypes[typeRoll] + '_' + rarity, type: cardTypes[typeRoll], rarity: rarity };
  } else if (wave >= 3) {
    var roll = (currentRunSeed + wave * 7) % 100;
    if (roll < 15) {
      drop = calculateDrop(currentRunSeed, wave, gear, 0);
    }
  }

  if (drop) {
    addCardToInventory(drop);
    spawnCardDrop(enemy.mesh.position.clone(), drop);
    showCardPickupNotification(drop);
    var invOverlay = document.getElementById('inventoryOverlay');
    var invHint = document.getElementById('inventoryHint');
    if (invHint && invOverlay && invOverlay.classList.contains('hidden')) {
      invHint.classList.remove('hidden');
    }
  }
}

// ================= 8. VISUAL DE CARTAS DROPEADAS =================
var droppedCards = [];

var CARD_DROP_COLORS = {
  common:    0xaaaaaa,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xffaa00
};

function buildCardDropMesh(card) {
  if (typeof THREE === 'undefined') return null;
  var color = CARD_DROP_COLORS[card.rarity] || 0xaaaaaa;
  var group = new THREE.Group();

  var core = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.6, 0),
    new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.3
    })
  );
  group.add(core);

  var ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.6, 0.25, 8, 20),
    new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5
    })
  );
  ring.rotation.x = Math.PI / 2.3;
  group.add(ring);

  return group;
}

function spawnCardDrop(position, card) {
  if (droppedCards.length >= 5) return;
  if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;

  var mesh = buildCardDropMesh(card);
  if (!mesh) return;

  mesh.position.copy(position);
  mesh.position.y = Math.max(20, position.y);
  scene.add(mesh);
  droppedCards.push({
    mesh: mesh,
    card: card,
    bobPhase: Math.random() * Math.PI * 2,
    life: 30
  });
}

function updateCardDrops(dt) {
  if (typeof ship === 'undefined' || typeof scene === 'undefined' || typeof clock === 'undefined') return;

  for (var i = droppedCards.length - 1; i >= 0; i--) {
    var d = droppedCards[i];
    d.mesh.position.y += Math.sin(clock.elapsedTime * 2 + d.bobPhase) * 0.06;
    d.mesh.rotation.y += dt * 1.5;
    d.life -= dt;

    if (d.mesh.position.distanceTo(ship.position) < 6) {
      scene.remove(d.mesh);
      droppedCards.splice(i, 1);
      continue;
    }
    if (d.life <= 0) {
      scene.remove(d.mesh);
      droppedCards.splice(i, 1);
    }
  }
}

// ================= 9. NOTIFICACIONES =================
var cardPickupTimer = 0;

function showCardPickupNotification(card) {
  var notif = document.getElementById('cardPickupNotif');
  var icon = document.getElementById('cardPickupIcon');
  var name = document.getElementById('cardPickupName');
  var rarity = document.getElementById('cardPickupRarity');

  if (!notif || !icon || !name || !rarity) return;

  var data = getCardData(card.id);
  icon.textContent = data ? data.icon : '📦';
  name.textContent = data ? data.name : card.id;
  rarity.textContent = ENCHANT_RARITY_LABELS[card.rarity] || card.rarity;
  rarity.style.color = ENCHANT_RARITY_COLORS[card.rarity] || '#fff';

  notif.classList.remove('hidden');
  clearTimeout(cardPickupTimer);
  cardPickupTimer = setTimeout(function() {
    notif.classList.add('hidden');
  }, 2000);
}

// ================= 10. UI =================
function renderInventoryUI() {
  var container = document.getElementById('inventoryCards');
  var energyEl = document.getElementById('energyValue');
  if (!container) return;

  container.innerHTML = '';

  if (playerInventory.cards.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:20px;">Sin cartas aún. ¡Derrota enemigos para obtenerlas!</div>';
  }

  for (var i = 0; i < playerInventory.cards.length; i++) {
    var inv = playerInventory.cards[i];
    var data = getCardData(inv.id);
    if (!data) continue;

    var card = document.createElement('div');
    card.className = 'inv-card ' + data.rarity;
    card.dataset.cardId = inv.id;

    var statLabel = CARD_STAT_LABELS[data.stat] || data.stat;
    var value = getCardValue(inv.id, inv.level);
    var valueStr = (value * 100).toFixed(0) + '%';
    var upgradeCost = 10 + (inv.level - 1) * 5;
    var maxed = inv.level >= 10;

    card.innerHTML =
      '<div class="inv-card-icon">' + data.icon + '</div>' +
      '<div class="inv-card-name">' + data.name + '</div>' +
      '<div class="inv-card-stat">' + statLabel + ' ' + valueStr + '</div>' +
      '<div class="inv-card-level">Lv.' + inv.level + '/10</div>' +
      '<div class="inv-card-actions">' +
        (maxed
          ? '<button disabled style="opacity:0.4">MAX</button>'
          : '<button onclick="upgradeCard(\'' + inv.id + '\')">' + upgradeCost + '⚡</button>'
        ) +
      '</div>';

    card.addEventListener('click', (function(cardId) {
      return function() {
        openEquipModal(cardId);
      };
    })(inv.id));

    container.appendChild(card);
  }

  if (energyEl) energyEl.textContent = Math.floor(playerInventory.energy);
  var maxEl = document.getElementById('energyMax');
  if (maxEl) maxEl.textContent = playerInventory.maxEnergy;
}

var selectedCardToEquip = null;

function openEquipModal(cardId) {
  selectedCardToEquip = cardId;
  var modal = document.getElementById('equipModal');
  if (!modal) return;

  var data = getCardData(cardId);
  var invCard = null;
  for (var i = 0; i < playerInventory.cards.length; i++) {
    if (playerInventory.cards[i].id === cardId) {
      invCard = playerInventory.cards[i];
      break;
    }
  }
  if (!data || !invCard) return;

  var value = getCardValue(cardId, invCard.level);
  var valueStr = (value * 100).toFixed(0) + '%';
  var statLabel = CARD_STAT_LABELS[data.stat] || data.stat;

  var info = document.getElementById('equipModalInfo');
  if (info) {
    info.innerHTML =
      '<div style="font-size:24px">' + data.icon + '</div>' +
      '<div style="font-size:16px;font-weight:bold">' + data.name + '</div>' +
      '<div style="color:' + ENCHANT_RARITY_COLORS[data.rarity] + '">' + ENCHANT_RARITY_LABELS[data.rarity] + '</div>' +
      '<div>' + statLabel + ' ' + valueStr + '</div>' +
      '<div>Nivel: ' + invCard.level + '/10</div>';
  }

  var slotsContainer = document.getElementById('equipModalSlots');
  if (slotsContainer) {
    slotsContainer.innerHTML = '';
    var gears = ['rayo', 'muro', 'trueno', 'viento'];
    var gearNames = { rayo: 'Rayo', muro: 'Muro', trueno: 'Trueno', viento: 'Viento' };

    for (var g = 0; g < gears.length; g++) {
      var gk = gears[g];
      var enchants = gearEnchants[gk] || [];
      for (var s = 0; s < enchants.length; s++) {
        var btn = document.createElement('button');
        btn.className = 'equip-slot-btn';
        var slotLabel = gearNames[gk] + ' Slot ' + (s + 1);
        var currentEnch = enchants[s];
        if (currentEnch) {
          var cData = getCardData(currentEnch.id);
          slotLabel += ' [' + (cData ? cData.name : '?') + ']';
          btn.style.borderColor = ENCHANT_RARITY_COLORS[cData ? cData.rarity : 'common'];
        } else {
          slotLabel += ' [Vacío]';
          btn.style.borderColor = '#555';
        }
        btn.textContent = slotLabel;
        btn.addEventListener('click', (function(gear, slot) {
          return function() {
            equipCard(selectedCardToEquip, gear, slot);
            closeEquipModal();
            renderInventoryUI();
          };
        })(gk, s));
        slotsContainer.appendChild(btn);
      }
    }
  }

  modal.classList.remove('hidden');
}

function closeEquipModal() {
  var modal = document.getElementById('equipModal');
  if (modal) modal.classList.add('hidden');
  selectedCardToEquip = null;
}

function renderEnchantSlots() {
  var container = document.getElementById('enchantSlotsList');
  if (!container) return;

  container.innerHTML = '';
  var gear = selectedGear || 'rayo';
  var enchants = gearEnchants[gear] || [];

  for (var i = 0; i < enchants.length; i++) {
    var slot = document.createElement('div');
    slot.className = 'enchant-slot';

    if (enchants[i]) {
      var data = getCardData(enchants[i].id);
      if (data) {
        var value = getCardValue(enchants[i].id, enchants[i].level);
        var valueStr = (value * 100).toFixed(0) + '%';
        slot.style.borderColor = ENCHANT_RARITY_COLORS[data.rarity];
        slot.innerHTML =
          '<div class="ench-icon">' + data.icon + '</div>' +
          '<div class="ench-name">' + data.name + ' Lv.' + enchants[i].level + '</div>' +
          '<div class="ench-stat">' + (CARD_STAT_LABELS[data.stat] || '') + ' ' + valueStr + '</div>' +
          '<button class="ench-remove" onclick="unequipCard(\'' + gear + '\',' + i + ')">✕</button>';
      }
    } else {
      slot.innerHTML = '<div class="ench-empty">Slot ' + (i + 1) + ' vacío</div>';
    }

    container.appendChild(slot);
  }
}

// ================= 11. RADAR CHART =================
function drawRadarChart() {
  var canvas = document.getElementById('radarChart');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  var cx = w / 2;
  var cy = h / 2;
  var r = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, w, h);

  var stats = [
    { label: 'ATK',  value: 0.5 + getEnchantBonus('stdDmgBonus') },
    { label: 'ACC',  value: 0.5 + getEnchantBonus('accuracyBonus') },
    { label: 'DEF',  value: 0.5 + getEnchantBonus('defenseBonus') },
    { label: 'EVA',  value: 0.5 + getEnchantBonus('evasionBonus') },
    { label: 'OVH',  value: 0.5 + getEnchantBonus('overheatReduction') },
    { label: 'SP',   value: 0.5 + getEnchantBonus('spCostReduction') },
    { label: 'PRC',  value: 0.5 + getEnchantBonus('pierceBonus') }
  ];

  var n = stats.length;
  var angleStep = (Math.PI * 2) / n;

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#4488ff';
  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var angle = -Math.PI / 2 + i * angleStep;
    var val = Math.min(1, Math.max(0, stats[i].value));
    var x = cx + Math.cos(angle) * r * val;
    var y = cy + Math.sin(angle) * r * val;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#4488ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var angle = -Math.PI / 2 + i * angleStep;
    var val = Math.min(1, Math.max(0, stats[i].value));
    var x = cx + Math.cos(angle) * r * val;
    var y = cy + Math.sin(angle) * r * val;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  for (var ring = 0.25; ring <= 1; ring += 0.25) {
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var angle = -Math.PI / 2 + (i % n) * angleStep;
      var x = cx + Math.cos(angle) * r * ring;
      var y = cy + Math.sin(angle) * r * ring;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  for (var i = 0; i < n; i++) {
    var angle = -Math.PI / 2 + i * angleStep;
    var lx = cx + Math.cos(angle) * (r + 15);
    var ly = cy + Math.sin(angle) * (r + 15);
    ctx.fillText(stats[i].label, lx, ly + 3);
  }
}

// ================= 12. ENERGY REGEN =================
var energyRegenAccumulator = 0;

function updateEnergyRegen(dt) {
  energyRegenAccumulator += dt;
  if (energyRegenAccumulator >= 60) {
    energyRegenAccumulator -= 60;
    if (playerInventory.energy < playerInventory.maxEnergy) {
      playerInventory.energy = Math.min(playerInventory.maxEnergy, playerInventory.energy + playerInventory.energyRegenRate);
      saveInventory();
      var el = document.getElementById('energyValue');
      if (el) el.textContent = Math.floor(playerInventory.energy);
    }
  }
}

// ================= 13. INICIALIZACIÓN =================
loadInventory();

#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Cotizador ITpro — instalador para el mini PC de la red
# (OpenMediaVault 7 / Debian 12).
#
#   sudo bash deploy/instalar.sh
#
# Deja la app en /opt/cotizador, los PDF en /var/lib/cotizador/presupuestos
# y un servicio systemd que arranca solo cuando prende la máquina.
#
# Se puede volver a correr: no pisa la contraseña ni la API key guardadas
# (solo completa lo que falte) y deja la config apuntando a Linux.
# ---------------------------------------------------------------------------
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Hay que correrlo como root:  sudo bash $0" >&2
  exit 1
fi

ORIGEN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="/opt/cotizador"
DATOS="/var/lib/cotizador"
USUARIO="cotizador"
PUERTO="${COTI_PUERTO:-8090}"

echo
echo "  Cotizador ITpro — instalación en este servidor"
echo "  ---------------------------------------------"
echo "  origen : $ORIGEN"
echo "  destino: $DESTINO"
echo "  datos  : $DATOS"
echo "  puerto : $PUERTO"
echo

# --- 1. paquetes -----------------------------------------------------------
echo "[1/6] Paquetes (Chromium para los PDF, fuentes, Node)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

NODE_OK=0
if command -v node >/dev/null 2>&1; then
  MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  [ "$MAJOR" -ge 18 ] && NODE_OK=1
fi

apt-get install -y -qq chromium fonts-liberation fonts-dejavu-core ca-certificates curl >/dev/null

if [ "$NODE_OK" -ne 1 ]; then
  echo "      Node no está (o es anterior a 18): instalo Node 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi

CHROMIUM="$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)"
if [ -z "$CHROMIUM" ]; then
  echo "ERROR: no encontré Chromium después de instalarlo. Probá: apt-get install -y chromium" >&2
  exit 1
fi
echo "      node $(node -v) · chromium $CHROMIUM"

# --- 2. usuario y carpetas -------------------------------------------------
echo "[2/6] Usuario y carpetas..."
if ! id -u "$USUARIO" >/dev/null 2>&1; then
  useradd --system --home-dir "$DATOS" --shell /usr/sbin/nologin "$USUARIO"
fi
mkdir -p "$DESTINO" "$DATOS/presupuestos" "$DATOS/data"

# --- 3. copiar la app ------------------------------------------------------
echo "[3/6] Copiando la aplicación..."
if [ "$ORIGEN" != "$DESTINO" ]; then
  cp -a "$ORIGEN/." "$DESTINO/"
fi
rm -rf "$DESTINO/data" "$DESTINO/node_modules"
mkdir -p "$DESTINO/data"

# --- 4. config.json para Linux ---------------------------------------------
echo "[4/6] Configuración..."
CFG="$DESTINO/config.json"
if [ ! -f "$CFG" ]; then
  cp "$DESTINO/config.example.json" "$CFG"
fi

cat > /tmp/coti-config.js <<'NODE'
const fs = require('fs');
const [file, chromium, password, apiKey] = process.argv.slice(2);
let c = {};
try { c = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch {}
c.puerto = Number(c.puerto) || 8090;
c.host = '0.0.0.0';
c.compartido = true;                      // esconde Excel, agente y "sugerir margen"
c.retenerDias = c.retenerDias == null ? 30 : c.retenerDias;
c.rutas = Object.assign({}, c.rutas, {
  logo: 'public/itpro-logo.png',
  salida: '/var/lib/cotizador/presupuestos',
  navegador: chromium,
});
delete c.rutas.edge;
c.agent = c.agent || {};
c.agent.apiKey = '';                      // el agente usa PowerShell: no va acá
if (password) c.password = password;
if (apiKey) c.nibiru = Object.assign({}, c.nibiru, { apiKey });
fs.writeFileSync(file, JSON.stringify(c, null, 2) + '\n', 'utf8');
console.log('      host=0.0.0.0 · puerto=' + c.puerto + ' · compartido=' + c.compartido);
console.log('      contraseña=' + (c.password ? 'sí' : 'FALTA') +
  ' · API key Nibiru=' + (c.nibiru && c.nibiru.apiKey ? 'sí' : 'FALTA'));
NODE

node /tmp/coti-config.js "$CFG" "$CHROMIUM" "${COTI_PASSWORD:-}" "${COTI_NIBIRU_KEY:-}"
rm -f /tmp/coti-config.js

chown -R "$USUARIO:$USUARIO" "$DESTINO" "$DATOS"

# --- 5. servicio systemd ---------------------------------------------------
echo "[5/6] Servicio (arranca solo con la máquina)..."
NODE_BIN="$(command -v node)"
cat > /etc/systemd/system/cotizador.service <<UNIT
[Unit]
Description=Cotizador ITpro (intranet)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USUARIO
Group=$USUARIO
WorkingDirectory=$DESTINO
Environment=HOME=$DATOS
Environment=PORT=$PUERTO
Environment=HOST=0.0.0.0
Environment=COTI_COMPARTIDO=1
Environment=COTI_BROWSER=$CHROMIUM
ExecStart=$NODE_BIN $DESTINO/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable cotizador >/dev/null 2>&1 || true
systemctl restart cotizador

# --- 6. probar -------------------------------------------------------------
echo "[6/6] Probando..."
OK=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if curl -fsS "http://127.0.0.1:$PUERTO/api/health" >/dev/null 2>&1; then OK=1; break; fi
done

if [ "$OK" -ne 1 ]; then
  echo
  echo "  El servicio no respondió. Últimas líneas del log:" >&2
  journalctl -u cotizador -n 40 --no-pager >&2 || true
  exit 1
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "  LISTO. Desde cualquier PC de la red:"
echo "      http://${IP:-<ip-del-servidor>}:$PUERTO"
echo
echo "  Contraseña de la app: la de $CFG (\"password\")."
echo "  PDF en: $DATOS/presupuestos"
echo "  Log:    journalctl -u cotizador -f"
echo

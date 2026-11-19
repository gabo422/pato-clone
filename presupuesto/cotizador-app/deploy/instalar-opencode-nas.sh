#!/usr/bin/env bash
# Instala OpenCode CLI en el mini PC y deja la API de texto escuchando en 127.0.0.1:4096.
# Se ejecuta desde Windows con deploy\INSTALAR-OPENCODE-NAS.bat
set -euo pipefail

echo "== 1/4 Instalando OpenCode CLI =="
export PATH="$HOME/.opencode/bin:$HOME/.local/bin:$PATH"
curl -fsSL https://opencode.ai/v2/install | bash
export PATH="$HOME/.opencode/bin:$HOME/.local/bin:$PATH"
BIN="$(command -v opencode || true)"
if [ -z "$BIN" ]; then
  echo "ERROR: no encontré el binario 'opencode' después de instalar."
  exit 1
fi
"$BIN" --version

echo "== 2/4 Creando servicio (puerto 4096, solo local) =="
# Ojo: no usar `tr | head` acá. Con `set -o pipefail`, head cierra el pipe y tr
# muere con SIGPIPE (exit 141), que aborta el script antes de crear el servicio.
PASS="$(openssl rand -hex 16 2>/dev/null || python3 -c 'import secrets;print(secrets.token_urlsafe(24))')"
USER_NAME="$(whoami)"
UNIT="/tmp/opencode-serve.service"
cat > "$UNIT" <<EOF
[Unit]
Description=OpenCode API para el cotizador ITpro
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=/home/$USER_NAME
Environment=OPENCODE_PASSWORD=$PASS
Environment=HOME=/home/$USER_NAME
ExecStart=$BIN serve --hostname 127.0.0.1 --port 4096
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo install -m 600 "$UNIT" /etc/systemd/system/opencode-serve.service
sudo systemctl daemon-reload
sudo systemctl enable --now opencode-serve
sleep 3

echo "== 3/4 Guardando la clave para el cotizador =="
# El servicio cotizador corre como usuario 'cotizador' (no como coti): la clave
# tiene que ser legible por ese usuario o el adaptador no puede autenticarse.
SVC_USER="$(systemctl show -p User --value cotizador 2>/dev/null || true)"
[ -n "$SVC_USER" ] || SVC_USER="cotizador"
if [ -d /opt/cotizador ]; then
  echo -n "$PASS" | sudo tee /opt/cotizador/opencode-password.txt >/dev/null
  sudo chown "$SVC_USER":"$SVC_USER" /opt/cotizador/opencode-password.txt
  sudo chmod 600 /opt/cotizador/opencode-password.txt
  echo "Clave en /opt/cotizador/opencode-password.txt (dueño: $SVC_USER)"
else
  echo "AVISO: no existe /opt/cotizador; la clave queda solo en el unit de systemd."
fi

echo "== 4/4 Probando la API =="
if curl -fsS -u "opencode:$PASS" http://127.0.0.1:4096/api/info -o /tmp/oc-info.json; then
  head -c 400 /tmp/oc-info.json
  echo
else
  echo "ERROR: la API no respondió. Revisá: sudo systemctl status opencode-serve"
  exit 1
fi

echo
echo "LISTO. URL local: http://127.0.0.1:4096  (usuario: opencode)"
echo "Avisale a Gabriel para que conecte el cotizador a esta API."

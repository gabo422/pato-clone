#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Actualiza el Cotizador en el mini PC sin tocar la configuración ni los PDF.
#
#   sudo bash deploy/actualizar.sh
#
# Copia server.js, lib/ y public/ (y la documentación) sobre /opt/cotizador y
# reinicia el servicio. config.json y data/ quedan como están.
# ---------------------------------------------------------------------------
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Hay que correrlo como root:  sudo bash $0" >&2
  exit 1
fi

ORIGEN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="/opt/cotizador"

echo "Actualizando $DESTINO desde $ORIGEN ..."
for f in server.js lib public deploy README.md ESQUEMA-cotizacion.md INSTRUCCIONES-copilot.txt config.example.json; do
  [ -e "$ORIGEN/$f" ] || continue
  rm -rf "$DESTINO/$f"
  cp -a "$ORIGEN/$f" "$DESTINO/$f"
done

chown -R cotizador:cotizador "$DESTINO"
systemctl restart cotizador
sleep 2

if curl -fsS "http://127.0.0.1:8090/api/health" >/dev/null 2>&1; then
  echo "OK. El cotizador quedó andando."
else
  echo "Ojo: no responde. Log:" >&2
  journalctl -u cotizador -n 30 --no-pager >&2 || true
  exit 1
fi

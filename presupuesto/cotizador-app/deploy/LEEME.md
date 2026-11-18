# Poner el Cotizador en el mini PC de la red

Objetivo: que **todos los compañeros** entren desde su PC a
`http://192.168.1.5:8090`, busquen precios en Nibiru y **se bajen los 3 PDF** a su
Escritorio. No hace falta Excel, ni PowerShell, ni tu PC prendida.

---

## Lo que tenés que hacer (una sola vez)

### 1. Copiar esta carpeta al servidor e instalarlo

**Doble clic en `INSTALAR-EN-MINI-PC.bat`.**

Te va a pedir:

1. **La contraseña del mini PC** (dos veces: una para copiar y otra para instalar).
   Es la del usuario de OpenMediaVault. Si el usuario no es `admin`, avisame o
   editá la primera línea del `.bat` agregando `-Usuario otrousuario`.
2. Nada más. El script instala Node, Chromium, las fuentes, crea el servicio y lo
   deja andando solo cuando prende la máquina.

Al final te muestra la dirección: `http://192.168.1.5:8090`.

### 2. Probarlo

Desde **otra PC** (no la tuya, para estar seguro):

1. Abrí Chrome/Edge y andá a `http://192.168.1.5:8090`.
2. Contraseña: `Itpro.2222` (la misma de siempre; se cambia en `config.json` del
   servidor, campo `password`).
3. Buscá un artículo, generá los PDF y tocá **Descargar Cliente / Detalle / INTERNO**.
   Tienen que aparecer en tu carpeta de Descargas.

### 3. Avisarle al equipo

Mandarles: la dirección, la contraseña, y que se bajan los PDF con los botones.

---

## Qué queda distinto en el servidor

En el mini PC la app arranca en **modo compartido** (`"compartido": true` en
`config.json`, o la variable `COTI_COMPARTIDO=1` del servicio). En ese modo se
esconden solos:

- El panel del **Agente** (usa la API de Groq).
- **Registrar en Excel** (necesita PowerShell + tu Excel de SharePoint).
- **Sugerir %** de margen (idem).
- **Abrir carpeta** (el servidor no tiene escritorio).

Queda lo que necesitan los compañeros: buscar precios, armar A/B, poner el margen
a mano y **bajar los 3 PDF**.

Los PDF quedan además guardados en el servidor, en
`/var/lib/cotizador/presupuestos/<cliente>/<carpeta>/`, y se borran solos a los
**30 días** (`retenerDias` en `config.json`).

---

## Actualizar la app más adelante

Cuando cambiemos algo en `presupuesto\cotizador-app`:

- **Opción fácil:** volver a correr `INSTALAR-EN-MINI-PC.bat` (no pisa la
  contraseña ni la API key).
- **Opción rápida:** copiar la carpeta y correr `sudo bash deploy/actualizar.sh`
  (solo reemplaza el código y reinicia).

---

## Si algo no anda

| Síntoma | Qué mirar |
|---|---|
| `No pude entrar a 192.168.1.5` | Usuario equivocado, o SSH deshabilitado en OpenMediaVault (Servicios > SSH > Habilitar). |
| `sudo: command not found` | Entraste como `root`; el script ya lo detecta solo. |
| La página no abre desde otra PC | Firewall del servidor: habilitar el puerto **8090** (en OMV: Red > Firewall). |
| `No encuentro un navegador para generar los PDF` | `apt-get install -y chromium` y reiniciar: `systemctl restart cotizador`. |
| Los PDF salen sin las letras lindas | `apt-get install -y fonts-liberation fonts-dejavu-core` y reiniciar el servicio. |
| Quiero ver el log | `journalctl -u cotizador -f` |

---

## Detalle técnico (para retomar después)

- App en `/opt/cotizador` (dueño: usuario `cotizador`).
- Datos y PDF en `/var/lib/cotizador`.
- Servicio: `/etc/systemd/system/cotizador.service`
  (`systemctl status cotizador`, `systemctl restart cotizador`).
- Variables del servicio: `PORT=8090`, `HOST=0.0.0.0`, `COTI_COMPARTIDO=1`,
  `COTI_BROWSER=/usr/bin/chromium`, `HOME=/var/lib/cotizador`.
- Los PDF se hacen con Chromium headless (`--headless=new --no-sandbox`, porque el
  servicio corre sin user namespaces).
- Cada generación devuelve enlaces con token que valen **2 horas**; se sirven con
  `Content-Disposition: attachment` para que el navegador los baje.

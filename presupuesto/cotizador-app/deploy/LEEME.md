# Poner el Cotizador en el mini PC de la red

Objetivo: que **todos los compañeros** entren desde su PC a
`http://192.168.1.5:8090`, busquen precios en Nibiru y **se bajen los 3 PDF** a su
Escritorio. No hace falta Excel, ni PowerShell, ni tu PC prendida.

---

## YA ESTÁ INSTALADO Y ANDANDO (18-nov-2026)

El servidor `192.168.1.5` (OpenMediaVault 7 / Debian 12) ya tiene todo:

| Qué | Dónde |
|---|---|
| Dirección para el equipo | `http://192.168.1.5:8090` |
| Contraseña de la app | `Itpro.2222` (campo `password` de `/opt/cotizador/config.json`) |
| App | `/opt/cotizador` (dueño: usuario `cotizador`) |
| PDF guardados | `/var/lib/cotizador/presupuestos/` (se borran a los 30 días) |
| Servicio | `cotizador.service` — arranca solo con la máquina |
| Log | `journalctl -u cotizador -f` |
| Versiones | Node 22.23.5 · Chromium 156 |

La app ya trae el **tutorial adentro**: botón «? ¿Cómo se usa?» arriba a la derecha, y
se abre solo la primera vez que cada compañero entra desde su navegador. No hace falta
repartir instructivos ni explicar nada de antemano.

**Lo que se tocó en el NAS para poder instalarlo** (por si hay que rehacerlo):

1. Se creó el usuario de despliegue **`coti`** (shell `/bin/bash`, home
   `/home/coti`) y se lo agregó al grupo **`_ssh`**.
   El `admin` de OpenMediaVault **no puede entrar por SSH**: tiene shell
   `nologin` y OMV no deja modificarlo. El sshd del NAS tiene
   `AllowGroups root _ssh`, así que sin el grupo `_ssh` ningún usuario entra.
2. Se le dio sudo sin contraseña para poder instalar/actualizar:
   `/etc/sudoers.d/coti-cotizador` → `coti ALL=(ALL) NOPASSWD:ALL`.
3. Nada más. No se deshabilitó ni cambió nada del NAS (ni SMB, ni OMV, ni los
   discos). El cortafuegos está abierto, por eso el puerto 8090 se ve desde la red.

**Para actualizar la app** alcanza con el doble clic en
`INSTALAR-EN-MINI-PC.bat` (pide la contraseña de `coti` dos veces) o, más rápido,
`sudo bash deploy/actualizar.sh` en el servidor.

> Si algún día querés que `coti` **no** pueda entrar más por SSH: `sudo usermod
> -rG users coti` (sigue existiendo, pero sshd lo rechaza). Y para sacarle el
> sudo: `sudo rm /etc/sudoers.d/coti-cotizador`.

---

## Instalación desde cero (si algún día hay que rehacerlo)

### 1. Copiar esta carpeta al servidor e instalarlo

**Doble clic en `INSTALAR-EN-MINI-PC.bat`.**

Te va a pedir:

1. **La contraseña del usuario `coti` del mini PC** (dos veces: una para copiar y
   otra para instalar). Si el usuario es otro, agregá `-Usuario otrousuario` al
   `.bat`.
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

- **Registrar en Excel** (necesita PowerShell + tu Excel de SharePoint).
- **Sugerir %** de margen (idem).
- **Abrir carpeta** (el servidor no tiene escritorio).
- La **configuración del agente** (la API key la manejás vos desde el servidor).

**El panel del Agente (la columna de la derecha) queda visible para todos**: ahí
escriben el pedido en castellano y la IA busca precios, completa los datos y arma
las opciones A/B.

Queda lo que necesitan los compañeros: el chat de la derecha, buscar precios, armar
A/B, poner el margen a mano y **bajar los 3 PDF**.

### La IA del servidor

El panel **Agente** funciona para **todo el equipo** con **una sola clave**
(`agent.apiKey` en `/opt/cotizador/config.json`). Busca precios, completa los datos y
arma las opciones A/B; los PDF los genera el botón de siempre (el agente no puede
generarlos ni tocar el Excel en el servidor).

Para no quedarse sin cuota, hay un **tope por IP y por día**:

```
COTI_IA_DIA=40        # pedidos por IP por día (40 por defecto)
```

Se cambia en el servicio (`/etc/systemd/system/cotizador.service`,
`Environment=COTI_IA_DIA=...`) y después `sudo systemctl daemon-reload && sudo systemctl restart cotizador`.

Si el proveedor contesta «saturado» (plan gratis de Groq: 8.000 tokens por minuto),
el servidor **reintenta solo** hasta 4 veces; si igual falla, se espera medio minuto
y se vuelve a pedir.

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
| `No pude entrar a 192.168.1.5` | Usuario equivocado (`admin` no sirve, usá `coti`), o SSH deshabilitado en OpenMediaVault (Servicios > SSH > Habilitar). |
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

# Cotizador ITpro — app web

Programa local (Node.js, sin dependencias) que hace el mismo trabajo que veníamos haciendo a mano:
buscar precios en la API, calcular márgenes, generar los **3 PDF** y anotar la cotización en el
**Excel de Gabi**. Incluye un panel de agente (IA) para pedirle las cosas en castellano.

No tiene instalador: es una carpeta con archivos. Se arranca con doble clic.

---

## 1. Arrancar

Doble clic en **`INICIAR.bat`**.

- Abre una ventana negra (dejala abierta) y el navegador en `http://127.0.0.1:8090`.
- Contraseña inicial: **`itpro`** (cambiala, ver punto 6).
- Para cortar: cerrá la ventana negra o Ctrl+C.

Requisitos: Node.js (ya está instalado en esta PC) y Microsoft Edge (ya está).

---

## 2. Cómo se usa (flujo)

1. **Cliente** → escribí el nombre y tocá **«Sugerir %»**. Lee el historial de ventas y te propone
   el margen (mediana). Si es cliente nuevo, propone 15%.
2. **Fecha / entrega / validez / título** y el nombre de la **carpeta de salida**.
3. **+ Buscar en proveedores** → buscás por texto o SKU en la API de Nibiru, ves costo y stock, y
   agregás con un clic. El artículo entra a la opción activa (A o B).
4. En la tabla podés editar **cantidad, costo, margen (%)** y el detalle que ve el cliente.
   El precio y los totales se recalculan solos (IVA 22% al final).
5. **Condiciones** y **Notas internas**: una por línea.
6. **Generar los 3 PDF** → quedan en
   `Desktop\presupuestos opencode\<Cliente>\<carpeta>\Presupuesto-ITpro-{Cliente,Detalle,INTERNO}.pdf`
7. **Registrar en Excel** → primero tildá «solo simular» (DryRun) para ver qué escribiría,
   y después «Escribir de verdad».

Todo se guarda solo en el navegador: si cerrás, al volver tenés la misma cotización.

### Traer una cotización desde otro agente (Copilot Studio, ChatGPT, etc.)

Si el agente externo devuelve el **JSON** del esquema (ver `ESQUEMA-cotizacion.md`):

1. **«Pegar JSON»** (al lado de «Generar los 3 PDF»).
2. Pegá la respuesta tal cual (aguanta los ```json … ``` y texto alrededor).
3. **«Generar los 3 PDF»** → salen los mismos 3 PDF del formato oficial.
   O **«Solo cargar en el editor»** si querés revisar/editar antes.

El programa normaliza lo que venga "suelto": `margen: 21` → `0,21`, `"219,50"` → `219.5`,
`"16/11/2026"` → `2026-11-16`, condiciones en un solo texto → una por línea.

### Tipo de cambio (dólar venta BROU)

Los PDF llevan el **dólar venta del BROU del día**, consultado solo, sin que hagas nada:

1. Página oficial del BROU (`brou.com.uy/cotizaciones`).
2. Si el BROU no está publicando —pasa seguido, la página dice «Sin cotizaciones disponibles»—
   una API pública de la misma fuente (`api.cambio-uruguay.com`, serie **BROU mostrador**).
3. Si tampoco, el último valor bueno guardado en `data\cambio.json`.
4. Último recurso: `cambio` de `config.json`.

En la pantalla de artículos está el chip **«Dólar BROU venta 41,75 · 16-11»** con botón
**Refrescar** (se cachea media hora). Si el chip sale en amarillo, el dato no es fresco
(último guardado o puesto a mano). El número se imprime en el **INTERNO** y como última
condición del **Cliente**; si el presupuesto ya trae una línea de tipo de cambio, no se duplica.

Para fijarlo a mano (si el BROU está caído y hay que emitir igual): `POST /api/cambio` con
`{"valor": "41,75"}`. Para volver a automático: `{"auto": true}`.

---

## 3. El agente

El panel de la derecha es un agente con **herramientas**: puede buscar precios, armar las opciones,
aplicar márgenes, generar los PDF y registrar en el Excel. No tiene acceso a nada más de la PC.

**Para activarlo** hace falta una API key de un modelo. Hay opciones **gratis** y opciones pagas:

1. Conseguí una key. Opciones ordenadas de más a menos recomendable para empezar:

   - **Groq** (`console.groq.com` → API Keys): **gratis, sin tarjeta**, ~1.000 pedidos por día.
     Es la que mejor anda para el agente porque los modelos soportan *tool calling* (que es lo que
     necesita para buscar precios y armar la cotización). URL base: `https://api.groq.com/openai/v1`
     Modelo: `openai/gpt-oss-120b` (probado, anda bien).
   - **OpenRouter** (`openrouter.ai` → Keys): **gratis, sin tarjeta**, 20 pedidos/minuto y 50 por día
     con los modelos que terminan en `:free` (sube a 1.000/día si alguna vez cargás USD 10).
     URL base: `https://openrouter.ai/api/v1`. Modelo: `openai/gpt-oss-120b:free` o `openrouter/free`.
     Ojo: no todos los `:free` soportan herramientas; si el agente contesta que no puede buscar,
     probá otro modelo.
   - **Google AI Studio** (`aistudio.google.com` → Get API key): **gratis y sin tarjeta**, pero Google
     viene recortando la cuota gratuita: hoy el cupo real depende del modelo y se ve en la consola de
     límites de AI Studio. Si da error 429 o «limit is 0», ese modelo no tiene cupo gratis: elegí otro
     (los Flash-Lite suelen ser los que quedan) o pasá a Groq/OpenRouter.
     URL base: `https://generativelanguage.googleapis.com/v1beta/openai`.
   - **OpenCode Console** (`opencode.ai/console`): **pago** (prepago, centavos por cotización). Usa
     modelos como `claude-haiku-5-5`. URL base: `https://opencode.ai/inference/openai/v1`.
     Es la mejor calidad, pero no es gratis.
   - **OpenAI / Anthropic directo**: pago, la mejor calidad de todas.
2. En el panel del agente abrí **«Configuración del agente»**, pegá la key, el modelo y la URL, y
   guardá. El cartel de arriba pasa a «Agente activo».

**Cuánto cuesta:** con las opciones gratis, **nada** (sólo el límite diario). Con las pagas, una
cotización típica son ~4-8 llamadas chicas: del orden de **centavos de dólar** (menos de USD 0,01).
No hay costo mensual.

**Ejemplos de pedidos:**

- «Cotizá 5 notebooks i5 con 16 GB y 5 mouse para Eightroom, margen 21%»
- «Buscame un i7 nuevo con stock y armá la opción B»
- «Generá los PDF y registrá en el Excel»
- «¿Cuánto queda el total de la opción A?»

Si la key no está puesta, el resto de la app funciona igual: el agente es opcional.

---

## 4. Servidor de la red (para los compañeros)

Para que lo use **todo el equipo** sin depender de esta PC, la app vive en el mini PC de la
red (`192.168.1.5`, OpenMediaVault 7 / Debian 12) y cada uno entra desde su navegador:

```
http://192.168.1.5:8090
```

Los pasos de instalación están en **`deploy\LEEME.md`** (doble clic en
`deploy\INSTALAR-EN-MINI-PC.bat`).

**Estado: instalado y andando desde el 18-nov-2026.** Node 22.23.5, Chromium 156,
servicio `cotizador.service` con arranque automático. Los PDF tardan ~2 s por
generación en ese equipo. Los datos de acceso al servidor están en
`CREDENCIALES-NAS.txt` (local, no se sube al repo).

En ese servidor la app arranca en **modo compartido** (`"compartido": true` en
`config.json`, o la variable `COTI_COMPARTIDO=1` del servicio): se esconden
«Registrar en Excel», «Sugerir %», «Abrir carpeta» y la configuración de la API key,
porque dependen de Windows/PowerShell o son del administrador. **El panel del agente
(la columna de la derecha) queda visible para todos.**

### El chat del agente en el servidor

A la derecha de la pantalla está el panel **Agente**, igual que en la PC de Gabriel.
Se le escribe el pedido con palabras normales («5 notebooks i5 y 5 mouse para
Eightroom, entrega 48 hs») y:

1. busca los precios reales en Nibiru (no inventa nada),
2. completa cliente, título y condiciones,
3. arma la **opción A** (recomendada) y la **opción B** (alternativa),
4. deja el margen en **15%** (cliente nuevo) y avisa para tocar «Generar los 3 PDF».

Si el pedido es genérico («una mother», «un celular») **no pregunta modelos ni SKU**:
busca con la palabra genérica y propone 2 o 3 artículos reales. Nunca ofrece algo con
**stock 0**.

**Revisá siempre lo que cargó antes de generar.** Los PDF los genera el botón de
siempre, no el chat (en el servidor el agente no tiene la herramienta de PDF ni la de
Excel).

La IA usa **una sola clave para todo el equipo** (`agent.apiKey` en
`/opt/cotizador/config.json`). Para que no se queme la cuota del plan gratis hay un
**tope por IP y por día**:

```
COTI_IA_DIA=40        # pedidos por IP por día (por defecto 40)
```

Al pasarse, el chat responde «llegaste al tope de IA por hoy» y se puede seguir
cargando a mano. El contador se renueva solo a medianoche.

> El plan gratis de Groq permite **8.000 tokens por minuto** y unos **200.000 tokens
> por día** por modelo. Una cotización completa gasta entre 7.000 y 15.000 tokens, así
> que **el equipo entero tiene para unas 15-20 cotizaciones por día**. Cuando se agota,
> el chat avisa «se acabó la cuota diaria» y se puede seguir cargando a mano; se
> renueva al día siguiente. Si el equipo lo usa en serio, conviene cargar USD 5 en
> Groq (Dev Tier): con eso alcanza para muchísimo y desaparecen los topes.
>
> Si aparece «el proveedor está saturado» (límite por minuto), esperá medio minuto y
> reintentá: el servidor ya reintenta solo hasta 4 veces.

### Tutorial para los compañeros

La app trae el tutorial adentro: botón **«? ¿Cómo se usa?»** en la barra de arriba, y
**se abre solo la primera vez** que cada navegador entra (después no molesta más).

Son 7 pasos con los trucos de la búsqueda y qué PDF se manda al cliente y cuál no
(el **INTERNO** tiene costos y márgenes: no se manda). El que quiera verlo siempre
tildá «Mostrar este tutorial al entrar»; para apagarlo del todo, destilda y listo.

### Descargar los PDF

Al generar, el servidor devuelve tres enlaces con token (valen 2 horas):

```
GET /api/descargar/<token>/0   → Presupuesto-ITpro-Cliente.pdf
GET /api/descargar/<token>/1   → Presupuesto-ITpro-Detalle.pdf
GET /api/descargar/<token>/2   → Presupuesto-ITpro-INTERNO.pdf
```

Se sirven con `Content-Disposition: attachment`, así que el navegador de cada uno los guarda
en **su** carpeta de Descargas. Los botones aparecen debajo del resultado (también en esta
PC). Los PDF quedan además en el disco del servidor
(`/var/lib/cotizador/presupuestos/<cliente>/<carpeta>/`) y se borran solos a los
`retenerDias` (30 por defecto).

### Navegador para los PDF

`lib/pdf.js` busca solo: en Windows Edge o Chrome; en Linux `chromium`,
`chromium-browser`, `google-chrome`. Se puede fijar con `rutas.navegador` o la variable
`COTI_BROWSER`. En Linux agrega `--no-sandbox` (el servicio corre sin user namespaces).
Los 3 PDF se generan en paralelo (`pdfParalelo`, 3 por defecto).

---

## 5. Que se conecten clientes / otras PCs

La app escucha por defecto **solo en esta PC** (`127.0.0.1`). Para que entren desde afuera hay que
hacer dos cosas: escuchar en la red (`host: "0.0.0.0"` en `config.json`) y usar una VPN.

### Recomendado: Tailscale (mejor que Hamachi)

Por qué: es WireGuard, cifrado de punta a punta, no hay que abrir puertos en el router, funciona
detrás de NAT, plan gratis de hasta 100 dispositivos, y está mantenido (Hamachi es legacy de LogMeIn,
máximo 5 usuarios, más lento y con más problemas de conexión).

Pasos:

1. Instalá Tailscale en esta PC y creá la cuenta (login con Google/Microsoft).
2. En el panel de Tailscale (`login.tailscale.com`) invitá a cada cliente, o compartí **solo este
   dispositivo** con cada uno (Share) — así no ven el resto de tu red.
3. En `config.json` cambiá `"host": "127.0.0.1"` por `"host": "0.0.0.0"` y reiniciá el programa.
4. Habilitá el puerto en el Firewall de Windows (una sola vez, PowerShell **como administrador**):

   ```powershell
   New-NetFirewallRule -DisplayName "Cotizador ITpro 8090" -Direction Inbound -Protocol TCP -LocalPort 8090 -Action Allow -Profile Private
   ```

5. Cada cliente abre en su navegador `http://<nombre-o-ip-tailscale-de-esta-PC>:8090`
   (con MagicDNS alcanza el nombre de la máquina). Les pedís la contraseña y listo.

### Alternativa sin instalar nada en la PC del cliente

**Cloudflare Tunnel + Access**: el cliente entra por una URL https normal y se identifica con un
código que le llega por mail. Requiere tener el dominio en Cloudflare. Es más cómodo para el cliente
pero más laburo de configuración y la app queda expuesta a internet (protegida por Access).

**No** abras el puerto 8090 directo a internet sin VPN ni Cloudflare: cualquiera podría intentar
entrar, ver costos y márgenes, y generar PDFs en tu PC.

---

## 6. Qué hay adentro

```
cotizador-app/
├── INICIAR.bat            doble clic para arrancar
├── config.json            contraseña, rutas, API key del agente
├── server.js              servidor HTTP + endpoints
├── lib/
│   ├── nibiru.js          búsqueda de precios/stock
│   ├── docs.js            los 3 documentos HTML (cliente, detalle, interno)
│   ├── pdf.js             HTML → PDF con navegador headless (Edge/Chrome/Chromium)
│   ├── excel.js           registro en "Gabi Cotizaciones 2026.xlsx"
│   ├── ps.js              ejecuta los .ps1 existentes (margen, Excel)
│   ├── quote.js           normaliza JSONs externos (margen 21 → 0,21, fechas, "1.234,56")
│   ├── brou.js            dólar venta BROU del día (página + API + cache)
│   └── agent.js           agente con tool calling
├── deploy/                instalación en el mini PC de la red
│   ├── LEEME.md           pasos, uno por uno
│   ├── INSTALAR-EN-MINI-PC.bat   doble clic: copia e instala
│   ├── desde-windows.ps1  lo que hace el .bat (ssh + scp)
│   ├── instalar.sh        instalador Linux (Node, Chromium, systemd)
│   └── actualizar.sh      actualiza el código sin tocar la config
├── ESQUEMA-cotizacion.md  esquema JSON para agentes externos (subir a Copilot Studio)
└── public/                la interfaz (HTML/CSS/JS, sin frameworks)
```

Reutiliza lo que ya existía en `presupuesto\`: `sugerir-margen.ps1`, `update-gabi.ps1`,
`build-presupuesto.ps1` (solo como referencia del método) y el logo.

---

## 7. Configuración (`config.json`)

**Ojo:** `config.json` tiene la API key de Nibiru y la contraseña. Está en `.gitignore`, así que
**no se sube a GitHub** (el repo de Pato-Clone es público). Si algún día clonás el proyecto en otra PC,
copiá `config.example.json` a `config.json` y completá los datos.

| Campo | Para qué |
|---|---|
| `puerto` | 8090 por defecto. |
| `host` | `127.0.0.1` = solo esta PC. `0.0.0.0` = red local / VPN. |
| `password` | Contraseña de la app. **Cambiala.** Vacío = sin contraseña (solo si es 100% local). |
| `nibiru.apiKey` | Key de la API de precios. |
| `nibiru.campoCosto` | `price` (costo proveedor) o `final_price`. |
| `rutas.logo` | Logo del PDF. |
| `rutas.salida` | Carpeta raíz de los PDF. |
| `rutas.navegador` | Binario del navegador para los PDF (si falta, lo busca solo). |
| `rutas.excel` | Excel de seguimiento. |
| `rutas.excelCompras` | Excel de historial (para sugerir margen). |
| `iva` | 0.22 (IVA uruguayo). |
| `cambio` | Solo de respaldo: si no hay internet usa este valor. El número real es el **dólar venta BROU del día**. |
| `margenDefault` | 0.15 para clientes nuevos. |
| `compartido` | `true` = servidor de la red: esconde Excel, «Sugerir %», «Abrir carpeta» y la configuración de la API key. **El chat del agente queda visible.** |
| `retenerDias` | Días que se guardan los PDF en el servidor (30). `0` = no borra nunca. |
| `pdfParalelo` | Cuántos PDF se generan a la vez (3). Bajalo a 1 si el servidor tiene poca RAM. |
| `agent.*` | `baseUrl`, `model`, `apiKey` del modelo. En el servidor es **la única clave para todo el equipo**. |
| `agent.reasoning` | `low` (por defecto), `medium` o `high`. Solo para modelos `gpt-oss`. `low` gasta menos cuota. |

Después de editar `config.json` hay que reiniciar el programa (o guardar desde la UI del agente).

### Cambiar la contraseña

Dos formas:

- **Desde la app:** no hay pantalla de cambio de contraseña todavía; usá la segunda.
- **Editando el archivo:** abrí `config.json` con el Bloc de notas, cambiá `"password": "itpro"`
  por la que quieras (sin dejar espacios de más), guardá y reiniciá el programa (`INICIAR.bat`).

---

## 8. Problemas comunes

- **«No encuentro el logo»** → poné `itpro-logo.png` en `Downloads` o cambiá `rutas.logo`.
- **El PDF no sale** → fijate que el navegador esté en `rutas.navegador` (o en el PATH).
  Probalo abriéndolo a mano: en Windows `msedge.exe`, en Linux `chromium`.
- **En el servidor: `No encuentro un navegador`** → `apt-get install -y chromium` y
  `systemctl restart cotizador`.
- **«No pude registrar»** → el Excel puede estar abierto/tomado por SharePoint. Cerrá Excel y reintentá;
  el script ya hace reintentos y backup en `%TEMP%`.
- **El margen sale 15% para un cliente con historial** → revisá que el nombre coincida con el del Excel
  de compras (el script busca por coincidencia exacta y después parcial).
- **Pantalla de contraseña en loop** → borrá las cookies del sitio o reiniciá el programa.

---

## 9. Pendientes / ideas

- Historial dentro de la app (ver cotizaciones anteriores sin abrir el Excel).
- Vista previa del PDF antes de generarlo.
- Login por usuario (hoy hay una sola contraseña compartida).
- Embeber OpenCode (en vez de la API directa) para usar modelos gratis: se puede, pero requiere
  correr OpenCode headless y le da herramientas de sistema — no recomendado para acceso remoto.

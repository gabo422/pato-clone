# Cotizador ITpro — guía rápida (subproyecto `presupuesto`)

> Este subproyecto **NO tiene nada que ver con el juego Pato-Clone**. El `AGENTS.md`
> de la raíz del repo es del juego (ya abandonado): **ignoralo** para trabajar acá.

> **Novedad (13/11/2026):** existe una **app web** que automatiza todo este flujo:
> `presupuesto\cotizador-app\` → doble clic en `INICIAR.bat`. Ver
> `cotizador-app\README.md`. Los scripts de esta guía siguen siendo el motor
> (`sugerir-margen.ps1`, `update-gabi.ps1`) y sirven para usarlos a mano.

## Qué es
Flujo para cotizar PCs/componentes: buscar **precios, stock y proveedor** en la API
de Nibiru y armar los **presupuestos en PDF** (3 documentos: cliente, detalle e interno).

## Flujo de trabajo (regla nueva)
1. **Pedir el cliente** antes de cotizar.
2. **Sugerir el % de ganancia** con `sugerir-margen.ps1` (histórico del cliente en el
   Excel de compras; **15% por defecto** si es cliente nuevo). Gabriel **acepta o ajusta
   el % por artículo**.
3. Buscar precio/stock/proveedor en la API y calcular.
4. Generar los 3 PDFs en `Desktop\presupuestos opencode\<Cliente>\` (**con la fecha del día
   en que Gabriel pide la coti**; ver "Fecha de los PDF").
5. Registrar la cotización en `Gabi Cotizaciones 2026.xlsx` (ver sección).

## Reglas de precio
- La API devuelve precios en **USD SIN IVA**.
- **Costo** = precio del proveedor.
- **Precio cliente** = costo × **(1 + margen%)** → subtotal. Margen sugerido por cliente
  (ver `sugerir-margen.ps1`); default **15%**.
- **Precio final** = subtotal **+ IVA 22%**.
- Referencia de cambio: **1 USD = 41,25 UYU**.
- Se ofrecen 2 opciones: **A** (recomendada) y **B** (económica).
- **Validar stock** antes de aprobar/entregar.

## Fecha de los PDF (regla)
- La fecha de los 3 PDF (campo `Fecha:` del HTML, cabecera) **SIEMPRE = el día en que
  Gabriel pide la cotización**, *nunca* una fecha anterior (el template trae una fecha
  vieja hardcodeada, hay que **actualizarla antes de compilar**).
- Se aplica salvo que Gabriel indique una fecha distinta para un caso particular.
- Recordatorios: actualizar `Fecha:` en los 3 HTML y, si aparece, "stock al &lt;fecha&gt;"
  en el interno (`presupuesto-*-interno.html`).

## Excel de seguimiento — `Gabi Cotizaciones 2026.xlsx`
**SIEMPRE registrar cada cotización nueva** en el Excel (regla de Gabriel).
Ubicación: `C:\Users\gmullin.ITPRO\IT PRO\Compartido - Documentos\Gabriel\Cotizaciones\`
(SharePoint sincronizado). Gabriel lo usa para tener los presupuestos "a mano".

- Hoja principal **`Cotizaciones`**: **una fila por artículo**, agrupadas por cotización
  (fila en blanco entre grupos). Columnas:
  `A FECHA · B CLIENTE · C N° · D Descripción · E Cant · F PROVEEDOR · G COSTO ·
   H MARGEN · I Precio Unit(sin IVA) · J Subtotal · K C/IVA · L · M GANANCIA · N · O`
- Fórmulas de la planilla (replicarlas al agregar filas):
  `H = +I/G-1` · `J = I*E` · `K = +J*1.22` · `M = +(I-G)*E`
- **Fecha (A)**: día en que Gabriel pidió la coti (coincide con la de los PDF). N° de ítem (C)
  es texto/número (ojo: la columna C **no acepta** `NumberFormat`; usar `ClearFormats()`).
- Márgenes: `H` = ganancia ÷ costo (ej. 21% → 0,21). Para los pedidos de Frimosa y Lolita
  ya registrados (19-oct-2026) ver el historial en esa carpeta.
- Script de carga: **`presupuesto\update-gabi.ps1`** (versionado en el repo). Detecta solo
  si el libro está abierto en el Excel del usuario (escribe ahí y hace `Save`; si no, copia a
  local, edita y copia encima del SharePoint). Tiene reintentos por `RPC_E_CALL_REJECTED`.

```powershell
# 1) CSV con columnas: Cant,Descripcion,Proveedor,Costo,PrecioSinIva
powershell -ExecutionPolicy Bypass -File .\update-gabi.ps1 -Cliente 'Frimosa' -Fecha '21/10/2026' -Csv "$env:TEMP\coti.csv" -DryRun
# 2) el mismo, sin -DryRun, para escribir de verdad
powershell -ExecutionPolicy Bypass -File .\update-gabi.ps1 -Cliente 'Frimosa' -Fecha '21/10/2026' -Csv "$env:TEMP\coti.csv"

# Alternativa con items directos
powershell -ExecutionPolicy Bypass -File .\update-gabi.ps1 -Cliente 'LOLITA' -Fecha '21/10/2026' -Items @(
  @{ Cant=1; Descripcion='Lenovo ThinkCentre Neo 50Q'; Proveedor='Starcenter'; Costo=421.40; PrecioSinIva=509.89 }
)
```

  - **`-DryRun`**: imprime fecha/serial/items sin tocar el Excel. Correrlo **siempre** primero.
  - **`-Fecha`**: string `dd/MM/yyyy` o `yyyy-MM-dd` (parseo propio, no depende del locale).
  - **Números**: acepta coma o punto decimal. Ojo: con culture `es-ES`, `[double]'308,50'`
    devuelve **30850** (la coma es separador de miles) — por eso el helper `To-Dbl`.
  - `-Modo Auto|Abierto|Archivo` · `-NumeroInicio` para continuar la numeración de ítems.

## API (Nibiru Ecommerce)
- Base: `https://cotiza.itpro.com.uy` · API key: `71a13e74c04209d4c3f2098baa767905`
- Docs: `https://guia.nibiru.com.uy/` (índice `llms.txt`; cada página en `.md`).
- **Por nombre:** `GET /api/search?apikey=<KEY>&name=<texto>&include_hidden=1&providers=true`
  → `products[]` con `title`, `sku`, `price`, `stock`, `proveedor`. **404** si no hay resultados.
- **Por SKU:** `GET /api/product?apikey=<KEY>&sku=<sku>&providers=true`
  → el **nombre real** viene en `details.title`. **404** si no existe.
- `GET /api/products`: paginado (`page`/`after_id`/`limit`), incluye ocultos, con `updated_since`.

## Documentos (plantillas → PDF)
| Plantilla | Para qué | Incluye |
|---|---|---|
| `presupuesto-cliente.template.html` | Cliente | Opciones A/B, cumplimiento, condiciones (sin precio por componente) |
| `presupuesto-detalle.template.html` | Cliente | Precio por componente (costo +15%) |
| `presupuesto-interno.template.html` | Uso interno | Costo, proveedor, SKU, stock, margen +15%, IVA |

- Placeholder `__LOGO__` → se reemplaza por el logo en base64.
- `build-presupuesto.ps1`: lee la plantilla, reemplaza `__LOGO__`, inyecta
  `roboto-embed.css` y compila con **Edge headless** (`--print-to-pdf`).

## Sugerir % de ganancia (por cliente)
Fuente: `C:\Users\gmullin.ITPRO\IT PRO\Compartido - Documentos\00-Compras y Entregas a Realizar - 2026.xlsx`
(hoja **`2026`**, columna **MARGEN** = ganancia ÷ costo).
```powershell
powershell "C:\Users\gmullin.ITPRO\OneDrive - IT PRO\Documentos\Default Project\presupuesto\sugerir-margen.ps1" -Cliente "DIVINO S.A."
```
- Devuelve: **% sugerido** (mediana histórica), cantidad de ventas, rango P25-P75, última venta.
- Ignora márgenes negativos/0 y errores de carga. Con <3 ventas válidas → **15%**.
- Cliente nuevo / sin historial → **15%**.
- Copia el xlsx a temp para evitar el lock de Excel/SharePoint (no ensucia el original).

## Compilar un PDF
```powershell
# Un solo documento (Cliente):
powershell "...\presupuesto\build-presupuesto.ps1" -Cliente "LOLITA S.A." -Subcarpeta "presupuesto mini pc 19-10-2026" -Tipo Cliente
# Detalle e interno (misma carpeta):
powershell "...\presupuesto\build-presupuesto.ps1" -Cliente "LOLITA S.A." -Subcarpeta "presupuesto mini pc 19-10-2026" -Tipo Detalle
powershell "...\presupuesto\build-presupuesto.ps1" -Cliente "LOLITA S.A." -Subcarpeta "presupuesto mini pc 19-10-2026" -Tipo INTERNO
```
- Salida automática:
  `%USERPROFILE%\Desktop\presupuestos opencode\<Cliente>\<Subcarpeta>\Presupuesto-ITpro-<Tipo>.pdf`
  (crea las carpetas si no existen; `Tipo` = Cliente | Detalle | INTERNO).
- `-Subcarpeta` es **recomendable**: agrupa los 3 PDF de una misma cotización en una
  carpeta propia, en lugar de crear una carpeta por cliente distinto.

## Estructura de carpetas de salida
```
Desktop\presupuestos opencode\
├── LOLITA S.A\
│   ├── presupuesto tablets 19-10-2026\      (3 PDF)
│   └── presupuesto mini pc 19-10-2026\      (3 PDF)
└── Frigorifico Modelo\
    └── presupuesto accesorios 19-10-2026\   (3 PDF)
```
- Una subcarpeta **por cotización**, nombrada `presupuesto <tema> <dd-mm-aaaa>`.
- Así conviven varias cotizaciones del mismo cliente sin pisarse los PDF.
- `-OutPath "ruta\archivo.pdf"` reemplaza la ruta automática si la querés en otro lado.
- Defaults: `LogoPath=%USERPROFILE%\Downloads\itpro-logo.png`, `CarpetaRaiz=%USERPROFILE%\Desktop\presupuestos opencode`.
- Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- Plantilla: `__LOGO__` → logo base64; se inyecta `roboto-embed.css`; compila con Edge headless (`--print-to-pdf`).

## Scripts auxiliares
- `sugerir-margen.ps1` — sugiere % de ganancia según el historial del cliente (Excel 2026).
- `verificar-stock.ps1` — verifica stock de una lista de SKUs.
- `estado-catalogo.ps1` — barrido del catálogo por distribuidor.
- `verificador-web\` — dashboard local (puerto **8099**) con panel por proveedor.

## Último presupuesto (13/10/2026)
- Opción A final: **USD 5.075,08** (costo 3.617,30 · +15% 542,60 · IVA 915,18).
- Opción B final: **USD 3.539,49** (GPU `CP7144` sin stock).

## Gotchas
- La API devuelve **404** cuando no hay resultados / SKU inexistente (manejar, no es error de red).
- Precios y stock **cambian a diario** → revalidar el día de la cotización.
- PowerShell: armar URLs con `"${Base}?..."`; `ConvertFrom-Json -InputObject $x`.
- **Agente de Copilot Studio (RolandBot)** → ver `AGENTE-rolandbot.md` (flujos
  `BuscarPorSKU`/`BuscarArticulo`, modelo Opus, límite de 8000 chars, bug del
  parámetro `name`, filtro de stock, pendiente del PDF). El conector custom
  `ITpro Product Search` **se eliminó**: bloqueaba el Publish y su C# no corría.

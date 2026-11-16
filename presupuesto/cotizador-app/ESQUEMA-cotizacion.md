# Esquema de cotización ITpro (para Copilot Studio)

Este documento define **exactamente** cómo tiene que devolver los datos un agente para que el
Cotizador ITpro genere los 3 PDF con el formato oficial (verde ITpro): **Cliente**, **Detalle** e
**INTERNO**.

> Importante: un agente de Copilot Studio **no puede crear archivos PDF**. Lo que sí puede es
> devolver el **JSON** de abajo. Después, en el Cotizador (`http://127.0.0.1:8090`) se aprieta
> **«Pegar JSON»**, se pega la respuesta y el programa genera los 3 PDF idénticos a los de siempre,
> en `Escritorio\presupuestos opencode\<cliente>\<subcarpeta>\`.

---

## 1. Reglas del negocio

| Regla | Valor |
|---|---|
| Moneda | USD (dólares) |
| Los precios de la API de proveedores son **COSTO** | sin IVA |
| Precio al cliente | `precio = costo × (1 + margen)` |
| Margen | fracción: `0.21` = 21 %. Cliente nuevo: `0.15` |
| IVA | `22 %` sobre el subtotal, **al final** |
| Tipo de cambio de referencia | `1 USD = 41,25 UYU` |
| Se ofrecen 2 opciones | `A` (recomendada) y `B` (alternativa) |
| Stock y SKU | **nunca se inventan**: salen de la búsqueda real |
| Carpetas de salida | `Presupuesto-ITpro-Cliente.pdf`, `-Detalle.pdf`, `-INTERNO.pdf` |

### Fórmulas (en este orden)

1. `precioUnitario = costo × (1 + margen)` — si viene `precio`, se usa `precio` y se ignora `margen`.
2. `subtotalItem = precioUnitario × cant`
3. `subtotalOpción = Σ subtotalItem`
4. `iva = subtotalOpción × 0,22`
5. `total = subtotalOpción × 1,22`
6. (solo INTERNO) `costoProveedor = Σ costo × cant` · `ganancia = subtotal − costoProveedor` ·
   `margenReal = (precioUnitario ÷ costo − 1) × 100`

### Formatos de presentación (así salen impresos)

- Dinero: **`1.587,03`** (miles con punto, decimales con coma, siempre 2 decimales).
- Porcentaje: **`+21 %`** (con signo, sin decimales si es entero; si no, `+20,57 %`).
- Fecha: **`dd/mm/aaaa`** (en el JSON va `AAAA-MM-DD`).
- Faltante: `s/dato` (stock o SKU desconocido).

---

## 2. Esquema JSON

```json
{
  "cliente": "EIGHTROOM",
  "fecha": "2026-11-16",
  "titulo": "2 notebooks i5 y 2 mouse inalámbricos",
  "subcarpeta": "presupuesto notebooks 16-11-2026",
  "entrega": "24 a 72 hs",
  "validez": "7 días",
  "lead": "Cotización para EIGHTROOM. Precios en dólares (USD) sin IVA, por unidad.",
  "opciones": [
    {
      "letra": "A",
      "etiqueta": "Recomendada",
      "sub": "Notebook Dell 14'' + mouse Logitech",
      "items": [
        {
          "titulo": "Notebook Dell 14'' Core i5 8GB 256GB SSD Win11 Pro",
          "detalle": "i5 4.2 GHz · 8 GB · 256 GB SSD · 14.1'' HD",
          "cant": 2,
          "costo": 219.00,
          "margen": 0.21,
          "sku": "NOT3529",
          "proveedor": "cdr",
          "stock": 10
        }
      ]
    },
    {
      "letra": "B",
      "etiqueta": "Alternativa",
      "items": [
        {
          "titulo": "Notebook HP 13.3'' Touch convertible",
          "detalle": "i5 4.1 GHz · 8 GB · 256 GB SSD · FHD táctil",
          "cant": 3,
          "costo": 265.00,
          "margen": 0.21,
          "sku": "NOT3435",
          "proveedor": "cdr",
          "stock": 10
        }
      ]
    }
  ],
  "cumplimiento": [
    { "req": "Core i5 o superior", "a": "i5 4.2 GHz", "b": "i5 4.1 GHz", "estado": "Cumple" }
  ],
  "condiciones": [
    "Precios expresados en USD sin IVA, por unidad. El IVA 22% se aplica sobre el subtotal.",
    "Tipo de cambio de referencia: 1 USD = 41,25 UYU.",
    "Vigencia de la oferta: 7 días. Disponibilidad sujeta a stock al momento de confirmar el pedido."
  ],
  "notasInternas": [
    "Verificar stock de NOT3529 antes de confirmar (stock 10 al 16/11)."
  ]
}
```

### Campos

| Campo | Tipo | Obligatorio | Para qué |
|---|---|---|---|
| `cliente` | texto | **sí** | Nombre del cliente (también arma la carpeta) |
| `fecha` | texto `AAAA-MM-DD` | sí | Fecha de la oferta |
| `titulo` | texto | sí | Título grande del presupuesto |
| `subcarpeta` | texto | no | Nombre de la carpeta de salida (si falta: `presupuesto`) |
| `entrega` | texto | no | Default `a confirmar` |
| `validez` | texto | no | Default `7 días` |
| `lead` | texto | no | Párrafo debajo del título (si falta se arma solo) |
| `opciones[]` | lista | **sí** (1 o 2) | Opciones A y B |
| `opciones[].letra` | `"A"` / `"B"` | sí | Identifica la opción |
| `opciones[].etiqueta` | texto | no | Ej. `Recomendada`, `Alternativa` |
| `opciones[].sub` | texto | no | Línea chica debajo del título de la opción |
| `opciones[].items[]` | lista | **sí** | Artículos |
| `items[].titulo` | texto | **sí** | Nombre del artículo |
| `items[].detalle` | texto | no | Especificaciones (se ven en el PDF Cliente) |
| `items[].cant` | entero | sí | Cantidad |
| `items[].costo` | número | **sí** | Costo unitario del proveedor, sin IVA |
| `items[].margen` | número | sí* | `0.21` = 21 % (también se acepta `21`) |
| `items[].precio` | número | alternativa a `margen` | Precio de venta unitario sin IVA |
| `items[].sku` | texto | interno | Código del proveedor (solo PDF INTERNO) |
| `items[].proveedor` | texto | interno | Nombre del proveedor (solo PDF INTERNO) |
| `items[].stock` | entero | interno | Stock al momento (solo PDF INTERNO) |
| `cumplimiento[]` | lista | no | Tabla de requisitos: `req`, `a`, `b`, `estado` |
| `condiciones[]` | lista de textos | no | Caja amarilla «Condiciones» del PDF Cliente |
| `notasInternas[]` | lista de textos | no | Chequeos del PDF INTERNO |

Los campos de la API (`sku`, `proveedor`, `stock`, `costo`) van **solo** en el JSON: el PDF Cliente
nunca los muestra.

---

## 3. Los 3 documentos (estructura exacta)

### Encabezado (los 3)

- Logo ITpro a la izquierda (el programa lo pone solo) y a la derecha:
  `Fecha:` dd/mm/aaaa · `Validez de la oferta:` … · `Moneda:` USD · `Entrega:` …
- Línea verde de 3 px debajo.
- Pie: `ITpro · Asunción 1278, CP 11800, Montevideo, Uruguay · Tel. (+598) 2924-0669`
  y la leyenda «Documento emitido como propuesta comercial. No constituye factura.»

### 3.1 PDF **Cliente** (`Presupuesto-ITpro-Cliente.pdf`)

1. `titulo` como título grande.
2. `lead` como párrafo gris.
3. Por cada opción, barra verde: **`Opción A — Recomendada`** (la opción B usa verde más oscuro).
4. Tabla: `#` · `Artículo` · `Detalle` · `Cant.` · `Unit. sin IVA` · `Subtotal`.
5. Caja de totales: `Subtotal` · `IVA 22%` · **`Total (IVA incl.)`** (franja verde).
6. Si hay `cumplimiento`: barra gris «Cumplimiento de las especificaciones solicitadas» y tabla
   `Requisito` · `Opción A` · `Opción B` · `Estado` (badge verde; rojo si dice «no cumple», «parcial» o «revisar»).
7. Si hay `condiciones`: caja amarilla «Condiciones:» con viñetas.

**Nunca** muestra costo, margen, proveedor, SKU ni stock.

### 3.2 PDF **Detalle** (`Presupuesto-ITpro-Detalle.pdf`)

Igual al Cliente pero sin `cumplimiento` ni `condiciones`, y el `detalle` del artículo va como
segunda línea dentro de la celda del nombre. Columnas: `#` · `Artículo` · `Cant.` ·
`Unit. sin IVA` · `Subtotal` + misma caja de totales.

### 3.3 PDF **INTERNO** (`Presupuesto-ITpro-INTERNO.pdf`)

1. Título: **`Confirmación de costos — <titulo>`**.
2. Etiqueta roja arriba: `USO INTERNO — NO ENVIAR AL CLIENTE`.
3. Párrafo: `Costos de proveedor, margen y precio de venta. Referencia: 1 USD = 41,25 UYU.`
4. Tabla: `#` · `Artículo` · `Proveedor` · `SKU` · `Stock` · `Costo` · `Margen` ·
   `Precio sin IVA` · `Total`.
5. Caja de totales: `Costo proveedor (sin IVA)` · `Ganancia` (verde) · `Subtotal` · `IVA 22%` ·
   **`Precio final cliente`** (franja verde).
6. Caja amarilla «Chequeos antes de aprobar:» con `notasInternas` + `condiciones`.
7. Pie con la leyenda «Documento de uso interno…».

---

## 4. Ejemplo real ya calculado (para verificar)

Un artículo: `costo 175,00`, `margen 0,2057…` (para llegar a precio 211,00), `cant 1`:

- Subtotal `211,00` · IVA 22 % `46,42` · **Total `257,42`**
- INTERNO: costo `175,00` · ganancia `36,00` · margen `+20,57 %`.

Si el agente devuelve estos números, está bien; si devuelve otro total, está aplicando mal el IVA.

---

## 5. Instrucción para pegar en Copilot Studio

> Pegala en **Instructions** (arriba de la descripción) y subí este archivo como conocimiento.

```text
Sos el cotizador de ITpro (Montevideo, Uruguay). Hablás en castellano rioplatense, con voseo, breve y concreto.

La API de Nibiru devuelve COSTO del proveedor en USD SIN IVA. Precio al cliente = costo x (1 + margen). El IVA 22% se suma al final. Margen por defecto: 15% para cliente nuevo. Nunca inventes precios, stock ni SKU: usá la búsqueda real.

Cuando tengas los datos, devolvé UN ÚNICO bloque de código JSON con el esquema "Esquema de cotización ITpro" (cliente, fecha AAAA-MM-DD, titulo, subcarpeta, entrega, validez, opciones A/B con items, cumplimiento, condiciones, notasInternas).

Reglas de salida:
- Nada de texto antes ni después del bloque JSON.
- Precios y costos en USD sin IVA, con punto decimal (219.5, no 219,5).
- margen como fracción (0.21 = 21%).
- Si falta el cliente, preguntalo antes de armar el JSON.
- No inventes el stock: si no lo sabés, poné null.
- No prometas "generar el PDF": vos entregás el JSON; el Cotizador ITpro arma los 3 PDF.
```

---

## 6. Cómo pasar del JSON a los PDF

**Opción A — desde el Cotizador (recomendada)**

1. Abrí el Cotizador (`INICIAR.bat` → `http://127.0.0.1:8090`).
2. Botón **«Pegar JSON»** (abajo, al lado de «Generar los 3 PDF»).
3. Pegá la respuesta de Copilot (puede venir con ```json … ``` alrededor, no importa).
4. **«Generar los 3 PDF»** → carpeta `Escritorio\presupuestos opencode\<cliente>\<subcarpeta>\`.

**Opción B — por la API** (si querés automatizarlo desde Power Automate)

```http
POST http://127.0.0.1:8090/api/pdf
Content-Type: application/json

{ "quote": { ...el JSON de arriba... } }
```

Devuelve `{ "destino": "...", "archivos": [...] }`. Requiere la cookie de sesión del cotizador.

---

## 7. Errores típicos y qué significan

| Lo que devuelve el agente | Qué pasa | Cómo se corrige |
|---|---|---|
| `margen: 21` | Se interpreta 21 % (el programa lo normaliza) | Mejor mandar `0.21` |
| `costo: "219,50"` | Se normaliza a 219.5 | Mejor mandar número |
| `fecha: "16/11/2026"` | Se normaliza a `2026-11-16` | Mejor mandar ISO |
| Totales distintos a los del ejemplo | Aplicó IVA sobre el costo o duplicó margen | Revisar fórmulas del punto 1 |
| Precio "con IVA incluido" en la tabla | El IVA va **solo** en la caja de totales | Sacar IVA de los precios unitarios |

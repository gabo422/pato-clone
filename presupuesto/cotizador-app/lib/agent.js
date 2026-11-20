'use strict';
// Agente conversacional: usa un modelo con "tool calling" (API compatible OpenAI).
// El agente NO tiene shell: solo puede tocar la cotizacion a traves de estas herramientas.
const { docCliente, docDetalle, docInterno, precioItem } = require('./docs');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SYSTEM = `Sos el asistente de cotizaciones de ITpro (Montevideo, Uruguay). Trabajás en castellano rioplatense, con voseo, y sos breve y concreto.

REGLAS DEL NEGOCIO
- La API devuelve COSTO del proveedor en USD SIN IVA.
- Precio al cliente = costo x (1 + margen). El margen se expresa en % (ej. 0,21 = 21%).
- IVA 22% se suma al final sobre el subtotal.
- Margen por defecto para cliente nuevo: 15%. Para clientes con historial usá la herramienta sugerir_margen.
- Se suelen ofrecer 2 opciones: A (recomendada) y B (alternativa). SON ALTERNATIVAS ENTRE SÍ:
  si es un solo producto, A = un modelo y B = OTRO modelo (nunca los mismos artículos en las dos,
  y nunca dos modelos distintos del mismo producto dentro de la misma opción).
- Si el usuario pide MÁS alternativas, agregá C, D… (agregar_item con opcion: "C"). No inventes
  opciones de más: si no las pide, quedan A y B.
- Nunca inventes precios, stock ni SKU: usá buscar_precio / detalle_producto.
- Antes de generar PDFs, confirmá que cliente, título y artículos estén completos.
- Después de generar PDFs, ofrecé registrar en el Excel (registrar_excel con dryRun=true primero).

CÓMO TRABAJAR
0. CANTIDAD: si el pedido dice un número de unidades ("2 mother", "5 notebooks", "3 mouse"),
   agregá los artículos con cant = ese número. A y B son alternativas del MISMO pedido, así que
   las dos opciones llevan la misma cantidad. Si no dice cantidad, cant = 1.
1. Si falta el cliente, preguntalo.
2. Buscá los productos pedidos y mostrá 2-3 alternativas con costo y stock.
3. Armá las opciones con agregar_item.
4. Aplicá el margen (fijar_margen o margen por artículo).
5. Generá los PDF y ofrecé registrar en el Excel.
- Si el usuario YA dio todos los datos, hacé todo de corrido: no pidas confirmación de cada paso.
- Pedí varias herramientas en el mismo turno cuando sean independientes (ej. dos buscar_precio, o dos agregar_item). Ahorra cuota.
- Cuando ya esté todo cargado y con margen, CERRÁ con un resumen corto (opción, artículos, total con IVA) sin llamar más herramientas. Si el usuario pidió explícitamente no generar PDFs, no los generes.

BUSCAR BIEN (MUY IMPORTANTE)
- NUNCA le pidas al usuario un modelo, una referencia o un SKU. Vos buscás: él no tiene por qué saberlo.
- Si el pedido es genérico ("una mother", "un celular", "una notebook"), buscá con la palabra genérica y ofrecé 2-3 opciones REALES del catálogo, de la más barata para arriba.
- Si pide un modelo que no aparece en el catálogo, NO preguntes: mostrale las opciones más parecidas que sí existan, aclarando que ese modelo exacto no está.
- Nunca inventes marcas, modelos ni códigos (Z790-A, B760M, etc.): usá SOLO lo que devolvió buscar_precio.
- NUNCA ofrezcas un artículo con stock 0. Si no hay stock, buscá otra alternativa o decilo.
- Si no encontrás nada, probá con menos palabras o con el SKU antes de rendirte.

REQUISITOS TÉCNICOS (slots, formato, capacidad, socket)
- Si el pedido trae un requisito ("4 slot DDR5", "2 slots", "ATX", "LGA 1700", "hasta 128 GB"),
  NO lo des por cumplido porque el título lo diga: los títulos del catálogo suelen estar mal.
- Llamá detalle_producto sobre los candidatos y fijate en la descripción (formato ATX/mATX/EATX,
  "hasta X GB", cantidad de ranuras). Eso es lo único que vale.
- Si la descripción no aclara el dato, NO lo inventes: decí "el catálogo no especifica los slots"
  y ofrecé igual las opciones, aclarando cuál sí lo dice.
- Nunca repitas "4 x DDR5" como si fueran 4 ranuras si la descripción no lo confirma.

Respondé corto: máximo 10 líneas, sin tablas ni markdown. Si te falta un dato importante, preguntá una sola cosa a la vez. Si el pedido ya se entiende, hacelo directo sin pedir confirmación.`;

// En el servidor de la red no hay Excel, ni escritorio, ni historial de clientes.
const SYSTEM_COMPARTIDO = `

MODO SERVIDOR COMPARTIDO (red interna de ITpro)
- No hay Excel ni escritorio: NO uses registrar_excel ni generar_pdfs.
- Cuando la cotización esté cargada, decile al usuario que toque el botón «Generar los 3 PDF» para bajarlos a su PC.
- El margen por defecto es 15% (cliente nuevo). No inventes márgenes de clientes con historial.
- Si el pedido no dice cantidades, asumí 1 y decilo en el resumen.
- Si falta el nombre del cliente, NO preguntes primero: cargá los artículos igual y al final pedí el nombre en una sola línea.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_precio',
      description: 'Busca en el catálogo por texto (ej "notebook i5", "mouse"). Devuelve SKU, título, costo, stock y proveedor. Los que tienen stock vienen primero: nunca ofrezcas stock 0.',
      parameters: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detalle_producto',
      description: 'Detalle y especificaciones de un SKU.',
      parameters: { type: 'object', properties: { sku: { type: 'string' } }, required: ['sku'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sugerir_margen',
      description: 'Margen histórico sugerido del cliente.',
      parameters: { type: 'object', properties: { cliente: { type: 'string' } }, required: ['cliente'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'datos_cotizacion',
      description: 'Setea datos generales de la cotización.',
      parameters: {
        type: 'object',
        properties: {
          cliente: { type: 'string' },
          titulo: { type: 'string' },
          fecha: { type: 'string', description: 'AAAA-MM-DD' },
          subcarpeta: { type: 'string' },
          entrega: { type: 'string' },
          validez: { type: 'string' },
          lead: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agregar_item',
      description: 'Agrega un artículo a la opción A o B. Rechaza artículos con stock 0.',
      parameters: {
        type: 'object',
        properties: {
          opcion: { type: 'string' },
          sku: { type: 'string' },
          titulo: { type: 'string' },
          detalle: { type: 'string' },
          cant: { type: 'integer' },
          costo: { type: 'number' },
          margen: { type: 'number', description: 'Fracción, ej 0.21' },
          precio: { type: 'number', description: 'Precio unitario sin IVA (alternativa a margen)' },
          stock: { type: 'integer' },
          proveedor: { type: 'string' },
        },
        required: ['opcion', 'titulo', 'costo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_item',
      description: 'Cambia un campo de un artículo (índice desde 1).',
      parameters: {
        type: 'object',
        properties: {
          opcion: { type: 'string' },
          indice: { type: 'integer' },
          campo: { type: 'string', enum: ['titulo', 'detalle', 'cant', 'costo', 'margen', 'precio', 'sku', 'proveedor', 'stock'] },
          valor: { type: 'string' },
        },
        required: ['opcion', 'indice', 'campo', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quitar_item',
      description: 'Elimina un artículo (índice desde 1).',
      parameters: {
        type: 'object',
        properties: { opcion: { type: 'string' }, indice: { type: 'integer' } },
        required: ['opcion', 'indice'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fijar_margen',
      description: 'Aplica el mismo margen a todos los artículos.',
      parameters: {
        type: 'object',
        properties: { margen: { type: 'number', description: 'Fracción, ej 0.21' }, opcion: { type: 'string' } },
        required: ['margen'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resumen',
      description: 'Cotización actual con totales.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generar_pdfs',
      description: 'Genera los 3 PDF en el escritorio.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_excel',
      description: 'Registra en el Excel de Gabi. Empezá con dryRun=true.',
      parameters: { type: 'object', properties: { dryRun: { type: 'boolean' } } },
    },
  },
];

function opcion(quote, letra) {
  const l = String(letra || 'A').trim().toUpperCase().slice(0, 1) || 'A';
  let op = (quote.opciones || []).find((o) => String(o.letra).toUpperCase() === l);
  if (!op) {
    op = { letra: l, etiqueta: l === 'A' ? 'Recomendada' : l === 'B' ? 'Alternativa' : 'Opción ' + l, items: [] };
    quote.opciones = quote.opciones || [];
    quote.opciones.push(op);
    quote.opciones.sort((a, b) => String(a.letra).localeCompare(String(b.letra)));
  }
  op.items = op.items || [];
  return op;
}

function recorte(s, n) {
  const t = String(s == null ? '' : s);
  return t.length > n ? t.slice(0, n) + '…' : t;
}

function resumen(quote, iva) {
  // Versión compacta: se manda al modelo en cada turno, así que cada token cuenta.
  return {
    cliente: quote.cliente,
    titulo: recorte(quote.titulo, 90),
    fecha: quote.fecha,
    subcarpeta: quote.subcarpeta,
    opciones: (quote.opciones || []).map((op) => {
      const items = (op.items || []).map((it) => ({
        titulo: recorte(it.titulo, 60),
        cant: it.cant,
        costo: it.costo,
        precio: Math.round(precioItem(it) * 100) / 100,
        margen: it.costo > 0 ? Math.round((precioItem(it) / it.costo - 1) * 10000) / 100 + '%' : 's/dato',
      }));
      const subtotal = items.reduce((a, it) => a + it.precio * (it.cant || 0), 0);
      return {
        opcion: op.letra,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        total: Math.round(subtotal * (1 + iva) * 100) / 100,
      };
    }),
  };
}

function resumenLargo(quote, iva) {
  // Versión completa, para la herramienta "resumen" (no se manda sola).
  return {
    cliente: quote.cliente,
    titulo: quote.titulo,
    fecha: quote.fecha,
    subcarpeta: quote.subcarpeta,
    opciones: (quote.opciones || []).map((op) => {
      const items = (op.items || []).map((it) => ({
        titulo: it.titulo,
        cant: it.cant,
        costo: it.costo,
        precio: Math.round(precioItem(it) * 100) / 100,
        margen: it.costo > 0 ? Math.round((precioItem(it) / it.costo - 1) * 10000) / 100 + '%' : 's/dato',
        stock: it.stock,
      }));
      const subtotal = items.reduce((a, it) => a + it.precio * (it.cant || 0), 0);
      return {
        opcion: op.letra,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        iva: Math.round(subtotal * iva * 100) / 100,
        total: Math.round(subtotal * (1 + iva) * 100) / 100,
      };
    }),
  };
}

async function ejecutar(name, args, ctx) {
  const { quote, cfg, iva, nibiru, pdf } = ctx;
  switch (name) {
    case 'buscar_precio': {
      const r = await nibiru.buscar(args.texto, 20);
      // Primero los que tienen stock: en el servidor de la red solo se devuelven
      // 6, así que si no ordenamos el modelo termina ofreciendo artículos con
      // stock 0 y no puede elegir otra cosa.
      const conStock = (p) => (Number(p.stock) > 0 ? 1 : 0);
      const ordenado = r.slice().sort((a, b) => conStock(b) - conStock(a));
      // Cada resultado se reenvía al modelo y consume cuota: en el servidor de la
      // red (cuota compartida) van 6 en vez de 10.
      const n = ctx.compartido ? 6 : 10;
      return ordenado.slice(0, n).map((p) => ({
        sku: p.sku,
        titulo: recorte(p.titulo, ctx.compartido ? 60 : 70),
        costo: p.costo,
        stock: p.stock,
        proveedor: p.proveedor,
      }));
    }
    case 'detalle_producto': {
      const p = await nibiru.producto(args.sku);
      if (!p) return { error: 'SKU no encontrado: ' + args.sku };
      return {
        sku: p.sku, titulo: p.titulo, costo: p.costo, stock: p.stock,
        proveedor: p.proveedor, descripcion: recorte(p.descripcion || '', 450),
      };
    }
    case 'sugerir_margen': {
      const r = await ctx.sugerirMargen(args.cliente || quote.cliente);
      return r;
    }
    case 'datos_cotizacion': {
      for (const k of ['cliente', 'titulo', 'fecha', 'subcarpeta', 'entrega', 'validez', 'lead']) {
        if (args[k] != null && args[k] !== '') quote[k] = args[k];
      }
      return { ok: true, quote: { cliente: quote.cliente, titulo: quote.titulo, fecha: quote.fecha, subcarpeta: quote.subcarpeta } };
    }
    case 'agregar_item': {
      const op = opcion(quote, args.opcion);
      const stock = args.stock != null && args.stock !== '' ? Number(args.stock) : null;
      // No se cotiza lo que no hay: si el catálogo dice stock 0, que el modelo
      // elija otra alternativa en vez de dejarlo en la cotización.
      if (stock === 0) {
        return {
          error: 'Ese artículo no tiene stock (0). Elegí otra alternativa con stock y volvé a llamar agregar_item.',
        };
      }
      const it = {
        titulo: args.titulo,
        detalle: args.detalle || '',
        cant: Number(args.cant) || 1,
        costo: Number(args.costo) || 0,
        sku: args.sku || '',
        proveedor: args.proveedor || '',
        stock,
      };
      // precio 0 o vacío = "no lo puse": se usa el margen. Si no, el ítem quedaba
      // con precio 0 y el PDF salía en cero (bug visto con gpt-oss-20b).
      if (args.precio != null && args.precio !== '' && Number(args.precio) > 0) it.precio = Number(args.precio);
      else it.margen = args.margen != null ? Number(args.margen) : cfg.margenDefault;
      op.items.push(it);
      return { ok: true, items: op.items.length };
    }
    case 'actualizar_item': {
      const op = opcion(quote, args.opcion);
      const it = op.items[Number(args.indice) - 1];
      if (!it) return { error: 'No existe el índice ' + args.indice };
      const campo = String(args.campo);
      if (['cant', 'costo', 'margen', 'precio', 'stock'].includes(campo)) {
        const n = Number(String(args.valor).replace(',', '.'));
        if (Number.isNaN(n)) return { error: 'Valor numérico inválido' };
        it[campo] = n;
        if (campo === 'margen') delete it.precio;
        if (campo === 'precio') delete it.margen;
      } else {
        it[campo] = String(args.valor);
      }
      return { ok: true, item: it };
    }
    case 'quitar_item': {
      const op = opcion(quote, args.opcion);
      const i = Number(args.indice) - 1;
      if (!op.items[i]) return { error: 'No existe el índice ' + args.indice };
      op.items.splice(i, 1);
      return { ok: true, items: op.items.length };
    }
    case 'fijar_margen': {
      const m = Number(args.margen);
      const ops = args.opcion ? [opcion(quote, args.opcion)] : quote.opciones || [];
      let n = 0;
      for (const op of ops) for (const it of op.items || []) { it.margen = m; delete it.precio; n++; }
      return { ok: true, aplicado: n, margen: m };
    }
    case 'resumen':
      return resumenLargo(quote, iva);
    case 'generar_pdfs': {
      if (ctx.compartido) {
        return { error: 'En este servidor los PDF los genera el botón «Generar los 3 PDF» de la pantalla. No los generes vos.' };
      }
      if (!quote.cliente) return { error: 'Falta el cliente.' };
      const cambio = ctx.cambioLive ? await ctx.cambioLive() : cfg.cambio;
      const htmls = {
        cliente: docCliente(quote, ctx.logo, iva, cambio),
        detalle: docDetalle(quote, ctx.logo, iva),
        interno: docInterno(quote, ctx.logo, iva, cambio),
      };
      const r = await pdf.generarPdfs(quote, cfg, htmls);
      return { ok: true, carpeta: r.destino, archivos: r.archivos.map((a) => a.path) };
    }
    case 'registrar_excel': {
      if (ctx.compartido) return { error: 'En este servidor no hay Excel. No registres nada.' };
      const r = await ctx.registrarExcel(quote, { dryRun: args.dryRun !== false });
      return r;
    }
    default:
      return { error: 'Herramienta desconocida: ' + name };
  }
}

// ---------------------------------------------------------------------------
// Proveedor OpenCode (Big Pickle, gratis) como alternativa a Groq.
//
// OpenCode expone /api/experimental/generate/text: es one-shot y no tiene
// herramientas. Acá emulamos el protocolo de tool calling: las herramientas se
// mandan como JSON dentro del prompt y la respuesta JSON se convierte de vuelta
// a `tool_calls`. Las herramientas SIGUEN ejecutándose dentro del cotizador;
// OpenCode solo genera texto (no tiene acceso a archivos ni a la PC).
//
// Se activa con agent.proveedor = "opencode" en config.json. Si se acaba la
// cuota gratis, se usa agent.fallback (compatible OpenAI) para no dejar el bot
// caído; si no hay fallback, se avisa con un mensaje claro.
// ---------------------------------------------------------------------------
class CuotaOpenCodeAgotada extends Error {}

function passwordOpencode(cfg) {
  const oc = (cfg.agent && cfg.agent.opencode) || {};
  if (process.env.OPENCODE_PASSWORD) return process.env.OPENCODE_PASSWORD;
  const archivo = oc.passwordFile || path.join(os.homedir(), '.config', 'opencode', 'service.json');
  const texto = fs.readFileSync(archivo, 'utf8').trim();
  if (/\.json$/i.test(archivo)) {
    const j = JSON.parse(texto);
    if (!j.password) throw new Error('service.json de OpenCode sin password: ' + archivo);
    return j.password;
  }
  return texto;
}

function promptOpencode(messages, tools) {
  const lineas = [
    'Sos el asistente de cotizaciones de ITpro. Respondé SOLO con un objeto JSON válido,',
    'sin texto adicional, sin markdown y sin explicaciones. No incluyas razonamiento.',
    '',
    'Protocolo:',
    '- Para llamar UNA herramienta: {"tool":"nombre","args":{"clave":"valor"}}',
    '- Para responder al usuario: {"text":"respuesta en español rioplatense"}',
    '- Nunca inventes herramientas ni parámetros fuera de la lista.',
    '',
    'Herramientas disponibles (JSON):',
    JSON.stringify(tools || []),
    '',
    'Conversación (los mensajes role=tool son resultados de herramientas ya ejecutadas):',
  ];
  for (const m of messages || []) {
    let contenido = m.content == null ? '' : String(m.content);
    if (m.tool_calls && m.tool_calls.length) {
      contenido += '\n[llamadas que hiciste] ' + JSON.stringify(
        m.tool_calls.map((c) => ({
          nombre: c.function && c.function.name,
          args: c.function && c.function.arguments,
        }))
      );
    }
    if (m.role === 'tool') contenido = '[resultado de ' + (m.tool_call_id || 'herramienta') + '] ' + contenido;
    lineas.push('<' + (m.role || 'user') + '> ' + contenido + ' </' + (m.role || 'user') + '>');
  }
  return lineas.join('\n');
}

function parsearRespuestaOpencode(texto) {
  let s = String(texto == null ? '' : texto).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const ini = s.indexOf('{');
  const fin = s.lastIndexOf('}');
  const comoTexto = (contenido) => ({
    choices: [{ message: { role: 'assistant', content: contenido, tool_calls: [] } }],
  });
  if (ini < 0 || fin <= ini) return comoTexto(s); // el modelo ignoró el protocolo: lo tomamos como respuesta
  let obj;
  try {
    obj = JSON.parse(s.slice(ini, fin + 1));
  } catch {
    return comoTexto(s);
  }
  if (obj && typeof obj.tool === 'string' && obj.tool) {
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'oc_' + Math.random().toString(36).slice(2, 10),
            type: 'function',
            function: { name: obj.tool, arguments: JSON.stringify(obj.args || {}) },
          }],
        },
      }],
    };
  }
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: String(obj.text != null ? obj.text : obj.respuesta || ''),
        tool_calls: [],
      },
    }],
  };
}

async function chatOpencode(cfg, messages, tools) {
  const oc = (cfg.agent && cfg.agent.opencode) || {};
  const base = String(oc.url || 'http://127.0.0.1:4096').replace(/\/$/, '');
  const url = base + '/api/experimental/generate/text';
  const pass = passwordOpencode(cfg);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from('opencode:' + pass).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: promptOpencode(messages, tools),
      model: oc.model || { id: 'big-pickle', providerID: 'opencode' },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const txt = await res.text();
  if (!res.ok) {
    let detalle = txt.slice(0, 300);
    try {
      const j = JSON.parse(txt);
      detalle = j.message || j.reason || detalle;
    } catch {}
    if (/Free usage limit reached|rate_limit/i.test(detalle)) {
      throw new CuotaOpenCodeAgotada(detalle);
    }
    throw new Error('OpenCode ' + res.status + ': ' + detalle);
  }
  let data;
  try { data = JSON.parse(txt); } catch { throw new Error('OpenCode devolvió una respuesta inesperada: ' + txt.slice(0, 200)); }
  return parsearRespuestaOpencode(data.text || data.response);
}

async function chat(cfg, messages, tools, intento = 1) {
  if (String((cfg.agent && cfg.agent.proveedor) || '').toLowerCase() === 'opencode') {
    try {
      return await chatOpencode(cfg, messages, tools);
    } catch (e) {
      if (!(e instanceof CuotaOpenCodeAgotada)) throw e;
      const sinCuota =
        'Se acabó la cuota gratis de OpenCode (vuelve en unas horas). ' +
        'Mientras tanto podés cargar los artículos a mano con «Buscar precio». Detalle: ' + e.message;
      const fb = cfg.agent.fallback;
      if (!fb) throw new Error(sinCuota);
      // El fallback puede ser OTRO MODELO GRATIS del mismo OpenCode (DeepSeek),
      // que no necesita API key; o un proveedor compatible OpenAI (Groq, etc.).
      if (String(fb.proveedor || '').toLowerCase() === 'opencode') {
        if (process.env.COTI_DEBUG) console.error('[agente] Big Pickle sin cuota -> probando DeepSeek por OpenCode');
        try {
          return await chatOpencode({ agent: { opencode: fb.opencode || fb } }, messages, tools);
        } catch (e2) {
          if (e2 instanceof CuotaOpenCodeAgotada) throw new Error(sinCuota + ' (el fallback de OpenCode también está sin cuota)');
          throw e2;
        }
      }
      if (!fb.apiKey) throw new Error(sinCuota);
      if (process.env.COTI_DEBUG) console.error('[agente] Big Pickle sin cuota -> usando fallback con API key');
      return chat({ ...cfg, agent: fb }, messages, tools, intento);
    }
  }
  const base = String(cfg.agent.baseUrl || '').replace(/\/$/, '');
  if (!/^https?:\/\//i.test(base)) {
    throw new Error(
      'La URL base del agente está mal: "' + base + '". Tiene que ser la dirección de la API, por ejemplo https://api.groq.com/openai/v1'
    );
  }
  const url = base + '/chat/completions';
  const cuerpo = {
    model: cfg.agent.model,
    messages,
    temperature: 0.2,
    max_tokens: 900,
  };
  // Los modelos gpt-oss razonan antes de contestar y eso consume mucha cuota.
  // En el plan gratis de Groq (8.000 tokens por minuto) con "medium" no alcanza
  // para una cotización completa, así que se baja a "low": contesta igual de bien
  // para esta tarea y gasta la mitad.
  if (/gpt-oss/i.test(String(cfg.agent.model || ''))) {
    cuerpo.reasoning_effort = cfg.agent.reasoning || 'low';
  }
  // Sin tools: se usa para el pedido de cierre (que el modelo escriba el resumen final).
  if (tools && tools.length) {
    cuerpo.tools = tools;
    cuerpo.tool_choice = 'auto';
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + cfg.agent.apiKey,
    },
    body: JSON.stringify(cuerpo),
  });
  const txt = await res.text();
  if (!res.ok) {
    let detalle = txt.slice(0, 300);
    try {
      const j = JSON.parse(txt);
      detalle = (j.error && (j.error.message || j.error.type)) || j.message || detalle;
    } catch {}
    if (/model.*(not found|does not exist|decommissioned|invalid)/i.test(detalle)) {
      throw new Error('El modelo "' + cfg.agent.model + '" no existe en ese proveedor. Probá otro nombre. Detalle: ' + detalle);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('La API key del agente fue rechazada. Revisala en Configuración del agente. Detalle: ' + detalle);
    }
    if (res.status === 429) {
      // Cuota por minuto: el proveedor dice cuánto esperar ("try again in 637.5ms"
      // o "in 2.5s"). Se espera eso y se reintenta, hasta 4 veces.
      const m = /try again in ([\d.]+)\s*(ms|s)/i.exec(detalle);
      let espera = 0;
      if (m) {
        espera = Number(m[1]) / (m[2].toLowerCase() === 'ms' ? 1000 : 1);
      }
      espera = Math.min(Math.ceil(espera) + 1, 20);
      // Cuota DIARIA agotada (el plan gratis da ~200.000 tokens por día y modelo):
      // no sirve esperar, se renueva recién al día siguiente.
      if (/tokens per day|TPD/i.test(detalle)) {
        throw new Error(
          'Se acabó la cuota diaria de la IA del plan gratis. Se renueva solo mañana; ' +
            'mientras tanto podés cargar los artículos a mano con «Buscar precio».'
        );
      }
      if (intento <= 4) {
        await new Promise((r) => setTimeout(r, (espera || 5) * 1000));
        return chat(cfg, messages, tools, intento + 1);
      }
      throw new Error(
        'El proveedor gratis está saturado (límite de tokens por minuto). Esperá medio minuto y volvé a pedirlo, ' +
          'o cargá los artículos a mano. Detalle: ' + detalle
      );
    }
    if (res.status === 400 && /tool call validation failed|was not in request\.tools/i.test(detalle)) {
      // Bug conocido de gpt-oss: a veces manda el nombre de la herramienta con
      // basura del canal de razonamiento ("buscar_precio<|channel|>commentary") y
      // el proveedor rechaza todo el pedido. Reintentar suele salir bien.
      if (intento <= 2) {
        await new Promise((r) => setTimeout(r, 400));
        return chat(cfg, messages, tools, intento + 1);
      }
      throw new Error(
        'El modelo armó mal una herramienta (falla conocida del plan gratis). Volvé a pedirlo en unos segundos. Detalle: ' + detalle
      );
    }
    throw new Error('Modelo: ' + res.status + ' ' + detalle);
  }
  const data = JSON.parse(txt);
  // Diagnóstico de cuota: con el plan gratis de Groq (8.000 tokens/minuto) conviene
  // ver cuánto gasta cada turno. Solo se imprime con COTI_DEBUG=1.
  if (process.env.COTI_DEBUG && data.usage) {
    const u = data.usage;
    const razon = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0;
    console.error('[agente] prompt=' + u.prompt_tokens + ' salida=' + u.completion_tokens + ' (razonamiento=' + razon + ')');
  }
  return data;
}

/**
 * Corre el loop de agente. Devuelve { mensaje, quote, acciones }.
 */
async function correrAgente({ cfg, quote, historial, mensaje, ctx }) {
  const usaOpencode = String((cfg.agent && cfg.agent.proveedor) || '').toLowerCase() === 'opencode';
  if (!cfg.agent || (!cfg.agent.apiKey && !usaOpencode)) {
    throw new Error('El agente no está configurado: falta agent.apiKey (o agent.proveedor = "opencode").');
  }
  const messages = [{ role: 'system', content: SYSTEM + (ctx.compartido ? SYSTEM_COMPARTIDO : '') }];
  // En el servidor compartido no se ofrecen las herramientas de Windows/Excel.
  const tools = ctx.compartido
    ? TOOLS.filter((t) => !['registrar_excel', 'generar_pdfs'].includes(t.function.name))
    : TOOLS;
  // Historial corto: con cuotas gratis, mandar 12 mensajes largos revienta el límite por minuto.
  for (const h of (historial || []).slice(-4)) {
    if (h.rol === 'user' || h.rol === 'assistant') {
      messages.push({ role: h.rol, content: recorte(h.texto, 400) });
    }
  }
  messages.push({
    role: 'user',
    content:
      'COTIZACIÓN ACTUAL (JSON):\n' + JSON.stringify(resumen(quote, ctx.iva)) + '\n\nPEDIDO DEL USUARIO:\n' + mensaje,
  });

  const acciones = [];
  let empujones = 0;
  for (let i = 0; i < 6; i++) {
    const data = await chat(cfg, messages, tools);
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) throw new Error('Respuesta vacía del modelo.');
    messages.push(msg);

    const calls = msg.tool_calls || [];
    if (!calls.length) {
      const texto = String(msg.content || '').trim();
      // Bug visto en el plan gratis: a veces el modelo CONTESTA la cotización en
      // texto (con precios y opciones) pero se olvida de llamar a agregar_item, y
      // el usuario se queda con el formulario vacío. Un empujón y lo hace.
      const hablaDeCotizacion = /opci[oó]n|subtotal|iva|total/i.test(texto);
      const agrego = acciones.some(
        (a) => a.herramienta === 'agregar_item' && !(a.resultado && a.resultado.error)
      );
      if (hablaDeCotizacion && !agrego && empujones < 1) {
        empujones++;
        messages.push({
          role: 'user',
          content:
            'Ojo: no llamaste a agregar_item, así que la cotización quedó VACÍA. Si ya elegiste los artículos, ' +
            'llamá agregar_item ahora (uno por opción, con la cantidad de unidades que pidió el usuario). ' +
            'Si todavía te falta un dato para elegirlos, preguntá solo eso.',
        });
        continue;
      }
      return { mensaje: texto, quote, acciones };
    }

    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
      let resultado;
      try {
        resultado = await ejecutar(call.function.name, args, ctx);
      } catch (e) {
        resultado = { error: String(e.message || e) };
      }
      acciones.push({ herramienta: call.function.name, args, resultado });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: recorte(JSON.stringify(resultado), 2500),
      });
    }
  }

  // Llegó al tope de iteraciones: pedimos un último turno SIN herramientas para que
  // cierre con un resumen útil (si no, devolvía "corté el trabajo" y no se entendía nada).
  let cierre = '';
  try {
    messages.push({
      role: 'user',
      content:
        'No uses más herramientas. Escribí el cierre para el usuario: qué quedó cargado en la cotización ' +
        '(opción, artículos y total con IVA) y qué falta, en 6 líneas como máximo.',
    });
    const data = await chat(cfg, messages, null);
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    cierre = String((msg && msg.content) || '').trim();
  } catch {
    // si el cierre falla (cuota/red), seguimos con el mensaje genérico
  }
  return {
    mensaje: cierre || 'Ya apliqué los cambios en la cotización. Revisala y decime qué ajusto.',
    quote,
    acciones,
  };
}

module.exports = { correrAgente, TOOLS, SYSTEM, resumen };

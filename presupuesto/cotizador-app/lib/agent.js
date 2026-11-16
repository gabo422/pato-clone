'use strict';
// Agente conversacional: usa un modelo con "tool calling" (API compatible OpenAI).
// El agente NO tiene shell: solo puede tocar la cotizacion a traves de estas herramientas.
const { docCliente, docDetalle, docInterno, precioItem } = require('./docs');

const SYSTEM = `Sos el asistente de cotizaciones de ITpro (Montevideo, Uruguay). Trabajás en castellano rioplatense, con voseo, y sos breve y concreto.

REGLAS DEL NEGOCIO
- La API devuelve COSTO del proveedor en USD SIN IVA.
- Precio al cliente = costo x (1 + margen). El margen se expresa en % (ej. 0,21 = 21%).
- IVA 22% se suma al final sobre el subtotal.
- Margen por defecto para cliente nuevo: 15%. Para clientes con historial usá la herramienta sugerir_margen.
- Se suelen ofrecer 2 opciones: A (recomendada) y B (alternativa).
- Nunca inventes precios, stock ni SKU: usá buscar_precio / detalle_producto.
- Antes de generar PDFs, confirmá que cliente, título y artículos estén completos.
- Después de generar PDFs, ofrecé registrar en el Excel (registrar_excel con dryRun=true primero).

CÓMO TRABAJAR
1. Si falta el cliente, preguntalo.
2. Buscá los productos pedidos y mostrá 2-3 alternativas con costo y stock.
3. Armá las opciones con agregar_item.
4. Aplicá el margen (fijar_margen o margen por artículo).
5. Generá los PDF y ofrecé registrar en el Excel.

Respondé en texto plano corto (sin markdown complicado). Si una herramienta falla, explicalo en una línea.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_precio',
      description: 'Busca artículos en el catálogo de proveedores por texto libre (ej: "notebook i5", "mouse inalámbrico"). Devuelve SKU, título, costo, stock y proveedor.',
      parameters: {
        type: 'object',
        properties: { texto: { type: 'string', description: 'Texto a buscar' } },
        required: ['texto'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detalle_producto',
      description: 'Trae el detalle completo de un producto por SKU (nombre real y especificaciones).',
      parameters: { type: 'object', properties: { sku: { type: 'string' } }, required: ['sku'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sugerir_margen',
      description: 'Devuelve el margen histórico sugerido para un cliente según las ventas anteriores.',
      parameters: { type: 'object', properties: { cliente: { type: 'string' } }, required: ['cliente'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'datos_cotizacion',
      description: 'Setea los datos generales de la cotización.',
      parameters: {
        type: 'object',
        properties: {
          cliente: { type: 'string' },
          titulo: { type: 'string', description: 'Título del presupuesto, ej: "5 notebooks y 5 mouse inalámbricos"' },
          fecha: { type: 'string', description: 'AAAA-MM-DD' },
          subcarpeta: { type: 'string', description: 'Nombre de la carpeta de salida, ej: "presupuesto notebooks 13-11-2026"' },
          entrega: { type: 'string' },
          validez: { type: 'string' },
          lead: { type: 'string', description: 'Párrafo introductorio para el cliente' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agregar_item',
      description: 'Agrega un artículo a una opción (A o B).',
      parameters: {
        type: 'object',
        properties: {
          opcion: { type: 'string', description: 'A o B' },
          sku: { type: 'string' },
          titulo: { type: 'string' },
          detalle: { type: 'string', description: 'Especificaciones para el cliente' },
          cant: { type: 'integer' },
          costo: { type: 'number' },
          margen: { type: 'number', description: 'Margen como fracción, ej 0.21' },
          precio: { type: 'number', description: 'Precio de venta unitario sin IVA (alternativa al margen)' },
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
      description: 'Cambia un campo de un artículo existente (por opción e índice empezando en 1).',
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
      description: 'Elimina un artículo por opción e índice (empezando en 1).',
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
      description: 'Aplica el mismo margen a todos los artículos (de una opción o de todas).',
      parameters: {
        type: 'object',
        properties: {
          margen: { type: 'number', description: 'Fracción, ej 0.21' },
          opcion: { type: 'string', description: 'A, B o vacío para todas' },
        },
        required: ['margen'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resumen',
      description: 'Devuelve la cotización actual con totales calculados. Usalo para verificar antes de generar.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generar_pdfs',
      description: 'Genera los 3 PDF (cliente, detalle e interno) en el escritorio. Requiere cliente y artículos cargados.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_excel',
      description: 'Registra la cotización en "Gabi Cotizaciones 2026.xlsx". Empezá con dryRun=true.',
      parameters: {
        type: 'object',
        properties: { dryRun: { type: 'boolean' } },
      },
    },
  },
];

function opcion(quote, letra) {
  const l = String(letra || 'A').trim().toUpperCase().slice(0, 1) || 'A';
  let op = (quote.opciones || []).find((o) => String(o.letra).toUpperCase() === l);
  if (!op) {
    op = { letra: l, etiqueta: l === 'A' ? 'Recomendada' : 'Alternativa', items: [] };
    quote.opciones = quote.opciones || [];
    quote.opciones.push(op);
    quote.opciones.sort((a, b) => String(a.letra).localeCompare(String(b.letra)));
  }
  op.items = op.items || [];
  return op;
}

function resumen(quote, iva) {
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
      return r.slice(0, 20).map((p) => ({
        sku: p.sku, titulo: p.titulo, costo: p.costo, stock: p.stock, proveedor: p.proveedor,
      }));
    }
    case 'detalle_producto': {
      const p = await nibiru.producto(args.sku);
      if (!p) return { error: 'SKU no encontrado: ' + args.sku };
      return {
        sku: p.sku, titulo: p.titulo, costo: p.costo, stock: p.stock,
        proveedor: p.proveedor, descripcion: String(p.descripcion || '').slice(0, 1500),
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
      const it = {
        titulo: args.titulo,
        detalle: args.detalle || '',
        cant: Number(args.cant) || 1,
        costo: Number(args.costo) || 0,
        sku: args.sku || '',
        proveedor: args.proveedor || '',
        stock: args.stock != null ? args.stock : null,
      };
      if (args.precio != null && args.precio !== '') it.precio = Number(args.precio);
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
      return resumen(quote, iva);
    case 'generar_pdfs': {
      if (!quote.cliente) return { error: 'Falta el cliente.' };
      const htmls = {
        cliente: docCliente(quote, ctx.logo, iva),
        detalle: docDetalle(quote, ctx.logo, iva),
        interno: docInterno(quote, ctx.logo, iva, cfg.cambio),
      };
      const r = await pdf.generarPdfs(quote, cfg, htmls);
      return { ok: true, carpeta: r.destino, archivos: r.archivos.map((a) => a.path) };
    }
    case 'registrar_excel': {
      const r = await ctx.registrarExcel(quote, { dryRun: args.dryRun !== false });
      return r;
    }
    default:
      return { error: 'Herramienta desconocida: ' + name };
  }
}

async function chat(cfg, messages, tools) {
  const url = String(cfg.agent.baseUrl).replace(/\/$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + cfg.agent.apiKey,
    },
    body: JSON.stringify({
      model: cfg.agent.model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error('Modelo: ' + res.status + ' ' + txt.slice(0, 400));
  return JSON.parse(txt);
}

/**
 * Corre el loop de agente. Devuelve { mensaje, quote, acciones }.
 */
async function correrAgente({ cfg, quote, historial, mensaje, ctx }) {
  if (!cfg.agent || !cfg.agent.apiKey) {
    throw new Error('El agente no está configurado: falta la API key en config.json (agent.apiKey).');
  }
  const messages = [{ role: 'system', content: SYSTEM }];
  for (const h of (historial || []).slice(-12)) {
    if (h.rol === 'user' || h.rol === 'assistant') messages.push({ role: h.rol, content: String(h.texto || '').slice(0, 4000) });
  }
  messages.push({
    role: 'user',
    content:
      'COTIZACIÓN ACTUAL (JSON):\n' + JSON.stringify(resumen(quote, ctx.iva)) + '\n\nPEDIDO DEL USUARIO:\n' + mensaje,
  });

  const acciones = [];
  for (let i = 0; i < 8; i++) {
    const data = await chat(cfg, messages, TOOLS);
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) throw new Error('Respuesta vacía del modelo.');
    messages.push(msg);

    const calls = msg.tool_calls || [];
    if (!calls.length) {
      return { mensaje: String(msg.content || '').trim(), quote, acciones };
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
        content: JSON.stringify(resultado).slice(0, 6000),
      });
    }
  }
  return { mensaje: 'Corté el trabajo para no dar vueltas de más. Revisá la cotización y decime qué ajusto.', quote, acciones };
}

module.exports = { correrAgente, TOOLS, SYSTEM, resumen };

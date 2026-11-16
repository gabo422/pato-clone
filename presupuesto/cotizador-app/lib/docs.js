'use strict';
// Genera los 3 documentos (Cliente / Detalle / INTERNO) a partir de una cotizacion.
// El diseno replica el de los presupuestos ya entregados (verde ITpro, tablas finas).

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
}

function pct(n) {
  const v = (Number(n) || 0) * 100;
  const s = Number.isInteger(Math.round(v * 100) / 100) ? v.toFixed(0) : v.toFixed(2).replace('.', ',');
  return (v >= 0 ? '+' : '') + s + '%';
}

function fechaLarga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// ---------------------------------------------------------------------------
// Calculos
// ---------------------------------------------------------------------------
function precioItem(it) {
  if (it.precio != null && it.precio !== '') return Number(it.precio);
  return (Number(it.costo) || 0) * (1 + (Number(it.margen) || 0));
}

function margenItem(it) {
  const c = Number(it.costo) || 0;
  const p = precioItem(it);
  if (c <= 0) return 0;
  return p / c - 1;
}

function totalesOpcion(op, iva) {
  const items = op.items || [];
  let subtotal = 0;
  let costo = 0;
  for (const it of items) {
    const cant = Number(it.cant) || 0;
    subtotal += precioItem(it) * cant;
    costo += (Number(it.costo) || 0) * cant;
  }
  const ivaMonto = subtotal * iva;
  return {
    costo,
    ganancia: subtotal - costo,
    subtotal,
    iva: ivaMonto,
    total: subtotal + ivaMonto,
    items: items.length,
  };
}

// ---------------------------------------------------------------------------
// CSS compartido
// ---------------------------------------------------------------------------
const CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; color: #1f2430; margin: 0; padding: 34px 44px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f8f4e; padding-bottom: 14px; margin-bottom: 18px; }
  .head img { width: 132px; height: auto; }
  .meta { text-align: right; font-size: 11px; color: #5a6270; line-height: 1.55; }
  .tag { display: inline-block; background: #7a1f1f; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: .5px; padding: 2px 10px; border-radius: 4px; margin-bottom: 6px; }
  h1 { font-size: 19px; margin: 6px 0 2px; }
  .lead { color: #5a6270; font-size: 11.5px; margin-bottom: 16px; }
  h2 { font-size: 14px; margin: 24px 0 8px; padding: 7px 10px; background: #1f8f4e; color: #fff; border-radius: 5px; }
  h2.alt { background: #146b3a; }
  h2.grey { background: #eef7f1; color: #1f5c3a; }
  .sub { color: #5a6270; font-size: 11px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #eef7f1; text-align: left; padding: 7px 9px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; color: #2c4a3a; border-bottom: 2px solid #cde6d8; }
  th.num { text-align: right; white-space: nowrap; }
  th.c { text-align: center; width: 30px; }
  td { padding: 7px 9px; border-bottom: 1px solid #e7ebf3; vertical-align: top; }
  td.c { text-align: center; white-space: nowrap; color: #5a6270; }
  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 600; }
  td.model { font-weight: 700; color: #1f2430; }
  td.mono { font-family: Consolas, "Courier New", monospace; font-size: 10px; color: #33415c; }
  td.det { color: #4a5262; font-size: 11px; }
  .badge { display: inline-block; background: #e8f7ec; color: #1c7a3a; border-radius: 10px; padding: 1px 8px; font-size: 10px; font-weight: 600; }
  .badge.warn { background: #fdeaea; color: #b3261e; }
  .stockna { color: #b06a00; font-weight: 600; }
  .totbox { margin-top: 14px; margin-left: auto; width: 360px; border: 2px solid #1f8f4e; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
  .totbox .row { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #e7ebf3; font-size: 12px; }
  .totbox .row span:last-child { font-weight: 600; font-variant-numeric: tabular-nums; }
  .totbox .row.margin { color: #146b3a; }
  .totbox .row.final { background: #1f8f4e; color: #fff; border-bottom: none; font-size: 15px; font-weight: 700; }
  .totbox .row.final span:last-child { font-weight: 700; }
  .note { background: #fff7e6; border-left: 4px solid #f0a020; padding: 10px 12px; border-radius: 4px; font-size: 11px; margin-top: 16px; line-height: 1.55; }
  .note strong { color: #6b4a00; }
  ul { margin: 6px 0 0; padding-left: 18px; } li { margin-bottom: 3px; }
  .foot { margin-top: 26px; border-top: 1px solid #cde6d8; padding-top: 10px; font-size: 10.5px; color: #5a6270; line-height: 1.6; }
  .nowrap { white-space: nowrap; }
`;

function layout({ titulo, logo, meta, cuerpo, tag }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${esc(titulo)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="head">
  <img src="${logo}" alt="ITpro">
  <div class="meta">${meta}</div>
</div>
${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
${cuerpo}
<div class="foot">
  <strong>ITpro</strong> · Asunción 1278, CP 11800, Montevideo, Uruguay · Tel. (+598) 2924-0669<br>
  ${titulo === 'Presupuesto INTERNO' ? 'Documento de uso interno. No constituye cotización al cliente ni factura.' : 'Documento emitido como propuesta comercial. No constituye factura.'}
</div>
</body>
</html>`;
}

const metaCliente = (q) => `
    <strong>Fecha:</strong> ${fechaLarga(q.fecha)}<br>
    <strong>Validez de la oferta:</strong> ${esc(q.validez || '7 días')}<br>
    <strong>Moneda:</strong> USD<br>
    <strong>Entrega:</strong> ${esc(q.entrega || 'a confirmar')}`;

const leadTexto = (q) =>
  q.lead
    ? esc(q.lead)
    : `Cotización para <strong>${esc(q.cliente)}</strong>. Precios en dólares (USD) <strong>sin IVA</strong>, por unidad.`;

// ---------------------------------------------------------------------------
// CLIENTE
// ---------------------------------------------------------------------------
function docCliente(q, logo, iva) {
  let cuerpo = `<h1>${esc(q.titulo || 'Presupuesto')}</h1>\n<div class="lead">${leadTexto(q)}</div>`;

  (q.opciones || []).forEach((op, idx) => {
    const cls = idx === 0 ? '' : ' class="alt"';
    cuerpo += `\n<h2${cls}>Opción ${esc(op.letra)}${op.etiqueta ? ' — ' + esc(op.etiqueta) : ''}</h2>`;
    if (op.sub) cuerpo += `\n<div class="sub">${esc(op.sub)}</div>`;
    cuerpo += `
<table>
  <thead><tr><th class="c">#</th><th>Artículo</th><th>Detalle</th><th class="num">Cant.</th><th class="num">Unit. sin IVA</th><th class="num">Subtotal</th></tr></thead>
  <tbody>`;
    (op.items || []).forEach((it, i) => {
      const cant = Number(it.cant) || 0;
      const precio = precioItem(it);
      cuerpo += `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="model">${esc(it.titulo)}</td>
      <td class="det">${esc(it.detalle || '')}</td>
      <td class="num">${cant}</td>
      <td class="num">${money(precio)}</td>
      <td class="num">${money(precio * cant)}</td>
    </tr>`;
    });
    cuerpo += `\n  </tbody>\n</table>`;
    const t = totalesOpcion(op, iva);
    cuerpo += `
<div class="totbox">
  <div class="row"><span>Subtotal</span><span>USD ${money(t.subtotal)}</span></div>
  <div class="row"><span>IVA ${Math.round(iva * 100)}%</span><span>USD ${money(t.iva)}</span></div>
  <div class="row final"><span>Total (IVA incl.)</span><span>USD ${money(t.total)}</span></div>
</div>`;
  });

  if ((q.cumplimiento || []).length) {
    cuerpo += `\n<h2 class="grey">Cumplimiento de las especificaciones solicitadas</h2>\n<table>
  <thead><tr><th>Requisito</th><th>Opción A</th><th>Opción B</th><th>Estado</th></tr></thead>
  <tbody>`;
    for (const c of q.cumplimiento) {
      const estado = String(c.estado || 'Cumple');
      const warn = /no cumple|parcial|revisar/i.test(estado);
      cuerpo += `\n    <tr><td>${esc(c.req)}</td><td>${esc(c.a)}</td><td>${esc(c.b)}</td><td><span class="badge${warn ? ' warn' : ''}">${esc(estado)}</span></td></tr>`;
    }
    cuerpo += `\n  </tbody>\n</table>`;
  }

  const cond = (q.condiciones || []).filter((c) => String(c).trim());
  if (cond.length) {
    cuerpo += `\n<div class="note">\n  <strong>Condiciones:</strong>\n  <ul>`;
    for (const c of cond) cuerpo += `\n    <li>${esc(c)}</li>`;
    cuerpo += `\n  </ul>\n</div>`;
  }

  return layout({ titulo: 'Presupuesto - ITpro', logo, meta: metaCliente(q), cuerpo });
}

// ---------------------------------------------------------------------------
// DETALLE (cliente, precio por componente)
// ---------------------------------------------------------------------------
function docDetalle(q, logo, iva) {
  let cuerpo = `<h1>${esc(q.titulo || 'Detalle del presupuesto')}</h1>
<div class="lead">Detalle de cada artículo por unidad. Precios en USD <strong>sin IVA</strong>. Cliente: ${esc(q.cliente)}.</div>`;

  (q.opciones || []).forEach((op, idx) => {
    const cls = idx === 0 ? '' : ' class="alt"';
    cuerpo += `\n<h2${cls}>Opción ${esc(op.letra)}${op.etiqueta ? ' — ' + esc(op.etiqueta) : ''}</h2>`;
    cuerpo += `
<table>
  <thead><tr><th class="c">#</th><th>Artículo</th><th class="num">Cant.</th><th class="num">Unit. sin IVA</th><th class="num">Subtotal</th></tr></thead>
  <tbody>`;
    (op.items || []).forEach((it, i) => {
      const cant = Number(it.cant) || 0;
      const precio = precioItem(it);
      cuerpo += `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="model">${esc(it.titulo)}${it.detalle ? `<div class="det" style="font-weight:400;margin-top:2px">${esc(it.detalle)}</div>` : ''}</td>
      <td class="num">${cant}</td>
      <td class="num">${money(precio)}</td>
      <td class="num">${money(precio * cant)}</td>
    </tr>`;
    });
    const t = totalesOpcion(op, iva);
    cuerpo += `\n  </tbody>\n</table>`;
    cuerpo += `
<div class="totbox">
  <div class="row"><span>Subtotal</span><span>USD ${money(t.subtotal)}</span></div>
  <div class="row"><span>IVA ${Math.round(iva * 100)}%</span><span>USD ${money(t.iva)}</span></div>
  <div class="row final"><span>Total (IVA incl.)</span><span>USD ${money(t.total)}</span></div>
</div>`;
  });

  return layout({ titulo: 'Presupuesto - Detalle', logo, meta: metaCliente(q), cuerpo });
}

// ---------------------------------------------------------------------------
// INTERNO
// ---------------------------------------------------------------------------
function docInterno(q, logo, iva, cambio) {
  let cuerpo = `<h1>Confirmación de costos — ${esc(q.titulo || 'Presupuesto')}</h1>
<div class="lead">Costos de proveedor, margen y precio de venta. Referencia: 1 USD = ${esc(money(cambio).replace(/,00$/, ''))} UYU.</div>`;

  (q.opciones || []).forEach((op, idx) => {
    const cls = idx === 0 ? '' : ' class="alt"';
    cuerpo += `\n<h2${cls}>Opción ${esc(op.letra)}${op.etiqueta ? ' — ' + esc(op.etiqueta) : ''}</h2>`;
    cuerpo += `
<table>
  <thead><tr><th class="c">#</th><th>Artículo</th><th>Proveedor</th><th>SKU</th><th class="num">Stock</th><th class="num">Costo</th><th class="num">Margen</th><th class="num">Precio sin IVA</th><th class="num">Total</th></tr></thead>
  <tbody>`;
    (op.items || []).forEach((it, i) => {
      const cant = Number(it.cant) || 0;
      const precio = precioItem(it);
      const mg = margenItem(it);
      const stock = it.stock == null || it.stock === '' ? '<span class="stockna">s/dato</span>' : String(it.stock);
      cuerpo += `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(it.titulo)}</td>
      <td>${esc(it.proveedor || '—')}</td>
      <td class="mono">${esc(it.sku || 's/dato')}</td>
      <td class="num">${stock}</td>
      <td class="num">${money(it.costo)}</td>
      <td class="num">${pct(mg)}</td>
      <td class="num">${money(precio)}</td>
      <td class="num">${money(precio * cant)}</td>
    </tr>`;
    });
    const t = totalesOpcion(op, iva);
    cuerpo += `\n  </tbody>\n</table>`;
    cuerpo += `
<div class="totbox">
  <div class="row"><span>Costo proveedor (sin IVA)</span><span>USD ${money(t.costo)}</span></div>
  <div class="row margin"><span>Ganancia</span><span>USD ${money(t.ganancia)}</span></div>
  <div class="row"><span>Subtotal</span><span>USD ${money(t.subtotal)}</span></div>
  <div class="row"><span>IVA ${Math.round(iva * 100)}%</span><span>USD ${money(t.iva)}</span></div>
  <div class="row final"><span>Precio final cliente</span><span>USD ${money(t.total)}</span></div>
</div>`;
  });

  const notas = (q.notasInternas || []).filter((n) => String(n).trim());
  const cond = (q.condiciones || []).filter((c) => String(c).trim());
  if (notas.length || cond.length) {
    cuerpo += `\n<div class="note">\n  <strong>Chequeos antes de aprobar:</strong>\n  <ul>`;
    for (const n of notas) cuerpo += `\n    <li>${esc(n)}</li>`;
    for (const n of cond) cuerpo += `\n    <li>${esc(n)}</li>`;
    cuerpo += `\n  </ul>\n</div>`;
  }

  return layout({ titulo: 'Presupuesto INTERNO', logo, meta: metaCliente(q), cuerpo, tag: 'USO INTERNO — NO ENVIAR AL CLIENTE' });
}

module.exports = { docCliente, docDetalle, docInterno, precioItem, margenItem, totalesOpcion, money, esc };

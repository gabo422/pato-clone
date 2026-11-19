'use strict';
// Normaliza una cotizacion que viene "de afuera" (un agente, Copilot Studio, un JSON pegado a mano)
// para que los generadores de PDF/Excel no reciban textos donde esperan numeros.
// Acepta: "1.234,56", "219,50", "21%", margen 21 (porcentaje) en vez de 0,21, fecha 16/11/2026, etc.

function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (v == null) return NaN;
  let s = String(v).trim().replace(/\s|USD|\$/gi, '').replace(/%$/, '');
  if (!s) return NaN;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  return Number(s);
}

function n(v, def = 0) {
  const x = num(v);
  return Number.isFinite(x) ? x : def;
}

function fechaISO(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  return s;
}

function texto(v) {
  return v == null ? '' : String(v).trim();
}

function lista(v) {
  if (Array.isArray(v)) return v.map((x) => texto(x)).filter(Boolean);
  if (v == null) return [];
  return String(v)
    .split('\n')
    .map((x) => texto(x.replace(/^[-•*]\s*/, '')))
    .filter(Boolean);
}

function normalizarItem(it) {
  const o = it && typeof it === 'object' ? Object.assign({}, it) : {};
  o.titulo = texto(o.titulo || o.nombre || o.articulo || o.descripcion);
  o.detalle = texto(o.detalle || o.especificaciones || '');
  o.cant = Math.max(1, Math.round(n(o.cant, 1)));
  o.costo = n(o.costo != null ? o.costo : o.price, 0);
  o.sku = texto(o.sku || '');
  o.proveedor = texto(o.proveedor || o.provider || '');
  const st = o.stock;
  o.stock = st == null || st === '' || /s\/?dato|n\/?a|sin dato/i.test(String(st)) ? null : Math.round(n(st, 0));

  const tienePrecio = o.precio != null && o.precio !== '';
  const tieneMargen = o.margen != null && o.margen !== '';
  if (tienePrecio) {
    o.precio = n(o.precio, 0);
    delete o.margen;
  } else {
    let m = tieneMargen ? n(o.margen, 0) : 0;
    // 21 -> 0,21 ; 0,21 -> 0,21 ; 1 -> 1 (=100%)
    if (m > 1) m = m / 100;
    if (m < 0) m = 0;
    o.margen = m;
    delete o.precio;
  }
  return o;
}

function normalizarOp (op, idx) {
  const o = op && typeof op === 'object' ? Object.assign({}, op) : {};
  o.letra = texto(o.letra || o.opcion || String.fromCharCode(65 + idx)).toUpperCase().replace(/[^AB]/g, '') || String.fromCharCode(65 + idx);
  o.etiqueta = texto(o.etiqueta || '');
  o.sub = texto(o.sub || '');
  o.items = (Array.isArray(o.items) ? o.items : []).map(normalizarItem).filter((it) => it.titulo);
  return o;
}

function normalizar(quote) {
  if (!quote || typeof quote !== 'object') throw new Error('Falta la cotización');
  // A veces viene envuelto: { quote: {...} } o { cotizacion: {...} }
  const q = quote.quote || quote.cotizacion || quote;
  const out = Object.assign({}, q);
  out.cliente = texto(q.cliente || q.client || '');
  out.fecha = fechaISO(q.fecha) || new Date().toISOString().slice(0, 10);
  out.titulo = texto(q.titulo || q.title || '');
  out.subcarpeta = texto(q.subcarpeta || q.carpeta || '');
  out.entrega = texto(q.entrega || 'a confirmar');
  out.validez = texto(q.validez || '7 días');
  out.lead = texto(q.lead || q.intro || '');
  out.opciones = (Array.isArray(q.opciones) ? q.opciones : []).map(normalizarOp);
  if (!out.opciones.length && Array.isArray(q.items)) out.opciones = [normalizarOp({ letra: 'A', items: q.items }, 0)];
  out.opciones = out.opciones.filter((o) => o.items.length || out.opciones.length === 1);
  out.cumplimiento = (Array.isArray(q.cumplimiento) ? q.cumplimiento : []).map((c) => {
    const o = {
      req: texto(c && (c.req || c.requisito)),
      a: texto(c && (c.a || c.opcionA)),
      b: texto(c && (c.b || c.opcionB)),
      estado: texto((c && (c.estado || c.status)) || 'Cumple'),
    };
    // Opciones C, D… del cuadro de cumplimiento: se copian tal cual vengan,
    // si no la columna sale vacía en el PDF (docs.js arma una columna por letra).
    for (const k of ['c', 'd', 'e', 'f', 'g', 'h']) {
      const v = c && (c[k] || c['opcion' + k.toUpperCase()]);
      if (v != null && v !== '') o[k] = texto(v);
    }
    return o;
  }).filter((c) => c.req);
  out.condiciones = lista(q.condiciones);
  out.notasInternas = lista(q.notasInternas || q.notas);
  return out;
}

module.exports = { normalizar, num, fechaISO, lista };

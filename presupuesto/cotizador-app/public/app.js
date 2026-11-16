'use strict';

// ------------------------------------------------------------------ utils --
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const money = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
};
const pctTxt = (n) => {
  const v = (Number(n) || 0) * 100;
  return (v >= 0 ? '+' : '') + (Number.isInteger(Math.round(v)) ? v.toFixed(0) : v.toFixed(2).replace('.', ',')) + '%';
};
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fechaCorta = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}-${m[2]}` : String(iso || '');
};

async function api(ruta, opts = {}) {
  const res = await fetch(ruta, Object.assign({ credentials: 'same-origin' }, opts, {
    headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
  }));
  let data = null;
  try { data = await res.json(); } catch {}
  if (res.status === 401) {
    if (ruta.indexOf('/api/login') === 0) throw new Error((data && data.error) || 'Contraseña incorrecta');
    mostrarLogin();
    throw new Error('Sesión no iniciada');
  }
  if (!res.ok) throw new Error((data && data.error) || 'Error ' + res.status);
  return data;
}

// ------------------------------------------------------------------ estado --
const IVA = 0.22;
let margenSugerido = 0.15;
let opcionActiva = 'A';
let historialChat = [];

const estadoVacio = () => ({
  cliente: '',
  fecha: hoyISO(),
  titulo: '',
  subcarpeta: '',
  entrega: '24 a 72 hs',
  validez: '7 días',
  lead: '',
  opciones: [
    { letra: 'A', etiqueta: 'Recomendada', sub: '', items: [] },
    { letra: 'B', etiqueta: 'Alternativa', sub: '', items: [] },
  ],
  cumplimiento: [],
  condiciones: [
    'Precios expresados en USD sin IVA, por unidad. El IVA 22% se aplica sobre el subtotal.',
    'Tipo de cambio de referencia: 1 USD = 41,25 UYU.',
    'Vigencia de la oferta: 7 días. Disponibilidad sujeta a stock al momento de confirmar el pedido.',
  ],
  notasInternas: [],
});

let quote = cargar();
let quoteOriginal = JSON.stringify(quote);

function cargar() {
  try {
    const raw = localStorage.getItem('cotizador.quote');
    if (raw) {
      const q = JSON.parse(raw);
      q.opciones = q.opciones || [];
      if (!q.opciones.length) q.opciones = estadoVacio().opciones;
      return Object.assign(estadoVacio(), q);
    }
  } catch {}
  return estadoVacio();
}

function guardar() {
  try { localStorage.setItem('cotizador.quote', JSON.stringify(quote)); } catch {}
}

const opcion = (letra) => quote.opciones.find((o) => o.letra === letra) || quote.opciones[0];

function precioDe(it) {
  if (it.precio != null && it.precio !== '' && (it.margen == null || it.margen === '')) return Number(it.precio);
  return (Number(it.costo) || 0) * (1 + margenDe(it));
}
function margenDe(it) {
  if (it.margen != null && it.margen !== '') return Number(it.margen);
  if (it.precio != null && Number(it.costo) > 0) return Number(it.precio) / Number(it.costo) - 1;
  return 0;
}
function totales(op) {
  let sub = 0, costo = 0;
  for (const it of op.items || []) {
    const c = Number(it.cant) || 0;
    sub += precioDe(it) * c;
    costo += (Number(it.costo) || 0) * c;
  }
  return { costo, ganancia: sub - costo, sub, iva: sub * IVA, total: sub * (1 + IVA) };
}

// ------------------------------------------------------------------ render --
function pintarTodo() {
  $('#f-cliente').value = quote.cliente || '';
  $('#f-fecha').value = (quote.fecha || hoyISO()).slice(0, 10);
  $('#f-titulo').value = quote.titulo || '';
  $('#f-subcarpeta').value = quote.subcarpeta || '';
  $('#f-entrega').value = quote.entrega || '';
  $('#f-validez').value = quote.validez || '';
  $('#f-lead').value = quote.lead || '';
  $('#f-condiciones').value = (quote.condiciones || []).join('\n');
  $('#f-notas').value = (quote.notasInternas || []).join('\n');
  $('#chip-margen').textContent = 'Margen ' + Math.round(margenSugerido * 100) + '%';
  pintarTabs();
  pintarItems();
  pintarTotales();
  pintarCumplimiento();
}

function pintarTabs() {
  const cont = $('#tabs');
  cont.innerHTML = quote.opciones.map((op) => {
    const t = totales(op);
    return `<button data-tab="${op.letra}" class="${op.letra === opcionActiva ? 'activa' : ''}">
      Opción ${op.letra} <span style="opacity:.75">(${op.items.length} ítem${op.items.length === 1 ? '' : 's'} · USD ${money(t.total)})</span>
    </button>`;
  }).join('');
  $$('#tabs button').forEach((b) => b.onclick = () => { opcionActiva = b.dataset.tab; pintarTabs(); pintarItems(); pintarTotales(); });
}

function pintarItems() {
  const op = opcion(opcionActiva);
  const cont = $('#tabla-items');
  if (!op.items.length) {
    cont.innerHTML = `<div class="vacio">No hay artículos en la opción ${op.letra}.<br>Usá «Buscar en proveedores» o «Ítem manual».</div>`;
    return;
  }
  cont.innerHTML = `
  <table class="items">
    <thead><tr>
      <th style="width:26px">#</th><th style="min-width:180px">Artículo</th><th style="min-width:180px">Detalle</th>
      <th class="num" style="width:64px">Cant.</th><th class="num" style="width:92px">Costo</th>
      <th class="num" style="width:74px">Margen</th><th class="num" style="width:96px">Unit. sin IVA</th>
      <th class="num" style="width:100px">Subtotal</th><th></th>
    </tr></thead>
    <tbody>
    ${op.items.map((it, i) => `
      <tr data-i="${i}">
        <td class="num" style="color:#5a6270">${i + 1}</td>
        <td><input data-campo="titulo" value="${escAttr(it.titulo)}"></td>
        <td><input data-campo="detalle" value="${escAttr(it.detalle)}" placeholder="Especificaciones para el cliente"></td>
        <td><input class="num" data-campo="cant" type="number" min="0" step="1" value="${Number(it.cant) || 1}"></td>
        <td><input class="num" data-campo="costo" type="number" min="0" step="0.01" value="${Number(it.costo) || 0}"></td>
        <td><input class="num" data-campo="margen" type="number" step="0.5" value="${(margenDe(it) * 100).toFixed(2).replace(/\.00$/, '')}"></td>
        <td class="tot">${money(precioDe(it))}</td>
        <td class="tot">${money(precioDe(it) * (Number(it.cant) || 0))}</td>
        <td class="del"><button data-del="${i}" title="Quitar">×</button></td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="fila" style="margin-top:6px;font-size:12px;color:var(--gris)">
    ${op.items.map((it) => it.sku ? `<span class="chip">${it.sku} · stock ${it.stock == null ? 's/dato' : it.stock}</span>` : '').join(' ')}
  </div>`;

  cont.querySelectorAll('input[data-campo]').forEach((inp) => {
    inp.oninput = () => {
      const i = Number(inp.closest('tr').dataset.i);
      const campo = inp.dataset.campo;
      const it = opcion(opcionActiva).items[i];
      if (!it) return;
      if (campo === 'margen') {
        it.margen = (Number(inp.value) || 0) / 100;
        delete it.precio;
      } else if (campo === 'cant' || campo === 'costo') {
        it[campo] = Number(inp.value) || 0;
      } else {
        it[campo] = inp.value;
      }
      const tr = inp.closest('tr');
      tr.querySelectorAll('td.tot')[0].textContent = money(precioDe(it));
      tr.querySelectorAll('td.tot')[1].textContent = money(precioDe(it) * (Number(it.cant) || 0));
      pintarTotales();
      pintarTabs();
      guardar();
    };
  });
  cont.querySelectorAll('button[data-del]').forEach((b) => {
    b.onclick = () => {
      opcion(opcionActiva).items.splice(Number(b.dataset.del), 1);
      pintarItems(); pintarTotales(); pintarTabs(); guardar();
    };
  });
}

function pintarTotales() {
  const cont = $('#totales');
  cont.innerHTML = quote.opciones.map((op) => {
    const t = totales(op);
    return `
      <div>Opción ${op.letra} · subtotal<b>USD ${money(t.sub)}</b></div>
      <div>IVA 22%<b>USD ${money(t.iva)}</b></div>
      <div class="final">Total ${op.letra}<b>USD ${money(t.total)}</b></div>`;
  }).join('');
  $('#acc-items').textContent = 'Margen sugerido: ' + Math.round(margenSugerido * 100) + '%';
}

function pintarCumplimiento() {
  const cont = $('#cumplimiento');
  if (!quote.cumplimiento.length) {
    cont.innerHTML = '<div class="vacio" style="padding:8px">Sin filas. Agregá requisitos si el cliente los pidió.</div>';
    return;
  }
  cont.innerHTML = `
  <table class="items">
    <thead><tr><th>Requisito</th><th>Opción A</th><th>Opción B</th><th style="width:110px">Estado</th><th></th></tr></thead>
    <tbody>
    ${quote.cumplimiento.map((c, i) => `
      <tr data-r="${i}">
        <td><input data-rc="req" value="${escAttr(c.req)}"></td>
        <td><input data-rc="a" value="${escAttr(c.a)}"></td>
        <td><input data-rc="b" value="${escAttr(c.b)}"></td>
        <td><input data-rc="estado" value="${escAttr(c.estado || 'Cumple')}"></td>
        <td class="del"><button data-rdel="${i}">×</button></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
  cont.querySelectorAll('input[data-rc]').forEach((inp) => {
    inp.oninput = () => {
      const i = Number(inp.closest('tr').dataset.r);
      quote.cumplimiento[i][inp.dataset.rc] = inp.value;
      guardar();
    };
  });
  cont.querySelectorAll('button[data-rdel]').forEach((b) => {
    b.onclick = () => { quote.cumplimiento.splice(Number(b.dataset.rdel), 1); pintarCumplimiento(); guardar(); };
  });
}

function escAttr(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ------------------------------------------------------------------ campos --
function enlazar() {
  const mapa = { 'f-cliente': 'cliente', 'f-fecha': 'fecha', 'f-titulo': 'titulo', 'f-subcarpeta': 'subcarpeta', 'f-entrega': 'entrega', 'f-validez': 'validez', 'f-lead': 'lead' };
  for (const [id, campo] of Object.entries(mapa)) {
    $('#' + id).oninput = (e) => { quote[campo] = e.target.value; guardar(); };
  }
  $('#f-condiciones').oninput = (e) => { quote.condiciones = e.target.value.split('\n'); guardar(); };
  $('#f-notas').oninput = (e) => { quote.notasInternas = e.target.value.split('\n'); guardar(); };

  $('#btn-margen').onclick = async () => {
    const cliente = $('#f-cliente').value.trim();
    if (!cliente) return aviso('Escribí el cliente primero.');
    const chip = $('#chip-margen');
    chip.textContent = 'Buscando historial…';
    try {
      const r = await api('/api/margen?cliente=' + encodeURIComponent(cliente));
      if (r.margen != null) {
        margenSugerido = r.margen;
        chip.textContent = 'Margen ' + Math.round(r.margen * 100) + '%' + (r.ok ? '' : ' (default)');
        chip.title = r.salida || '';
        pintarTotales();
      }
    } catch (e) {
      chip.textContent = 'No pude leer el historial';
    }
  };

  $('#btn-add-req').onclick = () => {
    quote.cumplimiento.push({ req: '', a: '', b: '', estado: 'Cumple' });
    pintarCumplimiento(); guardar();
  };

  $('#btn-buscar').onclick = abrirModal;
  $('#btn-cerrar-modal').onclick = () => $('#modal').classList.add('oculto');
  $('#btn-modal-buscar').onclick = buscarEnModal;
  $('#modal-q').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); buscarEnModal(); } };

  $('#btn-manual').onclick = () => {
    opcion(opcionActiva).items.push({ titulo: '', detalle: '', cant: 1, costo: 0, margen: margenSugerido });
    pintarItems(); pintarTotales(); pintarTabs(); guardar();
    const inputs = $$('#tabla-items input[data-campo="titulo"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  };

  $('#btn-pdf').onclick = generarPdfs;
  $('#btn-cambio').onclick = () => pintarCambio(true);
  $('#btn-json').onclick = abrirJsonModal;
  $('#btn-cerrar-json').onclick = () => $('#modal-json').classList.add('oculto');
  $('#btn-json-pdf').onclick = jsonAPdf;
  $('#btn-json-editor').onclick = jsonAlEditor;
  $('#btn-excel').onclick = registrarExcel;
  $('#btn-limpiar').onclick = () => {
    if (!confirm('¿Empezar una cotización nueva? Se borra la actual (no los PDF ya generados).')) return;
    quote = estadoVacio(); margenSugerido = 0.15; pintarTodo(); guardar();
    $('#salida').innerHTML = '';
  };

  $('#form-chat').onsubmit = (e) => { e.preventDefault(); enviarChat(); };
  $('#btn-guardar-cfg').onclick = guardarCfg;
  $('#btn-salir').onclick = async () => { await api('/api/logout', { method: 'POST' }); location.reload(); };
}

function enlazarLogin() {
  $('#form-login').onsubmit = async (e) => {
    e.preventDefault();
    $('#login-err').textContent = '';
    try {
      await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#login-pass').value }) });
      location.reload();
    } catch (err) {
      $('#login-err').textContent = err.message;
    }
  };
}

// ------------------------------------------------------------------ modales --
let resultados = [];

async function abrirModal() {
  $('#modal').classList.remove('oculto');
  $('#modal-q').focus();
  if (!resultados.length) {
    $('#modal-q').value = '';
    $('#modal-resultados').innerHTML = '';
  }
}

async function buscarEnModal() {
  const q = $('#modal-q').value.trim();
  if (!q) return;
  $('#modal-resultados').innerHTML = '<div class="vacio">Buscando…</div>';
  try {
    const r = await api('/api/search?q=' + encodeURIComponent(q));
    resultados = r.items || [];
    if (!resultados.length) {
      $('#modal-resultados').innerHTML = '<div class="vacio">Sin resultados. Probá con otra palabra o el SKU.</div>';
      return;
    }
    $('#modal-resultados').innerHTML = `
      <table>
        <thead><tr><th>SKU</th><th>Artículo</th><th>Proveedor</th><th class="num">Costo</th><th class="num">Stock</th><th></th></tr></thead>
        <tbody>
        ${resultados.map((p, i) => `
          <tr class="sel" data-p="${i}">
            <td style="font-family:Consolas,monospace;font-size:11.5px">${escAttr(p.sku)}</td>
            <td>${escAttr(p.titulo)}</td>
            <td>${escAttr(p.proveedor)}</td>
            <td class="num">${money(p.costo)}</td>
            <td class="num">${p.stock}</td>
            <td><button class="sec mini">Agregar</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    $$('#modal-resultados tr.sel').forEach((tr) => {
      tr.onclick = () => agregarProducto(resultados[Number(tr.dataset.p)]);
    });
  } catch (e) {
    $('#modal-resultados').innerHTML = '<div class="vacio">Error: ' + escAttr(e.message) + '</div>';
  }
}

function agregarProducto(p) {
  const op = opcion(opcionActiva);
  op.items.push({
    titulo: p.titulo,
    detalle: '',
    cant: 1,
    costo: p.costo,
    margen: margenSugerido,
    sku: p.sku,
    proveedor: p.proveedor,
    stock: p.stock,
  });
  pintarItems(); pintarTotales(); pintarTabs(); guardar();
  $('#modal').classList.add('oculto');
  $('#modal-pie').textContent = `Agregado a la opción ${op.letra}: ${p.titulo}`;
}

// ------------------------------------------------------------------ salidas --
function aviso(texto) {
  $('#salida').innerHTML = `<div class="aviso">${escAttr(texto)}</div>`;
}

// ------------------------------------------------------------ tipo de cambio --
// Dólar venta BROU del día. El valor lo pone el servidor (lib/brou.js): primero
// la página del BROU, si está caída una API pública y, si no, el último guardado.
function pintarCambioChip(r) {
  const chip = $('#chip-cambio');
  if (!chip) return;
  if (!r || !(r.valor > 0)) {
    chip.textContent = 'Dólar BROU: sin dato';
    chip.className = 'chip warn';
    chip.title = (r && r.detalle) || 'No pude consultar el dólar.';
    return;
  }
  let t = 'Dólar BROU venta ' + money(r.valor);
  if (r.fecha) t += ' · ' + fechaCorta(r.fecha);
  if (!r.ok) t += r.fuente === 'manual' ? ' (a mano)' : ' (último guardado)';
  chip.textContent = t;
  chip.className = 'chip' + (r.ok ? '' : ' warn');
  chip.title = (r.detalle || '') + (r.fuente ? ' · fuente: ' + r.fuente : '');
}

async function pintarCambio(forzar) {
  const chip = $('#chip-cambio');
  if (!chip) return;
  if (forzar) {
    chip.textContent = 'Consultando el dólar…';
    chip.className = 'chip';
  }
  try {
    const r = await api('/api/cambio' + (forzar ? '?forzar=1' : ''));
    pintarCambioChip(r);
  } catch (e) {
    pintarCambioChip({ valor: 0, detalle: e.message });
  }
}

function lineaCambio(r) {
  if (!r || !r.cambio || !(r.cambio.valor > 0)) return '';
  return '\nDólar BROU venta: ' + money(r.cambio.valor) + (r.cambio.fecha ? ' (' + fechaCorta(r.cambio.fecha) + ')' : '');
}

async function generarPdfs() {
  const btn = $('#btn-pdf');
  btn.disabled = true;
  $('#salida').innerHTML = '<div class="resultado">Generando los 3 PDF… (Edge tarda unos segundos)</div>';
  try {
    const r = await api('/api/pdf', { method: 'POST', body: JSON.stringify({ quote }) });
    $('#salida').innerHTML = `
      <div class="resultado">Listo: 3 PDF en
${escAttr(r.destino)}
${r.archivos.map((a) => '  · ' + a.tipo + '  ' + Math.round(a.bytes / 1024) + ' KB').join('\n')}${lineaCambio(r)}</div>
      <div class="fila" style="margin-top:8px"><button class="sec" id="btn-abrir">Abrir carpeta</button></div>`;
    $('#btn-abrir').onclick = () => api('/api/folder', { method: 'POST', body: JSON.stringify({ path: r.destino }) }).catch((e) => aviso(e.message));
  } catch (e) {
    aviso('No pude generar los PDF: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function registrarExcel() {
  const btn = $('#btn-excel');
  btn.disabled = true;
  const dry = $('#chk-dry').checked;
  $('#salida').innerHTML = '<div class="resultado">Registrando en el Excel… (puede tardar ~30 s)</div>';
  try {
    const r = await api('/api/excel', { method: 'POST', body: JSON.stringify({ quote, dryRun: dry }) });
    $('#salida').innerHTML = `<div class="resultado">${dry ? 'SIMULACIÓN (no escribió nada)' : 'REGISTRADO'}
${escAttr(r.salida || '')}</div>
    ${dry ? '<div class="fila" style="margin-top:8px"><button class="primario" id="btn-excel-real">Escribir de verdad</button></div>' : ''}`;
    if (dry) $('#btn-excel-real').onclick = () => { $('#chk-dry').checked = false; registrarExcel(); };
  } catch (e) {
    aviso('No pude registrar: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

// ------------------------------------------------------------- pegar JSON --
// Acepta la respuesta de un agente (Copilot Studio, ChatGPT, etc.): con o sin ```json
// alrededor y con texto antes/después. Toma desde la primera { hasta la última }.
function parsearJSON(texto) {
  let t = String(texto || '').trim();
  if (!t) throw new Error('Pegá el JSON primero.');
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const ini = t.indexOf('{');
  const fin = t.lastIndexOf('}');
  if (ini < 0 || fin <= ini) throw new Error('No encuentro un JSON ahí adentro (falta la llave { ).');
  try {
    return JSON.parse(t.slice(ini, fin + 1));
  } catch (e) {
    throw new Error('El JSON está mal armado: ' + e.message);
  }
}

function abrirJsonModal() {
  $('#json-msg').className = '';
  $('#json-msg').textContent = '';
  $('#modal-json').classList.remove('oculto');
  $('#json-texto').focus();
}

function resultadoPdf(r) {
  $('#salida').innerHTML = `
    <div class="resultado">Listo: 3 PDF en
${escAttr(r.destino)}
${r.archivos.map((a) => '  · ' + a.tipo + '  ' + Math.round(a.bytes / 1024) + ' KB').join('\n')}${lineaCambio(r)}</div>
    <div class="fila" style="margin-top:8px"><button class="sec" id="btn-abrir">Abrir carpeta</button></div>`;
  $('#btn-abrir').onclick = () => api('/api/folder', { method: 'POST', body: JSON.stringify({ path: r.destino }) }).catch((e) => aviso(e.message));
}

async function jsonAlEditor() {
  const msg = $('#json-msg');
  msg.className = '';
  msg.textContent = 'Leyendo…';
  try {
    const crudo = parsearJSON($('#json-texto').value);
    const r = await api('/api/normalizar', { method: 'POST', body: JSON.stringify({ quote: crudo }) });
    quote = Object.assign(estadoVacio(), r.quote);
    opcionActiva = (quote.opciones[0] && quote.opciones[0].letra) || 'A';
    pintarTodo();
    guardar();
    $('#modal-json').classList.add('oculto');
    aviso('Cotización cargada desde el JSON. Revisá los datos y generá los PDF cuando quieras.');
  } catch (e) {
    msg.className = 'err';
    msg.textContent = e.message;
  }
}

async function jsonAPdf() {
  const btn = $('#btn-json-pdf');
  const msg = $('#json-msg');
  msg.className = '';
  msg.textContent = 'Generando los 3 PDF… (Edge tarda unos segundos)';
  btn.disabled = true;
  try {
    const crudo = parsearJSON($('#json-texto').value);
    const r = await api('/api/pdf', { method: 'POST', body: JSON.stringify({ quote: crudo }) });
    msg.className = 'ok';
    msg.textContent = 'Listo. Los 3 PDF están en ' + r.destino;
    resultadoPdf(r);
  } catch (e) {
    msg.className = 'err';
    msg.textContent = 'No pude generar los PDF: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

// -------------------------------------------------------------------- chat --
function textoConFormato(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function pintarMensaje(tipo, texto, extra) {
  const div = document.createElement('div');
  div.className = 'm ' + tipo;
  if (tipo === 'bot') div.innerHTML = textoConFormato(texto);
  else div.textContent = texto;
  if (extra) {
    const s = document.createElement('span');
    s.className = 'acc';
    s.textContent = extra;
    div.appendChild(s);
  }
  $('#msgs').appendChild(div);
  $('#msgs').scrollTop = $('#msgs').scrollHeight;
}

async function enviarChat() {
  const inp = $('#chat-input');
  const texto = inp.value.trim();
  if (!texto) return;
  inp.value = '';
  pintarMensaje('user', texto);
  historialChat.push({ rol: 'user', texto });
  const esperando = document.createElement('div');
  esperando.className = 'm bot';
  esperando.textContent = 'Pensando…';
  $('#msgs').appendChild(esperando);
  $('#msgs').scrollTop = $('#msgs').scrollHeight;

  try {
    const r = await api('/api/agent', { method: 'POST', body: JSON.stringify({ quote, historial: historialChat, mensaje: texto }) });
    esperando.remove();
    const acciones = (r.acciones || []).map((a) => a.herramienta).join(' · ');
    pintarMensaje('bot', r.mensaje || '(sin respuesta)', acciones ? 'Acciones: ' + acciones : '');
    historialChat.push({ rol: 'assistant', texto: r.mensaje || '' });
    if (r.quote) {
      quote = Object.assign(estadoVacio(), r.quote);
      quote.opciones = (r.quote.opciones || []).map((o) => Object.assign({ letra: 'A', items: [] }, o));
      if (!quote.opciones.some((o) => o.letra === opcionActiva)) opcionActiva = quote.opciones[0].letra;
      pintarTodo();
      guardar();
    }
  } catch (e) {
    esperando.remove();
    pintarMensaje('err', 'Error: ' + e.message);
  }
}

async function guardarCfg() {
  const msg = $('#cfg-msg');
  msg.textContent = 'Guardando…';
  const payload = {};
  const key = $('#cfg-key').value.trim();
  const modelo = $('#cfg-model').value.trim();
  const url = $('#cfg-url').value.trim();
  if (key) payload.agentApiKey = key;
  if (modelo) payload.agentModel = modelo;
  if (url) payload.agentBaseUrl = url;
  if (!Object.keys(payload).length) {
    msg.textContent = 'No cambiaste nada.';
    return;
  }
  try {
    const r = await api('/api/config', { method: 'POST', body: JSON.stringify(payload) });
    msg.textContent = (r.agente ? 'Guardado. Agente activo con ' + r.modelo : 'Guardado (sin key).') +
      (r.baseUrl ? ' · ' + r.baseUrl : '');
    if (r.modelo) $('#cfg-model').value = r.modelo;
    if (r.baseUrl) $('#cfg-url').value = r.baseUrl;
    actualizarPill(r.agente);
    $('#cfg-key').value = '';
  } catch (e) {
    msg.textContent = 'Error: ' + e.message;
  }
}

function actualizarPill(activo) {
  const pill = $('#pill-agente');
  pill.textContent = activo ? 'Agente activo' : 'Agente sin configurar';
  pill.className = 'pill' + (activo ? '' : ' off');
  $('#aviso-agente').classList.toggle('oculto', !!activo);
}

// -------------------------------------------------------------------- boot --
function mostrarLogin() {
  $('#login').classList.remove('oculto');
}

async function init() {
  enlazarLogin();
  let s = { auth: true, requierePassword: false, agente: false };
  try { s = await api('/api/session'); } catch {}
  if (!s.auth) { mostrarLogin(); $('#login-pass').focus(); return; }
  $('#login').classList.add('oculto');

  actualizarPill(s.agente);
  pintarTodo();
  enlazar();
  pintarCambio(false);

  try {
    const cfg = await api('/api/agent/status');
    if (cfg.modelo) $('#cfg-model').value = cfg.modelo;
    if (cfg.baseUrl) $('#cfg-url').value = cfg.baseUrl;
  } catch {}

  pintarMensaje('bot', 'Hola. Puedo buscar precios, armar las opciones A/B, calcular márgenes y generar los 3 PDF.\n\nEjemplo: "Cotizá 5 notebooks i5 con 16 GB y 5 mouse para Eightroom, margen 21%".');
  window.addEventListener('beforeunload', guardar);
  if (quoteOriginal !== JSON.stringify(quote)) guardar();
}

document.addEventListener('DOMContentLoaded', init);

'use strict';
// Dolar VENTA del BROU del dia.
//
// El sitio del BROU no tiene API: la cotizacion viene impresa en el HTML de
// https://www.brou.com.uy/cotizaciones (tabla con class="moneda" y class="valor").
// Esa tabla es la del mostrador (verificado: el 24/10/2026 la pagina decia 41,25
// y la serie "EBROU" estaba en 40,75).
//
// El feed del BROU se cae seguido y la pagina queda en "Sin cotizaciones
// disponibles". Por eso, en orden:
//   1. pagina oficial del BROU            -> fuente 'brou'
//   2. API publica api.cambio-uruguay.com -> fuente 'api'  (misma fuente: BROU)
//   3. ultimo valor bueno guardado        -> fuente 'cache'
//   4. valor de config.json               -> fuente 'config'
//
// Nunca tira excepcion: si todo falla devuelve el fallback para que el
// cotizador siga generando PDF (y la UI avisa que el dato no es fresco).

const fs = require('fs');
const path = require('path');

const PAGINA = 'https://www.brou.com.uy/cotizaciones';
const API = 'https://api.cambio-uruguay.com/intraday?code=USD';
const TTL_MS = 30 * 60 * 1000; // media hora: es cotizacion de mostrador, no cambia por segundo
const TIMEOUT_MS = 15000;
const ESPERA_PAGINA_MS = 3000; // si el sitio del BROU no contesta en 3s, gana la API

function espera(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hoy() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "41,25000" / "41.25" / " 41,25 " -> 41.25
function aNumero(s) {
  const t = String(s == null ? '' : s).trim();
  if (!t) return NaN;
  const n = t.indexOf(',') >= 0 ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : NaN;
}

async function pedir(url, ms = TIMEOUT_MS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { 'user-agent': 'cotizador-itpro/1.0 (+local)', accept: 'text/html,application/json,*/*' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

// Busca la fila del dolar en la tabla del portlet de cotizaciones.
// Estructura: <p class="moneda">Dolar</p> ... <p class="valor"> compra </p>
//             <p class="valor"> venta </p> ... (despues vienen los arbitrajes)
function parsearPagina(html) {
  const texto = String(html || '');
  if (/sin cotizaciones disponibles/i.test(texto)) return null;
  const filas = texto.match(/<tr[\s\S]{0,4000}?<\/tr>/gi) || [];
  for (const fila of filas) {
    const mon = /class="moneda"[^>]*>\s*([^<]*)/i.exec(fila);
    if (!mon) continue;
    const nombre = mon[1].replace(/&#(\d+);/g, (m, c) => String.fromCharCode(Number(c)));
    if (!/d[oó]lar|\busd\b/i.test(nombre)) continue;
    const vals = [];
    const re = /class="valor"\s*>\s*([\d.,]+)\s*</gi;
    let m;
    while ((m = re.exec(fila))) vals.push(m[1]);
    if (vals.length < 2) continue;
    const compra = aNumero(vals[0]);
    const venta = aNumero(vals[1]);
    if (venta > 0) return { compra: compra > 0 ? compra : null, venta };
  }
  return null;
}

// Serie "brou" (mostrador) del dia. Descarta la variante EBROU (type 'EBROU'),
// que es la preferencial y no es el numero que muestra la pagina.
function parsearApi(txt) {
  const j = JSON.parse(txt);
  const serie = (j.series || []).find((s) => /^brou$/i.test(String(s.origin || '')) && !s.type);
  if (!serie) return null;
  const venta = Number(serie.lastSell != null ? serie.lastSell : serie.openSell);
  if (!(venta > 0)) return null;
  const compra = Number(serie.lastBuy != null ? serie.lastBuy : serie.openBuy);
  return {
    compra: compra > 0 ? compra : null,
    venta,
    fecha: j.date || hoy(),
    hora: serie.lastAt || j.asOf || null,
  };
}

module.exports = function makeBrou({ dir, fallback }) {
  const cachePath = path.join(dir, 'data', 'cambio.json');
  let mem = null; // { ts, dato }

  function leerDisco() {
    try {
      const raw = fs.readFileSync(cachePath, 'utf8').replace(/^\uFEFF/, '');
      const j = JSON.parse(raw);
      const v = Number(j.valor);
      if (!(v > 0)) return null;
      return {
        valor: v,
        compra: Number(j.compra) > 0 ? Number(j.compra) : null,
        fecha: j.fecha || '',
        fuente: j.manual ? 'manual' : 'cache',
        manual: !!j.manual,
        obtenido: j.obtenido || null,
        ok: false,
        detalle: j.manual ? 'valor puesto a mano' : 'último valor guardado',
      };
    } catch {
      return null;
    }
  }

  function guardarDisco(dato, manual) {
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      const out = {
        valor: dato.valor,
        compra: dato.compra || null,
        fecha: dato.fecha || hoy(),
        fuente: dato.fuente,
        manual: !!manual,
        obtenido: new Date().toISOString(),
      };
      fs.writeFileSync(cachePath, JSON.stringify(out, null, 2), 'utf8');
    } catch (e) {
      console.error('[brou] no pude guardar el cache:', e.message);
    }
  }

  // Devuelve siempre un objeto: { valor, compra, fecha, fuente, ok, detalle }
  async function obtener(opts = {}) {
    const forzar = !!opts.forzar;
    const ahora = Date.now();
    if (!forzar && mem && ahora - mem.ts < TTL_MS) return mem.dato;

    const disco = leerDisco();
    if (!forzar && disco && disco.manual) {
      mem = { ts: ahora, dato: disco };
      return disco;
    }

    let detalle = '';

    // 1 y 2 en paralelo: el sitio del BROU tarda ~10s, la API contesta en ~0,3s.
    // Se le da 3s de ventaja a la página (fuente oficial) y si no llegó se usa la API.
    let errPagina = '';
    let errApi = '';
    const pPagina = pedir(PAGINA, 12000)
      .then((html) => parsearPagina(html))
      .catch((e) => {
        errPagina = e.message;
        return null;
      });
    const pApi = pedir(API, 8000)
      .then((txt) => parsearApi(txt))
      .catch((e) => {
        errApi = e.message;
        return null;
      });

    const primera = await Promise.race([pPagina, espera(ESPERA_PAGINA_MS).then(() => undefined)]);
    let origen = primera ? 'pagina' : null;
    let valor = primera || null;

    if (!valor) {
      valor = await pApi;
      if (valor) origen = 'api';
    }
    if (!valor) {
      valor = await pPagina; // por si la página llegó tarde
      if (valor) origen = 'pagina';
    }

    if (valor && origen === 'pagina') {
      const dato = { valor: valor.venta, compra: valor.compra, fecha: hoy(), fuente: 'brou', ok: true, detalle: 'BROU (página oficial)' };
      guardarDisco(dato, false);
      mem = { ts: ahora, dato };
      return dato;
    }

    if (valor) {
      const dato = {
        valor: valor.venta,
        compra: valor.compra,
        fecha: valor.fecha || hoy(),
        fuente: 'api',
        ok: true,
        detalle: 'BROU vía api.cambio-uruguay.com',
        hora: valor.hora || null,
      };
      guardarDisco(dato, false);
      mem = { ts: ahora, dato };
      return dato;
    }

    detalle = (errPagina ? 'no pude abrir la página del BROU (' + errPagina + ')' : 'BROU no publica cotización ahora') +
      ' · ' + (errApi ? 'la API falló (' + errApi + ')' : 'la API no trajo la serie BROU');

    // 3) ultimo valor bueno
    if (disco) {
      const dato = Object.assign({}, disco, { detalle: (detalle + ' · uso el último valor guardado').trim() });
      mem = { ts: ahora, dato };
      return dato;
    }

    // 4) config
    const cfgVal = Number(fallback);
    const dato = {
      valor: cfgVal > 0 ? cfgVal : 0,
      compra: null,
      fecha: '',
      fuente: 'config',
      ok: false,
      detalle: (detalle + ' · uso el valor de config.json').trim(),
    };
    mem = { ts: ahora, dato };
    return dato;
  }

  // Fijar un valor a mano (por si el BROU esta caido y hay que emitir igual).
  function fijarManual(valor) {
    const v = aNumero(String(valor).replace('.', ',')); // acepta "41,75" y "41.75"
    if (!(v > 0)) throw new Error('Valor de cambio inválido');
    const dato = { valor: v, compra: null, fecha: hoy(), fuente: 'manual', ok: false, detalle: 'valor puesto a mano' };
    guardarDisco(dato, true);
    mem = { ts: Date.now(), dato: Object.assign({ manual: true }, dato) };
    return mem.dato;
  }

  function olvidarManual() {
    const d = leerDisco();
    if (d && d.manual) {
      try { fs.unlinkSync(cachePath); } catch {}
    }
    mem = null;
  }

  return { obtener, fijarManual, olvidarManual, parsearPagina, parsearApi };
};

module.exports.parsearPagina = parsearPagina;
module.exports.parsearApi = parsearApi;

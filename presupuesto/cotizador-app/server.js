'use strict';
// Cotizador ITpro — servidor local (sin dependencias npm).
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const { makeClient } = require('./lib/nibiru');
const { docCliente, docDetalle, docInterno } = require('./lib/docs');
const { normalizar } = require('./lib/quote');
const pdf = require('./lib/pdf');
const excel = require('./lib/excel');
const { ps, q, parseSugerido } = require('./lib/ps');
const agent = require('./lib/agent');
const makeBrou = require('./lib/brou');

const APP_DIR = __dirname;
const PUBLIC_DIR = path.join(APP_DIR, 'public');
const CONFIG_PATH = path.join(APP_DIR, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('');
    console.error('  Falta config.json en la carpeta de la app.');
    console.error('  Copiá config.example.json a config.json y completá la contraseña y la API key.');
    console.error('');
    process.exit(1);
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8').replace(/^\uFEFF/, '');
  const cfg = JSON.parse(raw);
  if (!cfg.cookieSecret) {
    cfg.cookieSecret = crypto.createHash('sha256').update('itpro-' + (cfg.password || '') + '-v1').digest('hex');
  }
  return cfg;
}

let cfg = loadConfig();
let nibiru = makeClient(cfg.nibiru);
let brou = makeBrou({ dir: APP_DIR, fallback: cfg.cambio });

function expand(p) {
  return String(p || '').replace(/%USERPROFILE%/gi, os.homedir()).replace(/%TEMP%/gi, os.tmpdir());
}

function logoDataUri() {
  const candidatos = [
    expand(cfg.rutas.logo),
    path.join(APP_DIR, 'itpro-logo.png'),
    path.join(APP_DIR, '..', 'itpro-logo.png'),
  ];
  for (const c of candidatos) {
    if (c && fs.existsSync(c)) {
      const ext = path.extname(c).toLowerCase().replace('.', '') || 'png';
      const mime = ext === 'svg' ? 'image/svg+xml' : 'image/' + ext;
      return `data:${mime};base64,` + fs.readFileSync(c).toString('base64');
    }
  }
  throw new Error('No encuentro el logo. Poné el archivo en la ruta del config (rutas.logo).');
}

// Normaliza la URL base del agente. Acepta "console.groq.com" o "api.groq.com"
// y devuelve la URL real de la API (compatible OpenAI).
function normalizarBaseUrl(u) {
  let s = String(u || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  s = s.replace(/\/+$/, '');
  if (/^https?:\/\/(console|www)\.groq\.com$/i.test(s) || /^https?:\/\/groq\.com$/i.test(s)) {
    return 'https://api.groq.com/openai/v1';
  }
  if (/^https?:\/\/api\.groq\.com$/i.test(s)) return 'https://api.groq.com/openai/v1';
  if (/^https?:\/\/openrouter\.ai$/i.test(s) || /^https?:\/\/openrouter\.ai\/api$/i.test(s)) {
    return 'https://openrouter.ai/api/v1';
  }
  if (/^https?:\/\/aistudio\.google\.com$/i.test(s)) {
    return 'https://generativelanguage.googleapis.com/v1beta/openai';
  }
  return s;
}

function validarUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- auth -----
const SESSION_HORAS = 12;

function firmar(payload) {
  return crypto.createHmac('sha256', cfg.cookieSecret).update(payload).digest('base64url');
}

function crearCookie() {
  const exp = Date.now() + SESSION_HORAS * 3600 * 1000;
  const payload = String(exp);
  return `sid=${payload}.${firmar(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HORAS * 3600}`;
}

function cookieValida(req) {
  const raw = req.headers.cookie || '';
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(raw);
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const esperado = firmar(exp);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado));
  } catch {
    return false;
  }
}

function autorizado(req) {
  if (!cfg.password) return true;
  return cookieValida(req);
}

// ------------------------------------------------------------- helpers -----
const attempts = new Map();

function json(res, code, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers));
  res.end(body);
}

function leerCuerpo(req, limite = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limite) { reject(new Error('Cuerpo demasiado grande')); req.destroy(); return; }
      data += c;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function servirEstatico(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const full = path.join(PUBLIC_DIR, rel);
  if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Prohibido'); }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

async function sugerirMargen(cliente) {
  const script = path.resolve(APP_DIR, expand(cfg.rutas.scripts || '..'), 'sugerir-margen.ps1');
  const fuente = expand(cfg.rutas.excelCompras);
  const args = [`& ${q(script)}`, `-Cliente ${q(cliente || '')}`];
  if (fuente && fs.existsSync(fuente)) args.push(`-Fuente ${q(fuente)}`);
  const r = await ps(args, { timeout: 90000 });
  const salida = (r.stdout || '').trim();
  if (r.code !== 0) return { ok: false, margen: cfg.margenDefault, salida: (r.stderr || salida).trim() };
  const margen = parseSugerido(salida);
  return { ok: true, margen: margen != null ? margen : cfg.margenDefault, salida };
}

function validarQuote(quote) {
  if (!quote || typeof quote !== 'object') throw new Error('Falta la cotización');
  if (!quote.cliente || !String(quote.cliente).trim()) throw new Error('Falta el cliente');
  const ops = quote.opciones || [];
  const total = ops.reduce((a, o) => a + ((o.items || []).length), 0);
  if (!total) throw new Error('La cotización no tiene artículos');
  for (const op of ops) {
    for (const it of op.items || []) {
      if (!String(it.titulo || '').trim()) throw new Error('Hay un artículo sin nombre');
      if (!(Number(it.costo) >= 0)) throw new Error('Hay un artículo sin costo');
    }
  }
}

// --------------------------------------------------------------- rutas -----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const p = url.pathname;

  try {
    if (req.method === 'GET' && (p === '/' || p === '/index.html' || p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.png') || p.endsWith('.svg'))) {
      return servirEstatico(res, p);
    }

    // --- login / sesión ---
    if (p === '/api/login' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || '?';
      const st = attempts.get(ip) || { n: 0, t: 0 };
      if (st.n >= 8 && Date.now() - st.t < 10 * 60 * 1000) {
        return json(res, 429, { error: 'Demasiados intentos. Esperá unos minutos.' });
      }
      const body = await leerCuerpo(req);
      if (!cfg.password || String(body.password || '') === String(cfg.password)) {
        attempts.delete(ip);
        return json(res, 200, { ok: true }, { 'Set-Cookie': crearCookie() });
      }
      attempts.set(ip, { n: st.n + 1, t: Date.now() });
      return json(res, 401, { error: 'Contraseña incorrecta' });
    }

    if (p === '/api/session' && req.method === 'GET') {
      return json(res, 200, { auth: autorizado(req), requierePassword: !!cfg.password, agente: !!(cfg.agent && cfg.agent.apiKey) });
    }

    if (p === '/api/logout' && req.method === 'POST') {
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
    }

    if (p === '/api/health') return json(res, 200, { ok: true, version: 1 });

    // --- a partir de acá, hace falta sesión ---
    if (p.startsWith('/api/')) {
      if (!autorizado(req)) return json(res, 401, { error: 'Sesión no iniciada' });
    }

    if (p === '/api/margen' && req.method === 'GET') {
      const cliente = url.searchParams.get('cliente') || '';
      if (!cliente.trim()) return json(res, 400, { error: 'Falta el cliente' });
      return json(res, 200, await sugerirMargen(cliente));
    }

    if (p === '/api/search' && req.method === 'GET') {
      const qq = url.searchParams.get('q') || '';
      const items = await nibiru.buscar(qq, Number(url.searchParams.get('limit')) || 25);
      return json(res, 200, { items });
    }

    if (p === '/api/product' && req.method === 'GET') {
      const sku = url.searchParams.get('sku') || '';
      const item = await nibiru.producto(sku);
      if (!item) return json(res, 404, { error: 'SKU no encontrado' });
      return json(res, 200, { item });
    }

    if (p === '/api/logo' && req.method === 'GET') {
      return json(res, 200, { logo: logoDataUri() });
    }

    // --- tipo de cambio: dólar venta BROU del día ---
    if (p === '/api/cambio' && req.method === 'GET') {
      const forzar = url.searchParams.get('forzar') === '1';
      return json(res, 200, await brou.obtener({ forzar }));
    }

    if (p === '/api/cambio' && req.method === 'POST') {
      // { valor: 41.75 } fija a mano · { auto: true } vuelve a consultar solo
      const body = await leerCuerpo(req);
      if (body.auto) {
        brou.olvidarManual();
        return json(res, 200, await brou.obtener({ forzar: true }));
      }
      return json(res, 200, brou.fijarManual(body.valor));
    }

    if (p === '/api/normalizar' && req.method === 'POST') {
      // Devuelve la cotización "limpia" (números como números, margen como fracción, fecha ISO).
      // Lo usa el botón «Pegar JSON» para cargar en el editor lo que devolvió un agente.
      const body = await leerCuerpo(req);
      const quote = normalizar(body.quote || body.cotizacion || body);
      return json(res, 200, { quote });
    }

    if (p === '/api/pdf' && req.method === 'POST') {
      const body = await leerCuerpo(req);
      // normalizar: acepta JSON de un agente (margen 21, "1.234,56", fecha 16/11/2026, etc.)
      const quote = normalizar(body.quote || body.cotizacion || body);
      validarQuote(quote);
      const logo = logoDataUri();
      const cambio = await brou.obtener();
      const htmls = {
        cliente: docCliente(quote, logo, cfg.iva, cambio),
        detalle: docDetalle(quote, logo, cfg.iva),
        interno: docInterno(quote, logo, cfg.iva, cambio),
      };
      if (body.soloHtml) {
        return json(res, 200, { htmls, iva: cfg.iva, cambio });
      }
      const r = await pdf.generarPdfs(quote, cfg, htmls);
      return json(res, 200, Object.assign({ cambio }, r));
    }

    if (p === '/api/excel' && req.method === 'POST') {
      const body = await leerCuerpo(req);
      const quote = normalizar(body.quote || body.cotizacion || body);
      validarQuote(quote);
      const r = await excel.registrar(quote, cfg, { dryRun: !!body.dryRun });
      return json(res, 200, r);
    }

    if (p === '/api/folder' && req.method === 'POST') {
      const body = await leerCuerpo(req);
      const raiz = path.resolve(expand(cfg.rutas.salida));
      const target = path.resolve(String(body.path || ''));
      if (!target.startsWith(raiz)) return json(res, 403, { error: 'Ruta fuera de la carpeta de presupuestos' });
      if (!fs.existsSync(target)) return json(res, 404, { error: 'La carpeta no existe' });
      spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' }).unref();
      return json(res, 200, { ok: true });
    }

    if (p === '/api/agent/status' && req.method === 'GET') {
      return json(res, 200, {
        activo: !!(cfg.agent && cfg.agent.apiKey),
        modelo: cfg.agent ? cfg.agent.model : null,
        proveedor: cfg.agent ? cfg.agent.provider : null,
        baseUrl: cfg.agent ? cfg.agent.baseUrl : null,
      });
    }

    if (p === '/api/agent' && req.method === 'POST') {
      const body = await leerCuerpo(req);
      const quote = body.quote || {};
      const ctx = {
        quote,
        cfg,
        iva: cfg.iva,
        nibiru,
        pdf,
        logo: logoDataUri(),
        sugerirMargen,
        registrarExcel: (qq, opt) => excel.registrar(qq, cfg, opt),
      };
      const r = await agent.correrAgente({
        cfg,
        quote,
        historial: body.historial || [],
        mensaje: String(body.mensaje || ''),
        ctx,
      });
      return json(res, 200, r);
    }

    if (p === '/api/config' && req.method === 'POST') {
      const body = await leerCuerpo(req);
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      raw.agent = raw.agent || {};
      if (body.password) {
        if (String(body.password).length < 4) return json(res, 400, { error: 'La contraseña tiene que tener al menos 4 caracteres.' });
        raw.password = String(body.password);
      }
      // OJO: un campo vacío NO borra lo que ya está guardado (el input de la key
      // siempre aparece vacío por seguridad). Para borrar la key: agentClearApiKey.
      if (body.agentClearApiKey) raw.agent.apiKey = '';
      else if (String(body.agentApiKey || '').trim()) raw.agent.apiKey = String(body.agentApiKey).trim();
      else if (!String(raw.agent.apiKey || '').trim()) raw.agent.apiKey = '';
      if (String(body.agentModel || '').trim()) raw.agent.model = String(body.agentModel).trim();
      if (body.agentBaseUrl) {
        const u = normalizarBaseUrl(body.agentBaseUrl);
        if (!validarUrl(u)) {
          return json(res, 400, {
            error: 'La URL base no es válida: "' + body.agentBaseUrl + '". Tiene que ser una dirección como https://api.groq.com/openai/v1',
          });
        }
        raw.agent.baseUrl = u;
      }
      if (body.host) raw.host = String(body.host);
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(raw, null, 2), 'utf8');
      cfg = loadConfig();
      nibiru = makeClient(cfg.nibiru);
      return json(res, 200, {
        ok: true,
        host: cfg.host,
        password: !!cfg.password,
        agente: !!(cfg.agent && cfg.agent.apiKey),
        modelo: cfg.agent.model,
        baseUrl: cfg.agent.baseUrl,
      });
    }

    if (p === '/api/reset') {
      cfg = loadConfig();
      nibiru = makeClient(cfg.nibiru);
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: 'No existe: ' + p });
  } catch (e) {
    console.error('[error]', p, e.message);
    return json(res, 500, { error: String(e.message || e) });
  }
});

const PORT = Number(process.env.PORT || cfg.puerto || 8090);
const HOST = process.env.HOST || cfg.host || '127.0.0.1';

server.listen(PORT, HOST, () => {
  const visible = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
  const url = 'http://' + visible + ':' + PORT;
  console.log('');
  console.log('  Cotizador ITpro');
  console.log('  ---------------------------------------------');
  console.log('  Abrí esto en el navegador:  ' + url);
  if (HOST === '0.0.0.0') console.log('  Escuchando en todas las interfaces (VPN / red local).');
  if (cfg.password) console.log('  Contraseña: la de config.json');
  if (!cfg.agent.apiKey) console.log('  Agente: sin API key (config.json → agent.apiKey)');
  console.log('  ---------------------------------------------');
  console.log('  Ctrl+C para cortar.');
  console.log('');
  if (process.env.OPEN === '1') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
});

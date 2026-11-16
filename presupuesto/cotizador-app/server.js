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
const pdf = require('./lib/pdf');
const excel = require('./lib/excel');
const { ps, q, parseSugerido } = require('./lib/ps');
const agent = require('./lib/agent');

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
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  if (!cfg.cookieSecret) {
    cfg.cookieSecret = crypto.createHash('sha256').update('itpro-' + (cfg.password || '') + '-v1').digest('hex');
  }
  return cfg;
}

let cfg = loadConfig();
let nibiru = makeClient(cfg.nibiru);

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

    if (p === '/api/pdf' && req.method === 'POST') {
      const body = await leerCuerpo(req);
      const quote = body.quote || {};
      validarQuote(quote);
      const logo = logoDataUri();
      const htmls = {
        cliente: docCliente(quote, logo, cfg.iva),
        detalle: docDetalle(quote, logo, cfg.iva),
        interno: docInterno(quote, logo, cfg.iva, cfg.cambio),
      };
      if (body.soloHtml) {
        return json(res, 200, { htmls, iva: cfg.iva });
      }
      const r = await pdf.generarPdfs(quote, cfg, htmls);
      return json(res, 200, r);
    }

    if (p === '/api/excel' && req.method === 'POST') {
      const body = await leerCuerpo(req);
      validarQuote(body.quote || {});
      const r = await excel.registrar(body.quote, cfg, { dryRun: !!body.dryRun });
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
      // permite cambiar contraseña / key del agente desde la UI
      const body = await leerCuerpo(req);
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (body.password) raw.password = String(body.password);
      if (body.agentApiKey != null) raw.agent.apiKey = String(body.agentApiKey);
      if (body.agentModel) raw.agent.model = String(body.agentModel);
      if (body.agentBaseUrl) raw.agent.baseUrl = String(body.agentBaseUrl);
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

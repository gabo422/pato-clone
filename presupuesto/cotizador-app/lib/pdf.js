'use strict';
// Compila HTML a PDF con un navegador headless.
// Windows: Microsoft Edge o Google Chrome (mismo metodo que build-presupuesto.ps1).
// Linux:   Chromium / Google Chrome (para el mini PC con OpenMediaVault).
// La ruta se puede fijar con rutas.navegador (o rutas.edge, por compatibilidad)
// en config.json, o con la variable de entorno COTI_BROWSER.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const TIMEOUT_MS = 90000;

function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '').trim().replace(/\.+$/, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function expand(p) {
  return String(p || '').replace(/%USERPROFILE%/gi, os.homedir()).replace(/%TEMP%/gi, os.tmpdir());
}

// Rutas tipicas por sistema operativo, en orden de preferencia.
const POR_SO = {
  win32: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
  linux: [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
    '/usr/lib/chromium/chromium',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
};

let elegido = null;

function esArchivo(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

// Devuelve el binario del navegador (y lo recuerda).
function buscarNavegador(cfg) {
  if (elegido) return elegido;
  const candidatos = [
    process.env.COTI_BROWSER,
    cfg && cfg.rutas && cfg.rutas.navegador,
    cfg && cfg.rutas && cfg.rutas.edge,
    ...(POR_SO[process.platform] || []),
  ];
  for (const c of candidatos) {
    const p = expand(c);
    if (p && esArchivo(p)) {
      elegido = p;
      return p;
    }
  }
  throw new Error(
    'No encuentro un navegador para generar los PDF. ' +
      (process.platform === 'linux'
        ? 'Instalá Chromium (sudo apt install chromium) o fijá COTI_BROWSER=/usr/bin/chromium.'
        : 'Instalá Edge o Chrome, o poné la ruta en rutas.navegador de config.json.')
  );
}

// En Linux el servicio corre sin user namespaces: Chromium no arranca con
// sandbox. Se puede forzar con COTI_NO_SANDBOX=1 / desactivar con =0.
function necesitaNoSandbox() {
  if (process.env.COTI_NO_SANDBOX === '0') return false;
  if (process.env.COTI_NO_SANDBOX === '1') return true;
  if (process.platform === 'linux') return true;
  return false;
}

function armarArgs({ perfil, outPath, url, headless, noSandbox }) {
  const args = [`--headless=${headless}`, '--disable-gpu', '--disable-dev-shm-usage'];
  if (noSandbox) args.push('--no-sandbox', '--disable-setuid-sandbox');
  args.push(
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--disable-background-networking',
    '--mute-audio',
    `--user-data-dir=${perfil}`,
    '--no-pdf-header-footer',
    `--print-to-pdf=${outPath}`,
    url
  );
  return args;
}

function correr(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: TIMEOUT_MS, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.salida = String(stderr || stdout || '').trim();
        return reject(err);
      }
      resolve();
    });
  });
}

/**
 * Genera un PDF a partir de HTML.
 * @param {string} html
 * @param {string} outPath
 * @param {string} [navegador] ruta al binario (si falta, se detecta sola)
 * @param {object} [cfg]
 */
async function htmlToPdf(html, outPath, navegador, cfg) {
  const bin = navegador || buscarNavegador(cfg);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const id = crypto.randomBytes(6).toString('hex');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `coti-${id}-`));
  const tmpHtml = path.join(tmpDir, 'doc.html');
  const perfil = path.join(tmpDir, 'perfil');
  fs.writeFileSync(tmpHtml, html, 'utf8');
  const url = pathToFileURL(tmpHtml).href;
  const noSandbox = necesitaNoSandbox();

  const limpiar = () => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  };

  try {
    try {
      await correr(bin, armarArgs({ perfil, outPath, url, headless: 'new', noSandbox }));
    } catch (e) {
      // Chromium viejo (o algun build de Debian) no conoce --headless=new.
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) {
        // salio igual: seguimos
      } else if (/headless|unknown|invalid|unrecognized/i.test(String(e.salida || e.message))) {
        fs.rmSync(perfil, { recursive: true, force: true });
        await correr(bin, armarArgs({ perfil, outPath, url, headless: 'old', noSandbox }));
      } else {
        throw e;
      }
    }

    // El navegador devuelve el control antes de terminar de escribir: esperar.
    for (let i = 0; i < 40; i++) {
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) break;
      await sleep(250);
    }

    if (!fs.existsSync(outPath)) {
      throw new Error(`El navegador no generó el PDF (${path.basename(bin)}). Revisá que ${bin} funcione a mano.`);
    }
    const st = fs.statSync(outPath);
    if (st.size < 2000) throw new Error('El PDF salió vacío: ' + outPath);
    return { path: outPath, bytes: st.size };
  } finally {
    limpiar();
  }
}

// Borra los PDF de presupuestos mas viejos que `dias` (para que el servidor
// compartido no llene el disco). Solo toca archivos Presupuesto-ITpro-*.pdf.
function limpiarAntiguos(raiz, dias) {
  if (!(Number(dias) > 0)) return 0;
  const limite = Date.now() - Number(dias) * 86400000;
  let borrados = 0;
  const recorrer = (dir) => {
    let entradas;
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        recorrer(p);
        try { if (!fs.readdirSync(p).length) fs.rmdirSync(p); } catch {}
      } else if (/^Presupuesto-ITpro-.*\.pdf$/i.test(e.name)) {
        try {
          if (fs.statSync(p).mtimeMs < limite) { fs.unlinkSync(p); borrados++; }
        } catch {}
      }
    }
  };
  recorrer(raiz);
  return borrados;
}

// Corre tareas async con un tope de concurrencia (los PDF se generan en
// paralelo: cada navegador headless tarda ~5 s en arrancar).
async function enParalelo(tareas, limite) {
  const res = new Array(tareas.length);
  let siguiente = 0;
  const cuantos = Math.max(1, Math.min(Number(limite) || 1, tareas.length));
  const worker = async () => {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      res[i] = await tareas[i]();
    }
  };
  await Promise.all(Array.from({ length: cuantos }, worker));
  return res;
}

/**
 * Genera los 3 PDF de una cotizacion.
 * @returns {Promise<{destino:string, archivos:Array<{tipo:string, path:string, bytes:number}>}>}
 */
async function generarPdfs(quote, cfg, htmls) {
  const t0 = Date.now();
  const raiz = path.resolve(expand(cfg.rutas.salida));
  const destino = path.join(raiz, safeName(quote.cliente) || 'Sin cliente', safeName(quote.subcarpeta) || 'presupuesto');
  const tipos = [
    ['Cliente', htmls.cliente],
    ['Detalle', htmls.detalle],
    ['INTERNO', htmls.interno],
  ];
  const bin = buscarNavegador(cfg);
  const limite = cfg.pdfParalelo == null ? 3 : Number(cfg.pdfParalelo);

  const out = await enParalelo(
    tipos.map(([tipo, html]) => async () => {
      const p = path.join(destino, `Presupuesto-ITpro-${tipo}.pdf`);
      const r = await htmlToPdf(html, p, bin, cfg);
      return { tipo, path: r.path, bytes: r.bytes };
    }),
    limite
  );

  // Limpieza oportunista (por defecto 30 dias).
  try {
    const dias = cfg.retenerDias == null ? 30 : Number(cfg.retenerDias);
    const n = limpiarAntiguos(raiz, dias);
    if (n) console.log(`[pdf] limpié ${n} PDF de más de ${dias} días`);
  } catch {}

  console.log(
    `[pdf] ${safeName(quote.cliente) || 'sin cliente'}: 3 PDF en ${((Date.now() - t0) / 1000).toFixed(1)} s (${path.basename(bin)})`
  );

  return { destino, archivos: out, motor: path.basename(bin) };
}

module.exports = { generarPdfs, htmlToPdf, buscarNavegador, limpiarAntiguos, safeName };

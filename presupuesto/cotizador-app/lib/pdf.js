'use strict';
// Compila HTML a PDF con Edge headless (mismo metodo que build-presupuesto.ps1).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '').trim().replace(/\.+$/, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function htmlToPdf(html, outPath, edgePath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const id = crypto.randomBytes(6).toString('hex');
  const tmpHtml = path.join(os.tmpdir(), `coti-${id}.html`);
  const profile = path.join(os.tmpdir(), `coti-edge-${id}`);
  fs.writeFileSync(tmpHtml, html, 'utf8');

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${profile}`,
    '--no-pdf-header-footer',
    `--print-to-pdf=${outPath}`,
    'file:///' + tmpHtml.replace(/\\/g, '/'),
  ];

  await new Promise((resolve, reject) => {
    execFile(edgePath, args, { timeout: 90000, windowsHide: true }, (err) => {
      if (err && !fs.existsSync(outPath)) return reject(err);
      resolve();
    });
  });

  // Edge devuelve el control antes de terminar de escribir: esperar el archivo.
  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) break;
    await sleep(250);
  }

  try { fs.unlinkSync(tmpHtml); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  if (!fs.existsSync(outPath)) throw new Error('Edge no genero el PDF: ' + outPath);
  const st = fs.statSync(outPath);
  if (st.size < 2000) throw new Error('El PDF salio vacio: ' + outPath);
  return { path: outPath, bytes: st.size };
}

/**
 * Genera los 3 PDF de una cotizacion.
 * @returns {Promise<Array<{tipo:string, path:string, bytes:number}>>}
 */
async function generarPdfs(quote, cfg, htmls) {
  const raiz = String(cfg.rutas.salida).replace(/%USERPROFILE%/gi, os.homedir());
  const destino = path.join(raiz, safeName(quote.cliente) || 'Sin cliente', safeName(quote.subcarpeta) || 'presupuesto');
  const tipos = [
    ['Cliente', htmls.cliente],
    ['Detalle', htmls.detalle],
    ['INTERNO', htmls.interno],
  ];
  const out = [];
  for (const [tipo, html] of tipos) {
    const p = path.join(destino, `Presupuesto-ITpro-${tipo}.pdf`);
    const r = await htmlToPdf(html, p, cfg.rutas.edge);
    out.push({ tipo, path: r.path, bytes: r.bytes });
  }
  return { destino, archivos: out };
}

module.exports = { generarPdfs, htmlToPdf, safeName };

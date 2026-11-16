'use strict';
// Registra la cotizacion en "Gabi Cotizaciones 2026.xlsx" usando update-gabi.ps1.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ps, q } = require('./ps');
const { precioItem } = require('./docs');

function expand(p) {
  return String(p || '').replace(/%USERPROFILE%/gi, os.homedir());
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function itemsParaExcel(quote) {
  const ops = quote.opciones || [];
  const filas = [];
  for (const op of ops) {
    for (const it of op.items || []) {
      const prefijo = ops.length > 1 ? `[${op.letra}] ` : '';
      filas.push({
        Cant: Number(it.cant) || 1,
        Descripcion: prefijo + String(it.titulo || '').trim(),
        Proveedor: it.proveedor || '',
        Costo: Number(it.costo) || 0,
        PrecioSinIva: Math.round(precioItem(it) * 100) / 100,
      });
    }
  }
  return filas;
}

async function registrar(quote, cfg, { dryRun = false } = {}) {
  const filas = itemsParaExcel(quote);
  if (!filas.length) throw new Error('La cotización no tiene artículos para registrar.');

  const tmpCsv = path.join(os.tmpdir(), `coti-gabi-${Date.now()}.csv`);
  const header = 'Cant,Descripcion,Proveedor,Costo,PrecioSinIva';
  const lineas = [header].concat(
    filas.map((f) => [f.Cant, f.Descripcion, f.Proveedor, f.Costo.toFixed(2), f.PrecioSinIva.toFixed(2)].map(csvCell).join(','))
  );
  fs.writeFileSync(tmpCsv, '\uFEFF' + lineas.join('\r\n') + '\r\n', 'utf8');

  const appDir = path.join(__dirname, '..');
  const script = path.resolve(appDir, expand(cfg.rutas.scripts || '..'), 'update-gabi.ps1');
  const rutaLibro = expand(cfg.rutas.excel);

  const args = [
    `& ${q(script)}`,
    `-Cliente ${q(quote.cliente || 'Sin cliente')}`,
    `-Fecha ${q(String(quote.fecha || '').slice(0, 10))}`,
    `-Csv ${q(tmpCsv)}`,
  ];
  if (rutaLibro && fs.existsSync(rutaLibro)) args.push(`-RutaLibro ${q(rutaLibro)}`);
  if (dryRun) args.push('-DryRun');

  const r = await ps(args, { timeout: 180000 });
  try { fs.unlinkSync(tmpCsv); } catch {}

  if (r.code !== 0) {
    throw new Error((r.stderr || r.stdout || 'update-gabi.ps1 falló').trim());
  }
  return { ok: true, dryRun, salida: r.stdout.trim(), filas: filas.length };
}

module.exports = { registrar, itemsParaExcel };

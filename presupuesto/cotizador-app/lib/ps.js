'use strict';
// Ejecuta PowerShell 5.1 de forma segura: arma el comando, lo encodea en base64
// (UTF-16LE) y fuerza salida UTF-8. Asi no hay problemas de comillas ni acentos.
const { spawn } = require('child_process');

function q(v) {
  // Comilla simple de PowerShell: se escapa duplicando.
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function encode(cmd) {
  return Buffer.from(cmd, 'utf16le').toString('base64');
}

/**
 * @param {string[]} lines  lineas de PowerShell (sin encoding)
 * @param {{timeout?:number}} [opts]
 * @returns {Promise<{code:number, stdout:string, stderr:string}>}
 */
function ps(lines, opts = {}) {
  const timeout = opts.timeout || 120000;
  // OJO: los argumentos van separados por ESPACIO, no por salto de linea:
  // un salto de linea corta la sentencia y el script recibiria cero parametros.
  const cmd = '$ErrorActionPreference = "Stop"; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ' + lines.join(' ');

  if (process.env.PS_DEBUG) {
    try {
      require('fs').appendFileSync(require('path').join(require('os').tmpdir(), 'coti-ps.log'), '\n=== ' + new Date().toISOString() + ' ===\n' + cmd + '\n');
    } catch {}
  }

  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encode(cmd)], {
      windowsHide: true,
    });
    let out = '';
    let err = '';
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { child.kill(); } catch {}
      reject(new Error('PowerShell agoto el tiempo (' + Math.round(timeout / 1000) + 's)'));
    }, timeout);

    child.stdout.on('data', (d) => { out += d.toString('utf8'); });
    child.stderr.on('data', (d) => { err += d.toString('utf8'); });
    child.on('error', (e) => {
      if (done) return;
      done = true; clearTimeout(timer); reject(e);
    });
    child.on('close', (code) => {
      if (done) return;
      done = true; clearTimeout(timer);
      resolve({ code, stdout: out, stderr: err });
    });
  });
}

/** Convierte un valor tipo "SUGERIDO: 21%   (mediana historica)" en 0.21 */
function parseSugerido(salida) {
  const m = /SUGERIDO:\s*(\d+(?:[.,]\d+)?)\s*%/i.exec(salida || '');
  return m ? Number(m[1].replace(',', '.')) / 100 : null;
}

module.exports = { ps, q, parseSugerido };

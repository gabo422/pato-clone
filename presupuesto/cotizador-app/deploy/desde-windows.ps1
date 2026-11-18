<#
  Cotizador ITpro — instalación en el mini PC de la red.

  Se ejecuta con doble clic (o clic derecho > "Ejecutar con PowerShell").
  Copia esta carpeta al servidor y corre allá el instalador.

  Te va a pedir DOS VECES la contraseña del servidor:
    1) para copiar los archivos
    2) para instalarlo (sudo)
  Es la misma contraseña del usuario del mini PC (el de OpenMediaVault).
#>
param(
  [string]$Servidor = '192.168.1.5',
  [string]$Usuario  = 'admin'
)

$ErrorActionPreference = 'Stop'

function Titulo($t) { Write-Host ""; Write-Host "  $t" -ForegroundColor Green }
function Malo($t)   { Write-Host "  $t" -ForegroundColor Red }

Write-Host ""
Write-Host "  ===============================================" -ForegroundColor Green
Write-Host "   Cotizador ITpro -> mini PC $Servidor" -ForegroundColor Green
Write-Host "  ===============================================" -ForegroundColor Green
Write-Host ""

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  Malo "No encuentro 'ssh' en esta PC. Instalá 'Cliente OpenSSH' desde"
  Malo "Configuración > Aplicaciones > Características opcionales."
  Write-Host ""
  Read-Host "  Enter para cerrar"
  exit 1
}

$origen = Split-Path -Parent $PSScriptRoot
$nombre = Split-Path -Leaf $origen
$destinoRemoto = "/tmp/$nombre"
$opciones = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15')

if (-not (Test-Path (Join-Path $origen 'server.js'))) {
  Malo "No encuentro server.js en $origen"
  Read-Host "  Enter para cerrar"
  exit 1
}

Titulo "1/3  Probando la conexión con $Usuario@$Servidor ..."
& ssh @opciones "$Usuario@$Servidor" "echo conectado" | Out-Null
if ($LASTEXITCODE -ne 0) {
  Malo "No pude entrar a $Servidor con el usuario '$Usuario'."
  Malo "Revisá el usuario y que el SSH esté habilitado en OpenMediaVault."
  Read-Host "  Enter para cerrar"
  exit 1
}

Titulo "2/3  Copiando los archivos (te pide la contraseña)..."
& ssh @opciones "$Usuario@$Servidor" "rm -rf $destinoRemoto && mkdir -p $destinoRemoto"
& scp @opciones -r $origen "${Usuario}@${Servidor}:/tmp/"
if ($LASTEXITCODE -ne 0) {
  Malo "Falló la copia. Probá de nuevo (a veces pide la contraseña dos veces)."
  Read-Host "  Enter para cerrar"
  exit 1
}

Titulo "3/3  Instalando en el servidor (puede tardar unos minutos)..."
$esRoot = ((& ssh @opciones "$Usuario@$Servidor" "id -u") | Out-String).Trim() -eq '0'
$comando = if ($esRoot) { "bash $destinoRemoto/deploy/instalar.sh" } else { "sudo bash $destinoRemoto/deploy/instalar.sh" }
& ssh -t @opciones "$Usuario@$Servidor" $comando

if ($LASTEXITCODE -ne 0) {
  Malo "La instalación no terminó bien. Mirá el mensaje de arriba."
  Read-Host "  Enter para cerrar"
  exit 1
}

Write-Host ""
Write-Host "  Listo. Abrí en el navegador:  http://${Servidor}:8090" -ForegroundColor Green
Write-Host "  (contraseña: la de config.json, por defecto Itpro.2222)"
Write-Host ""
Read-Host "  Enter para cerrar"

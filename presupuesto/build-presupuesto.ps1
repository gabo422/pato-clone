param(
  [string]$Template = 'presupuesto-cliente.template.html',
  [string]$LogoPath = "$env:USERPROFILE\Downloads\itpro-logo.png",
  [string]$OutPath  = "$env:USERPROFILE\Desktop\Presupuesto-ITpro-Cliente.pdf"
)
$ErrorActionPreference = 'Stop'
$base    = Split-Path -Parent $MyInvocation.MyCommand.Path
$tpl     = Join-Path $base $Template
$fontCss = Join-Path $base 'roboto-embed.css'
$tmp     = Join-Path $env:TEMP 'presupuesto-build.html'
$edge    = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

$enc   = New-Object System.Text.UTF8Encoding($true)
$html  = [IO.File]::ReadAllText($tpl, [Text.Encoding]::UTF8)
$faces = [IO.File]::ReadAllText($fontCss, [Text.Encoding]::UTF8)
$b64   = [Convert]::ToBase64String([IO.File]::ReadAllBytes($LogoPath))

$html = $html.Replace('__LOGO__', "data:image/png;base64,$b64")
$html = $html.Replace('<style>', "<style>`n$faces")
[IO.File]::WriteAllText($tmp, $html, $enc)

$oldEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
& $edge --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$OutPath" ("file:///" + ($tmp -replace '\\','/')) 2>$null
$ErrorActionPreference = $oldEap
Start-Sleep -Seconds 3
if (Test-Path -LiteralPath $OutPath) {
  "PDF OK: $OutPath  ({0:N0} KB)" -f ((Get-Item -LiteralPath $OutPath).Length/1KB)
} else { throw "No se genero el PDF" }

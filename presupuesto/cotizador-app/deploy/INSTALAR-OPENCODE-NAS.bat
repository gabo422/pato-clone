@echo off
chcp 65001 >nul
title Instalar OpenCode en el mini PC - Cotizador ITpro

set SERVIDOR=192.168.1.5
set USUARIO=coti
set HOSTKEY=SHA256:/M0mR4KnDB2bv3cmpcreGrLDTimAFfaawVcOL8BNAJM
set PUTTY=C:\Program Files\PuTTY
set ORIGEN=%~dp0instalar-opencode-nas.sh

echo.
echo  ============================================================
echo   Instalar OpenCode (Big Pickle) en el mini PC %SERVIDOR%
echo  ============================================================
echo.
echo  Te va a pedir la contraseña SSH del usuario %USUARIO%.
echo  (Está en CREDENCIALES-NAS.txt, línea 11)
echo.
set /p CLAVE="  Contraseña: "
echo.

if not exist "%ORIGEN%" (
  echo  ERROR: no encontré %ORIGEN%
  goto fin
)

echo  [1/2] Copiando el instalador al mini PC...
"%PUTTY%\pscp.exe" -pw "%CLAVE%" -hostkey "%HOSTKEY%" -batch "%ORIGEN%" %USUARIO%@%SERVIDOR%:/tmp/instalar-opencode-nas.sh
if errorlevel 1 (
  echo  ERROR: no se pudo copiar. Revisá la contraseña y que el NAS esté encendido.
  goto fin
)

echo  [2/2] Instalando en el mini PC...
"%PUTTY%\plink.exe" -ssh -pw "%CLAVE%" -hostkey "%HOSTKEY%" -batch %USUARIO%@%SERVIDOR% "bash /tmp/instalar-opencode-nas.sh"
if errorlevel 1 (
  echo  ERROR: la instalación falló. Revisá el output de arriba.
  goto fin
)

echo.
echo  LISTO. Ahora avisale a Gabriel para que conecte el cotizador.

:fin
echo.
pause

@echo off
cd /d "%~dp0"
title Cotizador ITpro
echo.
echo   Iniciando el Cotizador ITpro...
echo   Si el navegador no se abre solo, andá a: http://127.0.0.1:8090
echo.
set OPEN=1
node server.js
echo.
echo   El servidor se cerro.
pause

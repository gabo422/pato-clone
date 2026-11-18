@echo off
cd /d "%~dp0"
title Instalar Cotizador en el mini PC
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0desde-windows.ps1" %*
pause

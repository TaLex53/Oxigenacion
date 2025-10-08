@echo off
title Abick Oxigeno - Servidor PM2
echo ========================================
echo    INICIANDO SERVIDOR ABICK CON PM2
echo ========================================
echo.

echo 🔧 Deteniendo procesos existentes...
pm2 delete abick-oxigeno-server 2>nul

echo.
echo 🚀 Iniciando servidor...
cd /d "%~dp0"
pm2 start server/index.js --name "abick-oxigeno-server" --watch server/ --ignore-watch "server/logs" --log-date-format "YYYY-MM-DD HH:mm:ss"

echo.
echo 📊 Estado del servidor:
pm2 status

echo.
echo ✅ Servidor iniciado con PM2
echo 📋 Para ver logs: pm2 logs abick-oxigeno-server
echo 📋 Para detener: pm2 stop abick-oxigeno-server
echo.
pause

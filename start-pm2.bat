@echo off
echo ========================================
echo    INICIANDO SERVIDOR ABICK CON PM2
echo ========================================
echo.

echo 🔧 Deteniendo procesos existentes...
pm2 delete abick-oxigeno-server 2>nul

echo.
echo 🚀 Iniciando servidor con PM2...
pm2 start ecosystem.config.js

echo.
echo 📊 Estado de procesos:
pm2 status

echo.
echo 📋 Comandos útiles:
echo    pm2 status          - Ver estado
echo    pm2 logs            - Ver logs
echo    pm2 restart all     - Reiniciar
echo    pm2 stop all        - Detener
echo    pm2 delete all      - Eliminar
echo.
echo ✅ Servidor iniciado con PM2
pause

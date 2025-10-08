@echo off
echo ========================================
echo   INSTALANDO PM2 COMO SERVICIO WINDOWS
echo ========================================
echo.

echo 🔧 Instalando PM2 como servicio de Windows...
pm2 install pm2-windows-service

echo.
echo 🚀 Configurando servicio...
pm2-service-install

echo.
echo 📊 Verificando instalación...
pm2 status

echo.
echo ✅ PM2 configurado como servicio de Windows
echo.
echo 📋 El servidor se iniciará automáticamente al arrancar Windows
echo 📋 Para desinstalar: pm2-service-uninstall
echo.
pause

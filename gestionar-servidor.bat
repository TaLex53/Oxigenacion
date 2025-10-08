@echo off
title Gestión Servidor Abick - PM2
:menu
cls
echo ========================================
echo      GESTIÓN SERVIDOR ABICK - PM2
echo ========================================
echo.
echo 1. Iniciar servidor
echo 2. Detener servidor
echo 3. Reiniciar servidor
echo 4. Ver estado
echo 5. Ver logs en tiempo real
echo 6. Ver logs de errores
echo 7. Monitoreo de recursos
echo 8. Configurar inicio automático
echo 9. Salir
echo.
set /p choice="Selecciona una opción (1-9): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto status
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto error-logs
if "%choice%"=="7" goto monitor
if "%choice%"=="8" goto startup
if "%choice%"=="9" goto exit
goto menu

:start
cls
echo ========================================
echo           INICIANDO SERVIDOR
echo ========================================
pm2 start server/index.js --name "abick-oxigeno-server" --watch server/ --ignore-watch "server/logs"
echo ✅ Servidor iniciado
pause
goto menu

:stop
cls
echo ========================================
echo           DETENIENDO SERVIDOR
echo ========================================
pm2 stop abick-oxigeno-server
echo ✅ Servidor detenido
pause
goto menu

:restart
cls
echo ========================================
echo           REINICIANDO SERVIDOR
echo ========================================
pm2 restart abick-oxigeno-server
echo ✅ Servidor reiniciado
pause
goto menu

:status
cls
echo ========================================
echo           ESTADO DEL SERVIDOR
echo ========================================
pm2 status
echo.
pause
goto menu

:logs
cls
echo ========================================
echo           LOGS EN TIEMPO REAL
echo ========================================
echo Presiona Ctrl+C para salir
pm2 logs abick-oxigeno-server
pause
goto menu

:error-logs
cls
echo ========================================
echo           LOGS DE ERRORES
echo ========================================
pm2 logs abick-oxigeno-server --err
echo.
pause
goto menu

:monitor
cls
echo ========================================
echo           MONITOREO DE RECURSOS
echo ========================================
pm2 monit
pause
goto menu

:startup
cls
echo ========================================
echo       CONFIGURAR INICIO AUTOMÁTICO
echo ========================================
echo Configurando PM2 para iniciar automáticamente...
pm2 startup
echo.
echo ✅ Configurado para inicio automático
echo 📋 El servidor se iniciará automáticamente al reiniciar Windows
pause
goto menu

:exit
echo Saliendo...
exit

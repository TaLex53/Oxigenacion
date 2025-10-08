@echo off
title PM2 Manager - Abick Oxigeno
:menu
cls
echo ========================================
echo       PM2 MANAGER - ABICK OXIGENO
echo ========================================
echo.
echo 1. Ver estado de procesos
echo 2. Ver logs en tiempo real
echo 3. Reiniciar servidor
echo 4. Detener servidor
echo 5. Iniciar servidor
echo 6. Ver logs de errores
echo 7. Monitoreo de recursos
echo 8. Salir
echo.
set /p choice="Selecciona una opción (1-8): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto logs
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto stop
if "%choice%"=="5" goto start
if "%choice%"=="6" goto error-logs
if "%choice%"=="7" goto monitor
if "%choice%"=="8" goto exit
goto menu

:status
cls
echo ========================================
echo           ESTADO DE PROCESOS
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

:restart
cls
echo ========================================
echo           REINICIANDO SERVIDOR
echo ========================================
pm2 restart abick-oxigeno-server
echo ✅ Servidor reiniciado
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

:start
cls
echo ========================================
echo           INICIANDO SERVIDOR
echo ========================================
pm2 start ecosystem.config.js
echo ✅ Servidor iniciado
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

:exit
echo Saliendo...
exit

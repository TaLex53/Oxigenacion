@echo off
echo ========================================
echo  Sistema de Control de Oxigeno - Web
echo  Instalacion y Configuracion
echo ========================================
echo.

echo [1/4] Instalando dependencias del proyecto principal...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias principales
    pause
    exit /b 1
)

echo.
echo [2/4] Instalando dependencias del servidor...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias del servidor
    pause
    exit /b 1
)

echo.
echo [3/4] Instalando dependencias del cliente...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias del cliente
    pause
    exit /b 1
)

echo.
echo [4/4] Configuracion completada!
echo.
echo ========================================
echo  Instalacion Completada Exitosamente
echo ========================================
echo.
echo Para ejecutar el sistema:
echo   npm run dev
echo.
echo O ejecutar por separado:
echo   npm run server    (Backend en puerto 3001)
echo   npm run client    (Frontend en puerto 3000)
echo.
echo Acceso al sistema:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo IMPORTANTE: Asegurate de que MySQL este ejecutandose
echo y que la base de datos 'db_oxigeno' exista.
echo.
pause

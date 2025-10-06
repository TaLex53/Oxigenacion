// Configuración de ejemplo para el Sistema de Control de Oxígeno
// Copia este archivo como 'config.js' y ajusta los valores según tu entorno

module.exports = {
  // Configuración del Servidor
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Configuración Modbus TCP - AJUSTAR SEGÚN TU PLC
  PLC_IP: process.env.PLC_IP || '192.168.0.253',  // IP del PLC
  PLC_PORT: process.env.PLC_PORT || 502,           // Puerto Modbus TCP

  // Configuración Base de Datos MySQL - AJUSTAR SEGÚN TU BD
  DB_HOST: process.env.DB_HOST || '127.0.0.1',     // Host de MySQL
  DB_USER: process.env.DB_USER || 'root',          // Usuario de MySQL
  DB_PASSWORD: process.env.DB_PASSWORD || '',      // Contraseña de MySQL
  DB_NAME: process.env.DB_NAME || 'db_oxigeno',    // Nombre de la base de datos

  // Configuración Email - AJUSTAR SEGÚN TU SERVIDOR
  EMAIL_HOST: process.env.EMAIL_HOST || 'mail.smarteyes.cl',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'alertas@smarteyes.cl',
  EMAIL_PASS: process.env.EMAIL_PASS || 'Smart2000!',

  // Configuración WebSocket
  WS_PORT: process.env.WS_PORT || 3002
};

/*
INSTRUCCIONES DE CONFIGURACIÓN:

1. COPIA ESTE ARCHIVO:
   cp config.example.js config.js

2. AJUSTA LA CONFIGURACIÓN SEGÚN TU ENTORNO:

   a) PLC (Modbus TCP):
      - PLC_IP: IP de tu PLC (ej: '192.168.1.100')
      - PLC_PORT: Puerto Modbus (generalmente 502)

   b) Base de Datos MySQL:
      - DB_HOST: IP del servidor MySQL (ej: 'localhost' o '192.168.1.50')
      - DB_USER: Usuario de MySQL
      - DB_PASSWORD: Contraseña de MySQL
      - DB_NAME: Nombre de la base de datos

   c) Email (Opcional):
      - Configura tu servidor SMTP para alertas
      - O deja los valores por defecto si usas el mismo servidor

3. VERIFICA QUE LA BASE DE DATOS EXISTA:
   - Crea la base de datos: CREATE DATABASE db_oxigeno;
   - Importa la estructura desde tu sistema original

4. VERIFICA LA CONECTIVIDAD:
   - PLC debe estar en la misma red
   - MySQL debe estar ejecutándose
   - Puertos 3001 y 3000 deben estar libres

5. EJECUTA EL SISTEMA:
   npm run dev
*/

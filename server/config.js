// Configuración del servidor
module.exports = {
  // Configuración del Servidor
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Configuración Modbus TCP
  PLC_IP: process.env.PLC_IP || '192.168.0.253',
  PLC_PORT: process.env.PLC_PORT || 502,

  // Configuración Base de Datos MySQL Local (ReadConnection)
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'db_oxigeno',

  // Configuración Base de Datos MySQL Remota (ReadConnectionHost)
  DB_HOST_REMOTE: process.env.DB_HOST_REMOTE || '138.255.103.114',
  DB_USER_REMOTE: process.env.DB_USER_REMOTE || 'svsmarte_svsmarte',
  DB_PASSWORD_REMOTE: process.env.DB_PASSWORD_REMOTE || 'xN88ZfEp3t*(Y0',
  DB_NAME_REMOTE: process.env.DB_NAME_REMOTE || 'svsmarte_db_oxigeno',

  // Configuración Email
  EMAIL_HOST: process.env.EMAIL_HOST || 'mail.smarteyes.cl',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'alertas@smarteyes.cl',
  EMAIL_PASS: process.env.EMAIL_PASS || 'Smart2000!',

  // Configuración WebSocket
  WS_PORT: process.env.WS_PORT || 3002
};

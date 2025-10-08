const mysql = require('mysql2/promise');
const config = require('./config');

async function testReadConnectionHost() {
  console.log('🔍 Probando conexión a ReadConnectionHost...');
  console.log(`🌐 IP: ${config.DB_HOST_REMOTE}`);
  console.log(`📊 Base: ${config.DB_NAME_REMOTE}`);
  console.log(`👤 Usuario: ${config.DB_USER_REMOTE}`);
  
  let connection = null;
  
  try {
    // Intentar conectar
    connection = await mysql.createConnection({
      host: config.DB_HOST_REMOTE,
      user: config.DB_USER_REMOTE,
      password: config.DB_PASSWORD_REMOTE,
      database: config.DB_NAME_REMOTE,
      acquireTimeout: 10000,
      timeout: 10000
    });
    
    console.log('✅ CONEXIÓN EXITOSA A READCONNECTIONHOST');
    
    // Probar una consulta simple
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM cliente');
    console.log(`📊 Total de clientes en ReadConnectionHost: ${rows[0].total}`);
    
    // Probar tabla registroclientes
    const [registros] = await connection.execute('SELECT COUNT(*) as total FROM registroclientes');
    console.log(`📊 Total de registros de inyecciones: ${registros[0].total}`);
    
    console.log('🎯 READCONNECTIONHOST LISTO PARA RECIBIR INYECCIONES');
    
  } catch (error) {
    console.error('❌ ERROR CONECTANDO A READCONNECTIONHOST:');
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Código: ${error.code}`);
    console.error(`   SQL State: ${error.sqlState}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Verificar que el servidor esté ejecutándose en 138.255.103.114');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Verificar credenciales de usuario y contraseña');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Verificar que la base de datos svsmarte_db_oxigeno exista');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar prueba
testReadConnectionHost();

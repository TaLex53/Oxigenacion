const mysql = require('mysql2/promise');
const config = require('./config');

async function checkClientes() {
  try {
    const connection = await mysql.createConnection({
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME
    });

    console.log('🔌 Conectado a la base de datos');

    // Verificar si la tabla existe
    const [tables] = await connection.execute("SHOW TABLES LIKE 'cliente'");
    console.log('📋 Tabla cliente existe:', tables.length > 0);

    if (tables.length > 0) {
      // Contar registros
      const [count] = await connection.execute('SELECT COUNT(*) as total FROM cliente');
      console.log('📊 Total de clientes:', count[0].total);

      // Obtener algunos clientes
      const [rows] = await connection.execute('SELECT * FROM cliente LIMIT 5');
      console.log('📋 Primeros 5 clientes:', rows);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkClientes();

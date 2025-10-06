const ModbusRTU = require('modbus-serial');

async function testModbusConnection() {
  const client = new ModbusRTU();
  
  console.log('🔍 Probando conexión Modbus TCP...');
  console.log('📍 IP: 192.168.0.253');
  console.log('🔌 Puerto: 502');
  console.log('⏱️  Timeout: 10 segundos');
  
  try {
    // Configurar timeout
    client.setTimeout(10000);
    
    // Intentar conectar
    console.log('\n🔄 Intentando conectar...');
    await client.connectTCP('192.168.0.253', { port: 502 });
    
    console.log('✅ ¡Conexión Modbus exitosa!');
    
    // Configurar ID del dispositivo
    client.setID(1);
    
    // Intentar leer un registro simple
    console.log('\n📖 Probando lectura de registros...');
    
    try {
      // Leer algunos registros de entrada
      const data = await client.readInputRegisters(3001, 5);
      console.log('✅ Lectura exitosa:', data.data);
    } catch (readError) {
      console.log('⚠️  Error en lectura de registros:', readError.message);
      console.log('ℹ️  Esto puede ser normal si el PLC no tiene datos en esos registros');
    }
    
    // Cerrar conexión
    await client.close();
    console.log('\n🔌 Conexión cerrada correctamente');
    
  } catch (error) {
    console.error('\n❌ Error de conexión Modbus:');
    console.error('📝 Tipo:', error.name);
    console.error('💬 Mensaje:', error.message);
    console.error('🔍 Código:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Posibles causas:');
      console.log('   • El PLC no está ejecutando servidor Modbus TCP');
      console.log('   • El puerto 502 está cerrado');
      console.log('   • El PLC necesita configuración adicional');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Posibles causas:');
      console.log('   • El PLC no responde en el puerto 502');
      console.log('   • Firewall bloqueando la conexión');
      console.log('   • El PLC está ocupado');
    }
  }
}

// Ejecutar prueba
testModbusConnection().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});

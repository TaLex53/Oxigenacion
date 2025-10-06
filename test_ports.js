const net = require('net');

async function testPort(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      connected = true;
      socket.destroy();
      resolve({ port, status: 'OPEN', error: null });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, status: 'TIMEOUT', error: 'Connection timeout' });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ port, status: 'CLOSED', error: err.message });
    });
    
    socket.connect(port, host);
  });
}

async function scanModbusPorts() {
  const host = '192.168.0.253';
  const ports = [
    502,    // Modbus TCP estándar
    1502,   // Modbus TCP alternativo
    5020,   // Modbus TCP alternativo
    80,     // HTTP (ya sabemos que está abierto)
    443,    // HTTPS
    21,     // FTP
    22,     // SSH
    23,     // Telnet
    161,    // SNMP
    162,    // SNMP Trap
    8080,   // HTTP alternativo
    8443,   // HTTPS alternativo
    10000,  // Modbus TCP alternativo
    20000,  // Modbus TCP alternativo
  ];
  
  console.log(`🔍 Escaneando puertos en ${host}...`);
  console.log('⏱️  Timeout por puerto: 5 segundos\n');
  
  const results = [];
  
  for (const port of ports) {
    process.stdout.write(`🔌 Puerto ${port.toString().padStart(5)}: `);
    const result = await testPort(host, port);
    results.push(result);
    
    if (result.status === 'OPEN') {
      console.log('✅ ABIERTO');
    } else if (result.status === 'TIMEOUT') {
      console.log('⏰ TIMEOUT');
    } else {
      console.log('❌ CERRADO');
    }
  }
  
  console.log('\n📊 RESUMEN:');
  const openPorts = results.filter(r => r.status === 'OPEN');
  
  if (openPorts.length > 0) {
    console.log('✅ Puertos abiertos encontrados:');
    openPorts.forEach(r => {
      console.log(`   • Puerto ${r.port}`);
    });
  } else {
    console.log('❌ No se encontraron puertos abiertos');
  }
  
  console.log('\n💡 RECOMENDACIONES:');
  console.log('   • Si no hay puerto Modbus (502) abierto, el PLC puede necesitar:');
  console.log('     - Habilitar Modbus TCP en la configuración');
  console.log('     - Configurar el puerto correcto');
  console.log('     - Verificar que el PLC esté en modo servidor Modbus');
  console.log('   • Consulte la documentación del PLC para configuración Modbus');
}

scanModbusPorts().then(() => {
  console.log('\n🏁 Escaneo completado');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});

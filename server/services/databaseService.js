const mysql = require('mysql2/promise');
const config = require('../config');

class DatabaseService {
  constructor() {
    this.localConnection = null;
    this.remoteConnection = null;
    this.syncInterval = null;
  }

  async connect() {
    try {
      // Conexión Local (ReadConnection)
      this.localConnection = await mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      });
      console.log('✅ Conectado a MySQL Local (ReadConnection)');

      // Conexión Remota (ReadConnectionHost)
      try {
        this.remoteConnection = await mysql.createConnection({
          host: config.DB_HOST_REMOTE,
          user: config.DB_USER_REMOTE,
          password: config.DB_PASSWORD_REMOTE,
          database: config.DB_NAME_REMOTE,
          acquireTimeout: 60000,
          timeout: 60000,
          reconnect: true
        });
        console.log('✅ Conectado a MySQL Remota (ReadConnectionHost)');
        
        // Iniciar sincronización cada 60 segundos
        this.startSync();
      } catch (remoteError) {
        console.warn('⚠️ No se pudo conectar a MySQL Remota:', remoteError.message);
        console.log('🔄 Continuando solo con base de datos local');
      }

      return true;
    } catch (error) {
      console.error('❌ Error conectando a MySQL Local:', error.message);
      return false;
    }
  }

  async disconnect() {
    // Detener sincronización
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Desconectar base local
    if (this.localConnection) {
      await this.localConnection.end();
      this.localConnection = null;
      console.log('🔌 Desconectado de MySQL Local');
    }

    // Desconectar base remota
    if (this.remoteConnection) {
      await this.remoteConnection.end();
      this.remoteConnection = null;
      console.log('🔌 Desconectado de MySQL Remota');
    }
  }

  // Iniciar sincronización cada 60 segundos
  startSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      await this.syncToRemote();
    }, 60000); // 60 segundos

    console.log('🔄 Sincronización iniciada cada 60 segundos');
  }

  // Sincronizar datos a la base remota
  async syncToRemote() {
    if (!this.remoteConnection) {
      console.log('⚠️ No hay conexión remota para sincronizar');
      return;
    }

    try {
      // Obtener datos recientes de la base local
      const [rows] = await this.localConnection.execute(
        'SELECT * FROM registros WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)'
      );

      if (rows.length > 0) {
        // Insertar en la base remota
        for (const row of rows) {
          // Mapear CantPeces (tipo de inyección) a valores numéricos
          let tipoInyeccion = 1; // Default: Normal
          if (row.CantPeces) {
            switch (row.CantPeces) {
              case 1: tipoInyeccion = 1; break; // Normal
              case 2: tipoInyeccion = 2; break; // Pruebas
              case 3: tipoInyeccion = 3; break; // A pedido
              default: tipoInyeccion = 1; break; // Normal por defecto
            }
          }
          
          await this.remoteConnection.execute(
            `INSERT INTO registros (idJaula, NivelOxigeno, Estado, Cliente, FechaRegistro, HoraRegistro) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [row.idJaula, row.NivelOxigeno, row.Estado, row.Cliente, row.FechaRegistro, row.HoraRegistro]
          );
        }
        console.log(`📤 Sincronizados ${rows.length} registros a la base remota`);
      }
    } catch (error) {
      console.error('❌ Error en sincronización remota:', error.message);
    }
  }

  // Obtener lista de clientes
  async getClientes() {
    try {
      console.log('🔄 Consultando clientes en la base de datos...');
      const [rows] = await this.localConnection.execute(
        'SELECT NombreCliente FROM cliente ORDER BY NombreCliente ASC'
      );
      console.log(`📊 Encontrados ${rows.length} clientes en la base de datos`);
      const clientes = rows.map(row => row.NombreCliente);
      console.log('📊 Lista de clientes:', clientes);
      return clientes;
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error.message);
      return [];
    }
  }

  // Obtener tipos de inyección de las jaulas
  async getTiposInyeccion() {
    try {
      // Verificar si hay nombres de inyección en la tabla registros
      try {
        const [columnRows] = await this.localConnection.execute(
          'DESCRIBE registros'
        );
        console.log('📊 Columnas en tabla registros:', columnRows.map(r => r.Field));
        
        // Buscar columnas que puedan contener nombres de inyección
        const inyeccionColumns = columnRows.filter(r => 
          r.Field.toLowerCase().includes('inyeccion') || 
          r.Field.toLowerCase().includes('tipo') ||
          r.Field.toLowerCase().includes('nombre')
        );
        console.log('📊 Columnas relacionadas con inyección:', inyeccionColumns);
        
      } catch (e) {
        console.log('📊 Error verificando estructura de tabla:', e.message);
      }
      
      const [rows] = await this.localConnection.execute(
        'SELECT IdJaula, CantPeces FROM registros WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 HOUR) ORDER BY IdJaula, FechaRegistro DESC'
      );
      
      console.log('📊 Valores CantPeces encontrados en BD:', [...new Set(rows.map(r => r.CantPeces))]);
      
      const tiposInyeccion = {};
      rows.forEach(row => {
        if (!tiposInyeccion[row.IdJaula]) {
          tiposInyeccion[row.IdJaula] = row.CantPeces;
        }
      });
      
      return tiposInyeccion;
    } catch (error) {
      console.error('Error obteniendo tipos de inyección:', error.message);
      return {};
    }
  }

  // Agregar cliente
  async agregarCliente(rut, nombre) {
    try {
      await this.localConnection.execute(
        'INSERT INTO cliente (NombreCliente, RutCliente) VALUES (?, ?)',
        [nombre, rut]
      );
      return true;
    } catch (error) {
      console.error('Error agregando cliente:', error.message);
      return false;
    }
  }

  // Configurar límites de oxígeno
  async configurarLimites(jaula, minimo, maximo) {
    try {
      await this.localConnection.execute(
        'UPDATE jaulas SET LimiteInferior = ?, LimiteSuperior = ? WHERE NombreJaula = ?',
        [minimo, maximo, jaula]
      );
      return true;
    } catch (error) {
      console.error('Error configurando límites:', error.message);
      return false;
    }
  }

  // Obtener límites de una jaula
  async getLimites(jaula) {
    try {
      const [rows] = await this.localConnection.execute(
        'SELECT LimiteInferior, LimiteSuperior FROM jaulas WHERE NombreJaula = ?',
        [jaula]
      );
      return rows[0] || { LimiteInferior: 0, LimiteSuperior: 0 };
    } catch (error) {
      console.error('Error obteniendo límites:', error.message);
      return { LimiteInferior: 0, LimiteSuperior: 0 };
    }
  }

  // Obtener alias de empresa
  async getAliasEmpresa(nombreEmpresa) {
    try {
      const [rows] = await this.localConnection.execute(
        'SELECT alias FROM cliente WHERE NombreCliente = ?',
        [nombreEmpresa]
      );
      return rows[0]?.alias || '';
    } catch (error) {
      console.error('Error obteniendo alias:', error.message);
      return '';
    }
  }

  // Insertar registro de jaula
  async insertarRegistro(jaulaId, nivelOxigeno, estado, cliente, flujo, cantPeces, inyectando) {
    try {
      await this.localConnection.execute(
        `INSERT INTO registros (idJaula, NivelOxigeno, Estado, Cliente, Flujo, CantPeces, inyectando, FechaRegistro, HoraRegistro) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [jaulaId, nivelOxigeno, estado, cliente, flujo, cantPeces, inyectando]
      );
      return true;
    } catch (error) {
      console.error('Error insertando registro:', error.message);
      return false;
    }
  }

  // Proceso de cliente (inicio)
  async procesoCliente(supervisor, cliente, jaula, flujo, nivelOxigeno, tipoInyeccion) {
    try {
      const alias = await this.getAliasEmpresa(cliente);
      
      // Insertar en base local
      await this.localConnection.execute(
        `INSERT INTO registroclientes (idCliente, idJaula, HoraInicio, NivelOxigenoInicio, Especie, FlujoTotal, CantPeces) 
         SELECT (SELECT id FROM cliente WHERE alias = ?), ?, NOW(), ?, ?, ?, ?`,
        [alias, jaula, nivelOxigeno, supervisor, flujo / 60, tipoInyeccion]
      );
      
      console.log(`📤 INYECCIÓN ENVIADA AL SISTEMA EN LÍNEA - JAULA ${jaula}`);
      console.log(`   🌐 ReadConnectionHost: ${config.DB_HOST_REMOTE}`);
      console.log(`   📊 Cliente: ${cliente} (${alias})`);
      console.log(`   📊 Supervisor: ${supervisor}`);
      console.log(`   📊 Nivel: ${nivelOxigeno} mg/L`);
      console.log(`   📊 Tipo: ${tipoInyeccion}`);
      console.log(`   📊 Flujo: ${flujo} m³/h`);
      
      // Sincronizar inmediatamente con ReadConnectionHost
      await this.syncInyeccionInmediata(alias, jaula, nivelOxigeno, supervisor, flujo / 60, tipoInyeccion);
      
      return true;
    } catch (error) {
      console.error('Error en proceso cliente:', error.message);
      return false;
    }
  }

  // Proceso de cliente (cierre)
  async procesoClienteCierre(supervisor, cliente, jaula, flujo, nivelOxigeno) {
    try {
      const alias = await this.getAliasEmpresa(cliente);
      
      // Actualizar en base local
      await this.localConnection.execute(
        `UPDATE registroclientes SET 
         NivelOxigenoTermino = ?, Especie = ?, HoraTermino = NOW(),
         FlujoTotal = (SELECT SUM(flujo) FROM registros reg WHERE reg.idJaula = ? AND reg.FechaRegistro BETWEEN HoraInicio AND NOW()) / 60
         WHERE id = (SELECT id FROM registroclientes WHERE NivelOxigenoTermino IS NULL AND idJaula = ? ORDER BY FechaRegistro DESC LIMIT 1)`,
        [nivelOxigeno, supervisor, jaula, jaula]
      );
      
      console.log(`📤 CIERRE DE INYECCIÓN ENVIADO AL SISTEMA EN LÍNEA - JAULA ${jaula}`);
      console.log(`   🌐 ReadConnectionHost: ${config.DB_HOST_REMOTE}`);
      console.log(`   📊 Cliente: ${cliente} (${alias})`);
      console.log(`   📊 Supervisor: ${supervisor}`);
      console.log(`   📊 Nivel final: ${nivelOxigeno} mg/L`);
      
      // Sincronizar cierre inmediatamente con ReadConnectionHost
      await this.syncCierreInmediato(alias, jaula, nivelOxigeno, supervisor);
      
      return true;
    } catch (error) {
      console.error('Error en proceso cliente cierre:', error.message);
      return false;
    }
  }

  // Insertar nivel de tanque
  async insertarNivelTanque(nivel100, nivel200) {
    try {
      await this.localConnection.execute(
        'INSERT INTO estanque (NivelO2100, NivelO2200, FechaRegistro) VALUES (?, ?, NOW())',
        [nivel100, nivel200]
      );
      return true;
    } catch (error) {
      console.error('Error insertando nivel tanque:', error.message);
      return false;
    }
  }

  // Sincronizar inyección inmediatamente con ReadConnectionHost
  async syncInyeccionInmediata(alias, jaula, nivelOxigeno, supervisor, flujoTotal, tipoInyeccion) {
    if (!this.remoteConnection) {
      console.log('⚠️ No hay conexión remota para sincronizar inyección');
      return false;
    }

    try {
      // Insertar inyección en ReadConnectionHost
      await this.remoteConnection.execute(
        `INSERT INTO registroclientes (idCliente, idJaula, HoraInicio, NivelOxigenoInicio, Especie, FlujoTotal, CantPeces) 
         SELECT (SELECT id FROM cliente WHERE alias = ?), ?, NOW(), ?, ?, ?, ?`,
        [alias, jaula, nivelOxigeno, supervisor, flujoTotal, tipoInyeccion]
      );
      
      console.log(`✅ INYECCIÓN SINCRONIZADA CON READCONNECTIONHOST - JAULA ${jaula}`);
      console.log(`   🌐 IP: ${config.DB_HOST_REMOTE}`);
      console.log(`   📊 Base: ${config.DB_NAME_REMOTE}`);
      return true;
    } catch (error) {
      console.error(`❌ Error sincronizando inyección con ReadConnectionHost:`, error.message);
      return false;
    }
  }

  // Sincronizar cierre de inyección inmediatamente con ReadConnectionHost
  async syncCierreInmediato(alias, jaula, nivelOxigeno, supervisor) {
    if (!this.remoteConnection) {
      console.log('⚠️ No hay conexión remota para sincronizar cierre');
      return false;
    }

    try {
      // Actualizar cierre en ReadConnectionHost
      await this.remoteConnection.execute(
        `UPDATE registroclientes SET 
         NivelOxigenoTermino = ?, Especie = ?, HoraTermino = NOW()
         WHERE idJaula = ? AND NivelOxigenoTermino IS NULL 
         ORDER BY HoraInicio DESC LIMIT 1`,
        [nivelOxigeno, supervisor, jaula]
      );
      
      console.log(`✅ CIERRE SINCRONIZADO CON READCONNECTIONHOST - JAULA ${jaula}`);
      console.log(`   🌐 IP: ${config.DB_HOST_REMOTE}`);
      console.log(`   📊 Base: ${config.DB_NAME_REMOTE}`);
      return true;
    } catch (error) {
      console.error(`❌ Error sincronizando cierre con ReadConnectionHost:`, error.message);
      return false;
    }
  }

  // Obtener datos de flujo de los módulos
  async getFlujoModulos() {
    try {
      const [rows] = await this.localConnection.execute('SELECT * FROM modulos');
      return rows;
    } catch (error) {
      console.error('Error obteniendo flujo módulos:', error.message);
      return [];
    }
  }

  // Obtener estados de jaulas
  async getEstadosJaulas() {
    try {
      const [rows] = await this.localConnection.execute('CALL ObtenerEstadosJaulas()');
      return rows[0];
    } catch (error) {
      console.error('Error obteniendo estados:', error.message);
      return [];
    }
  }

  // Obtener registros para reportes
  async getRegistros(fechaInicio, fechaFin, jaula = '(Todos)') {
    try {
      let query = `SELECT id, idJaula as Jaula, 
                   DATE_FORMAT(FechaRegistro, '%d-%m-%Y') as Fecha, 
                   TIME_FORMAT(HoraRegistro, '%H:%i:%s') as Hora,
                   NivelOxigeno as Nivel, Estado, CantPeces, Flujo, Cliente
                   FROM registros WHERE FechaRegistro BETWEEN ? AND ?`;
      
      const params = [fechaInicio, fechaFin];
      
      if (jaula !== '(Todos)') {
        query += ' AND idJaula = ?';
        params.push(jaula);
      }
      
      query += ' ORDER BY FechaRegistro DESC';
      
      const [rows] = await this.localConnection.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error obteniendo registros:', error.message);
      return [];
    }
  }

  // Obtener registros de clientes
  async getRegistrosClientes(fechaInicio, fechaFin, cliente = '(Todos)') {
    try {
      let query = `SELECT reg.id, cli.Nombrecliente as Cliente, idJaula as Jaula,
                   DATE_FORMAT(HoraInicio, '%d-%m-%Y') as FechaInicio,
                   TIME_FORMAT(HoraInicio, '%H:%i:%s') as HoraInicio,
                   DATE_FORMAT(HoraTermino, '%d-%m-%Y') as FechaTermino,
                   TIME_FORMAT(HoraTermino, '%H:%i:%s') as HoraTermino,
                   NivelOxigenoInicio as OxigenoInicio,
                   NivelOxigenoTermino as OxigenoTermino,
                   Especie, CantPeces, reg.FlujoTotal
                   FROM registroclientes reg
                   LEFT JOIN cliente cli ON cli.id = reg.idCliente
                   WHERE NivelOxigenoTermino IS NOT NULL AND FechaRegistro BETWEEN ? AND ?`;
      
      const params = [fechaInicio, fechaFin];
      
      if (cliente !== '(Todos)') {
        query += ' AND cli.Nombrecliente = ?';
        params.push(cliente);
      }
      
      query += ' ORDER BY FechaRegistro DESC';
      
      const [rows] = await this.localConnection.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error obteniendo registros clientes:', error.message);
      return [];
    }
  }
}

module.exports = DatabaseService;

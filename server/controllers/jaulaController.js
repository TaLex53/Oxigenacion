const ModbusService = require('../services/modbusService');
const DatabaseService = require('../services/databaseService');
const EmailService = require('../services/emailService');

class JaulaController {
  constructor() {
    this.modbus = new ModbusService();
    this.db = new DatabaseService();
    this.email = new EmailService();
    
    // Arrays idénticos a tu código C# original
    this.IntModulo100 = new Array(20).fill(0);
    this.IntModulo200 = new Array(20).fill(0);
    this.Empresasmodulo100 = new Array(20).fill("-----");
    this.Empresasmodulo200 = new Array(20).fill("-----");
    this.BoolModulo100 = new Array(20).fill(0);
    this.BoolModulo200 = new Array(20).fill(0);
    this.EntregandoDatos100 = new Array(20).fill(0);
    this.EntregandoDatos200 = new Array(20).fill(0);
    this.Supervisor100 = new Array(20).fill("");
    this.Supervisor200 = new Array(20).fill("");
    this.Inyeccion100 = new Array(20).fill("");
    this.Inyeccion200 = new Array(20).fill("");
    this.MinimoModulo100 = new Array(20).fill(0);
    this.MinimoModulo200 = new Array(20).fill(0);
    this.MaximoModulo100 = new Array(20).fill(0);
    this.MaximoModulo200 = new Array(20).fill(0);
    this.Tiempo100 = new Array(20).fill(0);
    this.Tiempo200 = new Array(20).fill(0);
    this.Error100 = new Array(20).fill(0);
    this.Error200 = new Array(20).fill(0);
    
    // Arrays para optimizar logs (solo mostrar cuando cambien los valores)
    this.estadoAnteriorAPedido100 = new Array(20).fill('');
    this.estadoAnteriorAPedido200 = new Array(20).fill('');
    this.estadoAnteriorEvaluacion100 = new Array(20).fill('');
    this.estadoAnteriorEvaluacion200 = new Array(20).fill('');
    this.estadoAnteriorBoolModulo100 = new Array(20).fill('');
    this.estadoAnteriorBoolModulo200 = new Array(20).fill('');
    this.estadoAnteriorGetEstado = '';
    
    this.flujo100 = 0;
    this.flujo200 = 0;
    this.selectedJaula = 101;
    
    this.isRunning = false;
    this.processInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 10000; // 10 segundos
  }

  // Cargar datos de flujo desde el PLC
  async cargarDatosFlujo() {
    try {
      // Intentar conectar al PLC para obtener datos de flujo
      const connected = await this.modbus.connect();
      if (connected) {
        const data = await this.modbus.readJaulaData();
        if (data) {
          this.flujo100 = data.flujo100 || 0;
          this.flujo200 = data.flujo200 || 0;
          console.log(`Flujos obtenidos del PLC - Módulo 100: ${this.flujo100}, Módulo 200: ${this.flujo200}`);
        } else {
          console.log('No se pudieron obtener datos del PLC, usando valores por defecto');
          this.flujo100 = 0;
          this.flujo200 = 0;
        }
      } else {
        console.log('No se pudo conectar al PLC, usando valores por defecto');
        this.flujo100 = 0;
        this.flujo200 = 0;
      }
    } catch (error) {
      console.error('Error cargando datos de flujo del PLC:', error.message);
      // Mantener valores por defecto
      this.flujo100 = 0;
      this.flujo200 = 0;
    }
  }

  async initialize() {
    console.log('Inicializando controlador de jaulas...');
    
    // Conectar a base de datos
    const dbConnected = await this.db.connect();
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos');
      return false;
    }

    // Cargar datos de flujo desde la base de datos
    await this.cargarDatosFlujo();

    // Cargar configuración inicial
    await this.cargarConfiguracionInicial();
    
    // Conectar a PLC
    const plcConnected = await this.modbus.connect();
    if (plcConnected) {
      console.log('Conexión inicial exitosa con el PLC');
      this.reconnectAttempts = 0; // Resetear contador de reconexión
    } else {
      console.warn('⚠️ No se pudo conectar al PLC inicialmente, continuando sin conexión');
    }

    // Iniciar proceso principal
    this.iniciarProceso();
    
    console.log('Controlador de jaulas inicializado');
    return true;
  }

  async cargarConfiguracionInicial() {
    try {
      // Cargar límites de todas las jaulas
      for (let i = 0; i < 20; i++) {
        const limites100 = await this.db.getLimites(101 + i);
        const limites200 = await this.db.getLimites(201 + i);
        
        this.MinimoModulo100[i] = parseFloat(limites100.LimiteInferior) || 0;
        this.MaximoModulo100[i] = parseFloat(limites100.LimiteSuperior) || 0;
        this.MinimoModulo200[i] = parseFloat(limites200.LimiteInferior) || 0;
        this.MaximoModulo200[i] = parseFloat(limites200.LimiteSuperior) || 0;
      }

      // Cargar estados de jaulas
      const estados = await this.db.getEstadosJaulas();
      estados.forEach(estado => {
        const jaulaId = parseInt(estado.IdJaula);
        if (jaulaId <= 120) {
          const index = jaulaId - 101;
          this.Empresasmodulo100[index] = estado.Alias || "-----";
          this.BoolModulo100[index] = 1;
        } else if (jaulaId > 200) {
          const index = jaulaId - 201;
          this.Empresasmodulo200[index] = estado.Alias || "-----";
          this.BoolModulo200[index] = 1;
        }
      });

      // Cargar tipos de inyección desde la base de datos
      const tiposInyeccion = await this.db.getTiposInyeccion();
      console.log('Tipos de inyección cargados:', tiposInyeccion);
      
      Object.keys(tiposInyeccion).forEach(jaulaId => {
        const id = parseInt(jaulaId);
        const tipoInyeccion = this.getNombreInyeccion(tiposInyeccion[jaulaId]);
        console.log(`Jaula ${jaulaId}: ${tiposInyeccion[jaulaId]} -> ${tipoInyeccion}`);
        
        if (id <= 120) {
          const index = id - 101;
          this.Inyeccion100[index] = tipoInyeccion;
        } else if (id > 200) {
          const index = id - 201;
          this.Inyeccion200[index] = tipoInyeccion;
        }
      });
      
      console.log('Inyeccion100 cargado:', this.Inyeccion100.slice(0, 5));
      console.log('Inyeccion200 cargado:', this.Inyeccion200.slice(0, 5));

      console.log('Configuración inicial cargada');
    } catch (error) {
      console.error('Error cargando configuración inicial:', error.message);
    }
  }

  iniciarProceso() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.processInterval = setInterval(() => {
      this.proceso();
    }, 5000); // Ejecutar cada 5 segundos

    console.log('Proceso principal iniciado');
  }

  detenerProceso() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.isRunning = false;
    console.log('Proceso principal detenido');
  }

  // Función para manejar reconexión automática
  async manejarReconexion() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Máximo de intentos de reconexión alcanzado (${this.maxReconnectAttempts})`);
      return false;
    }

    this.reconnectAttempts++;
    console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

    try {
      const connected = await this.modbus.connect();
      if (connected) {
        console.log('Reconexión exitosa con el PLC');
        this.reconnectAttempts = 0; // Resetear contador
        return true;
      } else {
        console.log(`Falló reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error en reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}:`, error.message);
      return false;
    }
  }

  async proceso() {
    try {
      const cliente_conectado = this.modbus.getConnectionStatus();
      
      if (cliente_conectado) {
        const data = await this.modbus.readJaulaData();
        
        if (data) {
          // Procesar datos módulo 100
          for (let i = 0; i < 20; i++) {
            let valor = data.modulo100[i];
            
            // Aplicar la misma lógica de filtrado que en tu código C#
            if (valor < 2000) {
              valor = Math.random() * 1000 + 5000;
            } else if (valor > 14000) {
              valor = Math.random() * 3000 + 8000;
            }
            
            this.IntModulo100[i] = valor;
          }

          // Procesar datos módulo 200
          for (let i = 0; i < 20; i++) {
            let valor = data.modulo200[i];
            
            if (valor < 2000) {
              valor = Math.random() * 1000 + 5000;
            } else if (valor > 14000) {
              valor = Math.random() * 3000 + 8000;
            }
            
            this.IntModulo200[i] = valor;
          }

          // Actualizar flujos desde el PLC
          this.flujo100 = data.flujo100 || 0;
          this.flujo200 = data.flujo200 || 0;

          // Control automático
          await this.controlAutomatico();
          
          // Insertar datos en base de datos
          await this.insertarDatos();
          
          // Verificar alertas de tiempo
          this.verificarAlertas();
        }
      } else {
        // Sin conexión al PLC - intentar reconexión
        console.log('Sin conexión al PLC, intentando reconexión...');
        
        // Intentar reconectar
        const reconectado = await this.manejarReconexion();
        
        if (!reconectado) {
          // Si no se pudo reconectar, establecer valores en 0
          console.log('No se pudo reconectar, estableciendo valores en 0');
          
          // Establecer todos los valores en 0
          for (let i = 0; i < 20; i++) {
            this.IntModulo100[i] = 0;
            this.IntModulo200[i] = 0;
          }
          
          this.flujo100 = 0;
          this.flujo200 = 0;
          
          // Log de válvulas que permanecen activas en modo "A Pedido"
          for (let i = 0; i < 20; i++) {
            if (this.EntregandoDatos100[i] === 1 && this.Inyeccion100[i] === "A Pedido") {
              console.log(`MANTENIENDO VÁLVULA ${101 + i} ACTIVA (A Pedido - Sin conexión PLC)`);
            }
            if (this.EntregandoDatos200[i] === 1 && this.Inyeccion200[i] === "A Pedido") {
              console.log(`MANTENIENDO VÁLVULA ${201 + i} ACTIVA (A Pedido - Sin conexión PLC)`);
            }
          }
        } else {
          // Si se reconectó exitosamente, cargar parámetros
          console.log('Reconexión exitosa, cargando parámetros...');
          await this.cargarConfiguracionInicial();
        }
      }

      // Actualizar niveles de tanque
      await this.db.insertarNivelTanque(this.flujo100, this.flujo200);
      
    } catch (error) {
      console.error('Error en proceso principal:', error.message);
      
      // En caso de error, intentar reconexión
      console.log('Error detectado, intentando reconexión...');
      await this.manejarReconexion();
    }
  }

  async controlAutomatico() {
    for (let i = 0; i < 20; i++) {
      // Módulo 100
      const nivel100 = this.IntModulo100[i] / 1000;
      
      // Verificar si es inyección "A Pedido"
      const esInyeccionAPedido = this.Inyeccion100[i] === "A Pedido";
      
      // Para inyección "A Pedido": control completamente manual
      if (esInyeccionAPedido && this.BoolModulo100[i] === 1) {
        if (this.EntregandoDatos100[i] === 1) {
          // Mantener inyección activa - control manual (solo log si cambió el estado)
          if (this.estadoAnteriorAPedido100[i] !== 'manteniendo') {
            console.log(`MANTENIENDO INYECCIÓN MANUAL - JAULA ${101 + i} (A Pedido)`);
            console.log(`   Estado: BoolModulo=${this.BoolModulo100[i]}, EntregandoDatos=${this.EntregandoDatos100[i]}`);
            console.log(`   Límites: ${this.MinimoModulo100[i]}-${this.MaximoModulo100[i]} mg/L`);
            console.log(`   Nivel: ${nivel100.toFixed(1)} mg/L`);
            console.log(`   Timestamp: ${new Date().toISOString()}`);
            this.estadoAnteriorAPedido100[i] = 'manteniendo';
          }
        } else {
          // Reactivar inyección si se detuvo (solo log si cambió el estado)
          if (this.estadoAnteriorAPedido100[i] !== 'cerrado_inesperado') {
            console.log(`DETECTADO CIERRE INESPERADO - JAULA ${101 + i} (A Pedido)`);
            console.log(`   Estado: BoolModulo=${this.BoolModulo100[i]}, EntregandoDatos=${this.EntregandoDatos100[i]}`);
            console.log(`   Límites: ${this.MinimoModulo100[i]}-${this.MaximoModulo100[i]} mg/L`);
            console.log(`   Nivel: ${nivel100.toFixed(1)} mg/L`);
            console.log(`   Timestamp: ${new Date().toISOString()}`);
            this.estadoAnteriorAPedido100[i] = 'cerrado_inesperado';
          }
          const success = await this.modbus.controlValve(101 + i, true);
          if (success) {
            this.EntregandoDatos100[i] = 1;
            if (this.estadoAnteriorAPedido100[i] !== 'reactivado') {
              console.log(`REACTIVANDO INYECCIÓN MANUAL - JAULA ${101 + i} (A Pedido)`);
              console.log(`   Nivel actual: ${nivel100.toFixed(1)} mg/L`);
              console.log(`   Control: Manual (A Pedido)`);
              console.log(`   Timestamp: ${new Date().toISOString()}`);
              this.estadoAnteriorAPedido100[i] = 'reactivado';
            }
          } else {
            if (this.estadoAnteriorAPedido100[i] !== 'error_reactivacion') {
              console.log(`ERROR REACTIVANDO VÁLVULA ${101 + i} (A Pedido)`);
              console.log(`   Timestamp: ${new Date().toISOString()}`);
              this.estadoAnteriorAPedido100[i] = 'error_reactivacion';
            }
          }
        }
      }
      // Para modo normal: activar solo si el nivel está por debajo del mínimo
      else if (!esInyeccionAPedido && nivel100 <= this.MinimoModulo100[i] && 
          this.BoolModulo100[i] === 1 && 
          this.EntregandoDatos100[i] === 0) {
        
        const success = await this.modbus.controlValve(101 + i, true);
        if (success) {
          this.EntregandoDatos100[i] = 1;
          
          // Log detallado de inyección de oxígeno
          console.log(`INYECCIÓN DE OXÍGENO INICIADA - JAULA ${101 + i}`);
          console.log(`   Parámetros:`);
          console.log(`   - Cliente: ${this.Empresasmodulo100[i] || '-----'}`);
          console.log(`   - Supervisor: ${this.Supervisor100[i] || '-----'}`);
          console.log(`   - Nivel actual: ${nivel100.toFixed(1)} mg/L`);
          console.log(`   - Mínimo: ${this.MinimoModulo100[i].toFixed(1)} mg/L`);
          console.log(`   - Máximo: ${this.MaximoModulo100[i].toFixed(1)} mg/L`);
          console.log(`   - Tipo inyección: ${this.Inyeccion100[i] || 'Normal'}`);
          console.log(`   - Flujo: ${this.flujo100} m³/h`);
          console.log(`   - Timestamp: ${new Date().toISOString()}`);
          
          // Registrar proceso de cliente
          await this.db.procesoCliente(
            this.Supervisor100[i],
            this.Empresasmodulo100[i],
            101 + i,
            this.flujo100,
            this.MinimoModulo100[i].toFixed(1),
            this.getTipoInyeccion(this.Inyeccion100[i])
          );
        }
      }
      
      // Log para detectar si se está evaluando cierre automático (solo si cambió el estado)
      if (this.BoolModulo100[i] === 1 && this.EntregandoDatos100[i] === 1) {
        const estadoActual = `${nivel100.toFixed(1)}_${this.MaximoModulo100[i].toFixed(1)}_${this.MinimoModulo100[i].toFixed(1)}_${esInyeccionAPedido}`;
        if (this.estadoAnteriorEvaluacion100[i] !== estadoActual) {
          console.log(`EVALUANDO POSIBLE CIERRE - JAULA ${101 + i}`);
          console.log(`   Nivel: ${nivel100.toFixed(1)} mg/L`);
          console.log(`   Máximo: ${this.MaximoModulo100[i].toFixed(1)} mg/L`);
          console.log(`   Mínimo: ${this.MinimoModulo100[i].toFixed(1)} mg/L`);
          console.log(`   Inyección: ${this.Inyeccion100[i]}`);
          console.log(`   Es A Pedido: ${esInyeccionAPedido}`);
          console.log(`   Condición cierre: nivel > max = ${nivel100 > this.MaximoModulo100[i]}`);
          console.log(`   Condición min != max = ${this.MinimoModulo100[i] !== this.MaximoModulo100[i]}`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
          this.estadoAnteriorEvaluacion100[i] = estadoActual;
        }
      }
      
      // Log para detectar cambios en BoolModulo para "A Pedido" (solo si cambió el estado)
      if (esInyeccionAPedido) {
        const estadoBoolModulo = `${this.BoolModulo100[i]}_${this.EntregandoDatos100[i]}`;
        if (this.estadoAnteriorBoolModulo100[i] !== estadoBoolModulo) {
          console.log(`ESTADO BOOLMODULO - JAULA ${101 + i} (A Pedido)`);
          console.log(`   BoolModulo: ${this.BoolModulo100[i]}`);
          console.log(`   EntregandoDatos: ${this.EntregandoDatos100[i]}`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
          this.estadoAnteriorBoolModulo100[i] = estadoBoolModulo;
        }
        
        // Log adicional para detectar si BoolModulo cambia a 0 (cierre inesperado)
        if (this.BoolModulo100[i] === 0 && this.estadoAnteriorBoolModulo100[i].includes('1_')) {
          console.log(`ALERTA: BoolModulo cambió a 0 - JAULA ${101 + i} (A Pedido)`);
          console.log(`   Estado anterior: ${this.estadoAnteriorBoolModulo100[i]}`);
          console.log(`   Estado actual: ${estadoBoolModulo}`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
        }
        
        // Log para detectar si EntregandoDatos cambia a 0 (cierre inesperado)
        if (this.EntregandoDatos100[i] === 0 && this.estadoAnteriorBoolModulo100[i].includes('_1')) {
          console.log(`ALERTA: EntregandoDatos cambió a 0 - JAULA ${101 + i} (A Pedido)`);
          console.log(`   Estado anterior: ${this.estadoAnteriorBoolModulo100[i]}`);
          console.log(`   Estado actual: ${estadoBoolModulo}`);
          console.log(`   BoolModulo: ${this.BoolModulo100[i]}`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
        }
      }
      
      // Log para detectar si se está ejecutando cierre automático (solo para "A Pedido")
      if (esInyeccionAPedido && nivel100 > this.MaximoModulo100[i] && 
          this.BoolModulo100[i] === 1 && 
          this.EntregandoDatos100[i] === 1) {
        console.log(`ALERTA: Se detectó condición de cierre automático para "A Pedido" - JAULA ${101 + i}`);
        console.log(`   Nivel: ${nivel100.toFixed(1)} mg/L`);
        console.log(`   Máximo: ${this.MaximoModulo100[i].toFixed(1)} mg/L`);
        console.log(`   Mínimo: ${this.MinimoModulo100[i].toFixed(1)} mg/L`);
        console.log(`   BoolModulo: ${this.BoolModulo100[i]}`);
        console.log(`   EntregandoDatos: ${this.EntregandoDatos100[i]}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
      }
      
      // Log para detectar si se está ejecutando cierre automático (solo para "A Pedido")
      if (esInyeccionAPedido && nivel100 > this.MaximoModulo100[i] && 
          this.BoolModulo100[i] === 1 && 
          this.EntregandoDatos100[i] === 1) {
        console.log(`ALERTA: Se detectó condición de cierre automático para "A Pedido" - JAULA ${101 + i}`);
        console.log(`   Nivel: ${nivel100.toFixed(1)} mg/L`);
        console.log(`   Máximo: ${this.MaximoModulo100[i].toFixed(1)} mg/L`);
        console.log(`   Mínimo: ${this.MinimoModulo100[i].toFixed(1)} mg/L`);
        console.log(`   BoolModulo: ${this.BoolModulo100[i]}`);
        console.log(`   EntregandoDatos: ${this.EntregandoDatos100[i]}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
      }
      
      // Log para detectar si el PLC está cerrando la válvula directamente
      if (esInyeccionAPedido && this.BoolModulo100[i] === 0 && this.EntregandoDatos100[i] === 0) {
        console.log(`ALERTA: PLC cerró válvula directamente - JAULA ${101 + i} (A Pedido)`);
        console.log(`   BoolModulo: ${this.BoolModulo100[i]}`);
        console.log(`   EntregandoDatos: ${this.EntregandoDatos100[i]}`);
        console.log(`   Nivel: ${nivel100.toFixed(1)} mg/L`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        
        // Solo reactivar si el estado anterior era activo (no fue cierre manual)
        if (this.estadoAnteriorBoolModulo100[i].includes('1_1') && this.estadoAnteriorBoolModulo100[i] !== 'cerrado_manual') {
          console.log(`REACTIVANDO VÁLVULA CERRADA POR PLC - JAULA ${101 + i} (A Pedido)`);
          const success = await this.modbus.controlValve(101 + i, true);
          if (success) {
            this.BoolModulo100[i] = 1;
            this.EntregandoDatos100[i] = 1;
            console.log(`Válvula reactivada exitosamente - JAULA ${101 + i} (A Pedido)`);
          } else {
            console.log(`Error reactivando válvula - JAULA ${101 + i} (A Pedido)`);
          }
        } else {
          console.log(`Cierre manual detectado - No reactivando - JAULA ${101 + i} (A Pedido)`);
        }
      }
      
      // Solo cerrar automáticamente si min != max (control automático normal)
      // Si es "A Pedido", mantener abierto hasta cierre manual
      // Para valores exactos (5.5-5.5), NO cerrar automáticamente, solo oscilar
      // Para rangos (9.9-10), cerrar cuando alcance el máximo
      const esValorExacto = Math.abs(this.MinimoModulo100[i] - this.MaximoModulo100[i]) < 0.1; // Tolerancia de 0.1 mg/L
      const esRango = Math.abs(this.MinimoModulo100[i] - this.MaximoModulo100[i]) >= 0.1; // Es un rango real
      const debeCerrar = esRango ? nivel100 >= this.MaximoModulo100[i] : false; // Solo cerrar si es rango
      
      if (debeCerrar && 
          this.BoolModulo100[i] === 1 && 
          this.EntregandoDatos100[i] === 1 &&
          this.MinimoModulo100[i] !== this.MaximoModulo100[i] &&
          !esInyeccionAPedido) {
        
        console.log(`EVALUANDO CIERRE AUTOMÁTICO - JAULA ${101 + i}`);
        console.log(`   Nivel: ${nivel100.toFixed(1)} mg/L`);
        console.log(`   Máximo: ${this.MaximoModulo100[i].toFixed(1)} mg/L`);
        console.log(`   Mínimo: ${this.MinimoModulo100[i].toFixed(1)} mg/L`);
        console.log(`   Inyección: ${this.Inyeccion100[i]}`);
        console.log(`   Es A Pedido: ${esInyeccionAPedido}`);
        console.log(`   Es Valor Exacto: ${esValorExacto}`);
        console.log(`   Es Rango: ${esRango}`);
        console.log(`   Condición cierre: ${esRango ? 'nivel >= max (rango)' : 'NO cerrar (valor exacto)'} = ${debeCerrar}`);
        
        const success = await this.modbus.controlValve(101 + i, false);
        if (success) {
          this.EntregandoDatos100[i] = 0;
          
          // Log detallado de cierre de inyección
          console.log(`INYECCIÓN DE OXÍGENO CERRADA - JAULA ${101 + i}`);
          console.log(`   Parámetros:`);
          console.log(`   - Cliente: ${this.Empresasmodulo100[i] || '-----'}`);
          console.log(`   - Supervisor: ${this.Supervisor100[i] || '-----'}`);
          console.log(`   - Nivel actual: ${nivel100.toFixed(1)} mg/L`);
          console.log(`   - Máximo alcanzado: ${this.MaximoModulo100[i].toFixed(1)} mg/L`);
          console.log(`   - Flujo: ${this.flujo100} m³/h`);
          console.log(`   - Timestamp: ${new Date().toISOString()}`);
          
          // Registrar cierre de proceso
          await this.db.procesoClienteCierre(
            this.Supervisor100[i],
            this.Empresasmodulo100[i],
            101 + i,
            this.flujo100,
            this.MaximoModulo100[i].toFixed(1)
          );
          this.Tiempo100[i] = 0;
        }
      }

      // Módulo 200 (misma lógica)
      const nivel200 = this.IntModulo200[i] / 1000;
      
      // Verificar si es inyección "A Pedido"
      const esInyeccionAPedido200 = this.Inyeccion200[i] === "A Pedido";
      
      // Para inyección "A Pedido": control completamente manual
      if (esInyeccionAPedido200 && this.BoolModulo200[i] === 1) {
        if (this.EntregandoDatos200[i] === 1) {
          // Mantener inyección activa - control manual (solo log si cambió el estado)
          if (this.estadoAnteriorAPedido200[i] !== 'manteniendo') {
            console.log(`MANTENIENDO INYECCIÓN MANUAL - JAULA ${201 + i} (A Pedido)`);
            console.log(`   Estado: BoolModulo=${this.BoolModulo200[i]}, EntregandoDatos=${this.EntregandoDatos200[i]}`);
            console.log(`   Límites: ${this.MinimoModulo200[i]}-${this.MaximoModulo200[i]} mg/L`);
            console.log(`   Nivel: ${nivel200.toFixed(1)} mg/L`);
            console.log(`   Timestamp: ${new Date().toISOString()}`);
            this.estadoAnteriorAPedido200[i] = 'manteniendo';
          }
        } else {
          // Reactivar inyección si se detuvo (solo log si cambió el estado)
          if (this.estadoAnteriorAPedido200[i] !== 'cerrado_inesperado') {
            console.log(`DETECTADO CIERRE INESPERADO - JAULA ${201 + i} (A Pedido)`);
            console.log(`   Estado: BoolModulo=${this.BoolModulo200[i]}, EntregandoDatos=${this.EntregandoDatos200[i]}`);
            console.log(`   Límites: ${this.MinimoModulo200[i]}-${this.MaximoModulo200[i]} mg/L`);
            console.log(`   Nivel: ${nivel200.toFixed(1)} mg/L`);
            console.log(`   Timestamp: ${new Date().toISOString()}`);
            this.estadoAnteriorAPedido200[i] = 'cerrado_inesperado';
          }
          const success = await this.modbus.controlValve(201 + i, true);
          if (success) {
            this.EntregandoDatos200[i] = 1;
            if (this.estadoAnteriorAPedido200[i] !== 'reactivado') {
              console.log(`REACTIVANDO INYECCIÓN MANUAL - JAULA ${201 + i} (A Pedido)`);
              console.log(`   Nivel actual: ${nivel200.toFixed(1)} mg/L`);
              console.log(`   Control: Manual (A Pedido)`);
              console.log(`   Timestamp: ${new Date().toISOString()}`);
              this.estadoAnteriorAPedido200[i] = 'reactivado';
            }
          } else {
            if (this.estadoAnteriorAPedido200[i] !== 'error_reactivacion') {
              console.log(`ERROR REACTIVANDO VÁLVULA ${201 + i} (A Pedido)`);
              console.log(`   Timestamp: ${new Date().toISOString()}`);
              this.estadoAnteriorAPedido200[i] = 'error_reactivacion';
            }
          }
        }
      }
      // Para modo normal: activar solo si el nivel está por debajo del mínimo
      else if (!esInyeccionAPedido200 && nivel200 <= this.MinimoModulo200[i] && 
          this.BoolModulo200[i] === 1 && 
          this.EntregandoDatos200[i] === 0) {
        
        const success = await this.modbus.controlValve(201 + i, true);
        if (success) {
          this.EntregandoDatos200[i] = 1;
          
          // Log detallado de inyección de oxígeno
      console.log(`INYECCIÓN DE OXÍGENO INICIADA - JAULA ${201 + i}`);
      console.log(`   Parámetros:`);
      console.log(`   - Cliente: ${this.Empresasmodulo200[i] || '-----'}`);
      console.log(`   - Supervisor: ${this.Supervisor200[i] || '-----'}`);
      console.log(`   - Nivel actual: ${nivel200.toFixed(1)} mg/L`);
      console.log(`   - Mínimo: ${this.MinimoModulo200[i].toFixed(1)} mg/L`);
      console.log(`   - Máximo: ${this.MaximoModulo200[i].toFixed(1)} mg/L`);
      console.log(`   - Tipo inyección: ${this.Inyeccion200[i] || 'Normal'}`);
      console.log(`   - Flujo: ${this.flujo200} m³/h`);
      console.log(`   - Timestamp: ${new Date().toISOString()}`);
          
          await this.db.procesoCliente(
            this.Supervisor200[i],
            this.Empresasmodulo200[i],
            201 + i,
            this.flujo200,
            this.MinimoModulo200[i].toFixed(1),
            this.getTipoInyeccion(this.Inyeccion200[i])
          );
        }
      }

      // Solo cerrar automáticamente si min != max (control automático normal)
      // Si es "A Pedido", mantener abierto hasta cierre manual
      // Para valores exactos (5.5-5.5), NO cerrar automáticamente, solo oscilar
      // Para rangos (9.9-10), cerrar cuando alcance el máximo
      const esValorExacto200 = Math.abs(this.MinimoModulo200[i] - this.MaximoModulo200[i]) < 0.1; // Tolerancia de 0.1 mg/L
      const esRango200 = Math.abs(this.MinimoModulo200[i] - this.MaximoModulo200[i]) >= 0.1; // Es un rango real
      const debeCerrar200 = esRango200 ? nivel200 >= this.MaximoModulo200[i] : false; // Solo cerrar si es rango
      
      if (debeCerrar200 && 
          this.BoolModulo200[i] === 1 && 
          this.EntregandoDatos200[i] === 1 &&
          this.MinimoModulo200[i] !== this.MaximoModulo200[i] &&
          !esInyeccionAPedido200) {
        
        console.log(`EVALUANDO CIERRE AUTOMÁTICO - JAULA ${201 + i}`);
        console.log(`   Nivel: ${nivel200.toFixed(1)} mg/L`);
        console.log(`   Máximo: ${this.MaximoModulo200[i].toFixed(1)} mg/L`);
        console.log(`   Mínimo: ${this.MinimoModulo200[i].toFixed(1)} mg/L`);
        console.log(`   Inyección: ${this.Inyeccion200[i]}`);
        console.log(`   Es A Pedido: ${esInyeccionAPedido200}`);
        console.log(`   Es Valor Exacto: ${esValorExacto200}`);
        console.log(`   Es Rango: ${esRango200}`);
        console.log(`   Condición cierre: ${esRango200 ? 'nivel >= max (rango)' : 'NO cerrar (valor exacto)'} = ${debeCerrar200}`);
        
        const success = await this.modbus.controlValve(201 + i, false);
        if (success) {
          this.EntregandoDatos200[i] = 0;
          
          // Log detallado de cierre de inyección
          console.log(`INYECCIÓN DE OXÍGENO CERRADA - JAULA ${201 + i}`);
          console.log(`   Parámetros:`);
          console.log(`   - Cliente: ${this.Empresasmodulo200[i] || '-----'}`);
          console.log(`   - Supervisor: ${this.Supervisor200[i] || '-----'}`);
          console.log(`   - Nivel actual: ${nivel200.toFixed(1)} mg/L`);
          console.log(`   - Máximo alcanzado: ${this.MaximoModulo200[i].toFixed(1)} mg/L`);
          console.log(`   - Flujo: ${this.flujo200} m³/h`);
          console.log(`   - Timestamp: ${new Date().toISOString()}`);
          
          await this.db.procesoClienteCierre(
            this.Supervisor200[i],
            this.Empresasmodulo200[i],
            201 + i,
            this.flujo200,
            this.MaximoModulo200[i].toFixed(1)
          );
          this.Tiempo200[i] = 0;
        }
      }
      
      // Log para detectar si el PLC está cerrando la válvula directamente (Módulo 200)
      if (esInyeccionAPedido200 && this.BoolModulo200[i] === 0 && this.EntregandoDatos200[i] === 0) {
        console.log(`ALERTA: PLC cerró válvula directamente - JAULA ${201 + i} (A Pedido)`);
        console.log(`   BoolModulo: ${this.BoolModulo200[i]}`);
        console.log(`   EntregandoDatos: ${this.EntregandoDatos200[i]}`);
        console.log(`   Nivel: ${nivel200.toFixed(1)} mg/L`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        
        // Solo reactivar si el estado anterior era activo (no fue cierre manual)
        if (this.estadoAnteriorBoolModulo200[i].includes('1_1') && this.estadoAnteriorBoolModulo200[i] !== 'cerrado_manual') {
          console.log(`REACTIVANDO VÁLVULA CERRADA POR PLC - JAULA ${201 + i} (A Pedido)`);
          const success = await this.modbus.controlValve(201 + i, true);
          if (success) {
            this.BoolModulo200[i] = 1;
            this.EntregandoDatos200[i] = 1;
            console.log(`Válvula reactivada exitosamente - JAULA ${201 + i} (A Pedido)`);
          } else {
            console.log(`Error reactivando válvula - JAULA ${201 + i} (A Pedido)`);
          }
        } else {
          console.log(`Cierre manual detectado - No reactivando - JAULA ${201 + i} (A Pedido)`);
        }
      }
    }
  }

  async insertarDatos() {
    for (let i = 0; i < 20; i++) {
      // Insertar datos módulo 100
      await this.db.insertarRegistro(
        101 + i,
        (this.IntModulo100[i] / 1000).toFixed(1),
        this.BoolModulo100[i] === 1 ? "Abierto" : "Cerrado",
        this.Empresasmodulo100[i],
        this.flujo100,
        this.getTipoInyeccion(this.Inyeccion100[i]),
        this.EntregandoDatos100[i]
      );

      // Insertar datos módulo 200
      await this.db.insertarRegistro(
        201 + i,
        (this.IntModulo200[i] / 1000).toFixed(1),
        this.BoolModulo200[i] === 1 ? "Abierto" : "Cerrado",
        this.Empresasmodulo200[i],
        this.flujo200,
        this.getTipoInyeccion(this.Inyeccion200[i]),
        this.EntregandoDatos200[i]
      );
    }
  }

  verificarAlertas() {
    for (let i = 0; i < 20; i++) {
      // Actualizar tiempos
      if (this.EntregandoDatos100[i] === 1) {
        this.Tiempo100[i] += 5000; // 5 segundos en ms (intervalo del proceso)
      } else {
        this.Tiempo100[i] = 0;
        this.Error100[i] = 0;
      }

      if (this.EntregandoDatos200[i] === 1) {
        this.Tiempo200[i] += 5000; // 5 segundos en ms (intervalo del proceso)
      } else {
        this.Tiempo200[i] = 0;
        this.Error200[i] = 0;
      }

      // Verificar alertas módulo 100
      this.verificarAlertaJaula(i, 100, this.Tiempo100, this.Error100, this.Supervisor100, this.Empresasmodulo100);
      
      // Verificar alertas módulo 200
      this.verificarAlertaJaula(i, 200, this.Tiempo200, this.Error200, this.Supervisor200, this.Empresasmodulo200);
    }
  }

  verificarAlertaJaula(index, modulo, tiempos, errores, supervisores, empresas) {
    const tiempo = tiempos[index];
    const error = errores[index];
    const supervisor = supervisores[index];
    const empresa = empresas[index];

    if (tiempo > 1800000 && supervisor !== "" && error === 0) { // 30 min
      errores[index] = 1;
      this.enviarAlerta(empresa, index + 1, modulo, 30);
    } else if (tiempo > 3600000 && supervisor !== "" && error === 1) { // 1 hora
      errores[index] = 2;
      this.enviarAlerta(empresa, index + 1, modulo, 60);
    } else if (tiempo > 5400000 && supervisor !== "" && error === 2) { // 1.5 horas
      errores[index] = 3;
      this.enviarAlerta(empresa, index + 1, modulo, 90);
    } else if (tiempo > 7200000 && supervisor !== "" && error === 3) { // 2 horas
      errores[index] = 4;
      this.enviarAlerta(empresa, index + 1, modulo, 120);
    }
  }

  async enviarAlerta(empresa, jaula, modulo, tiempo) {
    try {
      await this.email.sendAlert(jaula, modulo, tiempo, empresa);
      console.log(`Alerta enviada: Jaula ${jaula} (${tiempo} min)`);
    } catch (error) {
      console.error('Error enviando alerta:', error.message);
    }
  }

  getTipoInyeccion(tipo) {
    switch (tipo) {
      case "Normal": return 1;
      case "Pruebas": return 2;
      case "A Pedido": return 3;
      default: return 1;
    }
  }

  // Mapear número de tipo de inyección a nombre
  getNombreInyeccion(tipo) {
    switch (tipo) {
      case 1: return "Normal";
      case 2: return "Pruebas";
      case 3: return "A Pedido";
      default: return "Normal";
    }
  }

  // Métodos para API
  getEstadoJaulas() {
    const estado = {
      modulo100: {
        niveles: this.IntModulo100.map(n => (n / 1000).toFixed(1)),
        empresas: this.Empresasmodulo100,
        activas: this.BoolModulo100,
        CantPeces: this.EntregandoDatos100,
        supervisores: this.Supervisor100,
        inyeccion: this.Inyeccion100
      },
      modulo200: {
        niveles: this.IntModulo200.map(n => (n / 1000).toFixed(1)),
        empresas: this.Empresasmodulo200,
        activas: this.BoolModulo200,
        CantPeces: this.EntregandoDatos200,
        supervisores: this.Supervisor200,
        inyeccion: this.Inyeccion200
      },
      flujos: {
        flujo100: this.flujo100,
        flujo200: this.flujo200
      },
      conexion: this.modbus.getConnectionStatus()
    };
    
    // Debug: mostrar algunos valores (solo si cambiaron)
    const estadoActual = JSON.stringify({
      niveles100: estado.modulo100.niveles.slice(0, 3),
      niveles200: estado.modulo200.niveles.slice(0, 3),
      conexion: estado.conexion,
      cantPeces: estado.modulo100.CantPeces.slice(0, 5),
      empresas: estado.modulo100.empresas.slice(0, 5),
      jaula113: { cantPeces: estado.modulo100.CantPeces[12], empresa: estado.modulo100.empresas[12] }
    });
    
    if (this.estadoAnteriorGetEstado !== estadoActual) {
      console.log('Estado jaulas - Módulo 100 primeros 3:', estado.modulo100.niveles.slice(0, 3));
      console.log('Estado jaulas - Módulo 200 primeros 3:', estado.modulo200.niveles.slice(0, 3));
      console.log('Estado jaulas - Conexión PLC:', estado.conexion);
      console.log('Estado jaulas - CantPeces 100:', estado.modulo100.CantPeces.slice(0, 5));
      console.log('Estado jaulas - Empresas 100:', estado.modulo100.empresas.slice(0, 5));
      console.log('Estado jaulas - Jaula 113 CantPeces:', estado.modulo100.CantPeces[12]); // Índice 12 = jaula 113
      console.log('Estado jaulas - Jaula 113 Empresa:', estado.modulo100.empresas[12]);
      this.estadoAnteriorGetEstado = estadoActual;
    }
    
    return estado;
  }

  async controlarJaula(jaulaId, action, supervisor, cliente, inyeccion, minimo, maximo) {
    try {
      const success = await this.modbus.controlValve(jaulaId, action === 'abrir');
      
      if (success) {
        const index = jaulaId < 130 ? jaulaId - 101 : jaulaId - 201;
        
        if (jaulaId < 130) {
          this.BoolModulo100[index] = action === 'abrir' ? 1 : 0;
          this.Supervisor100[index] = supervisor || "";
          this.Empresasmodulo100[index] = cliente || "-----";
          this.Inyeccion100[index] = inyeccion || "Normal";
          
          // Actualizar límites si se proporcionan
          if (minimo !== undefined && maximo !== undefined) {
            this.MinimoModulo100[index] = parseFloat(minimo);
            this.MaximoModulo100[index] = parseFloat(maximo);
            console.log(`Límites actualizados para jaula ${jaulaId}: ${minimo}-${maximo} mg/L`);
          }
          
          // Para inyección "A Pedido", establecer límites que no causen cierre automático
          if (inyeccion === "A Pedido") {
            this.MinimoModulo100[index] = 0;
            this.MaximoModulo100[index] = 999; // Valor muy alto para evitar cierre automático
            console.log(`Límites configurados para "A Pedido" - Jaula ${jaulaId}: ${this.MinimoModulo100[index]}-${this.MaximoModulo100[index]} mg/L`);
          }
          
          // Si se abre la válvula, activar inyección
          if (action === 'abrir') {
            this.EntregandoDatos100[index] = 1;
            console.log(`INYECCIÓN MANUAL INICIADA - JAULA ${jaulaId}`);
            console.log(`   Cliente: ${cliente || '-----'}`);
            console.log(`   Supervisor: ${supervisor || '-----'}`);
            console.log(`   Tipo inyección: ${inyeccion || 'Normal'}`);
            console.log(`   Límites: ${this.MinimoModulo100[index]}-${this.MaximoModulo100[index]} mg/L`);
          } else {
            this.EntregandoDatos100[index] = 0;
            // Marcar como cerrado manualmente para evitar reactivación automática
            this.estadoAnteriorBoolModulo100[index] = 'cerrado_manual';
            console.log(`INYECCIÓN MANUAL CERRADA - JAULA ${jaulaId}`);
          }
        } else {
          this.BoolModulo200[index] = action === 'abrir' ? 1 : 0;
          this.Supervisor200[index] = supervisor || "";
          this.Empresasmodulo200[index] = cliente || "-----";
          this.Inyeccion200[index] = inyeccion || "Normal";
          
          // Actualizar límites si se proporcionan
          if (minimo !== undefined && maximo !== undefined) {
            this.MinimoModulo200[index] = parseFloat(minimo);
            this.MaximoModulo200[index] = parseFloat(maximo);
            console.log(`Límites actualizados para jaula ${jaulaId}: ${minimo}-${maximo} mg/L`);
          }
          
          // Para inyección "A Pedido", establecer límites que no causen cierre automático
          if (inyeccion === "A Pedido") {
            this.MinimoModulo200[index] = 0;
            this.MaximoModulo200[index] = 999; // Valor muy alto para evitar cierre automático
            console.log(`Límites configurados para "A Pedido" - Jaula ${jaulaId}: ${this.MinimoModulo200[index]}-${this.MaximoModulo200[index]} mg/L`);
          }
          
          // Si se abre la válvula, activar inyección
          if (action === 'abrir') {
            this.EntregandoDatos200[index] = 1;
            console.log(`INYECCIÓN MANUAL INICIADA - JAULA ${jaulaId}`);
            console.log(`   Cliente: ${cliente || '-----'}`);
            console.log(`   Supervisor: ${supervisor || '-----'}`);
            console.log(`   Tipo inyección: ${inyeccion || 'Normal'}`);
            console.log(`   Límites: ${this.MinimoModulo200[index]}-${this.MaximoModulo200[index]} mg/L`);
          } else {
            this.EntregandoDatos200[index] = 0;
            // Marcar como cerrado manualmente para evitar reactivación automática
            this.estadoAnteriorBoolModulo200[index] = 'cerrado_manual';
            console.log(`INYECCIÓN MANUAL CERRADA - JAULA ${jaulaId}`);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error controlando jaula:', error.message);
      return false;
    }
  }

  async cerrarTodasLasValvulas() {
    try {
      const success = await this.modbus.closeAllValves();
      
      if (success) {
        // Resetear estados
        this.BoolModulo100.fill(0);
        this.BoolModulo200.fill(0);
        this.EntregandoDatos100.fill(0);
        this.EntregandoDatos200.fill(0);
        this.Tiempo100.fill(0);
        this.Tiempo200.fill(0);
        this.Error100.fill(0);
        this.Error200.fill(0);
      }
      
      return success;
    } catch (error) {
      console.error('Error cerrando válvulas:', error.message);
      return false;
    }
  }

  async shutdown() {
    console.log('Cerrando controlador de jaulas...');
    this.detenerProceso();
    await this.modbus.disconnect();
    await this.db.disconnect();
    console.log('Controlador cerrado');
  }
}

module.exports = JaulaController;

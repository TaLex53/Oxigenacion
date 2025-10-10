const ModbusRTU = require('modbus-serial');
const config = require('../config');

class ModbusService {
  constructor() {
    this.client = new ModbusRTU();
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  async connect() {
    try {
      if (this.isConnected) {
        return true;
      }

      await this.client.connectTCP(config.PLC_IP, { port: config.PLC_PORT });
      this.client.setID(1); // ID del dispositivo Modbus
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log(`Conectado al PLC en ${config.PLC_IP}:${config.PLC_PORT}`);
      return true;
    } catch (error) {
      this.connectionAttempts++;
      
      // Solo mostrar error en el primer intento para evitar spam de logs
      if (this.connectionAttempts === 1) {
        console.error(`❌ Error de conexión Modbus (intento ${this.connectionAttempts}):`, error.message);
        console.log(`Verificar que el PLC tenga Modbus TCP habilitado en puerto ${config.PLC_PORT}`);
      }
      
      if (this.connectionAttempts < this.maxRetries) {
        // Solo mostrar mensaje de reintento en el primer intento
        if (this.connectionAttempts === 1) {
          console.log(`Reintentando conexión en 5 segundos...`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.connect();
      }
      
      this.isConnected = false;
      // Solo mostrar mensaje final una vez
      if (this.connectionAttempts === this.maxRetries) {
        console.log(`No se pudo conectar al PLC después de ${this.maxRetries} intentos. Continuando sin conexión Modbus.`);
      }
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await this.client.close();
        this.isConnected = false;
        console.log('Desconectado del PLC');
      }
    } catch (error) {
      console.error('Error al desconectar:', error.message);
    }
  }

  async readJaulaData() {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) return null;
    }

    try {
      // Leer módulo 100 (registros 3001-3023) - 23 registros
      const data100 = await this.client.readInputRegisters(3001, 23);
      
      // Leer módulo 200 (registros 3024-3046) - 23 registros  
      const data200 = await this.client.readInputRegisters(3024, 23);

      // Leer estado de válvulas módulo 100 (registros 3046-3065)
      const valves100 = await this.client.readHoldingRegisters(3046, 20);
      
      // Leer estado de válvulas módulo 200 (registros 3066-3085)
      const valves200 = await this.client.readHoldingRegisters(3066, 20);


      return {
        modulo100: data100.data,
        modulo200: data200.data,
        flujo100: data100.data[20] || 0,
        flujo200: data200.data[20] || 0,
        rfValue1: data100.data[21] || 0,
        rssi1: data100.data[22] || 0,
        rfValue2: data200.data[21] || 0,
        rssi2: data200.data[22] || 0,
        valves100: valves100.data,
        valves200: valves200.data
      };
    } catch (error) {
      console.error('Error leyendo datos del PLC:', error.message);
      this.isConnected = false;
      return null;
    }
  }

  async controlValve(jaulaId, state) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    try {
      let register;
      if (jaulaId < 130) {
        // Módulo 100: jaulas 101-120
        register = 3046 + (jaulaId - 101);
      } else {
        // Módulo 200: jaulas 201-220
        register = 3066 + (jaulaId - 201);
      }

      await this.client.writeRegister(register, state ? 1 : 0);
      console.log(`Válvula ${jaulaId} ${state ? 'ABIERTA' : 'CERRADA'} (registro ${register})`);
      return true;
    } catch (error) {
      console.error(`Error controlando válvula ${jaulaId}:`, error.message);
      return false;
    }
  }

  async closeAllValves() {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    try {
      // Cerrar todas las válvulas del módulo 100
      for (let i = 0; i < 20; i++) {
        await this.client.writeRegister(3046 + i, 0);
        await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña pausa
      }

      // Cerrar todas las válvulas del módulo 200
      for (let i = 0; i < 20; i++) {
        await this.client.writeRegister(3066 + i, 0);
        await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña pausa
      }

      console.log('Todas las válvulas cerradas');
      return true;
    } catch (error) {
      console.error('Error cerrando válvulas:', error.message);
      return false;
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = ModbusService;

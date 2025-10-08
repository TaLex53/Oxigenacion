const express = require('express');
const router = express.Router();
const JaulaController = require('../controllers/jaulaController');
const DatabaseService = require('../services/databaseService');

// Instancia del controlador (singleton)
let jaulaController = null;
let dbService = null;

// Función para establecer las instancias desde el servidor principal
const setInstances = (controller, database) => {
  jaulaController = controller;
  dbService = database;
};

// Inicializar controlador
const initializeController = async () => {
  if (!jaulaController) {
    jaulaController = new JaulaController();
    await jaulaController.initialize();
  }
  if (!dbService) {
    dbService = new DatabaseService();
    await dbService.connect();
  }
  return jaulaController;
};

// Middleware para inicializar controlador
router.use(async (req, res, next) => {
  await initializeController();
  next();
});

// ===== RUTAS DE JAULAS =====

// Obtener estado de todas las jaulas
router.get('/jaulas', async (req, res) => {
  try {
    const estado = jaulaController.getEstadoJaulas();
    res.json({
      success: true,
      data: estado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estado de una jaula específica
router.get('/jaulas/:id', async (req, res) => {
  try {
    const jaulaId = parseInt(req.params.id);
    const estado = jaulaController.getEstadoJaulas();
    
    let jaulaData = null;
    if (jaulaId < 130) {
      const index = jaulaId - 101;
      jaulaData = {
        id: jaulaId,
        modulo: 100,
        nivel: estado.modulo100.niveles[index],
        empresa: estado.modulo100.empresas[index],
        activa: estado.modulo100.activas[index],
        inyectando: estado.modulo100.inyectando[index],
        supervisor: estado.modulo100.supervisores[index],
        inyeccion: estado.modulo100.inyeccion[index]
      };
    } else {
      const index = jaulaId - 201;
      jaulaData = {
        id: jaulaId,
        modulo: 200,
        nivel: estado.modulo200.niveles[index],
        empresa: estado.modulo200.empresas[index],
        activa: estado.modulo200.activas[index],
        inyectando: estado.modulo200.inyectando[index],
        supervisor: estado.modulo200.supervisores[index],
        inyeccion: estado.modulo200.inyeccion[index]
      };
    }

    res.json({
      success: true,
      data: jaulaData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Controlar jaula (abrir/cerrar)
router.post('/jaulas/:id/control', async (req, res) => {
  try {
    const jaulaId = parseInt(req.params.id);
    const { action, supervisor, cliente, inyeccion, minimo, maximo } = req.body;

    if (!['abrir', 'cerrar'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Acción debe ser "abrir" o "cerrar"'
      });
    }

    const success = await jaulaController.controlarJaula(
      jaulaId, 
      action, 
      supervisor, 
      cliente, 
      inyeccion,
      minimo,
      maximo
    );

    res.json({
      success,
      message: success ? 
        `Jaula ${jaulaId} ${action === 'abrir' ? 'abierta' : 'cerrada'} correctamente` :
        `Error al ${action} jaula ${jaulaId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cerrar todas las válvulas
router.post('/jaulas/cerrar-todas', async (req, res) => {
  try {
    const success = await jaulaController.cerrarTodasLasValvulas();
    
    res.json({
      success,
      message: success ? 
        'Todas las válvulas cerradas correctamente' :
        'Error cerrando válvulas'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== RUTAS DE CONFIGURACIÓN =====

// Obtener límites de una jaula
router.get('/jaulas/:id/limites', async (req, res) => {
  try {
    const jaulaId = parseInt(req.params.id);
    const limites = await dbService.getLimites(jaulaId);
    
    res.json({
      success: true,
      data: {
        jaula: jaulaId,
        minimo: limites.LimiteInferior,
        maximo: limites.LimiteSuperior
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configurar límites de una jaula
router.put('/jaulas/:id/limites', async (req, res) => {
  try {
    const jaulaId = parseInt(req.params.id);
    const { minimo, maximo } = req.body;

    if (minimo === undefined || maximo === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los campos minimo y maximo'
      });
    }

    const success = await dbService.configurarLimites(jaulaId, minimo, maximo);
    
    if (success) {
      // Actualizar arrays en memoria
      const index = jaulaId < 130 ? jaulaId - 101 : jaulaId - 201;
      if (jaulaId < 130) {
        jaulaController.MinimoModulo100[index] = parseFloat(minimo);
        jaulaController.MaximoModulo100[index] = parseFloat(maximo);
      } else {
        jaulaController.MinimoModulo200[index] = parseFloat(minimo);
        jaulaController.MaximoModulo200[index] = parseFloat(maximo);
      }
    }

    res.json({
      success,
      message: success ? 
        `Límites actualizados para jaula ${jaulaId}` :
        `Error actualizando límites para jaula ${jaulaId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== RUTAS DE FLUJO =====

// Obtener datos de flujo
router.get('/flujo', async (req, res) => {
  try {
    if (!dbService) {
      throw new Error('Database service not initialized');
    }
    const flujoData = await dbService.getFlujoModulos();
    res.json({
      success: true,
      data: flujoData
    });
  } catch (error) {
    console.error('Error obteniendo datos de flujo:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== RUTAS DE CLIENTES =====

// Obtener lista de clientes
router.get('/clientes', async (req, res) => {
  try {
    if (!dbService) {
      console.log('⚠️ Database service not initialized, waiting...');
      // Esperar un poco y reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!dbService) {
        throw new Error('Database service not initialized');
      }
    }
    const clientes = await dbService.getClientes();
    res.json({
      success: true,
      data: clientes
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Agregar cliente
router.post('/clientes', async (req, res) => {
  try {
    const { rut, nombre } = req.body;

    if (!rut || !nombre) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los campos rut y nombre'
      });
    }

    const success = await dbService.agregarCliente(rut, nombre);
    
    res.json({
      success,
      message: success ? 
        `Cliente ${nombre} agregado correctamente` :
        `Error agregando cliente ${nombre}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== RUTAS DE REPORTES =====

// Obtener registros de jaulas
router.get('/reportes/registros', async (req, res) => {
  try {
    const { fechaInicio, fechaFin, jaula } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren fechaInicio y fechaFin'
      });
    }

    const registros = await dbService.getRegistros(
      new Date(fechaInicio),
      new Date(fechaFin),
      jaula || '(Todos)'
    );

    res.json({
      success: true,
      data: registros
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener registros de clientes
router.get('/reportes/clientes', async (req, res) => {
  try {
    const { fechaInicio, fechaFin, cliente } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren fechaInicio y fechaFin'
      });
    }

    const registros = await dbService.getRegistrosClientes(
      new Date(fechaInicio),
      new Date(fechaFin),
      cliente || '(Todos)'
    );

    res.json({
      success: true,
      data: registros
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== RUTAS DE ESTADO =====

// Ruta de salud del servidor
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ruta para verificar estado de Modbus
router.get('/modbus-status', (req, res) => {
  if (!jaulaController) {
    return res.json({ connected: false, error: 'Controller not initialized' });
  }
  
  const modbusStatus = jaulaController.modbus ? jaulaController.modbus.isConnected : false;
  res.json({ 
    connected: modbusStatus,
    timestamp: new Date().toISOString()
  });
});

// Obtener estado del sistema
router.get('/sistema/estado', async (req, res) => {
  try {
    const estado = jaulaController.getEstadoJaulas();
    
    res.json({
      success: true,
      data: {
        conexionPLC: estado.conexion,
        flujos: estado.flujos,
        totalJaulas: 40,
        jaulasActivas: [
          ...estado.modulo100.activas,
          ...estado.modulo200.activas
        ].filter(a => a === 1).length,
        jaulasInyectando: [
          ...estado.modulo100.inyectando,
          ...estado.modulo200.inyectando
        ].filter(i => i === 1).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reiniciar sistema
router.post('/sistema/reiniciar', async (req, res) => {
  try {
    await jaulaController.shutdown();
    jaulaController = null;
    dbService = null;
    
    // Reinicializar
    await initializeController();
    
    res.json({
      success: true,
      message: 'Sistema reiniciado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = { router, setInstances };

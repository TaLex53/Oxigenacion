const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const config = require('./config');
const { router: apiRoutes, setInstances } = require('./routes/api');
const JaulaController = require('./controllers/jaulaController');
const DatabaseService = require('./services/databaseService');

class Server {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "http://localhost:3000", // URL del frontend Next.js
        methods: ["GET", "POST"]
      }
    });
    this.jaulaController = null;
    this.dbService = null;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: "http://localhost:3000",
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Sistema de Control de Oxígeno - API Backend',
        version: '1.0.0',
        endpoints: {
          jaulas: '/api/jaulas',
          clientes: '/api/clientes',
          reportes: '/api/reportes',
          sistema: '/api/sistema'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado'
      });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log('Cliente WebSocket conectado:', socket.id);

      // Enviar estado inicial
      if (this.jaulaController) {
        socket.emit('jaulaUpdate', this.jaulaController.getEstadoJaulas());
      }

      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log('Cliente WebSocket desconectado:', socket.id);
      });

      // Manejar solicitud de estado
      socket.on('getEstado', () => {
        if (this.jaulaController) {
          socket.emit('jaulaUpdate', this.jaulaController.getEstadoJaulas());
        }
      });
    });

    // Enviar actualizaciones cada 5 segundos
    setInterval(() => {
      if (this.jaulaController) {
        const estado = this.jaulaController.getEstadoJaulas();
        this.io.emit('jaulaUpdate', estado);
      }
    }, 5000);
  }

  async start() {
    try {
      // Iniciar servidor primero
      this.server.listen(config.PORT, () => {
        console.log(`Servidor iniciado en puerto ${config.PORT}`);
        console.log(`WebSocket disponible en puerto ${config.PORT}`);
        console.log(`API disponible en http://localhost:${config.PORT}`);
        console.log(`Health check: http://localhost:${config.PORT}/health`);
      });

      // Inicializar servicios después
      console.log('Inicializando servicios...');
      this.dbService = new DatabaseService();
      await this.dbService.connect();
      
      this.jaulaController = new JaulaController();
      await this.jaulaController.initialize();
      
      // Establecer las instancias en las rutas
      setInstances(this.jaulaController, this.dbService);

      // Manejo de cierre graceful
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      console.error('❌ Error iniciando servidor:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('Cerrando servidor...');
    
    try {
      if (this.jaulaController) {
        await this.jaulaController.shutdown();
      }
      
      this.server.close(() => {
        console.log('Servidor cerrado correctamente');
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Error cerrando servidor:', error);
      process.exit(1);
    }
  }
}

// Iniciar servidor
const server = new Server();
server.start();

module.exports = Server;

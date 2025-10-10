import { io, Socket } from 'socket.io-client';
import { EstadoJaulas } from './api';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Conectado al WebSocket');
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado del WebSocket:', reason);
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚠️ Error de conexión WebSocket (continuando sin tiempo real):', error.message);
      // No emitir error para que la UI no se rompa
      this.emit('connectionWarning', 'Sin conexión en tiempo real');
    });

    this.socket.on('jaulaUpdate', (data: EstadoJaulas) => {
      this.emit('jaulaUpdate', data);
    });

    // Solicitar estado inicial solo si está conectado
    this.socket.on('connect', () => {
      this.socket?.emit('getEstado');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Método para suscribirse a eventos
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Método para desuscribirse de eventos
  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  // Método privado para emitir eventos internos
  private emit(event: string, data?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener de ${event}:`, error);
        }
      });
    }
  }

  // Método para solicitar estado actual
  requestEstado() {
    if (this.socket?.connected) {
      this.socket.emit('getEstado');
    }
  }

  // Verificar si está conectado
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Obtener ID del socket
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Instancia singleton
const socketService = new SocketService();

export default socketService;

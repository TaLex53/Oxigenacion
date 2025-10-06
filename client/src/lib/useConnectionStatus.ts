import { useState, useEffect } from 'react';
import socketService from './socket';

export interface ConnectionStatus {
  isConnected: boolean;
  isWebSocketConnected: boolean;
  isApiConnected: boolean;
  isModbusConnected: boolean;
  mode: 'online' | 'offline';
}

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isWebSocketConnected: false,
    isApiConnected: false,
    isModbusConnected: false,
    mode: 'offline'
  });

  useEffect(() => {
    // Verificar conexión API y Modbus
    const checkApiConnection = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        const modbusResponse = await fetch('http://localhost:3001/api/modbus-status');
        const modbusData = await modbusResponse.json();
        
        setStatus(prev => ({
          ...prev,
          isApiConnected: response.ok,
          isModbusConnected: modbusData.connected || false,
          isConnected: response.ok && prev.isWebSocketConnected && (modbusData.connected || false)
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          isApiConnected: false,
          isModbusConnected: false,
          isConnected: false
        }));
      }
    };

    // Verificar conexión WebSocket
    const checkWebSocketConnection = () => {
      const isConnected = socketService.isConnected();
      setStatus(prev => ({
        ...prev,
        isWebSocketConnected: isConnected,
        isConnected: prev.isApiConnected && isConnected && prev.isModbusConnected,
        mode: prev.isApiConnected ? 'online' : 'offline'
      }));
    };

    // Verificaciones iniciales
    checkApiConnection();
    checkWebSocketConnection();

    // Configurar listeners de WebSocket
    const handleConnected = () => {
      setStatus(prev => ({
        ...prev,
        isWebSocketConnected: true,
        isConnected: prev.isApiConnected && prev.isModbusConnected
      }));
    };

    const handleDisconnected = () => {
      setStatus(prev => ({
        ...prev,
        isWebSocketConnected: false,
        isConnected: false
      }));
    };

    socketService.on('connected', handleConnected);
    socketService.on('disconnected', handleDisconnected);

    // Verificar conexión API periódicamente
    const interval = setInterval(checkApiConnection, 30000);

    return () => {
      socketService.off('connected', handleConnected);
      socketService.off('disconnected', handleDisconnected);
      clearInterval(interval);
    };
  }, []);

  return status;
};

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  Settings,
  RefreshCw
} from 'lucide-react';
import JaulaCard from './JaulaCard';
import { jaulaAPI, EstadoJaulas } from '@/lib/api';
import socketService from '@/lib/socket';

interface DashboardProps {
  onConfigurarJaula: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onConfigurarJaula }) => {
  const [estadoJaulas, setEstadoJaulas] = useState<EstadoJaulas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controllingJaulas, setControllingJaulas] = useState<Set<number>>(new Set());
  
  // Datos por defecto cuando no hay conexión
  const defaultJaulas = {
    modulo100: {
      niveles: Array(20).fill('0.0'),
      empresas: Array(20).fill(''),
      activas: Array(20).fill(0),
      CantPeces: Array(20).fill(0),
      supervisores: Array(20).fill(''),
      inyeccion: Array(20).fill('')
    },
    modulo200: {
      niveles: Array(20).fill('0.0'),
      empresas: Array(20).fill(''),
      activas: Array(20).fill(0),
      CantPeces: Array(20).fill(0),
      supervisores: Array(20).fill(''),
      inyeccion: Array(20).fill('')
    },
    flujos: {
      flujo100: 0,
      flujo200: 0
    },
    conexion: false
  };

  // Cargar estado inicial
  useEffect(() => {
    loadEstadoJaulas();
  }, []);

  // Configurar WebSocket
  useEffect(() => {
    socketService.connect();

    const handleJaulaUpdate = (data: EstadoJaulas) => {
      setEstadoJaulas(data);
      setLoading(false);
      setError(null);
    };

    const handleConnectionWarning = (message: string) => {
      console.warn('WebSocket warning:', message);
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
    };

    socketService.on('jaulaUpdate', handleJaulaUpdate);
    socketService.on('connectionWarning', handleConnectionWarning);
    socketService.on('error', handleError);

    return () => {
      socketService.off('jaulaUpdate', handleJaulaUpdate);
      socketService.off('connectionWarning', handleConnectionWarning);
      socketService.off('error', handleError);
    };
  }, []);

  const loadEstadoJaulas = async () => {
    try {
      setLoading(true);
      const data = await jaulaAPI.getEstadoJaulas();
      console.log('📊 Datos de jaulas recibidos:', data);
      setEstadoJaulas(data);
      setError(null);
    } catch (err) {
      console.error('Error cargando estado de jaulas:', err);
      // En caso de error, mantener los datos existentes o usar datos por defecto
      if (!estadoJaulas) {
        // Solo usar datos por defecto si no hay datos existentes
        setEstadoJaulas(defaultJaulas);
      }
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleControlJaula = async (id: number, action: 'abrir' | 'cerrar') => {
    try {
      setControllingJaulas(prev => new Set(prev).add(id));
      
      const result = await jaulaAPI.controlarJaula(id, action);
      
      if (result.success) {
        if (estadoJaulas) {
          const index = id < 130 ? id - 101 : id - 201;
          const isModulo100 = id < 130;
          
          setEstadoJaulas(prev => {
            if (!prev) return prev;
            
            const newEstado = { ...prev };
            if (isModulo100) {
              newEstado.modulo100.activas[index] = action === 'abrir' ? 1 : 0;
            } else {
              newEstado.modulo200.activas[index] = action === 'abrir' ? 1 : 0;
            }
            return newEstado;
          });
        }
      } else {
        console.error('Error controlando jaula:', result.message);
      }
    } catch (err) {
      console.error('Error controlando jaula:', err);
    } finally {
      setControllingJaulas(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleCerrarTodas = async () => {
    try {
      const result = await jaulaAPI.cerrarTodasLasValvulas();
      if (result.success) {
        await loadEstadoJaulas();
      }
    } catch (err) {
      console.error('Error cerrando todas las válvulas:', err);
    }
  };

  if (loading && !estadoJaulas) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-2 text-gray-300">Cargando estado de jaulas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Error de Conexión</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        <button
          onClick={loadEstadoJaulas}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Usar datos por defecto si no hay estado
  const jaulasData = estadoJaulas || defaultJaulas;

  return (
    <div className="space-y-8">
      {/* Módulo 100 - Distribución 2x10 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6">Modulo 100</h3>
        <div className="grid grid-rows-2 gap-2">
          {/* Fila superior - Jaulas impares (101, 103, 105, ..., 119) */}
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => {
              const jaulaId = 101 + (i * 2); // 101, 103, 105, ..., 119
              const index = jaulaId - 101;
              const nivel = parseFloat(jaulasData.modulo100.niveles[index] || '0');
              const isActiva = jaulasData.modulo100.activas[index] === 1;
              const isInyectando = jaulasData.modulo100.CantPeces[index] === 1;
              const cliente = jaulasData.modulo100.empresas[index] || '';
              
              return (
                <div
                  key={jaulaId}
                  className="bg-gray-700 rounded p-3 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => onConfigurarJaula(jaulaId)}
                >
                  <div className="text-sm font-bold text-white mb-1">
                    JAULA {jaulaId}
                  </div>
                  <div className={`text-xs mb-1 truncate ${
                    cliente && cliente !== '-----' ? 'text-blue-300' : 'text-gray-400'
                  }`}>
                    {cliente && cliente !== '-----' ? cliente : '-----'}
                  </div>
                  <div className={`text-lg font-bold mb-2 ${
                    nivel === 0 ? 'text-gray-400' : 
                    nivel > 8 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {nivel.toFixed(1)} mg/L
                  </div>
                  <div className="h-1 bg-gray-600 rounded mb-1">
                    <div 
                      className={`h-full rounded transition-all duration-300 ${
                        isInyectando ? 'bg-blue-400 animate-pulse' : 
                        isActiva ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: isInyectando ? '100%' : `${Math.min((nivel / 15) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  {isInyectando && (
                    <div className="text-xs text-blue-400 font-bold animate-pulse">
                      CARGANDO OXÍGENO
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Fila inferior - Jaulas pares (102, 104, 106, ..., 120) */}
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => {
              const jaulaId = 102 + (i * 2); // 102, 104, 106, ..., 120
              const index = jaulaId - 101;
              const nivel = parseFloat(jaulasData.modulo100.niveles[index] || '0');
              const isActiva = jaulasData.modulo100.activas[index] === 1;
              const isInyectando = jaulasData.modulo100.CantPeces[index] === 1;
              const cliente = jaulasData.modulo100.empresas[index] || '';
              
              return (
                <div
                  key={jaulaId}
                  className="bg-gray-700 rounded p-3 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => onConfigurarJaula(jaulaId)}
                >
                  <div className="text-sm font-bold text-white mb-1">
                    JAULA {jaulaId}
                  </div>
                  <div className={`text-xs mb-1 truncate ${
                    cliente && cliente !== '-----' ? 'text-blue-300' : 'text-gray-400'
                  }`}>
                    {cliente && cliente !== '-----' ? cliente : '-----'}
                  </div>
                  <div className={`text-lg font-bold mb-2 ${
                    nivel === 0 ? 'text-gray-400' : 
                    nivel > 8 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {nivel.toFixed(1)} mg/L
                  </div>
                  <div className="h-1 bg-gray-600 rounded mb-1">
                    <div 
                      className={`h-full rounded transition-all duration-300 ${
                        isInyectando ? 'bg-blue-400 animate-pulse' : 
                        isActiva ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: isInyectando ? '100%' : `${Math.min((nivel / 15) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  {isInyectando && (
                    <div className="text-xs text-blue-400 font-bold animate-pulse">
                      CARGANDO OXÍGENO
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Módulo 200 - Distribución 2x10 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6">Modulo 200</h3>
        <div className="grid grid-rows-2 gap-2">
          {/* Fila superior - Jaulas impares (201, 203, 205, ..., 219) */}
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => {
              const jaulaId = 201 + (i * 2); // 201, 203, 205, ..., 219
              const index = jaulaId - 201;
              const nivel = parseFloat(jaulasData.modulo200.niveles[index] || '0');
              const isActiva = jaulasData.modulo200.activas[index] === 1;
              const isInyectando = jaulasData.modulo200.CantPeces[index] === 1;
              const cliente = jaulasData.modulo200.empresas[index] || '';
              
              return (
                <div
                  key={jaulaId}
                  className="bg-gray-700 rounded p-3 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => onConfigurarJaula(jaulaId)}
                >
                  <div className="text-sm font-bold text-white mb-1">
                    JAULA {jaulaId}
                  </div>
                  <div className={`text-xs mb-1 truncate ${
                    cliente && cliente !== '-----' ? 'text-blue-300' : 'text-gray-400'
                  }`}>
                    {cliente && cliente !== '-----' ? cliente : '-----'}
                  </div>
                  <div className={`text-lg font-bold mb-2 ${
                    nivel === 0 ? 'text-gray-400' : 
                    nivel > 8 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {nivel.toFixed(1)} mg/L
                  </div>
                  <div className="h-1 bg-gray-600 rounded mb-1">
                    <div 
                      className={`h-full rounded transition-all duration-300 ${
                        isInyectando ? 'bg-blue-400 animate-pulse' : 
                        isActiva ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: isInyectando ? '100%' : `${Math.min((nivel / 15) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  {isInyectando && (
                    <div className="text-xs text-blue-400 font-bold animate-pulse">
                      CARGANDO OXÍGENO
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Fila inferior - Jaulas pares (202, 204, 206, ..., 220) */}
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => {
              const jaulaId = 202 + (i * 2); // 202, 204, 206, ..., 220
              const index = jaulaId - 201;
              const nivel = parseFloat(jaulasData.modulo200.niveles[index] || '0');
              const isActiva = jaulasData.modulo200.activas[index] === 1;
              const isInyectando = jaulasData.modulo200.CantPeces[index] === 1;
              const cliente = jaulasData.modulo200.empresas[index] || '';
              
              return (
                <div
                  key={jaulaId}
                  className="bg-gray-700 rounded p-3 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => onConfigurarJaula(jaulaId)}
                >
                  <div className="text-sm font-bold text-white mb-1">
                    JAULA {jaulaId}
                  </div>
                  <div className={`text-xs mb-1 truncate ${
                    cliente && cliente !== '-----' ? 'text-blue-300' : 'text-gray-400'
                  }`}>
                    {cliente && cliente !== '-----' ? cliente : '-----'}
                  </div>
                  <div className={`text-lg font-bold mb-2 ${
                    nivel === 0 ? 'text-gray-400' : 
                    nivel > 8 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {nivel.toFixed(1)} mg/L
                  </div>
                  <div className="h-1 bg-gray-600 rounded mb-1">
                    <div 
                      className={`h-full rounded transition-all duration-300 ${
                        isInyectando ? 'bg-blue-400 animate-pulse' : 
                        isActiva ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: isInyectando ? '100%' : `${Math.min((nivel / 15) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  {isInyectando && (
                    <div className="text-xs text-blue-400 font-bold animate-pulse">
                      CARGANDO OXÍGENO
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
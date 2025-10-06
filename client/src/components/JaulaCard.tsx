'use client';

import React from 'react';
import { 
  Droplets, 
  User, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap
} from 'lucide-react';

interface JaulaCardProps {
  id: number;
  modulo: number;
  nivel: string;
  empresa: string;
  activa: boolean;
  inyectando: boolean;
  supervisor: string;
  inyeccion: string;
  minimo: number;
  maximo: number;
  onControl: (id: number, action: 'abrir' | 'cerrar') => void;
  onConfigurar: (id: number) => void;
  isControlling?: boolean;
}

const JaulaCard: React.FC<JaulaCardProps> = ({
  id,
  modulo,
  nivel,
  empresa,
  activa,
  inyectando,
  supervisor,
  inyeccion,
  minimo,
  maximo,
  onControl,
  onConfigurar,
  isControlling = false
}) => {
  const nivelNum = parseFloat(nivel);
  const isNivelBajo = nivelNum <= minimo;
  const isNivelAlto = nivelNum >= maximo;
  
  // Determinar color de fondo basado en estado
  const getBackgroundColor = () => {
    if (inyectando) return 'bg-blue-100 border-blue-300';
    if (activa) return 'bg-green-100 border-green-300';
    return 'bg-gray-100 border-gray-300';
  };

  // Determinar color del nivel de oxígeno
  const getNivelColor = () => {
    if (isNivelBajo) return 'text-red-600 font-bold';
    if (isNivelAlto) return 'text-orange-600 font-bold';
    return 'text-green-600 font-semibold';
  };

  // Determinar icono de estado
  const getEstadoIcon = () => {
    if (inyectando) return <Zap className="w-5 h-5 text-blue-600" />;
    if (activa) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <XCircle className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className={`
      relative p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-lg
      ${getBackgroundColor()}
      ${isControlling ? 'opacity-50 pointer-events-none' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-gray-800">
            Jaula {id}
          </h3>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
            Módulo {modulo}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {getEstadoIcon()}
          <button
            onClick={() => onConfigurar(id)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Configurar"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nivel de Oxígeno */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-1">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-600">Nivel O₂</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${getNivelColor()}`}>
            {nivel} mg/L
          </span>
          {isNivelBajo && (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Límites: {minimo} - {maximo} mg/L
        </div>
      </div>

      {/* Información de la Empresa */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-1">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">Cliente</span>
        </div>
        <div className="text-sm text-gray-700 truncate">
          {empresa || 'Sin asignar'}
        </div>
        {supervisor && (
          <div className="text-xs text-gray-500 mt-1">
            Sup: {supervisor}
          </div>
        )}
        {inyeccion && (
          <div className="text-xs text-gray-500">
            Tipo: {inyeccion}
          </div>
        )}
      </div>

      {/* Botones de Control */}
      <div className="flex space-x-2">
        <button
          onClick={() => onControl(id, activa ? 'cerrar' : 'abrir')}
          disabled={isControlling}
          className={`
            flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${activa 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
            ${isControlling ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {activa ? 'Cerrar' : 'Abrir'} Oxígeno
        </button>
      </div>

      {/* Indicador de Inyección */}
      {inyectando && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

export default JaulaCard;

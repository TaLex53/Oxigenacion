'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Settings, 
  BarChart3, 
  Users, 
  AlertTriangle,
  Menu,
  X,
  Wifi,
  WifiOff,
  Eye,
  Monitor,
  RefreshCw
} from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import { useConnectionStatus } from '@/lib/useConnectionStatus';
import { clienteAPI, jaulaAPI } from '@/lib/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jaulaSeleccionada, setJaulaSeleccionada] = useState(206);
  const [cliente, setCliente] = useState('');
  const [minimo, setMinimo] = useState('0');
  const [maximo, setMaximo] = useState('0');
  const [inyeccion, setInyeccion] = useState('Normal');
  const [supervisor, setSupervisor] = useState('');
  const [supervisorCierre, setSupervisorCierre] = useState('');
  const [oxigenoActivo, setOxigenoActivo] = useState(false);
  
  // Estado para almacenar parámetros de cada jaula
  const [parametrosJaulas, setParametrosJaulas] = useState<{[key: number]: {
    cliente: string;
    minimo: string;
    maximo: string;
    inyeccion: string;
    supervisor: string;
    supervisorCierre: string;
    oxigenoActivo: boolean;
  }}>({});
  const [flujo100, setFlujo100] = useState(0);
  const [flujo200, setFlujo200] = useState(0);
  const [clientes, setClientes] = useState<string[]>([]);
  const [mostrarMensajeJaula, setMostrarMensajeJaula] = useState(false);
  const [oxigenacionAutomatica, setOxigenacionAutomatica] = useState(false);
  const [estadoJaulas, setEstadoJaulas] = useState<any>(null);
  
  const connectionStatus = useConnectionStatus();

  // Cargar parámetros guardados del localStorage después de la hidratación
  useEffect(() => {
    const saved = localStorage.getItem('parametrosJaulas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Parámetros cargados del localStorage:', parsed);
        setParametrosJaulas(parsed);
      } catch (error) {
        console.error('Error cargando parámetros del localStorage:', error);
      }
    }
  }, []);

  // Cargar clientes al montar el componente
  useEffect(() => {
    const loadClientes = async () => {
      try {
        const clientesData = await clienteAPI.getClientes();
        setClientes(clientesData);
      } catch (error) {
        console.error('❌ Error cargando clientes:', error);
        // En caso de error, mantener array vacío
        setClientes([]);
      }
    };

    loadClientes();
  }, []);

  // Cargar estado de jaulas para monitoreo de oxigenación automática
  useEffect(() => {
    const loadEstadoJaulas = async () => {
      try {
        const data = await jaulaAPI.getEstadoJaulas();
        setEstadoJaulas(data);
      } catch (error) {
        console.error('❌ Error cargando estado de jaulas:', error);
      }
    };

    loadEstadoJaulas();
    
    // Actualizar cada 5 segundos
    const interval = setInterval(loadEstadoJaulas, 5000);
    return () => clearInterval(interval);
  }, []);

  // Guardar parámetros automáticamente cuando cambien
  useEffect(() => {
    guardarParametrosJaula();
  }, [cliente, minimo, maximo, inyeccion, supervisor, supervisorCierre, oxigenoActivo]);

  // Verificar oxigenación automática cuando cambien los datos de jaulas o parámetros
  useEffect(() => {
    if (estadoJaulas && minimo && maximo) {
      verificarOxigenacionAutomatica();
    }
  }, [estadoJaulas, minimo, maximo, jaulaSeleccionada]);

  // Efecto para detectar cambios en oxigenoActivo (solo para jaula 111 y "A Pedido")
  useEffect(() => {
    if (jaulaSeleccionada === 111 && inyeccion === "A Pedido") {
      console.log(`Frontend - Estado oxigenoActivo cambió:`, {
        timestamp: new Date().toISOString(),
        jaula: jaulaSeleccionada,
        oxigenoActivo,
        inyeccion,
        minimo,
        maximo
      });
    }
  }, [oxigenoActivo, jaulaSeleccionada, inyeccion, minimo, maximo]);

  // Cargar datos de flujo periódicamente
  useEffect(() => {
    const loadFlujoData = async () => {
      try {
        // Agregar timeout y headers para mejor manejo de errores
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
        
        const response = await fetch('http://localhost:3001/api/jaulas', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.data.flujos) {
          setFlujo100(data.data.flujos.flujo100 || 0);
          setFlujo200(data.data.flujos.flujo200 || 0);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('⏰ Timeout cargando datos de flujo, reintentando...');
        } else {
          console.error('❌ Error cargando datos de flujo:', error);
        }
        // En caso de error, mantener valores por defecto
        setFlujo100(0);
        setFlujo200(0);
      }
    };

    // Cargar inmediatamente
    loadFlujoData();
    
    // Actualizar cada 5 segundos
    const interval = setInterval(loadFlujoData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  // Función para guardar parámetros de la jaula actual
  const guardarParametrosJaula = () => {
    const nuevosParametros = {
      cliente,
      minimo,
      maximo,
      inyeccion,
      supervisor,
      supervisorCierre,
      oxigenoActivo
    };
    
    setParametrosJaulas(prev => {
      const actualizados = {
        ...prev,
        [jaulaSeleccionada]: nuevosParametros
      };
      
      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('parametrosJaulas', JSON.stringify(actualizados));
        } catch (error) {
          console.error('Error guardando parámetros en localStorage:', error);
        }
      }
      
      return actualizados;
    });
  };

  const handleConfigurarJaula = (id: number) => {
    // Guardar parámetros de la jaula actual antes de cambiar
    guardarParametrosJaula();
    
    setJaulaSeleccionada(id);
    setMostrarMensajeJaula(true);
    console.log('Configurar jaula:', id);
    
    // Resetear estado de oxigenación automática al cambiar de jaula
    setOxigenacionAutomatica(false);
    console.log(`Estado de oxigenación automática reseteado para jaula ${id}`);
    
    // Cargar parámetros específicos de la jaula seleccionada
    const parametrosJaula = parametrosJaulas[id];
    
    if (parametrosJaula) {
      // Si ya tiene parámetros configurados, cargarlos
      console.log(`Cargando parámetros guardados para jaula ${id}:`, parametrosJaula);
      setCliente(parametrosJaula.cliente);
      setMinimo(parametrosJaula.minimo);
      setMaximo(parametrosJaula.maximo);
      setInyeccion(parametrosJaula.inyeccion);
      setSupervisor(parametrosJaula.supervisor);
      setSupervisorCierre(parametrosJaula.supervisorCierre);
      setOxigenoActivo(parametrosJaula.oxigenoActivo);
    } else {
      // Si es la primera vez, usar valores por defecto
      console.log(`Primera configuración para jaula ${id}, usando valores por defecto`);
      setCliente('');
      setMinimo('0');
      setMaximo('0');
      setInyeccion('Normal');
      setSupervisor('');
      setSupervisorCierre('');
      setOxigenoActivo(false);
    }
    
    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => {
      setMostrarMensajeJaula(false);
    }, 5000);
  };

  // Función para obtener el nivel de oxígeno de una jaula específica
  const getNivelOxigeno = (jaulaId: number) => {
    if (!estadoJaulas) return 0;
    
    if (jaulaId < 130) {
      // Módulo 100
      const index = jaulaId - 101;
      return parseFloat(estadoJaulas.modulo100.niveles[index] || '0');
    } else {
      // Módulo 200
      const index = jaulaId - 201;
      return parseFloat(estadoJaulas.modulo200.niveles[index] || '0');
    }
  };

  // Función para verificar si debe activar oxigenación automática
  const verificarOxigenacionAutomatica = async () => {
    if (!estadoJaulas) return;
    
    const nivelActual = getNivelOxigeno(jaulaSeleccionada);
    const min = parseFloat(minimo) || 0;
    const max = parseFloat(maximo) || 0;
    
    // Log solo cuando hay cambios importantes
    if (jaulaSeleccionada === 111 && inyeccion === "A Pedido") {
      console.log(`Frontend - Verificando oxigenación automática:`, {
        timestamp: new Date().toISOString(),
        jaula: jaulaSeleccionada,
        nivel: nivelActual,
        min,
        max,
        inyeccion,
        oxigenoActivo: oxigenoActivo,
        estadoJaulas: !!estadoJaulas
      });
    }
    
    // Determinar el tipo de operación basado en los valores
    const esSetearValores = min > 0 && max > 0 && min < 20 && max < 20;
    const esAPedido = inyeccion === "A Pedido"; // Detectar "A Pedido" por el tipo de inyección
    
    // Para "A Pedido", no hacer verificaciones automáticas
    if (esAPedido) {
      console.log(`Modo "A Pedido" detectado - No se realizan verificaciones automáticas`);
      console.log(`   Valores detectados: min=${min}, max=${max}`);
      console.log(`   Condición esAPedido: ${esAPedido}`);
      console.log(`   Jaula: ${jaulaSeleccionada}, OxigenacionAutomatica: ${oxigenacionAutomatica}`);
      return;
    }
    
    // Si el oxígeno está cerrado manualmente, no reactivar automáticamente
    if (!oxigenoActivo) {
      console.log(`Oxígeno cerrado manualmente - No reactivando automáticamente para jaula ${jaulaSeleccionada}`);
      return;
    }
    
    if (esSetearValores) {
      // Modo SETEO: Activar solo cuando el nivel esté exactamente en el valor establecido
      const esValorExacto = min === max && Math.abs(nivelActual - min) < 0.1; // Tolerancia de 0.1 mg/L
      const dentroDelRango = min !== max && nivelActual >= min && nivelActual <= max;
      const alcanzoMaximo = nivelActual >= max; // Verificar si alcanzó el máximo
      
      if ((esValorExacto || dentroDelRango) && !oxigenacionAutomatica) {
        if (esValorExacto) {
          console.log(`Activando modo SETEO para jaula ${jaulaSeleccionada} - Nivel: ${nivelActual} mg/L (valor exacto ${min})`);
        } else {
          console.log(`Activando modo SETEO para jaula ${jaulaSeleccionada} - Nivel: ${nivelActual} mg/L (rango ${min}-${max})`);
        }
        setOxigenacionAutomatica(true);
        await activarOxigenoAutomatico();
      }
      // Si el nivel está fuera del rango, desactivar modo seteo
      // Para valores exactos (5.5-5.5), NO cerrar automáticamente, solo oscilar
      else if (!esValorExacto && !dentroDelRango) {
        console.log(`Desactivando modo SETEO para jaula ${jaulaSeleccionada} - Nivel: ${nivelActual} mg/L (fuera del rango ${min}-${max})`);
        setOxigenacionAutomatica(false);
      }
      // Para rangos (9.9-10), cerrar automáticamente cuando alcance el máximo
      else if (min !== max && alcanzoMaximo && oxigenoActivo) {
        console.log(`Cerrando oxígeno automáticamente - Jaula ${jaulaSeleccionada} alcanzó máximo ${max} mg/L (rango ${min}-${max})`);
        setOxigenacionAutomatica(false);
        setOxigenoActivo(false);
        // Enviar comando de cierre al servidor
        try {
          await jaulaAPI.controlarJaula(jaulaSeleccionada, 'cerrar', supervisor, cliente, inyeccion);
          console.log(`Cierre automático enviado al servidor para jaula ${jaulaSeleccionada}`);
        } catch (error) {
          console.error('Error cerrando oxígeno automáticamente:', error);
        }
      }
    } else {
      // Si no es seteo válido, desactivar oxigenación automática
      // PERO NO si es "A Pedido" (ya manejado arriba)
      if (oxigenacionAutomatica && !esAPedido) {
        console.log(`Desactivando oxigenación automática - Rango inválido: ${min}-${max}`);
        setOxigenacionAutomatica(false);
      }
    }
  };

  // Función para activar oxígeno automáticamente
  const activarOxigenoAutomatico = async () => {
    try {
      console.log(`Activando oxígeno automáticamente para jaula ${jaulaSeleccionada}`);
      
      // Primero configurar los límites en el servidor
      const limitesResult = await jaulaAPI.configurarLimites(
        jaulaSeleccionada, 
        parseFloat(minimo), 
        parseFloat(maximo)
      );
      
      if (limitesResult.success) {
        console.log(`Límites configurados: ${minimo}-${maximo} mg/L para jaula ${jaulaSeleccionada}`);
        
        // Luego activar el oxígeno
        const result = await jaulaAPI.controlarJaula(
          jaulaSeleccionada, 
          'abrir', 
          supervisor, 
          cliente, 
          inyeccion,
          parseFloat(minimo),
          parseFloat(maximo)
        );
        
        if (result.success) {
          setOxigenoActivo(true);
          console.log(`Oxígeno activado automáticamente para jaula ${jaulaSeleccionada}`);
        } else {
          console.error('❌ Error activando oxígeno automáticamente:', result.message);
        }
      } else {
        console.error('❌ Error configurando límites:', limitesResult.error);
      }
    } catch (error) {
      console.error('❌ Error activando oxígeno automáticamente:', error);
    }
  };



  const handleToggleOxigeno = async () => {
    try {
      const action = oxigenoActivo ? 'cerrar' : 'abrir';
      console.log(`${action === 'abrir' ? 'Iniciando' : 'Cerrando'} oxígeno para jaula ${jaulaSeleccionada}`);
      
      // Si se va a abrir, primero configurar los límites
      if (action === 'abrir') {
        const limitesResult = await jaulaAPI.configurarLimites(
          jaulaSeleccionada, 
          parseFloat(minimo), 
          parseFloat(maximo)
        );
        
        if (!limitesResult.success) {
          console.error('❌ Error configurando límites:', limitesResult.error);
          return;
        }
        
        console.log(`Límites configurados: ${minimo}-${maximo} mg/L para jaula ${jaulaSeleccionada}`);
      }
      
      // Llamar a la API para controlar la jaula
      const result = await jaulaAPI.controlarJaula(
        jaulaSeleccionada, 
        action, 
        supervisor, 
        cliente, 
        inyeccion,
        action === 'abrir' ? parseFloat(minimo) : undefined,
        action === 'abrir' ? parseFloat(maximo) : undefined
      );
      
      if (result.success) {
        const nuevoEstado = !oxigenoActivo;
        setOxigenoActivo(nuevoEstado);
        
        // Actualizar parámetros de la jaula
        setParametrosJaulas(prev => ({
          ...prev,
          [jaulaSeleccionada]: {
            ...prev[jaulaSeleccionada],
            oxigenoActivo: nuevoEstado
          }
        }));
        
        // Log para diagnosticar cambios de estado
        console.log(`Estado oxigenoActivo cambiado para jaula ${jaulaSeleccionada}:`, {
          nuevoEstado,
          inyeccion: parametrosJaulas[jaulaSeleccionada]?.inyeccion,
          accion: action
        });
        
        if (action === 'abrir') {
          console.log(`Oxígeno iniciado para jaula ${jaulaSeleccionada}`);
          console.log(`   Cliente: ${cliente}`);
          console.log(`   Supervisor: ${supervisor}`);
          console.log(`   Inyección: ${inyeccion}`);
          console.log(`   Min: ${minimo} mg/L, Max: ${maximo} mg/L`);
        } else {
          // Si se cierra manualmente, desactivar oxigenación automática
          setOxigenacionAutomatica(false);
          console.log(`Oxígeno cerrado manualmente para jaula ${jaulaSeleccionada} - Desactivando oxigenación automática`);
          
          // Forzar el cierre en el servidor
          try {
            await jaulaAPI.controlarJaula(jaulaSeleccionada, 'cerrar', supervisor, cliente, inyeccion);
            console.log(`Cierre forzado enviado al servidor para jaula ${jaulaSeleccionada}`);
          } catch (error) {
            console.error('Error forzando cierre:', error);
          }
        }
      } else {
        console.error('Error controlando jaula:', result.message);
      }
    } catch (error) {
      console.error('Error controlando oxígeno:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onConfigurarJaula={handleConfigurarJaula} jaulaSeleccionada={jaulaSeleccionada} oxigenoActivo={oxigenoActivo} parametrosJaulas={parametrosJaulas} />;
      case 'reportes':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reportes</h2>
            <p className="text-gray-600">Funcionalidad de reportes en desarrollo...</p>
          </div>
        );
      case 'clientes':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestión de Clientes</h2>
            <p className="text-gray-600">Funcionalidad de clientes en desarrollo...</p>
          </div>
        );
      case 'configuracion':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuración del Sistema</h2>
            <p className="text-gray-600">Configuración del sistema en desarrollo...</p>
          </div>
        );
      default:
        return <Dashboard onConfigurarJaula={handleConfigurarJaula} jaulaSeleccionada={jaulaSeleccionada} oxigenoActivo={oxigenoActivo} parametrosJaulas={parametrosJaulas} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-white"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center ml-4">
                <Activity className="w-8 h-8 text-blue-400" />
                <h1 className="ml-2 text-xl font-bold text-white">
                  Telemetria Oxigeno
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus.isModbusConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-300">
                  {connectionStatus.isModbusConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {connectionStatus.isWebSocketConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-yellow-500" />
                )}
                <span className="text-sm text-gray-300">
                  {connectionStatus.isWebSocketConnected ? 'Tiempo Real' : 'Modo Offline'}
                </span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                title="Refrescar página"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Refrescar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:inset-0
        `}>
          <div className="p-6 h-full flex flex-col">
            {/* Logo Blue Ingenieria */}
            <div className="mb-8">
              <div className="flex items-center mb-2">
                <div className="w-12 h-12 mr-3">
                  <img 
                    src="/iconbluein.png" 
                    alt="Blue Ingeniería" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Blue Ingeniería</h2>
                  <p className="text-xs text-gray-400">INTEGRACION Y AUTOMATIZACION INDUSTRIAL</p>
                </div>
              </div>
              
              {/* Estado de Conexión */}
              <div className="flex items-center mt-4">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  connectionStatus.isModbusConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm ${
                  connectionStatus.isModbusConnected ? 'text-green-400' : 'text-red-400'
                }`}>
                  {connectionStatus.isModbusConnected ? 'Conectado' : 'Desconectado'}
                </span>
                <Monitor className="w-4 h-4 text-gray-400 ml-4" />
                <span className="text-sm text-gray-400 ml-1">Diagnóstico</span>
              </div>
            </div>

            {/* Sección JAULA */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">JAULA {jaulaSeleccionada}</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Cliente:</label>
                  <select 
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clientes.map((clienteNombre, index) => (
                      <option key={index} value={clienteNombre}>
                        {clienteNombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Min. mg/L:</label>
                  <input 
                    type="number"
                    value={minimo}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Solo permitir números y un punto decimal
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setMinimo(value);
                      }
                    }}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Max. mg/L:</label>
                  <input 
                    type="number"
                    value={maximo}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Solo permitir números y un punto decimal
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setMaximo(value);
                      }
                    }}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Inyección:</label>
                  <select 
                    value={inyeccion}
                    onChange={(e) => setInyeccion(e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Pruebas">Pruebas</option>
                    <option value="A Pedido">A Pedido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Supervisor:</label>
                  <input 
                    type="text"
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Sup. Cierre:</label>
                  <input 
                    type="text"
                    value={supervisorCierre}
                    onChange={(e) => setSupervisorCierre(e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              {/* Botón Iniciar Oxígeno */}
              <div className="mt-6 flex flex-col items-center space-y-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={oxigenoActivo}
                    onChange={handleToggleOxigeno}
                  />
                  <div className="w-12 h-6 bg-gray-500 peer-focus:outline-none peer-focus:ring-0 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-red-500 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-500"></div>
                </label>
                <span className="text-sm font-medium text-white">
                  {oxigenoActivo ? 'Cerrar Oxigeno' : 'Iniciar Oxigeno'}
                </span>
                {oxigenacionAutomatica && (
                  <span className="text-xs text-green-400 font-bold animate-pulse">
                    🤖 AUTO
                  </span>
                )}
              </div>
            </div>

            {/* Indicadores de Flujo */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Flujo 100 m³/h:</span>
                <span className="text-white font-bold">{flujo100}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Flujo 200 m³/h:</span>
                <span className="text-white font-bold">{flujo200}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 md:ml-0 bg-gray-900">
          <main className="p-6 h-full overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mensaje de jaula seleccionada */}
      {mostrarMensajeJaula && (
        <div className="fixed bottom-16 right-4 z-50 pointer-events-none">
          <div className="bg-gray-700 border-2 border-green-500 text-green-400 px-6 py-3 rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              <span className="text-lg font-bold">
                🐟 Jaula {jaulaSeleccionada} seleccionada
              </span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
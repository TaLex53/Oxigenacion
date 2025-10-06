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
  Monitor
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
  const [flujo100, setFlujo100] = useState(0);
  const [flujo200, setFlujo200] = useState(0);
  const [clientes, setClientes] = useState<string[]>([]);
  
  const connectionStatus = useConnectionStatus();

  // Cargar clientes al montar el componente
  useEffect(() => {
    const loadClientes = async () => {
      try {
        console.log('🔄 Cargando clientes...');
        const clientesData = await clienteAPI.getClientes();
        console.log('📊 Datos de clientes recibidos:', clientesData);
        setClientes(clientesData);
      } catch (error) {
        console.error('❌ Error cargando clientes:', error);
        // En caso de error, mantener array vacío
        setClientes([]);
      }
    };

    loadClientes();
  }, []);

  // Cargar datos de flujo periódicamente
  useEffect(() => {
    const loadFlujoData = async () => {
      try {
        console.log('🔄 Cargando datos de flujo...');
        
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
        console.log('📊 Datos recibidos:', data.data.flujos);
        if (data.success && data.data.flujos) {
          setFlujo100(data.data.flujos.flujo100 || 0);
          setFlujo200(data.data.flujos.flujo200 || 0);
          console.log(`✅ Flujos actualizados - 100: ${data.data.flujos.flujo100}, 200: ${data.data.flujos.flujo200}`);
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

  const handleConfigurarJaula = (id: number) => {
    setJaulaSeleccionada(id);
    console.log('Configurar jaula:', id);
  };


  const handleCerrarTodo = () => {
    console.log('Cerrar todas las válvulas');
  };

  const handleToggleOxigeno = async () => {
    try {
      const action = oxigenoActivo ? 'cerrar' : 'abrir';
      console.log(`🔄 ${action === 'abrir' ? 'Iniciando' : 'Cerrando'} oxígeno para jaula ${jaulaSeleccionada}`);
      
      // Llamar a la API para controlar la jaula
      const result = await jaulaAPI.controlarJaula(
        jaulaSeleccionada, 
        action, 
        supervisor, 
        cliente, 
        inyeccion
      );
      
      if (result.success) {
        setOxigenoActivo(!oxigenoActivo);
        
        if (action === 'abrir') {
          console.log(`✅ Oxígeno iniciado para jaula ${jaulaSeleccionada}`);
          console.log(`   Cliente: ${cliente}`);
          console.log(`   Supervisor: ${supervisor}`);
          console.log(`   Inyección: ${inyeccion}`);
          console.log(`   Min: ${minimo} mg/L, Max: ${maximo} mg/L`);
        } else {
          console.log(`🛑 Oxígeno cerrado para jaula ${jaulaSeleccionada}`);
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
        return <Dashboard onConfigurarJaula={handleConfigurarJaula} />;
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
        return <Dashboard onConfigurarJaula={handleConfigurarJaula} />;
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
                  connectionStatus.isApiConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-300">
                  {connectionStatus.isApiConnected ? 'Conectado' : 'Desconectado'}
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
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-green-400">Conectado</span>
                <Monitor className="w-4 h-4 text-gray-400 ml-4" />
                <span className="text-sm text-gray-400 ml-1">Diagnóstico</span>
              </div>
            </div>

            {/* Sección JAULA */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">JAULA {jaulaSeleccionada}</h3>
              
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
                    type="text"
                    value={minimo}
                    onChange={(e) => setMinimo(e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Max. mg/L:</label>
                  <input 
                    type="text"
                    value={maximo}
                    onChange={(e) => setMaximo(e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
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

            {/* Botón Cerrar todo */}
            <div className="mt-auto">
              <button
                onClick={handleCerrarTodo}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm"
              >
                Cerrar todo
              </button>
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
    </div>
  );
}
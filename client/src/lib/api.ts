import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Solo devolver datos por defecto para errores de conexión específicos
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || 
        error.code === 'ERR_NETWORK' ||
        (error.message && (
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('Network Error')
        ))) {
      console.warn('⚠️ Error de conexión - usando datos por defecto');
      return Promise.resolve({
        data: {
          success: true,
          data: {
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
          }
        }
      });
    }
    
    return Promise.reject(error);
  }
);

export interface JaulaData {
  id: number;
  modulo: number;
  nivel: string;
  empresa: string;
  activa: number;
  CantPeces: number;
  supervisor: string;
  inyeccion: string;
}

export interface EstadoJaulas {
  modulo100: {
    niveles: string[];
    empresas: string[];
    activas: number[];
    CantPeces: number[];
    supervisores: string[];
    inyeccion: string[];
  };
  modulo200: {
    niveles: string[];
    empresas: string[];
    activas: number[];
    CantPeces: number[];
    supervisores: string[];
    inyeccion: string[];
  };
  flujos: {
    flujo100: number;
    flujo200: number;
  };
  conexion: boolean;
}

export interface Cliente {
  nombre: string;
  rut: string;
}

export interface LimitesJaula {
  jaula: number;
  minimo: number;
  maximo: number;
}

export interface EstadoSistema {
  conexionPLC: boolean;
  flujos: {
    flujo100: number;
    flujo200: number;
  };
  totalJaulas: number;
  jaulasActivas: number;
  jaulasInyectando: number;
  timestamp: string;
}

// API Functions
export const jaulaAPI = {
  // Obtener estado de todas las jaulas
  getEstadoJaulas: async (): Promise<EstadoJaulas> => {
    const response = await api.get('/jaulas');
    return response.data.data;
  },

  // Obtener estado de una jaula específica
  getJaula: async (id: number): Promise<JaulaData> => {
    const response = await api.get(`/jaulas/${id}`);
    return response.data.data;
  },

  // Controlar jaula
  controlarJaula: async (
    id: number, 
    action: 'abrir' | 'cerrar', 
    supervisor?: string, 
    cliente?: string, 
    inyeccion?: string,
    minimo?: number,
    maximo?: number
  ) => {
    const response = await api.post(`/jaulas/${id}/control`, {
      action,
      supervisor,
      cliente,
      inyeccion,
      minimo,
      maximo
    });
    return response.data;
  },

  // Cerrar todas las válvulas
  cerrarTodasLasValvulas: async () => {
    const response = await api.post('/jaulas/cerrar-todas');
    return response.data;
  },

  // Obtener límites de jaula
  getLimites: async (id: number): Promise<LimitesJaula> => {
    const response = await api.get(`/jaulas/${id}/limites`);
    return response.data.data;
  },

  // Configurar límites de jaula
  configurarLimites: async (id: number, minimo: number, maximo: number) => {
    const response = await api.put(`/jaulas/${id}/limites`, {
      minimo,
      maximo
    });
    return response.data;
  }
};

export const clienteAPI = {
  // Obtener lista de clientes
  getClientes: async (): Promise<string[]> => {
    const response = await api.get('/clientes');
    return response.data.data;
  },

  // Agregar cliente
  agregarCliente: async (rut: string, nombre: string) => {
    const response = await api.post('/clientes', { rut, nombre });
    return response.data;
  }
};

export const reporteAPI = {
  // Obtener registros de jaulas
  getRegistros: async (fechaInicio: string, fechaFin: string, jaula?: string) => {
    const response = await api.get('/reportes/registros', {
      params: { fechaInicio, fechaFin, jaula }
    });
    return response.data.data;
  },

  // Obtener registros de clientes
  getRegistrosClientes: async (fechaInicio: string, fechaFin: string, cliente?: string) => {
    const response = await api.get('/reportes/clientes', {
      params: { fechaInicio, fechaFin, cliente }
    });
    return response.data.data;
  }
};

export const sistemaAPI = {
  // Obtener estado del sistema
  getEstadoSistema: async (): Promise<EstadoSistema> => {
    const response = await api.get('/sistema/estado');
    return response.data.data;
  },

  // Reiniciar sistema
  reiniciarSistema: async () => {
    const response = await api.post('/sistema/reiniciar');
    return response.data;
  }
};

export default api;

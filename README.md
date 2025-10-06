# Sistema de Control de Oxígeno - Migración Web

Este proyecto es la migración completa del sistema de control de oxígeno de C# WinForms a una arquitectura web moderna usando Next.js y Node.js.

## 🏗️ Arquitectura

- **Frontend**: Next.js 14 con React, TypeScript y Tailwind CSS
- **Backend**: Node.js con Express y Socket.IO
- **Comunicación PLC**: Modbus TCP (mantiene compatibilidad con sistema actual)
- **Base de Datos**: MySQL (misma estructura que el sistema original)
- **Tiempo Real**: WebSockets para actualizaciones en vivo

## 🚀 Características

### ✅ Implementado
- ✅ Comunicación Modbus TCP con PLCs
- ✅ Visualización en tiempo real de 40 jaulas
- ✅ Control manual de válvulas de oxígeno
- ✅ Sistema de alertas automáticas
- ✅ Interfaz responsive y moderna
- ✅ WebSockets para actualizaciones en vivo
- ✅ API REST completa

### 🔄 En Desarrollo
- 🔄 Configuración de límites por jaula
- 🔄 Gestión de clientes
- 🔄 Generación de reportes Excel
- 🔄 Sistema de usuarios y permisos

## 📁 Estructura del Proyecto

```
GUI_MODERNISTA_WEB/
├── client/                 # Frontend Next.js
│   ├── src/
│   │   ├── app/           # Páginas de Next.js
│   │   ├── components/    # Componentes React
│   │   └── lib/          # Utilidades y API
│   └── package.json
├── server/                # Backend Node.js
│   ├── controllers/       # Controladores de lógica
│   ├── services/         # Servicios (Modbus, DB, Email)
│   ├── routes/           # Rutas de API
│   └── index.js          # Servidor principal
└── package.json          # Scripts de desarrollo
```

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- MySQL 8.0+
- PLC con Modbus TCP habilitado

### 1. Instalar Dependencias

```bash
# Instalar dependencias de todos los proyectos
npm run install-all
```

### 2. Configurar Base de Datos

1. Crear base de datos MySQL:
```sql
CREATE DATABASE db_oxigeno;
```

2. Importar estructura desde el sistema original

### 3. Configurar Variables de Entorno

Editar `server/config.js`:
```javascript
module.exports = {
  PLC_IP: '192.168.0.253',    // IP del PLC
  PLC_PORT: 502,               // Puerto Modbus
  DB_HOST: '127.0.0.1',       // Host MySQL
  DB_USER: 'root',            // Usuario MySQL
  DB_PASSWORD: '',            // Contraseña MySQL
  DB_NAME: 'db_oxigeno',      // Nombre de BD
  // ... más configuraciones
};
```

### 4. Ejecutar el Sistema

```bash
# Desarrollo (ambos servidores)
npm run dev

# O ejecutar por separado:
npm run server    # Backend en puerto 3001
npm run client    # Frontend en puerto 3000
```

## 🌐 Acceso al Sistema

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📡 API Endpoints

### Jaulas
- `GET /api/jaulas` - Estado de todas las jaulas
- `GET /api/jaulas/:id` - Estado de jaula específica
- `POST /api/jaulas/:id/control` - Controlar jaula
- `POST /api/jaulas/cerrar-todas` - Cerrar todas las válvulas

### Configuración
- `GET /api/jaulas/:id/limites` - Obtener límites de jaula
- `PUT /api/jaulas/:id/limites` - Configurar límites

### Clientes
- `GET /api/clientes` - Lista de clientes
- `POST /api/clientes` - Agregar cliente

### Reportes
- `GET /api/reportes/registros` - Registros de jaulas
- `GET /api/reportes/clientes` - Registros de clientes

### Sistema
- `GET /api/sistema/estado` - Estado del sistema
- `POST /api/sistema/reiniciar` - Reiniciar sistema

## 🔧 Configuración del PLC

El sistema mantiene la misma configuración Modbus TCP que el sistema original:

- **IP**: 192.168.0.253
- **Puerto**: 502
- **Registros de Lectura**:
  - 3001-3023: Módulo 100 (jaulas 101-120)
  - 3024-3046: Módulo 200 (jaulas 201-220)
- **Registros de Escritura**:
  - 3046-3065: Control válvulas módulo 100
  - 3066-3085: Control válvulas módulo 200

## 🚨 Sistema de Alertas

El sistema envía alertas automáticas por email cuando:
- Una jaula lleva 30+ minutos inyectando oxígeno
- Una jaula lleva 1+ hora inyectando oxígeno
- Una jaula lleva 1.5+ horas inyectando oxígeno
- Una jaula lleva 2+ horas inyectando oxígeno

## 🔄 Migración desde Sistema Original

### Ventajas de la Migración
1. **Acceso Web**: Disponible desde cualquier dispositivo
2. **Tiempo Real**: Actualizaciones instantáneas
3. **Multi-usuario**: Múltiples operadores simultáneos
4. **Responsive**: Funciona en móviles y tablets
5. **Mantenible**: Código moderno y documentado
6. **Escalable**: Fácil agregar nuevas funcionalidades

### Compatibilidad
- ✅ Misma base de datos MySQL
- ✅ Mismo protocolo Modbus TCP
- ✅ Misma lógica de control automático
- ✅ Mismo sistema de alertas
- ✅ Misma configuración de PLC

## 🐛 Solución de Problemas

### Error de Conexión PLC
1. Verificar IP y puerto en `server/config.js`
2. Comprobar que el PLC esté encendido
3. Verificar conectividad de red

### Error de Base de Datos
1. Verificar credenciales en `server/config.js`
2. Comprobar que MySQL esté ejecutándose
3. Verificar que la base de datos existe

### Error de WebSocket
1. Verificar que el puerto 3001 esté disponible
2. Comprobar configuración de CORS
3. Verificar firewall

## 📝 Logs

Los logs del sistema se muestran en la consola:
- ✅ Conexiones exitosas
- ❌ Errores de conexión
- 🔧 Acciones de control
- 📧 Envío de alertas

## 🤝 Contribución

Para contribuir al proyecto:
1. Fork el repositorio
2. Crear una rama para tu feature
3. Hacer commit de tus cambios
4. Push a la rama
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📞 Soporte

Para soporte técnico, contactar al equipo de desarrollo.

---

**Nota**: Este sistema mantiene 100% de compatibilidad con el sistema original de C#, incluyendo la misma base de datos, protocolo de comunicación y lógica de negocio.

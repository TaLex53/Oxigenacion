# Arquitectura de Base de Datos Dual - Sistema ABICK

## 📊 Descripción General

El sistema SCADA de ABICK utiliza una arquitectura de base de datos dual para garantizar redundancia, sincronización y alta disponibilidad.

## 🔄 Arquitectura Implementada

### 1. Base de Datos Local (ReadConnection)
- **Servidor**: `127.0.0.1` (localhost)
- **Base de datos**: `db_oxigeno`
- **Usuario**: `root`
- **Contraseña**: (vacía)
- **Propósito**: Operaciones principales del sistema

### 2. Base de Datos Remota (ReadConnectionHost)
- **Servidor**: `138.255.103.114`
- **Base de datos**: `svsmarte_db_oxigeno`
- **Usuario**: `svsmarte_svsmarte`
- **Contraseña**: `xN88ZfEp3t*(Y0`
- **Propósito**: Sincronización y respaldo centralizado

## ⚙️ Configuración

### Variables de Entorno
```bash
# Base de datos local
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=db_oxigeno

# Base de datos remota
DB_HOST_REMOTE=138.255.103.114
DB_USER_REMOTE=svsmarte_svsmarte
DB_PASSWORD_REMOTE=xN88ZfEp3t*(Y0
DB_NAME_REMOTE=svsmarte_db_oxigeno
```

## 🔄 Flujo de Sincronización

### Escritura Dual
1. **Escritura Local**: Todos los datos se almacenan primero en la base local
2. **Sincronización Remota**: Los datos se envían al servidor remoto cada 60 segundos
3. **Manejo de Errores**: Si falla la conexión remota, el sistema continúa con la base local

### Proceso de Sincronización
```javascript
// Cada 60 segundos
setInterval(async () => {
  await syncToRemote();
}, 60000);
```

## 🎯 Ventajas de esta Arquitectura

### ✅ Alta Disponibilidad
- El sistema funciona aunque falle la conexión a internet
- Operación autónoma con base de datos local

### ✅ Respaldo Automático
- Los datos se replican automáticamente al servidor remoto
- Sincronización cada 60 segundos

### ✅ Rendimiento
- Consultas frecuentes se realizan localmente sin latencia de red
- Operaciones inmediatas en base local

### ✅ Escalabilidad
- Permite monitoreo centralizado de múltiples plantas ABICK
- Datos centralizados para análisis corporativo

## 🛠️ Implementación Técnica

### Clase DatabaseService
```javascript
class DatabaseService {
  constructor() {
    this.localConnection = null;    // Conexión local
    this.remoteConnection = null;   // Conexión remota
    this.syncInterval = null;       // Intervalo de sincronización
  }
}
```

### Métodos Principales
- `connect()`: Establece ambas conexiones
- `syncToRemote()`: Sincroniza datos a la base remota
- `startSync()`: Inicia el proceso de sincronización
- `disconnect()`: Cierra ambas conexiones

## 📋 Tablas Sincronizadas

### Registros de Jaulas
- `registros`: Datos de niveles de oxígeno
- `registroclientes`: Procesos de clientes
- `estanque`: Niveles de tanques

### Datos de Configuración
- `cliente`: Información de clientes
- `jaulas`: Configuración de jaulas

## 🔧 Configuración del Sistema

### 1. Base de Datos Local
- Debe estar instalada y funcionando
- Tablas creadas según el esquema del sistema

### 2. Base de Datos Remota
- Configurar credenciales en variables de entorno
- El sistema intentará conectar automáticamente
- Si falla, continúa solo con base local

### 3. Sincronización
- Se inicia automáticamente al conectar
- Intervalo configurable (por defecto 60 segundos)
- Logs detallados del proceso

## 📊 Monitoreo

### Logs del Sistema
```
✅ Conectado a MySQL Local (ReadConnection)
✅ Conectado a MySQL Remota (ReadConnectionHost)
🔄 Sincronización iniciada cada 60 segundos
📤 Sincronizados X registros a la base remota
```

### Manejo de Errores
```
⚠️ No se pudo conectar a MySQL Remota: [error]
🔄 Continuando solo con base de datos local
❌ Error en sincronización remota: [error]
```

## 🚀 Uso en Producción

Esta arquitectura es ideal para sistemas industriales donde:
- La continuidad operacional es crítica
- Se requiere respaldo automático de datos
- Necesita monitoreo centralizado
- Debe funcionar sin conexión a internet

El sistema garantiza que las operaciones críticas nunca se interrumpan, mientras mantiene la capacidad de sincronización y respaldo automático.

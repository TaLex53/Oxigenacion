# 🚀 Configuración PM2 - Servidor Abick Oxigeno

## ✅ **CONFIGURACIÓN COMPLETADA**

El servidor Abick Oxigeno está configurado para ejecutarse con PM2, garantizando:
- ✅ **Ejecución continua** del servidor
- ✅ **Reinicio automático** en caso de fallos
- ✅ **Monitoreo de recursos** en tiempo real
- ✅ **Logs centralizados** y organizados
- ✅ **Sincronización con ReadConnectionHost** (138.255.103.114)

## 📋 **SCRIPTS DISPONIBLES**

### 1. **iniciar-servidor.bat**
```bash
# Inicia el servidor con PM2
iniciar-servidor.bat
```

### 2. **gestionar-servidor.bat**
```bash
# Menú completo de gestión del servidor
gestionar-servidor.bat
```

## 🔧 **COMANDOS PM2 ÚTILES**

### **Gestión Básica:**
```bash
pm2 status                    # Ver estado de procesos
pm2 start server/index.js     # Iniciar servidor
pm2 stop abick-oxigeno-server # Detener servidor
pm2 restart abick-oxigeno-server # Reiniciar servidor
pm2 delete abick-oxigeno-server # Eliminar proceso
```

### **Monitoreo:**
```bash
pm2 logs abick-oxigeno-server  # Ver logs en tiempo real
pm2 logs abick-oxigeno-server --err # Solo logs de error
pm2 monit                      # Monitor de recursos
```

### **Configuración Avanzada:**
```bash
pm2 startup                    # Configurar inicio automático
pm2 save                       # Guardar configuración actual
pm2 resurrect                  # Restaurar procesos guardados
```

## 🌐 **SERVIDOR EN FUNCIONAMIENTO**

- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **WebSocket**: Puerto 3002
- **Estado**: ✅ ONLINE

## 📊 **CARACTERÍSTICAS IMPLEMENTADAS**

### **Sincronización con ReadConnectionHost:**
- ✅ **IP**: 138.255.103.114
- ✅ **Base de datos**: svsmarte_db_oxigeno
- ✅ **Sincronización inmediata** de inyecciones
- ✅ **Logs detallados** de envío al sistema en línea

### **Gestión de Inyecciones:**
- ✅ **Modo Seteo** (5.5-5.5): Oscila sin cerrarse automáticamente
- ✅ **Modo Rango** (9.9-10): Se cierra automáticamente en el máximo
- ✅ **Modo "A Pedido"**: Solo se cierra manualmente
- ✅ **Envío inmediato** al ReadConnectionHost

## 🎯 **PRÓXIMOS PASOS**

1. **Configurar inicio automático**:
   ```bash
   pm2 startup
   pm2 save
   ```

2. **Verificar conectividad** con ReadConnectionHost:
   - IP: 138.255.103.114
   - Puerto: 3306
   - Base: svsmarte_db_oxigeno

3. **Monitorear logs**:
   ```bash
   pm2 logs abick-oxigeno-server
   ```

## 📁 **ARCHIVOS CREADOS**

- `ecosystem.config.js` - Configuración PM2
- `iniciar-servidor.bat` - Script de inicio
- `gestionar-servidor.bat` - Gestión completa
- `start-pm2.bat` - Inicio con configuración
- `pm2-manager.bat` - Gestor avanzado
- `install-pm2-service.bat` - Instalación como servicio

## ✅ **ESTADO ACTUAL**

```
┌────┬─────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name                    │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────────────────┼─────────────┬─────────┬─────────┬──────────┬────────┼──────┼───────────┬──────────┬──────────┬──────────┬──────────┤
│ 0  │ abick-oxigeno-server   │ default     │ 1.0.0  │ fork    │ 24756   │ 7s     │ 0    │ online    │ 0%       │ 0b       │ Depto. … │ enabled  │
└────┴─────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┬──────────┬──────────┬──────────┘
```

**🎉 ¡SERVIDOR CONFIGURADO Y FUNCIONANDO CON PM2!**

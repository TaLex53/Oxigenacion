module.exports = {
  apps: [
    {
      name: 'abick-oxigeno-server',
      script: 'npm',
      args: 'run dev',
      cwd: './server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Configuración de logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configuración de reinicio automático
      min_uptime: '10s',
      max_restarts: 10,
      
      // Configuración de monitoreo
      monitoring: true,
      
      // Variables de entorno específicas
      env_file: './server/.env'
    }
  ],

  // Configuración de despliegue (opcional)
  deploy: {
    production: {
      user: 'node',
      host: '138.255.103.114',
      ref: 'origin/main',
      repo: 'git@github.com:usuario/abick-oxigeno.git',
      path: '/var/www/abick-oxigeno',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};

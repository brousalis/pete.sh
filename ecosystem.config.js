/**
 * PM2 Ecosystem Configuration
 * Manages the petehome application processes
 *
 * Usage:
 *   pm2 start ecosystem.config.js --only petehome
 *   pm2 start ecosystem.config.js --only petehome-notifications
 *   pm2 stop petehome
 *   pm2 restart petehome
 *   pm2 logs petehome
 *   pm2 status
 */

const path = require('path')

const webAppDir = path.join(__dirname, 'apps', 'web')

module.exports = {
  apps: [
    {
      // Main dev server - HTTPS mode for hybrid mode from production site
      name: 'petehome',
      script: path.join(webAppDir, 'scripts', 'pm2-start-https.js'),
      cwd: webAppDir,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        FORCE_COLOR: '1',  // Enable ANSI colors in logs
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      // Vercel deploy notification watcher – polls Vercel API, shows Windows toasts
      name: 'petehome-notifications',
      script: path.join(webAppDir, 'scripts', 'vercel-deploy-toast.js'),
      args: '--watch',
      cwd: webAppDir,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      error_file: path.join(__dirname, 'logs', 'pm2-notifications-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-notifications-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-notifications-combined.log'),
      time: true,
      min_uptime: '5s',
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
}

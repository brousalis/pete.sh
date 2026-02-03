/**
 * PM2 Ecosystem Configuration
 * Manages the petehome application process
 *
 * Usage:
 *   pm2 start ecosystem.config.js --only petehome
 *   pm2 start ecosystem.config.js --only petehome-dev
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
      // Production mode - runs built app
      name: 'petehome',
      script: path.join(webAppDir, 'scripts', 'pm2-start-prod.js'),
      cwd: webAppDir,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      // Development mode - hot reload enabled
      name: 'petehome-dev',
      script: path.join(webAppDir, 'scripts', 'pm2-start-dev.js'),
      cwd: webAppDir,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      autorestart: true,
      watch: false, // Next.js handles its own watching
      max_memory_restart: '2G',
      error_file: path.join(__dirname, 'logs', 'pm2-dev-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-dev-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-dev-combined.log'),
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      // HTTPS development mode - for hybrid mode from production site
      name: 'petehome-https',
      script: path.join(webAppDir, 'scripts', 'pm2-start-https.js'),
      cwd: webAppDir,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: path.join(__dirname, 'logs', 'pm2-https-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-https-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-https-combined.log'),
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
}

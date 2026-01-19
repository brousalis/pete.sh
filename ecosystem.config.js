/**
 * PM2 Ecosystem Configuration
 * Manages the Petehome application process
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop petehome
 *   pm2 restart petehome
 *   pm2 logs petehome
 *   pm2 status
 */

const path = require('path');
const isWindows = process.platform === 'win32';

// Use node to run Next.js directly (works on both Windows and Linux)
const nextBinary = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

module.exports = {
  apps: [
    {
      name: 'petehome',
      script: 'node',
      args: `"${nextBinary}" start -H 0.0.0.0`, // Bind to all interfaces for local network access
      cwd: process.cwd(), // Use current working directory (works on both Windows and Linux)
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0', // Ensure binding to all interfaces
      },
      // Auto-restart settings
      autorestart: true,
      watch: false, // Set to true only for development
      max_memory_restart: '1G',

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,

      // Advanced settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};

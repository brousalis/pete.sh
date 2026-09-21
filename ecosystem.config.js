/**
 * PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js --only petehome
 *   pm2 start ecosystem.config.js --only petehome-worker
 *   pm2 stop petehome
 *   pm2 restart petehome
 *   pm2 logs petehome
 *   pm2 status
 */

const fs = require('fs')
const path = require('path')

const webAppDir = path.join(__dirname, 'apps', 'web')
const coachWorkerDir = path.join(__dirname, 'apps', 'coach-worker')

/** Yarn workspaces hoist tsx to the monorepo root; fall back to a local install. */
function resolveTsxCli() {
  const candidates = [
    path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    path.join(coachWorkerDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[0]
}

module.exports = {
  apps: [
    {
      // Local HTTPS Next server for petehome PWA + APIs (LAN / .local)
      name: 'petehome',
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
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      // petehome worker – scheduled agent jobs, analytics recompute, push.
      // Runs on the home PC so long jobs are not bound by HTTP timeouts.
      name: 'petehome-worker',
      script: resolveTsxCli(),
      args: path.join(coachWorkerDir, 'src', 'index.ts'),
      cwd: coachWorkerDir,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        COACH_WORKER_PORT: 3021,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: path.join(__dirname, 'logs', 'pm2-coach-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-coach-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-coach-combined.log'),
      time: true,
      min_uptime: '15s',
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
}

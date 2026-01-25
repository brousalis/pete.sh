#!/usr/bin/env node
/**
 * Petehome Sync Worker
 * A standalone Node.js script that periodically calls the sync API.
 * Can be run with PM2 for continuous background syncing.
 * 
 * Usage:
 *   node scripts/sync-worker.js                    # Run with default 30s interval
 *   node scripts/sync-worker.js --interval 60000  # Run with 60s interval
 *   node scripts/sync-worker.js --once            # Run once and exit
 * 
 * With PM2:
 *   pm2 start scripts/sync-worker.js --name petehome-sync
 */

const http = require('http');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  if (typeof defaultValue === 'boolean') return true;
  return args[index + 1] || defaultValue;
};

const INTERVAL = parseInt(getArg('interval', '30000'), 10);
const BASE_URL = getArg('url', 'http://localhost:3000');
const RUN_ONCE = getArg('once', false);
const DEBUG = getArg('debug', false);

function log(level, message, data = '') {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[37m',    // White
    SUCCESS: '\x1b[32m', // Green
    ERROR: '\x1b[31m',   // Red
    WARN: '\x1b[33m',    // Yellow
    RESET: '\x1b[0m'
  };
  console.log(`${colors[level] || ''}[${timestamp}] [${level}] ${message}${colors.RESET}`, data);
}

function performSync() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/sync', BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = JSON.stringify({ includeAuth: false });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    if (DEBUG) {
      log('INFO', `Calling ${url.href}`);
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.data) {
            const { totalRecordsWritten, durationMs, services } = result.data;
            const serviceInfo = services
              .map(s => `${s.service}: ${s.success ? s.recordsWritten : 'FAILED'}`)
              .join(', ');
            log('SUCCESS', `Sync completed: ${totalRecordsWritten} records in ${durationMs}ms [${serviceInfo}]`);
          } else {
            log('WARN', 'Sync returned unsuccessful response', result);
          }
          resolve(result);
        } catch (e) {
          log('ERROR', 'Failed to parse response', e.message);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      log('ERROR', `Sync failed: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        log('WARN', 'Is the dev server running? Try: yarn dev');
      }
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  log('INFO', 'Petehome Sync Worker Started');
  log('INFO', `Base URL: ${BASE_URL}`);
  log('INFO', `Interval: ${INTERVAL}ms`);
  log('INFO', '---');

  if (RUN_ONCE) {
    try {
      await performSync();
    } catch (e) {
      process.exit(1);
    }
    return;
  }

  // Initial sync
  await performSync().catch(() => {});

  // Set up interval
  setInterval(async () => {
    await performSync().catch(() => {});
  }, INTERVAL);

  // Keep process alive
  log('INFO', `Running every ${INTERVAL / 1000}s (Ctrl+C to stop)`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('INFO', 'Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', 'Shutting down...');
  process.exit(0);
});

main();

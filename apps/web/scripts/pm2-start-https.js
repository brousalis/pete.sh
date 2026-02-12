#!/usr/bin/env node
/**
 * PM2 wrapper script for running Next.js with HTTPS
 * Requires SSL certificates in apps/web/certs/
 */

const { spawn } = require('child_process')
const os = require('os')
const path = require('path')
const fs = require('fs')

const machineHostname = os.hostname().toLowerCase()

const serverPath = path.join(__dirname, '..', 'server.mjs')
const certDir = path.join(__dirname, '..', 'certs')

// Check if server.mjs exists
if (!fs.existsSync(serverPath)) {
  console.error('❌ server.mjs not found!')
  process.exit(1)
}

// Check if certificates exist
const keyPath = path.join(certDir, 'localhost-key.pem')
const certPath = path.join(certDir, 'localhost.pem')

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ SSL certificates not found!')
  console.error('')
  console.error('Generate them with mkcert:')
  console.error('')
  console.error('  cd apps/web/certs')
  console.error(
    `  mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ${machineHostname}.local ${machineHostname}`
  )
  console.error('')
  process.exit(1)
}

console.log(`Starting Next.js HTTPS server...`)
console.log(`Command: node ${serverPath}`)

const child = spawn('node', [serverPath], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  windowsHide: true,
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CUSTOM_SERVER: 'true',
  },
})

child.on('error', err => {
  console.error('Failed to start:', err)
  process.exit(1)
})

child.on('exit', code => {
  process.exit(code || 0)
})

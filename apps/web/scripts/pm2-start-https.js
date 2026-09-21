#!/usr/bin/env node
/**
 * PM2 wrapper for the petehome Next server.
 *
 * Serves plain HTTP by default. Set PETEHOME_HTTPS=1 to run TLS, which needs
 * mkcert certificates in apps/web/certs/.
 */

const { spawn } = require('child_process')
const os = require('os')
const path = require('path')
const fs = require('fs')

const machineHostname = os.hostname().toLowerCase()

const serverPath = path.join(__dirname, '..', 'server.mjs')
const certDir = path.join(__dirname, '..', 'certs')

const useHttps = process.env.PETEHOME_HTTPS === '1'

if (!fs.existsSync(serverPath)) {
  console.error('❌ server.mjs not found!')
  process.exit(1)
}

if (useHttps) {
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
    console.error('Or unset PETEHOME_HTTPS to serve plain HTTP.')
    process.exit(1)
  }
}

const args = [serverPath]
if (useHttps) args.push('--https')

console.log(`Starting Next.js server over ${useHttps ? 'HTTPS' : 'HTTP'}...`)

const child = spawn('node', args, {
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

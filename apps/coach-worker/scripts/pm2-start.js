#!/usr/bin/env node
/**
 * PM2 wrapper for the petehome worker.
 *
 * Spawns tsx with windowsHide so Windows does not open a visible node.exe
 * console when the process is started from the CLI or PM2.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const workerDir = path.join(__dirname, '..')
const repoRoot = path.join(workerDir, '..', '..')
const indexTs = path.join(workerDir, 'src', 'index.ts')

function resolveTsxCli() {
  const candidates = [
    path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    path.join(workerDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[0]
}

const tsxCli = resolveTsxCli()

if (!fs.existsSync(tsxCli)) {
  console.error('❌ tsx CLI not found. Run yarn install from the repo root.')
  process.exit(1)
}

if (!fs.existsSync(indexTs)) {
  console.error('❌ worker entry not found:', indexTs)
  process.exit(1)
}

const child = spawn(process.execPath, [tsxCli, indexTs], {
  cwd: workerDir,
  stdio: 'inherit',
  windowsHide: true,
  env: process.env,
})

child.on('error', (err) => {
  console.error('Failed to start worker:', err)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code || 0)
})

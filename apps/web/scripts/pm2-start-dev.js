#!/usr/bin/env node
/**
 * PM2 wrapper script for running Next.js in development mode
 * This avoids Windows CMD script issues with PM2
 */

const { spawn } = require('child_process');
const path = require('path');

const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
const args = ['dev', '-H', '0.0.0.0', '-p', '3000'];

console.log(`Starting Next.js dev server...`);
console.log(`Command: ${nextBin} ${args.join(' ')}`);

const child = spawn(process.platform === 'win32' ? `${nextBin}.cmd` : nextBin, args, {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  windowsHide: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
  }
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

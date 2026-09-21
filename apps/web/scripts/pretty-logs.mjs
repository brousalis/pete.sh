#!/usr/bin/env node
/**
 * Pretty Log Viewer for petehome
 *
 * Reads PM2 logs and displays them with enhanced formatting.
 *
 * Usage:
 *   node scripts/pretty-logs.mjs              # Live tail of logs
 *   node scripts/pretty-logs.mjs --stats      # Show stats summary
 *   node scripts/pretty-logs.mjs --last 100   # Show last 100 lines
 *   node scripts/pretty-logs.mjs --filter coach  # Filter by service
 */

import { spawn } from 'child_process'
import { createReadStream, existsSync } from 'fs'
import { createInterface } from 'readline'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============================================================================
// ANSI Colors
// ============================================================================
const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightRed: '\x1b[91m',
  brightBlack: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
}

// ============================================================================
// Service Configuration
// ============================================================================
const services = {
  coach: { icon: '🏃', color: c.brightGreen, name: 'Coach' },
  'apple-health': { icon: '❤️', color: c.red, name: 'Apple Health' },
  health: { icon: '💓', color: c.green, name: 'Health' },
  calendar: { icon: '📅', color: c.magenta, name: 'Calendar' },
}

const methodColors = {
  GET: c.brightGreen,
  POST: c.brightYellow,
  PUT: c.brightBlue,
  PATCH: c.brightMagenta,
  DELETE: c.brightRed,
}

// ============================================================================
// Stats Tracking
// ============================================================================
const stats = new Map()

function recordStats(path, durationMs, status) {
  const existing = stats.get(path)
  const isError = status >= 400

  if (existing) {
    existing.count++
    existing.totalDuration += durationMs
    existing.minDuration = Math.min(existing.minDuration, durationMs)
    existing.maxDuration = Math.max(existing.maxDuration, durationMs)
    if (isError) existing.errors++
  } else {
    stats.set(path, {
      count: 1,
      totalDuration: durationMs,
      minDuration: durationMs,
      maxDuration: durationMs,
      errors: isError ? 1 : 0,
    })
  }
}

function printStats() {
  if (stats.size === 0) {
    console.log(`${c.yellow}No requests recorded${c.reset}`)
    return
  }

  const divider = `${c.dim}${'─'.repeat(85)}${c.reset}`

  console.log('\n' + divider)
  console.log(`${c.bold}${c.cyan}📊 Request Statistics${c.reset}`)
  console.log(divider)
  console.log(
    `${c.dim}${'ENDPOINT'.padEnd(40)} ${'CALLS'.padStart(6)} ${'AVG'.padStart(8)} ${'MIN'.padStart(8)} ${'MAX'.padStart(8)} ${'ERRORS'.padStart(7)}${c.reset}`
  )
  console.log(divider)

  const sorted = [...stats.entries()].sort((a, b) => b[1].count - a[1].count)

  for (const [path, data] of sorted.slice(0, 20)) {
    const avgDuration = Math.round(data.totalDuration / data.count)
    const service = getService(path)

    const errorStr = data.errors > 0
      ? `${c.red}${String(data.errors).padStart(7)}${c.reset}`
      : `${c.dim}${String(0).padStart(7)}${c.reset}`

    console.log(
      `${service.icon} ${service.color}${path.slice(0, 38).padEnd(38)}${c.reset} ` +
      `${String(data.count).padStart(6)} ` +
      `${formatDuration(avgDuration).padStart(8)} ` +
      `${formatDuration(data.minDuration).padStart(8)} ` +
      `${formatDuration(data.maxDuration).padStart(8)} ` +
      errorStr
    )
  }

  if (sorted.length > 20) {
    console.log(`${c.dim}  ... and ${sorted.length - 20} more endpoints${c.reset}`)
  }

  // Summary
  const totalRequests = [...stats.values()].reduce((sum, s) => sum + s.count, 0)
  const totalErrors = [...stats.values()].reduce((sum, s) => sum + s.errors, 0)
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(1) : 0

  console.log(divider)
  console.log(
    `${c.bold}Total:${c.reset} ${totalRequests} requests, ` +
    `${c.bold}Errors:${c.reset} ${totalErrors} (${errorRate}%), ` +
    `${c.bold}Endpoints:${c.reset} ${stats.size}`
  )
  console.log(divider + '\n')
}

// ============================================================================
// Parsing & Formatting
// ============================================================================
function getService(path) {
  const match = path.match(/^\/api\/([^/?]+)/)
  if (match) {
    return services[match[1]] || { icon: '📡', color: c.white, name: 'API' }
  }
  return { icon: '📡', color: c.white, name: 'API' }
}

function formatDuration(ms) {
  if (ms < 1) return `${Math.round(ms * 1000)}µs`
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function parseDuration(str) {
  if (!str) return 0
  const match = str.match(/([\d.]+)(µs|ms|s)/)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2]
  if (unit === 'µs') return value / 1000
  if (unit === 's') return value * 1000
  return value
}

function getStatusColor(status) {
  if (status >= 500) return c.red
  if (status >= 400) return c.yellow
  if (status >= 300) return c.cyan
  if (status >= 200) return c.green
  return c.white
}

function getStatusIcon(status) {
  if (status >= 500) return '💥'
  if (status >= 400) return '⚠️'
  if (status >= 300) return '↪️'
  if (status >= 200) return '✓'
  return '•'
}

function getPerfIndicator(ms) {
  if (ms < 100) return { icon: '⚡', color: c.brightGreen }
  if (ms < 500) return { icon: '', color: c.white }
  if (ms < 1000) return { icon: '🐢', color: c.yellow }
  return { icon: '🦥', color: c.red }
}

// Parse Next.js log format: GET /api/spotify/player 200 in 176ms (compile: 6ms, proxy.ts: 2ms, render: 168ms)
const nextLogRegex = /^\s*(\d{4}-\d{2}-\d{2}T[\d:]+):\s*(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+([^\s]+)\s+(\d+)\s+in\s+([\d.]+(?:µs|ms|s))/

function parseLine(line) {
  const match = line.match(nextLogRegex)
  if (!match) return null

  const [, timestamp, method, path, status, duration] = match
  return {
    timestamp: new Date(timestamp.replace('T', ' ').replace(/:/g, (m, i) => (i > 1 ? ':' : m))),
    method,
    path,
    status: parseInt(status, 10),
    durationMs: parseDuration(duration),
  }
}

function formatLine(parsed, filter) {
  const { method, path, status, durationMs } = parsed

  // Apply filter
  if (filter && !path.toLowerCase().includes(filter.toLowerCase())) {
    return null
  }

  const service = getService(path)
  const methodColor = methodColors[method] || c.white
  const statusColor = getStatusColor(status)
  const statusIcon = getStatusIcon(status)
  const perf = getPerfIndicator(durationMs)

  // Record stats
  recordStats(path, durationMs, status)

  // Format time (just HH:MM:SS)
  const time = parsed.timestamp.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  // Truncate path for display
  const displayPath = path.length > 40 ? path.slice(0, 37) + '...' : path

  return [
    `${c.dim}${time}${c.reset}`,
    service.icon,
    `${methodColor}${method.padEnd(6)}${c.reset}`,
    `${service.color}${displayPath.padEnd(42)}${c.reset}`,
    `${statusColor}${statusIcon} ${status}${c.reset}`,
    `${perf.color}${formatDuration(durationMs).padStart(7)}${c.reset}`,
    perf.icon,
  ].filter(Boolean).join('  ')
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  const args = process.argv.slice(2)
  const showStats = args.includes('--stats')
  const filterIndex = args.indexOf('--filter')
  const filter = filterIndex !== -1 ? args[filterIndex + 1] : null
  const lastIndex = args.indexOf('--last')
  const lastN = lastIndex !== -1 ? parseInt(args[lastIndex + 1], 10) : null

  // Print header
  console.log('')
  console.log(`${c.cyan}╔════════════════════════════════════════════════════════════════════════════════════╗${c.reset}`)
  console.log(`${c.cyan}║${c.reset}  ${c.bold}🏠 petehome logs${c.reset}                                                                   ${c.cyan}║${c.reset}`)
  if (filter) {
    console.log(`${c.cyan}║${c.reset}  ${c.dim}Filtering: ${filter}${c.reset}                                                                      ${c.cyan}║${c.reset}`)
  }
  console.log(`${c.cyan}╚════════════════════════════════════════════════════════════════════════════════════╝${c.reset}`)
  console.log('')
  console.log(`${c.dim}TIME       SVC  METHOD  ENDPOINT                                    STATUS   DURATION${c.reset}`)
  console.log(`${c.dim}${'─'.repeat(85)}${c.reset}`)

  // Use PM2 logs command for live tailing
  const pm2 = spawn('npx', ['pm2', 'logs', 'petehome', '--raw', '--lines', lastN || 100], {
    cwd: join(__dirname, '../../..'),
    shell: true,
  })

  const rl = createInterface({ input: pm2.stdout })

  rl.on('line', (line) => {
    const parsed = parseLine(line)
    if (parsed) {
      const formatted = formatLine(parsed, filter)
      if (formatted) {
        console.log(formatted)
      }
    }
  })

  pm2.stderr.on('data', (data) => {
    // Ignore PM2 stderr (usually just info messages)
  })

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    pm2.kill()
    if (showStats) {
      printStats()
    }
    process.exit(0)
  })

  // If --last was used, exit after processing
  if (lastN) {
    pm2.on('close', () => {
      if (showStats) {
        printStats()
      }
      process.exit(0)
    })
  }
}

main().catch(console.error)

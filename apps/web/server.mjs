import { existsSync, readFileSync } from 'fs'
import { createServer } from 'https'
import next from 'next'
import { dirname, join } from 'path'
import { fileURLToPath, parse } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// ============================================================================
// ANSI Colors - disabled when NO_COLOR is set or not a TTY
// ============================================================================
const useColors = process.env.FORCE_COLOR === '1' || 
  (process.stdout.isTTY && process.env.NO_COLOR !== '1')

const c = useColors ? {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  orange: '\x1b[38;5;208m',
  pink: '\x1b[38;5;218m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
} : {
  // No colors - empty strings
  reset: '', dim: '', bold: '', red: '', green: '', yellow: '',
  blue: '', magenta: '', cyan: '', orange: '', pink: '', gray: '', white: '',
}

// ============================================================================
// Service icons
// ============================================================================
const services = {
  spotify:       { icon: '🎵', color: c.green },
  hue:           { icon: '💡', color: c.yellow },
  sonos:         { icon: '🔊', color: c.blue },
  cta:           { icon: '🚇', color: c.cyan },
  calendar:      { icon: '📅', color: c.magenta },
  fitness:       { icon: '💪', color: c.green },
  'apple-health':{ icon: '❤️', color: c.red },
  coffee:        { icon: '☕', color: c.orange },
  cooking:       { icon: '🍳', color: c.orange },
  maple:         { icon: '🐕', color: c.pink },
  health:        { icon: '💓', color: c.green },
  sync:          { icon: '🔄', color: c.cyan },
  settings:      { icon: '⚙️', color: c.gray },
  admin:         { icon: '🔧', color: c.red },
  mode:          { icon: '🎭', color: c.magenta },
  desktop:       { icon: '🖥️', color: c.blue },
  blog:          { icon: '📝', color: c.cyan },
  maps:          { icon: '🗺️', color: c.green },
  config:        { icon: '📋', color: c.gray },
  weather:       { icon: '🌤️', color: c.blue },
}

const methodColors = {
  GET: c.green,
  POST: c.yellow,
  PUT: c.blue,
  PATCH: c.magenta,
  DELETE: c.red,
  OPTIONS: c.gray,
}

// ============================================================================
// Stdout interceptor - catches ALL output including Next.js internal logs
// ============================================================================
const originalStdoutWrite = process.stdout.write.bind(process.stdout)
const originalStderrWrite = process.stderr.write.bind(process.stderr)

// Regex to match Next.js request logs:
// GET /api/spotify/player 200 in 176ms (compile: 6ms, proxy.ts: 2ms, render: 168ms)
// Also matches: ○ GET /api/health 200 in 5ms
const nextLogRegex = /^\s*[○●]?\s*(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\S+)\s+(\d+)\s+in\s+([\d.]+)(µs|ms|s)/

function getService(path) {
  const match = path.match(/^\/api\/([^/?]+)/)
  return match ? (services[match[1]] || null) : null
}

function formatDuration(value, unit) {
  if (unit === 'µs') return `${Math.round(value)}µs`
  if (unit === 's') return `${value}s`
  return `${Math.round(value)}ms`
}

function getDurationMs(value, unit) {
  if (unit === 'µs') return value / 1000
  if (unit === 's') return value * 1000
  return value
}

function getPerfIcon(ms) {
  if (ms < 100) return '⚡'
  if (ms < 500) return ''
  if (ms < 1000) return '🐢'
  return '🦥'
}

function getStatusColor(status) {
  if (status >= 500) return c.red
  if (status >= 400) return c.yellow
  if (status >= 200) return c.green
  return c.white
}

function formatApiLog(str) {
  const match = str.match(nextLogRegex)
  if (!match) return null
  
  const [, method, path, status, duration, unit] = match
  
  // Only format API routes
  if (!path.startsWith('/api/')) return null
  
  const service = getService(path)
  const statusNum = parseInt(status, 10)
  const durationNum = parseFloat(duration)
  const durationMs = getDurationMs(durationNum, unit)
  
  const methodColor = methodColors[method] || c.white
  const statusColor = getStatusColor(statusNum)
  const perfIcon = getPerfIcon(durationMs)
  
  // Clean path for display (remove /api/ prefix)
  let displayPath = path.replace(/^\/api\//, '')
  if (displayPath.length > 40) {
    displayPath = displayPath.slice(0, 37) + '...'
  }
  
  const icon = service?.icon || '📡'
  const pathColor = service?.color || c.white
  
  // Build formatted line
  const parts = [
    icon,
    `${methodColor}${method.padEnd(6)}${c.reset}`,
    `${pathColor}${displayPath.padEnd(42)}${c.reset}`,
    `${statusColor}${status}${c.reset}`,
    `${c.dim}${formatDuration(durationNum, unit).padStart(8)}${c.reset}`,
  ]
  
  if (perfIcon) parts.push(perfIcon)
  
  return parts.join(' ') + '\n'
}

// Buffer for incomplete lines
let stdoutBuffer = ''

process.stdout.write = (chunk, encoding, callback) => {
  const str = typeof chunk === 'string' ? chunk : chunk.toString()
  
  // Add to buffer and process complete lines
  stdoutBuffer += str
  const lines = stdoutBuffer.split('\n')
  
  // Keep incomplete line in buffer
  stdoutBuffer = lines.pop() || ''
  
  for (const line of lines) {
    if (!line.trim()) {
      originalStdoutWrite('\n')
      continue
    }
    
    // Try to format as API log
    const formatted = formatApiLog(line)
    if (formatted) {
      originalStdoutWrite(formatted)
    } else {
      // Pass through other logs unchanged
      originalStdoutWrite(line + '\n')
    }
  }
  
  if (typeof callback === 'function') callback()
  return true
}

// Keep stderr mostly as-is but clean up formatting
process.stderr.write = (chunk, encoding, callback) => {
  const str = typeof chunk === 'string' ? chunk : chunk.toString()
  originalStderrWrite(str)
  if (typeof callback === 'function') callback()
  return true
}

// ============================================================================
// Certificate setup
// ============================================================================
const certDir = join(__dirname, 'certs')
const keyPath = join(certDir, 'localhost-key.pem')
const certPath = join(certDir, 'localhost.pem')

if (!existsSync(keyPath) || !existsSync(certPath)) {
  originalStderrWrite('SSL certificates not found!\n')
  originalStderrWrite('\n')
  originalStderrWrite('Generate them with mkcert:\n')
  originalStderrWrite('  cd apps/web/certs\n')
  originalStderrWrite('  mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 192.168.1.9\n')
  originalStderrWrite('\n')
  process.exit(1)
}

const httpsOptions = {
  key: readFileSync(keyPath),
  cert: readFileSync(certPath),
}

// ============================================================================
// Server setup
// ============================================================================
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      originalStderrWrite(`${c.red}Error handling ${req.url}:${c.reset}\n`)
      console.error(err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, () => {
    // Startup banner (use original write to avoid formatting)
    const w = (s) => originalStdoutWrite(s + '\n')
    w('')
    w(`${c.cyan}━━━ ${c.bold}🏠 petehome${c.reset}${c.cyan} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`)
    w(`${c.green}▸${c.reset} Server:  ${c.cyan}https://localhost:${port}${c.reset}`)
    w(`${c.green}▸${c.reset} Network: ${c.cyan}https://192.168.1.9:${port}${c.reset}`)
    w(`${c.green}▸${c.reset} Mode:    ${c.magenta}${dev ? 'development' : 'production'}${c.reset}`)
    w(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`)
    w('')
  })
})

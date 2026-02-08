/**
 * Enhanced logging system for petehome
 *
 * Features:
 * - Colorized output with ANSI codes
 * - Service-specific icons
 * - Performance indicators
 * - Request tracking and stats
 * - Compact and verbose modes
 */

// ============================================================================
// ANSI Color Codes
// ============================================================================

const colors = {
  // Reset
  reset: '\x1b[0m',

  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright text colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',

  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
} as const

// ============================================================================
// Service Configuration
// ============================================================================

interface ServiceConfig {
  icon: string
  color: string
  name: string
}

const serviceMap: Record<string, ServiceConfig> = {
  // Music & Media
  spotify: { icon: '🎵', color: colors.green, name: 'Spotify' },

  // Smart Home
  hue: { icon: '💡', color: colors.yellow, name: 'Hue' },
  sonos: { icon: '🔊', color: colors.blue, name: 'Sonos' },

  // Transportation
  cta: { icon: '🚇', color: colors.cyan, name: 'CTA' },

  // Calendar & Time
  calendar: { icon: '📅', color: colors.magenta, name: 'Calendar' },

  // Health & Fitness
  fitness: { icon: '💪', color: colors.brightGreen, name: 'Fitness' },
  'apple-health': { icon: '❤️', color: colors.red, name: 'Health' },

  // Food & Drink
  coffee: { icon: '☕', color: colors.yellow, name: 'Coffee' },
  cooking: { icon: '🍳', color: colors.brightYellow, name: 'Cooking' },

  // Pets
  maple: { icon: '🐕', color: colors.brightMagenta, name: 'Maple' },

  // System
  health: { icon: '💓', color: colors.green, name: 'Health' },
  sync: { icon: '🔄', color: colors.cyan, name: 'Sync' },
  settings: { icon: '⚙️', color: colors.brightBlack, name: 'Settings' },
  admin: { icon: '🔧', color: colors.red, name: 'Admin' },
  mode: { icon: '🎭', color: colors.magenta, name: 'Mode' },

  // Desktop
  desktop: { icon: '🖥️', color: colors.blue, name: 'Desktop' },

  // Content
  blog: { icon: '📝', color: colors.brightCyan, name: 'Blog' },

  // Maps & Location
  maps: { icon: '🗺️', color: colors.green, name: 'Maps' },
  config: { icon: '📋', color: colors.brightBlack, name: 'Config' },

  // Weather
  weather: { icon: '🌤️', color: colors.brightBlue, name: 'Weather' },
}

const defaultService: ServiceConfig = {
  icon: '📡',
  color: colors.white,
  name: 'API',
}

// ============================================================================
// HTTP Method Colors
// ============================================================================

const methodColors: Record<string, string> = {
  GET: colors.brightGreen,
  POST: colors.brightYellow,
  PUT: colors.brightBlue,
  PATCH: colors.brightMagenta,
  DELETE: colors.brightRed,
  OPTIONS: colors.brightBlack,
  HEAD: colors.brightBlack,
}

// ============================================================================
// Status Code Configuration
// ============================================================================

function getStatusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  if (status >= 300) return colors.cyan
  if (status >= 200) return colors.green
  return colors.white
}

function getStatusIcon(status: number): string {
  if (status >= 500) return '💥'
  if (status >= 400) return '⚠️'
  if (status >= 300) return '↪️'
  if (status >= 200) return '✓'
  return '•'
}

// ============================================================================
// Performance Indicators
// ============================================================================

interface PerformanceThresholds {
  fast: number
  normal: number
}

const defaultThresholds: PerformanceThresholds = {
  fast: 100, // Under 100ms is fast
  normal: 500, // Under 500ms is normal, above is slow
}

function getPerformanceIndicator(
  durationMs: number,
  thresholds = defaultThresholds
): { icon: string; color: string; label: string } {
  if (durationMs < thresholds.fast) {
    return { icon: '⚡', color: colors.brightGreen, label: 'fast' }
  }
  if (durationMs < thresholds.normal) {
    return { icon: '•', color: colors.white, label: 'normal' }
  }
  if (durationMs < 1000) {
    return { icon: '🐢', color: colors.yellow, label: 'slow' }
  }
  return { icon: '🦥', color: colors.red, label: 'very slow' }
}

// ============================================================================
// Request Stats Tracking
// ============================================================================

interface RequestStats {
  count: number
  totalDuration: number
  minDuration: number
  maxDuration: number
  errors: number
  lastCall: Date
}

interface StatsEntry {
  stats: RequestStats
  service: ServiceConfig
}

class RequestStatsTracker {
  private stats: Map<string, StatsEntry> = new Map()
  private statsInterval: NodeJS.Timeout | null = null
  private enabled = true

  constructor() {
    // Print stats summary every 5 minutes if enabled
    if (process.env.LOG_STATS_INTERVAL) {
      const interval = parseInt(process.env.LOG_STATS_INTERVAL, 10) * 1000
      this.statsInterval = setInterval(() => this.printSummary(), interval)
    }
  }

  record(
    path: string,
    durationMs: number,
    status: number,
    service: ServiceConfig
  ): void {
    if (!this.enabled) return

    const existing = this.stats.get(path)
    const isError = status >= 400

    if (existing) {
      existing.stats.count++
      existing.stats.totalDuration += durationMs
      existing.stats.minDuration = Math.min(existing.stats.minDuration, durationMs)
      existing.stats.maxDuration = Math.max(existing.stats.maxDuration, durationMs)
      if (isError) existing.stats.errors++
      existing.stats.lastCall = new Date()
    } else {
      this.stats.set(path, {
        stats: {
          count: 1,
          totalDuration: durationMs,
          minDuration: durationMs,
          maxDuration: durationMs,
          errors: isError ? 1 : 0,
          lastCall: new Date(),
        },
        service,
      })
    }
  }

  getStats(path: string): RequestStats | undefined {
    return this.stats.get(path)?.stats
  }

  printSummary(): void {
    if (this.stats.size === 0) return

    const divider = `${colors.dim}${'─'.repeat(70)}${colors.reset}`

    console.log('\n' + divider)
    console.log(
      `${colors.bold}${colors.cyan}📊 Request Stats Summary${colors.reset}`
    )
    console.log(divider)

    // Sort by count descending
    const sorted = [...this.stats.entries()].sort(
      (a, b) => b[1].stats.count - a[1].stats.count
    )

    for (const [path, { stats, service }] of sorted.slice(0, 15)) {
      const avgDuration = Math.round(stats.totalDuration / stats.count)
      const perf = getPerformanceIndicator(avgDuration)

      const errorRate =
        stats.errors > 0
          ? `${colors.red}(${stats.errors} errors)${colors.reset}`
          : ''

      console.log(
        `${service.icon} ${service.color}${path.padEnd(35)}${colors.reset} ` +
          `${colors.dim}${String(stats.count).padStart(4)} calls${colors.reset} ` +
          `${perf.color}avg ${formatDuration(avgDuration).padStart(7)}${colors.reset} ` +
          `${colors.dim}(${formatDuration(stats.minDuration)}-${formatDuration(stats.maxDuration)})${colors.reset} ` +
          errorRate
      )
    }

    if (sorted.length > 15) {
      console.log(
        `${colors.dim}  ... and ${sorted.length - 15} more endpoints${colors.reset}`
      )
    }

    console.log(divider + '\n')
  }

  reset(): void {
    this.stats.clear()
  }

  destroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }
  }
}

// Global stats tracker instance
const statsTracker = new RequestStatsTracker()

// ============================================================================
// Formatting Utilities
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${Math.round(ms * 1000)}µs`
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

function getServiceFromPath(path: string): ServiceConfig {
  // Extract service name from path like /api/spotify/player
  const match = path.match(/^\/api\/([^/]+)/)
  if (match && match[1]) {
    const serviceName = match[1]
    return serviceMap[serviceName] || defaultService
  }
  return defaultService
}

function truncatePath(path: string, maxLength = 40): string {
  if (path.length <= maxLength) return path
  return path.slice(0, maxLength - 3) + '...'
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 8)
}

// ============================================================================
// Log Level Configuration
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const logLevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

function getCurrentLogLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel
  return logLevelPriority[level] !== undefined ? level : 'info'
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel()
  return logLevelPriority[level] >= logLevelPriority[currentLevel]
}

// ============================================================================
// Main Logger Class
// ============================================================================

export interface RequestLogOptions {
  method: string
  path: string
  status: number
  durationMs: number
  requestId?: string
  userAgent?: string
  ip?: string
  contentLength?: number
  responseSize?: number
  error?: Error | string
  metadata?: Record<string, unknown>
}

export interface LoggerConfig {
  enabled?: boolean
  compact?: boolean
  showTimestamp?: boolean
  showRequestId?: boolean
  showPerformance?: boolean
  showService?: boolean
  trackStats?: boolean
  colorize?: boolean
}

const defaultConfig: LoggerConfig = {
  enabled: process.env.NODE_ENV !== 'test',
  compact: process.env.LOG_COMPACT === 'true',
  showTimestamp: true,
  showRequestId: process.env.LOG_REQUEST_ID === 'true',
  showPerformance: true,
  showService: true,
  trackStats: true,
  colorize: process.env.NO_COLOR !== 'true',
}

class Logger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  private c(color: string, text: string): string {
    if (!this.config.colorize) return text
    return `${color}${text}${colors.reset}`
  }

  /**
   * Log an HTTP request
   */
  request(options: RequestLogOptions): void {
    if (!this.config.enabled || !shouldLog('info')) return

    const {
      method,
      path,
      status,
      durationMs,
      requestId,
      error,
    } = options

    const service = getServiceFromPath(path)
    const perf = getPerformanceIndicator(durationMs)
    const methodColor = methodColors[method] || colors.white
    const statusColor = getStatusColor(status)

    // Track stats
    if (this.config.trackStats) {
      statsTracker.record(path, durationMs, status, service)
    }

    // Build log line
    const parts: string[] = []

    // Timestamp
    if (this.config.showTimestamp) {
      parts.push(this.c(colors.dim, formatTime()))
    }

    // Request ID
    if (this.config.showRequestId && requestId) {
      parts.push(this.c(colors.dim, `[${requestId}]`))
    }

    // Service icon
    if (this.config.showService) {
      parts.push(service.icon)
    }

    // Method
    parts.push(this.c(methodColor, method.padEnd(6)))

    // Path
    const displayPath = this.config.compact ? truncatePath(path, 35) : path
    parts.push(this.c(service.color, displayPath.padEnd(this.config.compact ? 35 : 45)))

    // Status
    const statusIcon = getStatusIcon(status)
    parts.push(this.c(statusColor, `${statusIcon} ${status}`))

    // Duration
    const durationStr = formatDuration(durationMs).padStart(7)
    parts.push(this.c(perf.color, durationStr))

    // Performance indicator
    if (this.config.showPerformance && perf.icon !== '•') {
      parts.push(perf.icon)
    }

    // Output
    const logLine = parts.join('  ')

    if (status >= 500) {
      console.error(logLine)
    } else if (status >= 400) {
      console.warn(logLine)
    } else {
      console.log(logLine)
    }

    // Log error details if present
    if (error && shouldLog('error')) {
      const errorMsg = error instanceof Error ? error.message : error
      console.error(this.c(colors.red, `  └─ Error: ${errorMsg}`))
      if (error instanceof Error && error.stack && shouldLog('debug')) {
        console.error(this.c(colors.dim, `     ${error.stack.split('\n').slice(1, 4).join('\n     ')}`))
      }
    }
  }

  /**
   * Log a startup banner
   */
  startup(port: number, env: string): void {
    if (!this.config.enabled) return

    const banner = `
${this.c(colors.cyan, '╔════════════════════════════════════════════════════════════╗')}
${this.c(colors.cyan, '║')}  ${this.c(colors.bold + colors.white, '🏠 petehome')}                                              ${this.c(colors.cyan, '║')}
${this.c(colors.cyan, '╠════════════════════════════════════════════════════════════╣')}
${this.c(colors.cyan, '║')}  ${this.c(colors.green, '▸')} Server running on ${this.c(colors.yellow, `http://localhost:${port}`)}              ${this.c(colors.cyan, '║')}
${this.c(colors.cyan, '║')}  ${this.c(colors.green, '▸')} Environment: ${this.c(colors.magenta, env.padEnd(10))}                          ${this.c(colors.cyan, '║')}
${this.c(colors.cyan, '║')}  ${this.c(colors.green, '▸')} Started: ${this.c(colors.dim, formatTimestamp())}                    ${this.c(colors.cyan, '║')}
${this.c(colors.cyan, '╚════════════════════════════════════════════════════════════╝')}
`
    console.log(banner)
  }

  /**
   * Log a divider line
   */
  divider(label?: string): void {
    if (!this.config.enabled) return

    if (label) {
      const line = '─'.repeat(Math.max(0, 30 - label.length / 2))
      console.log(this.c(colors.dim, `${line} ${label} ${line}`))
    } else {
      console.log(this.c(colors.dim, '─'.repeat(65)))
    }
  }

  /**
   * Debug level log
   */
  debug(message: string, data?: unknown): void {
    if (!this.config.enabled || !shouldLog('debug')) return
    const prefix = this.c(colors.dim, `${formatTime()} 🔍`)
    console.log(`${prefix} ${message}`, data !== undefined ? data : '')
  }

  /**
   * Info level log
   */
  info(message: string, data?: unknown): void {
    if (!this.config.enabled || !shouldLog('info')) return
    const prefix = this.c(colors.blue, `${formatTime()} ℹ️`)
    console.log(`${prefix} ${message}`, data !== undefined ? data : '')
  }

  /**
   * Warning level log
   */
  warn(message: string, data?: unknown): void {
    if (!this.config.enabled || !shouldLog('warn')) return
    const prefix = this.c(colors.yellow, `${formatTime()} ⚠️`)
    console.warn(`${prefix} ${message}`, data !== undefined ? data : '')
  }

  /**
   * Error level log
   */
  error(message: string, error?: unknown): void {
    if (!this.config.enabled || !shouldLog('error')) return
    const prefix = this.c(colors.red, `${formatTime()} 💥`)
    console.error(`${prefix} ${message}`)
    if (error instanceof Error) {
      console.error(this.c(colors.dim, `   ${error.message}`))
      if (error.stack && shouldLog('debug')) {
        console.error(this.c(colors.dim, error.stack.split('\n').slice(1, 4).join('\n')))
      }
    } else if (error !== undefined) {
      console.error(this.c(colors.dim, `   ${String(error)}`))
    }
  }

  /**
   * Success log
   */
  success(message: string): void {
    if (!this.config.enabled || !shouldLog('info')) return
    const prefix = this.c(colors.green, `${formatTime()} ✅`)
    console.log(`${prefix} ${message}`)
  }

  /**
   * Print request stats summary
   */
  stats(): void {
    statsTracker.printSummary()
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    statsTracker.reset()
  }
}

// ============================================================================
// Exports
// ============================================================================

// Default logger instance
export const logger = new Logger()

// Named exports for direct use
export {
  Logger,
  formatDuration,
  formatTime,
  formatTimestamp,
  getServiceFromPath,
  generateRequestId,
  statsTracker,
  colors,
}

// Re-export types
export type { ServiceConfig, LogLevel, RequestStats }

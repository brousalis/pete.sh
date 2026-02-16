'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { isLocalhost } from '@/lib/config'
import {
  Activity,
  CheckCircle2,
  Clock,
  Globe,
  Laptop,
  Loader2,
  Monitor,
  RefreshCw,
  Server,
  Smartphone,
  Stethoscope,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ============================================
// Types
// ============================================

interface DiagnosticsResponse {
  server: {
    mode: string
    isLocal: boolean
    nodeVersion: string
    platform: string
    uptime: number
    timestamp: string
  }
  env: {
    NEXT_PUBLIC_LOCAL_API_URL: string | null
    NEXT_PUBLIC_APP_URL: string | null
    NODE_ENV: string | null
    VERCEL: string | null
    VERCEL_URL: string | null
  }
  services: Record<
    string,
    {
      available: boolean
      checkedAt: string | null
      error?: string
    }
  >
}

interface HealthCheckResult {
  url: string
  label: string
  status: 'idle' | 'loading' | 'success' | 'error'
  latencyMs?: number
  response?: {
    ok: boolean
    mode: string
    instanceId: string
    services?: Record<string, unknown>
  }
  error?: string
}

// ============================================
// Helpers
// ============================================

function detectClientType(): { label: string; icon: typeof Smartphone } {
  if (typeof window === 'undefined') return { label: 'Server', icon: Server }

  const ua = navigator.userAgent

  // iOS WKWebView (no Safari in UA string, but has AppleWebKit)
  if (/\bPeteTrainiOS\b/i.test(ua) || (/AppleWebKit/.test(ua) && /Mobile/.test(ua) && !/Safari/.test(ua))) {
    return { label: 'iOS WKWebView', icon: Smartphone }
  }
  if (/Electron/i.test(ua)) {
    return { label: 'Electron (Desktop)', icon: Monitor }
  }
  // Firefox extension detection: loaded in an iframe on moz-extension:// or about:
  if (window.location.protocol === 'moz-extension:' || window !== window.top) {
    try {
      if (window.top && window.top !== window) {
        return { label: 'Firefox Extension (iframe)', icon: Globe }
      }
    } catch {
      return { label: 'Extension (iframe)', icon: Globe }
    }
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    return { label: 'iOS Safari', icon: Smartphone }
  }
  return { label: 'Web Browser', icon: Laptop }
}

function getMixedContentStatus(localUrl: string | null): {
  blocked: boolean
  reason: string
} {
  if (typeof window === 'undefined') {
    return { blocked: false, reason: 'Server render' }
  }
  if (!localUrl) {
    return { blocked: false, reason: 'No local URL configured' }
  }
  if (window.location.protocol === 'https:' && localUrl.startsWith('http://')) {
    return {
      blocked: true,
      reason: `HTTPS page cannot fetch HTTP local URL (mixed content)`,
    }
  }
  return { blocked: false, reason: 'OK' }
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Never'
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 5) return 'Just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  return `${Math.floor(diffSecs / 3600)}h ago`
}

// ============================================
// Sub-components
// ============================================

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block size-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
    />
  )
}

function DiagRow({
  label,
  value,
  mono = false,
  status,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  status?: 'ok' | 'warn' | 'error' | null
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span
        className={`text-right text-xs break-all ${
          mono ? 'font-mono' : ''
        } ${
          status === 'ok'
            ? 'text-green-600 dark:text-green-400'
            : status === 'error'
              ? 'text-red-600 dark:text-red-400'
              : status === 'warn'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function DiagnosticsCard() {
  const connectivity = useConnectivity()
  const [serverData, setServerData] = useState<DiagnosticsResponse | null>(null)
  const [serverLoading, setServerLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([])
  const [healthLoading, setHealthLoading] = useState(false)

  // Client info (memoized once on mount)
  const [clientInfo] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        url: '',
        protocol: '',
        hostname: '',
        userAgent: '',
        clientType: detectClientType(),
        isLocalhost: false,
        mixedContent: getMixedContentStatus(null),
        onLine: true,
      }
    }
    const localUrl = process.env.NEXT_PUBLIC_LOCAL_API_URL ?? null
    return {
      url: window.location.href,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      userAgent: navigator.userAgent,
      clientType: detectClientType(),
      isLocalhost,
      mixedContent: getMixedContentStatus(localUrl),
      onLine: navigator.onLine,
    }
  })

  // Fetch server diagnostics
  const fetchServerDiagnostics = useCallback(async () => {
    setServerLoading(true)
    setServerError(null)
    try {
      const res = await fetch('/api/diagnostics', {
        cache: 'no-store',
        credentials: 'omit',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DiagnosticsResponse = await res.json()
      setServerData(data)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setServerLoading(false)
    }
  }, [])

  // Run health checks against both local and relative endpoints
  const runHealthChecks = useCallback(async () => {
    setHealthLoading(true)
    const localUrl = process.env.NEXT_PUBLIC_LOCAL_API_URL ?? null
    const targets: { url: string; label: string }[] = []

    // Always check relative (current host)
    targets.push({ url: '/api/health', label: 'Current Host' })

    // Check local URL if configured and different from relative
    if (localUrl) {
      targets.push({ url: `${localUrl}/api/health`, label: 'Local URL' })
    }

    const results: HealthCheckResult[] = targets.map(t => ({
      ...t,
      status: 'loading',
    }))
    setHealthChecks([...results])

    await Promise.all(
      results.map(async (check, i) => {
        const start = performance.now()
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)

          const res = await fetch(check.url, {
            signal: controller.signal,
            credentials: 'omit',
            cache: 'no-store',
          })
          clearTimeout(timeout)

          const latencyMs = Math.round(performance.now() - start)

          if (!res.ok) {
            results[i] = {
              ...check,
              status: 'error',
              latencyMs,
              error: `HTTP ${res.status} ${res.statusText}`,
            }
          } else {
            const data = await res.json()
            results[i] = {
              ...check,
              status: 'success',
              latencyMs,
              response: data,
            }
          }
        } catch (err) {
          const latencyMs = Math.round(performance.now() - start)
          let errorMsg = err instanceof Error ? err.message : 'Unknown error'
          if (errorMsg.includes('aborted')) errorMsg = 'Timeout (5s)'
          results[i] = {
            ...check,
            status: 'error',
            latencyMs,
            error: errorMsg,
          }
        }
        setHealthChecks([...results])
      })
    )

    setHealthLoading(false)
  }, [])

  // Fetch server data on mount
  useEffect(() => {
    fetchServerDiagnostics()
  }, [fetchServerDiagnostics])

  const localUrl = process.env.NEXT_PUBLIC_LOCAL_API_URL ?? null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="text-muted-foreground size-4" />
          <CardTitle className="text-base">Ecosystem Diagnostics</CardTitle>
        </div>
        <CardDescription>
          Connectivity and service status across all petehome clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ================================================
            Section 1: Client Environment
            ================================================ */}
        <div className="space-y-1">
          <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
            <Globe className="size-3" />
            Client Environment
          </h3>
          <div className="bg-muted/50 divide-border space-y-0 divide-y rounded-lg border px-3">
            <DiagRow
              label="Client type"
              value={
                <span className="flex items-center gap-1">
                  <clientInfo.clientType.icon className="size-3" />
                  {clientInfo.clientType.label}
                </span>
              }
            />
            <DiagRow
              label="Page URL"
              value={clientInfo.url}
              mono
            />
            <DiagRow
              label="Protocol"
              value={clientInfo.protocol}
              mono
              status={clientInfo.protocol === 'https:' ? 'ok' : 'warn'}
            />
            <DiagRow
              label="LOCAL_API_URL"
              value={localUrl ?? 'Not configured'}
              mono
              status={localUrl ? null : 'error'}
            />
            <DiagRow
              label="isLocalhost"
              value={clientInfo.isLocalhost ? 'true' : 'false'}
              status={clientInfo.isLocalhost ? 'ok' : null}
            />
            <DiagRow
              label="Mixed content"
              value={clientInfo.mixedContent.reason}
              status={clientInfo.mixedContent.blocked ? 'error' : 'ok'}
            />
            <DiagRow
              label="navigator.onLine"
              value={clientInfo.onLine ? 'Online' : 'Offline'}
              status={clientInfo.onLine ? 'ok' : 'error'}
            />
          </div>
        </div>

        {/* ================================================
            Section 2: Connectivity State
            ================================================ */}
        <div className="space-y-1">
          <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
            <Wifi className="size-3" />
            Connectivity State
          </h3>
          <div className="bg-muted/50 divide-border space-y-0 divide-y rounded-lg border px-3">
            <DiagRow
              label="Status"
              value={
                <span className="flex items-center gap-1.5">
                  {connectivity.isLocalAvailable ? (
                    <Wifi className="size-3 text-green-500" />
                  ) : (
                    <WifiOff className="size-3 text-red-500" />
                  )}
                  {connectivity.statusLabel}
                </span>
              }
              status={connectivity.isLocalAvailable ? 'ok' : 'error'}
            />
            <DiagRow
              label="API base URL"
              value={connectivity.apiBaseUrl || '(relative — current host)'}
              mono
            />
            <DiagRow
              label="Initialized"
              value={connectivity.isInitialized ? 'Yes' : 'No'}
              status={connectivity.isInitialized ? 'ok' : 'warn'}
            />
            <DiagRow
              label="Controls enabled"
              value={connectivity.controlsEnabled ? 'Yes' : 'No (read-only)'}
              status={connectivity.controlsEnabled ? 'ok' : 'warn'}
            />
            <DiagRow
              label="Last checked"
              value={formatRelativeTime(connectivity.lastChecked)}
            />
            <DiagRow
              label="Last error"
              value={connectivity.lastError ?? 'None'}
              status={connectivity.lastError ? 'error' : 'ok'}
            />
            <DiagRow
              label="Failure count"
              value={String(connectivity.failureCount)}
              status={connectivity.failureCount > 0 ? 'warn' : 'ok'}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => connectivity.checkConnectivity()}
              disabled={connectivity.isChecking}
            >
              {connectivity.isChecking ? (
                <Loader2 className="mr-1.5 size-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3" />
              )}
              Re-check
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => connectivity.forceLocal()}
              disabled={!localUrl}
            >
              Force Local
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => connectivity.forceProduction()}
            >
              Force Live
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => connectivity.resetToAuto()}
            >
              Auto
            </Button>
          </div>
        </div>

        {/* ================================================
            Section 3: Live Health Check
            ================================================ */}
        <div className="space-y-1">
          <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
            <Activity className="size-3" />
            Live Health Check
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthChecks}
            disabled={healthLoading}
            className="mb-2"
          >
            {healthLoading ? (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            ) : (
              <Stethoscope className="mr-1.5 size-3" />
            )}
            Run Health Check
          </Button>

          {healthChecks.length > 0 && (
            <div className="space-y-2">
              {healthChecks.map((check, i) => (
                <div
                  key={i}
                  className="bg-muted/50 rounded-lg border px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium">{check.label}</span>
                    <span className="flex items-center gap-1.5 text-xs">
                      {check.status === 'loading' && (
                        <Loader2 className="size-3 animate-spin" />
                      )}
                      {check.status === 'success' && (
                        <CheckCircle2 className="size-3 text-green-500" />
                      )}
                      {check.status === 'error' && (
                        <XCircle className="size-3 text-red-500" />
                      )}
                      {check.latencyMs !== undefined && (
                        <span className="text-muted-foreground font-mono">
                          {check.latencyMs}ms
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-1 truncate font-mono text-[10px]">
                    {check.url}
                  </p>
                  {check.response && (
                    <div className="divide-border divide-y text-xs">
                      <DiagRow
                        label="Mode"
                        value={check.response.mode}
                        status={
                          check.response.mode === 'local' ? 'ok' : 'warn'
                        }
                      />
                      <DiagRow
                        label="Instance ID"
                        value={check.response.instanceId}
                        mono
                        status={
                          check.response.instanceId === 'petehome-local'
                            ? 'ok'
                            : 'error'
                        }
                      />
                    </div>
                  )}
                  {check.error && (
                    <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                      {check.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================================================
            Section 4: Server-Side Service Status
            ================================================ */}
        <div className="space-y-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
              <Server className="size-3" />
              Server-Side Services
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={fetchServerDiagnostics}
              disabled={serverLoading}
            >
              {serverLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
            </Button>
          </div>

          {serverError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Failed to fetch: {serverError}
            </p>
          )}

          {serverData && (
            <>
              <div className="bg-muted/50 divide-border space-y-0 divide-y rounded-lg border px-3">
                <DiagRow
                  label="Server mode"
                  value={serverData.server.mode}
                  status={serverData.server.mode === 'local' ? 'ok' : 'warn'}
                />
                <DiagRow
                  label="Node.js"
                  value={serverData.server.nodeVersion}
                  mono
                />
                <DiagRow
                  label="Platform"
                  value={serverData.server.platform}
                />
                <DiagRow
                  label="Uptime"
                  value={formatUptime(serverData.server.uptime)}
                />
                <DiagRow
                  label="NODE_ENV"
                  value={serverData.env.NODE_ENV ?? 'unset'}
                  mono
                />
                <DiagRow
                  label="Vercel"
                  value={serverData.env.VERCEL ? 'Yes' : 'No'}
                />
                {serverData.env.VERCEL_URL && (
                  <DiagRow
                    label="Vercel URL"
                    value={serverData.env.VERCEL_URL}
                    mono
                  />
                )}
                <DiagRow
                  label="Server LOCAL_API_URL"
                  value={serverData.env.NEXT_PUBLIC_LOCAL_API_URL ?? 'Not set'}
                  mono
                  status={
                    serverData.env.NEXT_PUBLIC_LOCAL_API_URL ? null : 'error'
                  }
                />
              </div>

              {/* Service table */}
              <div className="mt-2 overflow-hidden rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-1.5 text-left font-medium">
                        Service
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Checked
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {Object.entries(serverData.services).map(
                      ([name, svc]) => (
                        <tr key={name}>
                          <td className="px-3 py-1.5 font-medium capitalize">
                            {name}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="flex items-center gap-1.5">
                              <StatusDot ok={svc.available} />
                              {svc.available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="text-muted-foreground px-3 py-1.5">
                            {svc.checkedAt
                              ? formatRelativeTime(svc.checkedAt)
                              : 'Never'}
                          </td>
                          <td className="px-3 py-1.5 text-red-600 dark:text-red-400">
                            {svc.error ?? '—'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ================================================
            Section 5: Ecosystem Clients
            ================================================ */}
        <div className="space-y-1">
          <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
            <Clock className="size-3" />
            Ecosystem Clients
          </h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-3 py-1.5 text-left font-medium">Client</th>
                  <th className="px-3 py-1.5 text-left font-medium">
                    WebView / Page URL
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium">
                    API URL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                <tr>
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="size-3" />
                      iOS
                    </span>
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    https://pete.sh
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    https://www.pete.sh
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <Monitor className="size-3" />
                      Desktop
                    </span>
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    https://pete.sh
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    (relative)
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <Globe className="size-3" />
                      Extension
                    </span>
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    https://pete.sh
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    (relative)
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <Laptop className="size-3" />
                      Web
                    </span>
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    {typeof window !== 'undefined'
                      ? window.location.origin
                      : '—'}
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 font-mono">
                    {connectivity.apiBaseUrl || '(relative)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground pt-1 text-[10px]">
            All clients except Web use hardcoded URLs. Local mode requires{' '}
            <code className="bg-muted rounded px-1">
              NEXT_PUBLIC_LOCAL_API_URL
            </code>{' '}
            to be baked into the build and reachable from the client device.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

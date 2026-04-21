'use client'

/**
 * Dashboard v2 performance instrumentation.
 *
 * - Emits `performance.mark` for the LCP-critical dashboard milestones.
 * - Observes LCP / INP / CLS via `PerformanceObserver` (no external deps).
 * - Logs to console in dev; posts beacon to `/api/perf` in prod (if enabled via
 *   `NEXT_PUBLIC_ENABLE_PERF_BEACON`).
 *
 * Safe to render multiple times; observers are deduped via a module-level flag.
 */

import { useEffect } from 'react'

type MetricName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP' | 'dashboard-seed-ready'

let installed = false

function report(name: MetricName, value: number, detail?: Record<string, unknown>) {
  const payload = {
    metric: name,
    value: Math.round(value * 100) / 100,
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ts: Date.now(),
    ...detail,
  }
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[perf]', payload)
  }
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function' &&
    process.env.NEXT_PUBLIC_ENABLE_PERF_BEACON === '1'
  ) {
    try {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      })
      navigator.sendBeacon('/api/perf', blob)
    } catch {
      /* silently ignore */
    }
  }
}

function install() {
  if (installed || typeof window === 'undefined') return
  installed = true

  try {
    performance.mark('dashboard-seed-ready')
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (nav) {
      report('TTFB', nav.responseStart - nav.requestStart)
      if (nav.domContentLoadedEventStart) {
        report('dashboard-seed-ready', nav.domContentLoadedEventStart - nav.startTime)
      }
    }
  } catch {
    /* swallow */
  }

  // LCP (largest element painted)
  try {
    const po = new PerformanceObserver(list => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) report('LCP', last.startTime)
    })
    po.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {
    /* not supported */
  }

  // CLS (cumulative layout shift)
  try {
    let cls = 0
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries() as unknown as Array<{
        value: number
        hadRecentInput: boolean
      }>) {
        if (!e.hadRecentInput) cls += e.value
      }
    })
    po.observe({ type: 'layout-shift', buffered: true })
    const flush = () => report('CLS', cls)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    window.addEventListener('pagehide', flush)
  } catch {
    /* not supported */
  }

  // INP (interaction-to-next-paint) — approximation using `event` entries.
  try {
    let worstInp = 0
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries() as unknown as Array<{
        duration: number
        interactionId?: number
      }>) {
        if (e.interactionId && e.duration > worstInp) {
          worstInp = e.duration
          report('INP', worstInp)
        }
      }
    })
    po.observe({ type: 'event', buffered: true, durationThreshold: 40 } as unknown as PerformanceObserverInit)
  } catch {
    /* not supported */
  }

  // FCP — browser-reported First Contentful Paint.
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-contentful-paint') {
          report('FCP', e.startTime)
        }
      }
    })
    po.observe({ type: 'paint', buffered: true })
  } catch {
    /* not supported */
  }
}

export function DashboardPerfBoundary() {
  useEffect(() => {
    install()
  }, [])
  return null
}

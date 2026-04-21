/**
 * Lightweight performance-metric beacon endpoint.
 *
 * Client sends a navigator.sendBeacon JSON blob with Web Vitals (LCP/INP/CLS/…)
 * + custom dashboard milestones. We just log them — production deployments can
 * wire this to OpenTelemetry / Datadog / Vercel Analytics as needed.
 *
 * Always returns 204 so sendBeacon doesn't block the browser on response.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[perf-beacon]', {
      metric: body.metric,
      value: body.value,
      path: body.path,
      ts: body.ts,
    })
  } catch {
    /* ignore malformed bodies */
  }
  return new NextResponse(null, { status: 204 })
}

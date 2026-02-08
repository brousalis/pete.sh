/**
 * Higher-order function wrapper for API routes with enhanced logging
 *
 * Usage:
 *   import { withLogging } from '@/lib/api/with-logging'
 *
 *   export const GET = withLogging(async (request) => {
 *     return NextResponse.json({ data: 'hello' })
 *   })
 *
 * Or with options:
 *   export const GET = withLogging(handler, {
 *     name: 'Get User Profile',
 *     logBody: true,
 *   })
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger, generateRequestId, type RequestLogOptions } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

export interface WithLoggingOptions {
  /** Custom name for the route (for clearer logs) */
  name?: string
  /** Log request body (be careful with sensitive data) */
  logBody?: boolean
  /** Log response body (be careful with large responses) */
  logResponse?: boolean
  /** Custom performance thresholds */
  slowThreshold?: number
  /** Skip logging for this route */
  skip?: boolean
  /** Custom metadata to include in logs */
  metadata?: Record<string, unknown>
}

export type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse

export type RouteHandlerWithContext<T = Record<string, string>> = (
  request: NextRequest,
  context: { params: Promise<T> }
) => Promise<NextResponse> | NextResponse

// ============================================================================
// Request Context (for access within handlers)
// ============================================================================

interface RequestContext {
  requestId: string
  startTime: number
}

const requestContextMap = new WeakMap<NextRequest, RequestContext>()

/**
 * Get the request context (requestId, timing, etc.) for the current request
 */
export function getRequestContext(request: NextRequest): RequestContext | undefined {
  return requestContextMap.get(request)
}

/**
 * Get the request ID for the current request
 */
export function getRequestId(request: NextRequest): string | undefined {
  return requestContextMap.get(request)?.requestId
}

// ============================================================================
// Main Wrapper
// ============================================================================

/**
 * Wrap an API route handler with enhanced logging
 */
export function withLogging<T extends Record<string, string> = Record<string, string>>(
  handler: RouteHandlerWithContext<T>,
  options: WithLoggingOptions = {}
): RouteHandlerWithContext<T> {
  return async (
    request: NextRequest,
    context: { params: Promise<T> }
  ): Promise<NextResponse> => {
    // Skip logging if disabled
    if (options.skip) {
      return handler(request, context)
    }

    const startTime = performance.now()
    const requestId = generateRequestId()

    // Store context for access within handler
    requestContextMap.set(request, { requestId, startTime })

    // Extract request info
    const method = request.method
    const url = new URL(request.url)
    const path = url.pathname + (url.search || '')
    const userAgent = request.headers.get('user-agent') || undefined
    const contentLength = request.headers.get('content-length')
      ? parseInt(request.headers.get('content-length')!, 10)
      : undefined

    // Get client IP (various headers for proxied requests)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined

    // Log request body if enabled (be careful with sensitive data!)
    if (options.logBody && method !== 'GET' && method !== 'HEAD') {
      try {
        const clonedRequest = request.clone()
        const body = await clonedRequest.text()
        if (body) {
          logger.debug(`Request body [${requestId}]:`, body.slice(0, 500))
        }
      } catch {
        // Ignore body parsing errors
      }
    }

    let response: NextResponse
    let error: Error | undefined

    try {
      // Execute the actual handler
      response = await handler(request, context)
    } catch (err) {
      // Catch and log errors
      error = err instanceof Error ? err : new Error(String(err))

      // Return a 500 error response
      response = NextResponse.json(
        {
          success: false,
          error: error.message,
          requestId,
        },
        { status: 500 }
      )
    }

    const endTime = performance.now()
    const durationMs = endTime - startTime

    // Get response size if available
    const responseSize = response.headers.get('content-length')
      ? parseInt(response.headers.get('content-length')!, 10)
      : undefined

    // Build log options
    const logOptions: RequestLogOptions = {
      method,
      path,
      status: response.status,
      durationMs,
      requestId,
      userAgent,
      ip,
      contentLength,
      responseSize,
      error: error?.message,
      metadata: {
        ...options.metadata,
        ...(options.name ? { routeName: options.name } : {}),
      },
    }

    // Log the request
    logger.request(logOptions)

    // Log response body if enabled
    if (options.logResponse && !error) {
      try {
        const clonedResponse = response.clone()
        const body = await clonedResponse.text()
        if (body) {
          logger.debug(`Response body [${requestId}]:`, body.slice(0, 500))
        }
      } catch {
        // Ignore body parsing errors
      }
    }

    // Add request ID header to response for debugging
    response.headers.set('x-request-id', requestId)

    // Cleanup context
    requestContextMap.delete(request)

    return response
  }
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/**
 * Simple logging wrapper without options (for cleaner code)
 */
export function logged<T extends Record<string, string> = Record<string, string>>(
  handler: RouteHandlerWithContext<T>
): RouteHandlerWithContext<T> {
  return withLogging(handler)
}

/**
 * Create a logged route with a custom name
 */
export function namedRoute<T extends Record<string, string> = Record<string, string>>(
  name: string,
  handler: RouteHandlerWithContext<T>
): RouteHandlerWithContext<T> {
  return withLogging(handler, { name })
}

// ============================================================================
// Batch Logging Utilities
// ============================================================================

/**
 * Track timing for sub-operations within a request
 */
export class RequestTimer {
  private timings: Map<string, { start: number; end?: number }> = new Map()
  private requestId: string

  constructor(requestId?: string) {
    this.requestId = requestId || generateRequestId()
  }

  start(label: string): void {
    this.timings.set(label, { start: performance.now() })
  }

  end(label: string): number {
    const timing = this.timings.get(label)
    if (timing && !timing.end) {
      timing.end = performance.now()
      return timing.end - timing.start
    }
    return 0
  }

  getTimings(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [label, timing] of this.timings) {
      if (timing.end) {
        result[label] = Math.round(timing.end - timing.start)
      }
    }
    return result
  }

  log(): void {
    const timings = this.getTimings()
    if (Object.keys(timings).length > 0) {
      logger.debug(`Request timings [${this.requestId}]:`, timings)
    }
  }
}

// ============================================================================
// Error Logging Helpers
// ============================================================================

/**
 * Log an API error with context
 */
export function logApiError(
  request: NextRequest,
  error: unknown,
  context?: string
): void {
  const requestId = getRequestId(request)
  const path = new URL(request.url).pathname

  const message = context
    ? `API Error in ${context} (${path})`
    : `API Error (${path})`

  logger.error(message + (requestId ? ` [${requestId}]` : ''), error)
}

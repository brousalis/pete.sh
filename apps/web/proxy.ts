import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  COACH_SESSION_COOKIE,
  isCoachAuthConfigured,
  verifyCoachBearer,
  verifySessionToken,
} from '@/lib/auth/coach-auth'

/**
 * Proxy to handle CORS for API routes, and to gate the PeteCoach section.
 *
 * CORS allows the production site (pete.sh) to make requests to the local
 * development server when the user is at home with local services available.
 *
 * The coach gate is separate: /coach pages and /api/coach routes hold medical
 * data and require a signed session cookie or the coach bearer key. They also
 * never get a wildcard CORS origin, since that would prevent credentialed
 * requests and would be wrong for this data anyway.
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://pete.sh',
  'https://www.pete.sh',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
]

/** Check if origin is a local network address (.local mDNS, 192.168.x.x, 10.x.x.x) */
function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.hostname.endsWith('.local') ||
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('10.')
    )
  } catch {
    return false
  }
}

/**
 * Routes under /api/coach that the session gate must not intercept.
 *
 * /auth issues the session in the first place. /calendar is subscribed to by
 * Apple Calendar, which cannot send an Authorization header, so it does its
 * own key check on a query parameter.
 */
const COACH_PUBLIC_API = ['/api/coach/auth', '/api/coach/calendar']

async function isCoachAuthorized(request: NextRequest): Promise<boolean> {
  if (verifyCoachBearer(request.headers.get('authorization'))) return true

  const token = request.cookies.get(COACH_SESSION_COOKIE)?.value
  if (await verifySessionToken(token)) return true

  // A fresh clone with no secrets configured still runs locally.
  if (!isCoachAuthConfigured() && process.env.NODE_ENV === 'development') return true

  return false
}

function withCoachCors(response: NextResponse, origin: string | null): NextResponse {
  if (origin && (ALLOWED_ORIGINS.includes(origin) || isLocalOrigin(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect legacy /dashboard to root
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const origin = request.headers.get('origin')

  // ---- PeteCoach gate -------------------------------------------------
  const isCoachApi = pathname.startsWith('/api/coach')
  const isCoachPage =
    (pathname === '/coach' || pathname.startsWith('/coach/')) &&
    !pathname.startsWith('/coach/login')

  if (isCoachApi || isCoachPage) {
    const isPublicCoachApi = COACH_PUBLIC_API.some((p) => pathname.startsWith(p))

    if (request.method === 'OPTIONS') {
      return withCoachCors(new NextResponse(null, { status: 204 }), origin)
    }

    if (!isPublicCoachApi && !(await isCoachAuthorized(request))) {
      if (isCoachApi) {
        return withCoachCors(
          NextResponse.json(
            { success: false, error: 'Unauthorized', code: 'COACH_AUTH_REQUIRED' },
            { status: 401 }
          ),
          origin
        )
      }
      const loginUrl = new URL('/coach/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const response = NextResponse.next()
    // Never cache medical responses at the edge or in the browser.
    response.headers.set('Cache-Control', 'no-store, private')
    return isCoachApi ? withCoachCors(response, origin) : response
  }

  // Only handle API routes beyond this point
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })

    // Set CORS headers
    if (origin && (ALLOWED_ORIGINS.includes(origin) || isLocalOrigin(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else {
      // Allow any origin for local development flexibility
      response.headers.set('Access-Control-Allow-Origin', '*')
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours

    return response
  }

  // For actual requests, let them proceed but add CORS headers to response
  const response = NextResponse.next()

  // Set CORS headers
  if (origin && (ALLOWED_ORIGINS.includes(origin) || isLocalOrigin(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else {
    // Allow any origin for flexibility (the API routes themselves should handle auth)
    response.headers.set('Access-Control-Allow-Origin', '*')
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  )

  return response
}

// Configure which paths the proxy runs on
export const config = {
  matcher: ['/dashboard', '/dashboard/', '/api/:path*', '/coach', '/coach/:path*'],
}

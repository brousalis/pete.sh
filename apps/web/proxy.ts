import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  COACH_SESSION_COOKIE,
  isCoachGateEnabled,
  verifyCoachBearer,
  verifySessionToken,
} from '@/lib/auth/coach-auth'

/**
 * CORS + no-store for petehome and Apple Health APIs, plus the production
 * coach browser gate (access-code session cookie).
 *
 * Local hybrid origins (.local / LAN) are allowed so the PWA and petehome
 * can talk to a home-machine Next server.
 */

const ALLOWED_ORIGINS = [
  'http://localhost:7331',
  'https://localhost:7331',
  'http://127.0.0.1:7331',
  'https://127.0.0.1:7331',
]

/**
 * Routes under /api/coach that the session gate must not intercept.
 * /auth issues the session. /calendar is Apple Calendar (query key only).
 */
const COACH_PUBLIC_API = ['/api/coach/auth', '/api/coach/calendar']

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

function withCors(response: NextResponse, origin: string | null): NextResponse {
  if (origin && (ALLOWED_ORIGINS.includes(origin) || isLocalOrigin(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  )
  return response
}

async function isCoachAuthorized(request: NextRequest): Promise<boolean> {
  if (!isCoachGateEnabled()) return true
  if (verifyCoachBearer(request.headers.get('authorization'))) return true
  const token = request.cookies.get(COACH_SESSION_COOKIE)?.value
  if (await verifySessionToken(token)) return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  const isCoachApi = pathname.startsWith('/api/coach')
  const isCoachPage =
    (pathname === '/coach' || pathname.startsWith('/coach/')) &&
    !pathname.startsWith('/coach/login')
  const isAppleHealth = pathname.startsWith('/api/apple-health')
  const isHealth = pathname === '/api/health'
  const isCron = pathname.startsWith('/api/cron')

  if (isCoachApi || isCoachPage) {
    const isPublicCoachApi = COACH_PUBLIC_API.some(p => pathname.startsWith(p))

    if (request.method === 'OPTIONS') {
      return withCors(new NextResponse(null, { status: 204 }), origin)
    }

    if (!isPublicCoachApi && !(await isCoachAuthorized(request))) {
      if (isCoachApi) {
        return withCors(
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
    response.headers.set('Cache-Control', 'no-store, private')
    return isCoachApi ? withCors(response, origin) : response
  }

  if (isAppleHealth || isHealth || isCron) {
    if (request.method === 'OPTIONS') {
      return withCors(new NextResponse(null, { status: 204 }), origin)
    }

    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, private')
    return withCors(response, origin)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/coach', '/coach/:path*'],
}

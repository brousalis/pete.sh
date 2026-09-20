import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Proxy to handle CORS for API routes.
 *
 * CORS allows the production site (pete.sh) to make requests to the local
 * development server when the user is at home with local services available.
 *
 * /coach and /api/coach are open like the rest of the dashboard. Machine
 * clients that need a shared secret (ICS calendar key, MCP bearer) check
 * COACH_API_KEY inside their own route handlers.
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

  // ---- PeteCoach ------------------------------------------------------
  // Open like the rest of the dashboard. Still mark responses no-store and
  // apply credentialed CORS for /api/coach.
  const isCoachApi = pathname.startsWith('/api/coach')
  const isCoachPage = pathname === '/coach' || pathname.startsWith('/coach/')

  if (isCoachApi || isCoachPage) {
    if (request.method === 'OPTIONS') {
      return withCoachCors(new NextResponse(null, { status: 204 }), origin)
    }

    const response = NextResponse.next()
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

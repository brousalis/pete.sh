import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * CORS + no-store for PeteCoach and Apple Health APIs.
 * Local hybrid origins (.local / LAN) are allowed so the PWA and PeteTrain
 * can talk to a home-machine Next server.
 */

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
]

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  const isCoachApi = pathname.startsWith('/api/coach')
  const isCoachPage = pathname === '/coach' || pathname.startsWith('/coach/')
  const isAppleHealth = pathname.startsWith('/api/apple-health')
  const isHealth = pathname === '/api/health'

  if (isCoachApi || isCoachPage || isAppleHealth || isHealth) {
    if (request.method === 'OPTIONS') {
      return withCors(new NextResponse(null, { status: 204 }), origin)
    }

    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, private')
    return isCoachApi || isAppleHealth || isHealth
      ? withCors(response, origin)
      : response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/coach', '/coach/:path*'],
}

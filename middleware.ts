import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to handle CORS for API routes
 * 
 * This allows the production site (pete.sh) to make requests to the local
 * development server when the user is at home with local services available.
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://pete.sh',
  'https://www.pete.sh',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

export function middleware(request: NextRequest) {
  // Only handle API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const origin = request.headers.get('origin')
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    
    // Set CORS headers
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else {
      // Allow any origin for local development flexibility
      response.headers.set('Access-Control-Allow-Origin', '*')
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    
    return response
  }

  // For actual requests, let them proceed but add CORS headers to response
  const response = NextResponse.next()
  
  // Set CORS headers
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else {
    // Allow any origin for flexibility (the API routes themselves should handle auth)
    response.headers.set('Access-Control-Allow-Origin', '*')
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: '/api/:path*',
}

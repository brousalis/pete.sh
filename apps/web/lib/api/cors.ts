/**
 * CORS helper for API routes
 */

import { NextResponse } from 'next/server'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function withCors<T>(response: NextResponse<T>): NextResponse<T> {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export function corsOptionsResponse() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export function corsErrorResponse(error: string, status: number = 500) {
  return withCors(
    NextResponse.json(
      {
        success: false,
        error,
      },
      { status }
    )
  )
}

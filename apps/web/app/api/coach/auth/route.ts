/**
 * POST /api/coach/auth   — no-op (access codes retired)
 * DELETE /api/coach/auth — clear any leftover petehome_session cookie
 * GET /api/coach/auth    — always reports authenticated
 */

import { NextResponse } from 'next/server'

import { COACH_SESSION_COOKIE } from '@/lib/auth/coach-auth'
import { successResponse } from '@/lib/api/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clearSessionCookie(response: NextResponse): void {
  for (const name of [COACH_SESSION_COOKIE, 'petecoach_session']) {
    response.cookies.set({
      name,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }
}

export async function GET() {
  return successResponse({
    authenticated: true,
    configured: true,
    gate: 'open',
  })
}

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { authenticated: true, gate: 'open' },
  })
  // Drop any leftover session cookie from older builds.
  clearSessionCookie(response)
  return response
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    data: { authenticated: true, gate: 'open' },
  })
  clearSessionCookie(response)
  return response
}

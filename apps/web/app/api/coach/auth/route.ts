/**
 * POST /api/coach/auth   — exchange the access code for a session cookie
 * DELETE /api/coach/auth — clear the session
 * GET /api/coach/auth    — report whether the caller has a valid session
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  COACH_SESSION_COOKIE,
  COACH_SESSION_TTL_SECONDS,
  createSessionToken,
  isCoachAuthConfigured,
  verifyAccessCode,
  verifySessionToken,
} from '@/lib/auth/coach-auth'
import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Deliberately slow down brute force against a short access code. */
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

function rateLimited(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > MAX_ATTEMPTS
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COACH_SESSION_COOKIE)?.value
  const valid = await verifySessionToken(token)
  return successResponse({
    authenticated: valid,
    configured: isCoachAuthConfigured(),
  })
}

export async function POST(request: NextRequest) {
  try {
    if (!isCoachAuthConfigured()) {
      return errorResponse(
        'Coach auth is not configured. Set COACH_SESSION_SECRET (32+ chars) and COACH_ACCESS_CODE (8+ chars).',
        503
      )
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (rateLimited(ip)) {
      return errorResponse('Too many attempts. Try again later.', 429)
    }

    const body = (await request.json().catch(() => ({}))) as { code?: unknown }
    const code = typeof body.code === 'string' ? body.code : ''

    if (!code || !(await verifyAccessCode(code))) {
      return errorResponse('Invalid access code', 401)
    }

    const token = await createSessionToken()
    if (!token) {
      return errorResponse('Unable to create session', 500)
    }

    const response = NextResponse.json({ success: true, data: { authenticated: true } })
    response.cookies.set({
      name: COACH_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COACH_SESSION_TTL_SECONDS,
    })

    attempts.delete(ip)
    return response
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, data: { authenticated: false } })
  response.cookies.set({
    name: COACH_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

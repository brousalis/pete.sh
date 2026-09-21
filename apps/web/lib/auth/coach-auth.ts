/**
 * petehome auth helpers
 *
 * Browser access to /coach and /api/coach is open, matching the rest of the
 * petehome dashboard. Machine clients (watch, worker, MCP, ICS) may still send
 * `Authorization: Bearer COACH_API_KEY` where an endpoint checks it explicitly
 * (calendar query key, MCP). Session cookies and access codes are retired.
 */

export const COACH_SESSION_COOKIE = 'petehome_session'

/** Kept for clearing leftover cookies from older builds. */
export const COACH_SESSION_TTL_SECONDS = 90 * 24 * 60 * 60

/** Constant-time string comparison to avoid leaking secrets by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Bearer-token access for non-browser clients (petehome, MCP, worker
 * callbacks). Not used to gate the PWA.
 */
export function verifyCoachBearer(authorization: string | null): boolean {
  const expected = process.env.COACH_API_KEY
  if (!expected || expected.length < 24) return false
  if (!authorization) return false

  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : authorization.trim()

  return timingSafeEqual(token, expected)
}

export interface CoachAuthResult {
  authorized: boolean
  via: 'open' | 'bearer' | null
  reason?: string
}

/** Browser and API coach routes are open; bearer is still recognised. */
export async function authorizeCoachRequest(headers: Headers): Promise<CoachAuthResult> {
  if (verifyCoachBearer(headers.get('authorization'))) {
    return { authorized: true, via: 'bearer' }
  }
  return { authorized: true, via: 'open' }
}

export function readCookie(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1))
    }
  }
  return undefined
}

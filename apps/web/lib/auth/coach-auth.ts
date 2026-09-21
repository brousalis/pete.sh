/**
 * Coach auth helpers
 *
 * Browser access to /coach and /api/coach is open. Machine clients (watch,
 * worker, MCP, ICS) send `Authorization: Bearer <machine-key>`.
 * PETEWATCH_API_KEY and COACH_API_KEY are aliases — one key is enough.
 */

import {
  extractBearerToken,
  tokenMatchesMachineKey,
} from '@/lib/api/machine-auth'

export const COACH_SESSION_COOKIE = 'petehome_session'

/** Kept for clearing leftover cookies from older builds. */
export const COACH_SESSION_TTL_SECONDS = 90 * 24 * 60 * 60

/**
 * Bearer-token access for non-browser clients (PeteTrain, MCP, worker).
 * Not used to gate the PWA.
 */
export function verifyCoachBearer(authorization: string | null): boolean {
  const token = extractBearerToken(authorization)
  if (!token) return false
  return tokenMatchesMachineKey(token)
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

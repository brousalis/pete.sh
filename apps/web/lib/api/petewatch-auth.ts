/**
 * PeteTrain / Apple Health API authentication.
 * Accepts the shared machine key (PETEWATCH_API_KEY and/or COACH_API_KEY).
 */

import { NextRequest } from 'next/server'

import {
  extractBearerToken,
  hasMachineApiKey,
  tokenMatchesMachineKey,
} from '@/lib/api/machine-auth'

export interface AuthResult {
  valid: boolean
  error?: string
}

/**
 * Verify API key from Authorization or X-API-Key.
 * Skips auth in development.
 */
export function verifyPeteWatchAuth(request: NextRequest): AuthResult {
  if (process.env.NODE_ENV === 'development') {
    return { valid: true }
  }

  if (!hasMachineApiKey()) {
    console.error('[PeteWatch Auth] Neither PETEWATCH_API_KEY nor COACH_API_KEY is set')
    return { valid: false, error: 'Server misconfigured - API key not set' }
  }

  const token = extractBearerToken(
    request.headers.get('Authorization'),
    request.headers.get('X-API-Key')
  )

  if (!token) {
    return {
      valid: false,
      error:
        'Missing Authorization header. Use "Authorization: Bearer <key>" or "X-API-Key: <key>"',
    }
  }

  if (!tokenMatchesMachineKey(token)) {
    return { valid: false, error: 'Invalid API key' }
  }

  return { valid: true }
}

/**
 * PeteCoach session auth
 *
 * pete.sh is a public origin and the rest of the dashboard is intentionally
 * open. The coach section is not: it holds MRI findings, PT notes, symptom and
 * medication logs. Everything under /coach and /api/coach requires a signed
 * session cookie.
 *
 * The cookie is a stateless HMAC token so it can be verified in the Edge proxy
 * without a database round trip. Uses Web Crypto, which is available in both
 * the Edge runtime and Node.
 */

export const COACH_SESSION_COOKIE = 'petecoach_session'

/** 90 days — this is a personal device, not a shared terminal. */
export const COACH_SESSION_TTL_SECONDS = 90 * 24 * 60 * 60

const encoder = new TextEncoder()

function getSecret(): string | null {
  const secret = process.env.COACH_SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return secret
}

/** Access code the athlete types once per device to establish a session. */
function getAccessCode(): string | null {
  const code = process.env.COACH_ACCESS_CODE
  if (!code || code.length < 8) return null
  return code
}

export function isCoachAuthConfigured(): boolean {
  return getSecret() !== null && getAccessCode() !== null
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return base64UrlEncode(signature)
}

/** Constant-time string comparison to avoid leaking the secret by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Create a session token valid for COACH_SESSION_TTL_SECONDS.
 * Format: `<expiryEpochSeconds>.<hmac>`
 */
export async function createSessionToken(): Promise<string | null> {
  const secret = getSecret()
  if (!secret) return null

  const expiry = Math.floor(Date.now() / 1000) + COACH_SESSION_TTL_SECONDS
  const payload = String(expiry)
  const signature = await hmac(payload, secret)
  return `${payload}.${signature}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false

  const secret = getSecret()
  if (!secret) return false

  const separator = token.lastIndexOf('.')
  if (separator <= 0) return false

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  const expiry = Number(payload)
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) {
    return false
  }

  const expected = await hmac(payload, secret)
  return timingSafeEqual(signature, expected)
}

export async function verifyAccessCode(candidate: string): Promise<boolean> {
  const code = getAccessCode()
  if (!code) return false
  // Hash both sides so the comparison is constant time regardless of length.
  const secret = getSecret() ?? code
  const [a, b] = await Promise.all([hmac(candidate, secret), hmac(code, secret)])
  return timingSafeEqual(a, b)
}

/**
 * Bearer-token access for non-browser clients (the coach worker calling back
 * into the web API, and the PeteTrain apps fetching today's sessions).
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
  via: 'session' | 'bearer' | 'dev' | null
  reason?: string
}

/**
 * Authorize a coach API request from its headers.
 *
 * Unlike verifyPeteWatchAuth, this does NOT auto-pass in development when a
 * secret is configured — medical endpoints should behave identically in every
 * environment. It only opens up when auth is entirely unconfigured locally, so
 * a fresh clone still runs.
 */
export async function authorizeCoachRequest(headers: Headers): Promise<CoachAuthResult> {
  if (verifyCoachBearer(headers.get('authorization'))) {
    return { authorized: true, via: 'bearer' }
  }

  const cookieHeader = headers.get('cookie') ?? ''
  const token = readCookie(cookieHeader, COACH_SESSION_COOKIE)
  if (await verifySessionToken(token)) {
    return { authorized: true, via: 'session' }
  }

  if (!isCoachAuthConfigured() && process.env.NODE_ENV === 'development') {
    return { authorized: true, via: 'dev' }
  }

  return {
    authorized: false,
    via: null,
    reason: isCoachAuthConfigured()
      ? 'Coach session required'
      : 'Coach auth is not configured (set COACH_SESSION_SECRET and COACH_ACCESS_CODE)',
  }
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

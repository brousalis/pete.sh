/**
 * Coach session auth
 *
 * Production /coach and /api/coach hold training + medical data. When
 * COACH_SESSION_SECRET and COACH_ACCESS_CODE are set on a production deploy,
 * browser access requires a signed httpOnly session cookie (PIN once per
 * device, ~90 days). Local / preview stay open.
 *
 * Machine clients (watch, worker, MCP, ICS) use Bearer machine keys instead.
 * The cookie is a Stateless HMAC token so Edge proxy can verify without DB.
 */

import {
  extractBearerToken,
  tokenMatchesMachineKey,
} from '@/lib/api/machine-auth'

export const COACH_SESSION_COOKIE = 'petehome_session'

/** 90 days — personal device, not a shared terminal. */
export const COACH_SESSION_TTL_SECONDS = 90 * 24 * 60 * 60

const encoder = new TextEncoder()

function getSecret(): string | null {
  const secret = process.env.COACH_SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return secret
}

/** PIN typed once per device to establish a session (4+ chars). */
function getAccessCode(): string | null {
  const code = process.env.COACH_ACCESS_CODE
  if (!code || code.length < 4) return null
  return code
}

export function isCoachAuthConfigured(): boolean {
  return getSecret() !== null && getAccessCode() !== null
}

/**
 * Enforce the browser gate only on production.
 * - Vercel: only when VERCEL_ENV=production (preview stays open)
 * - Non-Vercel: when NODE_ENV=production and secrets are set
 * Local `yarn dev` never gates, even if secrets are present.
 */
export function isCoachGateEnabled(): boolean {
  if (!isCoachAuthConfigured()) return false
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production'
  }
  return process.env.NODE_ENV === 'production'
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
 * Bearer-token access for non-browser clients (PeteTrain, MCP, worker, ICS).
 * Not sufficient alone for the PWA when the gate is on — browsers use cookies.
 */
export function verifyCoachBearer(authorization: string | null): boolean {
  const token = extractBearerToken(authorization)
  if (!token) return false
  return tokenMatchesMachineKey(token)
}

export interface CoachAuthResult {
  authorized: boolean
  via: 'session' | 'bearer' | 'open' | null
  reason?: string
}

/** Authorize a coach API / page request from its headers. */
export async function authorizeCoachRequest(headers: Headers): Promise<CoachAuthResult> {
  if (verifyCoachBearer(headers.get('authorization'))) {
    return { authorized: true, via: 'bearer' }
  }

  const cookieHeader = headers.get('cookie') ?? ''
  const token = readCookie(cookieHeader, COACH_SESSION_COOKIE)
  if (await verifySessionToken(token)) {
    return { authorized: true, via: 'session' }
  }

  if (!isCoachGateEnabled()) {
    return { authorized: true, via: 'open' }
  }

  return {
    authorized: false,
    via: null,
    reason: 'Coach session required',
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

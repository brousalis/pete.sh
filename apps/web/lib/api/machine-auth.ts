/**
 * Shared bearer auth for machine clients (PeteTrain ingest, watch, MCP, ICS).
 * PETEWATCH_API_KEY and COACH_API_KEY are treated as aliases — either env value
 * is accepted on any machine endpoint. Personal setup: set one, reuse everywhere.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/** Distinct configured machine keys (trimmed). */
export function machineApiKeys(): string[] {
  const raw = [process.env.PETEWATCH_API_KEY, process.env.COACH_API_KEY]
  const keys: string[] = []
  for (const value of raw) {
    const trimmed = value?.trim()
    if (!trimmed || trimmed.length < 24) continue
    if (!keys.some((k) => timingSafeEqual(k, trimmed))) keys.push(trimmed)
  }
  return keys
}

export function hasMachineApiKey(): boolean {
  return machineApiKeys().length > 0
}

export function tokenMatchesMachineKey(token: string): boolean {
  const received = decodeURIComponent(token.trim())
  if (!received) return false
  return machineApiKeys().some((expected) => timingSafeEqual(received, expected))
}

/** Extract bearer / raw / X-API-Key token from common header shapes. */
export function extractBearerToken(
  authorization: string | null,
  xApiKey?: string | null
): string | null {
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7).trim()
  }
  if (authorization?.trim()) {
    return authorization.trim()
  }
  if (xApiKey?.trim()) {
    return xApiKey.trim()
  }
  return null
}

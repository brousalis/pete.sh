/**
 * PeteWatch API Authentication
 * Shared auth utility for Apple Health API routes
 */

import { NextRequest } from 'next/server'

const PETEWATCH_API_KEY = process.env.PETEWATCH_API_KEY

export interface AuthResult {
  valid: boolean
  error?: string
}

/**
 * Verify PeteWatch API key from request headers
 * Supports both "Authorization: Bearer <key>" and "X-API-Key: <key>" headers
 */
export function verifyPeteWatchAuth(request: NextRequest): AuthResult {
  // Skip auth in development
  if (process.env.NODE_ENV === 'development') {
    return { valid: true }
  }

  // Check if API key is configured on server
  if (!PETEWATCH_API_KEY) {
    console.error('[PeteWatch Auth] PETEWATCH_API_KEY environment variable is not set')
    return { valid: false, error: 'Server misconfigured - API key not set' }
  }

  // Get token from Authorization header or X-API-Key header
  const authHeader = request.headers.get('Authorization')
  const xApiKey = request.headers.get('X-API-Key')
  
  if (!authHeader && !xApiKey) {
    return { valid: false, error: 'Missing Authorization header. Use "Authorization: Bearer <key>" or "X-API-Key: <key>"' }
  }

  let token: string | null = null
  
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else if (authHeader) {
    // Maybe they sent the key directly without "Bearer " prefix
    token = authHeader
  } else if (xApiKey) {
    token = xApiKey
  }

  if (!token) {
    return { valid: false, error: 'Invalid Authorization header format. Use "Authorization: Bearer <key>"' }
  }

  // Compare tokens (trim whitespace and handle URL encoding)
  const receivedToken = decodeURIComponent(token.trim())
  const expectedToken = PETEWATCH_API_KEY.trim()
  
  const isValid = receivedToken === expectedToken

  if (!isValid) {
    // Log for debugging (only first/last 4 chars for security)
    const receivedPreview = receivedToken.length > 8 
      ? `${receivedToken.slice(0, 4)}...${receivedToken.slice(-4)}` 
      : '***'
    const expectedPreview = expectedToken.length > 8 
      ? `${expectedToken.slice(0, 4)}...${expectedToken.slice(-4)}` 
      : '***'
    console.error(`[PeteWatch Auth] Token mismatch. Received: "${receivedPreview}" (len=${receivedToken.length}), Expected: "${expectedPreview}" (len=${expectedToken.length})`)
    return { valid: false, error: 'Invalid API key' }
  }

  return { valid: true }
}

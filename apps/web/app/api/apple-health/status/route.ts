/**
 * Apple Health API Status
 * GET - Check if machine API key auth is configured
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  extractBearerToken,
  hasMachineApiKey,
  machineApiKeys,
  tokenMatchesMachineKey,
} from '@/lib/api/machine-auth'

/**
 * GET /api/apple-health/status
 * Returns configuration status (without exposing secrets)
 */
export async function GET(request: NextRequest) {
  const keys = machineApiKeys()
  const primary = keys[0]
  const keyConfigured = hasMachineApiKey()
  const keyLength = primary?.length || 0
  const keyPreview = primary && keyLength > 8
    ? `${primary.slice(0, 4)}...${primary.slice(-4)}`
    : 'not set'

  const token = extractBearerToken(
    request.headers.get('Authorization'),
    request.headers.get('X-API-Key')
  )
  let authStatus = 'no auth header provided'

  if (token) {
    if (!keyConfigured) {
      authStatus = 'token provided but server key not configured'
    } else if (tokenMatchesMachineKey(token)) {
      authStatus = 'valid'
    } else {
      const tokenPreview = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '***'
      authStatus = `mismatch - received: "${tokenPreview}" (len=${token.length}), expected: "${keyPreview}" (len=${keyLength})`
    }
  }

  return NextResponse.json({
    success: true,
    status: {
      apiKeyConfigured: keyConfigured,
      apiKeyAliases: keys.length,
      apiKeyLength: keyLength,
      apiKeyPreview: keyPreview,
      environment: process.env.NODE_ENV,
      authCheck: authStatus,
    },
    timestamp: new Date().toISOString(),
  })
}

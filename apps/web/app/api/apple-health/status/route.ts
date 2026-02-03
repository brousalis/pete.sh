/**
 * Apple Health API Status
 * GET - Check if PeteWatch API is configured correctly
 */

import { NextRequest, NextResponse } from 'next/server'

const PETEWATCH_API_KEY = process.env.PETEWATCH_API_KEY

/**
 * GET /api/apple-health/status
 * Returns configuration status (without exposing secrets)
 */
export async function GET(request: NextRequest) {
  const keyConfigured = !!PETEWATCH_API_KEY && PETEWATCH_API_KEY.length > 0
  const keyLength = PETEWATCH_API_KEY?.length || 0
  const keyPreview = PETEWATCH_API_KEY && keyLength > 8 
    ? `${PETEWATCH_API_KEY.slice(0, 4)}...${PETEWATCH_API_KEY.slice(-4)}` 
    : 'not set'
  
  // Check if auth header matches (for testing)
  const authHeader = request.headers.get('Authorization')
  const xApiKey = request.headers.get('X-API-Key')
  let authStatus = 'no auth header provided'
  
  if (authHeader || xApiKey) {
    let token = ''
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    } else if (xApiKey) {
      token = xApiKey.trim()
    }
    
    if (token && PETEWATCH_API_KEY) {
      const matches = token === PETEWATCH_API_KEY.trim()
      const tokenPreview = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '***'
      authStatus = matches 
        ? 'valid' 
        : `mismatch - received: "${tokenPreview}" (len=${token.length}), expected: "${keyPreview}" (len=${keyLength})`
    } else {
      authStatus = 'token provided but server key not configured'
    }
  }

  return NextResponse.json({
    success: true,
    status: {
      apiKeyConfigured: keyConfigured,
      apiKeyLength: keyLength,
      apiKeyPreview: keyPreview,
      environment: process.env.NODE_ENV,
      authCheck: authStatus,
    },
    timestamp: new Date().toISOString(),
  })
}

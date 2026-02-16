/**
 * GET /api/diagnostics - Ecosystem diagnostics endpoint
 *
 * Returns server-side service availability, deployment mode, environment info,
 * and configuration state for debugging connectivity issues across all clients
 * (iOS, Electron, Firefox extension, web).
 */

import { NextResponse } from 'next/server'
import { getServiceAvailabilityStatus, isAnyLocalServiceAvailable } from '@/lib/adapters/base.adapter'
import { getDeploymentMode } from '@/lib/utils/mode'

export async function GET() {
  const services = getServiceAvailabilityStatus()
  const mode = getDeploymentMode()
  const isLocal = isAnyLocalServiceAvailable()

  // Serialize service availability (Dates aren't JSON-safe)
  const serializedServices: Record<string, {
    available: boolean
    checkedAt: string | null
    error?: string
  }> = {}

  for (const [name, status] of Object.entries(services)) {
    if (status) {
      serializedServices[name] = {
        available: status.available,
        checkedAt: status.checkedAt ? new Date(status.checkedAt).toISOString() : null,
        error: status.error,
      }
    } else {
      serializedServices[name] = {
        available: false,
        checkedAt: null,
        error: 'Never checked',
      }
    }
  }

  return NextResponse.json(
    {
      server: {
        mode,
        isLocal,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      env: {
        NEXT_PUBLIC_LOCAL_API_URL: process.env.NEXT_PUBLIC_LOCAL_API_URL ?? null,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
        NODE_ENV: process.env.NODE_ENV ?? null,
        VERCEL: process.env.VERCEL ?? null,
        VERCEL_URL: process.env.VERCEL_URL ?? null,
      },
      services: serializedServices,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  )
}

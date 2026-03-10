/**
 * Sync API Endpoint
 * 
 * GET /api/sync - Get sync status
 * POST /api/sync - Trigger a sync (local mode only)
 * 
 * This endpoint can be called by:
 * - A cron job (e.g., Vercel cron)
 * - Manually to force a sync
 * - A client-side interval
 */

/** Set to true to temporarily disable all sync (API + SyncManager). */
const SYNC_DISABLED = true

import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { syncAll, syncUnauthenticated, syncHue, syncCTA, syncFitness } from "@/lib/sync/background-sync"
import { isLocalMode, ensureLocalAvailabilityChecked } from "@/lib/utils/mode"
import { isSupabaseConfigured } from "@/lib/supabase/client"

/**
 * GET /api/sync - Get sync status and capabilities
 */
export async function GET() {
  try {
    await ensureLocalAvailabilityChecked()
    const canSync =
      !SYNC_DISABLED && isLocalMode() && isSupabaseConfigured()
    return successResponse({
      mode: isLocalMode() ? 'local' : 'production',
      supabaseConfigured: isSupabaseConfigured(),
      canSync,
      services: ['hue', 'cta', 'fitness', 'spotify', 'calendar'],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/sync - Trigger a sync
 * 
 * Body (optional):
 * - service: string - specific service to sync ('hue', 'cta', 'fitness', 'all')
 * - includeAuth: boolean - include auth-required services (spotify, calendar)
 */
export async function POST(request: NextRequest) {
  try {
    if (SYNC_DISABLED) {
      return errorResponse("Sync temporarily disabled", 503)
    }
    // Warm availability cache so first request to this process doesn't 403 (cold cache)
    await ensureLocalAvailabilityChecked()
    if (!isLocalMode()) {
      return errorResponse("Sync only available in local mode", 403)
    }

    if (!isSupabaseConfigured()) {
      return errorResponse("Supabase not configured", 400)
    }

    const body = await request.json().catch(() => ({}))
    const { service, includeAuth = false } = body

    // Sync specific service
    if (service && service !== 'all') {
      let result
      switch (service) {
        case 'hue':
          result = await syncHue()
          break
        case 'cta':
          result = await syncCTA()
          break
        case 'fitness':
          result = await syncFitness()
          break
        default:
          return errorResponse(`Unknown service: ${service}`, 400)
      }
      return successResponse(result)
    }

    // Sync all services
    if (includeAuth) {
      const result = await syncAll()
      return successResponse(result)
    } else {
      const result = await syncUnauthenticated()
      return successResponse(result)
    }
  } catch (error) {
    return handleApiError(error)
  }
}

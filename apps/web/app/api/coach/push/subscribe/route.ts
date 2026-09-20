/**
 * POST   /api/coach/push/subscribe — register a Web Push or APNs device
 * DELETE /api/coach/push/subscribe — deactivate one
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { coachDb } from '@/lib/services/coach/coach-data.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
      deviceToken?: string
      deviceLabel?: string
    }

    const db = coachDb()

    if (body.deviceToken) {
      const { error } = await db.from('coach_push_subscription').upsert(
        {
          kind: 'apns',
          device_token: body.deviceToken,
          device_label: body.deviceLabel ?? 'iPhone',
          is_active: true,
        },
        { onConflict: 'kind,device_token' }
      )

      if (error) return errorResponse(error.message, 500)
      return successResponse({ registered: true, kind: 'apns' })
    }

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return errorResponse('A push subscription requires an endpoint and keys.', 400)
    }

    const { error } = await db.from('coach_push_subscription').upsert(
      {
        kind: 'web',
        endpoint: body.endpoint,
        keys: body.keys,
        device_label: body.deviceLabel ?? 'Browser',
        is_active: true,
      },
      { onConflict: 'kind,endpoint' }
    )

    if (error) return errorResponse(error.message, 500)
    return successResponse({ registered: true, kind: 'web' })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { endpoint?: string; deviceToken?: string }
    const db = coachDb()

    if (body.endpoint) {
      await db
        .from('coach_push_subscription')
        .update({ is_active: false })
        .eq('kind', 'web')
        .eq('endpoint', body.endpoint)
    } else if (body.deviceToken) {
      await db
        .from('coach_push_subscription')
        .update({ is_active: false })
        .eq('kind', 'apns')
        .eq('device_token', body.deviceToken)
    }

    return successResponse({ deactivated: true })
  } catch (error) {
    return handleApiError(error)
  }
}

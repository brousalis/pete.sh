/**
 * GET /api/coach/projection — projected finish against the sub-3 split budget
 *
 * Also returns per-discipline leverage: seconds available weighed against knee
 * risk, which is what stops the answer from always being "run more".
 */

import { handleApiError, successResponse } from '@/lib/api/utils'
import { getRaceProjection } from '@/lib/services/coach/analytics.service'
import { improvementLeverage } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const projection = await getRaceProjection()
    if (!projection) {
      return successResponse(null)
    }

    return successResponse({
      ...projection,
      leverage: improvementLeverage(projection),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

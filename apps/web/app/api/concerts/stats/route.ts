/**
 * Concert Stats API
 * GET /api/concerts/stats - Get concert statistics
 */

import { NextRequest } from 'next/server'
import { ConcertsService } from '@/lib/services/concerts.service'
import { successResponse, handleApiError } from '@/lib/api/utils'

const service = new ConcertsService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined

    const stats = await service.getStats(year)
    const years = await service.getYears()

    return successResponse({ stats, years })
  } catch (error) {
    return handleApiError(error)
  }
}

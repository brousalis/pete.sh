import { handleApiError, successResponse } from '@/lib/api/utils'
import { FitnessService } from '@/lib/services/fitness.service'
import { NextRequest } from 'next/server'

const fitnessService = new FitnessService()

export async function GET(_request: NextRequest) {
  try {
    const stats = await fitnessService.getConsistencyStats()
    return successResponse(stats)
  } catch (error) {
    return handleApiError(error)
  }
}

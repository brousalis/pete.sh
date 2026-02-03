import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    const adapter = getFitnessAdapter()
    const stats = await adapter.getConsistencyStats()
    return successResponse(stats)
  } catch (error) {
    return handleApiError(error)
  }
}

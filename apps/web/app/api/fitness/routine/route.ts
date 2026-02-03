import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    const adapter = getFitnessAdapter()
    const routine = await adapter.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }
    return successResponse(routine)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adapter = getFitnessAdapter()
    const body = await request.json()
    const routine = await adapter.updateRoutine(body)
    return successResponse(routine)
  } catch (error) {
    return handleApiError(error)
  }
}

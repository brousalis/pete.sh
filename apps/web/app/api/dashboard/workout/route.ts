/**
 * Dashboard Workout-Only API
 * GET /api/dashboard/workout - Fetches only workout data for a day
 *
 * Use for day navigation when week-level data (routine, meal plan, etc.) is already cached.
 * Query params: day, week, year
 */

import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { withTimeout } from '@/lib/adapters/base.adapter'
import {
  workoutAutocompleteService,
  type HealthKitWorkoutSummary,
} from '@/lib/services/workout-autocomplete.service'
import type { DayOfWeek, Workout } from '@/lib/types/fitness.types'
import { NextRequest, NextResponse } from 'next/server'

const FETCH_TIMEOUT_MS = 8_000

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dayParam = searchParams.get('day')?.toLowerCase() || 'monday'
    const weekParam = searchParams.get('week')
    const yearParam = searchParams.get('year')

    const day = dayParam as DayOfWeek
    const fitnessAdapter = getFitnessAdapter()
    const weekNumber = weekParam ? parseInt(weekParam, 10) : fitnessAdapter.getCurrentWeekNumber()
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

    const w = await withTimeout(
      fitnessAdapter.getWorkoutForDay(day, weekNumber),
      FETCH_TIMEOUT_MS,
      'workout'
    )
    if (!w) {
      return NextResponse.json({ success: true, data: null })
    }

    const exerciseToWorkouts = await workoutAutocompleteService
      .getLinkedWorkoutsForDay(day, weekNumber, year, fitnessAdapter.getCurrentRoutineId())
      .catch(() => new Map())
    const allIds = [...new Set([...exerciseToWorkouts.values()].flat())]
    const details = await workoutAutocompleteService
      .getLinkedWorkoutDetails(allIds)
      .catch(() => new Map())
    const linked: Record<string, Array<{ id: string; workoutType: string; duration: number; activeCalories: number; hrAverage?: number; distanceMiles?: number }>> = {}
    for (const [exId, ids] of exerciseToWorkouts.entries()) {
      linked[exId] = ids
        .map((id: string) => details.get(id))
        .filter((x: HealthKitWorkoutSummary | undefined): x is HealthKitWorkoutSummary => x != null)
        .map((w2: HealthKitWorkoutSummary) => ({
          id: w2.id,
          workoutType: w2.workoutType,
          duration: w2.duration,
          activeCalories: w2.activeCalories,
          hrAverage: w2.hrAverage,
          distanceMiles: w2.distanceMiles,
        }))
    }

    const workout: Workout & { linkedHealthKitWorkouts?: typeof linked } = {
      ...w,
      linkedHealthKitWorkouts: linked,
    }

    return NextResponse.json({ success: true, data: workout })
  } catch (error) {
    console.error('[Dashboard Workout] Error:', error)
    return NextResponse.json({ success: true, data: null })
  }
}

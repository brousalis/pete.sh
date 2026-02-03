import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"
import { handleApiError, successResponse } from "@/lib/api/utils"
import { workoutAutocompleteService } from "@/lib/services/workout-autocomplete.service"
import type { DayOfWeek } from "@/lib/types/fitness.types"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const adapter = getFitnessAdapter()
    const { day: dayParam } = await params
    const day = dayParam.toLowerCase() as DayOfWeek
    const workout = await adapter.getWorkoutForDay(day)

    if (!workout) {
      return successResponse(null)
    }

    // Get linked HealthKit workouts for this day
    const searchParams = request.nextUrl.searchParams
    const weekParam = searchParams.get("week")
    const yearParam = searchParams.get("year")

    const weekNumber = weekParam ? parseInt(weekParam) : adapter.getCurrentWeekNumber()
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

    // Fetch linked workouts for exercises
    const exerciseToWorkouts = await workoutAutocompleteService.getLinkedWorkoutsForDay(
      day,
      weekNumber,
      year
    )

    // Get unique workout IDs and fetch their details
    const allWorkoutIds = [...new Set([...exerciseToWorkouts.values()].flat())]
    const workoutDetails = await workoutAutocompleteService.getLinkedWorkoutDetails(allWorkoutIds)

    // Build the linked workouts map: exerciseId -> workout summaries
    const linkedHealthKitWorkouts: Record<string, Array<{
      id: string
      workoutType: string
      duration: number
      activeCalories: number
      hrAverage?: number
      distanceMiles?: number
    }>> = {}

    for (const [exerciseId, workoutIds] of exerciseToWorkouts.entries()) {
      linkedHealthKitWorkouts[exerciseId] = workoutIds
        .map(id => workoutDetails.get(id))
        .filter((w): w is NonNullable<typeof w> => w !== undefined)
        .map(w => ({
          id: w.id,
          workoutType: w.workoutType,
          duration: w.duration,
          activeCalories: w.activeCalories,
          hrAverage: w.hrAverage,
          distanceMiles: w.distanceMiles,
        }))
    }

    return successResponse({
      ...workout,
      linkedHealthKitWorkouts,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

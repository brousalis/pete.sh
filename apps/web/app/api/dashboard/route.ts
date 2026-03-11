/**
 * Dashboard Aggregate API
 * GET /api/dashboard - Fetches all dashboard data in a single request
 *
 * Query params:
 *   - day: Day of week (e.g. tuesday)
 *   - week_start: YYYY-MM-DD (Monday of the week)
 *   - week: ISO week number (for HealthKit linked workouts)
 *   - year: Year (for HealthKit linked workouts)
 *   - max_calendar_results: Max calendar events (default 10)
 *   - debug: If "1", include timing metadata in response
 *
 * Returns partial data on per-section failure. Never throws; always returns 200.
 */

import { getCalendarAdapter } from '@/lib/adapters'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { withTimeout } from '@/lib/adapters/base.adapter'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { cookingService } from '@/lib/services/cooking.service'
import { mealPlanningService } from '@/lib/services/meal-planning.service'
import {
  workoutAutocompleteService,
  type HealthKitWorkoutSummary,
} from '@/lib/services/workout-autocomplete.service'
import { WeatherService } from '@/lib/services/weather.service'
import { isProductionMode } from '@/lib/utils/mode'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { MealPlan, Recipe, ShoppingList } from '@/lib/types/cooking.types'
import type {
  ConsistencyStats,
  DayOfWeek,
  WeeklyRoutine,
  Workout,
} from '@/lib/types/fitness.types'
import type {
  WeatherForecast,
  WeatherObservation,
} from '@/lib/types/weather.types'
import { NextRequest, NextResponse } from 'next/server'

const FETCH_TIMEOUT_MS = 8_000
const WEATHER_TIMEOUT_MS = 6_000

/** Activity metrics shape for ActivitySummary */
export interface ActivityDailyMetrics {
  steps: number | null
  active_calories: number | null
  exercise_minutes: number | null
  stand_hours: number | null
  move_goal: number | null
  exercise_goal: number | null
  stand_goal: number | null
  resting_heart_rate: number | null
  heart_rate_variability: number | null
}

export interface ActivityWeeklySummary {
  totalWorkouts: number
  totalDurationMin: number
  totalCalories: number
  totalDistanceMiles: number
  avgHr: number | null
}

export interface DashboardAggregateData {
  routine: WeeklyRoutine | null
  workout: Workout | null
  consistencyStats: ConsistencyStats | null
  mealPlan: MealPlan | null
  recipes: Recipe[]
  shoppingList: ShoppingList | null
  calendarEvents: CalendarEvent[]
  weather: WeatherObservation | null
  forecast: WeatherForecast | null
  activityDaily: ActivityDailyMetrics | null
  activityWeekly: ActivityWeeklySummary | null
}

export type DashboardDataErrors = Partial<Record<keyof DashboardAggregateData, string>>

interface DashboardResponse {
  success: boolean
  data: DashboardAggregateData
  errors?: DashboardDataErrors
  _meta?: Record<string, number>
}

function mapDbDailyToActivity(d: {
  steps: number
  active_calories: number
  exercise_minutes: number
  stand_hours: number
  move_goal: number | null
  exercise_goal: number | null
  stand_goal: number | null
  resting_heart_rate: number | null
  heart_rate_variability: number | null
} | null): ActivityDailyMetrics | null {
  if (!d) return null
  return {
    steps: d.steps ?? null,
    active_calories: d.active_calories ?? null,
    exercise_minutes: d.exercise_minutes ?? null,
    stand_hours: d.stand_hours ?? null,
    move_goal: d.move_goal ?? null,
    exercise_goal: d.exercise_goal ?? null,
    stand_goal: d.stand_goal ?? null,
    resting_heart_rate: d.resting_heart_rate ?? null,
    heart_rate_variability: d.heart_rate_variability ?? null,
  }
}

function mapWeeklyToActivity(w: {
  totalWorkouts: number
  totalDurationMin: number
  totalCalories: number
  totalDistanceMiles: number
  avgHr: number
} | undefined): ActivityWeeklySummary | null {
  if (!w) return null
  return {
    totalWorkouts: w.totalWorkouts,
    totalDurationMin: w.totalDurationMin,
    totalCalories: w.totalCalories,
    totalDistanceMiles: w.totalDistanceMiles,
    avgHr: w.avgHr ?? null,
  }
}

export async function GET(request: NextRequest) {
  const startTotal = Date.now()
  const searchParams = request.nextUrl.searchParams
  const dayParam = searchParams.get('day')?.toLowerCase() || 'monday'
  const weekStartStr = searchParams.get('week_start')
  const weekParam = searchParams.get('week')
  const yearParam = searchParams.get('year')
  const maxCalendar = parseInt(searchParams.get('max_calendar_results') || '10', 10)
  const debug = searchParams.get('debug') === '1'

  const day = dayParam as DayOfWeek
  const weekStart = weekStartStr ? new Date(weekStartStr + 'T12:00:00') : new Date()
  const fitnessAdapter = getFitnessAdapter()
  const weekNumber = weekParam ? parseInt(weekParam, 10) : fitnessAdapter.getCurrentWeekNumber()
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  const data: DashboardAggregateData = {
    routine: null,
    workout: null,
    consistencyStats: null,
    mealPlan: null,
    recipes: [],
    shoppingList: null,
    calendarEvents: [],
    weather: null,
    forecast: null,
    activityDaily: null,
    activityWeekly: null,
  }
  const errors: DashboardDataErrors = {}
  const meta: Record<string, number> = {}

  // ---- Parallel fetch wave 1 ----
  const [
    routineResult,
    workoutResult,
    consistencyResult,
    mealPlanResult,
    recipesResult,
    calendarResult,
    weatherResult,
    forecastResult,
    activityDailyResult,
    activityWeeklyResult,
  ] = await Promise.allSettled([
    withTimeout(fitnessAdapter.getRoutine(), FETCH_TIMEOUT_MS, 'routine').catch(() => null),
    (async () => {
      const w = await withTimeout(
        fitnessAdapter.getWorkoutForDay(day, weekNumber),
        FETCH_TIMEOUT_MS,
        'workout'
      )
      if (!w) return null
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
      return { ...w, linkedHealthKitWorkouts: linked }
    })(),
    withTimeout(fitnessAdapter.getConsistencyStats(), FETCH_TIMEOUT_MS, 'consistency').catch(
      () => null as ConsistencyStats | null
    ),
    withTimeout(mealPlanningService.getMealPlan(weekStart), FETCH_TIMEOUT_MS, 'mealPlan').catch(() => null),
    withTimeout(cookingService.getRecipes(), FETCH_TIMEOUT_MS, 'recipes').catch(() => []),
    (async () => {
      const calAdapter = getCalendarAdapter()
      if (isProductionMode() && calAdapter.isConfigured()) {
        await calAdapter.initializeWithTokens()
      }
      return withTimeout(
        calAdapter.getUpcomingEvents(undefined, maxCalendar),
        FETCH_TIMEOUT_MS,
        'calendar'
      )
    })(),
    withTimeout(
      new WeatherService().getCurrentWeather(),
      WEATHER_TIMEOUT_MS,
      'weather'
    ).catch(() => null),
    withTimeout(
      new WeatherService().getForecast(),
      WEATHER_TIMEOUT_MS,
      'forecast'
    ).catch(() => null),
    withTimeout(
      appleHealthService.getDailyMetrics(1).then((m) => m[0] ?? null),
      FETCH_TIMEOUT_MS,
      'activityDaily'
    ).catch(() => null),
    withTimeout(
      appleHealthService.getWeeklySummary(1).then((w) => w[0]),
      FETCH_TIMEOUT_MS,
      'activityWeekly'
    ).catch(() => null),
  ])

  if (routineResult.status === 'fulfilled' && routineResult.value) {
    data.routine = routineResult.value
  } else {
    errors.routine = 'Failed to load routine'
  }

  if (workoutResult.status === 'fulfilled' && workoutResult.value) {
    data.workout = workoutResult.value
  } else {
    errors.workout = 'Failed to load workout'
  }

  if (consistencyResult.status === 'fulfilled' && consistencyResult.value) {
    data.consistencyStats = consistencyResult.value
  }

  if (mealPlanResult.status === 'fulfilled' && mealPlanResult.value) {
    data.mealPlan = mealPlanResult.value
  } else {
    errors.mealPlan = 'Failed to load meal plan'
  }

  if (recipesResult.status === 'fulfilled' && Array.isArray(recipesResult.value)) {
    data.recipes = recipesResult.value
  }

  if (calendarResult.status === 'fulfilled' && Array.isArray(calendarResult.value)) {
    data.calendarEvents = calendarResult.value
  } else {
    errors.calendarEvents = 'Failed to load calendar'
  }

  if (weatherResult.status === 'fulfilled' && weatherResult.value) {
    data.weather = weatherResult.value
  }

  if (forecastResult.status === 'fulfilled' && forecastResult.value) {
    data.forecast = forecastResult.value
  }

  if (activityDailyResult.status === 'fulfilled') {
    data.activityDaily = mapDbDailyToActivity(activityDailyResult.value)
  }

  if (activityWeeklyResult.status === 'fulfilled') {
    data.activityWeekly = mapWeeklyToActivity(
      activityWeeklyResult.value ?? undefined
    )
  }

  // ---- Sequential: shopping list (depends on meal plan) ----
  if (data.mealPlan?.id) {
    try {
      const list = await withTimeout(
        mealPlanningService.getShoppingList(data.mealPlan.id),
        FETCH_TIMEOUT_MS,
        'shoppingList'
      )
      if (list) data.shoppingList = list
    } catch {
      // Shopping list may not exist; don't add to errors
    }
  }

  const payload: DashboardResponse = {
    success: true,
    data,
  }
  if (Object.keys(errors).length > 0) {
    payload.errors = errors
  }
  if (debug) {
    payload._meta = {
      totalMs: Date.now() - startTotal,
    }
  }

  return NextResponse.json(payload)
}

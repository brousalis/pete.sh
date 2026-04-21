/**
 * Dashboard aggregate data fetcher.
 *
 * Shared by:
 *  - `GET /api/dashboard` (backwards-compat HTTP endpoint)
 *  - The `/v2` server component (calls directly, no HTTP round-trip)
 *
 * Returns partial data on per-section failure. Never throws.
 */

import { withTimeout } from '@/lib/adapters/base.adapter'
import { getCalendarAdapter } from '@/lib/adapters'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { getTrainingReadinessFromData } from '@/lib/services/ai-coach.service'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { cookingService } from '@/lib/services/cooking.service'
import { getLatestScan } from '@/lib/services/fridge-scan.service'
import { mealPlanningService } from '@/lib/services/meal-planning.service'
import { WeatherService } from '@/lib/services/weather.service'
import {
  workoutAutocompleteService,
  type HealthKitWorkoutSummary,
} from '@/lib/services/workout-autocomplete.service'

export interface WorkoutDefinitionsVersion {
  number: number
  name: string
  activatedAt?: string
  trainingTime: string | null
}
import type { TrainingReadiness } from '@/lib/types/ai-coach.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type {
  FridgeScan,
  MealPlan,
  RecipeListItem,
  ShoppingList,
} from '@/lib/types/cooking.types'
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
import { isProductionMode } from '@/lib/utils/mode'

const FETCH_TIMEOUT_MS = 8_000
const WEATHER_TIMEOUT_MS = 6_000

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
  recipes: RecipeListItem[]
  shoppingList: ShoppingList | null
  calendarEvents: CalendarEvent[]
  weather: WeatherObservation | null
  forecast: WeatherForecast | null
  activityDaily: ActivityDailyMetrics | null
  activityWeekly: ActivityWeeklySummary | null
  /** Active workout-definitions version info (number, name, activatedAt, trainingTime) */
  workoutDefinitionsVersion: WorkoutDefinitionsVersion | null
  /** Last ~10 Apple Health workouts */
  appleWorkouts: unknown[]
  /** Most recent fridge scan (within the last 7 days logic lives on the client). */
  latestFridgeScan: FridgeScan | null
  /** AI Coach training readiness signal — above-the-fold on the fitness section. */
  aiCoachReadiness: TrainingReadiness | null
}

export type DashboardDataErrors = Partial<
  Record<keyof DashboardAggregateData, string>
>

/**
 * Dashboard data sections grouped by perceived-importance.
 *
 * - `critical`: above-the-fold — routine, today's workout, meal plan, recipes,
 *   shopping list, calendar, current weather.
 * - `secondary`: below-the-fold or long-poll — consistency stats, forecast,
 *   daily/weekly activity, workout definitions version, recent Apple workouts.
 */
export type DashboardScope = 'critical' | 'secondary' | 'all'

export interface DashboardAggregateParams {
  /** Day of week (e.g. 'tuesday') */
  day: DayOfWeek
  /** Monday of the target week */
  weekStart: Date
  /** ISO week number for HealthKit linked workouts */
  weekNumber: number
  /** Year for HealthKit linked workouts */
  year: number
  /** Max calendar results (default 10) */
  maxCalendarResults?: number
  /**
   * Which scope of data to fetch. Defaults to `all` (backwards compatible).
   * Use `critical` for the initial render / LCP path, then fire `secondary` in
   * an idle callback so above-the-fold UI isn't held back by below-the-fold data.
   */
  scope?: DashboardScope
}

export interface DashboardAggregateResult {
  data: DashboardAggregateData
  errors: DashboardDataErrors
  meta: { totalMs: number }
}

function mapDbDailyToActivity(
  d: {
    steps: number
    active_calories: number
    exercise_minutes: number
    stand_hours: number
    move_goal: number | null
    exercise_goal: number | null
    stand_goal: number | null
    resting_heart_rate: number | null
    heart_rate_variability: number | null
  } | null
): ActivityDailyMetrics | null {
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

function mapWeeklyToActivity(
  w:
    | {
        totalWorkouts: number
        totalDurationMin: number
        totalCalories: number
        totalDistanceMiles: number
        avgHr: number
      }
    | undefined
): ActivityWeeklySummary | null {
  if (!w) return null
  return {
    totalWorkouts: w.totalWorkouts,
    totalDurationMin: w.totalDurationMin,
    totalCalories: w.totalCalories,
    totalDistanceMiles: w.totalDistanceMiles,
    avgHr: w.avgHr ?? null,
  }
}

/** Sentinel promise that "fulfills" with null — used to skip out-of-scope fetches. */
const SKIP = <T>(value: T): Promise<T> => Promise.resolve(value)

export async function getDashboardAggregate(
  params: DashboardAggregateParams
): Promise<DashboardAggregateResult> {
  const startTotal = Date.now()
  const {
    day,
    weekStart,
    weekNumber,
    year,
    maxCalendarResults = 10,
    scope = 'all',
  } = params

  const wantsCritical = scope === 'critical' || scope === 'all'
  const wantsSecondary = scope === 'secondary' || scope === 'all'

  const fitnessAdapter = getFitnessAdapter()

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
    workoutDefinitionsVersion: null,
    appleWorkouts: [],
    latestFridgeScan: null,
    aiCoachReadiness: null,
  }
  const errors: DashboardDataErrors = {}

  // Forward-declared so the shopping-list chained promise can reference it.
  // eslint-disable-next-line prefer-const, @typescript-eslint/no-unused-vars
  let mealPlanPromise: Promise<MealPlan | null> = Promise.resolve(null)

  const shoppingListPromise = Promise.resolve().then(async () => {
    const plan = await mealPlanPromise
    if (!plan?.id) return null
    try {
      return await withTimeout(
        mealPlanningService.getShoppingList(plan.id),
        FETCH_TIMEOUT_MS,
        'shoppingList'
      )
    } catch {
      return null
    }
  })

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
    workoutDefsVersionResult,
    appleWorkoutsResult,
    shoppingListResult,
    latestFridgeScanResult,
    aiCoachReadinessResult,
  ] = await Promise.allSettled([
    wantsCritical
      ? withTimeout(fitnessAdapter.getRoutine(), FETCH_TIMEOUT_MS, 'routine').catch(
          () => null
        )
      : SKIP<WeeklyRoutine | null>(null),
    !wantsCritical
      ? SKIP<Workout | null>(null)
      : (async () => {
      const w = await withTimeout(
        fitnessAdapter.getWorkoutForDay(day, weekNumber),
        FETCH_TIMEOUT_MS,
        'workout'
      )
      if (!w) return null
      const exerciseToWorkouts = await workoutAutocompleteService
        .getLinkedWorkoutsForDay(
          day,
          weekNumber,
          year,
          fitnessAdapter.getCurrentRoutineId()
        )
        .catch(() => new Map())
      const allIds = [...new Set([...exerciseToWorkouts.values()].flat())]
      const details = await workoutAutocompleteService
        .getLinkedWorkoutDetails(allIds)
        .catch(() => new Map())
      const linked: Record<
        string,
        Array<{
          id: string
          workoutType: string
          duration: number
          activeCalories: number
          hrAverage?: number
          distanceMiles?: number
        }>
      > = {}
      for (const [exId, ids] of exerciseToWorkouts.entries()) {
        linked[exId] = ids
          .map((id: string) => details.get(id))
          .filter(
            (x: HealthKitWorkoutSummary | undefined): x is HealthKitWorkoutSummary =>
              x != null
          )
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
    wantsSecondary
      ? withTimeout(
          fitnessAdapter.getConsistencyStats(),
          FETCH_TIMEOUT_MS,
          'consistency'
        ).catch(() => null as ConsistencyStats | null)
      : SKIP<ConsistencyStats | null>(null),
    // Meal plan is resolved here; reused below via `mealPlanPromise` so the
    // shopping-list fetch can start as soon as the plan id is known, in parallel
    // with the rest of the aggregate calls below.
    (mealPlanPromise = wantsCritical
      ? withTimeout(
          mealPlanningService.getMealPlan(weekStart),
          FETCH_TIMEOUT_MS,
          'mealPlan'
        ).catch(() => null)
      : SKIP<MealPlan | null>(null)),
    wantsCritical
      ? withTimeout(
          cookingService.getRecipes(),
          FETCH_TIMEOUT_MS,
          'recipes'
        ).catch(() => [] as RecipeListItem[])
      : SKIP<RecipeListItem[]>([]),
    wantsCritical
      ? (async () => {
          const calAdapter = getCalendarAdapter()
          if (isProductionMode() && calAdapter.isConfigured()) {
            await calAdapter.initializeWithTokens()
          }
          return withTimeout(
            calAdapter.getUpcomingEvents(undefined, maxCalendarResults),
            FETCH_TIMEOUT_MS,
            'calendar'
          )
        })()
      : SKIP<CalendarEvent[]>([]),
    wantsCritical
      ? withTimeout(
          new WeatherService().getCurrentWeather(),
          WEATHER_TIMEOUT_MS,
          'weather'
        ).catch(() => null)
      : SKIP<WeatherObservation | null>(null),
    wantsSecondary
      ? withTimeout(
          new WeatherService().getForecast(),
          WEATHER_TIMEOUT_MS,
          'forecast'
        ).catch(() => null)
      : SKIP<WeatherForecast | null>(null),
    wantsSecondary
      ? withTimeout(
          appleHealthService.getDailyMetrics(1).then(m => m[0] ?? null),
          FETCH_TIMEOUT_MS,
          'activityDaily'
        ).catch(() => null)
      : SKIP<null>(null),
    wantsSecondary
      ? withTimeout(
          appleHealthService.getWeeklySummary(1).then(w => w[0]),
          FETCH_TIMEOUT_MS,
          'activityWeekly'
        ).catch(() => null)
      : SKIP<null>(null),
    !wantsSecondary
      ? SKIP<WorkoutDefinitionsVersion | null>(null)
      : (async () => {
          try {
            const versions = await withTimeout(
              fitnessAdapter.getVersions(fitnessAdapter.getCurrentRoutineId()),
              FETCH_TIMEOUT_MS,
              'workoutDefsVersion'
            )
            const routine = await withTimeout(
              fitnessAdapter.getRoutine(),
              FETCH_TIMEOUT_MS,
              'workoutDefsVersionRoutine'
            )
            const active = versions.activeVersion
            if (!active) return null
            const version: WorkoutDefinitionsVersion = {
              number: active.versionNumber,
              name: active.name,
              activatedAt: active.activatedAt,
              trainingTime: routine?.userProfile?.schedule?.trainingTime ?? null,
            }
            return version
          } catch {
            return null
          }
        })(),
    wantsSecondary
      ? withTimeout(
          appleHealthService.getRecentWorkouts(undefined, 10),
          FETCH_TIMEOUT_MS,
          'appleWorkouts'
        ).catch(() => [] as unknown[])
      : SKIP<unknown[]>([]),
    shoppingListPromise,
    wantsCritical
      ? withTimeout(getLatestScan(), FETCH_TIMEOUT_MS, 'latestFridgeScan').catch(
          () => null as FridgeScan | null
        )
      : SKIP<FridgeScan | null>(null),
    wantsCritical
      ? withTimeout(
          getTrainingReadinessFromData(),
          FETCH_TIMEOUT_MS,
          'aiCoachReadiness'
        ).catch(() => null as TrainingReadiness | null)
      : SKIP<TrainingReadiness | null>(null),
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

  if (
    workoutDefsVersionResult.status === 'fulfilled' &&
    workoutDefsVersionResult.value
  ) {
    data.workoutDefinitionsVersion = workoutDefsVersionResult.value
  }

  if (
    appleWorkoutsResult.status === 'fulfilled' &&
    Array.isArray(appleWorkoutsResult.value)
  ) {
    data.appleWorkouts = appleWorkoutsResult.value as unknown[]
  }

  if (
    shoppingListResult.status === 'fulfilled' &&
    shoppingListResult.value
  ) {
    data.shoppingList = shoppingListResult.value
  }

  if (
    latestFridgeScanResult.status === 'fulfilled' &&
    latestFridgeScanResult.value
  ) {
    data.latestFridgeScan = latestFridgeScanResult.value
  }

  if (
    aiCoachReadinessResult.status === 'fulfilled' &&
    aiCoachReadinessResult.value
  ) {
    data.aiCoachReadiness = aiCoachReadinessResult.value
  }

  const totalMs = Date.now() - startTotal
  // Log a structured breakdown for server-side instrumentation. In production
  // this is picked up by the platform log collector; in dev it surfaces slow
  // sections during manual profiling.
  if (process.env.NODE_ENV !== 'production' || totalMs > 1_500) {
    console.log('[dashboard-aggregate]', {
      totalMs,
      scope,
      sections: {
        routine: routineResult.status,
        workout: workoutResult.status,
        consistency: consistencyResult.status,
        mealPlan: mealPlanResult.status,
        recipes: recipesResult.status,
        calendar: calendarResult.status,
        weather: weatherResult.status,
        forecast: forecastResult.status,
        activityDaily: activityDailyResult.status,
        activityWeekly: activityWeeklyResult.status,
        workoutDefsVersion: workoutDefsVersionResult.status,
        appleWorkouts: appleWorkoutsResult.status,
        shoppingList: shoppingListResult.status,
        latestFridgeScan: latestFridgeScanResult.status,
        aiCoachReadiness: aiCoachReadinessResult.status,
      },
      errorKeys: Object.keys(errors),
    })
  }

  return {
    data,
    errors,
    meta: { totalMs },
  }
}

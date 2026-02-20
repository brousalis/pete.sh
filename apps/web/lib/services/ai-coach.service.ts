/**
 * AI Coach Service
 * Assembles context from all fitness data sources, computes training readiness,
 * and orchestrates LLM calls for analysis, chat, and routine suggestions.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import {
    convertToModelMessages,
    defaultSettingsMiddleware,
    extractJsonMiddleware,
    generateText,
    Output,
    smoothStream,
    stepCountIs,
    streamText,
    tool,
    wrapLanguageModel,
    type LanguageModelMiddleware,
    type UIMessage,
} from 'ai'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'

import { config } from '@/lib/config'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { exerciseWeightLogService } from '@/lib/services/exercise-weight-log.service'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import {
    DayOfWeekSchema,
    FullAnalysisSchema,
    PostWorkoutAnalysisSchema,
    type AiCoachInsight,
    type AnalysisTrigger,
    type FullAnalysis,
    type PostWorkoutAnalysis,
    type RoutineChange,
    type TrainingReadiness,
    type TrainingReadinessInput,
} from '@/lib/types/ai-coach.types'
import type { Workout } from '@/lib/types/fitness.types'
import type { Recipe } from '@/lib/types/cooking.types'
import { applyRoutineChanges, type ProgressiveOverloadEntry } from '@/lib/utils/routine-change-utils'

// ============================================
// LANGUAGE MODEL MIDDLEWARE
// ============================================

const loggingMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  wrapGenerate: async ({ doGenerate }) => {
    const start = Date.now()
    const result = await doGenerate()
    const elapsed = Date.now() - start
    console.log(
      `[AI Coach] generateText: ${elapsed}ms | input=${result.usage?.inputTokens?.total ?? 0} output=${result.usage?.outputTokens?.total ?? 0}`
    )
    return result
  },
  wrapStream: async ({ doStream }) => {
    const start = Date.now()
    const result = await doStream()
    let totalChars = 0
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        if (chunk.type === 'text-delta') totalChars += chunk.delta.length
        controller.enqueue(chunk)
      },
      flush() {
        console.log(
          `[AI Coach] streamText: ${Date.now() - start}ms | chars=${totalChars}`
        )
      },
    })
    return { ...result, stream: result.stream.pipeThrough(transformStream) }
  },
}

// ============================================
// DATE HELPER (Chicago / Central Time)
// ============================================

function getLocalDateString(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return formatter.format(now)
}

// ============================================
// ANTHROPIC CLIENT & MODEL
// ============================================

function getAnthropicClient() {
  const apiKey = config.aiCoach.anthropicApiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return createAnthropic({ apiKey })
}

function getModel() {
  const anthropic = getAnthropicClient()
  const baseModel = anthropic(config.aiCoach.defaultModel)

  return wrapLanguageModel({
    model: baseModel,
    middleware: [
      defaultSettingsMiddleware({
        settings: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
      extractJsonMiddleware(),
      loggingMiddleware,
    ],
  })
}

// ============================================
// TRAINING READINESS COMPUTATION
// ============================================

export function computeTrainingReadiness(
  input: TrainingReadinessInput
): TrainingReadiness {
  const signals: TrainingReadiness['signals'] = []

  // HRV Analysis (30% weight)
  let hrvScore = 50
  if (input.hrvValues.length >= 3) {
    const recent = input.hrvValues.slice(0, 3)
    const baseline = input.hrvValues.slice(0, 7)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length
    const hrvChange = ((recentAvg - baselineAvg) / baselineAvg) * 100

    if (hrvChange >= 5) {
      hrvScore = 90
      signals.push({
        metric: 'HRV',
        status: 'good',
        detail: `HRV up ${hrvChange.toFixed(0)}% vs 7-day baseline (${recentAvg.toFixed(0)} ms avg)`,
      })
    } else if (hrvChange >= -10) {
      hrvScore = 70
      signals.push({
        metric: 'HRV',
        status: 'good',
        detail: `HRV stable at ${recentAvg.toFixed(0)} ms (within normal range)`,
      })
    } else if (hrvChange >= -15) {
      hrvScore = 40
      signals.push({
        metric: 'HRV',
        status: 'warning',
        detail: `HRV dropped ${Math.abs(hrvChange).toFixed(0)}% vs baseline (${recentAvg.toFixed(0)} ms)`,
      })
    } else {
      hrvScore = 15
      signals.push({
        metric: 'HRV',
        status: 'concern',
        detail: `HRV dropped ${Math.abs(hrvChange).toFixed(0)}% vs baseline — significant fatigue signal`,
      })
    }
  }

  // Resting HR Analysis (20% weight)
  let rhrScore = 50
  if (input.restingHrValues.length >= 3) {
    const recent = input.restingHrValues.slice(0, 3)
    const baseline = input.restingHrValues.slice(0, 7)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length
    const rhrDiff = recentAvg - baselineAvg

    if (rhrDiff <= -2) {
      rhrScore = 90
      signals.push({
        metric: 'Resting HR',
        status: 'good',
        detail: `Resting HR improving: ${recentAvg.toFixed(0)} bpm (${Math.abs(rhrDiff).toFixed(0)} below baseline)`,
      })
    } else if (rhrDiff <= 3) {
      rhrScore = 70
      signals.push({
        metric: 'Resting HR',
        status: 'good',
        detail: `Resting HR stable at ${recentAvg.toFixed(0)} bpm`,
      })
    } else if (rhrDiff <= 5) {
      rhrScore = 35
      signals.push({
        metric: 'Resting HR',
        status: 'warning',
        detail: `Resting HR elevated: ${recentAvg.toFixed(0)} bpm (+${rhrDiff.toFixed(0)} above baseline)`,
      })
    } else {
      rhrScore = 10
      signals.push({
        metric: 'Resting HR',
        status: 'concern',
        detail: `Resting HR significantly elevated: ${recentAvg.toFixed(0)} bpm (+${rhrDiff.toFixed(0)} above baseline)`,
      })
    }
  }

  // Sleep Analysis (20% weight)
  let sleepScore = 50
  if (input.sleepDurations.length >= 1) {
    const recentSleep = input.sleepDurations.slice(0, 3)
    const avgSleep =
      recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length

    if (avgSleep >= 7.5) {
      sleepScore = 95
      signals.push({
        metric: 'Sleep',
        status: 'good',
        detail: `Averaging ${avgSleep.toFixed(1)} hours (excellent for recovery)`,
      })
    } else if (avgSleep >= 7) {
      sleepScore = 75
      signals.push({
        metric: 'Sleep',
        status: 'good',
        detail: `Averaging ${avgSleep.toFixed(1)} hours (adequate)`,
      })
    } else if (avgSleep >= 6) {
      sleepScore = 40
      signals.push({
        metric: 'Sleep',
        status: 'warning',
        detail: `Averaging ${avgSleep.toFixed(1)} hours — below target, impairs recovery`,
      })
    } else {
      sleepScore = 15
      signals.push({
        metric: 'Sleep',
        status: 'concern',
        detail: `Averaging ${avgSleep.toFixed(1)} hours — severely inadequate for muscle preservation`,
      })
    }
  }

  // Training Load (15% weight)
  let loadScore = 70
  const weeklyTarget = 420 // ~60 min/day * 7 days typical
  const loadRatio = input.recentTrainingLoad / (weeklyTarget * (3 / 7))
  if (loadRatio > 1.5) {
    loadScore = 25
    signals.push({
      metric: 'Training Load',
      status: 'warning',
      detail: `High recent load: ${input.recentTrainingLoad} min in last 3 days`,
    })
  } else if (loadRatio > 1.2) {
    loadScore = 50
    signals.push({
      metric: 'Training Load',
      status: 'good',
      detail: `Moderate load: ${input.recentTrainingLoad} min in last 3 days`,
    })
  } else {
    loadScore = 85
    signals.push({
      metric: 'Training Load',
      status: 'good',
      detail: `Fresh legs: ${input.recentTrainingLoad} min in last 3 days`,
    })
  }

  // Consistency (15% weight)
  let consistencyScore = 70
  if (input.skippedDays >= 3) {
    consistencyScore = 20
    signals.push({
      metric: 'Consistency',
      status: 'concern',
      detail: `${input.skippedDays} skipped days this week — check motivation/recovery`,
    })
  } else if (input.skippedDays >= 2) {
    consistencyScore = 50
    signals.push({
      metric: 'Consistency',
      status: 'warning',
      detail: `${input.skippedDays} skipped days this week`,
    })
  } else if (input.completionRate >= 0.8) {
    consistencyScore = 90
    signals.push({
      metric: 'Consistency',
      status: 'good',
      detail: `${(input.completionRate * 100).toFixed(0)}% completion rate this week`,
    })
  }

  // Weighted composite
  const score = Math.round(
    hrvScore * 0.3 +
      rhrScore * 0.2 +
      sleepScore * 0.2 +
      loadScore * 0.15 +
      consistencyScore * 0.15
  )

  const level =
    score >= 80
      ? 'fresh'
      : score >= 60
        ? 'moderate'
        : score >= 40
          ? 'fatigued'
          : 'overtrained'

  let todayRecommendation: string
  if (score >= 80) {
    todayRecommendation =
      'Train as planned. Good day for pushing intensity or attempting progressive overload.'
  } else if (score >= 60) {
    todayRecommendation =
      'Train as planned but stick to prescribed weights. Not the day for PRs.'
  } else if (score >= 40) {
    todayRecommendation =
      'Consider reducing intensity by 10-20% or swapping to a lighter workout variant.'
  } else {
    todayRecommendation =
      'Strong recommendation to rest today or do light active recovery only.'
  }

  return { score, level, signals, todayRecommendation }
}

// ============================================
// CONTEXT ASSEMBLY
// ============================================

async function loadCoachingKnowledge(): Promise<string> {
  try {
    const filePath = join(process.cwd(), 'data', 'coaching-knowledge.md')
    return await readFile(filePath, 'utf-8')
  } catch {
    console.warn('Could not load coaching-knowledge.md')
    return ''
  }
}

async function loadRoutineData(): Promise<{
  routine: Record<string, unknown> | null
  workoutDefinitions: Record<string, unknown> | null
}> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) {
    // Fallback to JSON files
    try {
      const routinePath = join(process.cwd(), 'data', 'fitness-routine.json')
      const defsPath = join(process.cwd(), 'data', 'workout-definitions.json')
      const [routineJson, defsJson] = await Promise.all([
        readFile(routinePath, 'utf-8'),
        readFile(defsPath, 'utf-8'),
      ])
      return {
        routine: JSON.parse(routineJson),
        workoutDefinitions: JSON.parse(defsJson),
      }
    } catch {
      return { routine: null, workoutDefinitions: null }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Get active routine version
  const { data: version } = await db
    .from('fitness_routine_versions')
    .select('*')
    .eq('is_active', true)
    .single()

  if (version) {
    return {
      routine: {
        userProfile: version.user_profile,
        injuryProtocol: version.injury_protocol,
        schedule: version.schedule,
        dailyRoutines: version.daily_routines,
      },
      workoutDefinitions: version.workout_definitions,
    }
  }

  // Fallback to fitness_routines table
  const { data: routine } = await db
    .from('fitness_routines')
    .select('*')
    .single()

  return {
    routine: routine
      ? {
          userProfile: routine.user_profile,
          injuryProtocol: routine.injury_protocol,
          schedule: routine.schedule,
          dailyRoutines: routine.daily_routines,
        }
      : null,
    workoutDefinitions: null,
  }
}

async function getWeeklyProgressData(): Promise<string> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return 'Weekly progress data unavailable (no database connection)'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('fitness_progress')
    .select('*')
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(14)

  if (!data || data.length === 0) return 'No weekly progress data available yet.'

  return data
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any) =>
        `Week ${d.week_number}/${d.year} ${d.day_of_week}: workout=${d.workout_completed ? 'YES' : 'no'} morning=${d.morning_routine_completed ? 'YES' : 'no'} night=${d.night_routine_completed ? 'YES' : 'no'}`
    )
    .join('\n')
}

export async function assembleContext(): Promise<string> {
  const [
    coachingKnowledge,
    routineData,
    recentWorkouts,
    dailyMetrics,
    exerciseWeightLogs,
    weeklyProgress,
    weeklySummary,
  ] = await Promise.all([
    loadCoachingKnowledge(),
    loadRoutineData(),
    appleHealthService.getRecentWorkouts(),
    appleHealthService.getDailyMetrics(14),
    exerciseWeightLogService.getRecentLogs(4),
    getWeeklyProgressData(),
    appleHealthService.getWeeklySummary(4),
  ])

  const sections: string[] = []

  // 1. Coaching Knowledge
  if (coachingKnowledge) {
    sections.push(coachingKnowledge)
  }

  // 2. User Profile & Injury Protocol
  if (routineData.routine) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = routineData.routine as any
    sections.push(`## Current User Profile
${JSON.stringify(r.userProfile, null, 2)}

## Current Injury Protocol
${JSON.stringify(r.injuryProtocol, null, 2)}

## Weekly Schedule
${JSON.stringify(r.schedule, null, 2)}

## Daily Routines (Morning & Night)
${JSON.stringify(r.dailyRoutines, null, 2)}`)
  }

  // 3. Current Workout Definitions
  if (routineData.workoutDefinitions) {
    sections.push(`## Current Workout Definitions (All 7 Days)
${JSON.stringify(routineData.workoutDefinitions, null, 2)}`)
  }

  // 4. Recent HealthKit Workouts (last 14 days)
  if (recentWorkouts.length > 0) {
    const workoutSummaries = recentWorkouts.slice(0, 20).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (w: any) =>
        `${w.start_date}: ${w.workout_type} | ${Math.round(w.duration / 60)}min | ${w.active_calories?.toFixed(0) || '?'}cal | HR avg:${w.hr_average || '?'} | ${w.distance_miles ? w.distance_miles.toFixed(1) + 'mi' : 'no distance'}`
    )
    sections.push(`## Recent HealthKit Workouts (Last 14 Days)
${workoutSummaries.join('\n')}`)
  }

  // 5. Daily Health Metrics (last 14 days)
  if (dailyMetrics.length > 0) {
    const metricsSummary = dailyMetrics.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => {
        const parts = [`${m.date}:`]
        parts.push(`steps=${m.steps}`)
        parts.push(`cal=${m.active_calories}/${m.total_calories}`)
        parts.push(`exercise=${m.exercise_minutes}min`)
        if (m.resting_heart_rate) parts.push(`RHR=${m.resting_heart_rate}`)
        if (m.heart_rate_variability)
          parts.push(`HRV=${m.heart_rate_variability.toFixed(0)}ms`)
        if (m.vo2_max) parts.push(`VO2=${m.vo2_max.toFixed(1)}`)
        if (m.sleep_duration)
          parts.push(`sleep=${(m.sleep_duration / 3600).toFixed(1)}h`)
        if (m.body_mass_lbs) parts.push(`weight=${m.body_mass_lbs}lbs`)
        if (m.body_fat_percentage)
          parts.push(`bf=${m.body_fat_percentage.toFixed(1)}%`)
        if (m.lean_body_mass_lbs)
          parts.push(`lean=${m.lean_body_mass_lbs.toFixed(1)}lbs`)
        return parts.join(' ')
      }
    )
    sections.push(`## Daily Health Metrics (Last 14 Days)
${metricsSummary.join('\n')}`)
  }

  // 6. Exercise Weight Logs (last 4 weeks)
  if (exerciseWeightLogs.length > 0) {
    const logSummary = exerciseWeightLogs.map(
      (l) =>
        `${l.loggedAt?.split('T')[0] || '?'} | ${l.dayOfWeek} | ${l.exerciseName}: ${l.setsCompleted || '?'}x${l.repsCompleted || '?'} @ ${l.weightLbs || '?'}lbs RPE:${l.rpe || '?'}`
    )
    sections.push(`## Exercise Weight Logs (Last 4 Weeks)
${logSummary.join('\n')}`)
  }

  // 7. Weekly Progress & Consistency
  sections.push(`## Weekly Progress & Completion
${weeklyProgress}`)

  // 8. Weekly Training Summary
  if (weeklySummary && Array.isArray(weeklySummary)) {
    const summaries = weeklySummary.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) =>
        `Week of ${s.weekStart}: ${s.totalWorkouts} workouts, ${s.totalDurationMin}min, ${s.totalCalories}cal, ${s.totalDistanceMiles?.toFixed(1) || 0}mi, avg HR ${s.avgHr || '?'}`
    )
    sections.push(`## Weekly Training Summary (Last 4 Weeks)
${summaries.join('\n')}`)
  }

  // 9. Weekly Nutrition Summary (from meal plans)
  const nutritionSummary = await getWeeklyNutritionSummary()
  if (nutritionSummary) {
    sections.push(nutritionSummary)
  }

  return sections.join('\n\n---\n\n')
}

async function getWeeklyNutritionSummary(): Promise<string | null> {
  try {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    const weekStart = monday.toISOString().split('T')[0]

    const { data: mealPlan } = await supabase
      .from('meal_plans')
      .select('meals')
      .eq('week_start_date', weekStart)
      .single()

    if (!mealPlan?.meals) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meals = mealPlan.meals as Record<string, any>
    const recipeIds = new Set<string>()

    for (const day of Object.values(meals)) {
      if (!day || typeof day !== 'object') continue
      for (const val of Object.values(day as Record<string, unknown>)) {
        if (typeof val === 'string' && val.length > 10) recipeIds.add(val)
      }
    }

    if (recipeIds.size === 0) return null

    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, calories_per_serving, protein_g, fat_g, carbs_g, fiber_g, nutrition_category')
      .in('id', Array.from(recipeIds))

    if (!recipes?.length) return null

    const enrichedRecipes = recipes.filter((r: Record<string, unknown>) => r.calories_per_serving)
    if (enrichedRecipes.length === 0) return null

    let totalCal = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0, totalFiber = 0
    let mealCount = 0

    for (const day of Object.values(meals)) {
      if (!day || typeof day !== 'object') continue
      for (const recipeId of Object.values(day as Record<string, unknown>)) {
        if (typeof recipeId !== 'string') continue
        const recipe = enrichedRecipes.find((r: Record<string, unknown>) => r.id === recipeId) as Recipe | undefined
        if (recipe?.calories_per_serving) {
          totalCal += recipe.calories_per_serving
          totalProtein += recipe.protein_g ?? 0
          totalFat += recipe.fat_g ?? 0
          totalCarbs += recipe.carbs_g ?? 0
          totalFiber += recipe.fiber_g ?? 0
          mealCount++
        }
      }
    }

    if (mealCount === 0) return null

    const avgDailyCal = Math.round(totalCal / 7)
    const avgDailyProtein = Math.round(totalProtein / 7)

    const categoryFreq = new Map<string, number>()
    for (const r of enrichedRecipes) {
      const rec = r as Recipe
      for (const cat of rec.nutrition_category ?? []) {
        categoryFreq.set(cat, (categoryFreq.get(cat) || 0) + 1)
      }
    }

    const topCategories = Array.from(categoryFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat)

    return `## Weekly Nutrition Summary (Current Week)
Planned meals with nutrition data: ${mealCount}
Total weekly: ${totalCal}cal | ${Math.round(totalProtein)}g protein | ${Math.round(totalFat)}g fat | ${Math.round(totalCarbs)}g carbs | ${Math.round(totalFiber)}g fiber
Daily average: ~${avgDailyCal}cal | ~${avgDailyProtein}g protein
Meal profile trends: ${topCategories.length > 0 ? topCategories.join(', ') : 'No categories yet'}
${enrichedRecipes.length < recipeIds.size ? `Note: ${recipeIds.size - enrichedRecipes.length} of ${recipeIds.size} planned recipes don't have nutrition data yet.` : ''}`
  } catch {
    return null
  }
}

// ============================================
// TRAINING READINESS FROM DB DATA
// ============================================

export async function getTrainingReadinessFromData(): Promise<TrainingReadiness> {
  const dailyMetrics = await appleHealthService.getDailyMetrics(7)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = dailyMetrics as any[]

  const hrvValues = metrics
    .filter((m) => m.heart_rate_variability != null)
    .map((m) => m.heart_rate_variability as number)

  const restingHrValues = metrics
    .filter((m) => m.resting_heart_rate != null)
    .map((m) => m.resting_heart_rate as number)

  const sleepDurations = metrics
    .filter((m) => m.sleep_duration != null)
    .map((m) => (m.sleep_duration as number) / 3600)

  // Recent training load from last 3 days of workouts
  const recentWorkouts = await appleHealthService.getRecentWorkouts()
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const recentTrainingLoad = recentWorkouts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((w: any) => new Date(w.start_date) >= threeDaysAgo)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((sum: number, w: any) => sum + (w.duration || 0) / 60, 0)

  // Completion rate from weekly progress
  const supabase = getSupabaseClientForOperation('read')
  let completionRate = 0.75
  let skippedDays = 0

  if (supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: progress } = await db
      .from('fitness_progress')
      .select('*')
      .gte('created_at', weekAgo.toISOString())

    if (progress && progress.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completed = progress.filter((p: any) => p.workout_completed).length
      completionRate = completed / progress.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skippedDays = progress.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => !p.workout_completed && !p.morning_routine_completed
      ).length
    }
  }

  return computeTrainingReadiness({
    hrvValues,
    restingHrValues,
    sleepDurations,
    recentTrainingLoad,
    completionRate,
    skippedDays,
  })
}

// ============================================
// LLM ANALYSIS
// ============================================

export async function runFullAnalysis(): Promise<{
  analysis: FullAnalysis
  inputTokens: number
  outputTokens: number
}> {
  const context = await assembleContext()
  const model = getModel()

  const result = await generateText({
    model,
    output: Output.object({ schema: FullAnalysisSchema }),
    system: `You are an expert AI fitness coach. Analyze the athlete's current data and provide actionable recommendations. Be specific — reference actual numbers from the data. Follow the coaching knowledge base principles strictly.

Today's date: ${getLocalDateString()}`,
    prompt: context,
  })

  return {
    analysis: result.output!,
    inputTokens: result.usage?.inputTokens || 0,
    outputTokens: result.usage?.outputTokens || 0,
  }
}

export async function runPostWorkoutAnalysis(
  workoutContext?: string
): Promise<{
  analysis: PostWorkoutAnalysis
  inputTokens: number
  outputTokens: number
}> {
  const context = await assembleContext()
  const model = getModel()

  const prompt = workoutContext
    ? `${context}\n\n## Just Completed Workout\n${workoutContext}`
    : context

  const result = await generateText({
    model,
    output: Output.object({ schema: PostWorkoutAnalysisSchema }),
    system: `You are an expert AI fitness coach providing a quick post-workout debrief. Be concise and encouraging. Reference specific metrics from the workout.

Today's date: ${getLocalDateString()}`,
    prompt,
  })

  return {
    analysis: result.output!,
    inputTokens: result.usage?.inputTokens || 0,
    outputTokens: result.usage?.outputTokens || 0,
  }
}

// ============================================
// STREAMING CHAT
// ============================================

export async function createChatStream(
  uiMessages: UIMessage[],
  systemContext: string
) {
  const model = getModel()
  const modelMessages = await convertToModelMessages(uiMessages)

  return streamText({
    model,
    system: `You are an expert AI fitness coach embedded in the athlete's training dashboard. You have full access to their workout data, body composition, and health metrics. Be conversational but specific — always back up recommendations with data. Follow the coaching knowledge base principles.

When the user asks you to change, swap, add, remove, or modify exercises in their routine, or to adjust weights/reps/sets, use the proposeRoutineVersion tool. Include all related changes in a single tool call. Do not narrate what you plan to change before calling the tool — just call it directly. Never modify the routine without using this tool.

Today's date: ${getLocalDateString()}

${systemContext}`,
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
    tools: {
      getExerciseHistory: tool({
        description:
          'Get weight/rep progression history for a specific exercise',
        inputSchema: z.object({
          exerciseName: z.string().describe('Name of the exercise'),
          weeks: z.number().default(8).describe('Weeks to look back'),
        }),
        execute: async ({ exerciseName, weeks }) => {
          const logs =
            await exerciseWeightLogService.getExerciseHistoryByName(
              exerciseName,
              weeks
            )
          return logs.length > 0
            ? logs.map(
                (l) =>
                  `${l.loggedAt?.split('T')[0]} | ${l.exerciseName}: ${l.setsCompleted}x${l.repsCompleted} @ ${l.weightLbs}lbs RPE:${l.rpe}`
              )
            : ['No weight logs found for this exercise']
        },
      }),
      getBodyCompositionTrend: tool({
        description:
          'Get body weight, body fat %, and lean mass history from Fitindex scale',
        inputSchema: z.object({
          days: z.number().default(30).describe('Days to look back'),
        }),
        execute: async ({ days }) => {
          const metrics = await appleHealthService.getDailyMetrics(days)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return metrics
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((m: any) => m.body_mass_lbs != null)
            .map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (m: any) =>
                `${m.date}: ${m.body_mass_lbs}lbs | ${m.body_fat_percentage ? m.body_fat_percentage.toFixed(1) + '% bf' : 'no bf'} | ${m.lean_body_mass_lbs ? m.lean_body_mass_lbs.toFixed(1) + 'lbs lean' : 'no lean'}`
            )
        },
      }),
      getDailyMetrics: tool({
        description: 'Get daily health metrics (HRV, resting HR, sleep, VO2max)',
        inputSchema: z.object({
          days: z.number().default(7).describe('Days to look back'),
        }),
        execute: async ({ days }) => {
          const metrics = await appleHealthService.getDailyMetrics(days)
          return metrics.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (m: any) =>
              `${m.date}: RHR=${m.resting_heart_rate || '?'} HRV=${m.heart_rate_variability?.toFixed(0) || '?'}ms sleep=${m.sleep_duration ? (m.sleep_duration / 3600).toFixed(1) + 'h' : '?'} VO2=${m.vo2_max?.toFixed(1) || '?'}`
          )
        },
      }),
      getTrainingReadiness: tool({
        description: 'Get current training readiness score and signals',
        inputSchema: z.object({}),
        execute: async () => {
          const readiness = await getTrainingReadinessFromData()
          return readiness
        },
      }),
      proposeRoutineVersion: tool({
        description:
          'Propose changes to the workout routine. Shows the user a preview card with the changes for them to review and apply. Use this whenever the user asks to change, swap, add, remove, or modify exercises. Include all related changes in a single call.',
        inputSchema: z.object({
          commitMessage: z.string().describe('Brief description of what changed, e.g. "Swapped bench press for incline DB press on Monday"'),
          routineChanges: z.array(z.object({
            day: DayOfWeekSchema,
            section: z.enum(['warmup', 'exercises', 'finisher', 'metabolicFlush', 'mobility']).describe('Workout section to modify'),
            action: z.enum(['add', 'remove', 'modify', 'swap']).describe('Type of change'),
            exerciseName: z.string().describe('Name of the existing exercise (for remove/modify/swap) or new exercise (for add)'),
            newExerciseName: z.string().optional().describe('Name of replacement exercise (for swap)'),
            sets: z.number().optional(),
            reps: z.number().optional(),
            weight: z.number().optional().describe('Weight in lbs'),
            duration: z.number().optional().describe('Duration in seconds'),
            rest: z.number().optional().describe('Rest in seconds'),
            form: z.string().optional().describe('Form cues'),
            reasoning: z.string().describe('Why this change is recommended'),
          })).optional().default([]).describe('Structural changes to the routine (add/remove/modify/swap exercises)'),
          progressiveOverload: z.array(z.object({
            exerciseName: z.string().describe('Exercise name to adjust'),
            suggestedWeight: z.number().optional().describe('New weight in lbs'),
            suggestedReps: z.number().optional().describe('New rep count'),
            suggestedSets: z.number().optional().describe('New set count'),
            reasoning: z.string().describe('Why this progression is recommended'),
          })).optional().default([]).describe('Weight/rep/set progression adjustments'),
        }),
        execute: async ({ commitMessage, routineChanges, progressiveOverload }) => {
          try {
            const supabase = getSupabaseClientForOperation('read')
            if (!supabase) {
              return { status: 'error' as const, message: 'Database not available' }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = supabase as any
            const routineId = 'climber-physique'

            const { data: activeVersion, error: activeError } = await db
              .from('fitness_routine_versions')
              .select('workout_definitions')
              .eq('routine_id', routineId)
              .eq('is_active', true)
              .single()

            if (activeError || !activeVersion) {
              return { status: 'error' as const, message: 'No active routine version found' }
            }

            const workoutDefs: Record<string, Workout> = JSON.parse(
              JSON.stringify(activeVersion.workout_definitions || {})
            )

            const mappedChanges: RoutineChange[] = routineChanges.map((c) => ({
              ...c,
              priority: 'immediate' as const,
            }))

            const mappedOverload: ProgressiveOverloadEntry[] = (progressiveOverload || []).map((o) => ({
              exerciseName: o.exerciseName,
              suggestedWeight: o.suggestedWeight,
              suggestedReps: o.suggestedReps,
              suggestedSets: o.suggestedSets,
              reasoning: o.reasoning,
            }))

            const { changesApplied, diff } = applyRoutineChanges(
              workoutDefs,
              mappedChanges,
              mappedOverload,
            )

            if (changesApplied === 0) {
              return {
                status: 'error' as const,
                message: 'No matching exercises found for the proposed changes. Check the exercise names match what\'s in the routine.',
              }
            }

            return {
              status: 'pending_confirmation' as const,
              commitMessage,
              routineId,
              routineChanges: mappedChanges,
              progressiveOverload: mappedOverload,
              diff,
              changesApplied,
            }
          } catch (error) {
            return {
              status: 'error' as const,
              message: error instanceof Error ? error.message : 'Failed to prepare routine changes',
            }
          }
        },
      }),
    },
    onStepFinish({ finishReason, usage, toolCalls }) {
      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          console.log(
            `[AI Coach] Tool ${tc.toolName}: reason=${finishReason} | tokens=${usage?.totalTokens || 0}`
          )
        }
      }
    },
  })
}

// ============================================
// INSIGHT PERSISTENCE
// ============================================

export async function saveInsight(
  routineId: string,
  triggerType: AnalysisTrigger,
  analysis: FullAnalysis | PostWorkoutAnalysis,
  model: string,
  inputTokens: number,
  outputTokens: number,
  triggerContext?: Record<string, unknown>
): Promise<string | null> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const hasRoutineSuggestions =
    'routineChanges' in analysis &&
    Array.isArray(analysis.routineChanges) &&
    analysis.routineChanges.length > 0

  const readinessScore =
    'trainingReadiness' in analysis
      ? analysis.trainingReadiness.score
      : undefined

  const { data, error } = await db
    .from('ai_coach_insights')
    .insert({
      routine_id: routineId,
      trigger_type: triggerType,
      trigger_context: triggerContext || null,
      analysis,
      training_readiness_score: readinessScore || null,
      has_routine_suggestions: hasRoutineSuggestions,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving AI coach insight:', error)
    return null
  }

  return data?.id || null
}

export async function getInsights(
  limit: number = 10,
  triggerType?: AnalysisTrigger
): Promise<AiCoachInsight[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  let query = db
    .from('ai_coach_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (triggerType) {
    query = query.eq('trigger_type', triggerType)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching AI coach insights:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((d: any) => ({
    id: d.id,
    routineId: d.routine_id,
    triggerType: d.trigger_type,
    triggerContext: d.trigger_context,
    analysis: d.analysis,
    trainingReadinessScore: d.training_readiness_score,
    hasRoutineSuggestions: d.has_routine_suggestions,
    model: d.model,
    inputTokens: d.input_tokens,
    outputTokens: d.output_tokens,
    createdAt: d.created_at,
  }))
}

export async function getLatestInsight(): Promise<AiCoachInsight | null> {
  const insights = await getInsights(1)
  return insights[0] || null
}

// ============================================
// CHAT PERSISTENCE
// ============================================

export async function saveChatMessages(
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Auto-generate title from the first user message
  const firstUserMsg = messages.find((m) => m.role === 'user')
  const firstText = firstUserMsg?.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
  const title = firstText
    ? firstText.length > 60
      ? firstText.slice(0, 57) + '...'
      : firstText
    : null

  // Check if conversation already has a title (only set on first save)
  const { data: existing } = await db
    .from('ai_coach_conversations')
    .select('title')
    .eq('id', chatId)
    .single()

  const upsertData: Record<string, unknown> = {
    id: chatId,
    messages: JSON.parse(JSON.stringify(messages)),
    updated_at: new Date().toISOString(),
  }

  // Only set title if there isn't one already
  if (!existing?.title && title) {
    upsertData.title = title
  }

  const { error } = await db
    .from('ai_coach_conversations')
    .upsert(upsertData, { onConflict: 'id' })

  if (error) {
    console.error('[AI Coach] Error saving chat:', error)
  }
}

export async function loadChatMessages(
  chatId: string
): Promise<UIMessage[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('ai_coach_conversations')
    .select('messages')
    .eq('id', chatId)
    .single()

  if (error || !data) return []
  return (data.messages as UIMessage[]) || []
}

export async function getLatestChatId(): Promise<string | null> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('ai_coach_conversations')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return data?.id || null
}

export interface ConversationSummary {
  id: string
  title: string
  messageCount: number
  updatedAt: string
  createdAt: string
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('ai_coach_conversations')
    .select('id, title, messages, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => {
    const msgs = (row.messages as UIMessage[]) || []
    const firstUserMsg = msgs.find((m) => m.role === 'user')
    const firstText = firstUserMsg?.parts
      ?.filter((p: { type: string }) => p.type === 'text')
      .map((p: { type: string; text?: string }) => p.text || '')
      .join(' ')

    let title = row.title
    if (!title && firstText) {
      title = firstText.length > 60 ? firstText.slice(0, 57) + '...' : firstText
    }

    return {
      id: row.id,
      title: title || 'Untitled conversation',
      messageCount: msgs.length,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    }
  })
}

export async function deleteConversation(chatId: string): Promise<boolean> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('ai_coach_conversations')
    .delete()
    .eq('id', chatId)

  if (error) {
    console.error('[AI Coach] Error deleting conversation:', error)
    return false
  }
  return true
}

// ============================================
// CONTEXT EXPORT (replaces workout-llm.md)
// ============================================

export async function exportContextAsMarkdown(): Promise<string> {
  const context = await assembleContext()
  const readiness = await getTrainingReadinessFromData()

  return `# AI Fitness Coach Context (Auto-Generated)
Generated: ${new Date().toISOString()}

## Training Readiness: ${readiness.score}/100 (${readiness.level})
${readiness.signals.map((s) => `- ${s.metric}: ${s.detail}`).join('\n')}
${readiness.todayRecommendation}

---

${context}`
}

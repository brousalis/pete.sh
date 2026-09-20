/**
 * Nutrition.
 *
 * The athlete's previous protocol was a 300–400 kcal deficit, a fast until
 * 2 PM and zero-carb Sundays, at roughly 10–11% body fat while healing
 * cartilage and tendon. That combination impairs connective tissue repair,
 * undercuts two-a-day endurance work, and sits in RED-S territory.
 *
 * This module implements the replacement: maintenance energy, protein held
 * high and flat, carbohydrate periodised to the day's training load. Weight
 * is treated as a band to hold, not a target to cut toward.
 */

import { daysAgo } from '@petehome/coach-core'

import { coachDb, getAthleteProfile, getDailyMetrics, getSessionsInRange } from './coach-data.service'

export type FuellingWindow = 'high' | 'moderate' | 'low'

export interface NutritionTargets {
  date: string
  plannedTss: number
  fuellingWindow: FuellingWindow
  bodyWeightLbs: number
  targets: {
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }
  logged: {
    kcal: number | null
    proteinG: number | null
    carbsG: number | null
    adherence: number | null
  } | null
  guidance: string[]
  flags: string[]
}

/** Baseline energy expenditure before training, in kcal. */
function estimateRestingExpenditure(weightLbs: number, heightCm: number | null, age: number | null): number {
  const weightKg = weightLbs * 0.453592
  const height = heightCm ?? 183
  const years = age ?? 37

  // Mifflin-St Jeor, male.
  const bmr = 10 * weightKg + 6.25 * height - 5 * years + 5

  // Sedentary multiplier; training energy is added separately so it tracks
  // the actual session rather than a generic activity factor.
  return Math.round(bmr * 1.35)
}

export async function getNutritionTargets(date?: string): Promise<NutritionTargets> {
  const target = date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const [profile, sessions, metrics, logged] = await Promise.all([
    getAthleteProfile(),
    getSessionsInRange(target, target),
    getDailyMetrics(daysAgo(14), target),
    coachDb().from('coach_nutrition_day').select('*').eq('log_date', target).maybeSingle(),
  ])

  const plannedTss = sessions.reduce((sum, session) => sum + (session.plannedLoad ?? 0), 0)

  const latestWeight =
    [...metrics].reverse().find((metric) => metric.bodyMassLbs != null)?.bodyMassLbs ??
    profile?.weightTargetHighLbs ??
    175

  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 86_400_000))
    : null

  const weightKg = latestWeight * 0.453592

  const fuellingWindow: FuellingWindow =
    plannedTss >= 90 ? 'high' : plannedTss >= 45 ? 'moderate' : 'low'

  // Training energy, roughly 10 kcal per TSS point for an athlete this size.
  const trainingKcal = Math.round(plannedTss * 10)
  const restingKcal = estimateRestingExpenditure(latestWeight, profile?.heightCm ?? null, age)

  // Maintenance, not a deficit.
  const kcal = restingKcal + trainingKcal

  // Protein stays high and flat: it supports tendon and cartilage repair and
  // preserves lean mass, and there is no reason to periodise it.
  const proteinG = Math.round(weightKg * 2.0)

  const carbsPerKg = fuellingWindow === 'high' ? 6 : fuellingWindow === 'moderate' ? 4 : 3
  const carbsG = Math.round(weightKg * carbsPerKg)

  // Fat fills the remaining energy, with a floor for hormonal health.
  const remainingKcal = kcal - proteinG * 4 - carbsG * 4
  const fatG = Math.max(Math.round(weightKg * 0.8), Math.round(remainingKcal / 9))

  const guidance: string[] = []
  const flags: string[] = []

  guidance.push('Collagen with vitamin C 30–60 minutes before strength or PT work.')

  if (fuellingWindow === 'high') {
    guidance.push('Carbohydrate before and during the key session. Use long days to rehearse race fuelling.')
  } else if (fuellingWindow === 'low') {
    guidance.push('Lower-carbohydrate day, but hold protein and total energy. This is a rest day, not a fast.')
  }

  // --- RED-S surveillance ---------------------------------------------------
  // Low energy availability shows up as a falling weight trend, a falling
  // resting heart rate baseline alongside poor recovery, or suppressed HRV.
  // Worth catching early: it degrades bone and tendon, which is the last
  // thing this athlete needs.
  const weights = metrics
    .map((metric) => metric.bodyMassLbs)
    .filter((value): value is number => value != null)

  if (weights.length >= 7) {
    const first = weights[0]!
    const last = weights[weights.length - 1]!
    const changePct = ((last - first) / first) * 100

    if (changePct < -1.5) {
      flags.push('weight_falling')
      guidance.push(
        `Weight is down ${Math.abs(changePct).toFixed(1)}% over two weeks. That is faster than intended while healing; increase carbohydrate on training days.`
      )
    }
  }

  const bandLow = profile?.weightTargetLowLbs ?? 170
  if (latestWeight < bandLow) {
    flags.push('below_weight_band')
    guidance.push(
      `At ${latestWeight.toFixed(1)} lb, below the ${bandLow} lb floor. Add energy rather than holding the line here.`
    )
  }

  const recentSleep = metrics
    .slice(-5)
    .map((metric) => metric.sleepSeconds)
    .filter((value): value is number => value != null)

  if (recentSleep.length >= 3) {
    const avgHours = recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length / 3600
    if (avgHours < 6.5 && plannedTss > 60) {
      flags.push('underslept_high_load')
      guidance.push('Short sleep with a hard day planned: do not also under-fuel it.')
    }
  }

  const loggedRow = logged.data as Record<string, unknown> | null

  return {
    date: target,
    plannedTss,
    fuellingWindow,
    bodyWeightLbs: Math.round(latestWeight * 10) / 10,
    targets: { kcal, proteinG, carbsG, fatG },
    logged: loggedRow
      ? {
          kcal: loggedRow.actual_kcal ? Number(loggedRow.actual_kcal) : null,
          proteinG: loggedRow.actual_protein_g ? Number(loggedRow.actual_protein_g) : null,
          carbsG: loggedRow.actual_carbs_g ? Number(loggedRow.actual_carbs_g) : null,
          adherence: loggedRow.adherence ? Number(loggedRow.adherence) : null,
        }
      : null,
    guidance,
    flags,
  }
}

export interface NutritionLogInput {
  date?: string
  kcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  hydrationMl?: number
  adherence?: number
  notes?: string
}

export async function logNutrition(input: NutritionLogInput): Promise<void> {
  const date =
    input.date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  // Targets are stored alongside the actuals so a past day can be reviewed
  // against what was prescribed at the time, not against today's numbers.
  const targets = await getNutritionTargets(date)

  const { error } = await coachDb()
    .from('coach_nutrition_day')
    .upsert(
      {
        log_date: date,
        target_kcal: targets.targets.kcal,
        target_protein_g: targets.targets.proteinG,
        target_carbs_g: targets.targets.carbsG,
        target_fat_g: targets.targets.fatG,
        actual_kcal: input.kcal ?? null,
        actual_protein_g: input.proteinG ?? null,
        actual_carbs_g: input.carbsG ?? null,
        actual_fat_g: input.fatG ?? null,
        fueling_window: targets.fuellingWindow,
        hydration_ml: input.hydrationMl ?? null,
        adherence: input.adherence ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: 'log_date' }
    )

  if (error) throw new Error(`Failed to log nutrition: ${error.message}`)
}

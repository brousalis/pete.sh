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
 *
 * Day macros are owned by coach_fuel_entry rollups via recomputeNutritionDay.
 * logNutritionMeta only updates hydration / adherence / notes.
 */

import { daysAgo } from '@petehome/coach-core'

import { coachDb, getAthleteProfile, getDailyMetrics, getSessionsInRange } from './coach-data.service'

export type FuellingWindow = 'high' | 'moderate' | 'low'

export interface NutritionLogged {
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  hydrationMl: number | null
  adherence: number | null
  entryCount: number
}

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
  logged: NutritionLogged | null
  guidance: string[]
  flags: string[]
}

function chicagoDate(date?: string): string {
  return date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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
  const target = chicagoDate(date)

  const [profile, sessions, metrics, logged, entryCountRes] = await Promise.all([
    getAthleteProfile(),
    getSessionsInRange(target, target),
    getDailyMetrics(daysAgo(14), target),
    coachDb().from('coach_nutrition_day').select('*').eq('log_date', target).maybeSingle(),
    coachDb()
      .from('coach_fuel_entry')
      .select('id', { count: 'exact', head: true })
      .eq('log_date', target),
  ])

  if (entryCountRes.error) {
    console.error('[nutrition] fuel entry count failed:', entryCountRes.error.message)
  }

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
  const entryCount = entryCountRes.count ?? 0

  const actualKcal = asNullableNumber(loggedRow?.actual_kcal)
  const actualProtein = asNullableNumber(loggedRow?.actual_protein_g)
  const actualCarbs = asNullableNumber(loggedRow?.actual_carbs_g)
  const actualFat = asNullableNumber(loggedRow?.actual_fat_g)
  const hydrationMl = asNullableNumber(loggedRow?.hydration_ml)
  const adherence = asNullableNumber(loggedRow?.adherence)

  const hasLogged =
    entryCount > 0 ||
    actualKcal != null ||
    actualProtein != null ||
    actualCarbs != null ||
    actualFat != null

  return {
    date: target,
    plannedTss,
    fuellingWindow,
    bodyWeightLbs: Math.round(latestWeight * 10) / 10,
    targets: { kcal, proteinG, carbsG, fatG },
    logged: hasLogged
      ? {
          kcal: actualKcal,
          proteinG: actualProtein,
          carbsG: actualCarbs,
          fatG: actualFat,
          hydrationMl,
          adherence,
          entryCount,
        }
      : hydrationMl != null || adherence != null
        ? {
            kcal: null,
            proteinG: null,
            carbsG: null,
            fatG: null,
            hydrationMl,
            adherence,
            entryCount,
          }
        : null,
    guidance,
    flags,
  }
}

export interface NutritionMetaInput {
  date?: string
  hydrationMl?: number
  adherence?: number
  notes?: string
}

/**
 * Update hydration / adherence / notes without touching day macros.
 * Macros are owned by coach_fuel_entry via recomputeNutritionDay.
 */
export async function logNutritionMeta(input: NutritionMetaInput): Promise<void> {
  const date = chicagoDate(input.date)
  const targets = await getNutritionTargets(date)

  const existing = await coachDb()
    .from('coach_nutrition_day')
    .select('hydration_ml, adherence, notes, actual_kcal, actual_protein_g, actual_carbs_g, actual_fat_g')
    .eq('log_date', date)
    .maybeSingle()

  const row = (existing.data ?? {}) as Record<string, unknown>

  const { error } = await coachDb()
    .from('coach_nutrition_day')
    .upsert(
      {
        log_date: date,
        target_kcal: targets.targets.kcal,
        target_protein_g: targets.targets.proteinG,
        target_carbs_g: targets.targets.carbsG,
        target_fat_g: targets.targets.fatG,
        fueling_window: targets.fuellingWindow,
        actual_kcal: row.actual_kcal ?? null,
        actual_protein_g: row.actual_protein_g ?? null,
        actual_carbs_g: row.actual_carbs_g ?? null,
        actual_fat_g: row.actual_fat_g ?? null,
        hydration_ml: input.hydrationMl ?? row.hydration_ml ?? null,
        adherence: input.adherence ?? row.adherence ?? null,
        notes: input.notes !== undefined ? input.notes : (row.notes ?? null),
      },
      { onConflict: 'log_date' }
    )

  if (error) throw new Error(`Failed to update nutrition meta: ${error.message}`)
}

/**
 * Sum fuel entries for a date into coach_nutrition_day.actual_*.
 * Preserves hydration_ml, adherence, and notes.
 */
export async function recomputeNutritionDay(date?: string): Promise<void> {
  const target = chicagoDate(date)
  const targets = await getNutritionTargets(target)

  const [{ data: entries, error: listError }, existing] = await Promise.all([
    coachDb()
      .from('coach_fuel_entry')
      .select('kcal, protein_g, carbs_g, fat_g')
      .eq('log_date', target),
    coachDb()
      .from('coach_nutrition_day')
      .select('hydration_ml, adherence, notes')
      .eq('log_date', target)
      .maybeSingle(),
  ])

  if (listError) throw new Error(`Failed to load fuel entries: ${listError.message}`)

  const rows = (entries ?? []) as {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }[]

  const meta = (existing.data ?? {}) as Record<string, unknown>

  const totals =
    rows.length === 0
      ? { kcal: null, proteinG: null, carbsG: null, fatG: null }
      : {
          kcal: rows.reduce((sum, row) => sum + row.kcal, 0),
          proteinG: rows.reduce((sum, row) => sum + row.protein_g, 0),
          carbsG: rows.reduce((sum, row) => sum + row.carbs_g, 0),
          fatG: rows.reduce((sum, row) => sum + row.fat_g, 0),
        }

  const { error } = await coachDb()
    .from('coach_nutrition_day')
    .upsert(
      {
        log_date: target,
        target_kcal: targets.targets.kcal,
        target_protein_g: targets.targets.proteinG,
        target_carbs_g: targets.targets.carbsG,
        target_fat_g: targets.targets.fatG,
        fueling_window: targets.fuellingWindow,
        actual_kcal: totals.kcal,
        actual_protein_g: totals.proteinG,
        actual_carbs_g: totals.carbsG,
        actual_fat_g: totals.fatG,
        hydration_ml: meta.hydration_ml ?? null,
        adherence: meta.adherence ?? null,
        notes: meta.notes ?? null,
      },
      { onConflict: 'log_date' }
    )

  if (error) throw new Error(`Failed to recompute nutrition day: ${error.message}`)
}

/** @deprecated Use logNutritionMeta — kept for any stray callers during transition. */
export async function logNutrition(input: NutritionMetaInput & {
  kcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}): Promise<void> {
  await logNutritionMeta(input)
  if (
    input.kcal != null ||
    input.proteinG != null ||
    input.carbsG != null ||
    input.fatG != null
  ) {
    console.warn(
      '[coach] logNutrition ignored macro fields — use coach_fuel_entry / recomputeNutritionDay'
    )
  }
}

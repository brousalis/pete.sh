/**
 * Fuel — meal/drink logging and LLM intake estimates.
 *
 * Estimates use a tiny isolated Haiku prompt (never coach context). Day macros
 * roll up into coach_nutrition_day via recomputeNutritionDay.
 */

import { anthropic } from '@ai-sdk/anthropic'
import { usageFromAiSdk } from '@petehome/coach-core'
import { z } from 'zod'

import { getCostGovernor } from './cost.service'
import { coachDb } from './coach-data.service'
import { getNutritionTargets, recomputeNutritionDay } from './nutrition.service'

export const FUEL_ESTIMATE_DAILY_SOFT_CAP = 20

/** API / DB validation — may include array max (not for Anthropic structured output). */
export const fuelItemSchema = z.object({
  name: z.string().min(1).max(200),
  portion: z.string().max(120).optional(),
  kcal: z.number().int().min(0).max(5000),
  proteinG: z.number().int().min(0).max(200),
  carbsG: z.number().int().min(0).max(500),
  fatG: z.number().int().min(0).max(200),
})

export const fuelEstimateSchema = z.object({
  kind: z.enum(['food', 'drink', 'other']),
  items: z.array(fuelItemSchema).min(1).max(20),
  totals: z.object({
    kcal: z.number().int().min(0).max(10000),
    proteinG: z.number().int().min(0).max(500),
    carbsG: z.number().int().min(0).max(1500),
    fatG: z.number().int().min(0).max(400),
  }),
  assumptions: z.string().max(500),
  confidence: z.number().min(0).max(1),
})

/**
 * Schema passed to generateObject.
 *
 * Anthropic structured outputs reject many JSON Schema keywords (maxItems,
 * minimum, maximum, minLength, …). Zod's `.int()` also emits safe-integer
 * bounds that the API rejects. Keep this schema to bare types + enums only;
 * clamp and validate with fuelEstimateSchema after the model returns.
 */
const fuelEstimateLlmSchema = z.object({
  kind: z.enum(['food', 'drink', 'other']),
  items: z.array(
    z.object({
      name: z.string(),
      portion: z.string(),
      kcal: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
    })
  ),
  totals: z.object({
    kcal: z.number(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
  assumptions: z.string(),
  confidence: z.number(),
})

function sanitizeFuelEstimate(raw: z.infer<typeof fuelEstimateLlmSchema>): FuelEstimate {
  const clampInt = (value: number, max: number) =>
    Math.max(0, Math.min(max, Math.round(Number.isFinite(value) ? value : 0)))

  const items = raw.items.slice(0, 20).map((item) => ({
    name: String(item.name || 'item').slice(0, 200),
    portion: item.portion?.trim() ? String(item.portion).slice(0, 120) : undefined,
    kcal: clampInt(item.kcal, 5000),
    proteinG: clampInt(item.proteinG, 200),
    carbsG: clampInt(item.carbsG, 500),
    fatG: clampInt(item.fatG, 200),
  }))

  if (items.length === 0) {
    throw new Error('Fuel estimate returned no items.')
  }

  const totalsFromItems = items.reduce(
    (sum, item) => ({
      kcal: sum.kcal + item.kcal,
      proteinG: sum.proteinG + item.proteinG,
      carbsG: sum.carbsG + item.carbsG,
      fatG: sum.fatG + item.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  // Prefer model totals when present; fall back to item sum if empty/zero mismatch.
  const totals = {
    kcal: clampInt(raw.totals.kcal || totalsFromItems.kcal, 10000),
    proteinG: clampInt(raw.totals.proteinG || totalsFromItems.proteinG, 500),
    carbsG: clampInt(raw.totals.carbsG || totalsFromItems.carbsG, 1500),
    fatG: clampInt(raw.totals.fatG || totalsFromItems.fatG, 400),
  }

  const parsed = fuelEstimateSchema.safeParse({
    kind: raw.kind,
    items,
    totals,
    assumptions: String(raw.assumptions ?? '').slice(0, 500),
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
  })

  if (!parsed.success) {
    throw new Error('Fuel estimate failed validation.')
  }

  return parsed.data
}

export type FuelEstimate = z.infer<typeof fuelEstimateSchema>
export type FuelItem = z.infer<typeof fuelItemSchema>
export type FuelKind = FuelEstimate['kind']
export type FuelSource = 'llm' | 'manual' | 'reuse'

export interface FuelEntry {
  id: string
  logDate: string
  loggedAt: string
  kind: FuelKind
  descriptionRaw: string
  items: FuelItem[]
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  assumptions: string | null
  confidence: number | null
  source: FuelSource
}

export interface FuelEntryInput {
  date?: string
  kind: FuelKind
  descriptionRaw: string
  items?: FuelItem[]
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  assumptions?: string | null
  confidence?: number | null
  source: FuelSource
  loggedAt?: string
}

function chicagoDate(date?: string): string {
  return date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function mapEntry(row: Record<string, unknown>): FuelEntry {
  const itemsRaw = row.items
  let items: FuelItem[] = []
  if (Array.isArray(itemsRaw)) {
    items = itemsRaw
      .map((item) => fuelItemSchema.safeParse(item))
      .filter((r): r is { success: true; data: FuelItem } => r.success)
      .map((r) => r.data)
  }

  return {
    id: String(row.id),
    logDate: String(row.log_date),
    loggedAt: String(row.logged_at),
    kind: row.kind as FuelKind,
    descriptionRaw: String(row.description_raw),
    items,
    kcal: Number(row.kcal),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    assumptions: row.assumptions != null ? String(row.assumptions) : null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    source: row.source as FuelSource,
  }
}

const FUEL_ESTIMATE_SYSTEM = `You estimate nutrition from a short free-text description of food or drink.

Rules:
- Maintenance fuelling mindset: do not bias toward under-eating or deficit framing.
- Split multi-item descriptions into separate items with portion assumptions (at most 12 items). Use portion "" when unspecified.
- State assumptions explicitly (brand, size, cooking method, milk type, etc.).
- Include caloric drinks (coffee with milk, sports drink, alcohol). Plain water is not food.
- Return integer macros. Totals must equal the sum of item macros (or be very close; prefer exact).
- Confidence 0–1 reflecting portion ambiguity.
- Prefer common US grocery / restaurant portions when unspecified.`

export class FuelEstimateBlockedError extends Error {
  readonly code: 'budget_capped' | 'soft_cap'

  constructor(code: 'budget_capped' | 'soft_cap', message: string) {
    super(message)
    this.name = 'FuelEstimateBlockedError'
    this.code = code
  }
}

export async function countFuelEstimatesToday(): Promise<number> {
  const today = chicagoDate()
  const start = `${today}T00:00:00-06:00`
  const end = `${today}T23:59:59.999-06:00`

  const { count, error } = await coachDb()
    .from('coach_agent_run')
    .select('id', { count: 'exact', head: true })
    .eq('job', 'fuel_estimate')
    .gte('started_at', start)
    .lte('started_at', end)

  if (error) {
    console.error('[fuel] Failed to count estimates:', error.message)
    return 0
  }

  return count ?? 0
}

export async function estimateFuelFromText(description: string): Promise<FuelEstimate> {
  const trimmed = description.trim()
  if (trimmed.length < 2) {
    throw new Error('Description is too short.')
  }

  const used = await countFuelEstimatesToday()
  if (used >= FUEL_ESTIMATE_DAILY_SOFT_CAP) {
    throw new FuelEstimateBlockedError(
      'soft_cap',
      `Daily fuel estimate limit (${FUEL_ESTIMATE_DAILY_SOFT_CAP}) reached. Log manually.`
    )
  }

  const governor = getCostGovernor()
  const plan = await governor.resolvePlan('fuel_estimate')

  if (plan.useTemplateFallback) {
    throw new FuelEstimateBlockedError(
      'budget_capped',
      'Coach budget exhausted. Log manually without an estimate.'
    )
  }

  const { generateObject } = await import('ai')

  const run = await governor.run({
    job: 'fuel_estimate',
    templateFallback: async () => {
      throw new FuelEstimateBlockedError(
        'budget_capped',
        'Coach budget exhausted. Log manually without an estimate.'
      )
    },
    execute: async (resolved) => {
      const result = await generateObject({
        model: anthropic(resolved.modelId),
        schema: fuelEstimateLlmSchema,
        system: FUEL_ESTIMATE_SYSTEM,
        prompt: trimmed.slice(0, 1000),
        maxOutputTokens: 600,
      })

      return {
        result: sanitizeFuelEstimate(result.object),
        usage: usageFromAiSdk(
          result.usage,
          result.providerMetadata as Record<string, unknown> | undefined
        ),
      }
    },
  })

  return run.result
}

export async function listFuelEntries(date?: string): Promise<FuelEntry[]> {
  const target = chicagoDate(date)
  const { data, error } = await coachDb()
    .from('coach_fuel_entry')
    .select('*')
    .eq('log_date', target)
    .order('logged_at', { ascending: true })

  if (error) throw new Error(`Failed to list fuel entries: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(mapEntry)
}

export async function listRecentFuelReuse(limit = 8): Promise<FuelEntry[]> {
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const sinceDate = since.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const { data, error } = await coachDb()
    .from('coach_fuel_entry')
    .select('*')
    .gte('log_date', sinceDate)
    .order('logged_at', { ascending: false })
    .limit(40)

  if (error) throw new Error(`Failed to list recent fuel: ${error.message}`)

  const seen = new Set<string>()
  const out: FuelEntry[] = []

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const entry = mapEntry(row)
    const key = entry.descriptionRaw.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(entry)
    if (out.length >= limit) break
  }

  return out
}

export async function createFuelEntry(input: FuelEntryInput): Promise<FuelEntry> {
  const logDate = chicagoDate(input.date)

  const { data, error } = await coachDb()
    .from('coach_fuel_entry')
    .insert({
      log_date: logDate,
      logged_at: input.loggedAt ?? new Date().toISOString(),
      kind: input.kind,
      description_raw: input.descriptionRaw.trim(),
      items: input.items ?? [],
      kcal: input.kcal,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      assumptions: input.assumptions ?? null,
      confidence: input.confidence ?? null,
      source: input.source,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create fuel entry: ${error.message}`)

  await recomputeNutritionDay(logDate)
  return mapEntry(data as Record<string, unknown>)
}

export async function updateFuelEntry(
  id: string,
  patch: Partial<Omit<FuelEntryInput, 'date' | 'source'>> & { source?: FuelSource }
): Promise<FuelEntry> {
  const existing = await coachDb().from('coach_fuel_entry').select('*').eq('id', id).maybeSingle()
  if (existing.error) throw new Error(`Failed to load fuel entry: ${existing.error.message}`)
  if (!existing.data) throw new Error('Fuel entry not found.')

  const row = existing.data as Record<string, unknown>
  const logDate = String(row.log_date)

  const { data, error } = await coachDb()
    .from('coach_fuel_entry')
    .update({
      kind: patch.kind ?? row.kind,
      description_raw:
        patch.descriptionRaw != null ? patch.descriptionRaw.trim() : row.description_raw,
      items: patch.items ?? row.items,
      kcal: patch.kcal ?? row.kcal,
      protein_g: patch.proteinG ?? row.protein_g,
      carbs_g: patch.carbsG ?? row.carbs_g,
      fat_g: patch.fatG ?? row.fat_g,
      assumptions: patch.assumptions !== undefined ? patch.assumptions : row.assumptions,
      confidence: patch.confidence !== undefined ? patch.confidence : row.confidence,
      source: patch.source ?? row.source,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update fuel entry: ${error.message}`)

  await recomputeNutritionDay(logDate)
  return mapEntry(data as Record<string, unknown>)
}

export async function deleteFuelEntry(id: string): Promise<void> {
  const existing = await coachDb()
    .from('coach_fuel_entry')
    .select('log_date')
    .eq('id', id)
    .maybeSingle()

  if (existing.error) throw new Error(`Failed to load fuel entry: ${existing.error.message}`)
  if (!existing.data) throw new Error('Fuel entry not found.')

  const logDate = String((existing.data as { log_date: string }).log_date)

  const { error } = await coachDb().from('coach_fuel_entry').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete fuel entry: ${error.message}`)

  await recomputeNutritionDay(logDate)
}

/** Compact card for coach context assembly. */
export async function getFuelContextForDay(date?: string): Promise<{
  targets: Awaited<ReturnType<typeof getNutritionTargets>>
  recentBlurbs: string[]
}> {
  const target = chicagoDate(date)
  const [targets, entries] = await Promise.all([
    getNutritionTargets(target),
    listFuelEntries(target),
  ])

  const recentBlurbs = entries
    .slice(-3)
    .map((entry) => `${entry.descriptionRaw} (${entry.kcal} kcal)`)

  return { targets, recentBlurbs }
}

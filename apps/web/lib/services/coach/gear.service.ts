/**
 * Gear tracking.
 *
 * Two jobs. First, accumulate mileage automatically so worn-out shoes are
 * caught before they contribute to an injury — running in dead shoes with
 * existing patellofemoral cartilage wear is an avoidable risk. Second, rank
 * upgrades by seconds saved per dollar against the race, so equipment
 * spending competes honestly with training time.
 */

import { daysAgo } from '@petehome/coach-core'

import { coachDb, queryActivities } from './coach-data.service'

export interface GearItem {
  id: string
  name: string
  category: string
  sport: string | null
  brand: string | null
  model: string | null
  purchasedOn: string | null
  costUsd: number | null
  totalMeters: number
  totalMiles: number
  lifeLimitMeters: number | null
  lifeRemainingPct: number | null
  sessionCount: number
  status: 'ok' | 'approaching_limit' | 'past_limit' | 'service_due'
  serviceDue: { type: string; dueOn: string | null; note: string }[]
}

/**
 * Link activities to gear and roll up mileage.
 *
 * Matching is by sport and date range rather than by explicit tagging,
 * because tagging every run is the kind of chore that gets abandoned in week
 * three. An item covers activities in its sport from its purchase date until
 * it was retired.
 */
export async function recomputeGearUsage(sinceDays = 400): Promise<number> {
  const db = coachDb()

  const { data: items } = await db.from('coach_gear_item').select('*')
  if (!items?.length) return 0

  const activities = await queryActivities({ from: daysAgo(sinceDays), limit: 2000 })

  let linked = 0

  for (const item of items as Record<string, unknown>[]) {
    const sport = item.sport as string | null
    if (!sport) continue

    const purchasedOn = (item.purchased_on as string | null) ?? '1970-01-01'
    const retiredOn = (item.retired_on as string | null) ?? '9999-12-31'

    const matching = activities.filter(
      (activity) =>
        activity.sport === sport &&
        activity.activityDate >= purchasedOn &&
        activity.activityDate <= retiredOn &&
        (activity.distanceMeters ?? 0) > 0
    )

    if (matching.length === 0) continue

    const rows = matching.map((activity) => ({
      gear_id: item.id as string,
      activity_id: activity.id,
      distance_meters: activity.distanceMeters,
      duration_seconds: activity.durationSeconds,
    }))

    // Upsert on the composite key so recomputation is idempotent.
    const { error } = await db
      .from('coach_gear_usage')
      .upsert(rows, { onConflict: 'gear_id,activity_id', ignoreDuplicates: true })

    if (error) {
      console.error(`[coach] Gear usage upsert failed for ${item.name}:`, error.message)
      continue
    }

    linked += rows.length
  }

  return linked
}

export async function listGear(includeRetired = false): Promise<GearItem[]> {
  const db = coachDb()

  let builder = db.from('coach_gear_item').select('*').order('category').order('name')
  if (!includeRetired) builder = builder.is('retired_on', null)

  const [{ data: items }, { data: usage }, { data: services }] = await Promise.all([
    builder,
    db.from('coach_gear_usage').select('gear_id, distance_meters'),
    db.from('coach_gear_service').select('*'),
  ])

  const mileage = new Map<string, { meters: number; count: number }>()
  for (const row of (usage ?? []) as { gear_id: string; distance_meters: number }[]) {
    const entry = mileage.get(row.gear_id) ?? { meters: 0, count: 0 }
    entry.meters += Number(row.distance_meters ?? 0)
    entry.count += 1
    mileage.set(row.gear_id, entry)
  }

  const today = new Date().toISOString().slice(0, 10)

  return ((items ?? []) as Record<string, unknown>[]).map((item) => {
    const id = item.id as string
    const stats = mileage.get(id) ?? { meters: 0, count: 0 }
    const limit = item.life_limit_meters ? Number(item.life_limit_meters) : null

    const lifeRemainingPct = limit
      ? Math.max(0, Math.round((1 - stats.meters / limit) * 100))
      : null

    const dueServices = ((services ?? []) as Record<string, unknown>[])
      .filter((service) => service.gear_id === id)
      .filter((service) => {
        const dueOn = service.due_on as string | null
        const intervalMeters = service.interval_meters
          ? Number(service.interval_meters)
          : null

        if (dueOn && dueOn <= today) return true
        if (intervalMeters && stats.meters >= intervalMeters) return true
        return false
      })
      .map((service) => ({
        type: service.service_type as string,
        dueOn: (service.due_on as string | null) ?? null,
        note: (service.notes as string | null) ?? 'Service interval reached.',
      }))

    const status: GearItem['status'] =
      lifeRemainingPct != null && lifeRemainingPct <= 0
        ? 'past_limit'
        : dueServices.length > 0
          ? 'service_due'
          : lifeRemainingPct != null && lifeRemainingPct <= 15
            ? 'approaching_limit'
            : 'ok'

    return {
      id,
      name: item.name as string,
      category: item.category as string,
      sport: (item.sport as string | null) ?? null,
      brand: (item.brand as string | null) ?? null,
      model: (item.model as string | null) ?? null,
      purchasedOn: (item.purchased_on as string | null) ?? null,
      costUsd: item.cost_usd ? Number(item.cost_usd) : null,
      totalMeters: Math.round(stats.meters),
      totalMiles: Math.round((stats.meters / 1609.344) * 10) / 10,
      lifeLimitMeters: limit,
      lifeRemainingPct,
      sessionCount: stats.count,
      status,
      serviceDue: dueServices,
    }
  })
}

export interface GearRecommendation {
  id: string
  title: string
  category: string
  rationale: string
  estimatedCostUsd: number | null
  estimatedSecondsSaved: number | null
  /** Dollars per second saved over the race. Lower is better value. */
  costPerSecond: number | null
  status: string
}

/**
 * Upgrade recommendations, ranked by cost per second saved.
 *
 * Presented this way so a $1,300 smart trainer and a $30 pair of goggles can
 * be compared honestly, and so the answer "train more instead" stays visible
 * when the numbers say so.
 */
export async function listRecommendations(): Promise<GearRecommendation[]> {
  const { data } = await coachDb()
    .from('coach_gear_recommendation')
    .select('*')
    .neq('status', 'declined')
    .order('created_at', { ascending: false })

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      const cost = row.estimated_cost_usd ? Number(row.estimated_cost_usd) : null
      const seconds = row.estimated_seconds_saved
        ? Number(row.estimated_seconds_saved)
        : null

      return {
        id: row.id as string,
        title: row.title as string,
        category: row.category as string,
        rationale: row.rationale as string,
        estimatedCostUsd: cost,
        estimatedSecondsSaved: seconds,
        costPerSecond: cost != null && seconds != null && seconds > 0 ? cost / seconds : null,
        status: row.status as string,
      }
    })
    .sort((a, b) => {
      // Items without an estimate sort last rather than appearing free.
      if (a.costPerSecond == null) return 1
      if (b.costPerSecond == null) return -1
      return a.costPerSecond - b.costPerSecond
    })
}

/** Gear that needs attention, for the briefing and the Today screen. */
export async function getGearAlerts(): Promise<
  { name: string; message: string; severity: 'info' | 'warn' }[]
> {
  const gear = await listGear()
  const alerts: { name: string; message: string; severity: 'info' | 'warn' }[] = []

  for (const item of gear) {
    if (item.status === 'past_limit') {
      alerts.push({
        name: item.name,
        message: `${item.totalMiles} mi, past its service life. Running in dead shoes is an avoidable load on the knee.`,
        severity: 'warn',
      })
    } else if (item.status === 'approaching_limit') {
      alerts.push({
        name: item.name,
        message: `${item.totalMiles} mi, ${item.lifeRemainingPct}% of life remaining. Order a replacement now so they can be rotated in gradually.`,
        severity: 'info',
      })
    }

    for (const service of item.serviceDue) {
      alerts.push({
        name: item.name,
        message: `${service.type} due. ${service.note}`,
        severity: service.type === 'bike_fit' ? 'warn' : 'info',
      })
    }
  }

  return alerts
}

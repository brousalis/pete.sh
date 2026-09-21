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

import type { Activity } from '@petehome/coach-core'

import { coachDb, queryActivities } from './coach-data.service'
import { resolveGearDistanceMeters, type WorkoutDistanceRow } from './gear-distance'
import type { GearPatchInput, GearWriteInput } from './gear.schema'

const METERS_PER_MILE = 1609.344

export interface GearServiceRecord {
  id: string
  serviceType: string
  performedOn: string | null
  dueOn: string | null
  intervalMiles: number | null
  notes: string | null
}

export interface GearItem {
  id: string
  name: string
  category: string
  sport: string | null
  brand: string | null
  model: string | null
  purchasedOn: string | null
  retiredOn: string | null
  costUsd: number | null
  notes: string | null
  totalMeters: number
  totalMiles: number
  lifeLimitMeters: number | null
  lifeLimitMiles: number | null
  lifeRemainingPct: number | null
  sessionCount: number
  status: 'ok' | 'approaching_limit' | 'past_limit' | 'service_due'
  serviceDue: { type: string; dueOn: string | null; note: string }[]
  services: GearServiceRecord[]
}

export interface GearOverlap {
  sport: string
  itemA: { id: string; name: string }
  itemB: { id: string; name: string }
  overlapFrom: string
  overlapTo: string
}

function rowToDb(input: GearWriteInput | GearPatchInput): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (input.name != null) row.name = input.name
  if (input.category != null) row.category = input.category
  if ('sport' in input) row.sport = input.sport ?? null
  if ('brand' in input) row.brand = input.brand ?? null
  if ('model' in input) row.model = input.model ?? null
  if ('purchasedOn' in input) row.purchased_on = input.purchasedOn ?? null
  if ('retiredOn' in input) row.retired_on = input.retiredOn ?? null
  if ('costUsd' in input) row.cost_usd = input.costUsd ?? null
  if ('notes' in input) row.notes = input.notes ?? null
  if (input.lifeLimitMiles != null) {
    row.life_limit_meters = input.lifeLimitMiles * METERS_PER_MILE
  } else if ('lifeLimitMiles' in input && input.lifeLimitMiles === undefined) {
    // Explicit clear not supported via undefined; PATCH omits field to leave unchanged.
  }
  row.updated_at = new Date().toISOString()
  return row
}

function gearWindow(row: Record<string, unknown>): { sport: string | null; from: string; to: string } {
  return {
    sport: (row.sport as string | null) ?? null,
    from: (row.purchased_on as string | null) ?? '1970-01-01',
    to: (row.retired_on as string | null) ?? '9999-12-31',
  }
}

/** Same sport + overlapping active windows — mileage would be ambiguous until ranges are split. */
export function listGearOverlaps(items: Record<string, unknown>[]): GearOverlap[] {
  const overlaps: GearOverlap[] = []

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!
      const b = items[j]!
      const wa = gearWindow(a)
      const wb = gearWindow(b)
      if (!wa.sport || wa.sport !== wb.sport) continue

      const overlapFrom = wa.from > wb.from ? wa.from : wb.from
      const overlapTo = wa.to < wb.to ? wa.to : wb.to
      if (overlapFrom > overlapTo) continue

      overlaps.push({
        sport: wa.sport,
        itemA: { id: a.id as string, name: a.name as string },
        itemB: { id: b.id as string, name: b.name as string },
        overlapFrom,
        overlapTo,
      })
    }
  }

  return overlaps
}

function pickGearForActivity(candidates: Record<string, unknown>[]): Record<string, unknown> {
  const sorted = [...candidates].sort((a, b) => {
    const pa = (a.purchased_on as string | null) ?? '1970-01-01'
    const pb = (b.purchased_on as string | null) ?? '1970-01-01'
    if (pa !== pb) return pb.localeCompare(pa)

    const rangeA = gearWindow(a)
    const rangeB = gearWindow(b)
    const widthA = rangeA.to.localeCompare(rangeA.from)
    const widthB = rangeB.to.localeCompare(rangeB.from)
    return widthA - widthB
  })
  return sorted[0]!
}

/**
 * Link activities to gear and roll up mileage.
 *
 * Each workout is assigned to at most one item: same sport, activity date inside
 * [purchased_on, retired_on]. Historical inventory is modeled by non-overlapping
 * windows (e.g. old trainers with a retired date, new pair with a later purchase).
 */
export async function recomputeGearUsage(sinceDays = 400): Promise<number> {
  const db = coachDb()

  const { data: items } = await db.from('coach_gear_item').select('*')
  if (!items?.length) return 0

  const itemRows = items as Record<string, unknown>[]
  const activities = await enrichActivitiesForGearMileage(
    await queryActivities({ from: daysAgo(sinceDays), limit: 2000 })
  )

  const assignment = new Map<string, string>()

  for (const activity of activities) {
    if ((activity.distanceMeters ?? 0) <= 0) continue

    const candidates = itemRows.filter((item) => {
      const { sport, from, to } = gearWindow(item)
      if (!sport || sport !== activity.sport) return false
      return activity.activityDate >= from && activity.activityDate <= to
    })

    if (candidates.length === 0) continue

    const chosen = pickGearForActivity(candidates)
    assignment.set(activity.id, chosen.id as string)
  }

  const byGear = new Map<string, typeof activities>()
  for (const activity of activities) {
    const gearId = assignment.get(activity.id)
    if (!gearId) continue
    const list = byGear.get(gearId) ?? []
    list.push(activity)
    byGear.set(gearId, list)
  }

  let linked = 0

  for (const item of itemRows) {
    const id = item.id as string
    const matching = byGear.get(id) ?? []

    const { error: deleteError } = await db.from('coach_gear_usage').delete().eq('gear_id', id)
    if (deleteError) {
      console.error(`[coach] Gear usage clear failed for ${item.name}:`, deleteError.message)
      continue
    }

    if (matching.length === 0) continue

    const rows = matching.map((activity) => ({
      gear_id: id,
      activity_id: activity.id,
      distance_meters: activity.distanceMeters,
      duration_seconds: activity.durationSeconds,
    }))

    const { error } = await db.from('coach_gear_usage').insert(rows)
    if (error) {
      console.error(`[coach] Gear usage insert failed for ${item.name}:`, error.message)
      continue
    }

    linked += rows.length
  }

  return linked
}

/**
 * HealthKit often stores cycling distance only on the route (or not at all for
 * indoor). Runs and swims still require a recorded distance.
 */
async function enrichActivitiesForGearMileage(activities: Activity[]): Promise<Activity[]> {
  const needsLookup = activities.filter((activity) => (activity.distanceMeters ?? 0) <= 0)
  if (needsLookup.length === 0) return activities

  const ids = needsLookup.map((activity) => activity.id)
  const db = coachDb()

  const [{ data: workouts }, { data: routes }] = await Promise.all([
    db
      .from('apple_health_workouts')
      .select(
        'id, distance_meters, distance_miles, cycling_avg_speed, duration, is_indoor, workout_type'
      )
      .in('id', ids),
    db.from('apple_health_routes').select('workout_id, total_distance_meters').in('workout_id', ids),
  ])

  const workoutById = new Map(
    ((workouts ?? []) as WorkoutDistanceRow[]).map((row) => [row.id as string, row])
  )
  const routeByWorkoutId = new Map(
    ((routes ?? []) as { workout_id: string; total_distance_meters: number | null }[]).map(
      (row) => [row.workout_id, row.total_distance_meters]
    )
  )

  return activities.map((activity) => {
    if ((activity.distanceMeters ?? 0) > 0) return activity

    const workout = workoutById.get(activity.id)
    if (!workout) return activity

    const resolved = resolveGearDistanceMeters(workout, routeByWorkoutId.get(activity.id))
    if (resolved.meters <= 0) return activity

    return { ...activity, distanceMeters: Math.round(resolved.meters * 100) / 100 }
  })
}

export async function createGearItem(input: GearWriteInput): Promise<string> {
  const row = rowToDb(input)
  delete row.updated_at

  const { data, error } = await coachDb()
    .from('coach_gear_item')
    .insert({
      name: row.name,
      category: row.category,
      sport: row.sport ?? null,
      brand: row.brand ?? null,
      model: row.model ?? null,
      purchased_on: row.purchased_on ?? null,
      retired_on: row.retired_on ?? null,
      cost_usd: row.cost_usd ?? null,
      notes: row.notes ?? null,
      life_limit_meters: row.life_limit_meters ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export async function updateGearItem(id: string, input: GearPatchInput): Promise<void> {
  const row = rowToDb(input)
  if (Object.keys(row).length <= 1) return

  const { error } = await coachDb().from('coach_gear_item').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteGearItem(id: string): Promise<void> {
  const { error } = await coachDb().from('coach_gear_item').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addGearService(
  gearId: string,
  input: {
    serviceType: string
    performedOn?: string
    dueOn?: string
    intervalMiles?: number
    notes?: string
  }
): Promise<string> {
  const { data, error } = await coachDb()
    .from('coach_gear_service')
    .insert({
      gear_id: gearId,
      service_type: input.serviceType,
      performed_on: input.performedOn ?? null,
      due_on: input.dueOn ?? null,
      interval_meters: input.intervalMiles ? input.intervalMiles * METERS_PER_MILE : null,
      notes: input.notes ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
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

    const itemServices = ((services ?? []) as Record<string, unknown>[]).filter(
      (service) => service.gear_id === id
    )

    const dueServices = itemServices
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
      retiredOn: (item.retired_on as string | null) ?? null,
      costUsd: item.cost_usd ? Number(item.cost_usd) : null,
      notes: (item.notes as string | null) ?? null,
      totalMeters: Math.round(stats.meters),
      totalMiles: Math.round((stats.meters / METERS_PER_MILE) * 10) / 10,
      lifeLimitMeters: limit,
      lifeLimitMiles: limit ? Math.round((limit / METERS_PER_MILE) * 10) / 10 : null,
      lifeRemainingPct,
      sessionCount: stats.count,
      status,
      serviceDue: dueServices,
      services: itemServices.map((service) => ({
        id: service.id as string,
        serviceType: service.service_type as string,
        performedOn: (service.performed_on as string | null) ?? null,
        dueOn: (service.due_on as string | null) ?? null,
        intervalMiles: service.interval_meters
          ? Math.round((Number(service.interval_meters) / METERS_PER_MILE) * 10) / 10
          : null,
        notes: (service.notes as string | null) ?? null,
      })),
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
  const gear = await listGear(true)
  const alerts: { name: string; message: string; severity: 'info' | 'warn' }[] = []

  for (const item of gear.filter((row) => !row.retiredOn)) {
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

export async function fetchGearInventory(includeRetired: boolean): Promise<{
  items: GearItem[]
  recommendations: GearRecommendation[]
  alerts: Awaited<ReturnType<typeof getGearAlerts>>
  overlaps: GearOverlap[]
}> {
  const db = coachDb()
  const { data: allRows } = await db.from('coach_gear_item').select('*')

  const [items, recommendations, alerts] = await Promise.all([
    listGear(includeRetired),
    listRecommendations(),
    getGearAlerts(),
  ])

  return {
    items,
    recommendations,
    alerts,
    overlaps: listGearOverlaps((allRows ?? []) as Record<string, unknown>[]),
  }
}

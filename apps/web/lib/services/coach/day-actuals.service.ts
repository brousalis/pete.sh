/**
 * Same-day Apple Health workouts for Today / Plan — linked or unmatched.
 *
 * Sport auto-link still owns matching; this surface only makes the day's
 * actual work visible so the athlete can audible when the plan diverged.
 */

import { queryActivities } from '@/lib/services/coach/coach-data.service'
import type { DayActualView } from '@/lib/types/coach-ui.types'

export async function getDayActuals(
  from: string,
  to: string
): Promise<DayActualView[]> {
  const activities = await queryActivities({ from, to, limit: 200 })

  return activities
    .map((activity) => ({
      id: activity.id,
      activityDate: activity.activityDate,
      sport: activity.sport,
      rawType: activity.rawType,
      title: titleForActivity(activity.sport, activity.rawType, activity.durationSeconds),
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters,
      tss: activity.tss,
      linkedSessionId: activity.plannedSessionId,
    }))
    .sort((a, b) => a.activityDate.localeCompare(b.activityDate) || a.id.localeCompare(b.id))
}

export async function getDayActualsByDate(
  from: string,
  to: string
): Promise<Record<string, DayActualView[]>> {
  const actuals = await getDayActuals(from, to)
  const byDate: Record<string, DayActualView[]> = {}
  for (const actual of actuals) {
    const list = byDate[actual.activityDate] ?? []
    list.push(actual)
    byDate[actual.activityDate] = list
  }
  return byDate
}

function titleForActivity(
  sport: string,
  rawType: string,
  durationSeconds: number
): string {
  const minutes = Math.max(1, Math.round(durationSeconds / 60))
  const label = sportLabel(sport, rawType)
  return `${label} · ${minutes} min`
}

function sportLabel(sport: string, rawType: string): string {
  const labels: Record<string, string> = {
    swim: 'Swim',
    bike: 'Bike',
    run: 'Run',
    strength: 'Strength',
    pt: 'PT',
    brick: 'Brick',
    walk: 'Walk',
    hiit: 'HIIT',
    cross: 'Cross-train',
    rest: 'Rest',
    other: humanizeRawType(rawType),
  }
  return labels[sport] ?? humanizeRawType(rawType)
}

function humanizeRawType(rawType: string): string {
  if (!rawType || rawType === 'other') return 'Workout'
  return rawType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

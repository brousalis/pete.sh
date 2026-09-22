'use client'

import { useEffect, useId, useState } from 'react'

import { HrZonesBar } from '@/components/coach/activity/hr-zones-chart'
import { Disclosure } from '@/components/coach/ui/panel'
import { HEX } from '@/lib/constants/colors'
import type { HeartRateZone } from '@/lib/types/apple-health.types'
import type { SessionActivityGlance as GlanceData, TodaySession } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

type GlanceFact = { value: string; unit: string }

export function SessionActivityGlance({
  session,
  activity,
  onOpenActivity,
  showSparkline = true,
}: {
  session: TodaySession
  activity: GlanceData
  onOpenActivity?: (activityId: string) => void
  /** Lazy HR sparkline disclosure — off for dense calendar contexts. */
  showSparkline?: boolean
}) {
  const facts = buildGlanceFacts(session.sport, activity)
  const zones = resolveHrZones(activity)
  const deltas = buildPlanDeltas(session, activity)

  const summary = (
    <div className="space-y-1.5">
      {facts.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {facts.map((fact, index) => (
            <span key={index} className="inline-flex items-baseline gap-1">
              <span className="t-num t-num-sm text-ink-1">{fact.value}</span>
              <span className="t-micro text-ink-3">{fact.unit}</span>
            </span>
          ))}
        </div>
      ) : null}

      {deltas.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {deltas.map((delta, index) => (
            <span key={index} className="t-micro text-ink-3">
              {delta}
            </span>
          ))}
        </div>
      ) : null}

      {zones && zones.some((z) => z.percentage > 0) ? (
        <HrZonesBar zones={zones} className="pt-0.5" />
      ) : null}
    </div>
  )

  return (
    <div className="space-y-1">
      {onOpenActivity ? (
        <button
          type="button"
          onClick={() => onOpenActivity(activity.id)}
          className={cn(
            'w-full rounded-control text-left transition-colors',
            'hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/40'
          )}
        >
          {summary}
        </button>
      ) : (
        summary
      )}

      {showSparkline ? (
        <Disclosure label="HR" openLabel="Hide HR" className="pt-0.5">
          <HrSparklinePanel activityId={activity.id} />
        </Disclosure>
      ) : null}
    </div>
  )
}

function resolveHrZones(activity: GlanceData): HeartRateZone[] | null {
  if (activity.hrZones && activity.hrZones.length > 0) return activity.hrZones
  return zoneSecondsToHrZones(activity.zoneSeconds)
}

function zoneSecondsToHrZones(
  zoneSeconds: GlanceData['zoneSeconds']
): HeartRateZone[] | null {
  if (!zoneSeconds) return null
  const total =
    zoneSeconds.z1 + zoneSeconds.z2 + zoneSeconds.z3 + zoneSeconds.z4 + zoneSeconds.z5
  if (total <= 0) return null

  const mapping: { name: HeartRateZone['name']; seconds: number }[] = [
    { name: 'rest', seconds: zoneSeconds.z1 },
    { name: 'warmup', seconds: zoneSeconds.z2 },
    { name: 'fatBurn', seconds: zoneSeconds.z3 },
    { name: 'cardio', seconds: zoneSeconds.z4 },
    { name: 'peak', seconds: zoneSeconds.z5 },
  ]

  return mapping.map((zone) => ({
    name: zone.name,
    minBpm: 0,
    maxBpm: 0,
    duration: zone.seconds,
    percentage: Math.round((zone.seconds / total) * 1000) / 10,
  }))
}

function buildGlanceFacts(sport: string, activity: GlanceData): GlanceFact[] {
  const type = activity.workoutType
  const effective =
    sport === 'brick'
      ? type
      : sport === 'run'
        ? 'running'
        : sport === 'bike'
          ? 'cycling'
          : sport === 'swim'
            ? 'swimming'
            : sport === 'walk'
              ? 'walking'
              : type

  if (effective === 'running' || effective === 'walking' || effective === 'hiking') {
    return compactFacts([
      paceFact(activity.paceAverage),
      distanceMilesFact(activity.distanceMeters),
      durationFact(activity.durationSeconds),
      tssFact(activity.tss),
      hrFact(activity.hrAverage),
      effective === 'running' && activity.cadenceAverage
        ? { value: String(Math.round(activity.cadenceAverage)), unit: 'spm' }
        : null,
    ])
  }

  if (effective === 'cycling') {
    return compactFacts([
      durationFact(activity.durationSeconds),
      distanceMilesFact(activity.distanceMeters),
      tssFact(activity.tss),
      activity.cyclingAvgPower != null && activity.cyclingAvgPower > 0
        ? { value: String(Math.round(activity.cyclingAvgPower)), unit: 'W' }
        : activity.cyclingAvgSpeed != null && activity.cyclingAvgSpeed > 0
          ? { value: activity.cyclingAvgSpeed.toFixed(1), unit: 'mph' }
          : null,
      hrFact(activity.hrAverage),
    ])
  }

  if (effective === 'swimming') {
    return compactFacts([
      swimDistanceFact(activity.distanceMeters),
      swimPaceFact(activity.swimPacePer100),
      durationFact(activity.durationSeconds),
      activity.swimSwolf != null && activity.swimSwolf > 0
        ? { value: String(Math.round(activity.swimSwolf)), unit: 'SWOLF' }
        : null,
      activity.swimLapCount != null && activity.swimLapCount > 0
        ? { value: String(activity.swimLapCount), unit: 'lengths' }
        : null,
      hrFact(activity.hrAverage),
    ])
  }

  if (
    sport === 'strength' ||
    sport === 'hiit' ||
    sport === 'cross' ||
    type === 'traditionalStrengthTraining' ||
    type === 'functionalStrengthTraining' ||
    type === 'highIntensityIntervalTraining' ||
    type === 'coreTraining'
  ) {
    return compactFacts([
      durationFact(activity.durationSeconds),
      hrFact(activity.hrAverage),
      activity.effortScore != null && activity.effortScore > 0
        ? { value: String(Math.round(activity.effortScore)), unit: 'effort' }
        : activity.activeCalories != null && activity.activeCalories > 0
          ? { value: String(Math.round(activity.activeCalories)), unit: 'cal' }
          : null,
      tssFact(activity.tss),
    ])
  }

  return compactFacts([
    durationFact(activity.durationSeconds),
    distanceMilesFact(activity.distanceMeters),
    tssFact(activity.tss),
    hrFact(activity.hrAverage),
  ])
}

function compactFacts(facts: Array<GlanceFact | null | false>): GlanceFact[] {
  return facts.filter((fact): fact is GlanceFact => Boolean(fact)).slice(0, 6)
}

function durationFact(seconds: number | null | undefined): GlanceFact | null {
  if (seconds == null || seconds <= 0) return null
  return { value: String(Math.round(seconds / 60)), unit: 'min' }
}

function tssFact(tss: number | null | undefined): GlanceFact | null {
  if (tss == null || tss <= 0) return null
  return { value: String(Math.round(tss)), unit: 'TSS' }
}

function hrFact(hr: number | null | undefined): GlanceFact | null {
  if (hr == null || hr <= 0) return null
  return { value: String(Math.round(hr)), unit: 'bpm' }
}

function paceFact(pace: number | null | undefined): GlanceFact | null {
  if (pace == null || pace <= 0 || pace > 30) return null
  return { value: formatPace(pace), unit: '/mi' }
}

function distanceMilesFact(meters: number | null | undefined): GlanceFact | null {
  if (meters == null || meters <= 0) return null
  const miles = meters / 1609.344
  return { value: miles >= 10 ? miles.toFixed(1) : miles.toFixed(2), unit: 'mi' }
}

function swimDistanceFact(meters: number | null | undefined): GlanceFact | null {
  if (meters == null || meters <= 0) return null
  return { value: String(Math.round(meters * 1.09361)), unit: 'yd' }
}

function swimPaceFact(secPer100m: number | null | undefined): GlanceFact | null {
  if (secPer100m == null || secPer100m <= 0) return null
  const per100yd = secPer100m * 0.9144
  return { value: formatSwimPace(per100yd), unit: '/100yd' }
}

function formatPace(minutesPerMile: number): string {
  const mins = Math.floor(minutesPerMile)
  const secs = Math.round((minutesPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatSwimPace(secPer100: number): string {
  const total = Math.round(secPer100)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Show plan deltas only when execution differs meaningfully (≥5% or absolute floors).
 */
function buildPlanDeltas(session: TodaySession, activity: GlanceData): string[] {
  const deltas: string[] = []

  const actualMin = Math.round(activity.durationSeconds / 60)
  const plannedMin = session.durationMinutes
  if (plannedMin != null && plannedMin > 0 && actualMin > 0) {
    const diff = Math.abs(actualMin - plannedMin)
    if (diff >= 2 && diff / plannedMin >= 0.05) {
      deltas.push(`${actualMin}′ of ${plannedMin}′`)
    }
  }

  const actualTss = activity.tss
  const plannedTss = session.plannedLoad
  if (actualTss != null && plannedTss != null && plannedTss > 0 && actualTss > 0) {
    const diff = Math.abs(actualTss - plannedTss)
    if (diff >= 3 && diff / plannedTss >= 0.05) {
      deltas.push(`${Math.round(actualTss)} vs ${Math.round(plannedTss)} TSS`)
    }
  }

  return deltas
}

function HrSparklinePanel({ activityId }: { activityId: string }) {
  const [points, setPoints] = useState<{ value: number }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void fetch(
      `/api/apple-health/workout/${activityId}?analytics=false&downsample=45`,
      { credentials: 'include' }
    )
      .then(async (response) => {
        const payload = (await response.json()) as {
          success?: boolean
          data?: { hrChart?: { bpm: number }[] }
          error?: string
        }
        if (!payload.success) throw new Error(payload.error ?? 'Failed to load HR')
        const chart = payload.data?.hrChart ?? []
        if (cancelled) return
        if (chart.length < 2) {
          setPoints([])
          return
        }
        const stride = Math.max(1, Math.ceil(chart.length / 48))
        setPoints(
          chart.filter((_, index) => index % stride === 0).map((point) => ({ value: point.bpm }))
        )
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load HR')
          setPoints(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activityId])

  if (loading) {
    return <p className="t-micro text-ink-3">Loading HR…</p>
  }
  if (error) {
    return <p className="t-micro text-ink-3">{error}</p>
  }
  if (!points || points.length < 2) {
    return <p className="t-micro text-ink-3">No HR samples</p>
  }

  return <MiniHrSparkline data={points} />
}

function MiniHrSparkline({
  data,
  color = HEX.rose,
  height = 28,
}: {
  data: { value: number }[]
  color?: string
  height?: number
}) {
  const gradientId = useId()
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 100
  const normalize = (v: number) => height - 2 - ((v - min) / range) * (height - 4)
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = normalize(d.value)
    return `${x},${y}`
  })
  const path = `M ${points.join(' L ')}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${width},${height - 2} L 0,${height - 2} Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

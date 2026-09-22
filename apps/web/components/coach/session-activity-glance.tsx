'use client'

import { useEffect, useId, useState } from 'react'
import { ChevronRight, Footprints, MapPin, Waves, Zap } from 'lucide-react'

import { WorkoutRouteMap } from '@/components/coach/activity/workout-route-map'
import {
  WorkoutHrSummary,
  type HrZonesConfig,
} from '@/components/coach/activity/zone-colored-hr-chart'
import { HEX } from '@/lib/constants/colors'
import type { HeartRateZone, LocationSample } from '@/lib/types/apple-health.types'
import type { SessionActivityGlance as GlanceData, TodaySession } from '@/lib/types/coach-ui.types'
import type { EnhancedWorkoutAnalytics } from '@/lib/utils/workout-analytics'
import { cn } from '@/lib/utils'

type GlanceFact = { value: string; unit: string }

interface WorkoutDetailPayload {
  workout: {
    workout_type: string
    duration: number
    hr_average: number | null
    hr_min: number | null
    hr_max: number | null
    hr_zones: HeartRateZone[] | null
    pace_average: number | null
    pace_best: number | null
    cadence_average: number | null
    distance_miles: number | null
    distance_meters: number | null
    elevation_gain_meters: number | null
    cycling_avg_power: number | null
    cycling_avg_speed: number | null
    cycling_avg_cadence: number | null
    swimming_lap_count: number | null
    swimming_avg_swolf: number | null
    swimming_avg_pace_per_100: number | null
    is_indoor: boolean | null
    active_calories: number | null
    effort_score: number | null
  }
  hrChart?: { bpm: number; timestamp?: string }[]
  hrSamples?: { timestamp: string; bpm: number }[]
  cyclingPowerSamples?: { timestamp: string; watts: number }[]
  cyclingSpeedSamples?: { timestamp: string; speed_mph: number }[]
  route?: { samples: LocationSample[] } | null
  swimLengths?: {
    length_number: number
    duration_seconds: number
    stroke_count: number | null
    swolf: number | null
    is_rest: boolean
  }[]
  analytics?: {
    timeSeriesData?: EnhancedWorkoutAnalytics['timeSeriesData']
    splits?: { splitNumber: number; avgPace: number; avgHr?: number | null }[]
    cardiacDrift?: { driftPercentage: number; interpretation: string }
    trainingImpulse?: { trimp: number; intensity: string }
    cadenceAnalysis?: { optimalRange?: boolean }
    paceAnalysis?: { splitStrategy?: string }
    insights?: { type: string; title: string; description?: string }[]
  } | null
  hrZonesConfig?: HrZonesConfig | null
}

export function SessionActivityGlance({
  session,
  activity,
  onOpenActivity,
  showCharts = true,
}: {
  session: TodaySession
  activity: GlanceData
  onOpenActivity?: (activityId: string) => void
  /** Fetch detail samples and render charts — off for dense calendar contexts. */
  showCharts?: boolean
}) {
  const facts = buildGlanceFacts(session.sport, activity)
  const zones = resolveHrZones(activity)
  const prescriptionNote = buildPrescriptionNote(session, activity)

  const [detail, setDetail] = useState<WorkoutDetailPayload | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(showCharts)

  useEffect(() => {
    if (!showCharts) return
    let cancelled = false
    setLoadingDetail(true)

    void fetch(`/api/apple-health/workout/${activity.id}?downsample=30`, {
      credentials: 'include',
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success?: boolean
          data?: WorkoutDetailPayload
        }
        if (!cancelled && payload.success && payload.data) {
          setDetail(payload.data)
        }
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })

    return () => {
      cancelled = true
    }
  }, [activity.id, showCharts])

  const workout = detail?.workout
  const type = workout?.workout_type ?? activity.workoutType
  const isRun = type === 'running'
  const isBike = type === 'cycling'
  const isSwim = type === 'swimming'
  const isOutdoor = workout?.is_indoor === false
  const detailZones = workout?.hr_zones?.length ? workout.hr_zones : zones

  const timeSeriesData =
    detail?.analytics?.timeSeriesData && detail.analytics.timeSeriesData.length > 0
      ? detail.analytics.timeSeriesData
      : buildTimeSeriesFromHrChart(detail?.hrChart)

  const hrZonesConfig = detail?.hrZonesConfig ?? null
  const showHrSummary =
    Boolean(hrZonesConfig && hrZonesConfig.zones.length >= 5 && timeSeriesData.length > 0)

  const powerSpark = downsample(
    (detail?.cyclingPowerSamples ?? []).map((p) => p.watts),
    64
  )

  const routeSamples = detail?.route?.samples ?? []
  const showMap = isOutdoor && routeSamples.length >= 8

  return (
    <div className="space-y-2.5">
      {/* One scan row of actuals — no second metrics grid below. */}
      <div className="space-y-1">
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

        {prescriptionNote ? (
          <p className="t-micro text-ink-3">{prescriptionNote}</p>
        ) : null}

        {detailZones && detailZones.some((z) => z.percentage > 0) && !showCharts ? (
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            {detailZones
              .filter((z) => z.percentage > 0)
              .map((zone) => (
                <div
                  key={zone.name}
                  className="h-full"
                  style={{
                    width: `${zone.percentage}%`,
                    backgroundColor:
                      zone.name === 'peak'
                        ? HEX.rose
                        : zone.name === 'cardio'
                          ? HEX.ember
                          : zone.name === 'fatBurn'
                            ? HEX.gold
                            : zone.name === 'warmup'
                              ? HEX.sage
                              : HEX.slate,
                  }}
                />
              ))}
          </div>
        ) : null}
      </div>

      {showCharts ? (
        <div className="space-y-2.5">
          {loadingDetail && !detail ? (
            <p className="t-micro text-ink-3">Loading workout charts…</p>
          ) : null}

          {showHrSummary && hrZonesConfig ? (
            <WorkoutHrSummary
              timeSeriesData={timeSeriesData}
              hrZonesConfig={hrZonesConfig}
              hrAverage={workout?.hr_average ?? activity.hrAverage}
              hrZones={detailZones}
            />
          ) : null}

          {/* Additive only — never restate the fact strip */}
          {isRun && detail?.analytics?.splits && detail.analytics.splits.length > 0 ? (
            <SplitsStrip
              splits={detail.analytics.splits}
              negative={detail.analytics.paceAnalysis?.splitStrategy === 'negative'}
            />
          ) : null}

          {isBike && powerSpark.length >= 4 ? (
            <ChartBlock
              label="Power"
              icon={<Zap className="size-3 text-accent-gold" />}
              trailing={
                workout?.cycling_avg_power
                  ? `${Math.round(workout.cycling_avg_power)} W avg`
                  : undefined
              }
            >
              <Sparkline data={powerSpark} color={HEX.gold} height={44} />
            </ChartBlock>
          ) : null}

          {isSwim && detail?.swimLengths && detail.swimLengths.length > 0 ? (
            <SwimLengthsStrip lengths={detail.swimLengths.filter((l) => !l.is_rest)} />
          ) : null}

          {showMap ? (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 t-micro text-ink-3">
                <MapPin className="size-3" />
                Route
              </p>
              <div className="h-36 overflow-hidden rounded-control">
                <WorkoutRouteMap
                  samples={routeSamples}
                  hrSamples={detail?.hrSamples}
                  colorByHeartRate={Boolean(detail?.hrSamples?.length)}
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : null}

          {onOpenActivity ? (
            <button
              type="button"
              onClick={() => onOpenActivity(activity.id)}
              className="t-micro inline-flex items-center gap-1 font-medium text-ink-3 transition-colors hover:text-ink-1"
            >
              Open full analysis
              <ChevronRight className="size-3" />
            </button>
          ) : null}
        </div>
      ) : onOpenActivity ? (
        <button
          type="button"
          onClick={() => onOpenActivity(activity.id)}
          className="t-micro font-medium text-brand underline-offset-2 hover:underline"
        >
          View in Activity
        </button>
      ) : null}
    </div>
  )
}

function ChartBlock({
  label,
  trailing,
  icon,
  children,
}: {
  label: string
  trailing?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 t-micro text-ink-3">
        {icon}
        {label}
        {trailing ? <span className="ml-auto">{trailing}</span> : null}
      </div>
      {children}
    </div>
  )
}

function SplitsStrip({
  splits,
  negative,
}: {
  splits: { splitNumber: number; avgPace: number }[]
  negative?: boolean
}) {
  const paces = splits.map((s) => s.avgPace)
  const fastest = Math.min(...paces)
  const slowest = Math.max(...paces)
  const range = slowest - fastest || 1

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 t-micro text-ink-3">
        <Footprints className="size-3" />
        Mile splits
        {negative ? (
          <span className="rounded-chip bg-tone-good/15 px-1.5 py-0.5 text-tone-good">
            Negative split
          </span>
        ) : null}
      </div>
      <div className="flex items-end gap-1">
        {splits.map((split) => {
          const height = 28 + ((slowest - split.avgPace) / range) * 36
          const isFastest = split.avgPace === fastest
          return (
            <div key={split.splitNumber} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full rounded-t-sm',
                  isFastest ? 'bg-tone-good' : 'bg-sport-run/50'
                )}
                style={{ height }}
                title={`Mile ${split.splitNumber}: ${formatPace(split.avgPace)}`}
              />
              <span className="t-num text-[10px] text-ink-2">{formatPace(split.avgPace)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SwimLengthsStrip({
  lengths,
}: {
  lengths: { length_number: number; duration_seconds: number; swolf: number | null }[]
}) {
  const visible = lengths.slice(0, 24)
  const times = visible.map((l) => l.duration_seconds)
  const fastest = Math.min(...times)
  const slowest = Math.max(...times)
  const range = slowest - fastest || 1

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 t-micro text-ink-3">
        <Waves className="size-3" />
        Lengths
        <span className="ml-auto">{lengths.length} total</span>
      </div>
      <div className="flex h-12 items-end gap-px overflow-hidden rounded-control">
        {visible.map((length) => {
          const height = 20 + ((slowest - length.duration_seconds) / range) * 28
          return (
            <div
              key={length.length_number}
              className="min-w-[3px] flex-1 rounded-t-sm bg-sport-swim/70"
              style={{ height }}
              title={`L${length.length_number}: ${length.duration_seconds.toFixed(0)}s${
                length.swolf != null ? ` · SWOLF ${Math.round(length.swolf)}` : ''
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

function Sparkline({
  data,
  color,
  height = 40,
}: {
  data: number[]
  color: string
  height?: number
}) {
  const gradientId = useId()
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 100
  const normalize = (v: number) => height - 2 - ((v - min) / range) * (height - 4)
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = normalize(value)
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
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
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
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * One quiet line for plan context — never restates actuals already in the fact row.
 * Prefer a single "Prescribed …" list; only call out a duration delta when it matters.
 */
function buildPrescriptionNote(session: TodaySession, activity: GlanceData): string | null {
  const parts: string[] = []

  if (session.durationMinutes) {
    parts.push(`${session.durationMinutes}′`)
  }
  if (session.distanceMeters) {
    parts.push(
      session.sport === 'swim'
        ? `${Math.round(session.distanceMeters * 1.09361)} yd`
        : `${(session.distanceMeters / 1609.344).toFixed(2)} mi`
    )
  }
  if (session.plannedLoad) parts.push(`${session.plannedLoad} TSS`)
  if (session.targets?.hrZone) parts.push(`Z${session.targets.hrZone}`)
  if (session.targets?.rpe) parts.push(`RPE ${session.targets.rpe}`)

  if (parts.length === 0) return null

  const actualMin = Math.round(activity.durationSeconds / 60)
  const plannedMin = session.durationMinutes
  const durationOff =
    plannedMin != null &&
    plannedMin > 0 &&
    actualMin > 0 &&
    Math.abs(actualMin - plannedMin) >= 2 &&
    Math.abs(actualMin - plannedMin) / plannedMin >= 0.05

  if (durationOff) {
    return `${actualMin}′ vs ${plannedMin}′ prescribed · ${parts.filter((p) => !p.endsWith('′')).join(' · ')}`
  }

  return `Prescribed ${parts.join(' · ')}`
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

function downsample(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return values
  const stride = Math.ceil(values.length / maxPoints)
  return values.filter((_, i) => i % stride === 0)
}

/** Fallback when analytics.timeSeriesData is missing (e.g. non-cardio). */
function buildTimeSeriesFromHrChart(
  hrChart: { bpm: number; timestamp?: string }[] | undefined
): EnhancedWorkoutAnalytics['timeSeriesData'] {
  if (!hrChart || hrChart.length === 0) return []
  const startMs = hrChart[0]?.timestamp ? new Date(hrChart[0].timestamp).getTime() : 0
  return hrChart.map((point, index) => ({
    elapsedSeconds: point.timestamp
      ? Math.max(0, Math.round((new Date(point.timestamp).getTime() - startMs) / 1000))
      : index * 5,
    hr: point.bpm,
    cadence: null,
    pace: null,
    cyclingSpeed: null,
    cyclingPower: null,
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
  return { value: formatSwimPace(secPer100m * 0.9144), unit: '/100yd' }
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

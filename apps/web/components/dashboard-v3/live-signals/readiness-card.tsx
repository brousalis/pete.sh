'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Flags serious enough to show on a glanceable dashboard card. */
const SERIOUS_FLAGS = new Set([
  'mechanical_red_flag',
  'pain_threshold_exceeded',
  'possible_illness_or_overreaching',
  'acwr_spike',
])

function ReadinessRing({
  score,
  size = 64,
  color,
}: {
  score: number
  size?: number
  color: string
}) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, score / 100))

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        className="absolute inset-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums leading-none">
          {Math.round(score)}
        </span>
        <span className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5">
          ready
        </span>
      </div>
    </div>
  )
}

interface CoachReadiness {
  score: number
  level: string
  flags: string[]
  guidance: { summary: string }
}

export function ReadinessCard() {
  const { activityDaily } = useDashboardV3()
  const [coachReadiness, setCoachReadiness] = useState<CoachReadiness | null>(null)

  // Readiness v2 comes from the coach engine: HRV against the athlete's own
  // rolling baseline, resting heart rate, sleep, training stress balance and
  // symptom history. The old card scored HRV against fixed population
  // thresholds and ignored pain entirely.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/coach/readiness', { credentials: 'include' })
        const payload = await response.json()
        if (!cancelled && payload.success) setCoachReadiness(payload.data as CoachReadiness)
      } catch {
        // The card falls back to showing raw metrics.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const hrv = activityDaily?.heart_rate_variability ?? null
  const rhr = activityDaily?.resting_heart_rate ?? null

  const score = coachReadiness?.score ?? 0
  const level = coachReadiness?.level ?? 'unknown'

  const color =
    score >= 80
      ? 'stroke-accent-sage'
      : score >= 60
        ? 'stroke-accent-gold'
        : score >= 40
          ? 'stroke-accent-ember'
          : 'stroke-accent-rose'

  const levelText = String(level).toLowerCase()
  const levelColor =
    score >= 80
      ? 'text-accent-sage'
      : score >= 60
        ? 'text-accent-gold'
        : score >= 40
          ? 'text-accent-ember'
          : 'text-accent-rose'

  const hasData = score > 0 || hrv != null || rhr != null

  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-accent-violet" />
          <span className="text-[11px] font-semibold">Readiness</span>
        </div>
        {hasData && (
          <span
            className={cn(
              'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
              levelColor,
              'bg-current/10'
            )}
          >
            {levelText}
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="text-[10px] text-muted-foreground/60 py-4 text-center">
          Sync your wearable to see readiness
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <ReadinessRing score={score} color={color} />
          <div className="flex-1 min-w-0 space-y-1">
            {hrv != null && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">HRV</span>
                <span className="font-semibold tabular-nums">
                  {Math.round(hrv)}ms
                </span>
              </div>
            )}
            {rhr != null && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Resting HR</span>
                <span className="font-semibold tabular-nums">{rhr}bpm</span>
              </div>
            )}
            {coachReadiness?.flags
              .filter(flag => SERIOUS_FLAGS.has(flag))
              .slice(0, 1)
              .map(flag => (
                <div
                  key={flag}
                  className="flex items-center gap-1 text-[9px] text-accent-rose mt-1"
                >
                  <AlertTriangle className="size-2.5 shrink-0" />
                  <span className="truncate">{flag.replace(/_/g, ' ')}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {coachReadiness?.guidance?.summary && (
        <p className="text-[10px] text-muted-foreground/80 mt-2 pt-2 border-t border-border/30 leading-relaxed">
          {coachReadiness.guidance.summary}
        </p>
      )}
    </div>
  )
}

'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Heart, Moon, Sparkles, TrendingUp } from 'lucide-react'

const STATUS_ICONS = {
  hrv: TrendingUp,
  'resting hr': Heart,
  sleep: Moon,
} as const

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

function computeFallbackReadiness(
  hrv: number | null,
  rhr: number | null
): number {
  if (hrv == null && rhr == null) return 0
  let score = 60
  if (hrv != null) {
    if (hrv > 60) score += 15
    else if (hrv > 40) score += 5
    else if (hrv < 25) score -= 15
  }
  if (rhr != null) {
    if (rhr < 55) score += 10
    else if (rhr > 70) score -= 10
  }
  return Math.max(0, Math.min(100, score))
}

export function ReadinessCard() {
  const { aiCoachReadiness, activityDaily } = useDashboardV3()

  const hrv = activityDaily?.heart_rate_variability ?? null
  const rhr = activityDaily?.resting_heart_rate ?? null

  const score =
    aiCoachReadiness?.score ?? computeFallbackReadiness(hrv, rhr)
  const level = aiCoachReadiness?.level ?? 'unknown'

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
            {aiCoachReadiness?.signals?.slice(0, 1).map(signal => {
              const Icon =
                STATUS_ICONS[
                  signal.metric.toLowerCase() as keyof typeof STATUS_ICONS
                ] ?? TrendingUp
              return (
                <div
                  key={signal.metric}
                  className="flex items-center gap-1 text-[9px] text-muted-foreground/70 mt-1"
                >
                  <Icon className="size-2.5" />
                  <span className="truncate">{signal.metric}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {aiCoachReadiness?.todayRecommendation && (
        <p className="text-[10px] text-muted-foreground/80 mt-2 pt-2 border-t border-border/30 leading-relaxed">
          {aiCoachReadiness.todayRecommendation}
        </p>
      )}
    </div>
  )
}

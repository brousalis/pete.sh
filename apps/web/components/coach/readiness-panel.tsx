'use client'

import { AlertTriangle } from 'lucide-react'

import { Chip, Disclosure, Panel } from '@/components/coach/ui/panel'
import { toneClasses, type Tone } from '@/components/coach/ui/tone'
import type { ReadinessView } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const LEVEL_TONE: Record<string, { tone: Tone; label: string }> = {
  fresh: { tone: 'good', label: 'Fresh' },
  moderate: { tone: 'info', label: 'Moderate' },
  fatigued: { tone: 'caution', label: 'Fatigued' },
  compromised: { tone: 'alert', label: 'Compromised' },
}

/** Flags that should read as a warning rather than a neutral note. */
const SERIOUS_FLAGS = new Set([
  'mechanical_red_flag',
  'pain_threshold_exceeded',
  'possible_illness_or_overreaching',
  'acwr_spike',
  'deep_fatigue',
])

const FLAG_LABELS: Record<string, string> = {
  hrv_suppressed: 'HRV well below baseline',
  possible_illness_or_overreaching: 'Illness or overreaching pattern',
  low_deep_sleep: 'Low deep sleep',
  low_sleep_efficiency: 'Low sleep efficiency',
  sleep_debt: 'Sleep debt',
  elevated_breathing_disturbances: 'Elevated breathing disturbances',
  elevated_respiratory_rate: 'Elevated respiratory rate',
  elevated_wrist_temp: 'Elevated wrist temperature',
  deep_fatigue: 'Deep fatigue',
  acwr_spike: 'Load ramping too fast',
  acwr_elevated: 'Load ramp elevated',
  acwr_detraining: 'Detraining',
  high_monotony: 'Training too uniform',
  pain_threshold_exceeded: 'Pain above the training threshold',
  mechanical_red_flag: 'Mechanical signs — contact your PT',
}

export function ReadinessPanel({
  readiness,
  compact = false,
}: {
  readiness: ReadinessView | null
  compact?: boolean
}) {
  if (!readiness) {
    return (
      <Panel>
        <p className="py-3 text-center t-label text-ink-3">
          Not enough data to compute readiness yet.
        </p>
      </Panel>
    )
  }

  const level = LEVEL_TONE[readiness.level] ?? LEVEL_TONE.moderate!
  const tone = toneClasses(level.tone)
  const size = compact ? 72 : 92
  const stroke = compact ? 6 : 7
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius

  return (
    <Panel className={cn(compact && 'px-3.5 py-3')}>
      <div className={cn('flex items-center', compact ? 'gap-3.5' : 'gap-5')}>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 size-full">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              className="stroke-surface-3"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              className={cn(tone.stroke, 'transition-[stroke-dashoffset] duration-700')}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - readiness.score / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('t-num text-ink-1', compact ? 't-num-md' : 't-num-lg')}>
              {readiness.score}
            </span>
            <span className="t-micro mt-0.5 text-ink-3">ready</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn('t-subtitle', tone.text)}>{level.label}</p>
          <p className="mt-1 t-body text-ink-2">{readiness.guidance.summary}</p>

          {readiness.flags.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {readiness.flags.map((flag) => {
                const serious = SERIOUS_FLAGS.has(flag)
                return (
                  <Chip
                    key={flag}
                    tone={serious ? 'alert' : 'neutral'}
                    icon={serious ? <AlertTriangle className="size-3" /> : undefined}
                  >
                    {FLAG_LABELS[flag] ?? flag.replace(/_/g, ' ')}
                  </Chip>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      <Disclosure
        label="Why this score"
        openLabel="Hide breakdown"
        className="mt-3 border-t border-line pt-1"
      >
        <div className="space-y-2">
          {readiness.components.map((component) => (
            <div key={component.key} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="t-label truncate text-ink-2">{component.label}</span>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="t-num t-num-sm text-ink-1">{component.score}</span>
                  <span className="t-label w-8 text-right text-ink-3">
                    {Math.round(component.weight * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn('h-full rounded-full', toneClasses(scoreTone(component.score)).dot)}
                  style={{ width: `${component.score}%` }}
                />
              </div>
              <p className="t-label leading-snug text-ink-3">{component.detail}</p>
            </div>
          ))}
        </div>
      </Disclosure>
    </Panel>
  )
}

function scoreTone(score: number): Tone {
  if (score >= 75) return 'good'
  if (score >= 50) return 'info'
  if (score >= 35) return 'caution'
  return 'alert'
}

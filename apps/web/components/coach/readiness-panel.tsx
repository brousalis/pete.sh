'use client'

import { AlertTriangle, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import type { ReadinessView } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const LEVEL_STYLES: Record<string, { ring: string; text: string; label: string }> = {
  fresh: { ring: 'stroke-accent-sage', text: 'text-accent-sage', label: 'Fresh' },
  moderate: { ring: 'stroke-accent-azure', text: 'text-accent-azure', label: 'Moderate' },
  fatigued: { ring: 'stroke-accent-gold', text: 'text-accent-gold', label: 'Fatigued' },
  compromised: { ring: 'stroke-accent-rose', text: 'text-accent-rose', label: 'Compromised' },
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
  sleep_debt: 'Sleep debt',
  deep_fatigue: 'Deep fatigue',
  acwr_spike: 'Load ramping too fast',
  acwr_elevated: 'Load ramp elevated',
  acwr_detraining: 'Detraining',
  high_monotony: 'Training too uniform',
  pain_threshold_exceeded: 'Pain above the training threshold',
  mechanical_red_flag: 'Mechanical signs — contact your PT',
}

export function ReadinessPanel({ readiness }: { readiness: ReadinessView | null }) {
  const [expanded, setExpanded] = useState(false)

  if (!readiness) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Not enough data to compute readiness yet. It needs a few days of overnight heart rate and
          sleep.
        </CardContent>
      </Card>
    )
  }

  const style = LEVEL_STYLES[readiness.level] ?? LEVEL_STYLES.moderate!
  const circumference = 2 * Math.PI * 34

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="relative size-20 shrink-0">
            <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="7"
                className="stroke-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                className={style.ring}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - readiness.score / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums">{readiness.score}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                ready
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-semibold', style.text)}>{style.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{readiness.guidance.summary}</p>

            {readiness.flags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {readiness.flags.map((flag) => {
                  const serious = SERIOUS_FLAGS.has(flag)
                  return (
                    <span
                      key={flag}
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]',
                        serious
                          ? 'bg-accent-rose/10 text-accent-rose'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {serious ? <AlertTriangle className="size-3" /> : null}
                      {FLAG_LABELS[flag] ?? flag.replace(/_/g, ' ')}
                    </span>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {expanded ? 'Hide' : 'Why this score'}
          <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
        </button>

        {expanded ? (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {readiness.components.map((component) => (
              <div key={component.key} className="flex items-baseline gap-2 text-xs">
                <span className="w-32 shrink-0 text-muted-foreground">{component.label}</span>
                <span className="w-8 shrink-0 text-right font-medium tabular-nums">
                  {component.score}
                </span>
                <span className="w-10 shrink-0 text-right text-[10px] text-muted-foreground">
                  {Math.round(component.weight * 100)}%
                </span>
                <span className="min-w-0 flex-1 text-muted-foreground">{component.detail}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

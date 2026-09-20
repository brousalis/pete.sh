'use client'

import { cn } from '@/lib/utils'
import type { LoadSummary } from '@petehome/coach-core'
import { AlertTriangle, TrendingDown, TrendingUp, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * Training load from measured TSS.
 *
 * This card used to synthesise a daily load from the *scheduled* workout type
 * multiplied by a completion flag, then average it over 7 and 28 days. That
 * moved when the schedule changed rather than when the training changed, and
 * could not see a hard session that was not on the plan. It now reads the PMC
 * computed in coach-core from real heart rate, pace and power data.
 */
export function LoadTrendCard() {
  const [summary, setSummary] = useState<LoadSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/coach/load?days=60', { credentials: 'include' })
        const payload = await response.json()
        if (!cancelled && payload.success) setSummary(payload.data as LoadSummary)
      } catch {
        // Card degrades to an empty state; the dashboard should not break.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const { series, atl, ctl, tsb, trend, max } = useMemo(() => {
    const pmc = summary?.pmc ?? []
    const recent = pmc.slice(-14)
    const current = summary?.current

    // Compare this week's fatigue against last week's to get a direction.
    const priorAtl = pmc[pmc.length - 8]?.atl ?? current?.atl ?? 0
    const currentAtl = current?.atl ?? 0

    return {
      series: recent.map((point) => point.tss),
      atl: currentAtl,
      ctl: current?.ctl ?? 0,
      tsb: current?.tsb ?? 0,
      trend: (currentAtl > priorAtl + 3
        ? 'up'
        : currentAtl < priorAtl - 3
          ? 'down'
          : 'flat') as 'up' | 'down' | 'flat',
      max: Math.max(...recent.map((point) => point.tss), 1),
    }
  }, [summary])

  const hasData = series.some((value) => value > 0)

  const formLabel =
    tsb > 10 ? 'Fresh' : tsb > -5 ? 'Optimal' : tsb > -20 ? 'Building' : 'Overreach'

  const formColor =
    tsb > 10
      ? 'text-accent-sage'
      : tsb > -5
        ? 'text-accent-azure'
        : tsb > -20
          ? 'text-accent-gold'
          : 'text-accent-rose'

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Zap

  // Above 1.5 is the range associated with sharply elevated injury risk, which
  // matters more than the load numbers themselves during a return from injury.
  const acwr = summary?.acwr ?? null
  const acwrWarning = acwr != null && (acwr > 1.5 || acwr < 0.8)

  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendIcon className="size-3.5 text-accent-ember" />
          <span className="text-[11px] font-semibold">Training Load</span>
        </div>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
            formColor,
            'bg-current/10'
          )}
        >
          {formLabel}
        </span>
      </div>

      {loading ? (
        <p className="py-4 text-center text-[10px] text-muted-foreground/60">Loading…</p>
      ) : !hasData ? (
        <p className="py-4 text-center text-[10px] text-muted-foreground/60">
          No training load recorded yet
        </p>
      ) : (
        <>
          <div className="mb-2 flex h-10 items-end gap-[2px]">
            {series.map((value, index) => {
              const height = max > 0 ? (value / max) * 100 : 0
              const isToday = index === series.length - 1
              return (
                <div
                  key={index}
                  className={cn(
                    'min-h-[2px] flex-1 rounded-sm transition-colors',
                    value > 80
                      ? 'bg-accent-ember/70'
                      : value > 40
                        ? 'bg-accent-gold/60'
                        : value > 0
                          ? 'bg-accent-sage/50'
                          : 'bg-muted/40',
                    isToday && 'ring-1 ring-primary/70'
                  )}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-[10px] font-bold tabular-nums">{Math.round(atl)}</p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Fatigue</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tabular-nums">{Math.round(ctl)}</p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Fitness</p>
            </div>
            <div>
              <p className={cn('text-[10px] font-bold tabular-nums', formColor)}>
                {tsb > 0 ? '+' : ''}
                {Math.round(tsb)}
              </p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Form</p>
            </div>
          </div>

          {acwr != null ? (
            <div
              className={cn(
                'mt-2 flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[9px]',
                acwrWarning ? 'bg-accent-rose/10 text-accent-rose' : 'text-muted-foreground'
              )}
            >
              {acwrWarning ? <AlertTriangle className="size-3" /> : null}
              <span className="tabular-nums">ACWR {acwr.toFixed(2)}</span>
              {acwr > 1.5 ? <span>— ramping too fast</span> : null}
              {acwr < 0.8 ? <span>— detraining</span> : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

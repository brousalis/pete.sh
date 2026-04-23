'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { addDays, startOfWeek, subWeeks } from 'date-fns'
import { TrendingDown, TrendingUp, Zap } from 'lucide-react'
import { useMemo } from 'react'

const DAY_KEYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function focusLoad(focus: string): number {
  switch (focus) {
    case 'HIIT':
    case 'Hybrid':
      return 85
    case 'Strength':
    case 'Circuit':
      return 70
    case 'Endurance':
      return 60
    case 'Core/Posture':
    case 'Core':
      return 40
    case 'Active Recovery':
      return 20
    default:
      return 0
  }
}

function computeWeekNumber(date: Date): number {
  const soy = new Date(date.getFullYear(), 0, 1)
  const d = Math.floor((date.getTime() - soy.getTime()) / 86400000)
  return Math.ceil((d + soy.getDay() + 1) / 7)
}

export function LoadTrendCard() {
  const { routine } = useDashboardV3()

  const { series, atl, ctl, tsb, trend } = useMemo(() => {
    const today = new Date()
    const start = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 3)

    const days: number[] = []
    for (let i = 0; i < 28; i++) {
      const d = addDays(start, i)
      if (d > today) break
      const dayKey = DAY_KEYS[(d.getDay() + 6) % 7]!
      const weekNum = computeWeekNumber(d)
      const week = routine?.weeks.find(w => w.weekNumber === weekNum)
      const dayData = week?.days[dayKey]
      const focus = routine?.schedule[dayKey]?.focus || 'Rest'
      const base = focusLoad(focus)
      const workoutDone = dayData?.workout?.completed || false
      const completionMult = workoutDone ? 1.0 : 0.2
      days.push(base * completionMult)
    }

    const recent = days.slice(-7)
    const atlVal =
      recent.length > 0
        ? recent.reduce((s, x) => s + x, 0) / recent.length
        : 0
    const ctlVal =
      days.length > 0 ? days.reduce((s, x) => s + x, 0) / days.length : 0
    const tsbVal = ctlVal - atlVal

    const lastWeek = days.slice(-14, -7)
    const lastAtl =
      lastWeek.length > 0
        ? lastWeek.reduce((s, x) => s + x, 0) / lastWeek.length
        : 0
    const trendDir: 'up' | 'down' | 'flat' =
      atlVal > lastAtl + 3 ? 'up' : atlVal < lastAtl - 3 ? 'down' : 'flat'

    return {
      series: days.slice(-14),
      atl: atlVal,
      ctl: ctlVal,
      tsb: tsbVal,
      trend: trendDir,
    }
  }, [routine])

  const max = Math.max(...series, 1)
  const hasData = series.some(v => v > 0)

  const formLabel =
    tsb > 10
      ? 'Fresh'
      : tsb > -5
        ? 'Optimal'
        : tsb > -20
          ? 'Building'
          : 'Overreach'

  const formColor =
    tsb > 10
      ? 'text-accent-sage'
      : tsb > -5
        ? 'text-accent-azure'
        : tsb > -20
          ? 'text-accent-gold'
          : 'text-accent-rose'

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Zap

  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendIcon className="size-3.5 text-accent-ember" />
          <span className="text-[11px] font-semibold">Training Load</span>
        </div>
        <span
          className={cn(
            'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
            formColor,
            'bg-current/10'
          )}
        >
          {formLabel}
        </span>
      </div>

      {!hasData ? (
        <p className="text-[10px] text-muted-foreground/60 py-4 text-center">
          Complete workouts to build your load trend
        </p>
      ) : (
        <>
          {/* Sparkline */}
          <div className="flex items-end gap-[2px] h-10 mb-2">
            {series.map((val, i) => {
              const h = max > 0 ? (val / max) * 100 : 0
              const isToday = i === series.length - 1
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-sm transition-colors min-h-[2px]',
                    val > 60
                      ? 'bg-accent-ember/70'
                      : val > 30
                        ? 'bg-accent-gold/60'
                        : val > 0
                          ? 'bg-accent-sage/50'
                          : 'bg-muted/40',
                    isToday && 'ring-1 ring-primary/70'
                  )}
                  style={{ height: `${Math.max(h, 4)}%` }}
                />
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-[10px] font-bold tabular-nums">
                {Math.round(atl)}
              </p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
                Acute
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tabular-nums">
                {Math.round(ctl)}
              </p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
                Chronic
              </p>
            </div>
            <div>
              <p
                className={cn(
                  'text-[10px] font-bold tabular-nums',
                  formColor
                )}
              >
                {tsb > 0 ? '+' : ''}
                {Math.round(tsb)}
              </p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
                Form
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

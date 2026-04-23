'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'

export function StreakCard() {
  const { consistencyStats } = useDashboardV3()

  const streak = consistencyStats?.currentStreak ?? 0
  const longest = consistencyStats?.longestStreak ?? 0
  const weekly = consistencyStats?.weeklyCompletion ?? 0
  const monthly = consistencyStats?.monthlyCompletion ?? 0

  const tier =
    streak >= 30 ? 'milestone' : streak >= 14 ? 'high' : streak >= 7 ? 'med' : 'low'

  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center gap-1.5 mb-2">
        <Flame className="size-3.5 text-accent-ember animate-[flicker_2s_ease-in-out_infinite]" />
        <span className="text-[11px] font-semibold">Consistency</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'text-2xl font-bold tabular-nums leading-none text-accent-ember',
            tier === 'milestone' && 'text-[28px]'
          )}
        >
          {streak}
        </span>
        <span className="text-[10px] text-muted-foreground">day streak</span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div>
          <div className="flex items-center justify-between text-[9px] mb-0.5">
            <span className="text-muted-foreground uppercase tracking-wider">
              Week
            </span>
            <span className="font-semibold tabular-nums">{weekly}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-sage/70 transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, weekly))}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[9px] mb-0.5">
            <span className="text-muted-foreground uppercase tracking-wider">
              Month
            </span>
            <span className="font-semibold tabular-nums">{monthly}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-azure/70 transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, monthly))}%` }}
            />
          </div>
        </div>
      </div>

      {longest > 0 && (
        <p className="text-[9px] text-muted-foreground/60 mt-2 pt-2 border-t border-border/30">
          Personal best: <span className="font-semibold">{longest}d</span>
        </p>
      )}
    </div>
  )
}

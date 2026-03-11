'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { cn } from '@/lib/utils'
import {
  Activity,
  Flame,
  Footprints,
  Heart,
  PersonStanding,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

function MiniRing({
  value,
  goal,
  color,
  size = 28,
}: {
  value: number
  goal: number
  color: string
  size?: number
}) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / goal, 1)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-muted/15"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={color}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

function StatItem({
  icon: Icon,
  label,
  value,
  unit,
  className,
}: {
  icon: typeof Flame
  label: string
  value: string | number | null
  unit?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tabular-nums text-foreground leading-none">
          {value ?? '--'}
          {unit && <span className="text-[9px] text-muted-foreground/80 ml-0.5">{unit}</span>}
        </p>
        <p className="text-[8px] text-muted-foreground leading-none mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export function ActivitySummary() {
  const { activityDaily: daily, activityWeekly: weekly, loading } = useDashboardV2()
  const stale = !loading && !daily

  const moveVal = daily?.active_calories ?? 0
  const moveGoal = daily?.move_goal ?? 600
  const exerciseVal = daily?.exercise_minutes ?? 0
  const exerciseGoal = daily?.exercise_goal ?? 30
  const standVal = daily?.stand_hours ?? 0
  const standGoal = daily?.stand_goal ?? 12

  return (
    <Link href="/fitness/activity" className="block">
      <div className="rounded-xl px-3.5 py-3 border border-border bg-card hover:bg-muted/50 transition-all group shadow-sm ring-1 ring-border/40 ring-inset">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-accent-sage" />
            <span className="text-[11px] font-semibold text-foreground">Activity</span>
          </div>
          {stale && (
            <span className="text-[8px] text-muted-foreground/40">Stale data</span>
          )}
          {!stale && weekly && (
            <span className="text-[9px] text-muted-foreground/50">
              {weekly.totalWorkouts} workouts this week
            </span>
          )}
        </div>

        {/* Rings + key stats */}
        <div className="flex items-center gap-3">
          {/* Activity rings - nested */}
          <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <MiniRing value={moveVal} goal={moveGoal} color="stroke-accent-rose" size={44} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MiniRing value={exerciseVal} goal={exerciseGoal} color="stroke-accent-sage" size={34} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MiniRing value={standVal} goal={standGoal} color="stroke-accent-azure" size={24} />
            </div>
          </div>

          {/* Stats grid */}
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <StatItem
              icon={Flame}
              label="Move"
              value={moveVal}
              unit={`/${moveGoal}`}
            />
            <StatItem
              icon={Footprints}
              label="Steps"
              value={daily?.steps ? daily.steps.toLocaleString() : null}
            />
            <StatItem
              icon={Zap}
              label="Exercise"
              value={exerciseVal}
              unit={`/${exerciseGoal}m`}
            />
            <StatItem
              icon={PersonStanding}
              label="Stand"
              value={standVal}
              unit={`/${standGoal}h`}
            />
          </div>
        </div>

        {/* Health vitals row */}
        {(daily?.resting_heart_rate || daily?.heart_rate_variability) && (
          <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-border/20">
            {daily.resting_heart_rate && (
              <StatItem
                icon={Heart}
                label="Resting HR"
                value={daily.resting_heart_rate}
                unit="bpm"
              />
            )}
            {daily.heart_rate_variability && (
              <StatItem
                icon={TrendingUp}
                label="HRV"
                value={daily.heart_rate_variability}
                unit="ms"
              />
            )}
            {weekly && (
              <StatItem
                icon={Timer}
                label="Week total"
                value={Math.round(weekly.totalDurationMin)}
                unit="min"
              />
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

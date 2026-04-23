'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { cn } from '@/lib/utils'
import { Activity, Flame, Footprints, PersonStanding, Zap } from 'lucide-react'
import Link from 'next/link'

function Ring({
  value,
  goal,
  color,
  size,
}: {
  value: number
  goal: number
  color: string
  size: number
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

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  iconColor,
}: {
  icon: typeof Flame
  label: string
  value: string | number | null
  unit?: string
  iconColor?: string
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className={cn('size-2.5 shrink-0', iconColor ?? 'text-muted-foreground')} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tabular-nums leading-none">
          {value ?? '--'}
          {unit && (
            <span className="text-[8px] text-muted-foreground/70 ml-0.5">
              {unit}
            </span>
          )}
        </p>
        <p className="text-[8px] text-muted-foreground leading-none mt-0.5">
          {label}
        </p>
      </div>
    </div>
  )
}

export function ActivityCard() {
  const { activityDaily, activityWeekly } = useDashboardV3()

  const moveVal = activityDaily?.active_calories ?? 0
  const moveGoal = activityDaily?.move_goal ?? 600
  const exerciseVal = activityDaily?.exercise_minutes ?? 0
  const exerciseGoal = activityDaily?.exercise_goal ?? 30
  const standVal = activityDaily?.stand_hours ?? 0
  const standGoal = activityDaily?.stand_goal ?? 12

  return (
    <Link href="/fitness/activity" className="block">
      <div className="rounded-md border border-border bg-card p-3 shadow-sm ring-1 ring-border/40 ring-inset hover:bg-muted/30 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-accent-sage" />
            <span className="text-[11px] font-semibold">Activity</span>
          </div>
          {activityWeekly && (
            <span className="text-[9px] text-muted-foreground/60 tabular-nums">
              {activityWeekly.totalWorkouts} this wk
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Ring value={moveVal} goal={moveGoal} color="stroke-accent-rose" size={44} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Ring value={exerciseVal} goal={exerciseGoal} color="stroke-accent-sage" size={34} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Ring value={standVal} goal={standGoal} color="stroke-accent-azure" size={24} />
            </div>
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-2 gap-y-1.5">
            <Stat
              icon={Flame}
              label="Move"
              value={moveVal}
              unit={`/${moveGoal}`}
              iconColor="text-accent-rose"
            />
            <Stat
              icon={Footprints}
              label="Steps"
              value={
                activityDaily?.steps
                  ? activityDaily.steps.toLocaleString()
                  : null
              }
            />
            <Stat
              icon={Zap}
              label="Ex"
              value={exerciseVal}
              unit={`/${exerciseGoal}m`}
              iconColor="text-accent-sage"
            />
            <Stat
              icon={PersonStanding}
              label="Stand"
              value={standVal}
              unit={`/${standGoal}h`}
              iconColor="text-accent-azure"
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

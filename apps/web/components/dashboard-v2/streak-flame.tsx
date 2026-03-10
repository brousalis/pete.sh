'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'

interface StreakFlameProps {
  streak: number
  weeklyCompletion: number
  monthlyCompletion: number
  longestStreak: number
  className?: string
}

export function StreakFlame({
  streak,
  weeklyCompletion,
  monthlyCompletion,
  longestStreak,
  className,
}: StreakFlameProps) {
  const isMilestone = streak >= 30
  const isHigh = streak >= 14
  const isMedium = streak >= 7

  return (
    <div className={cn('space-y-3', className)}>
      {/* Streak display */}
      <div className="flex items-center gap-2">
        <Flame
          className={cn(
            'shrink-0 text-accent-ember animate-[flicker_2s_ease-in-out_infinite]',
            isMilestone && 'size-7',
            isHigh && !isMilestone && 'size-6',
            isMedium && !isHigh && 'size-5',
            !isMedium && 'size-5'
          )}
        />
        <span className="text-xl font-bold tabular-nums text-accent-ember">
          {streak}
        </span>
        <span className="text-[10px] text-muted-foreground">day streak</span>
      </div>

      {/* Progress bars */}
      <div className="space-y-2">
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Week</span>
            <span className="font-semibold tabular-nums">
              {weeklyCompletion}%
            </span>
          </div>
          <Progress value={weeklyCompletion} className="h-1.5" />
        </div>
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Month</span>
            <span className="font-semibold tabular-nums">
              {monthlyCompletion}%
            </span>
          </div>
          <Progress value={monthlyCompletion} className="h-1.5" />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Best: {longestStreak} days
      </p>
    </div>
  )
}

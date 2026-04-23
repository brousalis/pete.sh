'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { Button } from '@/components/ui/button'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import { cn } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import { Command, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'

function getGreeting(hour: number): string {
  if (hour < 5) return 'Late night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

export function HudBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { focusType, isRestDay, selectedDate, dayOfWeek, weekNumber, routine } =
    useDashboardV3()
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isToday = isSameDay(selectedDate, new Date())
  const focusConfig = getFocusConfig(focusType)
  const FocusIcon = focusConfig.icon

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]
  const morningDone = dayData?.morningRoutine?.completed || false
  const workoutDone = dayData?.workout?.completed || false
  const nightDone = dayData?.nightRoutine?.completed || false
  const allDone = morningDone && (workoutDone || isRestDay) && nightDone

  const greeting = allDone
    ? 'Done for the day'
    : `${getGreeting(time.getHours())}, athlete`

  return (
    <div className="relative bg-card/95 backdrop-blur border-b border-border">
      <div className="flex h-12 items-center gap-3 px-4">
        {/* Brand + time */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'size-7 rounded-md flex items-center justify-center shrink-0',
              focusConfig.bgStrong
            )}
          >
            <FocusIcon className={cn('size-3.5', focusConfig.color)} />
          </div>
          <span
            suppressHydrationWarning
            className="text-sm font-bold tabular-nums text-foreground leading-none"
          >
            {format(time, 'h:mm')}
            <span className="text-[10px] text-muted-foreground/60 ml-0.5">
              {format(time, 'a')}
            </span>
          </span>
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-muted-foreground/40">·</span>
            <span
              suppressHydrationWarning
              className="text-xs font-medium text-muted-foreground truncate"
            >
              {greeting}
            </span>
          </div>
        </div>

        {/* Center: Focus identity */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full border',
              focusConfig.bg,
              'border-transparent'
            )}
          >
            <span className={cn('text-[10px] font-semibold uppercase tracking-wider', focusConfig.color)}>
              {focusType}
            </span>
            <span className="text-[10px] text-muted-foreground">
              · Week {weekNumber}
            </span>
            {!isToday && (
              <span className="text-[10px] text-accent-gold ml-1">
                {format(selectedDate, 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCommand}
            className="h-7 gap-1.5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Command className="size-3" />
            <span className="hidden sm:inline">Jump</span>
            <kbd className="hidden md:inline-flex h-4 items-center px-1 rounded border border-border/50 bg-muted/50 text-[9px] font-mono tabular-nums">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            <Settings className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Focus accent line */}
      <div
        className={cn(
          'h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-40',
          focusConfig.color
        )}
      />
    </div>
  )
}

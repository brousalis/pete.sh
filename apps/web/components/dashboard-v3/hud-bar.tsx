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
    : `${getGreeting(time.getHours())}`

  return (
    <div className="bg-card/95 border-border relative border-b backdrop-blur">
      <div className="flex h-12 items-center gap-3 px-4">
        {/* Brand + time */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-md',
              focusConfig.bgStrong
            )}
          >
            <FocusIcon className={cn('size-3.5', focusConfig.color)} />
          </div>
          <span
            suppressHydrationWarning
            className="text-foreground text-sm leading-none font-bold tabular-nums"
          >
            {format(time, 'h:mm')}
            <span className="text-muted-foreground/60 ml-0.5 text-[10px]">
              {format(time, 'a')}
            </span>
          </span>
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <span className="text-muted-foreground/40 text-[11px]">·</span>
            <span
              suppressHydrationWarning
              className="text-muted-foreground truncate text-xs font-medium"
            >
              {greeting}
            </span>
          </div>
        </div>

        {/* Center: Focus identity */}
        <div className="flex flex-1 items-center justify-center">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1',
              focusConfig.bg,
              'border-transparent'
            )}
          >
            <span
              className={cn(
                'text-[10px] font-semibold tracking-wider uppercase',
                focusConfig.color
              )}
            >
              {focusType}
            </span>
            <span className="text-muted-foreground text-[10px]">
              · Week {weekNumber}
            </span>
            {!isToday && (
              <span className="text-accent-gold ml-1 text-[10px]">
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
            className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-[10px]"
          >
            <Command className="size-3" />
            <span className="hidden sm:inline">Jump</span>
            <kbd className="border-border/50 bg-muted/50 hidden h-4 items-center rounded border px-1 font-mono text-[9px] tabular-nums md:inline-flex">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-7"
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

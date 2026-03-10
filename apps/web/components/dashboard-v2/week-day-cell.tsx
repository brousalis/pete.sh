'use client'

import { getFocusConfig, getTempColor } from '@/lib/constants/fitness-colors'
import type { DayOfWeek, WeeklyRoutine } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import { motion } from 'framer-motion'

interface WeekDayCellProps {
  date: Date
  dayOfWeek: DayOfWeek
  isActive: boolean
  routine: WeeklyRoutine | null
  tempF: number | null
  onClick: () => void
}

export function WeekDayCell({
  date,
  dayOfWeek,
  isActive,
  routine,
  tempF,
  onClick,
}: WeekDayCellProps) {
  const schedule = routine?.schedule[dayOfWeek]
  const focus = schedule?.focus || 'Rest'
  const focusConfig = getFocusConfig(focus)
  const isRest = focus === 'Rest' || focus === 'Active Recovery'

  const weekNumber = (() => {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    )
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  })()

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const morningDone = dayData?.morningRoutine?.completed || false
  const workoutDone = dayData?.workout?.completed || false
  const nightDone = dayData?.nightRoutine?.completed || false
  const isPast = date < new Date() && !isSameDay(date, new Date())
  const isToday = isSameDay(date, new Date())

  const completionDots = isRest
    ? [morningDone, nightDone]
    : [morningDone, workoutDone, nightDone]

  const allDone = completionDots.every(Boolean) && completionDots.length > 0

  return (
    <motion.button
      onClick={onClick}
      whileHover={!isActive ? { backgroundColor: 'rgba(255,255,255,0.04)' } : undefined}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 py-3 px-1 transition-colors duration-150 min-w-0',
        isActive && 'bg-white/[0.07]',
        allDone && isPast && !isActive && 'bg-accent-sage/[0.03]',
      )}
    >
      {/* Active top accent line */}
      {isActive && (
        <motion.div
          className="absolute top-0 inset-x-0 h-[2px] bg-white/30"
          layoutId="activeDayBar"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      {/* Day abbreviation */}
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wider leading-none',
          isActive ? 'text-white/70' : 'text-white/35'
        )}
      >
        {format(date, 'EEE')}
      </span>

      {/* Date number */}
      <span
        className={cn(
          'text-[22px] font-semibold tabular-nums leading-none',
          isActive ? 'text-white' : isToday ? 'text-white/80' : 'text-white/50'
        )}
      >
        {format(date, 'd')}
      </span>

      {/* Focus badge */}
      <span
        className={cn(
          'text-[7px] font-bold px-1.5 py-[2px] rounded-sm leading-none uppercase tracking-wider',
          isActive
            ? cn(focusConfig.bgStrong, focusConfig.color)
            : cn(focusConfig.bg, focusConfig.color, 'opacity-75')
        )}
      >
        {focus === 'Core/Posture' ? 'Core' : focus === 'Active Recovery' ? 'Recov' : focus}
      </span>

      {/* Temp + dots */}
      <div className="flex items-center gap-1.5 mt-0.5">
        {tempF != null && (
          <span className={cn('text-[10px] font-medium leading-none', getTempColor(tempF))}>
            {tempF}°
          </span>
        )}
        <div className="flex gap-[3px]">
          {completionDots.map((done, i) => (
            <div
              key={i}
              className={cn(
                'size-[5px] rounded-full transition-colors',
                done
                  ? 'bg-accent-sage'
                  : isPast
                    ? 'bg-accent-rose/40'
                    : 'bg-white/10'
              )}
            />
          ))}
        </div>
      </div>
    </motion.button>
  )
}

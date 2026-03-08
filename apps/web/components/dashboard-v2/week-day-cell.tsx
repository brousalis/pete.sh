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
  const someDone = completionDots.some(Boolean)

  return (
    <motion.button
      onClick={onClick}
      whileHover={!isActive ? { scale: 1.03 } : undefined}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-1 transition-all duration-200 min-w-0',
        isActive
          ? 'bg-white/[0.06] shadow-lg shadow-white/[0.02]'
          : 'hover:bg-white/[0.03]',
        allDone && isPast && !isActive && 'bg-green-500/[0.04]',
        isToday && !isActive && 'bg-white/[0.03]'
      )}
      layout
    >
      {/* Active bottom accent */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-white/20"
          layoutId="activeDay"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {/* Day abbreviation */}
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wide leading-none',
          isActive ? 'text-white/60' : 'text-white/40'
        )}
      >
        {format(date, 'EEE')}
      </span>

      {/* Date number */}
      <span
        className={cn(
          'text-xl font-semibold tabular-nums leading-none',
          isActive ? 'text-white' : isToday ? 'text-white/80' : 'text-white/55'
        )}
      >
        {format(date, 'd')}
      </span>

      {/* Focus badge */}
      <span
        className={cn(
          'text-[8px] font-bold px-2 py-0.5 rounded-full leading-none uppercase tracking-wider',
          isActive
            ? cn(focusConfig.bgStrong, focusConfig.color)
            : cn(focusConfig.bg, focusConfig.color, 'opacity-80')
        )}
      >
        {focus === 'Core/Posture' ? 'Core' : focus === 'Active Recovery' ? 'Recov' : focus}
      </span>

      {/* Bottom row: temp + dots */}
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
                  ? 'bg-green-400'
                  : isPast
                    ? 'bg-red-400/50'
                    : 'bg-white/10'
              )}
            />
          ))}
        </div>
      </div>
    </motion.button>
  )
}

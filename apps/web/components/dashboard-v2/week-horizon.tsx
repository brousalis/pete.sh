'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { WeekDayCell } from '@/components/dashboard-v2/week-day-cell'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

const DAY_KEYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

export function WeekHorizon() {
  const { selectedDate, navigateToDay, routine, forecast } = useDashboardV2()

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const forecastByDay = useMemo(() => {
    const map = new Map<string, number>()
    if (!forecast?.properties.periods) return map
    for (const period of forecast.properties.periods) {
      if (!period.isDaytime) continue
      const dayKey = format(new Date(period.startTime), 'yyyy-MM-dd')
      if (!map.has(dayKey)) map.set(dayKey, period.temperature)
    }
    return map
  }, [forecast])

  const completedDays = useMemo(() => {
    if (!routine) return 0
    const weekNum = (() => {
      const soy = new Date(selectedDate.getFullYear(), 0, 1)
      const d = Math.floor((selectedDate.getTime() - soy.getTime()) / 86400000)
      return Math.ceil((d + soy.getDay() + 1) / 7)
    })()
    const week = routine.weeks.find(w => w.weekNumber === weekNum)
    if (!week) return 0
    let count = 0
    for (const d of DAY_KEYS) {
      const focus = routine.schedule[d]?.focus
      const isRest = focus === 'Rest' || focus === 'Active Recovery'
      const dayData = week.days[d]
      if (!dayData) continue
      const m = dayData.morningRoutine?.completed
      const n = dayData.nightRoutine?.completed
      const w = dayData.workout?.completed
      if (isRest ? m && n : m && w && n) count++
    }
    return count
  }, [routine, selectedDate])

  const momentumPct = (completedDays / 7) * 100

  return (
    <div className="border-b border-white/[0.04]">
      <div className="grid grid-cols-7 divide-x divide-white/[0.04]">
        {weekDays.map((date, i) => {
          const dayKey = DAY_KEYS[i]!
          const dateKey = format(date, 'yyyy-MM-dd')
          const tempF = forecastByDay.get(dateKey) ?? null
          return (
            <WeekDayCell
              key={dayKey}
              date={date}
              dayOfWeek={dayKey}
              isActive={isSameDay(date, selectedDate)}
              routine={routine}
              tempF={tempF}
              onClick={() => {
                const dir = date > selectedDate ? 'forward' : 'backward'
                navigateToDay(date, dir)
              }}
            />
          )
        })}
      </div>
      {completedDays > 0 && (
        <div className="px-3 pb-1.5">
          <div className="h-[2px] rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-500/60 to-green-400/40"
              initial={{ width: 0 }}
              animate={{ width: `${momentumPct}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

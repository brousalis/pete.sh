'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { Check, Moon, Sun } from 'lucide-react'
import { useCallback } from 'react'

export function QuickActions() {
  const {
    routine,
    dayOfWeek,
    weekNumber,
    completeRoutine,
    uncompleteRoutine,
  } = useDashboardV2()

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]
  const morningDone = dayData?.morningRoutine?.completed || false
  const morningAt = dayData?.morningRoutine?.completedAt
  const nightDone = dayData?.nightRoutine?.completed || false
  const nightAt = dayData?.nightRoutine?.completedAt

  const handleMorning = useCallback(() => {
    if (morningDone) uncompleteRoutine('morning')
    else completeRoutine('morning')
  }, [morningDone, completeRoutine, uncompleteRoutine])

  const handleNight = useCallback(() => {
    if (nightDone) uncompleteRoutine('night')
    else completeRoutine('night')
  }, [nightDone, completeRoutine, uncompleteRoutine])

  return (
    <div className="flex gap-2">
      <motion.button
        onClick={handleMorning}
        whileTap={{ scale: 0.96 }}
        className={cn(
          'flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all border',
          morningDone
            ? 'bg-green-500/[0.07] border-green-500/20 hover:bg-green-500/[0.12]'
            : 'bg-white/[0.02] border-white/[0.06] hover:bg-amber-500/[0.06] hover:border-amber-500/20'
        )}
      >
        <div
          className={cn(
            'size-8 rounded-lg flex items-center justify-center shrink-0',
            morningDone ? 'bg-green-500/20' : 'bg-amber-500/10'
          )}
        >
          {morningDone ? (
            <Check className="size-4 text-green-400" />
          ) : (
            <Sun className="size-4 text-amber-400" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <p className={cn('text-xs font-medium leading-tight truncate', morningDone ? 'text-green-400' : 'text-white/90')}>
            {routine?.dailyRoutines.morning.name || 'Morning'}
          </p>
          <p className="text-[10px] text-white/40">
            {morningDone && morningAt
              ? format(new Date(morningAt), 'h:mm a')
              : `${routine?.dailyRoutines.morning.duration || 5}m`}
          </p>
        </div>
      </motion.button>

      <motion.button
        onClick={handleNight}
        whileTap={{ scale: 0.96 }}
        className={cn(
          'flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all border',
          nightDone
            ? 'bg-green-500/[0.07] border-green-500/20 hover:bg-green-500/[0.12]'
            : 'bg-white/[0.02] border-white/[0.06] hover:bg-indigo-500/[0.06] hover:border-indigo-500/20'
        )}
      >
        <div
          className={cn(
            'size-8 rounded-lg flex items-center justify-center shrink-0',
            nightDone ? 'bg-green-500/20' : 'bg-indigo-500/10'
          )}
        >
          {nightDone ? (
            <Check className="size-4 text-green-400" />
          ) : (
            <Moon className="size-4 text-indigo-400" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <p className={cn('text-xs font-medium leading-tight truncate', nightDone ? 'text-green-400' : 'text-white/90')}>
            {routine?.dailyRoutines.night.name || 'Night'}
          </p>
          <p className="text-[10px] text-white/40">
            {nightDone && nightAt
              ? format(new Date(nightAt), 'h:mm a')
              : `${routine?.dailyRoutines.night.duration || 9}m`}
          </p>
        </div>
      </motion.button>
    </div>
  )
}

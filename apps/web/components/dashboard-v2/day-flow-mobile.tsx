'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import { cn } from '@/lib/utils'
import { Check, Dumbbell, Moon, Sun, UtensilsCrossed } from 'lucide-react'
import { useMemo } from 'react'

export function DayFlowMobile() {
  const {
    routine,
    mealPlan,
    recipes,
    dayOfWeek,
    weekNumber,
    focusType,
    isRestDay,
  } = useDashboardV2()

  const focusConfig = getFocusConfig(focusType)
  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const morningDone = dayData?.morningRoutine?.completed || false
  const workoutDone = dayData?.workout?.completed || false
  const nightDone = dayData?.nightRoutine?.completed || false

  const dinnerName = useMemo(() => {
    const dinnerId = mealPlan?.meals[dayOfWeek]?.dinner
    if (!dinnerId) return null
    return recipes.find(r => r.id === dinnerId)?.name ?? null
  }, [mealPlan, dayOfWeek, recipes])

  const pills = [
    {
      label: 'AM',
      done: morningDone,
      icon: Sun,
      color: 'text-amber-500',
      bg: morningDone ? 'bg-green-500/15' : 'bg-amber-500/10',
    },
    {
      label: isRestDay ? 'Rest' : focusType.slice(0, 5),
      done: workoutDone,
      icon: Dumbbell,
      color: focusConfig.color,
      bg: workoutDone ? 'bg-green-500/15' : focusConfig.bg,
    },
    {
      label: dinnerName ? dinnerName.slice(0, 8) : 'Dinner',
      done: false,
      icon: UtensilsCrossed,
      color: 'text-green-600',
      bg: 'bg-green-600/10',
    },
    {
      label: 'PM',
      done: nightDone,
      icon: Moon,
      color: 'text-indigo-500',
      bg: nightDone ? 'bg-green-500/15' : 'bg-indigo-500/10',
    },
  ]

  return (
    <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide md:hidden">
      {pills.map(pill => {
        const Icon = pill.icon
        return (
          <div
            key={pill.label}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium shrink-0',
              pill.bg,
              pill.done ? 'text-green-500' : pill.color
            )}
          >
            {pill.done ? (
              <Check className="size-3" />
            ) : (
              <Icon className="size-3" />
            )}
            {pill.label}
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCooking } from '@/hooks/use-cooking-data'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronUp,
  Coffee,
  Plus,
  ShoppingCart,
  Sunrise,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

type MealType = 'breakfast' | 'lunch' | 'dinner'

const DAY_KEYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const MEAL_META: Record<
  MealType,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  breakfast: {
    label: 'Breakfast',
    icon: Sunrise,
    color: 'text-accent-ember',
    bg: 'bg-accent-ember/10',
  },
  lunch: {
    label: 'Lunch',
    icon: Coffee,
    color: 'text-accent-sage',
    bg: 'bg-accent-sage/10',
  },
  dinner: {
    label: 'Dinner',
    icon: UtensilsCrossed,
    color: 'text-accent-azure',
    bg: 'bg-accent-azure/10',
  },
}

function MealPill({
  meal,
  dayOfWeek,
  onClick,
}: {
  meal: MealType
  dayOfWeek: DayOfWeek
  onClick?: () => void
}) {
  const { mealPlan: dashboardMealPlan, recipes, setActiveItem } =
    useDashboardV3()
  const cooking = useCooking()
  const mealPlan = cooking.mealPlan ?? dashboardMealPlan
  const dayMeals = mealPlan?.meals[dayOfWeek]
  const id = dayMeals?.[meal]
  const recipe =
    typeof id === 'string' ? recipes.find(r => r.id === id) : null
  const completion = recipe ? cooking.isSlotCompleted(dayOfWeek, meal) : null
  const meta = MEAL_META[meal]
  const Icon = meta.icon
  const imageUrl = resolveRecipeImageUrl(recipe?.image_url)

  return (
    <button
      type="button"
      onClick={() => {
        setActiveItem(meal)
        onClick?.()
      }}
      className={cn(
        'group flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-all',
        'border-border/50 hover:border-border hover:bg-muted/30',
        completion && 'bg-accent-sage/5 border-accent-sage/30'
      )}
    >
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt=""
          className="size-5 rounded-[4px] object-cover shrink-0"
        />
      ) : (
        <div
          className={cn(
            'size-5 rounded-[4px] flex items-center justify-center shrink-0',
            meta.bg
          )}
        >
          {completion ? (
            <Check className="size-2.5 text-accent-sage" />
          ) : (
            <Icon className={cn('size-2.5', meta.color)} />
          )}
        </div>
      )}
      <div className="flex flex-col items-start min-w-0">
        <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 leading-none">
          {meta.label}
        </span>
        <span
          className={cn(
            'text-[11px] font-medium truncate max-w-[140px] leading-tight',
            completion && 'text-accent-sage line-through'
          )}
        >
          {recipe?.name ?? 'Not planned'}
        </span>
      </div>
    </button>
  )
}

function DayRow({ date }: { date: Date }) {
  const { navigateToDay, selectedDate } = useDashboardV3()
  const dayKey = DAY_KEYS[(date.getDay() + 6) % 7]!
  const isActive = isSameDay(date, selectedDate)
  const isToday = isSameDay(date, new Date())

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 border-b border-border/30 last:border-0',
        isActive && 'bg-muted/40'
      )}
    >
      <button
        type="button"
        onClick={() => {
          const dir = date > selectedDate ? 'forward' : 'backward'
          navigateToDay(date, dir)
        }}
        className={cn(
          'flex items-center gap-1 shrink-0 w-16 text-left',
          'hover:text-foreground'
        )}
      >
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {format(date, 'EEE')}
        </span>
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            isActive
              ? 'text-foreground'
              : isToday
                ? 'text-accent-sage'
                : 'text-foreground/70'
          )}
        >
          {format(date, 'd')}
        </span>
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <MealPill meal="breakfast" dayOfWeek={dayKey} />
        <MealPill meal="lunch" dayOfWeek={dayKey} />
        <MealPill meal="dinner" dayOfWeek={dayKey} />
      </div>
    </div>
  )
}

export function MealStrip() {
  const {
    dayOfWeek,
    selectedDate,
    mealPlan: dashboardMealPlan,
    recipes,
  } = useDashboardV3()
  const cooking = useCooking()
  const mealPlan = cooking.mealPlan ?? dashboardMealPlan
  const [expanded, setExpanded] = useState(false)

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const dayMeals = mealPlan?.meals[dayOfWeek]
  const plannedCount = (['breakfast', 'lunch', 'dinner'] as const).filter(
    m => typeof dayMeals?.[m] === 'string'
  ).length

  return (
    <div className="border-t border-border bg-card/90 backdrop-blur shrink-0">
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-b border-border/40"
          >
            <div className="max-h-[50vh] overflow-y-auto">
              {weekDays.map(d => (
                <DayRow key={d.toISOString()} date={d} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Meals
          </span>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            {plannedCount}/3
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronUp className="size-3 text-muted-foreground" />
          </motion.div>
        </button>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <MealPill meal="breakfast" dayOfWeek={dayOfWeek} />
          <MealPill meal="lunch" dayOfWeek={dayOfWeek} />
          <MealPill meal="dinner" dayOfWeek={dayOfWeek} />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/cooking"
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
            >
              <Plus className="size-3.5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">Plan meals</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/cooking"
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0 relative"
            >
              <ShoppingCart className="size-3.5" />
              {cooking.shoppingList?.items &&
                cooking.shoppingList.items.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-accent-gold text-[8px] font-bold text-white flex items-center justify-center tabular-nums">
                    {cooking.shoppingList.items.length}
                  </span>
                )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">Shopping list</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

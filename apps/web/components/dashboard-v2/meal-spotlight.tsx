'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { Button } from '@/components/ui/button'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { ChevronRight, Clock, Flame, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function MealSpotlight() {
  const { mealPlan, recipes, dayOfWeek, focusType } = useDashboardV2()

  const dayMeals = mealPlan?.meals[dayOfWeek]

  const getRecipe = (id: string | undefined) =>
    id ? recipes.find(r => r.id === id) ?? null : null

  const dinner = getRecipe(dayMeals?.dinner)
  const breakfast = getRecipe(dayMeals?.breakfast)
  const lunch = getRecipe(dayMeals?.lunch)
  const dinnerImage = resolveRecipeImageUrl(dinner?.image_url)

  const isStrengthDay = focusType === 'Strength' || focusType === 'HIIT'
  const isEnduranceDay = focusType === 'Endurance'

  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const dinnerTime = new Date()
      dinnerTime.setHours(18, 0, 0, 0)
      const diff = dinnerTime.getTime() - now.getTime()
      if (diff <= 0 || diff > 3 * 60 * 60 * 1000) {
        setCountdown('')
        return
      }
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setCountdown(h > 0 ? `in ${h}h ${m}m` : `in ${m}m`)
    }
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [])

  const cookTime = dinner ? (dinner.prep_time || 0) + (dinner.cook_time || 0) : 0

  if (!dayMeals?.dinner && !dayMeals?.breakfast && !dayMeals?.lunch) {
    return (
      <div className="rounded-xl p-5 text-center border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
        <UtensilsCrossed className="size-7 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No meals planned</p>
        <Link href="/cooking">
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs text-accent-ember hover:text-accent-ember/80 hover:bg-accent-ember/10"
          >
            Plan dinner
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden group border border-border shadow-sm ring-1 ring-border/40 ring-inset">
      {/* Breakfast/lunch compact rows */}
      {(breakfast || lunch) && (
        <div className="px-4 pt-3 pb-1 space-y-1 bg-card">
          {breakfast && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 w-10">Bfast</span>
              <span className="text-[11px] text-muted-foreground truncate">{breakfast.name}</span>
            </div>
          )}
          {lunch && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 w-10">Lunch</span>
              <span className="text-[11px] text-muted-foreground truncate">{lunch.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Dinner image */}
      {dinnerImage ? (
        <div className="relative h-28 overflow-hidden">
          <img
            src={dinnerImage}
            alt={dinner?.name || ''}
            className="w-full h-full object-cover brightness-[0.7] group-hover:brightness-[0.8] group-hover:scale-105 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      ) : (
        <div className="h-14 bg-gradient-to-br from-accent-ember/[0.06] to-accent-sage/[0.04]" />
      )}

      {/* Content */}
      <div className={cn('px-4 pb-3', dinnerImage ? '-mt-10 relative z-10 pt-0' : 'pt-3')}>
        <p className="text-sm font-semibold text-white">{dinner?.name || 'Dinner'}</p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-white/50">
          {cookTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {cookTime}m
            </span>
          )}
          {dinner?.calories_per_serving && (
            <span className="flex items-center gap-1">
              <Flame className="size-3" />
              {dinner.calories_per_serving} cal
            </span>
          )}
          {dinner?.protein_g && isStrengthDay && (
            <span className="text-accent-sage/80 bg-accent-sage/10 px-1.5 py-px rounded text-[10px]">
              {dinner.protein_g}g protein
            </span>
          )}
          {dinner?.carbs_g && isEnduranceDay && (
            <span className="text-accent-gold/80 bg-accent-gold/10 px-1.5 py-px rounded text-[10px]">
              {dinner.carbs_g}g carbs
            </span>
          )}
        </div>

        {countdown && (
          <p className="text-[10px] text-accent-sage/60 mt-1.5">
            Dinner {countdown}
          </p>
        )}

        <Link
          href="/cooking"
          className="flex items-center gap-0.5 text-xs font-medium text-white/70 hover:text-white mt-2 transition-colors"
        >
          Start Cooking
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}

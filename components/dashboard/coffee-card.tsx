'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { Button } from '@/components/ui/button'
import { CoffeeService } from '@/lib/services/coffee.service'
import type { CoffeeRecipe } from '@/lib/types/coffee.types'
import { ArrowRight, Coffee, Droplets, Flame, Scale } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const coffeeService = new CoffeeService()

export function CoffeeCard() {
  const [recipe, setRecipe] = useState<CoffeeRecipe | null>(null)
  const [timeLabel, setTimeLabel] = useState('')

  useEffect(() => {
    const recommended = coffeeService.getRecommendedRecipe()
    const recipeData = coffeeService.getRecipe(
      recommended.method,
      recommended.cupSize,
      recommended.roast
    )
    if (recipeData) {
      setRecipe(recipeData)
    }

    // Set time-based label
    const hour = new Date().getHours()
    const day = new Date().getDay()
    if (day === 0 && hour >= 8 && hour < 14) {
      setTimeLabel('Sunday Brunch')
    } else if (hour >= 5 && hour < 12) {
      setTimeLabel('Morning Batch')
    } else if (hour >= 12 && hour < 18) {
      setTimeLabel('Afternoon Cup')
    } else {
      setTimeLabel('Evening')
    }
  }, [])

  // Quick doses for display
  const quickDoses = [
    { label: '1c', grams: 18.8, method: 'switch' },
    { label: '2c', grams: 37.5, method: 'switch' },
    { label: '8c', grams: 59, method: 'mocca' },
    { label: '10c', grams: 73.5, method: 'mocca' },
  ]

  if (!recipe) {
    return (
      <div className="text-muted-foreground flex items-center gap-2">
        <Coffee className="size-5 animate-pulse" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  const MethodIcon = recipe.method === 'switch' ? Droplets : Coffee

  return (
    <div className="space-y-4">
      <DashboardCardHeader
        icon={<Coffee className="size-5 text-amber-600 dark:text-amber-400" />}
        iconContainerClassName="bg-amber-500/10"
        title="Coffee Guide"
        viewHref="/coffee"
        viewLabel="View"
      />
      <p className="text-muted-foreground -mt-2 text-xs">
        {timeLabel} recommendation
      </p>

      {/* Recommended Recipe - Hero Display */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-4 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MethodIcon className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium">
              {recipe.method === 'switch' ? 'Hario Switch' : 'Moccamaster'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="size-3 text-amber-600" />
            <span className="text-muted-foreground text-xs capitalize">
              {recipe.roast}
            </span>
          </div>
        </div>

        {/* Big Dose Number */}
        <div className="mb-2 flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <Scale className="size-5 text-amber-600" />
            <span className="text-3xl font-bold tabular-nums">
              {recipe.coffee}g
            </span>
          </div>
          <span className="text-muted-foreground text-sm">
            : {recipe.waterMl}g water
          </span>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="text-foreground font-medium">
            {recipe.cupSizeLabel}
          </span>
          <span>•</span>
          <span>{recipe.ratio}</span>
          <span>•</span>
          <span>{recipe.temp}</span>
        </div>
      </div>

      {/* Quick Dose Reference */}
      <div>
        <div className="text-muted-foreground mb-2 text-[10px] font-medium tracking-wide uppercase">
          Quick Doses
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {quickDoses.map((dose, idx) => (
            <div
              key={idx}
              className="bg-muted/30 rounded-lg border px-2 py-1.5 text-center"
            >
              <div className="font-mono text-sm font-bold">{dose.grams}g</div>
              <div className="text-muted-foreground text-[10px]">
                {dose.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link href="/coffee">
        <Button
          size="sm"
          className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700"
        >
          <Coffee className="size-4" />
          Open Full Guide
          <ArrowRight className="size-3.5" />
        </Button>
      </Link>
    </div>
  )
}

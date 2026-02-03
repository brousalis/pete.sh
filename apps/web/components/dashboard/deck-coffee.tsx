'use client'

import { CoffeeService } from '@/lib/services/coffee.service'
import type { CoffeeRecipe } from '@/lib/types/coffee.types'
import { Coffee, Droplets, Scale } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const coffeeService = new CoffeeService()

export function DeckCoffee() {
  const [recipe, setRecipe] = useState<CoffeeRecipe | null>(null)
  const [timeLabel, setTimeLabel] = useState('')

  useEffect(() => {
    const recommended = coffeeService.getRecommendedRecipe()
    const recipeData = coffeeService.getRecipe(recommended.method, recommended.cupSize, recommended.roast)
    if (recipeData) {
      setRecipe(recipeData)
    }

    // Set time-based label
    const hour = new Date().getHours()
    const day = new Date().getDay()
    if (day === 0 && hour >= 8 && hour < 14) {
      setTimeLabel('Brunch')
    } else if (hour >= 5 && hour < 12) {
      setTimeLabel('Morning')
    } else if (hour >= 12 && hour < 18) {
      setTimeLabel('Afternoon')
    } else {
      setTimeLabel('Evening')
    }
  }, [])

  // Quick doses for the deck - most common
  const quickDoses = [
    { label: '1c', grams: 18.8 },
    { label: '2c', grams: 37.5 },
    { label: '8c', grams: 59 },
    { label: '10c', grams: 73.5 },
  ]

  const MethodIcon = recipe?.method === 'switch' ? Droplets : Coffee

  return (
    <Link href="/coffee" className="block h-full">
      <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg transition-all hover:shadow-xl active:scale-[0.98]">
        {/* Header */}
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="rounded-lg bg-amber-500/20 p-1.5">
              <Coffee className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Coffee</div>
              <div className="text-xs text-muted-foreground">{timeLabel}</div>
            </div>
          </div>
          {recipe && (
            <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
              <MethodIcon className="size-3 text-amber-600" />
              <span className="text-[10px] font-medium text-amber-600 capitalize">{recipe.roast}</span>
            </div>
          )}
        </div>

        {/* Recommended Dose - Hero */}
        {recipe && (
          <div className="mb-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Scale className="size-4 text-amber-600" />
              <span className="text-2xl font-bold tabular-nums">{recipe.coffee}g</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {recipe.cupSizeLabel} • {recipe.ratio}
            </div>
          </div>
        )}

        {/* Quick Doses Grid */}
        <div className="grid flex-1 grid-cols-4 gap-1">
          {quickDoses.map((dose, idx) => (
            <div
              key={idx}
              className="flex min-h-[36px] flex-col items-center justify-center rounded-lg border border-border bg-background/50 p-1"
            >
              <span className="font-mono text-xs font-bold">{dose.grams}g</span>
              <span className="text-[9px] text-muted-foreground">{dose.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

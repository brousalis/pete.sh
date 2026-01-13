'use client'

import { Button } from '@/components/ui/button'
import { CoffeeService } from '@/lib/services/coffee.service'
import type { CoffeeRoutine } from '@/lib/types/coffee.types'
import {
  ArrowRight,
  Coffee,
  Droplets,
  Scale,
  Thermometer,
  Timer,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const coffeeService = new CoffeeService()

export function CoffeeCard() {
  const [routine, setRoutine] = useState<CoffeeRoutine | null>(null)

  useEffect(() => {
    const recommendedType = coffeeService.getRecommendedRoutine()
    if (recommendedType) {
      const recommended = coffeeService.getRoutineByType(recommendedType)
      if (recommended) {
        setRoutine(recommended)
        return
      }
    }
    // Fallback: if no recommendation, use morning routine as default
    const defaultRoutine = coffeeService.getRoutineByType('morning')
    if (defaultRoutine) {
      setRoutine(defaultRoutine)
    }
  }, [])

  if (!routine) {
    return (
      <div className="text-muted-foreground flex items-center gap-2">
        <Coffee className="size-5 animate-pulse" />
        <span className="text-sm">Loading coffee routine...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top: Title + Description + Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Title + Description */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Coffee className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-foreground leading-tight font-semibold">
                {routine.name}
              </h3>
              {/* <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                Recommended
              </span> */}
            </div>
            {/* <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {routine.description}
            </p> */}
          </div>
        </div>

        {/* Right: Quick Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm sm:gap-x-6">
          <div className="flex items-center gap-1.5">
            <Scale className="size-4 text-amber-600" />
            <span className="font-semibold">{routine.coffee}g</span>
            <span className="text-muted-foreground">coffee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="size-4 text-blue-400" />
            <span className="font-semibold">{routine.water}g</span>
            <span className="text-muted-foreground">water</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="size-4 text-slate-400" />
            <span className="font-semibold">
              {routine.grinder === 'ode' ? 'Ode' : 'S3'} @{' '}
              {routine.grinderSetting}
            </span>
          </div>
          {routine.waterTemp && (
            <div className="flex items-center gap-1.5">
              <Thermometer className="size-4 text-red-400" />
              <span className="font-semibold">{routine.waterTemp}°F</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: CTA */}
      <Link href="/coffee" className="w-full sm:w-auto">
        <Button
          size="sm"
          className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
        >
          <Coffee className="size-4" />
          Start Brewing
          <ArrowRight className="size-3.5" />
        </Button>
      </Link>
    </div>
  )
}

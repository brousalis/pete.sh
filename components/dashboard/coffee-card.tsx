'use client'

import { useState, useEffect } from 'react'
import { Coffee, ArrowRight, Scale, Droplets, Timer, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CoffeeService } from '@/lib/services/coffee.service'
import type { CoffeeRoutine } from '@/lib/types/coffee.types'

const coffeeService = new CoffeeService()

export function CoffeeCard() {
  const [routine, setRoutine] = useState<CoffeeRoutine | null>(null)

  useEffect(() => {
    const recommendedType = coffeeService.getRecommendedRoutine()
    if (recommendedType) {
      const recommended = coffeeService.getRoutineByType(recommendedType)
      if (recommended) {
        setRoutine(recommended)
      }
    }
  }, [])

  if (!routine) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Coffee className="size-5" />
          <span className="text-sm">Loading coffee routine...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className="size-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Coffee</h3>
        </div>
        <Link href="/coffee">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            Brew Guide
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* Recommended Routine */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{routine.name}</h4>
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-[10px]">
                Recommended
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{routine.description}</p>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2">
            <Scale className="size-4 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Coffee</p>
              <p className="text-sm font-semibold">{routine.coffee}g</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2">
            <Droplets className="size-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Water</p>
              <p className="text-sm font-semibold">{routine.water}g</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2">
            <Timer className="size-4 text-slate-500" />
            <div>
              <p className="text-xs text-muted-foreground">Grinder</p>
              <p className="text-sm font-semibold">
                {routine.grinder === 'ode' ? 'Ode' : 'S3'} @ {routine.grinderSetting}
              </p>
            </div>
          </div>
          {routine.waterTemp && (
            <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2">
              <Thermometer className="size-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Temp</p>
                <p className="text-sm font-semibold">{routine.waterTemp}°F</p>
              </div>
            </div>
          )}
        </div>

        {/* Batch Info */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Makes <span className="font-medium text-foreground">{routine.batchSize}</span>
          </p>
          <Link href="/coffee">
            <Button
              size="sm"
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Coffee className="size-4" />
              Start Brewing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

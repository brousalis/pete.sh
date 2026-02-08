'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiGet } from '@/lib/api/client'
import { CoffeeService } from '@/lib/services/coffee.service'
import type {
  BrewMethod,
  CoffeeConfig,
  CoffeeRecipe,
  CupSize,
  GoldenRule,
  RoastLevel,
  RoastStrategy,
} from '@/lib/types/coffee.types'
import {
  BookOpen,
  Coffee,
  Droplets,
  Flame,
  Scale,
  Settings,
  Thermometer,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CoffeeStopwatch } from './coffee-stopwatch'

// Fallback service for when database is unavailable
const fallbackService = new CoffeeService()

const roastColors: Record<RoastLevel, string> = {
  light: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  medium:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  dark: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
}

// Cup size options by method
const CUP_SIZES: Record<BrewMethod, { value: CupSize; label: string }[]> = {
  switch: [
    { value: '1-cup', label: '1c 300' },
    { value: '2-cup', label: '2c 600' },
    { value: '3-4-cup', label: '3-4c 1L' },
  ],
  moccamaster: [
    { value: '2-cup', label: '2c 600' },
    { value: '8-cup', label: '8c 1L' },
    { value: '10-cup', label: '10c 1.25L' },
  ],
}

export function CoffeeGuide() {
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<CoffeeConfig | null>(null)

  // Selection state
  const [method, setMethod] = useState<BrewMethod>('moccamaster')
  const [cupSize, setCupSize] = useState<CupSize>('8-cup')
  const [roast, setRoast] = useState<RoastLevel>('medium')
  const [selectedRecipe, setSelectedRecipe] = useState<CoffeeRecipe | null>(
    null
  )

  // Derived data from config or fallback
  const roastStrategies =
    config?.roastStrategies || fallbackService.getRoastStrategies()
  const goldenRules = config?.goldenRules || fallbackService.getGoldenRules()
  const switchDoses =
    config?.quickDoses.filter(d => d.method === 'switch') ||
    fallbackService.getSwitchDoses()
  const moccaDoses =
    config?.quickDoses.filter(d => d.method === 'moccamaster') ||
    fallbackService.getMoccamasterDoses()
  const cupSizes = CUP_SIZES[method]

  // Load config from API
  const loadConfig = useCallback(async () => {
    try {
      const response = await apiGet<CoffeeConfig>('/api/coffee/config')
      if (response.success && response.data) {
        setConfig(response.data)

        // Set initial recommendation based on time
        const hour = new Date().getHours()
        const day = new Date().getDay()
        const recommendations = response.data.recommendations
          .filter(r => r.isActive !== false)
          .sort((a, b) => (b.priority || 0) - (a.priority || 0))

        // Find matching recommendation
        let matched = recommendations.find(r => {
          const dayMatch = r.dayOfWeek === null || r.dayOfWeek === day
          const hourMatch = hour >= r.hourStart && hour < r.hourEnd
          return dayMatch && hourMatch
        })

        // Fall back to lowest priority (default)
        if (!matched && recommendations.length > 0) {
          matched = recommendations[recommendations.length - 1]
        }

        if (matched) {
          setMethod(matched.method)
          setCupSize(matched.cupSize)
          setRoast(matched.roast)
        }
      }
    } catch (error) {
      console.error('Failed to load coffee config, using fallback:', error)
      // Use fallback service defaults
      const fallbackRec = fallbackService.getRecommendedRecipe()
      setMethod(fallbackRec.method)
      setCupSize(fallbackRec.cupSize)
      setRoast(fallbackRec.roast)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Update cup size when method changes (new method may not support current size)
  useEffect(() => {
    const sizes = CUP_SIZES[method]
    if (!sizes.find(s => s.value === cupSize) && sizes[0]) {
      setCupSize(sizes[0].value)
    }
  }, [method, cupSize])

  // Update selected recipe when selections change
  useEffect(() => {
    if (config?.recipes) {
      const recipe = config.recipes.find(
        r => r.method === method && r.cupSize === cupSize && r.roast === roast
      )
      setSelectedRecipe(recipe || null)
    } else {
      // Use fallback
      const recipe = fallbackService.getRecipe(method, cupSize, roast)
      setSelectedRecipe(recipe)
    }
  }, [config, method, cupSize, roast])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15">
            <Coffee className="size-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Brew Timer</h1>
            {selectedRecipe && (
              <p className="text-xs text-muted-foreground">
                {selectedRecipe.cupSizeLabel} • {selectedRecipe.ratio}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/coffee/config"
          className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          title="Configure"
        >
          <Settings className="size-4" />
        </Link>
      </div>

      {/* Timer */}
      <CoffeeStopwatch timingCues={selectedRecipe?.timingCues || []} />

      {/* Recipe Selector */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Droplets className="size-4 text-amber-500" />
          Recipe
        </h2>

        {/* Method Toggle */}
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant={method === 'moccamaster' ? 'default' : 'outline'}
            onClick={() => setMethod('moccamaster')}
            className={`h-9 flex-1 gap-1.5 text-xs font-medium ${
              method === 'moccamaster' 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'hover:border-amber-500/50 hover:bg-amber-500/5'
            }`}
          >
            <Coffee className={`size-3.5 ${method === 'moccamaster' ? '' : 'text-amber-600'}`} />
            Moccamaster
          </Button>
          <Button
            type="button"
            variant={method === 'switch' ? 'default' : 'outline'}
            onClick={() => setMethod('switch')}
            className={`h-9 flex-1 gap-1.5 text-xs font-medium ${
              method === 'switch' 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'hover:border-amber-500/50 hover:bg-amber-500/5'
            }`}
          >
            <Droplets className={`size-3.5 ${method === 'switch' ? '' : 'text-amber-600'}`} />
            Hario Switch
          </Button>
        </div>

        {/* Size + Roast */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Cup Size */}
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium uppercase">
              Size
            </div>
            <div className="flex gap-1">
              {cupSizes.map(size => (
                <Button
                  key={size.value}
                  type="button"
                  variant={cupSize === size.value ? 'default' : 'outline'}
                  onClick={() => setCupSize(size.value)}
                  className={`h-7 px-2 text-[11px] font-medium ${
                    cupSize === size.value 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'hover:border-amber-500/50 hover:bg-amber-500/5'
                  }`}
                  size="sm"
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Roast Level */}
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium uppercase">
              Roast
            </div>
            <div className="flex gap-1">
              {(['light', 'medium', 'dark'] as RoastLevel[]).map(r => (
                <Button
                  key={r}
                  type="button"
                  variant={roast === r ? 'default' : 'outline'}
                  onClick={() => setRoast(r)}
                  className={`h-7 w-7 p-0 text-[11px] font-medium ${
                    roast === r 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'hover:border-amber-500/50 hover:bg-amber-500/5'
                  }`}
                  size="sm"
                >
                  {r.charAt(0).toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Recipe Details */}
        {selectedRecipe && (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-3 dark:from-amber-950/30 dark:to-orange-950/20">
            {/* Key Numbers Row */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Scale className="size-3 text-amber-600" />
                  <span className="text-sm font-bold tabular-nums">
                    {selectedRecipe.coffee}g
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">:</span>
                <div className="flex items-center gap-1">
                  <Droplets className="size-3 text-blue-500" />
                  <span className="text-sm font-bold tabular-nums">
                    {selectedRecipe.waterMl}g
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer className="size-3 text-red-500" />
                  <span className="text-sm font-bold tabular-nums">
                    {selectedRecipe.temp}
                  </span>
                </div>
              </div>
              <Badge
                className={`px-1.5 py-0 text-[10px] ${roastColors[selectedRecipe.roast]}`}
              >
                {selectedRecipe.roast}
              </Badge>
            </div>

            {/* Technique */}
            <div className="flex items-start gap-1.5">
              <Zap className="mt-0.5 size-3 shrink-0 text-amber-600" />
              <p className="text-muted-foreground text-[11px] leading-snug">
                {selectedRecipe.technique}
              </p>
            </div>

            {/* Method-specific settings */}
            {(selectedRecipe.switchSetting ||
              selectedRecipe.moccaSetting) && (
              <div className="mt-2 border-t border-amber-500/20 pt-2 text-[11px]">
                {selectedRecipe.switchSetting && (
                  <span>
                    <span className="font-medium">Switch:</span>{' '}
                    <span className="text-muted-foreground capitalize">
                      {selectedRecipe.switchSetting}
                    </span>
                  </span>
                )}
                {selectedRecipe.moccaSetting && (
                  <span>
                    <span className="font-medium">Setting:</span>{' '}
                    <span className="text-muted-foreground">
                      {selectedRecipe.moccaSetting === 'half'
                        ? 'Half Jug'
                        : 'Full Jug'}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {!selectedRecipe && (
          <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
            No recipe found for this combination.
            <br />
            <Link
              href="/coffee/config"
              className="mt-1 inline-block text-amber-600 hover:underline"
            >
              Add one in config
            </Link>
          </div>
        )}
      </div>

      {/* Reference Section */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4 text-amber-500" />
          Reference
        </h2>

        <Tabs defaultValue="doses" className="w-full">
          <TabsList className="bg-muted grid h-auto w-full grid-cols-3 gap-1 rounded-lg p-1">
            <TabsTrigger
              value="doses"
              className="data-[state=active]:bg-background rounded-md px-2 py-1.5 text-xs font-medium"
            >
              <Scale className="mr-1 size-3" />
              Doses
            </TabsTrigger>
            <TabsTrigger
              value="roasts"
              className="data-[state=active]:bg-background rounded-md px-2 py-1.5 text-xs font-medium"
            >
              <Flame className="mr-1 size-3" />
              Roasts
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="data-[state=active]:bg-background rounded-md px-2 py-1.5 text-xs font-medium"
            >
              <Zap className="mr-1 size-3" />
              Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="doses" className="mt-2 space-y-3">
            {/* Switch Doses */}
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] font-medium uppercase">
                <Droplets className="size-2.5" />
                Hario Switch
              </div>
              <div className="grid grid-cols-2 gap-1">
                {switchDoses.map((dose, idx) => (
                  <div
                    key={dose.id || idx}
                    className="bg-muted/40 flex items-center justify-between rounded-md px-2 py-1.5"
                  >
                    <span className="text-muted-foreground text-[11px]">
                      {dose.label
                        .replace(' (Standard)', '')
                        .replace(' (Dark)', ' D')}
                    </span>
                    <span className="font-mono text-xs font-bold tabular-nums">
                      {dose.grams}g
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Moccamaster Doses */}
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] font-medium uppercase">
                <Coffee className="size-2.5" />
                Moccamaster
              </div>
              <div className="grid grid-cols-2 gap-1">
                {moccaDoses.map((dose, idx) => (
                  <div
                    key={dose.id || idx}
                    className="bg-muted/40 flex items-center justify-between rounded-md px-2 py-1.5"
                  >
                    <span className="text-muted-foreground text-[11px]">
                      {dose.label
                        .replace(' (Standard)', '')
                        .replace(' (Dark)', ' D')}
                    </span>
                    <span className="font-mono text-xs font-bold tabular-nums">
                      {dose.grams}g
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roasts" className="mt-2 space-y-1.5">
            {roastStrategies.map((strategy: RoastStrategy) => (
              <div
                key={strategy.id || strategy.roast}
                className={`rounded-lg p-2 ${roastColors[strategy.roast]}`}
              >
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-xs font-semibold capitalize">
                    {strategy.roast}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {strategy.ratio}
                  </span>
                </div>
                <div className="space-y-0.5 text-[11px] opacity-90">
                  <div className="flex items-center gap-1">
                    <Flame className="size-2.5" />
                    <span>{strategy.goal}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Thermometer className="size-2.5" />
                    <span>{strategy.temp}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] opacity-80">
                    {strategy.technique}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="rules" className="mt-2 space-y-1.5">
            {goldenRules.map((rule: GoldenRule, idx: number) => (
              <div
                key={rule.id || idx}
                className="bg-muted/40 rounded-lg p-2"
              >
                <div className="mb-0.5 text-[11px] font-semibold">
                  {rule.title}
                </div>
                <p className="text-muted-foreground text-[10px] leading-snug">
                  {rule.description}
                </p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

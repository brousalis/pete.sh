'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CoffeeService } from '@/lib/services/coffee.service'
import type { BrewMethod, CoffeeRecipe, CupSize, RoastLevel } from '@/lib/types/coffee.types'
import {
  BookOpen,
  Coffee,
  Droplets,
  Flame,
  Scale,
  Thermometer,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { CoffeeStopwatch } from './coffee-stopwatch'

const coffeeService = new CoffeeService()

const roastColors: Record<RoastLevel, string> = {
  light: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  dark: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
}

export function CoffeeGuide() {
  const [method, setMethod] = useState<BrewMethod>('moccamaster')
  const [cupSize, setCupSize] = useState<CupSize>('8-cup')
  const [roast, setRoast] = useState<RoastLevel>('medium')
  const [selectedRecipe, setSelectedRecipe] = useState<CoffeeRecipe | null>(null)

  const cupSizes = coffeeService.getCupSizes(method)
  const roastStrategies = coffeeService.getRoastStrategies()
  const goldenRules = coffeeService.getGoldenRules()
  const switchDoses = coffeeService.getSwitchDoses()
  const moccaDoses = coffeeService.getMoccamasterDoses()

  // Update cup size when method changes
  useEffect(() => {
    const sizes = coffeeService.getCupSizes(method)
    if (!sizes.find((s) => s.value === cupSize) && sizes[0]) {
      setCupSize(sizes[0].value)
    }
  }, [method, cupSize])

  // Update selected recipe when selections change
  useEffect(() => {
    const recipe = coffeeService.getRecipe(method, cupSize, roast)
    setSelectedRecipe(recipe)
  }, [method, cupSize, roast])

  // Set initial recommended recipe
  useEffect(() => {
    const recommended = coffeeService.getRecommendedRecipe()
    setMethod(recommended.method)
    setCupSize(recommended.cupSize)
    setRoast(recommended.roast)
  }, [])

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Left Column: Timer + Recipe */}
      <div className="space-y-3">
        {/* Timer Card */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Coffee className="size-4 text-amber-600 dark:text-amber-400" />
                Brew Timer
              </CardTitle>
              {selectedRecipe && (
                <span className="text-muted-foreground text-xs">
                  {selectedRecipe.cupSizeLabel} • {selectedRecipe.ratio}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <CoffeeStopwatch timingCues={selectedRecipe?.timingCues || []} />
          </CardContent>
        </Card>

        {/* Recipe Selector Card */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              {method === 'switch' ? (
                <Droplets className="size-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Coffee className="size-4 text-amber-600 dark:text-amber-400" />
              )}
              Recipe
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            {/* Method Toggle */}
            <div className="flex gap-1.5">
              <Button
                variant={method === 'moccamaster' ? 'default' : 'outline'}
                onClick={() => setMethod('moccamaster')}
                className={`flex-1 gap-1.5 h-8 text-xs ${method === 'moccamaster' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                size="sm"
              >
                <Coffee className="size-3.5" />
                Moccamaster
              </Button>
              <Button
                variant={method === 'switch' ? 'default' : 'outline'}
                onClick={() => setMethod('switch')}
                className={`flex-1 gap-1.5 h-8 text-xs ${method === 'switch' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                size="sm"
              >
                <Droplets className="size-3.5" />
                Hario Switch
              </Button>
            </div>

            {/* Size + Roast Row */}
            <div className="flex gap-3">
              {/* Cup Size */}
              <div className="flex-1 space-y-1">
                <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Size</div>
                <div className="flex flex-wrap gap-1">
                  {cupSizes.map((size) => (
                    <Button
                      key={size.value}
                      variant={cupSize === size.value ? 'default' : 'outline'}
                      onClick={() => setCupSize(size.value)}
                      className={`h-7 px-2 text-[11px] ${cupSize === size.value ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                      size="sm"
                    >
                      {size.label.replace(' Cups', 'c').replace(' Cup', 'c').replace('(', '').replace(')', '').replace('ml', '').replace(' Liters', 'L').replace(' Liter', 'L')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Roast Level */}
              <div className="space-y-1">
                <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Roast</div>
                <div className="flex gap-1">
                  {(['light', 'medium', 'dark'] as RoastLevel[]).map((r) => (
                    <Button
                      key={r}
                      variant={roast === r ? 'default' : 'outline'}
                      onClick={() => setRoast(r)}
                      className={`h-7 px-2.5 text-[11px] capitalize ${roast === r ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                      size="sm"
                    >
                      {r.charAt(0).toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Recipe Details - Compact */}
            {selectedRecipe && (
              <div className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-2.5 dark:from-amber-950/30 dark:to-orange-950/20">
                {/* Key Numbers Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Scale className="size-3 text-amber-600" />
                      <span className="text-sm font-bold">{selectedRecipe.coffee}g</span>
                    </div>
                    <span className="text-muted-foreground text-xs">:</span>
                    <div className="flex items-center gap-1">
                      <Droplets className="size-3 text-blue-500" />
                      <span className="text-sm font-bold">{selectedRecipe.waterMl}g</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Thermometer className="size-3 text-red-500" />
                      <span className="text-sm font-bold">{selectedRecipe.temp}</span>
                    </div>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 ${roastColors[selectedRecipe.roast]}`}>
                    {selectedRecipe.roast}
                  </Badge>
                </div>

                {/* Technique */}
                <div className="flex items-start gap-1.5">
                  <Zap className="size-3 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground text-[11px] leading-snug">{selectedRecipe.technique}</p>
                </div>

                {/* Method-specific settings */}
                {(selectedRecipe.switchSetting || selectedRecipe.moccaSetting) && (
                  <div className="mt-1.5 pt-1.5 border-t border-amber-500/20 text-[11px]">
                    {selectedRecipe.switchSetting && (
                      <span><span className="font-medium">Switch:</span> <span className="text-muted-foreground capitalize">{selectedRecipe.switchSetting}</span></span>
                    )}
                    {selectedRecipe.moccaSetting && (
                      <span><span className="font-medium">Setting:</span> <span className="text-muted-foreground">{selectedRecipe.moccaSetting === 'half' ? 'Half Jug' : 'Full Jug'}</span></span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Quick Reference */}
      <Card className="h-fit">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4 text-amber-600 dark:text-amber-400" />
              Reference
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <Tabs defaultValue="doses" className="w-full">
            <div className="flex gap-1 rounded-lg bg-muted p-1 mb-2">
              <TabsList className="bg-transparent p-0 h-auto w-full grid grid-cols-3 gap-1">
                <TabsTrigger 
                  value="doses" 
                  className="rounded-md px-2 py-1.5 text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                >
                  <Scale className="size-3 mr-1" />
                  Doses
                </TabsTrigger>
                <TabsTrigger 
                  value="roasts" 
                  className="rounded-md px-2 py-1.5 text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                >
                  <Flame className="size-3 mr-1" />
                  Roasts
                </TabsTrigger>
                <TabsTrigger 
                  value="rules" 
                  className="rounded-md px-2 py-1.5 text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                >
                  <Zap className="size-3 mr-1" />
                  Rules
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="doses" className="mt-0 space-y-2">
              {/* Switch Doses */}
              <div>
                <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
                  <Droplets className="size-2.5" />
                  Hario Switch
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {switchDoses.map((dose, idx) => (
                    <div key={idx} className="bg-muted/30 flex items-center justify-between rounded border px-2 py-1">
                      <span className="text-muted-foreground text-[11px]">{dose.label.replace(' (Standard)', '').replace(' (Dark)', ' D')}</span>
                      <span className="font-mono text-xs font-bold">{dose.grams}g</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Moccamaster Doses */}
              <div>
                <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
                  <Coffee className="size-2.5" />
                  Moccamaster
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {moccaDoses.map((dose, idx) => (
                    <div key={idx} className="bg-muted/30 flex items-center justify-between rounded border px-2 py-1">
                      <span className="text-muted-foreground text-[11px]">{dose.label.replace(' (Standard)', '').replace(' (Dark)', ' D')}</span>
                      <span className="font-mono text-xs font-bold">{dose.grams}g</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="roasts" className="mt-0 space-y-1.5">
              {roastStrategies.map((strategy) => (
                <div key={strategy.roast} className={`rounded-lg border p-2 ${roastColors[strategy.roast]}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold capitalize">{strategy.roast}</span>
                    <span className="text-[10px] opacity-80">{strategy.ratio}</span>
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
                    <div className="opacity-80 text-[10px] mt-0.5">{strategy.technique}</div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="rules" className="mt-0 space-y-1.5">
              {goldenRules.map((rule, idx) => (
                <div key={idx} className="bg-muted/30 rounded-lg border p-2">
                  <div className="text-[11px] font-semibold mb-0.5">{rule.title}</div>
                  <p className="text-muted-foreground text-[10px] leading-snug">{rule.description}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

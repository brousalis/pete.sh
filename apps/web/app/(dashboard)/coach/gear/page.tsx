'use client'

import { AlertTriangle, Apple, Loader2, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GearResponse {
  items: {
    id: string
    name: string
    category: string
    sport: string | null
    totalMiles: number
    lifeRemainingPct: number | null
    sessionCount: number
    status: 'ok' | 'approaching_limit' | 'past_limit' | 'service_due'
    serviceDue: { type: string; dueOn: string | null; note: string }[]
  }[]
  recommendations: {
    id: string
    title: string
    category: string
    rationale: string
    estimatedCostUsd: number | null
    estimatedSecondsSaved: number | null
    costPerSecond: number | null
    status: string
  }[]
  alerts: { name: string; message: string; severity: 'info' | 'warn' }[]
}

interface NutritionResponse {
  date: string
  plannedTss: number
  fuellingWindow: 'high' | 'moderate' | 'low'
  bodyWeightLbs: number
  targets: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  logged: { kcal: number | null; proteinG: number | null; carbsG: number | null } | null
  guidance: string[]
  flags: string[]
}

export default function CoachGearPage() {
  const [gear, setGear] = useState<GearResponse | null>(null)
  const [nutrition, setNutrition] = useState<NutritionResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [gearResponse, nutritionResponse] = await Promise.all([
          fetch('/api/coach/gear', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/coach/nutrition', { credentials: 'include' }).then((r) => r.json()),
        ])

        if (gearResponse.success) setGear(gearResponse.data)
        if (nutritionResponse.success) setNutrition(nutritionResponse.data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-lg font-semibold">Gear and fuelling</h1>

      {nutrition ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Apple className="size-4" />
              Today&apos;s fuelling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={nutrition.fuellingWindow === 'high' ? 'default' : 'secondary'}
                className="text-[10px] uppercase"
              >
                {nutrition.fuellingWindow} carb day
              </Badge>
              <span className="text-xs text-muted-foreground">
                {nutrition.plannedTss} TSS planned · {nutrition.bodyWeightLbs} lb
              </span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <Macro label="kcal" target={nutrition.targets.kcal} actual={nutrition.logged?.kcal} />
              <Macro
                label="protein"
                target={nutrition.targets.proteinG}
                actual={nutrition.logged?.proteinG}
                suffix="g"
              />
              <Macro
                label="carbs"
                target={nutrition.targets.carbsG}
                actual={nutrition.logged?.carbsG}
                suffix="g"
              />
              <Macro label="fat" target={nutrition.targets.fatG} suffix="g" />
            </div>

            {nutrition.flags.length > 0 ? (
              <div className="mt-3 rounded-md bg-accent-gold/10 p-2.5">
                {nutrition.guidance
                  .filter((_, index) => index >= nutrition.guidance.length - nutrition.flags.length)
                  .map((note, index) => (
                    <p key={index} className="flex gap-2 text-xs text-accent-gold">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      {note}
                    </p>
                  ))}
              </div>
            ) : null}

            <ul className="mt-3 space-y-1 border-t border-border pt-2">
              {nutrition.guidance.slice(0, 2).map((note, index) => (
                <li key={index} className="text-xs text-muted-foreground">
                  {note}
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[11px] italic text-muted-foreground">
              Maintenance energy with carbohydrate periodised to load. No deficit while cartilage
              and tendon are healing.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {gear?.alerts.length ? (
        <Card className="border-accent-gold/40">
          <CardContent className="space-y-2 pt-5">
            {gear.alerts.map((alert, index) => (
              <div key={index} className="flex gap-2 text-sm">
                <AlertTriangle
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    alert.severity === 'warn' ? 'text-accent-rose' : 'text-accent-gold'
                  )}
                />
                <p>
                  <span className="font-medium">{alert.name}</span> — {alert.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wrench className="size-4" />
            Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!gear?.items.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing tracked yet. Adding shoes and the bike lets mileage accumulate
              automatically from recorded sessions.
            </p>
          ) : (
            <div className="space-y-2">
              {gear.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                      {item.sport ? ` · ${item.sport}` : ''} · {item.totalMiles} mi ·{' '}
                      {item.sessionCount} sessions
                    </p>
                  </div>

                  {item.lifeRemainingPct != null ? (
                    <div className="w-24 shrink-0">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            item.lifeRemainingPct <= 0
                              ? 'bg-accent-rose'
                              : item.lifeRemainingPct <= 15
                                ? 'bg-accent-gold'
                                : 'bg-accent-sage'
                          )}
                          style={{ width: `${Math.max(2, item.lifeRemainingPct)}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-[10px] tabular-nums text-muted-foreground">
                        {item.lifeRemainingPct}% left
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {gear?.recommendations.length ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upgrades, ranked by value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gear.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="border-l-2 border-border pl-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-sm font-medium">{recommendation.title}</p>
                  {recommendation.estimatedCostUsd != null ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      ${recommendation.estimatedCostUsd.toFixed(0)}
                    </span>
                  ) : null}
                  {recommendation.estimatedSecondsSaved != null ? (
                    <span className="text-xs tabular-nums text-accent-sage">
                      −{formatSeconds(recommendation.estimatedSecondsSaved)}
                    </span>
                  ) : null}
                  {recommendation.costPerSecond != null ? (
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      ${recommendation.costPerSecond.toFixed(0)}/sec
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{recommendation.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Macro({
  label,
  target,
  actual,
  suffix = '',
}: {
  label: string
  target: number
  actual?: number | null
  suffix?: string
}) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums">
        {actual != null ? `${actual}/` : ''}
        {target}
        {suffix}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${minutes} min`
}

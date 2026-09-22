'use client'

import { Loader2, Plus } from 'lucide-react'

import { Disclosure, Panel, Track } from '@/components/coach/ui/panel'
import { toneClasses, type Tone } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  kcalProgress,
  kcalTone,
  macroBarTone,
  macroProgress,
} from './fuel-glance'
import { FUEL_STAPLES } from './fuel-staples'
import type { NutritionDayView } from './fuel-types'

export function FuelDayHero({
  nutrition,
  addingStapleId,
  onAddStaple,
}: {
  nutrition: NutritionDayView
  addingStapleId: string | null
  onAddStaple: (stapleId: string) => void
}) {
  const loggedKcal = nutrition.logged?.kcal
  const kcalPct = kcalProgress(loggedKcal, nutrition.targets.kcal)
  const protein = nutrition.logged?.proteinG
  const carbs = nutrition.logged?.carbsG
  const fat = nutrition.logged?.fatG

  const nudge = buildNudge(nutrition)
  const staple = FUEL_STAPLES[0]!

  return (
    <Panel className="overflow-hidden px-0 py-0">
      <div className="border-b border-line px-5 py-2.5">
        <p className="t-micro text-ink-3">
          Targets for {nutrition.plannedTss} TSS · {nutrition.targets.kcal} kcal day
        </p>
      </div>

      <div className="px-5 pt-4 pb-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="t-micro text-ink-3">Energy</p>
            <p className="mt-0.5 t-num t-num-xl text-ink-1">
              {loggedKcal ?? '—'}
              <span className="t-num-md text-ink-3"> / {nutrition.targets.kcal}</span>
            </p>
          </div>
          {loggedKcal != null ? (
            <p
              className={cn(
                't-num t-num-lg pb-0.5',
                toneClasses(kcalTone(kcalPct)).text
              )}
            >
              {kcalPct}%
            </p>
          ) : null}
        </div>

        {loggedKcal != null ? (
          <Track
            pct={Math.min(kcalPct, 100)}
            tone={kcalTone(kcalPct)}
            className="mt-3 h-2"
          />
        ) : (
          <div className="mt-3 h-2 rounded-full bg-surface-3" />
        )}
      </div>

      <div className="space-y-3 border-t border-line px-5 py-4">
        <MacroBar
          label="Protein"
          actual={protein}
          target={nutrition.targets.proteinG}
          macro="protein"
        />
        <MacroBar label="Carbs" actual={carbs} target={nutrition.targets.carbsG} macro="carbs" />
        <MacroBar label="Fat" actual={fat} target={nutrition.targets.fatG} macro="fat" />
      </div>

      {nudge ? (
        <div className={cn('border-t border-line px-5 py-2.5', toneClasses(nudge.tone).bg)}>
          <p className={cn('t-label', toneClasses(nudge.tone).text)}>{nudge.text}</p>
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-line px-5 py-2.5">
        <div className="min-w-0 flex-1">
          {nutrition.guidance[0] ? (
            <Disclosure label="Fuelling note" defaultOpen={false}>
              <p className="t-label text-ink-2">{nutrition.guidance[0]}</p>
            </Disclosure>
          ) : (
            <span className="t-micro text-ink-3">Daily staples</span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1 px-2.5 t-label"
          disabled={addingStapleId === staple.id}
          onClick={() => onAddStaple(staple.id)}
          title={`${staple.draft.kcal} kcal · P ${staple.draft.proteinG}`}
        >
          {addingStapleId === staple.id ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          {staple.label}
        </Button>
      </div>
    </Panel>
  )
}

function MacroBar({
  label,
  actual,
  target,
  macro,
}: {
  label: string
  actual: number | null | undefined
  target: number
  macro: 'protein' | 'carbs' | 'fat'
}) {
  const pct = macroProgress(actual, target)
  const tone = macroBarTone(actual, target, macro)
  const t = toneClasses(tone)
  const barWidth = Math.min(100, pct)

  return (
    <div
      className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3"
      aria-label={`${label} ${actual ?? 0} of ${target} grams`}
    >
      <span className="t-micro text-ink-3">{label}</span>
      <div className="min-w-0">
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', t.dot)}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
      <p className="t-num t-num-sm shrink-0 text-right text-ink-1">
        <span className={actual != null ? t.text : ''}>{actual ?? '—'}</span>
        <span className="text-ink-3">/{target}</span>
      </p>
    </div>
  )
}

function buildNudge(nutrition: NutritionDayView): { text: string; tone: Tone } | null {
  const window = nutrition.fuellingWindow
  const p = nutrition.logged?.proteinG
  const c = nutrition.logged?.carbsG
  const f = nutrition.logged?.fatG
  const pt = nutrition.targets.proteinG
  const ct = nutrition.targets.carbsG
  const ft = nutrition.targets.fatG

  if (p != null && p / pt < 0.7) {
    return { text: 'Protein is lagging — priority for tendon repair.', tone: 'caution' }
  }
  if (window !== 'low' && c != null && c / ct < 0.6) {
    return {
      text:
        window === 'high'
          ? 'Carbs still low for a high-load day — add fuel around training.'
          : 'Carbs below target for today’s load.',
      tone: 'info',
    }
  }
  if (f != null && f / ft > 1.15) {
    return { text: 'Fat over target — fine occasionally; balance the rest of the day.', tone: 'info' }
  }
  return null
}

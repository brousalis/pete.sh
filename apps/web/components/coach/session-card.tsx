'use client'

import { AlertTriangle, Ban, Bike, Check, Dumbbell, Footprints, Waves } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { TodaySession } from '@/lib/types/coach-ui.types'
import { SPORT_LABELS } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const SPORT_ICONS: Record<string, typeof Waves> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  strength: Dumbbell,
  brick: Bike,
}

export function SessionCard({
  session,
  onComplete,
  onSkip,
}: {
  session: TodaySession
  onComplete?: (sessionId: string) => void
  onSkip?: (sessionId: string) => void
}) {
  const [showSteps, setShowSteps] = useState(false)

  const Icon = SPORT_ICONS[session.sport] ?? Dumbbell
  const blocked =
    session.guardrail != null &&
    !session.guardrail.passed &&
    session.status !== 'completed'

  const blockingViolations =
    session.guardrail?.violations.filter(
      (violation) => violation.severity === 'block' || violation.severity === 'red_flag'
    ) ?? []

  return (
    <Card className={cn(blocked && 'border-accent-rose/40')}>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              session.status === 'completed' ? 'bg-accent-sage/15' : 'bg-muted'
            )}
          >
            {session.status === 'completed' ? (
              <Check className="size-4 text-accent-sage" />
            ) : (
              <Icon className="size-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{session.title}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {SPORT_LABELS[session.sport] ?? session.sport}
              </Badge>
              {session.status !== 'planned' ? (
                <Badge variant="outline" className="text-[10px]">
                  {session.status}
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {[
                session.durationMinutes ? `${session.durationMinutes} min` : null,
                formatDistance(session.distanceMeters, session.sport),
                session.plannedLoad ? `${session.plannedLoad} TSS` : null,
                formatTargets(session),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            {session.description ? (
              <p className="mt-2 text-sm">{session.description}</p>
            ) : null}

            {session.rationale ? (
              <p className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                {session.rationale}
              </p>
            ) : null}
          </div>
        </div>

        {blockingViolations.length > 0 ? (
          <div className="mt-3 rounded-md bg-accent-rose/10 p-2.5">
            {blockingViolations.map((violation, index) => (
              <div key={index} className="flex gap-2 text-xs">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-accent-rose" />
                <div>
                  <p className="font-medium text-accent-rose">{violation.message}</p>
                  {violation.remedy ? (
                    <p className="mt-0.5 text-muted-foreground">{violation.remedy}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {hasSteps(session) ? (
          <>
            <button
              type="button"
              onClick={() => setShowSteps((value) => !value)}
              className="mt-3 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {showSteps ? 'Hide the structure' : 'Show the structure'}
            </button>
            {showSteps ? <StructuredSteps steps={session.steps} /> : null}
          </>
        ) : null}

        {session.status === 'planned' && (onComplete || onSkip) ? (
          <div className="mt-3 flex gap-2">
            {onComplete ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={blocked}
                onClick={() => onComplete(session.id)}
              >
                <Check className="mr-1.5 size-3.5" />
                Done
              </Button>
            ) : null}
            {onSkip ? (
              <Button size="sm" variant="ghost" onClick={() => onSkip(session.id)}>
                <Ban className="mr-1.5 size-3.5" />
                Skip
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface Step {
  kind: string
  label?: string
  goal?: { type: string; value?: number; unit?: string }
  alert?: { type: string; min?: number; max?: number; zone?: number }
  note?: string
}

function hasSteps(session: TodaySession): boolean {
  const steps = session.steps as { blocks?: unknown[]; warmup?: unknown }
  return Boolean(steps?.warmup || (Array.isArray(steps?.blocks) && steps.blocks.length > 0))
}

function StructuredSteps({ steps }: { steps: Record<string, unknown> }) {
  const workout = steps as {
    warmup?: Step
    blocks?: { repeat: number; steps: Step[] }[]
    cooldown?: Step
  }

  return (
    <div className="mt-2 space-y-1 rounded-md bg-muted/40 p-2.5 text-xs">
      {workout.warmup ? <StepLine step={workout.warmup} /> : null}

      {workout.blocks?.map((block, index) => (
        <div key={index} className={cn(block.repeat > 1 && 'border-l-2 border-border pl-2')}>
          {block.repeat > 1 ? (
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {block.repeat}×
            </p>
          ) : null}
          {block.steps.map((step, stepIndex) => (
            <StepLine key={stepIndex} step={step} />
          ))}
        </div>
      ))}

      {workout.cooldown ? <StepLine step={workout.cooldown} /> : null}
    </div>
  )
}

function StepLine({ step }: { step: Step }) {
  const goal = step.goal
    ? step.goal.type === 'time' && step.goal.value
      ? formatDuration(step.goal.value)
      : step.goal.type === 'distance' && step.goal.value
        ? `${step.goal.value} ${step.goal.unit ?? 'm'}`
        : step.goal.type === 'open'
          ? 'open'
          : null
    : null

  const alert = step.alert
    ? step.alert.zone
      ? `Z${step.alert.zone}`
      : step.alert.min != null && step.alert.max != null
        ? `${step.alert.min}–${step.alert.max}`
        : null
    : null

  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span
        className={cn(
          'w-16 shrink-0 text-[10px] uppercase tracking-wider',
          step.kind === 'work' ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {step.label ?? step.kind}
      </span>
      {goal ? <span className="tabular-nums">{goal}</span> : null}
      {alert ? <span className="text-muted-foreground">@ {alert}</span> : null}
      {step.note ? <span className="text-muted-foreground">— {step.note}</span> : null}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${minutes} min`
}

function formatDistance(meters: number | null, sport: string): string | null {
  if (!meters) return null
  // The pool is 25 yd, so swim distances read in yards.
  if (sport === 'swim') return `${Math.round(meters * 1.09361)} yd`
  return `${(meters / 1609.344).toFixed(2)} mi`
}

function formatTargets(session: TodaySession): string | null {
  const targets = session.targets
  if (!targets) return null

  const parts: string[] = []
  if (targets.hrZone) parts.push(`Z${targets.hrZone}`)
  if (targets.hrRange) parts.push(`${targets.hrRange[0]}–${targets.hrRange[1]} bpm`)
  if (targets.cadenceRange) parts.push(`${targets.cadenceRange[0]}+ rpm`)
  if (targets.rpe) parts.push(`RPE ${targets.rpe}`)

  return parts.length ? parts.join(', ') : null
}

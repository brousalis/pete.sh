'use client'

import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  Bike,
  Check,
  Dumbbell,
  Footprints,
  Waves,
} from 'lucide-react'
import { useState } from 'react'

import { Disclosure, Panel } from '@/components/coach/ui/panel'
import { sportClasses } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
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
  onMove,
  compact = false,
  defaultShowSteps = false,
}: {
  session: TodaySession
  onComplete?: (sessionId: string) => void
  onSkip?: (sessionId: string) => void
  onMove?: (session: TodaySession) => void
  compact?: boolean
  defaultShowSteps?: boolean
}) {
  const Icon = SPORT_ICONS[session.sport] ?? Dumbbell
  const sport = sportClasses(session.sport)
  const done = session.status === 'completed'
  const blocked = session.guardrail != null && !session.guardrail.passed && !done

  const blockingViolations =
    session.guardrail?.violations.filter(
      (violation) => violation.severity === 'block' || violation.severity === 'red_flag'
    ) ?? []

  const facts = [
    session.durationMinutes ? { value: String(session.durationMinutes), unit: 'min' } : null,
    formatDistance(session.distanceMeters, session.sport),
    session.plannedLoad ? { value: String(session.plannedLoad), unit: 'TSS' } : null,
    ...formatTargets(session),
  ].filter((fact): fact is { value: string; unit: string } => fact != null)

  return (
    <Panel
      className={cn(
        'relative overflow-hidden',
        compact ? 'px-3.5 py-3' : 'px-4 py-4',
        blocked && 'border border-tone-alert/40',
        done && 'opacity-70'
      )}
    >
      {/* Sport is identified by a spine rather than a badge, so the eye can
          sort a stack of sessions by discipline without reading them. */}
      <span
        className={cn('absolute inset-y-0 left-0 w-[3px]', sport.bar, done && 'opacity-40')}
        aria-hidden
      />

      <div className="flex items-start gap-3 pl-1.5">
        <div
          className={cn(
            'grid shrink-0 place-items-center rounded-control',
            compact ? 'size-8' : 'size-9',
            done ? 'bg-tone-good/15' : sport.soft
          )}
        >
          {done ? (
            <Check className="size-4 text-tone-good" />
          ) : (
            <Icon className={cn('size-4', sport.text)} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className={cn(compact ? 't-subtitle' : 't-title', done && 'line-through')}>
              {session.title}
            </h3>
            <span className={cn('t-micro', sport.text)}>
              {SPORT_LABELS[session.sport] ?? session.sport}
            </span>
            {session.status !== 'planned' && !done ? (
              <span className="t-micro text-ink-3">{session.status}</span>
            ) : null}
          </div>

          {facts.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {facts.map((fact, index) => (
                <span key={index} className="inline-flex items-baseline gap-1">
                  <span className="t-num t-num-sm text-ink-1">{fact.value}</span>
                  <span className="t-micro text-ink-3">{fact.unit}</span>
                </span>
              ))}
            </div>
          ) : null}

          {session.description && !compact ? (
            <p className="mt-2.5 t-body text-ink-2">{session.description}</p>
          ) : null}

          {session.rationale && !compact ? (
            <p className="mt-2.5 border-l-2 border-line-strong pl-2.5 t-label leading-relaxed text-ink-3">
              {session.rationale}
            </p>
          ) : null}
        </div>
      </div>

      {blockingViolations.length > 0 ? (
        <div className="mt-3 space-y-1.5 rounded-control wash-alert px-3 py-2.5">
          {blockingViolations.map((violation, index) => (
            <div key={index} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-tone-alert" />
              <div className="min-w-0">
                <p className="t-label font-medium text-tone-alert">{violation.message}</p>
                {violation.remedy ? (
                  <p className="mt-0.5 t-label text-ink-2">{violation.remedy}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasSteps(session) ? (
        <Disclosure
          label="Structure"
          openLabel="Hide structure"
          defaultOpen={defaultShowSteps}
          className="mt-2 pl-1.5"
        >
          <StructuredSteps steps={session.steps} />
        </Disclosure>
      ) : null}

      {session.status === 'planned' && (onComplete || onSkip || onMove) ? (
        <div className="mt-3.5 flex gap-2 pl-1.5">
          {onComplete ? (
            <Button
              size="sm"
              className="flex-1 bg-brand text-brand-ink hover:bg-brand/90"
              disabled={blocked}
              onClick={() => onComplete(session.id)}
            >
              <Check className="mr-1.5 size-3.5" />
              Mark done
            </Button>
          ) : null}
          {onSkip ? (
            <Button size="sm" variant="ghost" className="text-ink-2" onClick={() => onSkip(session.id)}>
              <Ban className="mr-1.5 size-3.5" />
              Skip
            </Button>
          ) : null}
          {onMove ? (
            <Button
              size="sm"
              variant={onComplete || onSkip ? 'ghost' : 'outline'}
              className={cn('text-ink-2', !onComplete && !onSkip && 'flex-1')}
              onClick={() => onMove(session)}
            >
              <ArrowRightLeft className="mr-1.5 size-3.5" />
              Move
            </Button>
          ) : null}
        </div>
      ) : null}
    </Panel>
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
    <div className="space-y-0.5 rounded-control bg-surface-2 px-3 py-2.5">
      {workout.warmup ? <StepLine step={workout.warmup} /> : null}

      {workout.blocks?.map((block, index) => (
        <div key={index} className={cn(block.repeat > 1 && 'border-l-2 border-line-strong pl-2.5')}>
          {block.repeat > 1 ? (
            <p className="t-num t-num-sm py-0.5 text-ink-2">{block.repeat}×</p>
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
    <div className="flex items-baseline gap-2.5 py-0.5">
      <span
        className={cn('t-micro w-16 shrink-0', step.kind === 'work' ? 'text-ink-1' : 'text-ink-3')}
      >
        {step.label ?? step.kind}
      </span>
      {goal ? <span className="t-num t-num-sm text-ink-1">{goal}</span> : null}
      {alert ? <span className="t-num t-num-sm text-ink-2">@{alert}</span> : null}
      {step.note ? <span className="t-label min-w-0 text-ink-3">— {step.note}</span> : null}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${minutes} min`
}

function formatDistance(
  meters: number | null,
  sport: string
): { value: string; unit: string } | null {
  if (!meters) return null
  // The pool is 25 yd, so swim distances read in yards.
  if (sport === 'swim') return { value: String(Math.round(meters * 1.09361)), unit: 'yd' }
  return { value: (meters / 1609.344).toFixed(2), unit: 'mi' }
}

function formatTargets(session: TodaySession): { value: string; unit: string }[] {
  const targets = session.targets
  if (!targets) return []

  const parts: { value: string; unit: string }[] = []
  if (targets.hrZone) parts.push({ value: `Z${targets.hrZone}`, unit: 'zone' })
  if (targets.hrRange) {
    parts.push({ value: `${targets.hrRange[0]}–${targets.hrRange[1]}`, unit: 'bpm' })
  }
  if (targets.cadenceRange) parts.push({ value: `${targets.cadenceRange[0]}+`, unit: 'rpm' })
  if (targets.rpe) parts.push({ value: String(targets.rpe), unit: 'RPE' })

  return parts
}

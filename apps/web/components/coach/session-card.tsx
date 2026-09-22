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
import { useRouter, useSearchParams } from 'next/navigation'

import { SessionActivityGlance } from '@/components/coach/session-activity-glance'
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
  onOpenActivity,
  busy = false,
  compact = false,
  defaultShowSteps = false,
  showActivitySparkline = true,
}: {
  session: TodaySession
  onComplete?: (sessionId: string) => void
  onSkip?: (sessionId: string) => void
  onMove?: (session: TodaySession) => void
  onOpenActivity?: (activityId: string) => void
  busy?: boolean
  compact?: boolean
  defaultShowSteps?: boolean
  showActivitySparkline?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const Icon = SPORT_ICONS[session.sport] ?? Dumbbell
  const sport = sportClasses(session.sport)
  const done = session.status === 'completed'
  const skipped = session.status === 'skipped'
  const linked = done && session.activity != null
  const blocked =
    session.guardrail != null && !session.guardrail.passed && !done

  const blockingViolations =
    session.guardrail?.violations.filter(
      violation =>
        violation.severity === 'block' || violation.severity === 'red_flag'
    ) ?? []

  const plannedFacts = [
    session.durationMinutes
      ? { value: String(session.durationMinutes), unit: 'min' }
      : null,
    formatDistance(session.distanceMeters, session.sport),
    session.plannedLoad
      ? { value: String(session.plannedLoad), unit: 'TSS' }
      : null,
    ...formatTargets(session),
  ].filter((fact): fact is { value: string; unit: string } => fact != null)

  function openActivity(activityId: string) {
    if (onOpenActivity) {
      onOpenActivity(activityId)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'activity')
    params.set('workout', activityId)
    router.replace(`/coach?${params.toString()}`, { scroll: false })
  }

  return (
    <Panel
      className={cn(
        'relative overflow-hidden border border-line/45',
        compact ? 'px-3.5 py-3' : 'px-4 py-4',
        blocked && 'border-tone-alert/40',
        // Dim unlinked/skipped only — linked reviews stay fully readable.
        ((done && !linked) || skipped) && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'rounded-control grid shrink-0 place-items-center',
            compact ? 'size-8' : 'size-9',
            done ? 'bg-tone-good/15' : skipped ? 'bg-surface-2' : sport.soft
          )}
        >
          {done ? (
            <Check className="text-tone-good size-4" />
          ) : skipped ? (
            <Ban className="text-ink-3 size-4" />
          ) : (
            <Icon className={cn('size-4', sport.text)} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3
              className={cn(
                compact ? 't-subtitle' : 't-title',
                (done || skipped) && 'text-ink-2 line-through decoration-ink-3/70'
              )}
            >
              {session.title}
            </h3>
            <span className={cn('t-micro', sport.text)}>
              {SPORT_LABELS[session.sport] ?? session.sport}
            </span>
            {session.status !== 'planned' && !done ? (
              <span className="t-micro text-ink-3">{session.status}</span>
            ) : null}
          </div>

          {linked && session.activity ? (
            <div className="mt-1.5">
              <SessionActivityGlance
                session={session}
                activity={session.activity}
                onOpenActivity={openActivity}
                showCharts={showActivitySparkline && !compact}
              />
            </div>
          ) : (
            <>
              {plannedFacts.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {plannedFacts.map((fact, index) => (
                    <span
                      key={index}
                      className="inline-flex items-baseline gap-1"
                    >
                      <span className="t-num t-num-sm text-ink-1">
                        {fact.value}
                      </span>
                      <span className="t-micro text-ink-3">{fact.unit}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              {done && !linked ? (
                <p className="t-micro text-ink-3 mt-1">
                  Done · no workout linked
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Prescription copy sits below the review data so the eye hits
          actuals + HR first, then coach intent. */}
      {session.description && !compact ? (
        <p className="t-body text-ink-2 mt-3 pl-0 sm:pl-12">{session.description}</p>
      ) : null}

      {session.rationale && !compact ? (
        <p className="border-line-strong t-label text-ink-3 mt-2 border-l-2 pl-2.5 leading-relaxed sm:ml-12">
          {session.rationale}
        </p>
      ) : null}

      {blockingViolations.length > 0 ? (
        <div className="rounded-control wash-alert mt-3 space-y-1.5 px-3 py-2.5">
          {blockingViolations.map((violation, index) => (
            <div key={index} className="flex gap-2">
              <AlertTriangle className="text-tone-alert mt-0.5 size-3.5 shrink-0" />
              <div className="min-w-0">
                <p className="t-label text-tone-alert font-medium">
                  {violation.message}
                </p>
                {violation.remedy ? (
                  <p className="t-label text-ink-2 mt-0.5">
                    {violation.remedy}
                  </p>
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
          defaultOpen={defaultShowSteps && !linked}
          className="mt-2 sm:ml-12"
        >
          <StructuredSteps steps={session.steps} />
        </Disclosure>
      ) : null}

      {(session.status === 'planned' || session.status === 'modified') &&
      (onComplete || onSkip || onMove) ? (
        <div className="mt-3.5 flex gap-2">
          {onComplete ? (
            <Button
              size="sm"
              className="bg-brand text-brand-ink hover:bg-brand/90 flex-1"
              disabled={blocked || busy}
              onClick={() => onComplete(session.id)}
            >
              <Check className="mr-1.5 size-3.5" />
              {busy ? 'Saving…' : 'Mark done'}
            </Button>
          ) : null}
          {onSkip ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-ink-2"
              disabled={busy}
              onClick={() => onSkip(session.id)}
            >
              <Ban className="mr-1.5 size-3.5" />
              Skip
            </Button>
          ) : null}
          {onMove ? (
            <Button
              size="sm"
              variant={onComplete || onSkip ? 'ghost' : 'outline'}
              className={cn('text-ink-2', !onComplete && !onSkip && 'flex-1')}
              disabled={busy}
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
  return Boolean(
    steps?.warmup || (Array.isArray(steps?.blocks) && steps.blocks.length > 0)
  )
}

function StructuredSteps({ steps }: { steps: Record<string, unknown> }) {
  const workout = steps as {
    warmup?: Step
    blocks?: { repeat: number; steps: Step[] }[]
    cooldown?: Step
  }

  return (
    <div className="rounded-control bg-surface-2 space-y-0.5 px-3 py-2.5">
      {workout.warmup ? <StepLine step={workout.warmup} /> : null}

      {workout.blocks?.map((block, index) => (
        <div
          key={index}
          className={cn(
            block.repeat > 1 && 'border-line-strong border-l-2 pl-2.5'
          )}
        >
          {block.repeat > 1 ? (
            <p className="t-num t-num-sm text-ink-2 py-0.5">{block.repeat}×</p>
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
        className={cn(
          't-micro w-16 shrink-0',
          step.kind === 'work' ? 'text-ink-1' : 'text-ink-3'
        )}
      >
        {step.label ?? step.kind}
      </span>
      {goal ? <span className="t-num t-num-sm text-ink-1">{goal}</span> : null}
      {alert ? (
        <span className="t-num t-num-sm text-ink-2">@{alert}</span>
      ) : null}
      {step.note ? (
        <span className="t-label text-ink-3 min-w-0">— {step.note}</span>
      ) : null}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder
    ? `${minutes}:${String(remainder).padStart(2, '0')}`
    : `${minutes} min`
}

function formatDistance(
  meters: number | null,
  sport: string
): { value: string; unit: string } | null {
  if (!meters) return null
  // The pool is 25 yd, so swim distances read in yards.
  if (sport === 'swim')
    return { value: String(Math.round(meters * 1.09361)), unit: 'yd' }
  return { value: (meters / 1609.344).toFixed(2), unit: 'mi' }
}

function formatTargets(
  session: TodaySession
): { value: string; unit: string }[] {
  const targets = session.targets
  if (!targets) return []

  const parts: { value: string; unit: string }[] = []
  if (targets.hrZone) parts.push({ value: `Z${targets.hrZone}`, unit: 'zone' })
  if (targets.hrRange) {
    parts.push({
      value: `${targets.hrRange[0]}–${targets.hrRange[1]}`,
      unit: 'bpm',
    })
  }
  if (targets.cadenceRange)
    parts.push({ value: `${targets.cadenceRange[0]}+`, unit: 'rpm' })
  if (targets.rpe) parts.push({ value: String(targets.rpe), unit: 'RPE' })

  return parts
}

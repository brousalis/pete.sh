'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { Chip, EmptyNote, Panel, Section } from '@/components/coach/ui/panel'
import { sportClasses } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
import type { DayActualView } from '@/lib/types/coach-ui.types'
import { SPORT_LABELS } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

/**
 * Compact list of same-day uploads. Unmatched rows invite an audible;
 * linked rows stay quiet (detail lives on the session card).
 */
export function DayActualsStrip({
  actuals,
  onAudible,
  restDayHint = false,
}: {
  actuals: DayActualView[]
  onAudible?: () => void
  /** When no planned sessions but uploads exist. */
  restDayHint?: boolean
}) {
  if (actuals.length === 0) return null

  const unmatched = actuals.filter((a) => a.linkedSessionId == null)
  const linked = actuals.filter((a) => a.linkedSessionId != null)

  return (
    <Section
      title="Actual"
      action={
        unmatched.length > 0 && onAudible ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-ink-2 h-auto px-2 py-1"
            onClick={onAudible}
          >
            Audible
          </Button>
        ) : null
      }
    >
      {restDayHint && unmatched.length > 0 ? (
        <Panel className="mb-2">
          <EmptyNote>
            You trained — audible the day so the plan and coach match what you
            did?
          </EmptyNote>
          {onAudible ? (
            <Button
              type="button"
              size="sm"
              className="bg-brand text-brand-ink hover:bg-brand/90 mt-3"
              onClick={onAudible}
            >
              Audible the day
            </Button>
          ) : null}
        </Panel>
      ) : null}

      <div className="space-y-1.5">
        {actuals.map((actual) => (
          <ActualRow
            key={actual.id}
            actual={actual}
            unmatched={actual.linkedSessionId == null}
            onUseInAudible={
              actual.linkedSessionId == null && onAudible ? onAudible : undefined
            }
          />
        ))}
      </div>

      {linked.length > 0 && unmatched.length === 0 ? (
        <p className="t-micro text-ink-3 mt-2">All uploads linked to planned sessions.</p>
      ) : null}
    </Section>
  )
}

function ActualRow({
  actual,
  unmatched,
  onUseInAudible,
}: {
  actual: DayActualView
  unmatched: boolean
  onUseInAudible?: () => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sport = sportClasses(actual.sport)

  function openActivity() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'activity')
    params.set('workout', actual.id)
    router.replace(`/coach?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      className={cn(
        'rounded-control border flex items-center gap-3 px-3 py-2.5',
        unmatched ? 'border-line bg-surface-1' : 'border-transparent bg-surface-1/60'
      )}
    >
      <span className={cn('size-2 shrink-0 rounded-full', sport.dot)} aria-hidden />
      <button
        type="button"
        onClick={openActivity}
        className="min-w-0 flex-1 text-left"
      >
        <span className="t-body text-ink-1 block truncate font-medium">
          {actual.title}
        </span>
        <span className="t-micro text-ink-3">
          {SPORT_LABELS[actual.sport] ?? actual.sport}
          {actual.tss != null && actual.tss > 0
            ? ` · ${Math.round(actual.tss)} TSS`
            : ''}
        </span>
      </button>
      {unmatched ? (
        <div className="flex shrink-0 items-center gap-2">
          <Chip tone="caution" className="px-1.5 py-0">
            unmatched
          </Chip>
          {onUseInAudible ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-ink-2 h-auto px-2 py-1"
              onClick={onUseInAudible}
            >
              Use
            </Button>
          ) : null}
        </div>
      ) : (
        <Chip tone="good" className="px-1.5 py-0">
          linked
        </Chip>
      )}
    </div>
  )
}

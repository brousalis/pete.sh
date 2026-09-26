'use client'

/**
 * Confirm-first audible sheet: cancel planned work and/or book uploaded actuals,
 * or pre-swap a session before training.
 */

import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { DayActualView, TodaySession } from '@/lib/types/coach-ui.types'
import { SPORT_LABELS } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'
import type { Sport } from '@petehome/coach-core'

const PRE_SWAP_SPORTS: Sport[] = [
  'strength',
  'swim',
  'bike',
  'run',
  'walk',
  'hiit',
  'cross',
]

export type AudibleSheetTarget = {
  date: string
  /** Session that opened the sheet (pre-selected for cancel when open). */
  focusSession?: TodaySession | null
  sessions: TodaySession[]
  dayActuals: DayActualView[]
}

export function SessionAudibleSheet({
  target,
  onOpenChange,
  onApplied,
}: {
  target: AudibleSheetTarget | null
  onOpenChange: (open: boolean) => void
  onApplied?: () => void
}) {
  const open = target != null
  const unmatched = useMemo(
    () => (target?.dayActuals ?? []).filter((a) => a.linkedSessionId == null),
    [target?.dayActuals]
  )
  const openSessions = useMemo(
    () =>
      (target?.sessions ?? []).filter(
        (s) => s.status === 'planned' || s.status === 'modified'
      ),
    [target?.sessions]
  )

  const [cancelIds, setCancelIds] = useState<string[]>([])
  const [activityIds, setActivityIds] = useState<string[]>([])
  const [mode, setMode] = useState<'reconcile' | 'preswap'>('reconcile')
  const [swapSport, setSwapSport] = useState<Sport>('strength')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!target) return
    const focus = target.focusSession
    const defaultCancel =
      focus && (focus.status === 'planned' || focus.status === 'modified')
        ? [focus.id]
        : openSessions.length === 1
          ? [openSessions[0]!.id]
          : []
    setCancelIds(defaultCancel)
    setActivityIds(unmatched.map((a) => a.id))
    setMode(unmatched.length > 0 ? 'reconcile' : 'preswap')
    setSwapSport('strength')
    setReason(
      unmatched.length > 0
        ? buildDefaultReason(focus, unmatched)
        : 'Audible: changing today’s planned work.'
    )
    setError(null)
  }, [target?.date, target?.focusSession?.id, unmatched.length, openSessions.length])

  async function submit() {
    if (!target) return
    const trimmed = reason.trim()
    if (trimmed.length < 10) {
      setError('Add a short reason (at least 10 characters).')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const body =
        mode === 'preswap' && target.focusSession
          ? {
              date: target.date,
              reason: trimmed,
              cancelSessionIds: [] as string[],
              activityIds: [] as string[],
              replace: {
                sessionId: target.focusSession.id,
                sport: swapSport,
              },
            }
          : {
              date: target.date,
              reason: trimmed,
              cancelSessionIds: cancelIds,
              activityIds,
            }

      if (
        mode === 'reconcile' &&
        cancelIds.length === 0 &&
        activityIds.length === 0
      ) {
        setError('Pick at least one session to cancel or one actual to book.')
        setSubmitting(false)
        return
      }

      const response = await fetch('/api/coach/audible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!payload.success || !payload.data?.applied) {
        const report = payload.data?.guardrailReport
        const summary =
          (payload.data?.summary as string | undefined) ??
          (payload.error as string | undefined) ??
          'Audible was rejected.'
        const remedy =
          report?.violations
            ?.map((v: { message: string }) => v.message)
            .join(' ') ?? null
        setError(remedy ? `${summary} ${remedy}` : summary)
        return
      }

      onApplied?.()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  function toggleId(list: string[], id: string, next: boolean): string[] {
    if (next) return list.includes(id) ? list : [...list, id]
    return list.filter((row) => row !== id)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audible</SheetTitle>
          <SheetDescription>
            Rewrite the plan for what you actually did — Injury Guard still
            checks the day.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {unmatched.length > 0 || openSessions.length > 0 ? (
            <div className="flex gap-2">
              <ModeChip
                active={mode === 'reconcile'}
                onClick={() => setMode('reconcile')}
                label="Reconcile uploads"
              />
              {target?.focusSession ? (
                <ModeChip
                  active={mode === 'preswap'}
                  onClick={() => setMode('preswap')}
                  label="Pre-swap"
                />
              ) : null}
            </div>
          ) : null}

          {mode === 'reconcile' ? (
            <>
              {openSessions.length > 0 ? (
                <fieldset className="space-y-2">
                  <Label className="t-label text-ink-2">Cancel planned</Label>
                  <div className="space-y-1.5">
                    {openSessions.map((session) => {
                      const checked = cancelIds.includes(session.id)
                      return (
                        <label
                          key={session.id}
                          className={cn(
                            'rounded-control border flex cursor-pointer items-start gap-3 px-3 py-2.5',
                            checked ? 'border-brand/50 bg-brand/5' : 'border-line'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={(event) =>
                              setCancelIds(
                                toggleId(cancelIds, session.id, event.target.checked)
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="t-body text-ink-1 block font-medium">
                              {session.title}
                            </span>
                            <span className="t-micro text-ink-3">
                              {SPORT_LABELS[session.sport] ?? session.sport}
                              {session.durationMinutes
                                ? ` · ${session.durationMinutes} min`
                                : ''}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ) : null}

              {unmatched.length > 0 ? (
                <fieldset className="space-y-2">
                  <Label className="t-label text-ink-2">Book as completed</Label>
                  <div className="space-y-1.5">
                    {unmatched.map((actual) => {
                      const checked = activityIds.includes(actual.id)
                      return (
                        <label
                          key={actual.id}
                          className={cn(
                            'rounded-control border flex cursor-pointer items-start gap-3 px-3 py-2.5',
                            checked ? 'border-brand/50 bg-brand/5' : 'border-line'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={(event) =>
                              setActivityIds(
                                toggleId(activityIds, actual.id, event.target.checked)
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="t-body text-ink-1 block font-medium">
                              {actual.title}
                            </span>
                            <span className="t-micro text-ink-3">
                              {SPORT_LABELS[actual.sport] ?? actual.sport}
                              {actual.tss != null ? ` · ${Math.round(actual.tss)} TSS` : ''}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ) : (
                <p className="t-body text-ink-3">
                  No unmatched uploads for this day. Cancel planned work, or use
                  Pre-swap to change the session before you train.
                </p>
              )}
            </>
          ) : (
            <fieldset className="space-y-2">
              <Label className="t-label text-ink-2">
                Replace with
                {target?.focusSession
                  ? ` (instead of ${target.focusSession.title})`
                  : ''}
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRE_SWAP_SPORTS.map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => setSwapSport(sport)}
                    className={cn(
                      'rounded-control t-label border px-3 py-1.5 transition-colors',
                      swapSport === sport
                        ? 'border-brand bg-brand/10 text-ink-1'
                        : 'border-line text-ink-2 hover:border-line-strong'
                    )}
                  >
                    {SPORT_LABELS[sport] ?? sport}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-2">
            <Label htmlFor="audible-reason" className="t-label text-ink-2">
              Reason
            </Label>
            <Textarea
              id="audible-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Why the day changed…"
            />
          </div>

          {error ? (
            <p className="t-body text-tone-alert" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pb-2">
            <Button
              variant="ghost"
              className="flex-1"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-ink hover:bg-brand/90 flex-1"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Applying…
                </>
              ) : (
                'Apply audible'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ModeChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-control t-label border px-3 py-1.5 transition-colors',
        active
          ? 'border-brand bg-brand/10 text-ink-1'
          : 'border-line text-ink-2 hover:border-line-strong'
      )}
    >
      {label}
    </button>
  )
}

function buildDefaultReason(
  focus: TodaySession | null | undefined,
  unmatched: DayActualView[]
): string {
  const did = unmatched
    .map((a) => SPORT_LABELS[a.sport] ?? a.sport)
    .join(' + ')
  if (focus) {
    return `Did ${did} instead of ${focus.title}.`
  }
  return `Did ${did} instead of the planned session(s).`
}

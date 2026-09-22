'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

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
import { SYMPTOM_SITES } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const SKIP_REASONS = [
  { value: 'pain', label: 'Pain' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'time', label: 'Time' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'other', label: 'Other' },
] as const

export type SessionFeedbackTarget = {
  sessionId: string
  title: string
  status: 'completed' | 'skipped'
}

/**
 * Short post mark-done / skip capture. Links RPE + knee pain to the session
 * so the coach can learn adherence quality, not just checkboxes.
 */
export function SessionFeedbackSheet({
  target,
  onOpenChange,
  onSubmitted,
}: {
  target: SessionFeedbackTarget | null
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
}) {
  const open = target != null
  const skipped = target?.status === 'skipped'

  const [rpe, setRpe] = useState<number | null>(null)
  const [pain, setPain] = useState(0)
  const [site, setSite] = useState('r_knee_medial')
  const [skipReason, setSkipReason] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!target) return
    setRpe(null)
    setPain(0)
    setSite('r_knee_medial')
    setSkipReason(null)
    setNotes('')
  }, [target?.sessionId, target?.status])

  async function submit() {
    if (!target) return
    setSubmitting(true)
    try {
      const noteParts = [
        skipReason ? `Skip reason: ${skipReason}` : null,
        notes.trim() || null,
      ].filter(Boolean)

      const response = await fetch('/api/coach/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symptoms:
            pain > 0
              ? [
                  {
                    site,
                    painScore: pain,
                    context: skipped ? 'rest' : 'after',
                    notes: notes.trim() || undefined,
                  },
                ]
              : undefined,
          feedback: {
            sessionId: target.sessionId,
            rpe: skipped ? undefined : (rpe ?? undefined),
            maxPain: pain,
            notes: noteParts.length ? noteParts.join(' · ') : undefined,
          },
        }),
      })

      const payload = await response.json()
      if (payload.success) {
        onSubmitted?.()
        onOpenChange(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function skipFeedback() {
    onOpenChange(false)
    onSubmitted?.()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{skipped ? 'Why skip?' : 'How was it?'}</SheetTitle>
          <SheetDescription>
            {target?.title ?? 'Session'} — thirty seconds so the coach can learn from this day.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {skipped ? (
            <div>
              <Label className="text-xs">Reason</Label>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {SKIP_REASONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSkipReason(option.value)}
                    className={cn(
                      'rounded px-3 py-1.5 text-xs transition-colors',
                      skipReason === option.value
                        ? 'bg-foreground text-background'
                        : 'bg-muted hover:bg-muted/70'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Scale label="Session RPE" max={10} value={rpe} onChange={setRpe} />
          )}

          <div>
            <Label className="text-xs">
              Knee pain <span className="tabular-nums">{pain}/10</span>
            </Label>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 11 }, (_, value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPain(value)}
                  className={cn(
                    'h-9 flex-1 rounded text-xs tabular-nums transition-colors',
                    pain === value
                      ? value >= 6
                        ? 'bg-accent-rose text-white'
                        : value >= 4
                          ? 'bg-accent-gold text-black'
                          : 'bg-foreground text-background'
                      : 'bg-muted hover:bg-muted/70'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {pain > 0 ? (
            <div>
              <Label className="text-xs">Where</Label>
              <select
                value={site}
                onChange={(event) => setSite(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SYMPTOM_SITES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything the coach should remember"
              rows={2}
              className="mt-1.5 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={skipFeedback} disabled={submitting}>
              Skip
            </Button>
            <Button className="flex-1" onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Scale({
  label,
  max,
  value,
  onChange,
}: {
  label: string
  max: number
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: max }, (_, index) => index + 1).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'h-8 flex-1 rounded text-[11px] tabular-nums transition-colors',
              value === option ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70'
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

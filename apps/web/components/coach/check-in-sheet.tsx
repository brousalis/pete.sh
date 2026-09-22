'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'

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

/**
 * The 30-second check-in.
 *
 * Kept to one screen with no scrolling on a phone, because a check-in that
 * takes two minutes gets skipped, and a skipped check-in means the guardrails
 * are reasoning about a knee they cannot see.
 */
export function CheckInSheet({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
}) {
  const [site, setSite] = useState<string>('r_knee_medial')
  const [pain, setPain] = useState(0)
  const [context, setContext] = useState<'during' | 'after' | 'next_morning' | 'rest'>('rest')
  const [swelling, setSwelling] = useState(false)
  const [locking, setLocking] = useState(false)
  const [instability, setInstability] = useState(false)
  const [rpe, setRpe] = useState<number | null>(null)
  const [sleepQuality, setSleepQuality] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    redFlag: boolean
    planChanged: boolean
    messages: { message: string; remedy?: string }[]
    readiness: { score: number; level: string } | null
  } | null>(null)

  async function submit() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/coach/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symptoms: [{ site, painScore: pain, context, swelling, locking, instability, notes: notes || undefined }],
          feedback: {
            rpe: rpe ?? undefined,
            sleepQuality: sleepQuality ?? undefined,
            notes: notes || undefined,
          },
        }),
      })

      const payload = await response.json()
      if (payload.success) {
        setResult({
          redFlag: payload.data.redFlag,
          planChanged: payload.data.planChanged,
          messages: payload.data.guardrailMessages ?? [],
          readiness: payload.data.readiness ?? null,
        })
        onSubmitted?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setResult(null)
    setPain(0)
    setSwelling(false)
    setLocking(false)
    setInstability(false)
    setRpe(null)
    setSleepQuality(null)
    setNotes('')
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Check in</SheetTitle>
          <SheetDescription>
            Thirty seconds. This is what the guardrails use to decide what you can train.
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <div className="space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {result.redFlag ? (
              <div className="flex gap-2 rounded-md bg-accent-rose/10 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-rose" />
                <div className="text-sm">
                  <p className="font-medium text-accent-rose">Stop training.</p>
                  <p className="mt-1 text-muted-foreground">
                    Mechanical signs were reported. Contact your physical therapist or sports MD
                    before the next session.
                  </p>
                </div>
              </div>
            ) : null}

            {result.readiness ? (
              <p className="text-sm">
                Readiness is now{' '}
                <span className="font-semibold tabular-nums">{result.readiness.score}/100</span> (
                {result.readiness.level}).
              </p>
            ) : null}

            {result.planChanged ? (
              <p className="text-sm text-muted-foreground">
                Today&apos;s plan was adjusted automatically.
              </p>
            ) : null}

            {result.messages.map((message, index) => (
              <div key={index} className="rounded-md bg-muted p-3 text-sm">
                <p>{message.message}</p>
                {message.remedy ? (
                  <p className="mt-1 text-muted-foreground">{message.remedy}</p>
                ) : null}
              </div>
            ))}

            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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

            <div>
              <Label className="text-xs">
                Pain <span className="tabular-nums">{pain}/10</span>
                {pain >= 6 ? (
                  <span className="ml-2 text-accent-rose">stops training</span>
                ) : pain >= 4 ? (
                  <span className="ml-2 text-accent-gold">blocks running</span>
                ) : null}
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

            <div>
              <Label className="text-xs">When</Label>
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                {(['rest', 'during', 'after', 'next_morning'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setContext(option)}
                    className={cn(
                      'rounded px-2 py-1.5 text-[11px] transition-colors',
                      context === option ? 'bg-foreground text-background' : 'bg-muted'
                    )}
                  >
                    {option === 'next_morning' ? 'next AM' : option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Anything mechanical</Label>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                These stop training regardless of the pain score.
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                <Toggle label="Swelling" active={swelling} onToggle={() => setSwelling((v) => !v)} />
                <Toggle label="Locking" active={locking} onToggle={() => setLocking((v) => !v)} />
                <Toggle
                  label="Giving way"
                  active={instability}
                  onToggle={() => setInstability((v) => !v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Scale label="Session RPE" max={10} value={rpe} onChange={setRpe} />
              <Scale label="Sleep quality" max={5} value={sleepQuality} onChange={setSleepQuality} />
            </div>

            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything the coach should know"
                rows={2}
                className="mt-1.5 resize-none"
              />
            </div>

            <Button className="w-full" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Toggle({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'rounded px-2 py-2 text-[11px] transition-colors',
        active ? 'bg-accent-rose text-white' : 'bg-muted hover:bg-muted/70'
      )}
    >
      {label}
    </button>
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

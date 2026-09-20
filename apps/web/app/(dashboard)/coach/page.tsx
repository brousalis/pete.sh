'use client'

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  ClipboardList,
  Loader2,
  Waves,
  Wind,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { CheckInSheet } from '@/components/coach/check-in-sheet'
import { ReadinessPanel } from '@/components/coach/readiness-panel'
import { SessionCard } from '@/components/coach/session-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PtProtocolView, TodayResponse } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

export default function CoachTodayPage() {
  const [data, setData] = useState<TodayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/today', { credentials: 'include' })
      const payload = await response.json()

      if (payload.success) {
        setData(payload.data as TodayResponse)
        setError(null)
      } else {
        setError(payload.error ?? 'Unable to load today')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{error ?? 'No data'}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const redFlag = data.sessions.some(
    (session) => session.guardrail?.severity === 'red_flag'
  )
  const mechanicalSigns = data.symptomsToday.some(
    (symptom) => symptom.swelling || symptom.locking || symptom.instability
  )

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            {new Date(`${data.date}T12:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </h1>
          {data.block ? (
            <p className="text-xs text-muted-foreground">
              Block {data.block.number}: {data.block.name} · {data.block.phase}
            </p>
          ) : null}
        </div>
        <Button size="sm" variant="outline" onClick={() => setCheckInOpen(true)}>
          <ClipboardCheck className="mr-1.5 size-3.5" />
          Check in
        </Button>
      </header>

      {data.onboard && (!data.onboard.intakeComplete || data.onboard.missingTests.length > 0) ? (
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <ClipboardList className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">Finish setup so the plan is not guessing.</p>
              <p className="mt-1 text-muted-foreground">
                {!data.onboard.intakeComplete
                  ? 'The intake interview writes your schedule, knee status and fueling stance as constraints.'
                  : `Still need: ${data.onboard.missingTests.join(', ')}. Week 3 is the official test week.`}
              </p>
              <div className="mt-3 flex gap-2">
                {!data.onboard.intakeComplete ? (
                  <Button size="sm" asChild>
                    <Link href="/coach/onboard">Intake</Link>
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link href="/coach/tests">Baseline tests</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {redFlag || mechanicalSigns ? (
        <Card className="border-accent-rose/50 bg-accent-rose/5">
          <CardContent className="flex gap-3 pt-6">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent-rose" />
            <div className="text-sm">
              <p className="font-semibold text-accent-rose">Training is on hold.</p>
              <p className="mt-1 text-muted-foreground">
                Mechanical signs were reported. Contact your physical therapist or sports MD before
                the next session. Swimming may still be fine if it is completely pain-free, but
                confirm that first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.briefing ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This morning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{data.briefing}</div>
          </CardContent>
        </Card>
      ) : null}

      <ReadinessPanel readiness={data.readiness} />

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sessions
        </h2>
        {data.sessions.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nothing scheduled today.
            </CardContent>
          </Card>
        ) : (
          data.sessions.map((session) => (
            <SessionCard key={session.id} session={session} onComplete={() => void load()} />
          ))
        )}
      </section>

      {data.ptProtocols.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Physical therapy
          </h2>
          {data.ptProtocols.map((protocol) => (
            <PtCard key={protocol.id} protocol={protocol} onChanged={() => void load()} />
          ))}
        </section>
      ) : null}

      {data.conditions ? <ConditionsCard conditions={data.conditions} /> : null}

      {data.load ? (
        <Card>
          <CardContent className="grid grid-cols-4 gap-2 pt-6 text-center">
            <Metric label="Fitness" value={data.load.ctl} />
            <Metric label="Fatigue" value={data.load.atl} />
            <Metric label="Form" value={data.load.tsb} signed />
            <Metric label="ACWR" value={data.load.acwr} decimals={2} />
          </CardContent>
        </Card>
      ) : null}

      <CheckInSheet
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        onSubmitted={() => void load()}
      />
    </div>
  )
}

function PtCard({
  protocol,
  onChanged,
}: {
  protocol: PtProtocolView
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  async function markComplete() {
    setSaving(true)
    try {
      await fetch('/api/coach/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ptCompleted: [{ protocolId: protocol.id }] }),
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={cn(protocol.completed && 'opacity-60')}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{protocol.name}</h3>
              {protocol.mandatory ? (
                <Badge variant="secondary" className="text-[10px]">
                  required
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {protocol.exercises.length} exercises
              {protocol.durationMinutes ? ` · about ${protocol.durationMinutes} min` : ''}
            </p>
          </div>

          {protocol.completed ? (
            <CheckCircle2 className="size-5 shrink-0 text-accent-sage" />
          ) : (
            <Button size="sm" variant="outline" onClick={markComplete} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Done'}
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {expanded ? 'Hide exercises' : 'Show exercises'}
        </button>

        {expanded ? (
          <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
            {protocol.exercises.map((exercise) => (
              <li key={exercise.slug} className="text-xs">
                <span className="font-medium">{exercise.name}</span>
                <span className="text-muted-foreground">
                  {' '}
                  — {formatPrescription(exercise.prescription)}
                </span>
                {exercise.cues ? (
                  <p className="text-[11px] italic text-muted-foreground">{exercise.cues}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ConditionsCard({
  conditions,
}: {
  conditions: NonNullable<TodayResponse['conditions']>
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <Cloud className="size-3.5 text-muted-foreground" />
            {conditions.summary}
          </span>
          {conditions.windMph != null ? (
            <span className="flex items-center gap-1.5">
              <Wind className="size-3.5 text-muted-foreground" />
              {Math.round(conditions.windMph)} mph
              {conditions.windDirection ? ` ${conditions.windDirection}` : ''}
            </span>
          ) : null}
          {conditions.lakeTempF != null ? (
            <span className="flex items-center gap-1.5">
              <Waves className="size-3.5 text-muted-foreground" />
              Lake {Math.round(conditions.lakeTempF)}°F
            </span>
          ) : null}
        </div>

        {conditions.notes.length > 0 ? (
          <ul className="mt-2 space-y-1 border-t border-border pt-2">
            {conditions.notes.map((note, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  value,
  signed,
  decimals = 0,
}: {
  label: string
  value: number | null
  signed?: boolean
  decimals?: number
}) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums">
        {value == null
          ? '—'
          : `${signed && value > 0 ? '+' : ''}${value.toFixed(decimals)}`}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}

function formatPrescription(prescription: Record<string, unknown>): string {
  const parts: string[] = []

  if (prescription.sets) parts.push(`${prescription.sets} sets`)
  if (prescription.reps) parts.push(`${prescription.reps} reps`)
  if (prescription.hold_seconds) parts.push(`${prescription.hold_seconds}s holds`)
  if (prescription.side === 'each') parts.push('each side')
  if (prescription.equipment) parts.push(String(prescription.equipment))

  return parts.length ? parts.join(', ') : 'as prescribed'
}

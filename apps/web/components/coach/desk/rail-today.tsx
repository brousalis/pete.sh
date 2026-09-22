'use client'

import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Loader2,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { CheckInSheet } from '@/components/coach/check-in-sheet'
import {
  SessionFeedbackSheet,
  type SessionFeedbackTarget,
} from '@/components/coach/session-feedback-sheet'
import { ReadinessPanel } from '@/components/coach/readiness-panel'
import { SessionCard } from '@/components/coach/session-card'
import { Metric, MetricRow } from '@/components/coach/ui/metric'
import { Chip, Panel, PanelHeader, Section } from '@/components/coach/ui/panel'
import { acwrTone, tsbTone, type Tone } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
import type { LastNightSleepView, PtProtocolView, TodayResponse } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

export function RailToday({
  data,
  loading,
  error,
  onReload,
  onSessionStatus,
  onCheckInOpen,
}: {
  data: TodayResponse | null
  loading: boolean
  error: string | null
  onReload: () => void
  onSessionStatus?: (
    sessionId: string,
    status: 'completed' | 'skipped'
  ) => Promise<void>
  onCheckInOpen?: (open: boolean) => void
}) {
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [busySessionId, setBusySessionId] = useState<string | null>(null)
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedbackTarget | null>(null)

  function setCheckIn(open: boolean) {
    setCheckInOpen(open)
    onCheckInOpen?.(open)
  }

  async function handleSessionStatus(
    sessionId: string,
    status: 'completed' | 'skipped'
  ): Promise<void> {
    if (!onSessionStatus || busySessionId) return
    const session = data?.sessions.find((row) => row.id === sessionId)
    setBusySessionId(sessionId)
    try {
      await onSessionStatus(sessionId, status)
      setSessionFeedback({
        sessionId,
        title: session?.title ?? 'Session',
        status,
      })
    } finally {
      setBusySessionId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="size-4 animate-spin text-ink-3" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-3 py-20 text-center">
        <p className="t-body text-ink-2">{error ?? 'No data'}</p>
        <Button variant="outline" size="sm" onClick={onReload}>
          Retry
        </Button>
      </div>
    )
  }

  const redFlag = data.sessions.some((session) => session.guardrail?.severity === 'red_flag')
  const mechanicalSigns = data.symptomsToday.some(
    (symptom) => symptom.swelling || symptom.locking || symptom.instability
  )
  const held = redFlag || mechanicalSigns
  const restDay = data.sessions.length === 0

  const verdict: { label: string; tone: Tone } = held
    ? { label: 'Hold', tone: 'alert' }
    : restDay
      ? { label: 'Rest', tone: 'neutral' }
      : { label: 'Train', tone: 'good' }

  const dayLabel = new Date(`${data.date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const peakPain = data.symptomsToday.reduce((max, s) => Math.max(max, s.painScore), 0)
  const setupPending =
    data.onboard && (!data.onboard.intakeComplete || data.onboard.missingTests.length > 0)

  return (
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-display">{dayLabel}</h1>
            <Chip tone={verdict.tone}>{verdict.label}</Chip>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 t-label text-ink-3">
            {data.block ? (
              <span>
                Block {data.block.number} · {data.block.name}
              </span>
            ) : null}
            {data.injuries[0] ? (
              <>
                {data.block ? <span aria-hidden>·</span> : null}
                <span>
                  {data.injuries[0].name}
                  {peakPain > 0 ? ` · pain ${peakPain}/10` : ' · no symptoms today'}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCheckIn(true)}>
          <ClipboardCheck className="mr-1.5 size-4" />
          Check in
        </Button>
      </header>

      {held ? (
        <Panel tone="alert" className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-alert" />
          <div className="min-w-0">
            <p className="t-subtitle text-tone-alert">Training on hold</p>
            <p className="mt-1 t-body text-ink-2">
              Mechanical signs reported. Contact PT or sports MD before the next session.
            </p>
          </div>
        </Panel>
      ) : null}

      {setupPending ? (
        <Panel tone="caution" className="flex gap-3">
          <ClipboardList className="mt-0.5 size-4 shrink-0 text-tone-caution" />
          <div className="min-w-0">
            <p className="t-subtitle">Finish setup</p>
            <p className="mt-1 t-body text-ink-2">
              {!data.onboard?.intakeComplete
                ? 'The intake interview is still open.'
                : `Baseline tests still needed: ${data.onboard.missingTests.join(', ')}`}
            </p>
            <Link
              href={!data.onboard?.intakeComplete ? '/coach/onboard' : '/coach/tests'}
              className="mt-2 inline-block t-label font-medium text-brand underline-offset-4 hover:underline"
            >
              {!data.onboard?.intakeComplete ? 'Open intake' : 'Log baseline tests'}
            </Link>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <ReadinessPanel readiness={data.readiness} />
          {data.lastNightSleep ? <LastNightSleepCard sleep={data.lastNightSleep} /> : null}

          <Section title={restDay ? 'Sessions · rest day' : 'Sessions'}>
            {restDay ? (
              <Panel>
                <p className="t-body text-ink-2">
                  No sessions today. Morning Activation and Evening Armor still count.
                </p>
              </Panel>
            ) : (
              <div className="space-y-2.5">
                {data.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    busy={busySessionId === session.id}
                    onComplete={
                      onSessionStatus
                        ? (sessionId) => void handleSessionStatus(sessionId, 'completed')
                        : undefined
                    }
                    onSkip={
                      onSessionStatus
                        ? (sessionId) => void handleSessionStatus(sessionId, 'skipped')
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </Section>

          {data.ptProtocols.length > 0 ? (
            <Section
              title="Physical therapy"
              action={
                <span className="t-num t-num-sm text-ink-3">
                  {data.ptProtocols.filter((p) => p.completed).length}/{data.ptProtocols.length}
                </span>
              }
            >
              <div className="space-y-1.5">
                {data.ptProtocols.map((protocol) => (
                  <PtRow key={protocol.id} protocol={protocol} onChanged={onReload} />
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4">
          {data.load ? (
            <Panel>
              <PanelHeader label="Load" className="mb-3" />
              <MetricRow>
                <Metric label="CTL" value={data.load.ctl} size="sm" align="center" />
                <Metric label="ATL" value={data.load.atl} size="sm" align="center" />
                <Metric
                  label="TSB"
                  value={data.load.tsb}
                  size="sm"
                  align="center"
                  signed
                  tone={tsbTone(data.load.tsb)}
                />
                <Metric
                  label="ACWR"
                  value={data.load.acwr}
                  size="sm"
                  align="center"
                  decimals={2}
                  tone={acwrTone(data.load.acwr)}
                />
              </MetricRow>
            </Panel>
          ) : null}

          {data.briefing ? <MorningBriefing text={data.briefing} /> : null}

          {data.conditions ? <ConditionsPanel conditions={data.conditions} /> : null}
        </aside>
      </div>

      <CheckInSheet open={checkInOpen} onOpenChange={setCheckIn} onSubmitted={onReload} />
      <SessionFeedbackSheet
        target={sessionFeedback}
        onOpenChange={(open) => {
          if (!open) setSessionFeedback(null)
        }}
        onSubmitted={onReload}
      />
    </div>
  )
}

function ConditionsPanel({
  conditions,
}: {
  conditions: NonNullable<TodayResponse['conditions']>
}) {
  return (
    <Panel>
      <PanelHeader label="Conditions" className="mb-2.5" />
      <p className="t-body text-ink-1">{conditions.summary}</p>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {conditions.temperatureF != null ? (
          <Fact icon={<Thermometer className="size-3.5" />}>
            {Math.round(conditions.temperatureF)}°F
          </Fact>
        ) : null}
        {conditions.windMph != null ? (
          <Fact icon={<Wind className="size-3.5" />}>
            {Math.round(conditions.windMph)} mph {conditions.windDirection ?? ''}
          </Fact>
        ) : null}
        {conditions.lakeTempF != null ? (
          <Fact icon={<Waves className="size-3.5" />}>
            Lake {Math.round(conditions.lakeTempF)}°F
          </Fact>
        ) : null}
        {conditions.temperatureF == null && conditions.windMph == null ? (
          <Fact icon={<Cloud className="size-3.5" />}>No reading</Fact>
        ) : null}
      </div>
      {conditions.notes.length > 0 ? (
        <ul className="mt-2.5 space-y-1 border-t border-line pt-2.5">
          {conditions.notes.map((note, index) => (
            <li key={index} className="t-label text-ink-3">
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 t-label text-ink-2">
      <span className="text-ink-3">{icon}</span>
      {children}
    </span>
  )
}

function LastNightSleepCard({ sleep }: { sleep: LastNightSleepView }) {
  const stages = [
    sleep.deepMinutes != null ? `Deep ${sleep.deepMinutes}m` : null,
    sleep.remMinutes != null ? `REM ${sleep.remMinutes}m` : null,
    sleep.coreMinutes != null ? `Core ${sleep.coreMinutes}m` : null,
    sleep.awakeMinutes != null ? `Awake ${sleep.awakeMinutes}m` : null,
  ].filter(Boolean)

  return (
    <Panel>
      <PanelHeader label="Last night" className="mb-3" />
      <MetricRow>
        <Metric label="Asleep" value={sleep.hours} unit="h" size="sm" align="center" decimals={1} />
        <Metric
          label="In bed"
          value={sleep.inBedHours}
          unit="h"
          size="sm"
          align="center"
          decimals={1}
        />
        <Metric
          label="Efficiency"
          value={sleep.efficiencyPct}
          unit="%"
          size="sm"
          align="center"
        />
      </MetricRow>
      {stages.length > 0 ? (
        <p className="mt-2.5 t-label text-ink-3">{stages.join(' · ')}</p>
      ) : null}
      {sleep.breathingDisturbancesElevated ? (
        <p className="mt-1.5 t-label text-tone-caution">Elevated breathing disturbances</p>
      ) : null}
    </Panel>
  )
}

function MorningBriefing({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 260

  return (
    <Panel>
      <PanelHeader
        label="This morning"
        action={
          long ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="t-label font-medium text-ink-3 transition-colors hover:text-ink-1"
            >
              {open ? 'Less' : 'Read all'}
            </button>
          ) : undefined
        }
        className="mb-2"
      />
      <p className={cn('whitespace-pre-wrap t-body text-ink-2', !open && long && 'line-clamp-5')}>
        {text}
      </p>
    </Panel>
  )
}

function PtRow({ protocol, onChanged }: { protocol: PtProtocolView; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [askPain, setAskPain] = useState(false)
  const [ptPain, setPtPain] = useState(0)

  const contextLabel =
    protocol.timeOfDay === 'pre_session'
      ? 'Before today’s run'
      : protocol.timeOfDay === 'post_session'
        ? 'After today’s run'
        : protocol.timeOfDay === 'morning'
          ? 'Morning'
          : protocol.timeOfDay === 'evening'
            ? 'Evening'
            : null

  async function commitComplete(painScore: number) {
    setSaving(true)
    try {
      await fetch('/api/coach/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ptCompleted: [{ protocolId: protocol.id }],
          symptoms:
            painScore > 0
              ? [
                  {
                    site: 'r_knee_medial',
                    painScore,
                    context: 'during',
                    notes: `During ${protocol.name}`,
                  },
                ]
              : undefined,
        }),
      })
      setAskPain(false)
      setPtPain(0)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function markComplete(event: React.MouseEvent) {
    event.stopPropagation()
    if (protocol.completed || saving) return
    setAskPain(true)
  }

  return (
    <Panel className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={protocol.completed || saving}
          onClick={(event) => void markComplete(event)}
          aria-label={protocol.completed ? 'Completed' : `Mark ${protocol.name} done`}
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors',
            protocol.completed
              ? 'border-tone-good bg-tone-good text-surface-0'
              : 'border-line-strong hover:border-ink-2 hover:bg-surface-2'
          )}
        >
          {saving ? (
            <Loader2 className="size-3 animate-spin text-ink-2" />
          ) : protocol.completed ? (
            <Check className="size-3.5" strokeWidth={3} />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <p className={cn('t-body font-medium', protocol.completed && 'text-ink-3 line-through')}>
            {protocol.name}
          </p>
          <p className="mt-0.5 t-label text-ink-3">
            {contextLabel ? `${contextLabel} · ` : ''}
            {protocol.exercises.length} exercises
            {protocol.durationMinutes ? ` · ~${protocol.durationMinutes} min` : ''}
            {protocol.mandatory ? ' · required' : ''}
          </p>
        </button>

        {!protocol.completed ? (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/coach/pt/${protocol.slug}?view=remote`}>Start</Link>
          </Button>
        ) : null}
      </div>

      {askPain && !protocol.completed ? (
        <div className="mt-2.5 space-y-2 border-t border-line pt-2.5 pl-8">
          <p className="t-label text-ink-2">Pain during this block? (0 = none)</p>
          <div className="flex gap-1">
            {Array.from({ length: 11 }, (_, value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPtPain(value)}
                className={cn(
                  'h-8 flex-1 rounded text-[11px] tabular-nums transition-colors',
                  ptPain === value
                    ? 'bg-foreground text-background'
                    : 'bg-muted hover:bg-muted/70'
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setAskPain(false)
                setPtPain(0)
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void commitComplete(ptPain)}>
              {saving ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <ul className="animate-fade-in-up mt-2.5 space-y-1.5 border-t border-line pt-2.5 pl-8">
          {protocol.exercises.map((exercise) => (
            <li key={exercise.slug} className="t-label">
              <span className="text-ink-1">{exercise.name}</span>
              <span className="text-ink-3"> — {formatPrescription(exercise.prescription)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
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

/** Shared fetch hook for Today data used by desk + rail. */
export function useTodayData() {
  const [data, setData] = useState<TodayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const setSessionStatus = useCallback(
    async (sessionId: string, status: 'completed' | 'skipped') => {
      const response = await fetch(`/api/coach/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!payload.success) {
        throw new Error(payload.error ?? 'Unable to update session')
      }

      // Reload so linked workout glances appear after Mark done attaches an activity.
      await load()
    },
    [load]
  )

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load, setSessionStatus }
}

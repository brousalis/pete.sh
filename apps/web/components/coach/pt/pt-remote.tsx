'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  ChevronLeft,
  Copy,
  Loader2,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { PtCountdownRing } from '@/components/coach/pt/pt-countdown-ring'
import { usePtSession } from '@/components/coach/pt/pt-session-provider'
import { Button } from '@/components/ui/button'
import { exerciseList } from '@/lib/coach/pt/pt-state-machine'
import { cn } from '@/lib/utils'

export function PtRemote() {
  const {
    protocol,
    state,
    remaining,
    dispatch,
    createSyncedSession,
    displayUrl,
    sessionId,
    loading,
    error,
  } = usePtSession()

  const [busy, setBusy] = useState(false)
  const [pairing, setPairing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [endConfirm, setEndConfirm] = useState(false)
  const [painScore, setPainScore] = useState(0)
  const [savingDone, setSavingDone] = useState(false)
  const [finished, setFinished] = useState(false)

  const step = state.steps[state.stepIndex] ?? null
  const exercises = exerciseList(state)
  const isTimed = step?.durationMs != null && step.kind !== 'rep'
  const totalMs = state.phaseDurationMs ?? step?.durationMs ?? 1

  async function run(command: Parameters<typeof dispatch>[0]) {
    setBusy(true)
    try {
      await dispatch(command)
    } finally {
      setBusy(false)
    }
  }

  async function handlePlay() {
    setBusy(true)
    try {
      if (!sessionId) {
        setPairing(true)
        await createSyncedSession()
      }
      await dispatch({ type: 'play' })
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  async function copyDisplayLink() {
    if (!displayUrl) return
    await navigator.clipboard.writeText(displayUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  async function saveCompletion() {
    setSavingDone(true)
    try {
      await fetch('/api/coach/pt/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          protocolId: protocol.id,
          protocolName: protocol.name,
          completedItemIds: state.completedExerciseIds,
          painScore,
        }),
      })
      setFinished(true)
    } finally {
      setSavingDone(false)
    }
  }

  // Space to pause/resume when remote is focused (also helps single-device).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return
      event.preventDefault()
      if (state.status === 'running') void run({ type: 'pause' })
      else if (state.status === 'paused') void run({ type: 'resume' })
      else if (state.status === 'idle') void handlePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, sessionId])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-0">
        <Loader2 className="size-5 animate-spin text-ink-3" />
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-0 px-6 text-center">
        <Check className="size-10 text-tone-good" />
        <h1 className="text-2xl font-semibold">{protocol.name} logged</h1>
        <Button asChild>
          <Link href="/coach">Back to today</Link>
        </Button>
      </div>
    )
  }

  if (state.status === 'completed') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 bg-surface-0 px-5 py-8">
        <div>
          <p className="t-label text-ink-3">Block complete</p>
          <h1 className="mt-1 text-2xl font-semibold">{protocol.name}</h1>
          <p className="mt-2 t-body text-ink-2">Pain during this block? (0 = none)</p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 11 }, (_, value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPainScore(value)}
              className={cn(
                'h-11 flex-1 rounded-md text-sm tabular-nums transition-colors',
                painScore === value ? 'bg-ink-1 text-surface-0' : 'bg-surface-2 hover:bg-surface-2/80'
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <Button size="lg" className="h-14" disabled={savingDone} onClick={() => void saveCompletion()}>
          {savingDone ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save & finish
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-surface-0 pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <Link href="/coach" className="inline-flex items-center gap-1 t-label text-ink-2">
          <ChevronLeft className="size-4" />
          Today
        </Link>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface-2"
          onClick={() => void run({ type: 'set_audio', enabled: !state.audioEnabled })}
          aria-label={state.audioEnabled ? 'Mute cues' : 'Enable cues'}
        >
          {state.audioEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
      </header>

      <div className="flex-1 space-y-5 px-5 py-5">
        <div>
          <p className="t-label text-ink-3">{protocol.name}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">
            {step?.exerciseName ?? step?.label ?? 'Ready'}
          </h1>
          {step?.cues ? <p className="mt-2 t-body text-ink-2">{step.cues}</p> : null}
          {step ? (
            <p className="mt-1 t-label text-ink-3">
              Exercise {step.exerciseIndex + 1}/{step.exerciseCount}
              {step.setCount > 0 ? ` · Set ${step.setIndex + 1}/${step.setCount}` : ''}
              {step.side ? ` · ${step.side}` : ''}
            </p>
          ) : null}
        </div>

        {error ? <p className="t-label text-tone-alert">{error}</p> : null}

        <div className="flex justify-center py-2">
          {state.status === 'idle' ? (
            <div className="text-center">
              <p className="text-ink-2">Press play when you&apos;re ready to get on the floor.</p>
            </div>
          ) : step?.kind === 'rep' ? (
            <div className="text-center">
              <p className="text-6xl font-semibold tabular-nums">
                {state.currentReps}
                <span className="text-ink-3"> / {step.targetReps}</span>
              </p>
              <p className="mt-1 t-label text-ink-3">Reps</p>
            </div>
          ) : isTimed ? (
            <PtCountdownRing
              remainingMs={remaining ?? totalMs}
              totalMs={totalMs}
              size="md"
              label={step?.kind === 'rest' ? 'Rest' : undefined}
            />
          ) : (
            <p className="t-body text-ink-2">{step?.label}</p>
          )}
        </div>

        {(pairing || displayUrl) && state.status !== 'idle' ? (
          <div className="space-y-2 rounded-xl border border-line bg-surface-1 p-3">
            <p className="t-label text-ink-2">Open on your display (PC)</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                onClick={() => void copyDisplayLink()}
              >
                <Copy className="mr-2 size-4" />
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
            {displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="QR code for display"
                className="mx-auto size-40 rounded-md bg-white p-2"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(displayUrl)}`}
              />
            ) : null}
          </div>
        ) : null}

        {jumpOpen ? (
          <div className="space-y-1 rounded-xl border border-line p-2">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-surface-2"
                onClick={() => {
                  setJumpOpen(false)
                  void run({ type: 'goto_exercise', exerciseId: ex.id })
                }}
              >
                <span className="t-body">{ex.name}</span>
                {state.completedExerciseIds.includes(ex.id) ? (
                  <Check className="size-4 text-tone-good" />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 space-y-2 border-t border-line bg-surface-0/95 px-4 py-3 backdrop-blur">
        {step?.kind === 'rep' && state.status === 'running' ? (
          <Button
            size="lg"
            className="h-16 w-full text-lg"
            disabled={busy}
            onClick={() => void run({ type: 'inc_rep' })}
          >
            +1 Rep
          </Button>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          {state.status === 'idle' ? (
            <Button
              size="lg"
              className="col-span-3 h-16 text-lg"
              disabled={busy}
              onClick={() => void handlePlay()}
            >
              {busy ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Play className="mr-2 size-5" />}
              Play
            </Button>
          ) : state.status === 'paused' ? (
            <Button
              size="lg"
              className="col-span-3 h-16 text-lg"
              disabled={busy}
              onClick={() => void run({ type: 'resume' })}
            >
              <Play className="mr-2 size-5" />
              Resume
            </Button>
          ) : (
            <Button
              size="lg"
              variant="secondary"
              className="col-span-3 h-16 text-lg"
              disabled={busy}
              onClick={() => void run({ type: 'pause' })}
            >
              <Pause className="mr-2 size-5" />
              Pause
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="h-12"
            disabled={busy || state.status === 'idle'}
            onClick={() => void run({ type: 'previous_step' })}
          >
            Back
          </Button>
          <Button
            variant="outline"
            className="h-12"
            disabled={busy || step?.kind !== 'rest'}
            onClick={() => void run({ type: 'add_rest', seconds: 30 })}
          >
            +30s
          </Button>
          <Button
            variant="outline"
            className="h-12"
            disabled={busy || state.status === 'idle'}
            onClick={() => void run({ type: 'skip_step' })}
          >
            <SkipForward className="mr-1 size-4" />
            Skip
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="h-11" onClick={() => setJumpOpen((v) => !v)}>
            Jump to…
          </Button>
          <Button
            variant="ghost"
            className="h-11"
            disabled={busy || !step?.exerciseId || state.status === 'idle'}
            onClick={() => void run({ type: 'skip_exercise' })}
          >
            Skip exercise
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {endConfirm ? (
            <Button
              variant="destructive"
              className="h-11"
              disabled={busy}
              onClick={() => void run({ type: 'end' })}
            >
              Confirm end
            </Button>
          ) : (
            <Button variant="ghost" className="h-11 text-ink-2" onClick={() => setEndConfirm(true)}>
              End session
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { PtCountdownRing } from '@/components/coach/pt/pt-countdown-ring'
import { PtDemoVideo } from '@/components/coach/pt/pt-demo-video'
import { usePtSession } from '@/components/coach/pt/pt-session-provider'
import { cn } from '@/lib/utils'

function phaseLabel(kind: string): string {
  switch (kind) {
    case 'pre_roll':
      return 'Get ready'
    case 'intro':
      return 'Up next'
    case 'hold':
      return 'Hold'
    case 'timed_rep':
      return 'Hold'
    case 'pnf_contract':
      return 'Contract'
    case 'pnf_stretch':
      return 'Relax'
    case 'side_switch':
      return 'Switch sides'
    case 'rest':
      return 'Rest'
    case 'rep':
      return 'Reps'
    default:
      return ''
  }
}

export function PtDisplay() {
  const { state, remaining, protocol, loading, error, dispatch } = usePtSession()
  const step = state.steps[state.stepIndex] ?? null
  const paused = state.status === 'paused'
  const done = state.status === 'completed'

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      event.preventDefault()
      if (state.status === 'running') void dispatch({ type: 'pause' })
      else if (state.status === 'paused') void dispatch({ type: 'resume' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.status, dispatch])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-white/60">
        Connecting…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-white">
        <p className="text-lg">{error}</p>
        <Link href={`/coach/pt/${protocol.slug}?view=remote`} className="underline text-white/70">
          Open remote
        </Link>
      </div>
    )
  }

  if (state.status === 'idle') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-8 text-center text-white">
        <p className="text-sm uppercase tracking-[0.25em] text-white/45">Waiting for remote</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{protocol.name}</h1>
        <p className="max-w-md text-white/55">
          Open the same page on your phone, tap Play, then open the display link shown there.
        </p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-8 text-center text-white">
        <p className="text-sm uppercase tracking-[0.25em] text-white/45">Done</p>
        <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">{protocol.name}</h1>
        <p className="text-white/55">Log pain on the remote to finish.</p>
      </div>
    )
  }

  const totalMs = state.phaseDurationMs ?? step?.durationMs ?? 1
  const left = remaining ?? totalMs
  const isTimed =
    step &&
    step.durationMs != null &&
    step.kind !== 'rep' &&
    (state.status === 'running' || state.status === 'paused')
  const exerciseProgress = step
    ? `${Math.min(step.exerciseIndex + 1, step.exerciseCount)} / ${step.exerciseCount}`
    : ''

  return (
    <div className="relative flex min-h-dvh flex-col bg-zinc-950 text-white">
      {paused ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <p className="text-4xl font-semibold tracking-[0.3em] uppercase text-white/90 md:text-6xl">
            Paused
          </p>
        </div>
      ) : null}

      <header className="flex items-center justify-between px-6 py-4 md:px-10">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">{protocol.name}</p>
          <p className="mt-1 text-sm text-white/55">Exercise {exerciseProgress}</p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: step?.exerciseCount ?? 0 }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 w-6 rounded-full',
                i < (step?.exerciseIndex ?? 0)
                  ? 'bg-white/80'
                  : i === (step?.exerciseIndex ?? 0)
                    ? 'bg-white'
                    : 'bg-white/20'
              )}
            />
          ))}
        </div>
      </header>

      <div className="grid flex-1 grid-rows-[minmax(0,1fr)_minmax(180px,32vh)] gap-4 px-6 pb-8 md:px-10">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-white/45">
            {step ? phaseLabel(step.kind) : ''}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            {step?.exerciseName ?? step?.label ?? protocol.name}
          </h1>
          {step?.cues ? (
            <p className="max-w-2xl text-lg text-white/60 md:text-xl">{step.cues}</p>
          ) : null}
          {step?.label && step.kind !== 'intro' && step.kind !== 'pre_roll' ? (
            <p className="text-base text-white/45">{step.label}</p>
          ) : null}

          <div className="mt-2">
            {step?.kind === 'rep' ? (
              <div className="flex flex-col items-center">
                <span className="text-8xl font-semibold tabular-nums tracking-tight md:text-9xl">
                  {state.currentReps}
                  <span className="text-white/35"> / {step.targetReps ?? 0}</span>
                </span>
                <span className="mt-2 text-sm uppercase tracking-[0.2em] text-white/45">Reps</span>
              </div>
            ) : isTimed ? (
              <PtCountdownRing
                remainingMs={left}
                totalMs={totalMs}
                label={phaseLabel(step!.kind)}
              />
            ) : (
              <p className="text-2xl text-white/50">{step?.label}</p>
            )}
          </div>
        </div>

        <PtDemoVideo
          youtubeId={step?.demoYoutubeId}
          startSeconds={step?.demoStartSeconds}
          loopSeconds={step?.demoLoopSeconds}
          className="mx-auto w-full max-w-4xl rounded-2xl aspect-video"
        />
      </div>
    </div>
  )
}

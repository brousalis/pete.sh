/**
 * PT player state machine.
 *
 * Timed phases are driven by phaseStartedAt + phaseDurationMs so display and
 * remote stay aligned without sharing a live clock. Pause freezes remaining ms.
 */

import { expandProtocol } from './expand-protocol'
import type {
  PtPlayerCommand,
  PtPlayerState,
  PtPlayerStep,
  PtProtocolInput,
} from './pt-types'

function nowIso(at: Date = new Date()): string {
  return at.toISOString()
}

function currentStep(state: PtPlayerState): PtPlayerStep | null {
  return state.steps[state.stepIndex] ?? null
}

function markExerciseDone(state: PtPlayerState, exerciseId: string | null): string[] {
  if (!exerciseId) return state.completedExerciseIds
  if (state.completedExerciseIds.includes(exerciseId)) return state.completedExerciseIds
  return [...state.completedExerciseIds, exerciseId]
}

function startTimedPhase(
  state: PtPlayerState,
  step: PtPlayerStep,
  at: Date
): PtPlayerState {
  const duration = step.durationMs
  if (duration == null || duration <= 0) {
    return {
      ...state,
      status: 'running',
      phaseStartedAt: null,
      phaseDurationMs: null,
      pausedRemainingMs: null,
      currentReps: 0,
      serverTime: nowIso(at),
    }
  }
  return {
    ...state,
    status: 'running',
    phaseStartedAt: nowIso(at),
    phaseDurationMs: duration,
    pausedRemainingMs: null,
    currentReps: 0,
    serverTime: nowIso(at),
  }
}

function enterStep(state: PtPlayerState, stepIndex: number, at: Date): PtPlayerState {
  if (stepIndex >= state.steps.length) {
    return {
      ...state,
      status: 'completed',
      stepIndex: state.steps.length,
      phaseStartedAt: null,
      phaseDurationMs: null,
      pausedRemainingMs: null,
      currentReps: 0,
      serverTime: nowIso(at),
    }
  }

  const step = state.steps[stepIndex]!
  const next: PtPlayerState = {
    ...state,
    stepIndex,
    currentReps: 0,
  }
  return startTimedPhase(next, step, at)
}

/**
 * Remaining ms for the active timed phase. Null when not timed / idle.
 */
export function remainingMs(state: PtPlayerState, at: Date = new Date()): number | null {
  if (state.status === 'paused') return state.pausedRemainingMs
  if (state.status !== 'running') return null
  if (state.phaseStartedAt == null || state.phaseDurationMs == null) return null
  const elapsed = at.getTime() - new Date(state.phaseStartedAt).getTime()
  return Math.max(0, state.phaseDurationMs - elapsed)
}

export function createInitialState(protocol: PtProtocolInput, at: Date = new Date()): PtPlayerState {
  const steps = expandProtocol(protocol)
  return {
    protocolId: protocol.id,
    protocolSlug: protocol.slug,
    protocolName: protocol.name,
    status: 'idle',
    stepIndex: 0,
    steps,
    phaseStartedAt: null,
    phaseDurationMs: steps[0]?.durationMs ?? null,
    pausedRemainingMs: null,
    currentReps: 0,
    completedExerciseIds: [],
    skippedExerciseIds: [],
    audioEnabled: true,
    serverTime: nowIso(at),
  }
}

function advanceAfterStep(state: PtPlayerState, at: Date): PtPlayerState {
  const step = currentStep(state)
  let completed = state.completedExerciseIds
  if (step?.exerciseId && !state.skippedExerciseIds.includes(step.exerciseId)) {
    const next = state.steps[state.stepIndex + 1]
    const leavingExercise = !next || next.exerciseId !== step.exerciseId
    if (leavingExercise) completed = markExerciseDone(state, step.exerciseId)
  }

  return enterStep({ ...state, completedExerciseIds: completed }, state.stepIndex + 1, at)
}

function skipCurrentExercise(state: PtPlayerState, at: Date): PtPlayerState {
  const step = currentStep(state)
  if (!step?.exerciseId) return advanceAfterStep(state, at)

  const exerciseId = step.exerciseId
  let nextIndex = state.stepIndex + 1
  while (nextIndex < state.steps.length && state.steps[nextIndex]?.exerciseId === exerciseId) {
    nextIndex += 1
  }

  const skipped = state.skippedExerciseIds.includes(exerciseId)
    ? state.skippedExerciseIds
    : [...state.skippedExerciseIds, exerciseId]

  return enterStep(
    {
      ...state,
      skippedExerciseIds: skipped,
    },
    nextIndex,
    at
  )
}

function gotoExercise(state: PtPlayerState, exerciseId: string, at: Date): PtPlayerState {
  const index = state.steps.findIndex(
    (step) => step.exerciseId === exerciseId && step.kind === 'intro'
  )
  if (index < 0) return { ...state, serverTime: nowIso(at) }
  return enterStep(state, index, at)
}

function previousStep(state: PtPlayerState, at: Date): PtPlayerState {
  if (state.stepIndex <= 0) return enterStep(state, 0, at)
  return enterStep(state, state.stepIndex - 1, at)
}

/**
 * Apply a remote command. Pure: returns the next state.
 */
export function applyCommand(
  state: PtPlayerState,
  command: PtPlayerCommand,
  at: Date = new Date()
): PtPlayerState {
  if (state.status === 'completed' || state.status === 'abandoned') {
    if (command.type === 'end') {
      return { ...state, status: 'abandoned', serverTime: nowIso(at) }
    }
    return { ...state, serverTime: nowIso(at) }
  }

  switch (command.type) {
    case 'play': {
      if (state.status === 'idle') return enterStep(state, 0, at)
      if (state.status === 'paused') return applyCommand(state, { type: 'resume' }, at)
      return { ...state, serverTime: nowIso(at) }
    }

    case 'pause': {
      if (state.status !== 'running') return { ...state, serverTime: nowIso(at) }
      const left = remainingMs(state, at)
      return {
        ...state,
        status: 'paused',
        phaseStartedAt: null,
        pausedRemainingMs: left,
        serverTime: nowIso(at),
      }
    }

    case 'resume': {
      if (state.status !== 'paused') return { ...state, serverTime: nowIso(at) }
      const left = state.pausedRemainingMs
      if (left == null) {
        // Untimed phase (reps) — just resume.
        return {
          ...state,
          status: 'running',
          pausedRemainingMs: null,
          serverTime: nowIso(at),
        }
      }
      return {
        ...state,
        status: 'running',
        phaseStartedAt: nowIso(at),
        phaseDurationMs: left,
        pausedRemainingMs: null,
        serverTime: nowIso(at),
      }
    }

    case 'complete_step': {
      if (state.status === 'idle') return enterStep(state, 0, at)
      return advanceAfterStep(state, at)
    }

    case 'skip_step': {
      if (state.status === 'idle') return enterStep(state, 0, at)
      return advanceAfterStep(state, at)
    }

    case 'skip_exercise': {
      if (state.status === 'idle') return enterStep(state, 0, at)
      return skipCurrentExercise(state, at)
    }

    case 'previous_step': {
      return previousStep(state, at)
    }

    case 'goto_exercise': {
      return gotoExercise(state, command.exerciseId, at)
    }

    case 'add_rest': {
      const step = currentStep(state)
      if (!step || step.kind !== 'rest') return { ...state, serverTime: nowIso(at) }
      const addMs = Math.max(0, command.seconds) * 1000
      if (state.status === 'paused') {
        return {
          ...state,
          pausedRemainingMs: (state.pausedRemainingMs ?? 0) + addMs,
          phaseDurationMs: (state.phaseDurationMs ?? 0) + addMs,
          serverTime: nowIso(at),
        }
      }
      if (state.status === 'running' && state.phaseDurationMs != null) {
        return {
          ...state,
          phaseDurationMs: state.phaseDurationMs + addMs,
          serverTime: nowIso(at),
        }
      }
      return { ...state, serverTime: nowIso(at) }
    }

    case 'inc_rep': {
      const step = currentStep(state)
      if (!step || step.kind !== 'rep' || state.status === 'paused') {
        return { ...state, serverTime: nowIso(at) }
      }
      const nextReps = state.currentReps + 1
      const target = step.targetReps ?? 1
      if (nextReps >= target) {
        return advanceAfterStep({ ...state, currentReps: nextReps }, at)
      }
      return {
        ...state,
        status: 'running',
        currentReps: nextReps,
        serverTime: nowIso(at),
      }
    }

    case 'end': {
      return {
        ...state,
        status: 'abandoned',
        phaseStartedAt: null,
        pausedRemainingMs: remainingMs(state, at),
        serverTime: nowIso(at),
      }
    }

    case 'set_audio': {
      return {
        ...state,
        audioEnabled: command.enabled,
        serverTime: nowIso(at),
      }
    }

    default: {
      return { ...state, serverTime: nowIso(at) }
    }
  }
}

/**
 * If a timed phase has elapsed, advance. Call from remote tick / display poll.
 */
export function tick(state: PtPlayerState, at: Date = new Date()): PtPlayerState {
  if (state.status !== 'running') return { ...state, serverTime: nowIso(at) }
  const step = currentStep(state)
  if (!step || step.durationMs == null) return { ...state, serverTime: nowIso(at) }
  const left = remainingMs(state, at)
  if (left == null || left > 0) return { ...state, serverTime: nowIso(at) }
  return advanceAfterStep(state, at)
}

export function exerciseList(state: PtPlayerState): {
  id: string
  slug: string
  name: string
}[] {
  const seen = new Set<string>()
  const list: { id: string; slug: string; name: string }[] = []
  for (const step of state.steps) {
    if (!step.exerciseId || seen.has(step.exerciseId)) continue
    seen.add(step.exerciseId)
    list.push({
      id: step.exerciseId,
      slug: step.exerciseSlug ?? '',
      name: step.exerciseName ?? '',
    })
  }
  return list
}

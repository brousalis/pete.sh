/**
 * PT player domain types — shared by expand, state machine, API, and UI.
 */

export type PtPhaseKind =
  | 'pre_roll'
  | 'intro'
  | 'hold'
  | 'rep'
  | 'timed_rep'
  | 'pnf_contract'
  | 'pnf_stretch'
  | 'side_switch'
  | 'rest'
  | 'complete'

export type PtSide = 'left' | 'right'

export interface PtExerciseInput {
  id: string
  slug: string
  name: string
  category: string
  prescription: Record<string, unknown>
  cues: string | null
  demoYoutubeId?: string | null
  demoStartSeconds?: number | null
  demoLoopSeconds?: number | null
}

export interface PtProtocolInput {
  id: string
  slug: string
  name: string
  timeOfDay: string
  durationMinutes: number | null
  description: string | null
  items: PtExerciseInput[]
}

export interface PtPlayerStep {
  id: string
  kind: Exclude<PtPhaseKind, 'complete'>
  exerciseId: string | null
  exerciseSlug: string | null
  exerciseName: string | null
  cues: string | null
  setIndex: number
  setCount: number
  side: PtSide | null
  durationMs: number | null
  targetReps: number | null
  exerciseIndex: number
  exerciseCount: number
  demoYoutubeId: string | null
  demoStartSeconds: number
  demoLoopSeconds: number
  equipment: string | null
  label: string
}

export type PtPlayerStatus = 'idle' | 'running' | 'paused' | 'completed' | 'abandoned'

export interface PtPlayerState {
  protocolId: string
  protocolSlug: string
  protocolName: string
  status: PtPlayerStatus
  stepIndex: number
  steps: PtPlayerStep[]
  /** ISO timestamp when the current timed phase started (running only). */
  phaseStartedAt: string | null
  /** Total duration of the current timed phase. */
  phaseDurationMs: number | null
  /** Remaining ms snapshot while paused. */
  pausedRemainingMs: number | null
  currentReps: number
  completedExerciseIds: string[]
  skippedExerciseIds: string[]
  audioEnabled: boolean
  serverTime: string
}

export type PtPlayerCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'complete_step' }
  | { type: 'add_rest'; seconds: number }
  | { type: 'skip_step' }
  | { type: 'skip_exercise' }
  | { type: 'previous_step' }
  | { type: 'goto_exercise'; exerciseId: string }
  | { type: 'inc_rep' }
  | { type: 'end' }
  | { type: 'set_audio'; enabled: boolean }

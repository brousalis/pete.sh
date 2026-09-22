/**
 * Expand a PT protocol into an ordered list of playable steps.
 *
 * Prescription shapes from the PT seed:
 * - Hold only: { sets, hold_seconds }
 * - Manual reps: { sets?, reps, side? }
 * - Timed reps: { sets, reps, hold_seconds } — each rep is a countdown
 * - PNF: { sets, side, contract_seconds, stretch_seconds }
 */

import type { PtExerciseInput, PtPlayerStep, PtProtocolInput, PtSide } from './pt-types'

const PRE_ROLL_MS = 15_000
const INTRO_MS = 2_000
const SIDE_SWITCH_MS = 5_000
const DEFAULT_REST_MS = 30_000

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function sidesFor(prescription: Record<string, unknown>): Array<PtSide | null> {
  return prescription.side === 'each' ? ['left', 'right'] : [null]
}

function setCount(prescription: Record<string, unknown>): number {
  const sets = num(prescription.sets, 0)
  return sets > 0 ? sets : 1
}

function modeFor(
  prescription: Record<string, unknown>
): 'pnf' | 'hold' | 'timed_rep' | 'rep' {
  const contract = num(prescription.contract_seconds)
  const stretch = num(prescription.stretch_seconds)
  if (contract > 0 && stretch > 0) return 'pnf'

  const hold = num(prescription.hold_seconds)
  const reps = num(prescription.reps)
  if (hold > 0 && reps > 0) return 'timed_rep'
  if (hold > 0) return 'hold'
  return 'rep'
}

function demoFields(exercise: PtExerciseInput): Pick<
  PtPlayerStep,
  'demoYoutubeId' | 'demoStartSeconds' | 'demoLoopSeconds'
> {
  return {
    demoYoutubeId: exercise.demoYoutubeId ?? null,
    demoStartSeconds: exercise.demoStartSeconds ?? 0,
    demoLoopSeconds: exercise.demoLoopSeconds ?? 30,
  }
}

function baseStep(
  exercise: PtExerciseInput | null,
  exerciseIndex: number,
  exerciseCount: number,
  partial: Omit<
    PtPlayerStep,
    | 'id'
    | 'exerciseId'
    | 'exerciseSlug'
    | 'exerciseName'
    | 'cues'
    | 'exerciseIndex'
    | 'exerciseCount'
    | 'demoYoutubeId'
    | 'demoStartSeconds'
    | 'demoLoopSeconds'
    | 'equipment'
  > & { equipment?: string | null }
): Omit<PtPlayerStep, 'id'> {
  return {
    kind: partial.kind,
    exerciseId: exercise?.id ?? null,
    exerciseSlug: exercise?.slug ?? null,
    exerciseName: exercise?.name ?? null,
    cues: exercise?.cues ?? null,
    setIndex: partial.setIndex,
    setCount: partial.setCount,
    side: partial.side,
    durationMs: partial.durationMs,
    targetReps: partial.targetReps,
    exerciseIndex,
    exerciseCount,
    ...demoFields(
      exercise ?? {
        id: '',
        slug: '',
        name: '',
        category: '',
        prescription: {},
        cues: null,
      }
    ),
    equipment: partial.equipment ?? (exercise ? str(exercise.prescription.equipment) : null),
    label: partial.label,
  }
}

function sideLabel(side: PtSide | null): string {
  if (side === 'left') return 'Left'
  if (side === 'right') return 'Right'
  return ''
}

/**
 * Build the flat step list for a protocol. Always starts with pre_roll.
 */
export function expandProtocol(protocol: PtProtocolInput): PtPlayerStep[] {
  const exerciseCount = protocol.items.length
  const drafts: Omit<PtPlayerStep, 'id'>[] = []

  drafts.push(
    baseStep(null, 0, exerciseCount, {
      kind: 'pre_roll',
      setIndex: 0,
      setCount: 0,
      side: null,
      durationMs: PRE_ROLL_MS,
      targetReps: null,
      label: 'Get situated on the floor',
      equipment: null,
    })
  )

  protocol.items.forEach((exercise, exerciseIndex) => {
    const prescription = exercise.prescription ?? {}
    const sets = setCount(prescription)
    const sides = sidesFor(prescription)
    const mode = modeFor(prescription)
    const equipment = str(prescription.equipment)

    drafts.push(
      baseStep(exercise, exerciseIndex, exerciseCount, {
        kind: 'intro',
        setIndex: 0,
        setCount: sets,
        side: sides[0] ?? null,
        durationMs: INTRO_MS,
        targetReps: null,
        label: exercise.name,
        equipment,
      })
    )

    sides.forEach((side, sideIdx) => {
      if (sideIdx > 0) {
        drafts.push(
          baseStep(exercise, exerciseIndex, exerciseCount, {
            kind: 'side_switch',
            setIndex: 0,
            setCount: sets,
            side,
            durationMs: SIDE_SWITCH_MS,
            targetReps: null,
            label: `Switch to ${sideLabel(side)}`,
            equipment,
          })
        )
      }

      for (let set = 0; set < sets; set++) {
        const setLabel = `Set ${set + 1}/${sets}`
        const sideBit = side ? ` · ${sideLabel(side)}` : ''

        if (mode === 'pnf') {
          const contractMs = num(prescription.contract_seconds) * 1000
          const stretchMs = num(prescription.stretch_seconds) * 1000
          drafts.push(
            baseStep(exercise, exerciseIndex, exerciseCount, {
              kind: 'pnf_contract',
              setIndex: set,
              setCount: sets,
              side,
              durationMs: contractMs,
              targetReps: null,
              label: `Contract · ${setLabel}${sideBit}`,
              equipment,
            })
          )
          drafts.push(
            baseStep(exercise, exerciseIndex, exerciseCount, {
              kind: 'pnf_stretch',
              setIndex: set,
              setCount: sets,
              side,
              durationMs: stretchMs,
              targetReps: null,
              label: `Relax · ${setLabel}${sideBit}`,
              equipment,
            })
          )
        } else if (mode === 'hold') {
          drafts.push(
            baseStep(exercise, exerciseIndex, exerciseCount, {
              kind: 'hold',
              setIndex: set,
              setCount: sets,
              side,
              durationMs: num(prescription.hold_seconds) * 1000,
              targetReps: null,
              label: `Hold · ${setLabel}${sideBit}`,
              equipment,
            })
          )
        } else if (mode === 'timed_rep') {
          const reps = Math.max(1, num(prescription.reps, 1))
          const holdMs = num(prescription.hold_seconds) * 1000
          for (let rep = 0; rep < reps; rep++) {
            drafts.push(
              baseStep(exercise, exerciseIndex, exerciseCount, {
                kind: 'timed_rep',
                setIndex: set,
                setCount: sets,
                side,
                durationMs: holdMs,
                targetReps: reps,
                label: `Rep ${rep + 1}/${reps} · ${setLabel}${sideBit}`,
                equipment,
              })
            )
          }
        } else {
          const reps = Math.max(1, num(prescription.reps, 1))
          drafts.push(
            baseStep(exercise, exerciseIndex, exerciseCount, {
              kind: 'rep',
              setIndex: set,
              setCount: sets,
              side,
              durationMs: null,
              targetReps: reps,
              label: `${setLabel}${sideBit}`,
              equipment,
            })
          )
        }

        const isLastSet = set === sets - 1
        const isLastSide = sideIdx === sides.length - 1
        if (!isLastSet || !isLastSide) {
          // Rest between sets; also between last set of left and first of right
          // (side_switch already gives a short pause — still add rest after sets
          // within a side).
          if (!isLastSet) {
            drafts.push(
              baseStep(exercise, exerciseIndex, exerciseCount, {
                kind: 'rest',
                setIndex: set,
                setCount: sets,
                side,
                durationMs: DEFAULT_REST_MS,
                targetReps: null,
                label: 'Rest',
                equipment,
              })
            )
          }
        }
      }
    })
  })

  return drafts.map((step, index) => ({
    ...step,
    id: `step-${index}`,
  }))
}

export const PT_TIMING = {
  PRE_ROLL_MS,
  INTRO_MS,
  SIDE_SWITCH_MS,
  DEFAULT_REST_MS,
} as const

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { expandProtocol, PT_TIMING } from './expand-protocol'
import { applyCommand, createInitialState, remainingMs, tick } from './pt-state-machine'
import type { PtProtocolInput } from './pt-types'

function exercise(
  slug: string,
  name: string,
  prescription: Record<string, unknown>,
  id = `id-${slug}`
) {
  return {
    id,
    slug,
    name,
    category: 'activation',
    prescription,
    cues: 'Cue line.',
    demoYoutubeId: null,
    demoStartSeconds: 0,
    demoLoopSeconds: 30,
  }
}

const morning: PtProtocolInput = {
  id: 'proto-morning',
  slug: 'morning-activation',
  name: 'Morning Activation Block',
  timeOfDay: 'morning',
  durationMinutes: 7,
  description: null,
  items: [
    exercise('quad-sets', 'Quad Sets', { sets: 4, hold_seconds: 45 }),
    exercise('wall-sit-gtb', 'Wall Sit with Glute Band', {
      sets: 3,
      hold_seconds: 30,
      equipment: 'glute band',
    }),
    exercise('slr-band', 'Straight Leg Raise with Band', {
      sets: 2,
      reps: 10,
      side: 'each',
      equipment: 'band',
    }),
    exercise('iso-wall-runner', 'ISO Wall Runner', {
      sets: 2,
      reps: 10,
      hold_seconds: 3,
      equipment: 'yellow ball',
    }),
    exercise('supine-nerve-glides', 'Supine Nerve Glides', {
      sets: 2,
      reps: 10,
      side: 'each',
      tempo: 'slow',
    }),
  ],
}

const evening: PtProtocolInput = {
  id: 'proto-evening',
  slug: 'evening-armor',
  name: 'Evening Armor Block',
  timeOfDay: 'evening',
  durationMinutes: 12,
  description: null,
  items: [
    exercise('bridge-abduction-march', 'Bridge + Abduction / March', {
      sets: 2,
      reps: 10,
      hold_seconds: 3,
      equipment: 'band',
    }),
    exercise('modified-clamshells', 'Modified Clamshells', {
      sets: 3,
      reps: 20,
      side: 'each',
      equipment: 'band',
    }),
    exercise('hip-abd-sidelying', 'Side-Lying Hip Abduction', {
      sets: 2,
      reps: 10,
      side: 'each',
      equipment: 'band',
    }),
    exercise('lateral-tap-down', '6" Lateral Tap Down', {
      sets: 2,
      reps: 10,
      side: 'each',
      height_inches: 6,
    }),
    exercise('pnf-hamstring', 'Supine PNF Hamstring', {
      sets: 3,
      side: 'each',
      contract_seconds: 5,
      stretch_seconds: 10,
    }),
  ],
}

const preRun: PtProtocolInput = {
  id: 'proto-prerun',
  slug: 'pre-run-warmup',
  name: 'Pre-Run Warmup',
  timeOfDay: 'pre_session',
  durationMinutes: 4,
  description: null,
  items: [
    exercise('worlds-greatest-stretch', "World's Greatest Stretch", {
      reps: 5,
      side: 'each',
    }),
  ],
}

describe('expandProtocol', () => {
  it('always starts with a 15s pre-roll', () => {
    const steps = expandProtocol(morning)
    assert.equal(steps[0]?.kind, 'pre_roll')
    assert.equal(steps[0]?.durationMs, PT_TIMING.PRE_ROLL_MS)
  })

  it('expands hold-only quad sets into 4 hold steps with rests', () => {
    const steps = expandProtocol({
      ...morning,
      items: [morning.items[0]!],
    })
    const holds = steps.filter((s) => s.kind === 'hold')
    assert.equal(holds.length, 4)
    assert.equal(holds[0]?.durationMs, 45_000)
    const rests = steps.filter((s) => s.kind === 'rest')
    assert.equal(rests.length, 3)
  })

  it('expands side:each into left then right with a side_switch', () => {
    const steps = expandProtocol({
      ...morning,
      items: [morning.items[2]!],
    })
    const sides = steps.filter((s) => s.kind === 'rep').map((s) => s.side)
    assert.deepEqual(sides, ['left', 'left', 'right', 'right'])
    assert.ok(steps.some((s) => s.kind === 'side_switch'))
  })

  it('treats holds+reps as timed_rep (ISO wall runner)', () => {
    const steps = expandProtocol({
      ...morning,
      items: [morning.items[3]!],
    })
    const timed = steps.filter((s) => s.kind === 'timed_rep')
    // 2 sets × 10 reps
    assert.equal(timed.length, 20)
    assert.equal(timed[0]?.durationMs, 3_000)
  })

  it('expands PNF into contract then stretch pairs per set/side', () => {
    const steps = expandProtocol({
      ...evening,
      items: [evening.items[4]!],
    })
    const contracts = steps.filter((s) => s.kind === 'pnf_contract')
    const stretches = steps.filter((s) => s.kind === 'pnf_stretch')
    // 3 sets × 2 sides
    assert.equal(contracts.length, 6)
    assert.equal(stretches.length, 6)
    assert.equal(contracts[0]?.durationMs, 5_000)
    assert.equal(stretches[0]?.durationMs, 10_000)
  })

  it('treats worlds-greatest-stretch (reps only) as 1 set × each side', () => {
    const steps = expandProtocol(preRun)
    const reps = steps.filter((s) => s.kind === 'rep')
    assert.equal(reps.length, 2)
    assert.equal(reps[0]?.targetReps, 5)
    assert.equal(reps[0]?.side, 'left')
    assert.equal(reps[1]?.side, 'right')
  })

  it('expands the full morning block without throwing', () => {
    const steps = expandProtocol(morning)
    assert.ok(steps.length > 10)
    assert.ok(steps.every((s) => s.id.startsWith('step-')))
  })

  it('expands the full evening block without throwing', () => {
    const steps = expandProtocol(evening)
    assert.ok(steps.length > 20)
  })
})

describe('pt-state-machine', () => {
  it('play enters pre_roll and remaining counts down', () => {
    const initial = createInitialState(preRun)
    assert.equal(initial.status, 'idle')
    const t0 = new Date('2026-09-21T12:00:00.000Z')
    const running = applyCommand(initial, { type: 'play' }, t0)
    assert.equal(running.status, 'running')
    assert.equal(running.steps[running.stepIndex]?.kind, 'pre_roll')
    assert.equal(remainingMs(running, t0), PT_TIMING.PRE_ROLL_MS)
    const mid = new Date(t0.getTime() + 5_000)
    assert.equal(remainingMs(running, mid), PT_TIMING.PRE_ROLL_MS - 5_000)
  })

  it('pause freezes remaining and resume continues', () => {
    const t0 = new Date('2026-09-21T12:00:00.000Z')
    let state = applyCommand(createInitialState(preRun), { type: 'play' }, t0)
    const t1 = new Date(t0.getTime() + 4_000)
    state = applyCommand(state, { type: 'pause' }, t1)
    assert.equal(state.status, 'paused')
    assert.equal(state.pausedRemainingMs, PT_TIMING.PRE_ROLL_MS - 4_000)
    const t2 = new Date(t1.getTime() + 60_000)
    assert.equal(remainingMs(state, t2), PT_TIMING.PRE_ROLL_MS - 4_000)
    state = applyCommand(state, { type: 'resume' }, t2)
    assert.equal(state.status, 'running')
    assert.equal(remainingMs(state, t2), PT_TIMING.PRE_ROLL_MS - 4_000)
  })

  it('tick advances when timed phase elapses', () => {
    const t0 = new Date('2026-09-21T12:00:00.000Z')
    let state = applyCommand(createInitialState(preRun), { type: 'play' }, t0)
    const after = new Date(t0.getTime() + PT_TIMING.PRE_ROLL_MS + 1)
    state = tick(state, after)
    assert.equal(state.steps[state.stepIndex]?.kind, 'intro')
  })

  it('inc_rep advances after target reps', () => {
    const t0 = new Date('2026-09-21T12:00:00.000Z')
    let state = createInitialState(preRun)
    // Skip pre_roll + intro to first rep step
    state = applyCommand(state, { type: 'play' }, t0)
    state = applyCommand(state, { type: 'skip_step' }, t0) // intro
    state = applyCommand(state, { type: 'skip_step' }, t0) // first rep step
    assert.equal(state.steps[state.stepIndex]?.kind, 'rep')
    assert.equal(state.steps[state.stepIndex]?.targetReps, 5)
    for (let i = 0; i < 4; i++) {
      state = applyCommand(state, { type: 'inc_rep' }, t0)
      assert.equal(state.currentReps, i + 1)
    }
    state = applyCommand(state, { type: 'inc_rep' }, t0)
    assert.ok(state.steps[state.stepIndex]?.kind !== 'rep' || state.currentReps === 0)
  })

  it('add_rest extends rest duration', () => {
    const protocol: PtProtocolInput = {
      ...morning,
      items: [morning.items[0]!],
    }
    const t0 = new Date('2026-09-21T12:00:00.000Z')
    let state = applyCommand(createInitialState(protocol), { type: 'play' }, t0)
    // Advance to first rest: pre_roll, intro, hold → rest
    while (state.steps[state.stepIndex]?.kind !== 'rest' && state.status !== 'completed') {
      state = applyCommand(state, { type: 'skip_step' }, t0)
    }
    assert.equal(state.steps[state.stepIndex]?.kind, 'rest')
    const before = state.phaseDurationMs ?? 0
    state = applyCommand(state, { type: 'add_rest', seconds: 30 }, t0)
    assert.equal(state.phaseDurationMs, before + 30_000)
  })
})

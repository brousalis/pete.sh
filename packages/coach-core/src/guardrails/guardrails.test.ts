/**
 * Injury Guard tests.
 *
 * These encode the promise that health outranks the goal. Each test describes
 * a scenario that actually threatens the knee and asserts the engine refuses
 * it, so a future prompt or planner change cannot quietly loosen a rule.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { downgradeSession, evaluateGuardrails, isoWeekStart } from './index'
import type {
  GuardrailContext,
} from './engine'
import type { InjuryStatus, PlannedSession, Readiness, SymptomLog } from '../types'

const TODAY = '2026-09-21' // a Monday

function session(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    weekId: 'week-1',
    sessionDate: TODAY,
    slot: 'primary',
    sortOrder: 0,
    sport: 'run',
    sessionType: 'z2',
    title: 'Easy run',
    description: null,
    plannedDurationSeconds: 2400,
    plannedDistanceMeters: 4828,
    plannedLoad: 45,
    steps: {},
    targets: {},
    rationale: null,
    guardrailReport: null,
    status: 'planned',
    completedActivityId: null,
    watchSyncState: 'pending',
    ...overrides,
  }
}

function symptom(overrides: Partial<SymptomLog> = {}): SymptomLog {
  return {
    id: Math.random().toString(36).slice(2),
    logDate: TODAY,
    site: 'r_knee_medial',
    painScore: 0,
    context: 'after',
    swelling: false,
    instability: false,
    locking: false,
    notes: null,
    ...overrides,
  }
}

const KNEE_INJURY: InjuryStatus = {
  id: 'injury-1',
  name: 'Bilateral medial knee pain',
  bodyRegion: 'knee',
  sites: ['r_knee_medial', 'pes_anserine'],
  status: 'managed',
  severity: 'moderate',
  contraindications: [],
  clearances: {},
  diagnosis: {},
}

function context(overrides: Partial<GuardrailContext> = {}): GuardrailContext {
  return {
    sessions: [],
    symptoms: [],
    injuries: [KNEE_INJURY],
    today: TODAY,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------

describe('red flags', () => {
  it('stops training on swelling', () => {
    const report = evaluateGuardrails(
      context({ symptoms: [symptom({ painScore: 3, swelling: true })] })
    )

    assert.equal(report.severity, 'red_flag')
    assert.equal(report.passed, false)
    assert.ok(report.violations.some((v) => v.ruleId === 'pain.mechanical_red_flag'))
    assert.ok(report.violations[0]?.remedy?.includes('contact'))
  })

  it('stops training on locking or giving way', () => {
    const locking = evaluateGuardrails(context({ symptoms: [symptom({ locking: true })] }))
    assert.equal(locking.severity, 'red_flag')

    const instability = evaluateGuardrails(
      context({ symptoms: [symptom({ instability: true })] })
    )
    assert.equal(instability.severity, 'red_flag')
  })

  it('treats pain of 6 or more as a red flag', () => {
    const report = evaluateGuardrails(context({ symptoms: [symptom({ painScore: 6 })] }))
    assert.equal(report.severity, 'red_flag')
    assert.ok(report.violations.some((v) => v.ruleId === 'pain.severe'))
  })
})

describe('pain thresholds', () => {
  it('blocks running at 4/10 pain but offers a swim', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ title: 'Tuesday aerobic run' })],
        symptoms: [symptom({ painScore: 4 })],
      })
    )

    assert.equal(report.passed, false)
    const violation = report.violations.find((v) => v.ruleId === 'pain.moderate_blocks_impact')
    assert.ok(violation)
    assert.ok(violation!.remedy?.includes('swim'))
  })

  it('allows swimming at 4/10 pain', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'swim', title: 'Technique swim', sessionType: 'technique' })],
        symptoms: [symptom({ painScore: 4 })],
      })
    )

    assert.ok(!report.violations.some((v) => v.ruleId === 'pain.moderate_blocks_impact'))
  })

  it('warns on a rising pain trend before it becomes a flare', () => {
    const report = evaluateGuardrails(
      context({
        symptoms: [
          symptom({ logDate: '2026-09-17', painScore: 1 }),
          symptom({ logDate: '2026-09-19', painScore: 2 }),
          symptom({ logDate: '2026-09-21', painScore: 3 }),
        ],
      })
    )

    assert.ok(report.violations.some((v) => v.ruleId === 'pain.trend_rising'))
  })
})

describe('return-to-run progression', () => {
  it('blocks runs less than 48 hours apart', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({ sessionDate: '2026-09-21', title: 'Run A' }),
          session({ sessionDate: '2026-09-22', title: 'Run B' }),
        ],
        returnToRunStartDate: '2026-09-14',
      })
    )

    assert.equal(report.passed, false)
    assert.ok(report.violations.some((v) => v.ruleId === 'progression.run_spacing'))
  })

  it('allows runs 48 hours apart', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({ sessionDate: '2026-09-21', title: 'Run A' }),
          session({ sessionDate: '2026-09-23', title: 'Run B' }),
        ],
        returnToRunStartDate: '2026-09-14',
      })
    )

    assert.ok(!report.violations.some((v) => v.ruleId === 'progression.run_spacing'))
  })

  it('blocks a weekly running volume jump above 10%', () => {
    const weekStart = isoWeekStart(TODAY)
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({ sessionDate: '2026-09-21', plannedDistanceMeters: 8000 }),
          session({ sessionDate: '2026-09-24', plannedDistanceMeters: 8000 }),
        ],
        weeklyRunMeters: [{ weekStart: '2026-09-14', meters: 10000 }],
        returnToRunStartDate: '2026-08-01',
      })
    )

    const violation = report.violations.find((v) => v.ruleId === 'progression.weekly_run_volume')
    assert.ok(violation, 'a 60% jump must be blocked')
    assert.equal(violation!.severity, 'block')
    assert.equal(violation!.data?.weekStart, weekStart)
  })

  it('allows a 10% weekly increase', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sessionDate: '2026-09-21', plannedDistanceMeters: 10800 })],
        weeklyRunMeters: [{ weekStart: '2026-09-14', meters: 10000 }],
        returnToRunStartDate: '2026-08-01',
      })
    )

    assert.ok(!report.violations.some((v) => v.ruleId === 'progression.weekly_run_volume'))
  })

  it('blocks a long-run jump of more than a mile', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sessionDate: '2026-09-26', plannedDistanceMeters: 11265 })], // 7 mi
        weeklyLongRunMeters: [{ weekStart: '2026-09-14', meters: 8046 }], // 5 mi
        weeklyRunMeters: [{ weekStart: '2026-09-14', meters: 40000 }],
        returnToRunStartDate: '2026-08-01',
      })
    )

    assert.ok(report.violations.some((v) => v.ruleId === 'progression.long_run_step'))
  })

  it('blocks run intensity until quad symmetry passes', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sessionType: 'intervals', title: 'Cruise intervals' })],
        quadSymmetryPassed: false,
      })
    )

    const violation = report.violations.find((v) => v.ruleId === 'progression.intensity_gate')
    assert.ok(violation)
    assert.ok(violation!.remedy?.includes('bike') || violation!.remedy?.includes('pool'))
  })

  it('allows run intensity once quad symmetry passes', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sessionType: 'intervals' })],
        quadSymmetryPassed: true,
      })
    )

    assert.ok(!report.violations.some((v) => v.ruleId === 'progression.intensity_gate'))
  })
})

describe('load management', () => {
  it('blocks an ACWR above 1.5', () => {
    const report = evaluateGuardrails(context({ acwr: 1.62 }))
    const violation = report.violations.find((v) => v.ruleId === 'load.acwr_ceiling')
    assert.ok(violation)
    assert.equal(violation!.severity, 'block')
  })

  it('warns between 1.3 and 1.5', () => {
    const report = evaluateGuardrails(context({ acwr: 1.4 }))
    const violation = report.violations.find((v) => v.ruleId === 'load.acwr_ceiling')
    assert.ok(violation)
    assert.equal(violation!.severity, 'warn')
  })

  it('notes detraining below 0.8', () => {
    const report = evaluateGuardrails(context({ acwr: 0.7 }))
    assert.ok(report.violations.some((v) => v.ruleId === 'load.acwr_floor'))
    assert.equal(report.passed, true, 'detraining is information, not a block')
  })

  it('requires a rest day each week', () => {
    const sessions = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${TODAY}T00:00:00Z`)
      date.setUTCDate(date.getUTCDate() + index)
      return session({
        sessionDate: date.toISOString().slice(0, 10),
        sport: 'swim',
        sessionType: 'z2',
      })
    })

    const report = evaluateGuardrails(context({ sessions }))
    assert.ok(report.violations.some((v) => v.ruleId === 'load.rest_day'))
  })

  it('blocks back-to-back hard days', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({ sessionDate: '2026-09-21', sport: 'bike', sessionType: 'threshold' }),
          session({ sessionDate: '2026-09-22', sport: 'swim', sessionType: 'intervals' }),
        ],
      })
    )

    assert.ok(report.violations.some((v) => v.ruleId === 'load.back_to_back_intensity'))
  })

  it('blocks two loading sessions in one day but allows swim plus strength', () => {
    const bad = evaluateGuardrails(
      context({
        sessions: [
          session({ sessionDate: TODAY, sport: 'run', sessionType: 'z2', title: 'AM run' }),
          session({ sessionDate: TODAY, sport: 'run', sessionType: 'intervals', title: 'PM intervals' }),
        ],
      })
    )
    assert.ok(bad.violations.some((v) => v.ruleId === 'load.two_a_day'))

    const good = evaluateGuardrails(
      context({
        sessions: [
          session({ sessionDate: TODAY, sport: 'swim', sessionType: 'z2', title: 'AM swim' }),
          session({ sessionDate: TODAY, sport: 'strength', sessionType: 'strength', title: 'PM strength' }),
        ],
      })
    )
    assert.ok(!good.violations.some((v) => v.ruleId === 'load.two_a_day'))
  })
})

describe('cycling technique', () => {
  it('warns when a ride has no cadence floor while injured', () => {
    const report = evaluateGuardrails(
      context({ sessions: [session({ sport: 'bike', sessionType: 'z2', title: 'Z2 spin' })] })
    )

    const violation = report.violations.find((v) => v.ruleId === 'technique.bike_cadence')
    assert.ok(violation)
    assert.ok(violation!.remedy?.includes('85'))
  })

  it('warns when the cadence floor is too low', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({ sport: 'bike', sessionType: 'z2', targets: { cadenceRange: [70, 80] } }),
        ],
      })
    )

    assert.ok(report.violations.some((v) => v.ruleId === 'technique.bike_cadence'))
  })

  it('accepts a high cadence target', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({ sport: 'bike', sessionType: 'z2', targets: { cadenceRange: [90, 100] } }),
        ],
      })
    )

    assert.ok(!report.violations.some((v) => v.ruleId === 'technique.bike_cadence'))
  })

  it('blocks a long-ride jump above 15%', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({
            sport: 'bike',
            sessionType: 'long',
            plannedDistanceMeters: 64_000,
            targets: { cadenceRange: [90, 100] },
          }),
        ],
        weeklyLongRideMeters: [{ weekStart: '2026-09-14', meters: 40_000 }],
      })
    )

    assert.ok(report.violations.some((v) => v.ruleId === 'technique.long_ride_step'))
  })
})

describe('readiness gating', () => {
  function readiness(score: number): Readiness {
    return {
      metricDate: TODAY,
      score,
      level: score >= 78 ? 'fresh' : score >= 58 ? 'moderate' : score >= 38 ? 'fatigued' : 'compromised',
      components: [],
      flags: [],
      inputs: {
        hrvSdnn: null,
        hrvBaseline7d: null,
        hrvZScore: null,
        rhr: null,
        rhrBaseline7d: null,
        sleepSeconds: null,
        ctl: null,
        atl: null,
        tsb: null,
        acwr: null,
        monotony: null,
        strain: null,
        maxPain7d: null,
      },
    }
  }

  it('removes intensity when fatigued', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'bike', sessionType: 'threshold', targets: { cadenceRange: [90, 100] } })],
        readiness: readiness(45),
      })
    )

    const violation = report.violations.find((v) => v.ruleId === 'recovery.readiness_gate')
    assert.ok(violation)
    assert.ok(violation!.remedy?.includes('duration'), 'should keep duration, drop intensity')
  })

  it('blocks impact entirely when compromised', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'run', sessionType: 'z2' })],
        readiness: readiness(25),
      })
    )

    assert.ok(report.violations.some((v) => v.ruleId === 'recovery.readiness_gate'))
  })

  it('leaves a fresh day alone', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'swim', sessionType: 'intervals' })],
        readiness: readiness(85),
      })
    )

    assert.ok(!report.violations.some((v) => v.ruleId === 'recovery.readiness_gate'))
  })

  it('warns on sleep debt for quality work without blocking', () => {
    const withDebt: Readiness = {
      ...readiness(85),
      flags: ['sleep_debt'],
      inputs: {
        ...readiness(85).inputs,
        sleepSeconds: 5.5 * 3600,
      },
    }

    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'bike', sessionType: 'threshold', targets: { cadenceRange: [90, 100] } })],
        readiness: withDebt,
      })
    )

    const violation = report.violations.find((v) => v.ruleId === 'recovery.sleep_debt')
    assert.ok(violation)
    assert.equal(violation!.severity, 'warn')
    assert.ok(!report.violations.some((v) => v.ruleId === 'recovery.readiness_gate'))
  })

  it('never responds to low readiness by adding volume', () => {
    // Encoded as a property of the remedy text, since the engine only ever
    // recommends reducing. If a future change suggests "add easy volume",
    // this fails.
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'run', sessionType: 'intervals' })],
        readiness: readiness(30),
      })
    )

    for (const violation of report.violations) {
      assert.ok(
        !/add .*volume|increase .*volume/i.test(violation.remedy ?? ''),
        `remedy should never add volume: ${violation.remedy}`
      )
    }
  })
})

describe('protocol protection', () => {
  it('blocks a plan that drops a mandatory PT block', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'swim' })],
        mandatoryProtocolSlugs: ['morning-activation', 'evening-armor'],
        scheduledProtocolSlugs: ['morning-activation'],
      })
    )

    const violation = report.violations.find((v) => v.ruleId === 'protocol.pt_mandatory')
    assert.ok(violation)
    assert.equal(violation!.severity, 'block')
    assert.ok((violation!.data?.missing as string[]).includes('evening-armor'))
  })

  it('accepts a plan with all mandatory blocks present', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'swim' })],
        mandatoryProtocolSlugs: ['morning-activation', 'evening-armor'],
        scheduledProtocolSlugs: ['morning-activation', 'evening-armor'],
      })
    )

    assert.ok(!report.violations.some((v) => v.ruleId === 'protocol.pt_mandatory'))
  })

  it('warns when quad strength drops below twice a week', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [session({ sport: 'strength', sessionType: 'strength' })],
      })
    )

    assert.ok(report.violations.some((v) => v.ruleId === 'protocol.quad_strength_frequency'))
  })
})

describe('downgrades', () => {
  it('swaps a run for a swim rather than shortening it', () => {
    const downgrade = downgradeSession(session({ sport: 'run' }), 'Pain is 4/10 today.')
    assert.equal(downgrade.sport, 'swim')
    assert.ok(downgrade.rationale.includes('Pain is 4/10'))
  })

  it('keeps the sport and removes the intensity for non-impact work', () => {
    const downgrade = downgradeSession(
      session({ sport: 'bike', sessionType: 'threshold' }),
      'Readiness is low.'
    )
    assert.equal(downgrade.sport, 'bike')
    assert.equal(downgrade.sessionType, 'z2')
  })
})

describe('clean plans', () => {
  it('passes a well-formed rehab week', () => {
    const report = evaluateGuardrails(
      context({
        sessions: [
          session({ sessionDate: '2026-09-21', sport: 'swim', sessionType: 'technique', title: 'Technique swim' }),
          session({ sessionDate: '2026-09-22', sport: 'strength', sessionType: 'strength', title: 'Lower body' }),
          session({ sessionDate: '2026-09-23', sport: 'bike', sessionType: 'z2', title: 'Z2 spin', targets: { cadenceRange: [90, 100] } }),
          session({ sessionDate: '2026-09-24', sport: 'run', sessionType: 'walk_run', title: 'Walk/run', plannedDistanceMeters: 3200 }),
          session({ sessionDate: '2026-09-25', sport: 'strength', sessionType: 'strength', title: 'Upper body' }),
          session({ sessionDate: '2026-09-26', sport: 'swim', sessionType: 'z2', title: 'Aerobic swim' }),
          session({ sessionDate: '2026-09-27', sport: 'rest', sessionType: 'rest', title: 'Rest' }),
        ],
        acwr: 1.05,
        monotony: 1.4,
        quadSymmetryPassed: false,
        weeklyRunMeters: [{ weekStart: '2026-09-14', meters: 3000 }],
        mandatoryProtocolSlugs: ['morning-activation', 'evening-armor'],
        scheduledProtocolSlugs: ['morning-activation', 'evening-armor'],
      })
    )

    assert.equal(report.passed, true, JSON.stringify(report.violations, null, 2))
  })
})

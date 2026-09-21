/**
 * Analytics tests.
 *
 * These exist because the coach presents these numbers as fact and makes
 * training decisions from them. Each test pins a property that would be
 * silently wrong otherwise: an hour at threshold scoring 100 TSS, ACWR
 * refusing to report before the chronic term converges, readiness capping
 * when a knee is swollen.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  computeAcwr,
  computeCss,
  computeDecoupling,
  computeHrTss,
  computeLoad,
  computeMonotony,
  computePmc,
  computePowerTss,
  computeReadiness,
  computeTrimp,
  computeVdot,
  computeZoneSeconds,
  defaultZoneConfig,
  estimateBikePower,
  eachDay,
  levelForScore,
  polarisationIndex,
  predictRaceTime,
  projectRace,
  speedForPower,
  thresholdSpeedFromVdot,
  vdotPaces,
  zoneForBpm,
} from './index'
import type { DailyLoad, DailyMetric, HeartRateSample, SymptomLog } from '../types'

const zoneConfig = { maxHr: 185, restingHr: 52, z1: 110, z2: 136, z3: 148, z4: 160, z5: 170 }

/** Constant heart rate for a given duration at 1 Hz. */
function steadyHr(bpm: number, seconds: number): HeartRateSample[] {
  return Array.from({ length: seconds }, (_, t) => ({ t, bpm }))
}

// ---------------------------------------------------------------------------

describe('zones', () => {
  it('assigns zones from configured thresholds, not percentage of max', () => {
    assert.equal(zoneForBpm(100, zoneConfig), 1)
    assert.equal(zoneForBpm(140, zoneConfig), 2)
    assert.equal(zoneForBpm(150, zoneConfig), 3)
    assert.equal(zoneForBpm(165, zoneConfig), 4)
    assert.equal(zoneForBpm(175, zoneConfig), 5)
  })

  it('accumulates time in zone from sample spacing', () => {
    const samples = [...steadyHr(140, 600), ...steadyHr(165, 300).map((s) => ({ ...s, t: s.t + 600 }))]
    const zones = computeZoneSeconds(samples, zoneConfig)

    assert.ok(Math.abs(zones.z2 - 600) <= 2, `expected ~600s in z2, got ${zones.z2}`)
    assert.ok(Math.abs(zones.z4 - 300) <= 2, `expected ~300s in z4, got ${zones.z4}`)
  })

  it('excludes recording gaps rather than crediting them to a zone', () => {
    const samples: HeartRateSample[] = [
      { t: 0, bpm: 140 },
      { t: 1, bpm: 140 },
      // 10 minute gap: watch paused
      { t: 601, bpm: 140 },
      { t: 602, bpm: 140 },
    ]
    const zones = computeZoneSeconds(samples, zoneConfig)
    assert.ok(zones.z2 < 10, `gap should not be credited, got ${zones.z2}s`)
  })

  it('identifies a polarised distribution', () => {
    const polarised = polarisationIndex({ z1: 3000, z2: 3000, z3: 200, z4: 800, z5: 200 })
    assert.equal(polarised.isPolarised, true)

    const threshold = polarisationIndex({ z1: 500, z2: 1000, z3: 4000, z4: 500, z5: 0 })
    assert.equal(threshold.isPolarised, false)
  })
})

describe('training load', () => {
  it('scores one hour at threshold as 100 TSS', () => {
    // IF of 1.0 by construction: session HR equals LTHR.
    const { tss, intensityFactor } = computeHrTss(3600, 163, zoneConfig, 163)
    assert.ok(Math.abs(intensityFactor - 1) < 0.001, `IF should be 1.0, got ${intensityFactor}`)
    assert.ok(Math.abs(tss - 100) < 0.5, `expected ~100 TSS, got ${tss}`)
  })

  it('scores power TSS to the reference definition', () => {
    const { tss } = computePowerTss(3600, 250, 250)
    assert.ok(Math.abs(tss - 100) < 0.01, `expected 100 TSS, got ${tss}`)
  })

  it('scales TSS quadratically with intensity', () => {
    const easy = computeHrTss(3600, 120, zoneConfig, 163).tss
    const hard = computeHrTss(3600, 163, zoneConfig, 163).tss
    assert.ok(hard > easy * 2, 'threshold hour should far exceed an easy hour')
  })

  it('weights TRIMP exponentially toward higher intensity', () => {
    const easy = computeTrimp(steadyHr(120, 3600), zoneConfig)
    const hard = computeTrimp(steadyHr(170, 3600), zoneConfig)
    assert.ok(hard > easy * 2, `expected exponential weighting, got ${easy} vs ${hard}`)
  })

  it('prefers pace over heart rate for running when both exist', () => {
    const result = computeLoad({
      sport: 'run',
      durationSeconds: 3600,
      distanceMeters: 12000,
      hrAverage: 150,
      zoneConfig,
      thresholds: { runThresholdSpeed: 3.33, lthr: 163 },
    })
    assert.equal(result.method, 'rTSS')
  })

  it('falls back through the measurement ladder', () => {
    const hrOnly = computeLoad({
      sport: 'strength',
      durationSeconds: 3600,
      hrAverage: 130,
      zoneConfig,
      thresholds: { lthr: 163 },
    })
    assert.equal(hrOnly.method, 'hrTSS')

    const nothing = computeLoad({
      sport: 'strength',
      durationSeconds: 3600,
      zoneConfig,
      thresholds: {},
    })
    assert.equal(nothing.method, 'estimated')
    assert.ok(nothing.notes?.includes('estimated'))
  })

  it('reports zero load for rest', () => {
    const result = computeLoad({
      sport: 'rest',
      durationSeconds: 0,
      zoneConfig,
      thresholds: {},
    })
    assert.equal(result.tss, 0)
  })

  it('detects cardiac drift across a session', () => {
    const firstHalf = steadyHr(140, 1800)
    const secondHalf = steadyHr(154, 1800).map((s) => ({ ...s, t: s.t + 1800 }))
    const drift = computeDecoupling([...firstHalf, ...secondHalf], 10000)

    assert.ok(drift !== null)
    assert.ok(drift! > 8, `expected ~10% drift, got ${drift}`)
  })
})

describe('performance management chart', () => {
  function constantLoad(days: number, tss: number): DailyLoad[] {
    return eachDay(daysBefore(days), daysBefore(1)).map((date) => ({ date, tss }))
  }

  it('converges CTL toward a steady daily load', () => {
    const series = computePmc(constantLoad(200, 50))
    const final = series[series.length - 1]
    assert.ok(final)
    assert.ok(Math.abs(final!.ctl - 50) < 2, `CTL should approach 50, got ${final!.ctl}`)
  })

  it('reacts faster in ATL than CTL', () => {
    const series = computePmc(constantLoad(20, 80))
    const final = series[series.length - 1]!
    assert.ok(final.atl > final.ctl, 'fatigue should lead fitness during a ramp')
    assert.ok(final.tsb < 0, 'TSB should be negative while loading')
  })

  it('fills untrained days so rest actually decays load', () => {
    const sparse: DailyLoad[] = [
      { date: daysBefore(30), tss: 100 },
      { date: daysBefore(1), tss: 100 },
    ]
    const series = computePmc(sparse)
    assert.equal(series.length, 30, 'gap days should be materialised')
  })

  it('refuses to report ACWR before the chronic term converges', () => {
    const shortHistory = constantLoad(10, 50)
    assert.equal(computeAcwr(shortHistory), null)
  })

  it('reports ACWR near 1.0 for steady training', () => {
    const acwr = computeAcwr(constantLoad(60, 50))
    assert.ok(acwr !== null)
    assert.ok(Math.abs(acwr! - 1) < 0.1, `expected ~1.0, got ${acwr}`)
  })

  it('flags a load spike', () => {
    const loads = [
      ...eachDay(daysBefore(60), daysBefore(8)).map((date) => ({ date, tss: 40 })),
      ...eachDay(daysBefore(7), daysBefore(1)).map((date) => ({ date, tss: 140 })),
    ]
    const acwr = computeAcwr(loads)
    assert.ok(acwr !== null)
    assert.ok(acwr! > 1.5, `a 3.5x week should breach 1.5, got ${acwr}`)
  })

  it('scores an identical-every-day week as high monotony', () => {
    const uniform = eachDay(daysBefore(7), daysBefore(1)).map((date) => ({ date, tss: 60 }))
    const monotony = computeMonotony(uniform)
    assert.ok(monotony !== null && monotony > 5, `expected high monotony, got ${monotony}`)

    const varied: DailyLoad[] = eachDay(daysBefore(7), daysBefore(1)).map((date, index) => ({
      date,
      tss: index % 2 === 0 ? 100 : 20,
    }))
    const variedMonotony = computeMonotony(varied)
    assert.ok(variedMonotony !== null && variedMonotony < 2, `expected low monotony, got ${variedMonotony}`)
  })
})

describe('swim', () => {
  it('computes CSS as the slope between two time trials', () => {
    // 400 in 6:00, 200 in 2:52 -> 200 m in 188 s
    const css = computeCss(400, 360, 200, 172)
    assert.ok(css)
    assert.ok(Math.abs(css!.speed - 200 / 188) < 0.001)
  })

  it('rejects a physiologically impossible pair', () => {
    // 400 faster than 200: bad data, not a fast swimmer
    assert.equal(computeCss(400, 170, 200, 172), null)
  })
})

describe('run', () => {
  it('computes a plausible VDOT for a known performance', () => {
    // 10 km in 50:00 is close to VDOT 40
    const vdot = computeVdot(10000, 3000)
    assert.ok(vdot !== null)
    assert.ok(vdot! > 37 && vdot! < 43, `expected ~40, got ${vdot}`)
  })

  it('orders training paces correctly', () => {
    const paces = vdotPaces(40)
    // Higher seconds-per-mile is slower.
    assert.ok(paces.easy[0] > paces.marathon)
    assert.ok(paces.marathon > paces.threshold)
    assert.ok(paces.threshold > paces.interval)
    assert.ok(paces.interval > paces.repetition)
  })

  it('round-trips a race prediction through VDOT', () => {
    const predicted = predictRaceTime(40, 10000)
    assert.ok(predicted !== null)
    assert.ok(Math.abs(predicted! - 3000) < 180, `expected ~50:00, got ${predicted}s`)
  })

  it('derives a usable threshold speed', () => {
    const speed = thresholdSpeedFromVdot(40)
    assert.ok(speed > 2.5 && speed < 4.5, `implausible threshold speed ${speed} m/s`)
  })
})

describe('bike power', () => {
  it('estimates a plausible power for 20 mph on the flat', () => {
    const watts = estimateBikePower({ speedMetersPerSecond: 8.94, totalMassKg: 88 })
    assert.ok(watts > 170 && watts < 280, `expected ~200-250 W, got ${watts}`)
  })

  it('requires more power into a headwind', () => {
    const calm = estimateBikePower({ speedMetersPerSecond: 8.94, totalMassKg: 88 })
    const headwind = estimateBikePower({
      speedMetersPerSecond: 8.94,
      totalMassKg: 88,
      headwindMetersPerSecond: 5,
    })
    assert.ok(headwind > calm * 1.4, `headwind should cost significantly more, ${calm} vs ${headwind}`)
  })

  it('inverts to a speed consistent with the forward model', () => {
    const speed = speedForPower(220, { totalMassKg: 88 })
    const backAgain = estimateBikePower({ speedMetersPerSecond: speed, totalMassKg: 88 })
    assert.ok(Math.abs(backAgain - 220) < 3, `round trip drifted: ${backAgain} W`)
  })
})

describe('readiness', () => {
  const baselineMetrics: DailyMetric[] = eachDay(daysBefore(10), daysBefore(1)).map((date) => ({
    metricDate: date,
    steps: 8000,
    exerciseMinutes: 45,
    restingHeartRate: 52,
    hrvSdnn: 60,
    vo2Max: 48,
    sleepSeconds: 7.5 * 3600,
    sleepDeep: 1.2 * 3600,
    sleepRem: 1.5 * 3600,
    sleepCore: 4.5 * 3600,
    sleepAwake: 300,
    respiratoryRate: 14,
    wristTempDelta: 0,
    spo2: 97,
    bodyMassLbs: 175,
    bodyFatPercentage: 10.5,
    leanBodyMassLbs: 156,
  }))

  const today = daysBefore(0)

  it('scores a well-recovered day as fresh', () => {
    const readiness = computeReadiness({
      date: today,
      metrics: [...baselineMetrics, { ...baselineMetrics[0]!, metricDate: today }],
      tsb: -5,
      acwr: 1.0,
    })
    assert.equal(readiness.level, 'fresh')
  })

  it('uses RMSSD instead of SDNN once a Series 12 baseline exists', () => {
    const withRmssd = baselineMetrics.map((metric) => ({
      ...metric,
      hrvSdnn: 40,
      hrvRmssd: 70,
    }))
    const todayMetric: DailyMetric = {
      ...withRmssd[0]!,
      metricDate: today,
      hrvSdnn: 20,
      hrvRmssd: 72,
    }
    const readiness = computeReadiness({
      date: today,
      metrics: [...withRmssd, todayMetric],
      tsb: -5,
      acwr: 1.0,
    })

    assert.ok(
      readiness.components.find((component) => component.key === 'hrv')?.detail.includes('RMSSD'),
      'expected RMSSD in the HRV detail once a baseline exists'
    )
    assert.equal(readiness.level, 'fresh')
  })

  it('drops when HRV is suppressed and resting heart rate is elevated', () => {
    const suppressed: DailyMetric = {
      ...baselineMetrics[0]!,
      metricDate: today,
      hrvSdnn: 38,
      restingHeartRate: 60,
      sleepSeconds: 5.5 * 3600,
    }
    const readiness = computeReadiness({
      date: today,
      metrics: [...baselineMetrics, suppressed],
      tsb: -25,
      acwr: 1.4,
    })

    assert.ok(readiness.score < 55, `expected a low score, got ${readiness.score}`)
    assert.ok(readiness.flags.includes('hrv_suppressed'))
    assert.ok(readiness.flags.includes('possible_illness_or_overreaching'))
  })

  it('caps the score when a knee shows mechanical red flags, however good the physiology', () => {
    const symptoms: SymptomLog[] = [
      {
        id: '1',
        logDate: today,
        site: 'r_knee_medial',
        painScore: 5,
        context: 'after',
        swelling: true,
        instability: false,
        locking: false,
        notes: null,
      },
    ]

    const readiness = computeReadiness({
      date: today,
      metrics: [...baselineMetrics, { ...baselineMetrics[0]!, metricDate: today }],
      tsb: 5,
      acwr: 0.9,
      symptoms,
    })

    assert.ok(readiness.score <= 30, `swelling must cap the score, got ${readiness.score}`)
    assert.ok(readiness.flags.includes('mechanical_red_flag'))
  })

  it('does not penalise a rest day for lack of training', () => {
    // The old formula docked readiness for skipped sessions. Rest with good
    // physiology should read as recovered.
    const readiness = computeReadiness({
      date: today,
      metrics: [...baselineMetrics, { ...baselineMetrics[0]!, metricDate: today }],
      tsb: 15,
      acwr: 0.85,
    })
    assert.ok(readiness.score >= 78, `rest day should score well, got ${readiness.score}`)
  })

  it('flags an ACWR spike', () => {
    const readiness = computeReadiness({
      date: today,
      metrics: [...baselineMetrics, { ...baselineMetrics[0]!, metricDate: today }],
      tsb: -15,
      acwr: 1.7,
    })
    assert.ok(readiness.flags.includes('acwr_spike'))
  })

  it('maps scores to levels at the documented boundaries', () => {
    assert.equal(levelForScore(80), 'fresh')
    assert.equal(levelForScore(60), 'moderate')
    assert.equal(levelForScore(40), 'fatigued')
    assert.equal(levelForScore(20), 'compromised')
  })
})

describe('race projection', () => {
  const budget = {
    swimSeconds: 1980,
    t1Seconds: 420,
    bikeSeconds: 4680,
    t2Seconds: 150,
    runSeconds: 3510,
  }

  it('identifies the swim as the limiter at current fitness', () => {
    // 2:30/100yd equals roughly 0.61 m/s
    const projection = projectRace({
      raceDate: '2027-08-22',
      goalSeconds: 10800,
      budget,
      cssSpeed: 0.61,
      vdot: 40,
      weeksRemaining: 48,
    })

    assert.ok(projection.projectedSeconds > 0)
    const swim = projection.splits.find((split) => split.discipline === 'swim')
    assert.ok(swim)
    assert.ok(swim!.deltaSeconds > 0, 'swim should be over budget at baseline pace')
    assert.ok(projection.limiters[0]?.startsWith('SWIM'), `expected swim first, got ${projection.limiters[0]}`)
  })

  it('brackets the projection with a confidence range', () => {
    const projection = projectRace({
      raceDate: '2027-08-22',
      goalSeconds: 10800,
      budget,
      cssSpeed: 0.75,
      vdot: 45,
      weeksRemaining: 24,
    })

    assert.ok(projection.confidenceLow < projection.projectedSeconds)
    assert.ok(projection.confidenceHigh > projection.projectedSeconds)
  })

  it('falls back to the budget when a discipline has no measurement', () => {
    const projection = projectRace({
      raceDate: '2027-08-22',
      goalSeconds: 10800,
      budget,
      weeksRemaining: 48,
    })

    const total = budget.swimSeconds + budget.t1Seconds + budget.bikeSeconds + budget.t2Seconds + budget.runSeconds
    assert.equal(projection.projectedSeconds, total)
  })
})

// ---------------------------------------------------------------------------

function daysBefore(days: number): string {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

/**
 * Race projection against the sub-3 split budget.
 *
 * The point of this is not the headline number. It is showing which leg is
 * costing the goal, so training time goes where it buys the most — and, given
 * the knee, so that the answer is not reflexively "run more". At current
 * fitness the swim is both the largest gap and the cheapest to close.
 */

import type { RaceProjection, SplitBudget } from '../types'
import {
  METERS_TO_YARDS,
  poolToOpenWater,
  predictRaceTime,
  speedForPower,
} from './performance'

export interface ProjectionInputs {
  raceDate: string
  goalSeconds: number
  budget: SplitBudget

  /** Current critical swim speed in m/s (pool). */
  cssSpeed?: number | null
  /** Current run VDOT. */
  vdot?: number | null
  /** Best sustained 40 km-equivalent bike speed in m/s. */
  bikeThresholdSpeed?: number | null
  /** Rider plus bike mass, for the power-based bike projection. */
  totalMassKg?: number | null
  ftpWatts?: number | null

  /** Measured transition times, when rehearsed. */
  t1Seconds?: number | null
  t2Seconds?: number | null

  /** Weeks of training remaining; drives the improvement allowance. */
  weeksRemaining?: number
}

const SWIM_METERS = 1500
const BIKE_METERS = 40_000
const RUN_METERS = 10_000

export function projectRace(inputs: ProjectionInputs): RaceProjection {
  const { budget, goalSeconds, raceDate } = inputs
  const weeksRemaining = inputs.weeksRemaining ?? 0

  const splits: RaceProjection['splits'] = []
  const limiters: string[] = []

  // --- Swim ---------------------------------------------------------------
  let swimSeconds = budget.swimSeconds
  let swimBasis = 'No CSS measured; using the budget as a placeholder.'

  if (inputs.cssSpeed && inputs.cssSpeed > 0) {
    const openWaterSpeed = poolToOpenWater(inputs.cssSpeed, { wetsuit: true, chop: 'moderate' })
    // An Olympic swim is raced slightly above CSS: short enough to hold a
    // little more than threshold, long enough that going out hard is costly.
    const raceSpeed = openWaterSpeed * 1.02
    swimSeconds = Math.round(SWIM_METERS / raceSpeed)

    const pacePer100Yd = (100 / METERS_TO_YARDS / inputs.cssSpeed).toFixed(0)
    swimBasis = `CSS ${pacePer100Yd}s/100yd, adjusted for wetsuit, chop and no wall push-offs.`
  }

  splits.push({
    discipline: 'swim',
    budgetSeconds: budget.swimSeconds,
    projectedSeconds: swimSeconds,
    deltaSeconds: swimSeconds - budget.swimSeconds,
    basis: swimBasis,
  })

  // --- T1 -----------------------------------------------------------------
  const t1 = inputs.t1Seconds ?? budget.t1Seconds
  splits.push({
    discipline: 't1',
    budgetSeconds: budget.t1Seconds,
    projectedSeconds: t1,
    deltaSeconds: t1 - budget.t1Seconds,
    basis: inputs.t1Seconds
      ? 'Measured in a transition rehearsal.'
      : 'Budget estimate. The barefoot run from the swim exit to DuSable Harbor is long; rehearse it.',
  })

  // --- Bike ---------------------------------------------------------------
  let bikeSeconds = budget.bikeSeconds
  let bikeBasis = 'No bike benchmark; using the budget as a placeholder.'

  if (inputs.ftpWatts && inputs.totalMassKg) {
    // Olympic-distance bike is raced at roughly 85% of FTP.
    const racePower = inputs.ftpWatts * 0.85
    const speed = speedForPower(racePower, { totalMassKg: inputs.totalMassKg })
    if (speed > 0) {
      bikeSeconds = Math.round(BIKE_METERS / speed)
      bikeBasis = `${Math.round(racePower)} W (85% of FTP ${inputs.ftpWatts} W) on a flat course.`
    }
  } else if (inputs.bikeThresholdSpeed && inputs.bikeThresholdSpeed > 0) {
    const raceSpeed = inputs.bikeThresholdSpeed * 0.95
    bikeSeconds = Math.round(BIKE_METERS / raceSpeed)
    bikeBasis = `${(raceSpeed * 2.237).toFixed(1)} mph sustained, from the best recorded steady ride.`
  }

  splits.push({
    discipline: 'bike',
    budgetSeconds: budget.bikeSeconds,
    projectedSeconds: bikeSeconds,
    deltaSeconds: bikeSeconds - budget.bikeSeconds,
    basis: bikeBasis,
  })

  // --- T2 -----------------------------------------------------------------
  const t2 = inputs.t2Seconds ?? budget.t2Seconds
  splits.push({
    discipline: 't2',
    budgetSeconds: budget.t2Seconds,
    projectedSeconds: t2,
    deltaSeconds: t2 - budget.t2Seconds,
    basis: inputs.t2Seconds ? 'Measured in a transition rehearsal.' : 'Budget estimate.',
  })

  // --- Run ----------------------------------------------------------------
  let runSeconds = budget.runSeconds
  let runBasis = 'No VDOT measured; using the budget as a placeholder.'

  if (inputs.vdot && inputs.vdot > 0) {
    const openTenK = predictRaceTime(inputs.vdot, RUN_METERS)
    if (openTenK) {
      // Running off the bike costs roughly 5-8% over an open 10 km.
      runSeconds = Math.round(openTenK * 1.06)
      runBasis = `VDOT ${inputs.vdot.toFixed(1)} (open 10K ${formatTime(openTenK)}), plus 6% for running off the bike.`
    }
  }

  splits.push({
    discipline: 'run',
    budgetSeconds: budget.runSeconds,
    projectedSeconds: runSeconds,
    deltaSeconds: runSeconds - budget.runSeconds,
    basis: runBasis,
  })

  // --- Totals -------------------------------------------------------------
  const projectedSeconds = splits.reduce((sum, split) => sum + split.projectedSeconds, 0)

  // Improvement still available, scaled by time remaining. Deliberately
  // conservative: assuming a big late-season jump is how athletes end up
  // chasing a number their body has not earned.
  const improvementFactor = Math.min(0.12, (weeksRemaining / 48) * 0.12)
  const optimistic = Math.round(projectedSeconds * (1 - improvementFactor))
  // The downside case is illness, travel and a missed block, not a bad day.
  const pessimistic = Math.round(projectedSeconds * 1.04)

  // Limiters, largest overrun first.
  const overruns = splits
    .filter((split) => split.deltaSeconds > 0)
    .sort((a, b) => b.deltaSeconds - a.deltaSeconds)

  for (const split of overruns) {
    limiters.push(
      `${split.discipline.toUpperCase()} is ${formatTime(split.deltaSeconds)} over budget (${formatTime(split.projectedSeconds)} vs ${formatTime(split.budgetSeconds)})`
    )
  }

  if (overruns.length === 0) {
    limiters.push('Every split is within budget at current fitness.')
  }

  return {
    raceDate,
    goalSeconds,
    projectedSeconds,
    confidenceLow: optimistic,
    confidenceHigh: pessimistic,
    splits,
    limiters,
  }
}

/**
 * Seconds saved per unit of training stress, per discipline.
 *
 * This is what makes the plan defensible: with a knee that limits running,
 * knowing the swim returns more seconds per unit of risk than the run is the
 * difference between a plan that works and one that ends in another layoff.
 */
export function improvementLeverage(projection: RaceProjection): {
  discipline: string
  secondsAvailable: number
  kneeRisk: 'none' | 'low' | 'moderate' | 'high'
  note: string
}[] {
  const byDiscipline = new Map(projection.splits.map((split) => [split.discipline, split]))

  const leverage: {
    discipline: string
    secondsAvailable: number
    kneeRisk: 'none' | 'low' | 'moderate' | 'high'
    note: string
  }[] = []

  const swim = byDiscipline.get('swim')
  if (swim) {
    leverage.push({
      discipline: 'swim',
      secondsAvailable: Math.max(0, swim.deltaSeconds),
      kneeRisk: 'none',
      note: 'Technique and threshold work carry no impact load. Highest return per unit of risk.',
    })
  }

  const t1 = byDiscipline.get('t1')
  if (t1) {
    leverage.push({
      discipline: 't1',
      secondsAvailable: 120,
      kneeRisk: 'none',
      note: 'Rehearsal alone typically saves one to two minutes. Free time.',
    })
  }

  const bike = byDiscipline.get('bike')
  if (bike) {
    leverage.push({
      discipline: 'bike',
      secondsAvailable: Math.max(0, bike.deltaSeconds),
      kneeRisk: 'moderate',
      note: 'Large gains available, but low-cadence torque is what aggravated the knee. Keep cadence high.',
    })
  }

  const run = byDiscipline.get('run')
  if (run) {
    leverage.push({
      discipline: 'run',
      secondsAvailable: Math.max(0, run.deltaSeconds),
      kneeRisk: 'high',
      note: 'Constrained by the return-to-run progression. Gains must come from consistency, not volume spikes.',
    })
  }

  return leverage.sort((a, b) => b.secondsAvailable - a.secondsAvailable)
}

export function formatTime(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const hours = Math.floor(abs / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const secs = abs % 60
  const sign = seconds < 0 ? '-' : ''

  if (hours > 0) {
    return `${sign}${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${sign}${minutes}:${String(secs).padStart(2, '0')}`
}

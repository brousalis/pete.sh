/**
 * Sport-specific performance models: swim CSS, run VDOT, bike power estimation.
 *
 * These convert raw sessions into the threshold values that the load
 * calculations and the race projection both depend on, so they are the closest
 * thing the system has to a fitness measurement.
 */

// ---------------------------------------------------------------------------
// Swimming — Critical Swim Speed
// ---------------------------------------------------------------------------

export const YARDS_TO_METERS = 0.9144
export const METERS_TO_YARDS = 1 / YARDS_TO_METERS

/**
 * Critical Swim Speed from a 400 / 200 time trial pair.
 *
 * CSS is the slope between the two efforts: the speed sustainable without
 * accumulating fatigue, and a close practical proxy for swim threshold. Both
 * distances must be in the same unit.
 */
export function computeCss(
  distance400: number,
  time400Seconds: number,
  distance200: number,
  time200Seconds: number
): { speed: number; pacePer100: number } | null {
  const deltaDistance = distance400 - distance200
  const deltaTime = time400Seconds - time200Seconds

  if (deltaDistance <= 0 || deltaTime <= 0) return null

  const speed = deltaDistance / deltaTime
  return {
    speed: round3(speed),
    pacePer100: round1(100 / speed),
  }
}

/**
 * Estimate CSS from a single sustained swim when no time trial exists.
 *
 * Deliberately conservative: a continuous aerobic swim is slower than true
 * threshold, so the observed pace is nudged up by a few percent rather than
 * taken at face value. Replace with a real 400/200 test as soon as possible —
 * this only exists so the system has a usable number on day one.
 */
export function estimateCssFromSteadySwim(
  distanceMeters: number,
  durationSeconds: number
): { speed: number; pacePer100: number; isEstimate: true } | null {
  if (distanceMeters < 400 || durationSeconds <= 0) return null

  const observedSpeed = distanceMeters / durationSeconds
  // Longer continuous swims sit closer to threshold than short ones.
  const factor = distanceMeters >= 1500 ? 1.03 : 1.06
  const speed = observedSpeed * factor

  return {
    speed: round3(speed),
    pacePer100: round1(100 / speed),
    isEstimate: true,
  }
}

/** Seconds per 100 yards from a speed in m/s. */
export function pacePer100Yards(speedMetersPerSecond: number): number {
  if (speedMetersPerSecond <= 0) return 0
  return round1((100 * YARDS_TO_METERS) / speedMetersPerSecond)
}

/** Seconds per 100 metres from a speed in m/s. */
export function pacePer100Meters(speedMetersPerSecond: number): number {
  if (speedMetersPerSecond <= 0) return 0
  return round1(100 / speedMetersPerSecond)
}

/**
 * Open-water conversion.
 *
 * Pool times overstate open-water speed: no walls to push off, sighting costs
 * both time and rhythm, and chop disrupts the stroke. A wetsuit gives some of
 * it back through buoyancy. Net effect in a harbour swim with a wetsuit is
 * roughly break-even to slightly slower, so the default is a small penalty
 * rather than the bonus athletes often assume.
 */
export function poolToOpenWater(
  poolSpeed: number,
  options: { wetsuit?: boolean; chop?: 'calm' | 'moderate' | 'rough' } = {}
): number {
  const wetsuitGain = options.wetsuit ? 1.04 : 1.0
  const chopPenalty =
    options.chop === 'rough' ? 0.9 : options.chop === 'moderate' ? 0.95 : 0.98
  // No push-offs: a 25 yd pool gives a wall every ~20 seconds.
  const noWallsPenalty = 0.96

  return round3(poolSpeed * wetsuitGain * chopPenalty * noWallsPenalty)
}

// ---------------------------------------------------------------------------
// Running — Daniels VDOT
// ---------------------------------------------------------------------------

/**
 * VDOT from a race or time trial (Daniels & Gilbert).
 *
 * VO2 demand of the pace, divided by the fraction of VO2max sustainable for
 * that duration. Reliable for efforts between roughly 3 and 60 minutes.
 */
export function computeVdot(distanceMeters: number, timeSeconds: number): number | null {
  if (distanceMeters <= 0 || timeSeconds <= 0) return null

  const minutes = timeSeconds / 60
  if (minutes < 2 || minutes > 240) return null

  const velocity = distanceMeters / minutes // metres per minute

  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * minutes) +
    0.2989558 * Math.exp(-0.1932605 * minutes)

  if (percentMax <= 0) return null

  return round1(vo2 / percentMax)
}

/**
 * Training paces for a VDOT, in seconds per mile.
 *
 * Easy pace is returned as a range because that is how it should be run: the
 * single biggest error in endurance training is running easy days too hard,
 * and a range makes the ceiling explicit.
 */
export interface VdotPaces {
  easy: [number, number]
  marathon: number
  threshold: number
  interval: number
  repetition: number
}

export function vdotPaces(vdot: number): VdotPaces {
  // Velocity at VO2max in m/min, inverting the VO2 demand equation.
  const vVo2max = velocityForVo2(vdot)

  const paceFor = (fraction: number): number => {
    const velocity = vVo2max * fraction
    if (velocity <= 0) return 0
    // 1609.344 m per mile; convert m/min to seconds per mile.
    return round1((1609.344 / velocity) * 60)
  }

  return {
    easy: [paceFor(0.7), paceFor(0.59)],
    marathon: paceFor(0.84),
    threshold: paceFor(0.88),
    interval: paceFor(0.98),
    repetition: paceFor(1.05),
  }
}

/** Inverse of the Daniels VO2 demand equation: velocity (m/min) for a VO2. */
function velocityForVo2(vo2: number): number {
  // 0.000104 v^2 + 0.182258 v - (4.6 + vo2) = 0
  const a = 0.000104
  const b = 0.182258
  const c = -(4.6 + vo2)

  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return 0

  return (-b + Math.sqrt(discriminant)) / (2 * a)
}

/** Threshold running speed in m/s for the load calculation. */
export function thresholdSpeedFromVdot(vdot: number): number {
  const paces = vdotPaces(vdot)
  if (paces.threshold <= 0) return 0
  return round3(1609.344 / paces.threshold)
}

/**
 * Predict a race time at another distance from a known VDOT.
 * Solved iteratively because the percent-of-max term depends on the duration
 * being solved for.
 */
export function predictRaceTime(vdot: number, distanceMeters: number): number | null {
  if (vdot <= 0 || distanceMeters <= 0) return null

  // Seed with velocity at threshold and converge.
  let minutes = distanceMeters / (velocityForVo2(vdot) * 0.85)

  for (let i = 0; i < 40; i++) {
    const percentMax =
      0.8 +
      0.1894393 * Math.exp(-0.012778 * minutes) +
      0.2989558 * Math.exp(-0.1932605 * minutes)

    const velocity = velocityForVo2(vdot * percentMax)
    if (velocity <= 0) return null

    const next = distanceMeters / velocity
    if (Math.abs(next - minutes) < 0.001) {
      minutes = next
      break
    }
    minutes = next
  }

  return Math.round(minutes * 60)
}

// ---------------------------------------------------------------------------
// Cycling — power estimation without a power meter
// ---------------------------------------------------------------------------

export interface BikePowerInputs {
  speedMetersPerSecond: number
  /** Rider plus bike, kilograms. */
  totalMassKg: number
  gradeFraction?: number
  /** Headwind is positive, tailwind negative, in m/s. */
  headwindMetersPerSecond?: number
  /** Effective frontal area. Defaults to a road bike on the hoods. */
  cda?: number
  /** Rolling resistance coefficient. Defaults to road tyres on tarmac. */
  crr?: number
  airDensity?: number
}

/**
 * Estimate cycling power from speed.
 *
 * With no power meter this is the only way to get a comparable bike load, and
 * it is the reason wind is worth fetching: on the Lakefront a 5 m/s headwind
 * changes required power at 20 mph by well over 100 W, which would otherwise
 * be misread as a fitness change.
 *
 * Accuracy is roughly +/-10% on flat ground with a known position, which is
 * enough to track progression but not to prescribe intervals to the watt.
 */
export function estimateBikePower(inputs: BikePowerInputs): number {
  const {
    speedMetersPerSecond: v,
    totalMassKg,
    gradeFraction = 0,
    headwindMetersPerSecond = 0,
    cda = 0.32,
    crr = 0.005,
    airDensity = 1.225,
  } = inputs

  if (v <= 0) return 0

  const g = 9.8067
  const drivetrainEfficiency = 0.975

  const airSpeed = v + headwindMetersPerSecond

  const rolling = crr * totalMassKg * g * Math.cos(Math.atan(gradeFraction)) * v
  // Drag acts against air speed but the work is done over ground speed.
  const aero = 0.5 * airDensity * cda * airSpeed * airSpeed * v * Math.sign(airSpeed || 1)
  const gravity = totalMassKg * g * gradeFraction * v

  const power = (rolling + aero + gravity) / drivetrainEfficiency
  return Math.max(0, Math.round(power))
}

/** Speed for a target power, by bisection on the power model. */
export function speedForPower(
  targetWatts: number,
  inputs: Omit<BikePowerInputs, 'speedMetersPerSecond'>
): number {
  if (targetWatts <= 0) return 0

  let low = 0
  let high = 25 // m/s, ~56 mph

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    const power = estimateBikePower({ ...inputs, speedMetersPerSecond: mid })
    if (power < targetWatts) low = mid
    else high = mid
  }

  return round3((low + high) / 2)
}

/**
 * Normalised power from a power series.
 *
 * The 30-second rolling average raised to the fourth power weights surges,
 * which is what actually drives fatigue on a variable course like Lower Wacker.
 */
export function normalizedPower(samples: { t: number; watts: number }[]): number | null {
  if (samples.length < 30) return null

  const sorted = [...samples].sort((a, b) => a.t - b.t)
  const rolling: number[] = []

  for (let i = 0; i < sorted.length; i++) {
    const windowStart = sorted[i]!.t - 30
    const window = sorted.filter(
      (sample, index) => index <= i && sample.t >= windowStart
    )
    if (window.length === 0) continue
    const avg = window.reduce((sum, sample) => sum + sample.watts, 0) / window.length
    rolling.push(avg ** 4)
  }

  if (rolling.length === 0) return null

  const mean = rolling.reduce((a, b) => a + b, 0) / rolling.length
  return Math.round(mean ** 0.25)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

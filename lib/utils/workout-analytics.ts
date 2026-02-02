/**
 * Workout Analytics Utilities
 *
 * Advanced metrics calculations for running workouts using data from Apple Health/HealthKit.
 * Provides insights based on:
 * - Sports science principles
 * - Elite Olympic training methodologies
 * - Statistical analysis of performance data
 */

// ============================================
// TYPES
// ============================================

export interface HrSample {
  timestamp: string
  bpm: number
}

export interface CadenceSample {
  timestamp: string
  steps_per_minute: number
}

export interface PaceSample {
  timestamp: string
  minutes_per_mile: number
}

export interface HeartRateZone {
  name: 'rest' | 'warmup' | 'fatBurn' | 'cardio' | 'peak'
  minBpm: number
  maxBpm: number
  duration: number
  percentage: number
}

export interface WorkoutSplit {
  splitNumber: number
  distanceMeters: number
  timeSeconds: number
  avgPace: number // min/mile
  avgHr: number
  avgCadence: number | null
  elevationChange: number | null
  // Computed insights
  paceVsAvg: number // percentage difference from overall avg
  hrVsAvg: number // percentage difference from overall avg
  efficiencyFactor: number // pace relative to HR effort
}

export interface CardiacDriftAnalysis {
  firstHalfAvgHr: number
  secondHalfAvgHr: number
  driftPercentage: number // positive = HR increased
  interpretation: 'minimal' | 'moderate' | 'significant' | 'excessive'
  recommendation: string
}

export interface AerobicDecoupling {
  firstHalfEfficiency: number // pace:HR ratio
  secondHalfEfficiency: number
  decouplingPercentage: number
  interpretation: 'excellent' | 'good' | 'moderate' | 'poor'
  recommendation: string
}

export interface CadenceAnalysis {
  average: number
  min: number
  max: number
  standardDeviation: number
  consistency: 'very_consistent' | 'consistent' | 'variable' | 'highly_variable'
  optimalRange: boolean // 170-180 SPM for running
  recommendation: string
}

export interface PaceAnalysis {
  average: number
  best: number
  worst: number
  standardDeviation: number
  splitStrategy: 'negative' | 'even' | 'positive' | 'variable'
  recommendation: string
}

export interface TrainingImpulse {
  trimp: number // Training Impulse score
  intensity:
    | 'recovery'
    | 'easy'
    | 'moderate'
    | 'tempo'
    | 'threshold'
    | 'vo2max'
    | 'anaerobic'
  loadCategory: 'low' | 'medium' | 'high' | 'very_high'
  recommendation: string
}

export interface HrRecovery {
  oneMinuteRecovery: number | null // BPM drop in first minute
  recoveryRating:
    | 'excellent'
    | 'good'
    | 'average'
    | 'below_average'
    | 'poor'
    | 'unknown'
  recommendation: string
}

export interface PerformanceInsight {
  category: 'strength' | 'improvement' | 'warning' | 'info'
  title: string
  description: string
  metric?: string
  icon?: string
}

export interface EnhancedWorkoutAnalytics {
  // Basic stats
  durationSeconds: number
  distanceMiles: number
  avgPace: number
  avgHr: number
  avgCadence: number | null

  // Advanced HR analysis
  hrZones: HeartRateZone[]
  cardiacDrift: CardiacDriftAnalysis
  hrVariability: {
    min: number
    max: number
    range: number
    avgFirstQuarter: number
    avgLastQuarter: number
  }

  // Efficiency metrics
  aerobicDecoupling: AerobicDecoupling
  efficiencyFactor: number // overall pace:HR ratio

  // Running form analysis
  cadenceAnalysis: CadenceAnalysis
  paceAnalysis: PaceAnalysis

  // Training load
  trainingImpulse: TrainingImpulse

  // Recovery (if post-workout data available)
  hrRecovery: HrRecovery

  // Mile/km splits
  splits: WorkoutSplit[]

  // Synthesized insights
  insights: PerformanceInsight[]

  // Time-series data for charts (normalized timestamps)
  timeSeriesData: {
    elapsedSeconds: number
    hr: number | null
    cadence: number | null
    pace: number | null
  }[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse ISO timestamp to Date
 */
function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp)
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squareDiffs = values.map(value => Math.pow(value - mean, 2))
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
  return Math.sqrt(avgSquareDiff)
}

/**
 * Get average of array
 */
function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Interpolate value at timestamp from samples
 */
function interpolateValue(
  samples: { timestamp: string; value: number }[],
  targetTime: Date
): number | null {
  if (samples.length === 0) return null

  const targetMs = targetTime.getTime()

  // Find surrounding samples
  let before: { timestamp: string; value: number } | null = null
  let after: { timestamp: string; value: number } | null = null

  for (const sample of samples) {
    const sampleMs = parseTimestamp(sample.timestamp).getTime()
    if (sampleMs <= targetMs) {
      before = sample
    } else {
      after = sample
      break
    }
  }

  if (!before) return after?.value ?? null
  if (!after) return before.value

  // Linear interpolation
  const beforeMs = parseTimestamp(before.timestamp).getTime()
  const afterMs = parseTimestamp(after.timestamp).getTime()
  const ratio = (targetMs - beforeMs) / (afterMs - beforeMs)

  return before.value + (after.value - before.value) * ratio
}

// ============================================
// MAIN ANALYTICS FUNCTIONS
// ============================================

/**
 * Calculate TRIMP (Training Impulse)
 * Based on Banister's TRIMP formula using HR zones
 */
export function calculateTRIMP(
  durationMinutes: number,
  avgHr: number,
  restingHr: number = 60,
  maxHr: number = 185
): TrainingImpulse {
  // TRIMP = Duration × HR Reserve × Exponential weighting
  const hrReserve = (avgHr - restingHr) / (maxHr - restingHr)
  const clampedReserve = Math.max(0, Math.min(1, hrReserve))

  // Gender-neutral coefficient (use 1.67 for males, 1.92 for females as options)
  const coefficient = 1.67
  const trimp =
    durationMinutes * clampedReserve * Math.exp(coefficient * clampedReserve)

  // Categorize intensity
  let intensity: TrainingImpulse['intensity']
  let loadCategory: TrainingImpulse['loadCategory']
  let recommendation: string

  const hrPercentMax = avgHr / maxHr

  if (hrPercentMax < 0.6) {
    intensity = 'recovery'
    recommendation =
      'Great recovery effort. This intensity promotes active recovery without adding training stress.'
  } else if (hrPercentMax < 0.7) {
    intensity = 'easy'
    recommendation =
      'Good easy/base building pace. This builds aerobic foundation efficiently.'
  } else if (hrPercentMax < 0.8) {
    intensity = 'moderate'
    recommendation =
      'Moderate effort. Good for building aerobic capacity and running economy.'
  } else if (hrPercentMax < 0.85) {
    intensity = 'tempo'
    recommendation =
      'Tempo effort. This improves lactate threshold and sustained pace ability.'
  } else if (hrPercentMax < 0.9) {
    intensity = 'threshold'
    recommendation =
      'Threshold work. High training stimulus - ensure adequate recovery before next hard session.'
  } else if (hrPercentMax < 0.95) {
    intensity = 'vo2max'
    recommendation =
      'VO2max effort. Maximum aerobic stimulus - take at least 48 hours before another intense session.'
  } else {
    intensity = 'anaerobic'
    recommendation =
      'Anaerobic/max effort. Full recovery required - 48-72 hours before next quality session.'
  }

  if (trimp < 50) {
    loadCategory = 'low'
  } else if (trimp < 100) {
    loadCategory = 'medium'
  } else if (trimp < 150) {
    loadCategory = 'high'
  } else {
    loadCategory = 'very_high'
  }

  return {
    trimp: Math.round(trimp),
    intensity,
    loadCategory,
    recommendation,
  }
}

/**
 * Analyze cardiac drift during workout
 * Cardiac drift indicates dehydration, heat stress, or insufficient aerobic base
 */
export function analyzeCardiacDrift(
  hrSamples: HrSample[]
): CardiacDriftAnalysis {
  if (hrSamples.length < 10) {
    return {
      firstHalfAvgHr: 0,
      secondHalfAvgHr: 0,
      driftPercentage: 0,
      interpretation: 'minimal',
      recommendation: 'Insufficient HR data for drift analysis.',
    }
  }

  const midpoint = Math.floor(hrSamples.length / 2)
  const firstHalf = hrSamples.slice(0, midpoint)
  const secondHalf = hrSamples.slice(midpoint)

  const firstHalfAvgHr = Math.round(average(firstHalf.map(s => s.bpm)))
  const secondHalfAvgHr = Math.round(average(secondHalf.map(s => s.bpm)))

  const driftPercentage =
    ((secondHalfAvgHr - firstHalfAvgHr) / firstHalfAvgHr) * 100

  let interpretation: CardiacDriftAnalysis['interpretation']
  let recommendation: string

  if (driftPercentage < 3) {
    interpretation = 'minimal'
    recommendation =
      'Excellent cardiac efficiency. Your aerobic system handled this effort well with minimal heart rate drift.'
  } else if (driftPercentage < 5) {
    interpretation = 'moderate'
    recommendation =
      'Normal cardiac drift. Consider hydrating more during longer runs or on warmer days.'
  } else if (driftPercentage < 8) {
    interpretation = 'significant'
    recommendation =
      'Notable cardiac drift. This may indicate dehydration, heat stress, or pushing beyond current aerobic capacity. Focus on hydration and building aerobic base.'
  } else {
    interpretation = 'excessive'
    recommendation =
      'High cardiac drift detected. Review hydration, pacing strategy, and consider more easy aerobic runs to build base fitness.'
  }

  return {
    firstHalfAvgHr,
    secondHalfAvgHr,
    driftPercentage: Math.round(driftPercentage * 10) / 10,
    interpretation,
    recommendation,
  }
}

/**
 * Analyze aerobic decoupling (Pace:HR ratio degradation)
 * Key metric for marathon/long run readiness
 */
export function analyzeAerobicDecoupling(
  hrSamples: HrSample[],
  paceSamples: PaceSample[],
  durationSeconds: number
): AerobicDecoupling {
  if (hrSamples.length < 10 || paceSamples.length < 4) {
    return {
      firstHalfEfficiency: 0,
      secondHalfEfficiency: 0,
      decouplingPercentage: 0,
      interpretation: 'good',
      recommendation: 'Insufficient data for decoupling analysis.',
    }
  }

  const midpoint = Math.floor(hrSamples.length / 2)
  const paceMidpoint = Math.floor(paceSamples.length / 2)

  const firstHalfHr = average(hrSamples.slice(0, midpoint).map(s => s.bpm))
  const secondHalfHr = average(hrSamples.slice(midpoint).map(s => s.bpm))

  const firstHalfPace = average(
    paceSamples.slice(0, paceMidpoint).map(s => s.minutes_per_mile)
  )
  const secondHalfPace = average(
    paceSamples.slice(paceMidpoint).map(s => s.minutes_per_mile)
  )

  // Efficiency = Speed / HR (higher is better, so use inverse pace)
  const firstHalfEfficiency = ((1 / firstHalfPace) * 100) / firstHalfHr
  const secondHalfEfficiency = ((1 / secondHalfPace) * 100) / secondHalfHr

  const decouplingPercentage =
    ((firstHalfEfficiency - secondHalfEfficiency) / firstHalfEfficiency) * 100

  let interpretation: AerobicDecoupling['interpretation']
  let recommendation: string

  if (decouplingPercentage < 3.5) {
    interpretation = 'excellent'
    recommendation =
      "Outstanding aerobic efficiency. Your pace:HR relationship held steady throughout - you're well-prepared for endurance events at this effort level."
  } else if (decouplingPercentage < 5) {
    interpretation = 'good'
    recommendation =
      'Good aerobic coupling. Minor efficiency loss is normal. Continue building your aerobic base with easy miles.'
  } else if (decouplingPercentage < 8) {
    interpretation = 'moderate'
    recommendation =
      'Moderate decoupling detected. For races at this duration, consider starting more conservatively or focus on more aerobic base work.'
  } else {
    interpretation = 'poor'
    recommendation =
      'Significant decoupling. Either this effort was too hard for current fitness, or environmental factors (heat, dehydration) affected performance. Build more aerobic base before racing at this intensity.'
  }

  return {
    firstHalfEfficiency: Math.round(firstHalfEfficiency * 1000) / 1000,
    secondHalfEfficiency: Math.round(secondHalfEfficiency * 1000) / 1000,
    decouplingPercentage: Math.round(decouplingPercentage * 10) / 10,
    interpretation,
    recommendation,
  }
}

/**
 * Analyze cadence patterns
 * Elite runners typically maintain 170-180 SPM
 */
export function analyzeCadence(
  cadenceSamples: CadenceSample[]
): CadenceAnalysis {
  if (cadenceSamples.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      consistency: 'variable',
      optimalRange: false,
      recommendation: 'No cadence data available.',
    }
  }

  const values = cadenceSamples.map(s => s.steps_per_minute)
  const avg = Math.round(average(values))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const stdDev = standardDeviation(values)

  // Consistency based on coefficient of variation
  const cv = stdDev / avg
  let consistency: CadenceAnalysis['consistency']

  if (cv < 0.03) {
    consistency = 'very_consistent'
  } else if (cv < 0.06) {
    consistency = 'consistent'
  } else if (cv < 0.1) {
    consistency = 'variable'
  } else {
    consistency = 'highly_variable'
  }

  // Optimal range for running (170-180 SPM reduces injury risk and improves efficiency)
  const optimalRange = avg >= 170 && avg <= 185

  let recommendation: string
  if (avg < 160) {
    recommendation =
      'Cadence is low. Try shortening your stride and increasing turnover - aim for 170-180 SPM. This reduces impact forces and improves running economy.'
  } else if (avg < 170) {
    recommendation =
      'Cadence is slightly below optimal. Small increases (5-10 SPM) can improve efficiency. Use a metronome app during some runs.'
  } else if (avg <= 185) {
    recommendation =
      "Excellent cadence! You're in the optimal range that elite runners target. This reduces injury risk and maximizes efficiency."
  } else {
    recommendation =
      "Cadence is high. While not necessarily bad, ensure you're not sacrificing stride length. Focus on smooth, powerful strides."
  }

  if (consistency === 'highly_variable' || consistency === 'variable') {
    recommendation +=
      ' Work on maintaining consistent cadence throughout your run, especially when fatigued.'
  }

  return {
    average: avg,
    min,
    max,
    standardDeviation: Math.round(stdDev * 10) / 10,
    consistency,
    optimalRange,
    recommendation,
  }
}

/**
 * Analyze pace patterns and split strategy
 */
export function analyzePace(
  paceSamples: PaceSample[],
  splits: WorkoutSplit[]
): PaceAnalysis {
  if (paceSamples.length === 0) {
    return {
      average: 0,
      best: 0,
      worst: 0,
      standardDeviation: 0,
      splitStrategy: 'even',
      recommendation: 'No pace data available.',
    }
  }

  const values = paceSamples
    .map(s => s.minutes_per_mile)
    .filter(v => v > 0 && v < 30)
  const avg = average(values)
  const best = Math.min(...values)
  const worst = Math.max(...values)
  const stdDev = standardDeviation(values)

  // Determine split strategy from actual splits
  let splitStrategy: PaceAnalysis['splitStrategy'] = 'even'
  let recommendation = ''

  if (splits.length >= 2) {
    const firstHalfSplits = splits.slice(0, Math.floor(splits.length / 2))
    const secondHalfSplits = splits.slice(Math.floor(splits.length / 2))

    const firstHalfAvgPace = average(firstHalfSplits.map(s => s.avgPace))
    const secondHalfAvgPace = average(secondHalfSplits.map(s => s.avgPace))

    const paceDiff = secondHalfAvgPace - firstHalfAvgPace
    const paceVariation = stdDev / avg

    if (paceVariation > 0.15) {
      splitStrategy = 'variable'
      recommendation =
        'Highly variable pacing detected. For optimal performance, aim for more consistent effort throughout your run.'
    } else if (paceDiff < -0.15) {
      // Second half faster by more than 9 sec/mile
      splitStrategy = 'negative'
      recommendation =
        'Great negative split! Running the second half faster is the optimal racing strategy and shows good pacing discipline.'
    } else if (paceDiff > 0.25) {
      // Second half slower by more than 15 sec/mile
      splitStrategy = 'positive'
      recommendation =
        'Positive split detected (slowed down). Consider starting more conservatively to maintain pace throughout. This is common but leaves time on the table.'
    } else {
      splitStrategy = 'even'
      recommendation =
        'Even pacing - this is excellent for training runs and shows good effort management.'
    }
  } else {
    recommendation = 'Complete more distance to analyze split strategy.'
  }

  return {
    average: Math.round(avg * 100) / 100,
    best: Math.round(best * 100) / 100,
    worst: Math.round(worst * 100) / 100,
    standardDeviation: Math.round(stdDev * 100) / 100,
    splitStrategy,
    recommendation,
  }
}

/**
 * Calculate mile splits from time-series data
 */
export function calculateSplits(
  hrSamples: HrSample[],
  paceSamples: PaceSample[],
  cadenceSamples: CadenceSample[],
  totalDistanceMiles: number,
  totalDurationSeconds: number
): WorkoutSplit[] {
  if (totalDistanceMiles < 0.5) return []

  const splits: WorkoutSplit[] = []
  const numFullMiles = Math.floor(totalDistanceMiles)

  const avgPaceOverall =
    paceSamples.length > 0
      ? average(paceSamples.map(s => s.minutes_per_mile))
      : totalDurationSeconds / 60 / totalDistanceMiles

  const avgHrOverall =
    hrSamples.length > 0 ? average(hrSamples.map(s => s.bpm)) : 0

  // Estimate split times based on pace samples
  if (numFullMiles > 0 && paceSamples.length > 0) {
    const pacePerSplit = Math.floor(paceSamples.length / numFullMiles)

    for (let i = 0; i < numFullMiles; i++) {
      const startIdx = i * pacePerSplit
      const endIdx = Math.min((i + 1) * pacePerSplit, paceSamples.length)

      const splitPaces = paceSamples.slice(startIdx, endIdx)
      const avgPace = average(splitPaces.map(s => s.minutes_per_mile))
      const timeSeconds = Math.round(avgPace * 60)

      // Corresponding HR samples
      const hrStartIdx = Math.floor((i * hrSamples.length) / numFullMiles)
      const hrEndIdx = Math.floor(((i + 1) * hrSamples.length) / numFullMiles)
      const splitHr = hrSamples.slice(hrStartIdx, hrEndIdx)
      const avgHr = Math.round(average(splitHr.map(s => s.bpm)))

      // Corresponding cadence
      let avgCadence: number | null = null
      if (cadenceSamples.length > 0) {
        const cadenceStartIdx = Math.floor(
          (i * cadenceSamples.length) / numFullMiles
        )
        const cadenceEndIdx = Math.floor(
          ((i + 1) * cadenceSamples.length) / numFullMiles
        )
        const splitCadence = cadenceSamples.slice(
          cadenceStartIdx,
          cadenceEndIdx
        )
        if (splitCadence.length > 0) {
          avgCadence = Math.round(
            average(splitCadence.map(s => s.steps_per_minute))
          )
        }
      }

      // Calculate efficiency factor (higher pace number = slower, so invert)
      const efficiencyFactor = avgHr > 0 ? ((1 / avgPace) * 100) / avgHr : 0

      splits.push({
        splitNumber: i + 1,
        distanceMeters: 1609.34, // 1 mile in meters
        timeSeconds,
        avgPace: Math.round(avgPace * 100) / 100,
        avgHr,
        avgCadence,
        elevationChange: null, // Would need route data
        paceVsAvg:
          Math.round(((avgPace - avgPaceOverall) / avgPaceOverall) * 100 * 10) /
          10,
        hrVsAvg:
          avgHrOverall > 0
            ? Math.round(((avgHr - avgHrOverall) / avgHrOverall) * 100 * 10) /
              10
            : 0,
        efficiencyFactor: Math.round(efficiencyFactor * 1000) / 1000,
      })
    }
  }

  return splits
}

/**
 * Generate time-series data for multi-axis charts
 * Normalizes all samples to elapsed seconds from start
 *
 * This function handles cases where sample timestamps may not align perfectly
 * with the workout start time (common with Apple Watch cadence/pace data which
 * may start recording later in the workout or have offset timestamps).
 */
export function generateTimeSeriesData(
  hrSamples: HrSample[],
  cadenceSamples: CadenceSample[],
  paceSamples: PaceSample[],
  startTime: Date,
  durationSeconds: number
): EnhancedWorkoutAnalytics['timeSeriesData'] {
  const data: EnhancedWorkoutAnalytics['timeSeriesData'] = []
  const startTimeMs = startTime.getTime()
  const endTimeMs = startTimeMs + durationSeconds * 1000

  // Helper to normalize samples and detect if timestamps need realignment
  function normalizeSamples<T extends { timestamp: string }>(
    samples: T[],
    getValue: (s: T) => number
  ): {
    map: Map<number, number>
    needsRealignment: boolean
    minElapsed: number
    maxElapsed: number
  } {
    const map = new Map<number, number>()
    let minElapsed = Infinity
    let maxElapsed = -Infinity
    let outsideCount = 0

    samples.forEach(sample => {
      const sampleTime = parseTimestamp(sample.timestamp).getTime()
      const elapsed = Math.round((sampleTime - startTimeMs) / 1000)

      // Track if sample is outside expected workout range
      if (elapsed < -30 || elapsed > durationSeconds + 30) {
        outsideCount++
      }

      minElapsed = Math.min(minElapsed, elapsed)
      maxElapsed = Math.max(maxElapsed, elapsed)
      map.set(elapsed, getValue(sample))
    })

    // If more than 50% of samples are outside workout range, timestamps likely need realignment
    const needsRealignment =
      samples.length > 0 && outsideCount > samples.length * 0.5

    return { map, needsRealignment, minElapsed, maxElapsed }
  }

  // Normalize HR samples (usually reliable)
  const hrResult = normalizeSamples(hrSamples, s => s.bpm)
  const hrMap = hrResult.map

  // Normalize cadence samples - may need realignment
  const cadenceResult = normalizeSamples(
    cadenceSamples,
    s => s.steps_per_minute
  )
  let cadenceMap = cadenceResult.map

  // Normalize pace samples - may need realignment
  const paceResult = normalizeSamples(paceSamples, s => s.minutes_per_mile)
  let paceMap = paceResult.map

  // Check if cadence timestamps need realignment
  // This handles cases where cadence samples use their own timestamp reference
  // (e.g., timestamps relative to when cadence sensor started, not workout start)
  //
  // We detect misalignment when:
  // 1. The sample timestamps span a range similar to workout duration, BUT
  // 2. The first sample is significantly offset from workout start
  // This distinguishes from legitimate late starts (user warming up) where
  // the span would be shorter than workout duration
  if (cadenceSamples.length > 1) {
    const cadenceSpan = cadenceResult.maxElapsed - cadenceResult.minElapsed
    const expectedSpan = durationSeconds * 0.7 // Samples should cover at least 70% of workout
    const isSignificantOffset =
      cadenceResult.minElapsed > durationSeconds * 0.25 ||
      cadenceResult.minElapsed < -30
    const spanMatchesDuration = cadenceSpan > expectedSpan

    // If samples span the expected duration but are offset, scale them to fit workout
    if (isSignificantOffset && spanMatchesDuration) {
      cadenceMap = new Map<number, number>()
      // Scale samples to map from [minElapsed, maxElapsed] -> [0, durationSeconds]
      const minElapsed = cadenceResult.minElapsed
      const scale = cadenceSpan > 0 ? durationSeconds / cadenceSpan : 1
      cadenceSamples.forEach(sample => {
        const sampleTime = parseTimestamp(sample.timestamp).getTime()
        const originalElapsed = Math.round((sampleTime - startTimeMs) / 1000)
        // Scale to fit workout duration
        const scaledElapsed = Math.round((originalElapsed - minElapsed) * scale)
        // Ensure scaled time is within workout bounds
        if (scaledElapsed >= 0 && scaledElapsed <= durationSeconds) {
          cadenceMap.set(scaledElapsed, sample.steps_per_minute)
        }
      })
    } else if (cadenceResult.needsRealignment) {
      // Fallback: if timestamps are completely outside workout range, distribute evenly
      cadenceMap = new Map<number, number>()
      const cadenceInterval = durationSeconds / (cadenceSamples.length - 1 || 1)
      cadenceSamples.forEach((sample, idx) => {
        const elapsed = Math.round(idx * cadenceInterval)
        cadenceMap.set(elapsed, sample.steps_per_minute)
      })
    }
  }

  // Same logic for pace samples
  if (paceSamples.length > 1) {
    const paceSpan = paceResult.maxElapsed - paceResult.minElapsed
    const expectedSpan = durationSeconds * 0.7
    const isSignificantOffset =
      paceResult.minElapsed > durationSeconds * 0.25 ||
      paceResult.minElapsed < -30
    const spanMatchesDuration = paceSpan > expectedSpan

    if (isSignificantOffset && spanMatchesDuration) {
      paceMap = new Map<number, number>()
      // Scale samples to map from [minElapsed, maxElapsed] -> [0, durationSeconds]
      const minElapsed = paceResult.minElapsed
      const scale = paceSpan > 0 ? durationSeconds / paceSpan : 1
      paceSamples.forEach(sample => {
        const sampleTime = parseTimestamp(sample.timestamp).getTime()
        const originalElapsed = Math.round((sampleTime - startTimeMs) / 1000)
        const scaledElapsed = Math.round((originalElapsed - minElapsed) * scale)
        if (scaledElapsed >= 0 && scaledElapsed <= durationSeconds) {
          paceMap.set(scaledElapsed, sample.minutes_per_mile)
        }
      })
    } else if (paceResult.needsRealignment) {
      paceMap = new Map<number, number>()
      const paceInterval = durationSeconds / (paceSamples.length - 1 || 1)
      paceSamples.forEach((sample, idx) => {
        const elapsed = Math.round(idx * paceInterval)
        paceMap.set(elapsed, sample.minutes_per_mile)
      })
    }
  }

  // Generate data points at regular intervals (every 15 seconds)
  const interval = 15
  for (let elapsed = 0; elapsed <= durationSeconds; elapsed += interval) {
    // Find nearest values (within 30 seconds)
    let hr: number | null = null
    let cadence: number | null = null
    let pace: number | null = null

    for (let offset = 0; offset <= 30; offset++) {
      if (hr === null && hrMap.has(elapsed + offset))
        hr = hrMap.get(elapsed + offset)!
      if (hr === null && hrMap.has(elapsed - offset))
        hr = hrMap.get(elapsed - offset)!
      if (cadence === null && cadenceMap.has(elapsed + offset))
        cadence = cadenceMap.get(elapsed + offset)!
      if (cadence === null && cadenceMap.has(elapsed - offset))
        cadence = cadenceMap.get(elapsed - offset)!
      if (pace === null && paceMap.has(elapsed + offset))
        pace = paceMap.get(elapsed + offset)!
      if (pace === null && paceMap.has(elapsed - offset))
        pace = paceMap.get(elapsed - offset)!
    }

    data.push({
      elapsedSeconds: elapsed,
      hr,
      cadence,
      pace,
    })
  }

  return data
}

/**
 * Generate performance insights from all analytics
 */
export function generateInsights(
  cardiacDrift: CardiacDriftAnalysis,
  aerobicDecoupling: AerobicDecoupling,
  cadenceAnalysis: CadenceAnalysis,
  paceAnalysis: PaceAnalysis,
  trainingImpulse: TrainingImpulse,
  hrZones: HeartRateZone[],
  durationMinutes: number
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = []

  // Cardiac drift insight
  if (cardiacDrift.interpretation === 'minimal') {
    insights.push({
      category: 'strength',
      title: 'Excellent Cardiac Efficiency',
      description:
        'Your heart rate stayed stable throughout the workout, indicating good hydration and aerobic fitness.',
      metric: `${cardiacDrift.driftPercentage}% drift`,
      icon: 'heart',
    })
  } else if (cardiacDrift.interpretation === 'excessive') {
    insights.push({
      category: 'warning',
      title: 'High Cardiac Drift',
      description: cardiacDrift.recommendation,
      metric: `${cardiacDrift.driftPercentage}% drift`,
      icon: 'alert-triangle',
    })
  }

  // Aerobic decoupling insight
  if (aerobicDecoupling.interpretation === 'excellent') {
    insights.push({
      category: 'strength',
      title: 'Superior Aerobic Coupling',
      description:
        'Your pace:HR relationship held steady - excellent endurance indicator.',
      metric: `${aerobicDecoupling.decouplingPercentage}% decoupling`,
      icon: 'trending-up',
    })
  } else if (aerobicDecoupling.interpretation === 'poor') {
    insights.push({
      category: 'improvement',
      title: 'Aerobic Efficiency Opportunity',
      description: aerobicDecoupling.recommendation,
      metric: `${aerobicDecoupling.decouplingPercentage}% decoupling`,
      icon: 'target',
    })
  }

  // Cadence insight
  if (cadenceAnalysis.optimalRange) {
    insights.push({
      category: 'strength',
      title: 'Optimal Running Cadence',
      description:
        'Your cadence is in the 170-180 SPM sweet spot that elite runners target.',
      metric: `${cadenceAnalysis.average} SPM`,
      icon: 'footprints',
    })
  } else if (cadenceAnalysis.average > 0 && cadenceAnalysis.average < 165) {
    insights.push({
      category: 'improvement',
      title: 'Cadence Opportunity',
      description:
        'Increasing your cadence toward 170-180 SPM can reduce injury risk and improve efficiency.',
      metric: `${cadenceAnalysis.average} SPM`,
      icon: 'footprints',
    })
  }

  // Pacing strategy insight
  if (paceAnalysis.splitStrategy === 'negative') {
    insights.push({
      category: 'strength',
      title: 'Perfect Negative Split',
      description:
        'Running the second half faster is the gold standard for pacing!',
      icon: 'award',
    })
  } else if (
    paceAnalysis.splitStrategy === 'positive' &&
    durationMinutes > 20
  ) {
    insights.push({
      category: 'improvement',
      title: 'Pacing Strategy',
      description:
        'You slowed in the second half. Try starting 5-10 seconds/mile slower to finish stronger.',
      icon: 'clock',
    })
  }

  // Training load insight
  insights.push({
    category: 'info',
    title: `${trainingImpulse.intensity.charAt(0).toUpperCase() + trainingImpulse.intensity.slice(1)} Intensity`,
    description: trainingImpulse.recommendation,
    metric: `TRIMP: ${trainingImpulse.trimp}`,
    icon: 'flame',
  })

  // Zone distribution insight
  const peakZone = hrZones.find(z => z.name === 'peak')
  const cardioZone = hrZones.find(z => z.name === 'cardio')
  const fatBurnZone = hrZones.find(z => z.name === 'fatBurn')

  if (peakZone && peakZone.percentage > 50) {
    insights.push({
      category: 'warning',
      title: 'High Peak Zone Time',
      description:
        'Over half your workout was in the peak HR zone. Ensure adequate recovery before your next hard session.',
      metric: `${peakZone.percentage}% peak zone`,
      icon: 'zap',
    })
  } else if (fatBurnZone && fatBurnZone.percentage > 60) {
    insights.push({
      category: 'info',
      title: 'Aerobic Base Building',
      description:
        'Great zone 2/3 work! This effort builds aerobic capacity and fat-burning efficiency.',
      metric: `${fatBurnZone.percentage}% fat burn zone`,
      icon: 'battery-charging',
    })
  }

  return insights
}

/**
 * Main function to compute all enhanced analytics
 */
export function computeEnhancedAnalytics(
  workout: {
    start_date: string
    end_date: string
    duration: number
    distance_miles: number | null
    hr_average: number | null
    hr_min: number | null
    hr_max: number | null
    hr_zones: HeartRateZone[] | null
    cadence_average: number | null
    pace_average: number | null
    pace_best: number | null
  },
  hrSamples: HrSample[],
  cadenceSamples: CadenceSample[],
  paceSamples: PaceSample[],
  options: {
    restingHr?: number
    maxHr?: number
  } = {}
): EnhancedWorkoutAnalytics {
  const { restingHr = 60, maxHr = 185 } = options

  const startTime = parseTimestamp(workout.start_date)
  const durationSeconds = workout.duration
  const durationMinutes = durationSeconds / 60
  const distanceMiles = workout.distance_miles || 0

  // Basic stats
  const avgHr =
    workout.hr_average ||
    (hrSamples.length > 0 ? Math.round(average(hrSamples.map(s => s.bpm))) : 0)
  const avgCadence =
    workout.cadence_average ||
    (cadenceSamples.length > 0
      ? Math.round(average(cadenceSamples.map(s => s.steps_per_minute)))
      : null)
  const avgPace =
    workout.pace_average ||
    (paceSamples.length > 0
      ? average(paceSamples.map(s => s.minutes_per_mile))
      : distanceMiles > 0
        ? durationMinutes / distanceMiles
        : 0)

  // HR zones
  const hrZones = workout.hr_zones || []

  // HR variability
  const hrValues = hrSamples.map(s => s.bpm)
  const quarterLength = Math.floor(hrSamples.length / 4)
  const hrVariability = {
    min: workout.hr_min || (hrValues.length > 0 ? Math.min(...hrValues) : 0),
    max: workout.hr_max || (hrValues.length > 0 ? Math.max(...hrValues) : 0),
    range: 0,
    avgFirstQuarter:
      quarterLength > 0
        ? Math.round(average(hrValues.slice(0, quarterLength)))
        : avgHr,
    avgLastQuarter:
      quarterLength > 0
        ? Math.round(average(hrValues.slice(-quarterLength)))
        : avgHr,
  }
  hrVariability.range = hrVariability.max - hrVariability.min

  // Advanced analytics
  const cardiacDrift = analyzeCardiacDrift(hrSamples)
  const aerobicDecoupling = analyzeAerobicDecoupling(
    hrSamples,
    paceSamples,
    durationSeconds
  )
  const cadenceAnalysis = analyzeCadence(cadenceSamples)
  const paceAnalysis = analyzePace(paceSamples, [])
  const trainingImpulse = calculateTRIMP(
    durationMinutes,
    avgHr,
    restingHr,
    maxHr
  )

  // Calculate efficiency factor
  const efficiencyFactor =
    avgHr > 0 && avgPace > 0
      ? Math.round((((1 / avgPace) * 100) / avgHr) * 1000) / 1000
      : 0

  // Calculate splits
  const splits = calculateSplits(
    hrSamples,
    paceSamples,
    cadenceSamples,
    distanceMiles,
    durationSeconds
  )

  // Update pace analysis with splits
  const paceAnalysisWithSplits = analyzePace(paceSamples, splits)

  // HR recovery (placeholder - would need post-workout samples)
  const hrRecovery: HrRecovery = {
    oneMinuteRecovery: null,
    recoveryRating: 'unknown',
    recommendation:
      'HR recovery data not available. Consider tracking your heart rate for 2 minutes after workouts.',
  }

  // Generate time series for charts
  const timeSeriesData = generateTimeSeriesData(
    hrSamples,
    cadenceSamples,
    paceSamples,
    startTime,
    durationSeconds
  )

  // Generate insights
  const insights = generateInsights(
    cardiacDrift,
    aerobicDecoupling,
    cadenceAnalysis,
    paceAnalysisWithSplits,
    trainingImpulse,
    hrZones,
    durationMinutes
  )

  return {
    durationSeconds,
    distanceMiles,
    avgPace: Math.round(avgPace * 100) / 100,
    avgHr,
    avgCadence,
    hrZones,
    cardiacDrift,
    hrVariability,
    aerobicDecoupling,
    efficiencyFactor,
    cadenceAnalysis,
    paceAnalysis: paceAnalysisWithSplits,
    trainingImpulse,
    hrRecovery,
    splits,
    insights,
    timeSeriesData,
  }
}

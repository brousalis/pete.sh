/**
 * TypeScript types for Apple Health / WatchOS integration
 * These types mirror HealthKit data structures for the PeteWatch app
 */

// ============================================
// HEART RATE TYPES
// ============================================

export interface HeartRateSample {
  timestamp: string // ISO 8601
  bpm: number
  motionContext?: 'sedentary' | 'active' | 'notSet' // HKHeartRateMotionContext
}

export interface HeartRateZone {
  name: 'rest' | 'warmup' | 'fatBurn' | 'cardio' | 'peak'
  minBpm: number
  maxBpm: number
  duration: number // seconds spent in this zone
  percentage: number // percentage of workout in this zone
}

export interface HeartRateSummary {
  average: number
  min: number
  max: number
  resting?: number // Resting HR for the day
  zones: HeartRateZone[]
}

// ============================================
// RUNNING METRICS
// ============================================

export interface CadenceSample {
  timestamp: string // ISO 8601
  stepsPerMinute: number
}

export interface PaceSample {
  timestamp: string // ISO 8601
  minutesPerMile: number // or km based on user preference
  speedMph?: number
}

export interface RunningMetrics {
  cadence: {
    average: number
    samples: CadenceSample[]
  }
  pace: {
    average: number // minutes per mile
    best: number
    samples: PaceSample[]
  }
  strideLength?: {
    average: number // meters
  }
  groundContactTime?: {
    average: number // milliseconds
  }
  verticalOscillation?: {
    average: number // centimeters
  }
  runningPower?: {
    average: number // watts
  }
}

// ============================================
// WORKOUT TYPES
// ============================================

export type AppleWorkoutType =
  | 'running'
  | 'walking'
  | 'cycling'
  | 'functionalStrengthTraining'
  | 'traditionalStrengthTraining'
  | 'coreTraining'
  | 'hiit'
  | 'rowing'
  | 'stairClimbing'
  | 'elliptical'
  | 'other'

// Maps to HKWorkoutActivityType
export const APPLE_WORKOUT_TYPE_MAP: Record<number, AppleWorkoutType> = {
  37: 'running', // HKWorkoutActivityType.running
  52: 'walking', // HKWorkoutActivityType.walking
  13: 'cycling', // HKWorkoutActivityType.cycling
  20: 'functionalStrengthTraining',
  50: 'traditionalStrengthTraining',
  74: 'coreTraining',
  63: 'hiit',
  35: 'rowing',
  46: 'stairClimbing',
  17: 'elliptical',
}

export interface AppleHealthWorkout {
  id: string // HealthKit UUID
  workoutType: AppleWorkoutType
  workoutTypeRaw?: number // HKWorkoutActivityType raw value
  startDate: string // ISO 8601
  endDate: string // ISO 8601
  duration: number // seconds
  
  // Calories
  activeCalories: number
  totalCalories: number
  
  // Distance (for cardio workouts)
  distance?: number // meters
  distanceMiles?: number
  
  // Elevation (for outdoor workouts)
  elevationGain?: number // meters
  
  // Heart rate data
  heartRate: HeartRateSummary
  heartRateSamples: HeartRateSample[] // Granular per-second/5-second samples
  
  // Running-specific metrics
  runningMetrics?: RunningMetrics
  
  // Route data (for outdoor workouts)
  route?: WorkoutRoute
  
  // Metadata
  source: string // "PeteWatch" or device name
  sourceVersion?: string
  device?: {
    name: string
    model: string
    hardwareVersion?: string
    softwareVersion?: string
  }
  
  // Weather conditions during outdoor workout
  weather?: {
    temperature?: number // Celsius
    humidity?: number // Percentage
  }
}

// ============================================
// ROUTE / GPS DATA
// ============================================

export interface LocationSample {
  timestamp: string
  latitude: number
  longitude: number
  altitude?: number // meters
  speed?: number // m/s
  course?: number // degrees
  horizontalAccuracy?: number
  verticalAccuracy?: number
}

export interface WorkoutRoute {
  samples: LocationSample[]
  totalDistance: number // meters
  totalElevationGain: number // meters
  totalElevationLoss: number // meters
}

// ============================================
// DAILY HEALTH METRICS
// ============================================

export interface DailyHealthMetrics {
  date: string // YYYY-MM-DD
  
  // Activity
  steps: number
  activeCalories: number
  totalCalories: number
  exerciseMinutes: number
  standHours: number
  moveGoal?: number
  exerciseGoal?: number
  standGoal?: number
  
  // Heart
  restingHeartRate?: number
  heartRateVariability?: number // HRV in ms (SDNN)
  
  // Cardio fitness
  vo2Max?: number
  
  // Sleep (if tracked)
  sleepDuration?: number // seconds
  sleepStages?: {
    awake: number
    rem: number
    core: number
    deep: number
  }
  
  // Walking metrics
  walkingHeartRateAverage?: number
  walkingDoubleSupportPercentage?: number
  walkingAsymmetryPercentage?: number
  walkingSpeed?: number // m/s
  walkingStepLength?: number // meters
  
  source: string
  recordedAt: string // ISO 8601
}

// ============================================
// API PAYLOAD TYPES (What PeteWatch sends)
// ============================================

/**
 * Payload for syncing a completed workout from Apple Watch
 */
export interface AppleHealthWorkoutPayload {
  workout: AppleHealthWorkout
  // Optional: link to petehome workout definition
  linkedWorkoutId?: string // e.g., "monday-density-strength"
  linkedDay?: string // e.g., "monday"
}

/**
 * Payload for syncing daily health metrics
 */
export interface DailyHealthMetricsPayload {
  metrics: DailyHealthMetrics
}

/**
 * Batch sync payload - for syncing multiple workouts at once
 */
export interface AppleHealthBatchSyncPayload {
  workouts?: AppleHealthWorkout[]
  dailyMetrics?: DailyHealthMetrics[]
  lastSyncTimestamp?: string // For incremental sync
}

// ============================================
// ANALYTICS TYPES (Computed on server)
// ============================================

export interface WorkoutAnalytics {
  workoutId: string
  
  // Heart rate analysis
  hrZoneDistribution: HeartRateZone[]
  averageHrBySegment: { minute: number; avgBpm: number }[]
  recoveryRate?: number // BPM drop in first minute after workout
  
  // Performance trends (compared to previous similar workouts)
  trends?: {
    avgHrTrend: 'improving' | 'stable' | 'declining'
    paceTrend?: 'improving' | 'stable' | 'declining'
    cadenceTrend?: 'improving' | 'stable' | 'declining'
  }
  
  // Running splits (if applicable)
  splits?: {
    mile: number
    time: number // seconds
    avgPace: number // min/mile
    avgHr: number
    avgCadence?: number
  }[]
}

export interface FitnessInsights {
  weekNumber: number
  year: number
  
  // Weekly summary
  totalWorkouts: number
  totalDuration: number // seconds
  totalCalories: number
  totalDistance?: number // meters
  
  // Heart health
  avgRestingHr: number
  avgHrv: number
  vo2MaxEstimate?: number
  
  // Training load
  trainingLoad: 'low' | 'optimal' | 'high' | 'overreaching'
  recoveryStatus: 'recovered' | 'recovering' | 'strained'
  
  // Weekly HR zone breakdown
  weeklyZoneDistribution: HeartRateZone[]
}

// ============================================
// HR ZONE CALCULATION HELPER
// ============================================

/**
 * Calculate HR zones based on max heart rate
 * Using standard 5-zone model
 */
export function calculateHrZones(maxHr: number): Omit<HeartRateZone, 'duration' | 'percentage'>[] {
  return [
    { name: 'rest', minBpm: 0, maxBpm: Math.round(maxHr * 0.5) },
    { name: 'warmup', minBpm: Math.round(maxHr * 0.5), maxBpm: Math.round(maxHr * 0.6) },
    { name: 'fatBurn', minBpm: Math.round(maxHr * 0.6), maxBpm: Math.round(maxHr * 0.7) },
    { name: 'cardio', minBpm: Math.round(maxHr * 0.7), maxBpm: Math.round(maxHr * 0.85) },
    { name: 'peak', minBpm: Math.round(maxHr * 0.85), maxBpm: maxHr },
  ]
}

/**
 * Estimate max HR using age-based formula (220 - age)
 * More accurate formulas exist but this is standard
 */
export function estimateMaxHr(age: number): number {
  return 220 - age
}

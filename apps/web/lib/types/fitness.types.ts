/**
 * TypeScript types for Fitness Routine feature
 * Based on workout.md - comprehensive fitness tracking system
 */

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

export type WorkoutFocus = "strength" | "core" | "cardio" | "recovery" | "conditioning" | "hiit"

export type RoutineType = "morning" | "night" | "workout"

export interface UserProfile {
  goal: string
  stats: {
    height: string
    weight: number
  }
  schedule: {
    startDay: "monday"
    trainingTime: string
    fasted: boolean
  }
  shoeStrategy: {
    lifting: string[]
    cardio: string[]
  }
}

export interface InjuryProtocol {
  status: "active" | "inactive"
  name: string
  description: string
  dailyRehab: DailyRehab[]
  rules: string[]
}

export interface DailyRehab {
  name: string
  description: string
  duration: number // in minutes
  frequency: string
}

export interface Exercise {
  id: string
  name: string
  sets?: number
  reps?: number
  weight?: number
  duration?: number // in seconds
  rest?: number // in seconds
  notes?: string
  form?: string
  isElbowSafe?: boolean
  isStandard?: boolean
  youtubeVideoId?: string // YouTube video ID for exercise demonstration
  alternative?: {
    name: string
    sets?: number
    reps?: number
    form?: string
    youtubeVideoId?: string // YouTube video ID for alternative exercise
  }
}

export interface Warmup {
  name: string
  exercises: Exercise[]
  duration?: number // in minutes
}

export interface WorkoutSection {
  name: string
  duration?: number // in minutes
  exercises: Exercise[]
}

export interface Workout {
  id: string
  name: string
  focus: WorkoutFocus
  day: DayOfWeek
  description?: string
  goal?: string
  warmup?: Warmup
  exercises: Exercise[]
  finisher?: Exercise[]
  metabolicFlush?: WorkoutSection // Post-lift cardio (bike, incline walk)
  mobility?: WorkoutSection // Deep stretching (frog, pigeon, lizard)
  duration?: number // in minutes
  completed?: boolean
  completedAt?: string
  notes?: string[]
}

export interface DailyRoutine {
  id: string
  type: "morning" | "night"
  name: string
  description: string
  duration: number // in minutes
  exercises: {
    name: string
    duration: number // in seconds
    description: string
    why: string
    action: string
  }[]
  completed?: boolean
  completedAt?: string
}

export type WeeklySchedule = Record<DayOfWeek, {
  focus: string
  goal: string
  workout?: Workout
}>

export interface WeeklyRoutine {
  id: string
  name: string
  userProfile: UserProfile
  injuryProtocol: InjuryProtocol
  schedule: WeeklySchedule
  dailyRoutines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  weeks: WeekRoutine[]
  createdAt: string
  updatedAt: string
}

export interface WeekRoutine {
  weekNumber: number
  startDate: string
  days: {
    [key in DayOfWeek]?: {
      workout?: WorkoutCompletion
      morningRoutine?: RoutineCompletion
      nightRoutine?: RoutineCompletion
    }
  }
}

export interface WorkoutCompletion {
  workoutId: string
  completed: boolean
  completedAt?: string
  exercisesCompleted?: string[] // exercise IDs
  notes?: string
}

export interface RoutineCompletion {
  routineId: string
  completed: boolean
  completedAt?: string
}

export interface FitnessProgress {
  week: number
  year: number
  completedWorkouts: number
  totalWorkouts: number
  completedMorningRoutines: number
  totalMorningRoutines: number
  completedNightRoutines: number
  totalNightRoutines: number
  workoutsByDay: {
    [key in DayOfWeek]?: {
      workout?: {
        completed: boolean
        completedAt?: string
      }
      morningRoutine?: {
        completed: boolean
        completedAt?: string
      }
      nightRoutine?: {
        completed: boolean
        completedAt?: string
      }
    }
  }
}

export interface ConsistencyStats {
  currentStreak: number
  longestStreak: number
  weeklyCompletion: number // percentage
  monthlyCompletion: number // percentage
  totalDaysActive: number
  lastActiveDate?: string
  streaks: {
    workouts: number
    morningRoutines: number
    nightRoutines: number
  }
}

export interface FitnessStats {
  totalWorkouts: number
  workoutsThisWeek: number
  workoutsThisMonth: number
  currentStreak: number
  longestStreak: number
  favoriteWorkout?: string
  consistency: ConsistencyStats
}

// ============================================
// HealthKit Integration Types
// ============================================

export interface LinkedHealthKitWorkoutSummary {
  id: string
  workoutType: string
  duration: number // seconds
  activeCalories: number
  hrAverage?: number
  distanceMiles?: number
}

export interface LinkedHealthKitWorkouts {
  [exerciseId: string]: LinkedHealthKitWorkoutSummary[]
}

export interface WorkoutWithLinkedHealthKit extends Workout {
  linkedHealthKitWorkouts?: LinkedHealthKitWorkouts
}

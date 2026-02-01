/**
 * TypeScript types for Fitness Routine Editor and Version Management
 */

import type {
  WeeklyRoutine,
  UserProfile,
  InjuryProtocol,
  WeeklySchedule,
  DailyRoutine,
  Workout,
  Exercise,
  DayOfWeek,
} from './fitness.types'

// ============================================
// Version Management Types
// ============================================

export interface RoutineVersion {
  id: string
  routineId: string
  versionNumber: number
  name: string
  changeSummary?: string
  userProfile: UserProfile
  injuryProtocol?: InjuryProtocol
  schedule: WeeklySchedule
  dailyRoutines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  workoutDefinitions: Record<DayOfWeek, Workout>
  isActive: boolean
  isDraft: boolean
  createdAt: string
  updatedAt: string
  activatedAt?: string
}

export interface RoutineVersionSummary {
  id: string
  versionNumber: number
  name: string
  changeSummary?: string
  isActive: boolean
  isDraft: boolean
  createdAt: string
  activatedAt?: string
}

export interface CreateVersionRequest {
  routineId: string
  name?: string
  changeSummary?: string
  basedOnVersionId?: string  // If restoring from a previous version
}

export interface UpdateVersionRequest {
  name?: string
  changeSummary?: string
  userProfile?: UserProfile
  injuryProtocol?: InjuryProtocol
  schedule?: WeeklySchedule
  dailyRoutines?: {
    morning?: DailyRoutine
    night?: DailyRoutine
  }
  workoutDefinitions?: Partial<Record<DayOfWeek, Workout>>
}

export interface ActivateVersionRequest {
  versionId: string
}

// ============================================
// Workout Definition Types
// ============================================

export interface WorkoutDefinitionRow {
  id: string
  routineId: string
  dayOfWeek: DayOfWeek
  workout: Workout
  createdAt: string
  updatedAt: string
}

export interface UpdateWorkoutDefinitionRequest {
  workout: Workout
}

// ============================================
// Editor State Types
// ============================================

export type EditorTab = 'overview' | 'workouts' | 'daily-routines' | 'versions'

export type WorkoutSection = 'warmup' | 'exercises' | 'finisher' | 'metabolicFlush' | 'mobility'

export interface EditorState {
  activeTab: EditorTab
  selectedDay: DayOfWeek
  selectedSection: WorkoutSection
  isDirty: boolean
  isSaving: boolean
  lastSaved?: string
  currentVersion?: RoutineVersion
  draftVersion?: RoutineVersion
}

export interface ExerciseEditorState {
  exercise: Exercise
  isExpanded: boolean
  isEditing: boolean
  validationErrors: string[]
}

// ============================================
// Diff Types for Version Comparison
// ============================================

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface DiffItem<T> {
  type: DiffType
  path: string
  oldValue?: T
  newValue?: T
}

export interface VersionDiff {
  versionA: RoutineVersionSummary
  versionB: RoutineVersionSummary
  changes: {
    profile: DiffItem<UserProfile>[]
    schedule: DiffItem<WeeklySchedule[DayOfWeek]>[]
    injuryProtocol: DiffItem<InjuryProtocol>[]
    dailyRoutines: DiffItem<DailyRoutine>[]
    workouts: Record<DayOfWeek, DiffItem<Exercise>[]>
  }
  summary: {
    totalChanges: number
    addedExercises: number
    removedExercises: number
    modifiedExercises: number
    scheduleCh: number
  }
}

// ============================================
// API Response Types
// ============================================

export interface VersionsListResponse {
  versions: RoutineVersionSummary[]
  activeVersion?: RoutineVersionSummary
  draftVersion?: RoutineVersionSummary
}

export interface VersionResponse {
  version: RoutineVersion
}

export interface WorkoutDefinitionsResponse {
  definitions: Record<DayOfWeek, Workout>
}

export interface WorkoutDefinitionResponse {
  definition: WorkoutDefinitionRow
}

// ============================================
// Supabase Row Types
// ============================================

export interface RoutineVersionRow {
  id: string
  routine_id: string
  version_number: number
  name: string
  change_summary: string | null
  user_profile: UserProfile
  injury_protocol: InjuryProtocol | null
  schedule: WeeklySchedule
  daily_routines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  workout_definitions: Record<DayOfWeek, Workout>
  is_active: boolean
  is_draft: boolean
  created_at: string
  updated_at: string
  activated_at: string | null
}

export interface RoutineVersionInsert {
  id?: string
  routine_id: string
  version_number: number
  name: string
  change_summary?: string
  user_profile: UserProfile
  injury_protocol?: InjuryProtocol
  schedule: WeeklySchedule
  daily_routines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  workout_definitions: Record<DayOfWeek, Workout>
  is_active?: boolean
  is_draft?: boolean
  created_at?: string
  updated_at?: string
  activated_at?: string
}

export interface WorkoutDefinitionDbRow {
  id: string
  routine_id: string
  day_of_week: string
  workout: Workout
  created_at: string
  updated_at: string
}

export interface WorkoutDefinitionInsert {
  id?: string
  routine_id: string
  day_of_week: string
  workout: Workout
  created_at?: string
  updated_at?: string
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export function validateExercise(exercise: Partial<Exercise>): ValidationResult {
  const errors: ValidationError[] = []

  if (!exercise.id) {
    errors.push({ field: 'id', message: 'Exercise ID is required', severity: 'error' })
  }
  if (!exercise.name || exercise.name.trim() === '') {
    errors.push({ field: 'name', message: 'Exercise name is required', severity: 'error' })
  }
  if (exercise.sets !== undefined && exercise.sets < 0) {
    errors.push({ field: 'sets', message: 'Sets must be a positive number', severity: 'error' })
  }
  if (exercise.reps !== undefined && exercise.reps < 0) {
    errors.push({ field: 'reps', message: 'Reps must be a positive number', severity: 'error' })
  }
  if (exercise.duration !== undefined && exercise.duration < 0) {
    errors.push({ field: 'duration', message: 'Duration must be a positive number', severity: 'error' })
  }
  if (exercise.rest !== undefined && exercise.rest < 0) {
    errors.push({ field: 'rest', message: 'Rest must be a positive number', severity: 'error' })
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  }
}

export function validateWorkout(workout: Partial<Workout>): ValidationResult {
  const errors: ValidationError[] = []

  if (!workout.id) {
    errors.push({ field: 'id', message: 'Workout ID is required', severity: 'error' })
  }
  if (!workout.name || workout.name.trim() === '') {
    errors.push({ field: 'name', message: 'Workout name is required', severity: 'error' })
  }
  if (!workout.focus) {
    errors.push({ field: 'focus', message: 'Workout focus is required', severity: 'error' })
  }
  if (!workout.day) {
    errors.push({ field: 'day', message: 'Workout day is required', severity: 'error' })
  }
  if (!workout.exercises || workout.exercises.length === 0) {
    errors.push({ field: 'exercises', message: 'Workout must have at least one exercise', severity: 'warning' })
  }

  // Validate each exercise
  workout.exercises?.forEach((exercise, index) => {
    const exerciseResult = validateExercise(exercise)
    exerciseResult.errors.forEach(err => {
      errors.push({
        ...err,
        field: `exercises[${index}].${err.field}`,
      })
    })
  })

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  }
}

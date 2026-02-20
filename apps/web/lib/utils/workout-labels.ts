/**
 * Single source of truth for workout type display labels.
 * Use getWorkoutDisplayLabel() so hiking shows as "Maple Walk" (dog walks) everywhere.
 */

const DEFAULT_LABELS: Record<string, string> = {
  running: 'Run',
  cycling: 'Cycle',
  walking: 'Walk',
  hiking: 'Hike', // Overridden to "Maple Walk" below
  swimming: 'Swim',
  functionalStrengthTraining: 'Strength',
  traditionalStrengthTraining: 'Weights',
  coreTraining: 'Core',
  hiit: 'HIIT',
  rowing: 'Row',
  yoga: 'Yoga',
  stairClimbing: 'Stairs',
  elliptical: 'Elliptical',
  other: 'Other',
}

export type WorkoutLabelContext = 'summary' | 'detail'

/**
 * Returns the user-facing label for a HealthKit workout type.
 * Hiking is shown as "Maple Walk" (dog walks with bathroom markers).
 */
export function getWorkoutDisplayLabel(
  workoutType: string,
  _context?: WorkoutLabelContext
): string {
  if (workoutType === 'hiking') {
    return 'Maple Walk'
  }
  return DEFAULT_LABELS[workoutType] ?? workoutType
}

/** Known workout type keys for reverse lookup (e.g. filter by displayed label). */
export const KNOWN_WORKOUT_TYPES = Object.keys(DEFAULT_LABELS) as string[]

/**
 * Returns the workout type key whose display label equals the given label, or undefined.
 */
export function getWorkoutTypeByDisplayLabel(label: string): string | undefined {
  return KNOWN_WORKOUT_TYPES.find(t => getWorkoutDisplayLabel(t) === label)
}

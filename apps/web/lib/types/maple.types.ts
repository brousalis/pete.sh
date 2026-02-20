/**
 * TypeScript types for Maple (dog walk tracking) feature
 */

import type { LocationSample } from './apple-health.types';

// ============================================
// MOOD RATING
// ============================================

export type MapleMoodRating = 'happy' | 'neutral' | 'sad'

export const MOOD_EMOJI: Record<MapleMoodRating, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😔',
}

export const MOOD_COLORS: Record<MapleMoodRating, { bg: string; text: string; border: string }> = {
  happy: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    border: 'border-green-500/30',
  },
  neutral: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    border: 'border-yellow-500/30',
  },
  sad: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    border: 'border-orange-500/30',
  },
}

// ============================================
// BATHROOM MARKERS
// ============================================

export interface MapleBathroomMarker {
  id: string
  type: 'pee' | 'poop'
  latitude: number
  longitude: number
  timestamp: string
}

export interface MapleBathroomMarkerCounts {
  pee: number
  poop: number
}

// ============================================
// WALK TYPES
// ============================================

/**
 * Basic maple walk data (from database)
 */
export interface MapleWalk {
  id: string
  healthkitWorkoutId: string | null
  title: string | null
  moodRating: MapleMoodRating | null
  notes: string | null
  date: string // YYYY-MM-DD
  duration: number | null // seconds
  distanceMiles: number | null
  createdAt: string
  updatedAt: string
  bathroomMarkerCounts?: MapleBathroomMarkerCounts | null
}

/**
 * Database row format (snake_case)
 */
export interface MapleWalkRow {
  id: string
  healthkit_workout_id: string | null
  title: string | null
  mood_rating: MapleMoodRating | null
  notes: string | null
  date: string
  duration: number | null
  distance_miles: number | null
  created_at: string
  updated_at: string
}

/**
 * Workout data linked to a maple walk
 */
export interface MapleLinkedWorkout {
  id: string
  healthkitId: string
  startDate: string
  endDate: string
  duration: number
  activeCalories: number
  totalCalories: number
  distanceMeters: number | null
  distanceMiles: number | null
  elevationGainMeters: number | null
  hrAverage: number | null
  hrMin: number | null
  hrMax: number | null
  hrZones: Array<{
    name: string
    minBpm: number
    maxBpm: number
    duration: number
    percentage: number
  }> | null
  paceAverage: number | null
  source: string
}

/**
 * Route data for map display
 */
export interface MapleWalkRoute {
  samples: LocationSample[]
  totalDistance: number // meters
  totalElevationGain: number // meters
  totalElevationLoss: number // meters
}

/**
 * Full walk data with workout and route
 */
export interface MapleWalkWithDetails extends MapleWalk {
  workout: MapleLinkedWorkout | null
  route: MapleWalkRoute | null
  hrSamples?: Array<{
    timestamp: string
    bpm: number
  }>
  bathroomMarkers?: MapleBathroomMarker[]
}

/**
 * Available workout (not yet linked to a maple walk)
 */
export interface AvailableWalkingWorkout {
  id: string
  healthkitId: string
  startDate: string
  endDate: string
  duration: number
  distanceMiles: number | null
  activeCalories: number
  hrAverage: number | null
  hrMax: number | null
}

// ============================================
// STATS TYPES
// ============================================

/**
 * Aggregated maple walk statistics
 */
export interface MapleStats {
  totalWalks: number
  totalDistanceMiles: number
  totalDurationMinutes: number
  avgDistanceMiles: number
  avgDurationMinutes: number
  moodBreakdown: {
    happy: number
    neutral: number
    sad: number
  }
  thisWeekWalks: number
  thisMonthWalks: number
}

// ============================================
// API TYPES
// ============================================

/**
 * Create walk request payload
 */
export interface CreateMapleWalkInput {
  healthkitWorkoutId: string
  title?: string
  moodRating?: MapleMoodRating
  notes?: string
}

/**
 * Update walk request payload
 */
export interface UpdateMapleWalkInput {
  title?: string | null
  moodRating?: MapleMoodRating | null
  notes?: string | null
}

/**
 * List walks query options
 */
export interface ListMapleWalksOptions {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  moodRating?: MapleMoodRating
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert database row to MapleWalk
 */
export function mapRowToMapleWalk(row: MapleWalkRow): MapleWalk {
  return {
    id: row.id,
    healthkitWorkoutId: row.healthkit_workout_id,
    title: row.title,
    moodRating: row.mood_rating,
    notes: row.notes,
    date: row.date,
    duration: row.duration,
    distanceMiles: row.distance_miles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Format duration in seconds to human readable string
 */
export function formatWalkDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Format distance in miles
 */
export function formatWalkDistance(miles: number): string {
  return `${miles.toFixed(2)} mi`
}

/**
 * Get mood label for display
 */
export function getMoodLabel(mood: MapleMoodRating): string {
  const labels: Record<MapleMoodRating, string> = {
    happy: 'Great walk!',
    neutral: 'Okay walk',
    sad: 'Not great',
  }
  return labels[mood]
}

-- Workout Version Tracking Migration
-- Adds routine_version_id to workout completion records so historical data
-- remains accurate across routine version changes.
--
-- The fitness_weeks.days JSONB column stores WorkoutCompletion and RoutineCompletion
-- objects. Those will now include a `routineVersionId` field (handled at the app layer).
-- This migration adds the column to the normalized fitness_progress table.

-- ============================================
-- ADD routine_version_id TO fitness_progress
-- ============================================
ALTER TABLE fitness_progress
  ADD COLUMN IF NOT EXISTS routine_version_id UUID REFERENCES fitness_routine_versions(id);

-- Index for querying completions by version
CREATE INDEX IF NOT EXISTS idx_fitness_progress_version
  ON fitness_progress(routine_version_id)
  WHERE routine_version_id IS NOT NULL;

-- ============================================
-- COMMENT DOCUMENTING JSONB CONVENTION
-- ============================================
COMMENT ON TABLE fitness_weeks IS
  'Weekly fitness data. The days JSONB column contains WorkoutCompletion and RoutineCompletion objects which now include an optional routineVersionId field linking to fitness_routine_versions.id.';

COMMENT ON COLUMN fitness_progress.routine_version_id IS
  'The fitness routine version that was active when this completion was recorded. NULL for historical data recorded before version tracking was added.';

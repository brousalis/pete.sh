-- Swimming workout support
-- Adds swim-specific columns and backfills misclassified HealthKit swims

-- ============================================
-- SWIMMING COLUMNS
-- ============================================

ALTER TABLE apple_health_workouts
  ADD COLUMN IF NOT EXISTS swimming_stroke_count INTEGER;

ALTER TABLE apple_health_workouts
  ADD COLUMN IF NOT EXISTS swimming_pool_length_meters DECIMAL(6, 2);

ALTER TABLE apple_health_workouts
  ADD COLUMN IF NOT EXISTS swimming_location TEXT; -- 'pool', 'openWater', 'unknown'

-- ============================================
-- BACKFILL: HealthKit swimming raw value is 46
-- Previously fell through to workout_type = 'other'
-- ============================================

UPDATE apple_health_workouts
SET workout_type = 'swimming'
WHERE workout_type_raw = 46
  AND workout_type <> 'swimming';

-- Outdoor Run Support Migration
-- 1. Fix column types that receive floating-point values from HealthKit
-- 2. Add indoor/outdoor distinction for workouts

-- ============================================
-- FIX COLUMN TYPES
-- ============================================

-- running_power_avg: watts are naturally fractional (e.g. 242.72W)
-- Was INTEGER, causing "invalid input syntax for type integer" on outdoor run sync
ALTER TABLE apple_health_workouts
  ALTER COLUMN running_power_avg TYPE DECIMAL(6, 2)
  USING running_power_avg::DECIMAL(6, 2);

-- time_seconds in splits: split times are fractional (e.g. 485.23s)
-- Original migration 002 had INTEGER, but actual data is Double from HealthKit
ALTER TABLE apple_health_splits
  ALTER COLUMN time_seconds TYPE DECIMAL(10, 2)
  USING time_seconds::DECIMAL(10, 2);

-- ============================================
-- ADD INDOOR/OUTDOOR DISTINCTION
-- ============================================

-- Boolean flag to distinguish indoor vs outdoor workouts
-- NULL = unknown (legacy data), true = indoor, false = outdoor
ALTER TABLE apple_health_workouts
  ADD COLUMN IF NOT EXISTS is_indoor BOOLEAN;

-- Index for filtering by indoor/outdoor
CREATE INDEX IF NOT EXISTS idx_apple_workouts_indoor
  ON apple_health_workouts(is_indoor)
  WHERE is_indoor IS NOT NULL;

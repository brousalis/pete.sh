-- Walking Workout Metrics for Maple walks
-- Adds walking-specific metrics from HealthKit for outdoor walks

-- ============================================
-- ADD WALKING COLUMNS TO WORKOUTS
-- ============================================

-- Walking metrics (for walking workouts / Maple walks)
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS walking_avg_speed DECIMAL(5, 3); -- m/s
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS walking_avg_step_length DECIMAL(4, 3); -- meters
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS walking_double_support_pct DECIMAL(5, 2); -- percentage (gait stability)
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS walking_asymmetry_pct DECIMAL(5, 2); -- percentage (left/right imbalance)
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS walking_step_count INTEGER; -- total steps during workout

-- ============================================
-- WALKING SPEED SAMPLES TABLE
-- Stores walking speed data during walks
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_walking_speed_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  meters_per_second DECIMAL(5, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_walking_speed_workout ON apple_health_walking_speed_samples(workout_id);

-- ============================================
-- WALKING STEP LENGTH SAMPLES TABLE
-- Stores step length data during walks
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_walking_step_length_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  meters DECIMAL(4, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_walking_step_length_workout ON apple_health_walking_step_length_samples(workout_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE apple_health_walking_speed_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_walking_step_length_samples ENABLE ROW LEVEL SECURITY;

-- Allow public read access (same pattern as other health tables)
CREATE POLICY "Allow public read access to walking speed samples"
  ON apple_health_walking_speed_samples FOR SELECT TO public USING (true);

CREATE POLICY "Allow public read access to walking step length samples"
  ON apple_health_walking_step_length_samples FOR SELECT TO public USING (true);

-- Allow authenticated inserts
CREATE POLICY "Allow authenticated inserts on walking speed samples"
  ON apple_health_walking_speed_samples FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow authenticated inserts on walking step length samples"
  ON apple_health_walking_step_length_samples FOR INSERT TO public WITH CHECK (true);

-- Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes on walking speed samples"
  ON apple_health_walking_speed_samples FOR DELETE TO public USING (true);

CREATE POLICY "Allow authenticated deletes on walking step length samples"
  ON apple_health_walking_step_length_samples FOR DELETE TO public USING (true);

-- Exercise HealthKit Links
-- Links HealthKit workouts to completed exercises for autocomplete feature

-- Junction table to link HealthKit workouts to exercises
CREATE TABLE IF NOT EXISTS exercise_healthkit_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  healthkit_workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  routine_id TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  section TEXT NOT NULL, -- 'warmup', 'exercises', 'metabolicFlush', 'mobility'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate links
  UNIQUE(healthkit_workout_id, exercise_id, week_number, year)
);

-- Index for querying by day/week
CREATE INDEX IF NOT EXISTS idx_exercise_healthkit_links_day
  ON exercise_healthkit_links(routine_id, day_of_week, week_number, year);

-- Index for querying by workout
CREATE INDEX IF NOT EXISTS idx_exercise_healthkit_links_workout
  ON exercise_healthkit_links(healthkit_workout_id);

-- Index for querying by exercise
CREATE INDEX IF NOT EXISTS idx_exercise_healthkit_links_exercise
  ON exercise_healthkit_links(exercise_id, week_number, year);

-- Enable RLS
ALTER TABLE exercise_healthkit_links ENABLE ROW LEVEL SECURITY;

-- Public read access (same pattern as other tables)
CREATE POLICY "Allow public read access" ON exercise_healthkit_links
  FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Allow service role write access" ON exercise_healthkit_links
  FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE exercise_healthkit_links IS 'Links HealthKit workouts to completed exercises for autocomplete feature';
COMMENT ON COLUMN exercise_healthkit_links.section IS 'Section of the workout: warmup, exercises, metabolicFlush, or mobility';

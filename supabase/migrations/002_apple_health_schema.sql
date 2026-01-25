-- Apple Health / PeteWatch Integration Schema
-- This migration adds tables for storing Apple Watch health data

-- ============================================
-- APPLE HEALTH WORKOUTS TABLE
-- Stores workout data synced from Apple Watch
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  healthkit_id TEXT UNIQUE NOT NULL, -- HealthKit UUID from the watch
  
  -- Workout type and timing
  workout_type TEXT NOT NULL, -- 'running', 'functionalStrengthTraining', etc.
  workout_type_raw INTEGER, -- HKWorkoutActivityType raw value
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  
  -- Calories
  active_calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Distance (for cardio)
  distance_meters DECIMAL(12, 2),
  distance_miles DECIMAL(10, 4),
  elevation_gain_meters DECIMAL(8, 2),
  
  -- Heart rate summary
  hr_average INTEGER,
  hr_min INTEGER,
  hr_max INTEGER,
  hr_zones JSONB, -- HeartRateZone[]
  
  -- Running metrics (for runs)
  cadence_average INTEGER, -- steps per minute
  pace_average DECIMAL(6, 2), -- minutes per mile
  pace_best DECIMAL(6, 2),
  stride_length_avg DECIMAL(4, 2), -- meters
  running_power_avg INTEGER, -- watts
  
  -- Source info
  source TEXT NOT NULL DEFAULT 'PeteWatch',
  source_version TEXT,
  device_name TEXT,
  device_model TEXT,
  
  -- Weather (for outdoor)
  weather_temp_celsius DECIMAL(5, 2),
  weather_humidity INTEGER,
  
  -- Link to petehome workout (optional)
  linked_workout_id TEXT, -- e.g., 'monday-density-strength'
  linked_day TEXT, -- e.g., 'monday'
  linked_week INTEGER,
  linked_year INTEGER,
  
  -- Metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_apple_workouts_start ON apple_health_workouts(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_apple_workouts_type ON apple_health_workouts(workout_type);
CREATE INDEX IF NOT EXISTS idx_apple_workouts_linked ON apple_health_workouts(linked_workout_id, linked_day);
CREATE INDEX IF NOT EXISTS idx_apple_workouts_date_type ON apple_health_workouts(start_date, workout_type);

-- ============================================
-- HEART RATE SAMPLES TABLE
-- Stores granular HR data during workouts
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_hr_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  
  timestamp TIMESTAMPTZ NOT NULL,
  bpm INTEGER NOT NULL,
  motion_context TEXT, -- 'sedentary', 'active', 'notSet'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_hr_samples_workout ON apple_health_hr_samples(workout_id, timestamp);

-- ============================================
-- CADENCE SAMPLES TABLE
-- Stores running cadence data
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_cadence_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  
  timestamp TIMESTAMPTZ NOT NULL,
  steps_per_minute INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_cadence_samples_workout ON apple_health_cadence_samples(workout_id, timestamp);

-- ============================================
-- PACE SAMPLES TABLE
-- Stores running pace data
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_pace_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  
  timestamp TIMESTAMPTZ NOT NULL,
  minutes_per_mile DECIMAL(6, 2) NOT NULL,
  speed_mph DECIMAL(5, 2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pace_samples_workout ON apple_health_pace_samples(workout_id, timestamp);

-- ============================================
-- WORKOUT ROUTES TABLE
-- Stores GPS route data for outdoor workouts
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  
  total_distance_meters DECIMAL(12, 2),
  total_elevation_gain DECIMAL(8, 2),
  total_elevation_loss DECIMAL(8, 2),
  
  -- Store route samples as JSONB for flexibility
  samples JSONB, -- LocationSample[]
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_routes_workout ON apple_health_routes(workout_id);

-- ============================================
-- DAILY HEALTH METRICS TABLE
-- Stores daily health summaries
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE, -- One record per day
  
  -- Activity rings
  steps INTEGER DEFAULT 0,
  active_calories DECIMAL(10, 2) DEFAULT 0,
  total_calories DECIMAL(10, 2) DEFAULT 0,
  exercise_minutes INTEGER DEFAULT 0,
  stand_hours INTEGER DEFAULT 0,
  move_goal INTEGER,
  exercise_goal INTEGER,
  stand_goal INTEGER,
  
  -- Heart health
  resting_heart_rate INTEGER,
  heart_rate_variability DECIMAL(6, 2), -- HRV in ms (SDNN)
  
  -- Cardio fitness
  vo2_max DECIMAL(5, 2),
  
  -- Sleep
  sleep_duration INTEGER, -- seconds
  sleep_awake INTEGER,
  sleep_rem INTEGER,
  sleep_core INTEGER,
  sleep_deep INTEGER,
  
  -- Walking metrics
  walking_hr_average INTEGER,
  walking_double_support_pct DECIMAL(5, 2),
  walking_asymmetry_pct DECIMAL(5, 2),
  walking_speed DECIMAL(4, 2), -- m/s
  walking_step_length DECIMAL(4, 2), -- meters
  
  -- Metadata
  source TEXT NOT NULL DEFAULT 'PeteWatch',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for date lookups
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON apple_health_daily_metrics(date DESC);

-- ============================================
-- WORKOUT SPLITS TABLE
-- Stores mile/km splits for running workouts
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  
  split_number INTEGER NOT NULL, -- 1, 2, 3...
  split_type TEXT DEFAULT 'mile', -- 'mile' or 'kilometer'
  time_seconds INTEGER NOT NULL,
  avg_pace DECIMAL(6, 2), -- min/mile or min/km
  avg_hr INTEGER,
  avg_cadence INTEGER,
  distance_meters DECIMAL(8, 2),
  elevation_change DECIMAL(6, 2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_splits_workout ON apple_health_splits(workout_id, split_number);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get latest daily metrics
CREATE OR REPLACE FUNCTION get_latest_daily_metrics(days_back INTEGER DEFAULT 7)
RETURNS SETOF apple_health_daily_metrics AS $$
  SELECT * FROM apple_health_daily_metrics
  WHERE date >= CURRENT_DATE - days_back
  ORDER BY date DESC;
$$ LANGUAGE SQL;

-- Get recent workouts with type filter
CREATE OR REPLACE FUNCTION get_recent_workouts(
  p_workout_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF apple_health_workouts AS $$
  SELECT * FROM apple_health_workouts
  WHERE (p_workout_type IS NULL OR workout_type = p_workout_type)
  ORDER BY start_date DESC
  LIMIT p_limit;
$$ LANGUAGE SQL;

-- Get workout HR samples (downsampled for charting)
CREATE OR REPLACE FUNCTION get_workout_hr_chart(
  p_workout_id UUID,
  p_sample_interval INTEGER DEFAULT 30 -- seconds between samples
)
RETURNS TABLE(sample_time TIMESTAMPTZ, bpm INTEGER) AS $$
  WITH numbered AS (
    SELECT 
      timestamp AS sample_time,
      bpm,
      ROW_NUMBER() OVER (ORDER BY timestamp) as rn
    FROM apple_health_hr_samples
    WHERE workout_id = p_workout_id
  )
  SELECT sample_time, bpm FROM numbered
  WHERE rn % GREATEST(1, p_sample_interval / 5) = 0 -- Assuming ~5 sec sample rate
  ORDER BY sample_time;
$$ LANGUAGE SQL;

-- Calculate weekly training summary
CREATE OR REPLACE FUNCTION get_weekly_training_summary(
  p_start_date DATE DEFAULT NULL
)
RETURNS TABLE(
  week_start DATE,
  total_workouts INTEGER,
  total_duration_min INTEGER,
  total_calories DECIMAL,
  total_distance_miles DECIMAL,
  avg_hr INTEGER,
  workout_types JSONB
) AS $$
  SELECT
    DATE_TRUNC('week', start_date)::DATE as week_start,
    COUNT(*)::INTEGER as total_workouts,
    (SUM(duration) / 60)::INTEGER as total_duration_min,
    SUM(total_calories) as total_calories,
    SUM(distance_miles) as total_distance_miles,
    AVG(hr_average)::INTEGER as avg_hr,
    jsonb_object_agg(workout_type, type_count) as workout_types
  FROM (
    SELECT 
      start_date,
      duration,
      total_calories,
      distance_miles,
      hr_average,
      workout_type,
      COUNT(*) OVER (PARTITION BY workout_type, DATE_TRUNC('week', start_date)) as type_count
    FROM apple_health_workouts
    WHERE (p_start_date IS NULL OR start_date >= p_start_date)
  ) sub
  GROUP BY DATE_TRUNC('week', start_date)
  ORDER BY week_start DESC;
$$ LANGUAGE SQL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE apple_health_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_hr_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_cadence_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_pace_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_splits ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON apple_health_workouts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON apple_health_hr_samples FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON apple_health_cadence_samples FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON apple_health_pace_samples FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON apple_health_routes FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON apple_health_daily_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON apple_health_splits FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON apple_health_workouts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON apple_health_hr_samples FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON apple_health_cadence_samples FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON apple_health_pace_samples FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON apple_health_routes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON apple_health_daily_metrics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON apple_health_splits FOR ALL USING (auth.role() = 'service_role');

-- Allow anon insert/update for PeteWatch sync (authenticated via API key)
CREATE POLICY "Allow anon write workouts" ON apple_health_workouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update workouts" ON apple_health_workouts FOR UPDATE USING (true);
CREATE POLICY "Allow anon write hr" ON apple_health_hr_samples FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon write cadence" ON apple_health_cadence_samples FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon write pace" ON apple_health_pace_samples FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon write routes" ON apple_health_routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon write daily" ON apple_health_daily_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update daily" ON apple_health_daily_metrics FOR UPDATE USING (true);
CREATE POLICY "Allow anon write splits" ON apple_health_splits FOR INSERT WITH CHECK (true);

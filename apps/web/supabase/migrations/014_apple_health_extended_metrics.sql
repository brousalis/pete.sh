-- Extended Apple Health Metrics
-- Adds cycling metrics, workout events, and effort score support

-- ============================================
-- ADD CYCLING AND EFFORT COLUMNS TO WORKOUTS
-- ============================================

-- Cycling metrics
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS cycling_avg_speed DECIMAL(6, 2); -- mph
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS cycling_max_speed DECIMAL(6, 2); -- mph
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS cycling_avg_cadence INTEGER; -- rpm
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS cycling_avg_power INTEGER; -- watts
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS cycling_max_power INTEGER; -- watts

-- Effort score (Apple's workout intensity metric, 0-10 scale)
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS effort_score DECIMAL(4, 2);

-- Ground contact time and vertical oscillation averages for running
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS ground_contact_time_avg DECIMAL(6, 2); -- milliseconds
ALTER TABLE apple_health_workouts ADD COLUMN IF NOT EXISTS vertical_oscillation_avg DECIMAL(5, 2); -- centimeters

-- ============================================
-- WORKOUT EVENTS TABLE
-- Stores pause/resume, segments, laps during workouts
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_workout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- 'pause', 'resume', 'motion_pause', 'motion_resume', 'segment', 'lap', 'marker'
  timestamp TIMESTAMPTZ NOT NULL,
  duration DECIMAL(10, 2), -- seconds, for segments
  
  -- Metadata
  segment_index INTEGER,
  lap_number INTEGER,
  distance_meters DECIMAL(12, 2), -- distance at this point
  split_time DECIMAL(10, 2), -- seconds for this segment/lap
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_events_workout ON apple_health_workout_events(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_events_type ON apple_health_workout_events(event_type);

-- ============================================
-- CYCLING SPEED SAMPLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_cycling_speed_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  speed_mph DECIMAL(6, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycling_speed_workout ON apple_health_cycling_speed_samples(workout_id);

-- ============================================
-- CYCLING CADENCE SAMPLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_cycling_cadence_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  rpm INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycling_cadence_workout ON apple_health_cycling_cadence_samples(workout_id);

-- ============================================
-- CYCLING POWER SAMPLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_cycling_power_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  watts DECIMAL(8, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycling_power_workout ON apple_health_cycling_power_samples(workout_id);

-- ============================================
-- MILE SPLITS TABLE (for running workouts)
-- ============================================
CREATE TABLE IF NOT EXISTS apple_health_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  
  split_number INTEGER NOT NULL,
  split_type TEXT NOT NULL DEFAULT 'mile', -- 'mile' or 'kilometer'
  distance_meters DECIMAL(10, 2) NOT NULL,
  time_seconds DECIMAL(10, 2) NOT NULL,
  avg_pace DECIMAL(6, 2), -- min/mile or min/km
  avg_heart_rate INTEGER,
  avg_cadence INTEGER,
  elevation_change DECIMAL(6, 2), -- meters
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_splits_workout ON apple_health_splits(workout_id);

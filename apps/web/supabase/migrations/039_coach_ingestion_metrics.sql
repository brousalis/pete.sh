-- ============================================================================
-- Ingestion upgrade for PeteCoach
-- ============================================================================
-- Adds the signals readiness v2 depends on but PeteTrain never queried:
-- sleep stages with timing, respiratory rate, wrist temperature, SpO2, and the
-- overnight HRV *series* (Apple samples SDNN sporadically, so a single daily
-- value is noisy — the overnight mean against a rolling baseline is what
-- actually tracks recovery).
--
-- Also adds per-length swim data. SWOLF and stroke count per length are the
-- only way to tell a technique gain from a fitness gain in the pool, which
-- matters because the swim is the largest available time saving for sub-3.
-- ============================================================================

-- ============================================
-- DAILY METRICS: NEW PHYSIOLOGICAL SIGNALS
-- ============================================

ALTER TABLE apple_health_daily_metrics
  ADD COLUMN IF NOT EXISTS respiratory_rate DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS wrist_temp_delta DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS oxygen_saturation DECIMAL(5, 2),
  -- Mean SDNN across the sleep window; the number readiness actually uses
  ADD COLUMN IF NOT EXISTS hrv_overnight_avg DECIMAL(6, 2),
  -- First reading after wake (or a deliberate Breathe session)
  ADD COLUMN IF NOT EXISTS hrv_morning DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS hrv_sample_count INTEGER,
  ADD COLUMN IF NOT EXISTS sleep_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sleep_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sleep_in_bed INTEGER,
  ADD COLUMN IF NOT EXISTS apple_training_load DECIMAL(6, 2);

-- ============================================
-- HRV SAMPLE SERIES
-- ============================================
-- Kept separate from daily metrics so the baseline can be recomputed from raw
-- readings when the algorithm changes, rather than trusting a stored average.

CREATE TABLE IF NOT EXISTS apple_health_hrv_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  metric_date DATE NOT NULL,
  sdnn_ms DECIMAL(6, 2) NOT NULL,
  -- 'sleep' readings are comparable to each other; 'waking' ones are not
  context TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (timestamp, sdnn_ms)
);

CREATE INDEX IF NOT EXISTS idx_hrv_samples_date ON apple_health_hrv_samples(metric_date DESC);

-- ============================================
-- SWIM LENGTHS
-- ============================================

CREATE TABLE IF NOT EXISTS apple_health_swim_lengths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  length_number INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  duration_seconds DECIMAL(8, 2) NOT NULL,
  stroke_count INTEGER,
  -- 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'mixed' | 'unknown'
  stroke_style TEXT,
  -- seconds + strokes for the length; lower is better
  swolf DECIMAL(6, 2),
  is_rest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workout_id, length_number)
);

CREATE INDEX IF NOT EXISTS idx_swim_lengths_workout
  ON apple_health_swim_lengths(workout_id, length_number);

-- Swim set summary derived from rest gaps between lengths
ALTER TABLE apple_health_workouts
  ADD COLUMN IF NOT EXISTS swimming_lap_count INTEGER,
  ADD COLUMN IF NOT EXISTS swimming_avg_swolf DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS swimming_avg_pace_per_100 DECIMAL(6, 2);

-- ============================================
-- RLS (matches the 038 lockdown: service_role only)
-- ============================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['apple_health_hrv_samples', 'apple_health_swim_lengths'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "service_role_all" ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
      t
    );
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON %I TO service_role', t);
  END LOOP;
END $$;

-- ============================================
-- REFRESH THE COACH VIEWS WITH THE NEW COLUMNS
-- ============================================
-- CREATE OR REPLACE VIEW cannot insert or rename columns. Drop first.

DROP VIEW IF EXISTS coach_daily_metric_v;
DROP VIEW IF EXISTS coach_activity_v;

CREATE VIEW coach_daily_metric_v AS
SELECT
  d.date AS metric_date,
  d.steps,
  d.active_calories,
  d.exercise_minutes,
  d.resting_heart_rate,
  -- Prefer the overnight mean; fall back to whatever single reading exists
  COALESCE(d.hrv_overnight_avg, d.heart_rate_variability) AS hrv_sdnn,
  d.hrv_overnight_avg,
  d.hrv_morning,
  d.hrv_sample_count,
  d.vo2_max,
  d.sleep_duration AS sleep_seconds,
  d.sleep_deep,
  d.sleep_rem,
  d.sleep_core,
  d.sleep_awake,
  d.sleep_start,
  d.sleep_end,
  d.respiratory_rate,
  d.wrist_temp_delta,
  d.oxygen_saturation AS spo2,
  d.apple_training_load,
  d.body_mass_lbs,
  d.body_fat_percentage,
  d.lean_body_mass_lbs,
  r.hrv_baseline_7d,
  r.hrv_z_score,
  r.rhr_baseline_7d,
  r.ctl,
  r.atl,
  r.tsb,
  r.acwr,
  r.monotony,
  r.strain,
  r.score AS readiness_score,
  r.level AS readiness_level,
  r.flags AS readiness_flags
FROM apple_health_daily_metrics d
LEFT JOIN coach_daily_readiness r ON r.metric_date = d.date;

CREATE VIEW coach_activity_v AS
SELECT
  w.id,
  w.healthkit_id,
  w.start_date,
  w.end_date,
  (w.start_date AT TIME ZONE 'America/Chicago')::DATE AS activity_date,
  w.duration AS duration_seconds,
  CASE
    WHEN w.workout_type IN ('running') THEN 'run'
    WHEN w.workout_type IN ('cycling') THEN 'bike'
    WHEN w.workout_type IN ('swimming') THEN 'swim'
    WHEN w.workout_type IN (
      'functionalStrengthTraining', 'traditionalStrengthTraining', 'coreTraining'
    ) THEN 'strength'
    WHEN w.workout_type IN ('walking', 'hiking') THEN 'walk'
    WHEN w.workout_type IN ('hiit', 'highIntensityIntervalTraining') THEN 'hiit'
    WHEN w.workout_type IN ('rowing', 'elliptical', 'stairClimbing') THEN 'cross'
    ELSE 'other'
  END AS sport,
  w.workout_type AS raw_type,
  w.is_indoor,
  w.distance_meters,
  w.distance_miles,
  w.elevation_gain_meters,
  w.active_calories,
  w.total_calories,
  w.hr_average,
  w.hr_min,
  w.hr_max,
  w.hr_zones,
  w.cadence_average,
  w.pace_average,
  w.running_power_avg,
  w.stride_length_avg,
  w.swimming_stroke_count,
  w.swimming_pool_length_meters,
  w.swimming_location,
  w.swimming_lap_count,
  w.swimming_avg_swolf,
  w.swimming_avg_pace_per_100,
  w.effort_score,
  w.source,
  w.device_name,
  w.linked_day,
  w.linked_workout_id,
  l.tss,
  l.tss_method,
  l.trimp,
  l.intensity_factor,
  l.decoupling_pct,
  l.zone_seconds,
  s.id AS planned_session_id
FROM apple_health_workouts w
LEFT JOIN coach_activity_load l ON l.activity_id = w.id
LEFT JOIN coach_planned_session s ON s.completed_activity_id = w.id;

REVOKE ALL ON coach_activity_v FROM anon, authenticated;
REVOKE ALL ON coach_daily_metric_v FROM anon, authenticated;
GRANT SELECT ON coach_activity_v TO service_role;
GRANT SELECT ON coach_daily_metric_v TO service_role;

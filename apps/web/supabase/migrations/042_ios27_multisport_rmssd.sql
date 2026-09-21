-- ============================================================================
-- iOS 27 / Series 12: Multisport legs, RMSSD HRV, native zone source
-- ============================================================================
-- Apple Watch Multisport writes HKWorkoutActivityType.swimBikeRun (raw 82).
-- Installed PeteTrain maps unknown types to "other"; remap from the raw
-- value the same way 036 remapped swimming (raw 46).
--
-- Series 12 also writes Recovery HRV as RMSSD. Store it beside SDNN and
-- never mix the two in one baseline.
-- ============================================================================

-- Parent workouts that already landed as "other"
UPDATE apple_health_workouts
SET workout_type = 'swimBikeRun'
WHERE workout_type_raw = 82
  AND workout_type <> 'swimBikeRun';

UPDATE apple_health_workouts
SET workout_type = 'transition'
WHERE workout_type_raw = 83
  AND workout_type <> 'transition';

ALTER TABLE apple_health_workouts
  ADD COLUMN IF NOT EXISTS hr_zone_source TEXT;

-- Multisport / interval legs
CREATE TABLE IF NOT EXISTS apple_health_workout_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  healthkit_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_type_raw INTEGER,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL,
  distance_meters DECIMAL(10, 2),
  active_calories DECIMAL(8, 2),
  hr_average INTEGER,
  hr_zones JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workout_id, healthkit_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_activities_workout
  ON apple_health_workout_activities(workout_id, start_date);

ALTER TABLE apple_health_daily_metrics
  ADD COLUMN IF NOT EXISTS hrv_rmssd DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS hrv_rmssd_overnight_avg DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS hrv_rmssd_morning DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS hrv_rmssd_sample_count INTEGER;

ALTER TABLE apple_health_hrv_samples
  ADD COLUMN IF NOT EXISTS metric TEXT NOT NULL DEFAULT 'sdnn',
  ADD COLUMN IF NOT EXISTS rmssd_ms DECIMAL(6, 2);

ALTER TABLE apple_health_hrv_samples
  ALTER COLUMN sdnn_ms DROP NOT NULL;

ALTER TABLE apple_health_hrv_samples
  DROP CONSTRAINT IF EXISTS apple_health_hrv_samples_timestamp_sdnn_ms_key;

CREATE UNIQUE INDEX IF NOT EXISTS apple_health_hrv_samples_timestamp_metric
  ON apple_health_hrv_samples (timestamp, metric);

-- Retention: keep Multisport samples with the other training types
CREATE OR REPLACE FUNCTION cleanup_apple_health_hr_samples(retention_days INTEGER DEFAULT 400)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_hr_samples s
  WHERE s.timestamp < NOW() - (retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM apple_health_workouts w
      WHERE w.id = s.workout_id
        AND w.workout_type IN (
          'running', 'cycling', 'swimming', 'swimBikeRun',
          'functionalStrengthTraining', 'traditionalStrengthTraining',
          'coreTraining', 'hiit', 'highIntensityIntervalTraining',
          'rowing', 'elliptical', 'stairClimbing'
        )
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_apple_health_cadence_samples(retention_days INTEGER DEFAULT 400)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_cadence_samples s
  WHERE s.timestamp < NOW() - (retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM apple_health_workouts w
      WHERE w.id = s.workout_id
        AND w.workout_type IN ('running', 'cycling', 'swimming', 'swimBikeRun')
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_apple_health_pace_samples(retention_days INTEGER DEFAULT 400)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_pace_samples s
  WHERE s.timestamp < NOW() - (retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM apple_health_workouts w
      WHERE w.id = s.workout_id
        AND w.workout_type IN ('running', 'cycling', 'swimming', 'swimBikeRun')
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Views cannot rename columns in place
DROP VIEW IF EXISTS coach_daily_metric_v;
DROP VIEW IF EXISTS coach_activity_v;

CREATE VIEW coach_daily_metric_v AS
SELECT
  d.date AS metric_date,
  d.steps,
  d.active_calories,
  d.exercise_minutes,
  d.resting_heart_rate,
  COALESCE(d.hrv_overnight_avg, d.heart_rate_variability) AS hrv_sdnn,
  d.hrv_overnight_avg,
  d.hrv_morning,
  d.hrv_sample_count,
  COALESCE(d.hrv_rmssd_overnight_avg, d.hrv_rmssd) AS hrv_rmssd,
  d.hrv_rmssd_overnight_avg,
  d.hrv_rmssd_morning,
  d.hrv_rmssd_sample_count,
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
    WHEN w.workout_type IN ('swimBikeRun') OR w.workout_type_raw = 82 THEN 'brick'
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

REVOKE ALL ON coach_daily_metric_v FROM anon, authenticated;
REVOKE ALL ON coach_activity_v FROM anon, authenticated;
GRANT SELECT ON coach_daily_metric_v TO service_role;
GRANT SELECT ON coach_activity_v TO service_role;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['apple_health_workout_activities'] LOOP
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

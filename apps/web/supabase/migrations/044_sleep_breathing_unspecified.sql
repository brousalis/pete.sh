-- ============================================================================
-- Sleep pipeline: unspecified stages, breathing disturbances, coach view
-- ============================================================================
-- - sleep_unspecified: stop folding asleepUnspecified into core
-- - breathing disturbances + optional apnea event count
-- - expose sleep_in_bed on coach_daily_metric_v
-- ============================================================================

ALTER TABLE apple_health_daily_metrics
  ADD COLUMN IF NOT EXISTS sleep_unspecified INTEGER,
  ADD COLUMN IF NOT EXISTS breathing_disturbances DECIMAL(8, 4),
  ADD COLUMN IF NOT EXISTS breathing_disturbances_elevated BOOLEAN,
  ADD COLUMN IF NOT EXISTS sleep_apnea_event_count INTEGER;

DROP VIEW IF EXISTS coach_daily_metric_v;

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
  d.sleep_in_bed,
  d.sleep_deep,
  d.sleep_rem,
  d.sleep_core,
  d.sleep_awake,
  d.sleep_unspecified,
  d.sleep_start,
  d.sleep_end,
  d.respiratory_rate,
  d.wrist_temp_delta,
  d.oxygen_saturation AS spo2,
  d.breathing_disturbances,
  d.breathing_disturbances_elevated,
  d.sleep_apnea_event_count,
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

REVOKE ALL ON coach_daily_metric_v FROM anon, authenticated;
GRANT SELECT ON coach_daily_metric_v TO service_role;

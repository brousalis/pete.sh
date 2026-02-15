-- ============================================
-- MAPLE WALKS: Support 'other' workout type
-- Maple walks should be recorded as 'Other' on Apple Watch
-- to avoid polluting fitness calibration data with dog walk pace.
-- This updates the helper function to include both 'walking' and 'other' types.
-- ============================================

-- Update helper function to include 'other' workout type for Maple walks
CREATE OR REPLACE FUNCTION get_available_walking_workouts(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  healthkit_id TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration INTEGER,
  distance_miles DECIMAL,
  active_calories DECIMAL,
  hr_average INTEGER,
  hr_max INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ahw.id,
    ahw.healthkit_id,
    ahw.start_date,
    ahw.end_date,
    ahw.duration,
    ahw.distance_miles,
    ahw.active_calories,
    ahw.hr_average,
    ahw.hr_max
  FROM apple_health_workouts ahw
  LEFT JOIN maple_walks mw ON ahw.id = mw.healthkit_workout_id
  WHERE ahw.workout_type IN ('walking', 'other')
    AND mw.id IS NULL
  ORDER BY ahw.start_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

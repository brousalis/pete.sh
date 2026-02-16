-- ============================================
-- MAPLE WALKS: Support 'hiking' and 'other' workout types
-- Maple walks should be recorded as 'Hiking' on Apple Watch to get GPS route
-- tracking while avoiding polluting walk/run fitness calibration data.
-- Also supports 'other' as a fallback and 'walking' for legacy compatibility.
-- ============================================

-- Update helper function to include 'hiking' and 'other' workout types for Maple walks
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
  WHERE ahw.workout_type IN ('hiking', 'walking', 'other')
    AND mw.id IS NULL
  ORDER BY ahw.start_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

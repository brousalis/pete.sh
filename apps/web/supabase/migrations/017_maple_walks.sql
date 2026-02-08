-- ============================================
-- MAPLE WALKS SCHEMA
-- Track dog walks with mood ratings and notes
-- Links to apple_health_workouts for health/route data
-- ============================================

-- Main walks table
CREATE TABLE IF NOT EXISTS maple_walks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  healthkit_workout_id UUID REFERENCES apple_health_workouts(id) ON DELETE SET NULL,

  -- Walk metadata
  title TEXT,
  mood_rating TEXT CHECK (mood_rating IN ('happy', 'neutral', 'sad')),
  notes TEXT,

  -- Cached data from workout for quick display (denormalized for performance)
  date DATE NOT NULL,
  duration INTEGER, -- seconds
  distance_miles DECIMAL(6,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each workout can only be linked to one walk
  UNIQUE(healthkit_workout_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_maple_walks_date ON maple_walks(date DESC);
CREATE INDEX IF NOT EXISTS idx_maple_walks_healthkit_workout ON maple_walks(healthkit_workout_id);
CREATE INDEX IF NOT EXISTS idx_maple_walks_mood ON maple_walks(mood_rating);
CREATE INDEX IF NOT EXISTS idx_maple_walks_created ON maple_walks(created_at DESC);

-- Row Level Security
ALTER TABLE maple_walks ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read maple_walks" ON maple_walks FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Allow service role all maple_walks" ON maple_walks FOR ALL USING (auth.role() = 'service_role');

-- Anon write access (for web app)
CREATE POLICY "Allow anon insert maple_walks" ON maple_walks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update maple_walks" ON maple_walks FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete maple_walks" ON maple_walks FOR DELETE USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maple_walks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS maple_walks_updated_at ON maple_walks;
CREATE TRIGGER maple_walks_updated_at
  BEFORE UPDATE ON maple_walks
  FOR EACH ROW
  EXECUTE FUNCTION update_maple_walks_updated_at();

-- Helper function to get walk statistics
CREATE OR REPLACE FUNCTION get_maple_walk_stats()
RETURNS TABLE (
  total_walks BIGINT,
  total_distance_miles DECIMAL,
  total_duration_minutes DECIMAL,
  avg_distance_miles DECIMAL,
  avg_duration_minutes DECIMAL,
  happy_count BIGINT,
  neutral_count BIGINT,
  sad_count BIGINT,
  this_week_walks BIGINT,
  this_month_walks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_walks,
    COALESCE(SUM(mw.distance_miles), 0)::DECIMAL as total_distance_miles,
    COALESCE(SUM(mw.duration) / 60.0, 0)::DECIMAL as total_duration_minutes,
    COALESCE(AVG(mw.distance_miles), 0)::DECIMAL as avg_distance_miles,
    COALESCE(AVG(mw.duration) / 60.0, 0)::DECIMAL as avg_duration_minutes,
    COUNT(*) FILTER (WHERE mw.mood_rating = 'happy')::BIGINT as happy_count,
    COUNT(*) FILTER (WHERE mw.mood_rating = 'neutral')::BIGINT as neutral_count,
    COUNT(*) FILTER (WHERE mw.mood_rating = 'sad')::BIGINT as sad_count,
    COUNT(*) FILTER (WHERE mw.date >= date_trunc('week', CURRENT_DATE))::BIGINT as this_week_walks,
    COUNT(*) FILTER (WHERE mw.date >= date_trunc('month', CURRENT_DATE))::BIGINT as this_month_walks
  FROM maple_walks mw;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get available walking workouts (not yet linked to maple walks)
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
  WHERE ahw.workout_type = 'walking'
    AND mw.id IS NULL
  ORDER BY ahw.start_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

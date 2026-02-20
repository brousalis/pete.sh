-- ============================================
-- MAPLE BATHROOM MARKERS
-- Track bathroom breaks during Maple walks
-- Linked to apple_health_workouts (not maple_walks)
-- because the workout syncs before the walk is created
-- ============================================

CREATE TABLE IF NOT EXISTS maple_bathroom_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  marker_type TEXT NOT NULL CHECK (marker_type IN ('pee', 'poop')),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  -- Client-generated UUID for deduplication across retries and dual-sync paths
  client_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bathroom_markers_workout ON maple_bathroom_markers(workout_id);
CREATE INDEX IF NOT EXISTS idx_bathroom_markers_type ON maple_bathroom_markers(marker_type);

-- Row Level Security
ALTER TABLE maple_bathroom_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read maple_bathroom_markers"
  ON maple_bathroom_markers FOR SELECT USING (true);

CREATE POLICY "Allow anon insert maple_bathroom_markers"
  ON maple_bathroom_markers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon delete maple_bathroom_markers"
  ON maple_bathroom_markers FOR DELETE USING (true);

CREATE POLICY "Allow service role all maple_bathroom_markers"
  ON maple_bathroom_markers FOR ALL USING (auth.role() = 'service_role');

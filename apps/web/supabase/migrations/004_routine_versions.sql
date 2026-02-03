-- Fitness Routine Versions Schema
-- This migration adds version history tracking for fitness routines and workout definitions

-- ============================================
-- FITNESS ROUTINE VERSIONS TABLE
-- Stores complete snapshots of routines with version tracking
-- ============================================
CREATE TABLE IF NOT EXISTS fitness_routine_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  change_summary TEXT,
  user_profile JSONB NOT NULL,
  injury_protocol JSONB,
  schedule JSONB NOT NULL,
  daily_routines JSONB NOT NULL,
  workout_definitions JSONB NOT NULL,  -- Complete workout definitions snapshot
  is_active BOOLEAN DEFAULT FALSE,
  is_draft BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,  -- When this version was made active
  UNIQUE(routine_id, version_number)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_routine_versions_routine_id ON fitness_routine_versions(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_versions_active ON fitness_routine_versions(routine_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_routine_versions_created ON fitness_routine_versions(routine_id, created_at DESC);

-- ============================================
-- WORKOUT DEFINITIONS TABLE
-- Stores the active workout definitions separately for faster access
-- ============================================
CREATE TABLE IF NOT EXISTS workout_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id TEXT NOT NULL,
  day_of_week TEXT NOT NULL,  -- 'monday', 'tuesday', etc.
  workout JSONB NOT NULL,  -- Full Workout object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(routine_id, day_of_week)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workout_definitions_routine_day ON workout_definitions(routine_id, day_of_week);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE fitness_routine_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_definitions ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read versions" ON fitness_routine_versions FOR SELECT USING (true);
CREATE POLICY "Allow public read workout_defs" ON workout_definitions FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all versions" ON fitness_routine_versions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all workout_defs" ON workout_definitions FOR ALL USING (auth.role() = 'service_role');

-- Allow anon key to write (for production mode interactivity)
CREATE POLICY "Allow anon write versions" ON fitness_routine_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update versions" ON fitness_routine_versions FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete versions" ON fitness_routine_versions FOR DELETE USING (true);
CREATE POLICY "Allow anon write workout_defs" ON workout_definitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update workout_defs" ON workout_definitions FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete workout_defs" ON workout_definitions FOR DELETE USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get the active version for a routine
CREATE OR REPLACE FUNCTION get_active_routine_version(p_routine_id TEXT)
RETURNS fitness_routine_versions AS $$
  SELECT * FROM fitness_routine_versions
  WHERE routine_id = p_routine_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL;

-- Function to get the latest version number for a routine
CREATE OR REPLACE FUNCTION get_latest_version_number(p_routine_id TEXT)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version_number), 0)
  FROM fitness_routine_versions
  WHERE routine_id = p_routine_id;
$$ LANGUAGE SQL;

-- Function to get workout definitions for a routine
CREATE OR REPLACE FUNCTION get_workout_definitions(p_routine_id TEXT)
RETURNS SETOF workout_definitions AS $$
  SELECT * FROM workout_definitions
  WHERE routine_id = p_routine_id
  ORDER BY
    CASE day_of_week
      WHEN 'monday' THEN 1
      WHEN 'tuesday' THEN 2
      WHEN 'wednesday' THEN 3
      WHEN 'thursday' THEN 4
      WHEN 'friday' THEN 5
      WHEN 'saturday' THEN 6
      WHEN 'sunday' THEN 7
    END;
$$ LANGUAGE SQL;

-- Trigger to ensure only one active version per routine
CREATE OR REPLACE FUNCTION ensure_single_active_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE fitness_routine_versions
    SET is_active = false, updated_at = NOW()
    WHERE routine_id = NEW.routine_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_active_version ON fitness_routine_versions;
CREATE TRIGGER trigger_ensure_single_active_version
  BEFORE INSERT OR UPDATE ON fitness_routine_versions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_version();

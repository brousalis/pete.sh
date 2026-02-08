-- User Heart Rate Zones Configuration
-- Stores personalized HR zone thresholds from Apple Watch HealthKit
-- These are calculated dynamically by Apple based on your fitness data

-- ============================================
-- USER HR ZONES CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_hr_zones_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User's max heart rate (for reference)
  max_hr INTEGER,
  resting_hr INTEGER,

  -- Method used to determine zones
  -- 'apple_watch' (HealthKit calculated), 'age_formula' (220-age), 'fitness_test', 'manual'
  determination_method TEXT DEFAULT 'apple_watch',

  -- Direct BPM thresholds from Apple Watch
  -- Zone 1: < zone2_min_bpm
  -- Zone 2: zone2_min_bpm to zone2_max_bpm
  -- Zone 3: zone3_min_bpm to zone3_max_bpm
  -- Zone 4: zone4_min_bpm to zone4_max_bpm
  -- Zone 5: >= zone5_min_bpm
  zone1_max_bpm INTEGER NOT NULL,  -- Upper bound of Zone 1
  zone2_min_bpm INTEGER NOT NULL,  -- Lower bound of Zone 2
  zone2_max_bpm INTEGER NOT NULL,  -- Upper bound of Zone 2
  zone3_min_bpm INTEGER NOT NULL,  -- Lower bound of Zone 3
  zone3_max_bpm INTEGER NOT NULL,  -- Upper bound of Zone 3
  zone4_min_bpm INTEGER NOT NULL,  -- Lower bound of Zone 4
  zone4_max_bpm INTEGER NOT NULL,  -- Upper bound of Zone 4
  zone5_min_bpm INTEGER NOT NULL,  -- Lower bound of Zone 5

  -- Zone labels (customizable)
  zone1_label TEXT DEFAULT 'Zone 1',
  zone2_label TEXT DEFAULT 'Zone 2',
  zone3_label TEXT DEFAULT 'Zone 3',
  zone4_label TEXT DEFAULT 'Zone 4',
  zone5_label TEXT DEFAULT 'Zone 5',

  -- Zone colors (for UI - matching Apple Fitness app)
  zone1_color TEXT DEFAULT '#60a5fa', -- blue (light effort)
  zone2_color TEXT DEFAULT '#4ade80', -- green (fat burn)
  zone3_color TEXT DEFAULT '#facc15', -- yellow (cardio)
  zone4_color TEXT DEFAULT '#fb923c', -- orange (hard)
  zone5_color TEXT DEFAULT '#f87171', -- red (peak)

  -- When this config was active
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE, -- NULL means current

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active config at a time (effective_to IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_zones_active
  ON user_hr_zones_config(effective_to)
  WHERE effective_to IS NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_hr_zones_dates
  ON user_hr_zones_config(effective_from, effective_to);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get active HR zones config
CREATE OR REPLACE FUNCTION get_active_hr_zones()
RETURNS user_hr_zones_config AS $$
  SELECT * FROM user_hr_zones_config
  WHERE effective_to IS NULL
  ORDER BY effective_from DESC
  LIMIT 1;
$$ LANGUAGE SQL;

-- Get HR zones config for a specific workout date
CREATE OR REPLACE FUNCTION get_hr_zones_for_date(p_date DATE)
RETURNS user_hr_zones_config AS $$
  SELECT * FROM user_hr_zones_config
  WHERE p_date >= effective_from
    AND (effective_to IS NULL OR p_date <= effective_to)
  ORDER BY effective_from DESC
  LIMIT 1;
$$ LANGUAGE SQL;

-- Determine which zone a BPM falls into (returns 1-5)
CREATE OR REPLACE FUNCTION get_hr_zone(p_bpm INTEGER, p_config_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  config user_hr_zones_config;
BEGIN
  -- Get config (specific or active)
  IF p_config_id IS NOT NULL THEN
    SELECT * INTO config FROM user_hr_zones_config WHERE id = p_config_id;
  ELSE
    SELECT * INTO config FROM user_hr_zones_config WHERE effective_to IS NULL LIMIT 1;
  END IF;

  IF config IS NULL THEN
    RETURN NULL;
  END IF;

  -- Determine zone based on BPM thresholds
  IF p_bpm >= config.zone5_min_bpm THEN
    RETURN 5;
  ELSIF p_bpm >= config.zone4_min_bpm THEN
    RETURN 4;
  ELSIF p_bpm >= config.zone3_min_bpm THEN
    RETURN 3;
  ELSIF p_bpm >= config.zone2_min_bpm THEN
    RETURN 2;
  ELSE
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_hr_zones_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read hr zones" ON user_hr_zones_config;
DROP POLICY IF EXISTS "Allow service role all hr zones" ON user_hr_zones_config;
DROP POLICY IF EXISTS "Allow anon write hr zones" ON user_hr_zones_config;
DROP POLICY IF EXISTS "Allow anon update hr zones" ON user_hr_zones_config;

CREATE POLICY "Allow public read hr zones" ON user_hr_zones_config FOR SELECT USING (true);
CREATE POLICY "Allow service role all hr zones" ON user_hr_zones_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon write hr zones" ON user_hr_zones_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update hr zones" ON user_hr_zones_config FOR UPDATE USING (true);

-- ============================================
-- PETE'S HR ZONES CONFIG
-- Exact values from Apple Watch HealthKit (screenshot)
-- Zone 1: <135, Zone 2: 136-147, Zone 3: 148-158, Zone 4: 159-169, Zone 5: 170+
-- ============================================
INSERT INTO user_hr_zones_config (
  max_hr,
  resting_hr,
  determination_method,
  zone1_max_bpm,
  zone2_min_bpm,
  zone2_max_bpm,
  zone3_min_bpm,
  zone3_max_bpm,
  zone4_min_bpm,
  zone4_max_bpm,
  zone5_min_bpm,
  zone1_label,
  zone2_label,
  zone3_label,
  zone4_label,
  zone5_label,
  notes
) VALUES (
  189,   -- Estimated max HR
  NULL,  -- Resting HR (can be updated)
  'apple_watch',
  134,   -- Zone 1: <135 BPM
  136,   -- Zone 2: 136-147 BPM
  147,
  148,   -- Zone 3: 148-158 BPM
  158,
  159,   -- Zone 4: 159-169 BPM
  169,
  170,   -- Zone 5: 170+ BPM
  'Zone 1',
  'Zone 2',
  'Zone 3',
  'Zone 4',
  'Zone 5',
  'Exact zones from Apple Watch HealthKit calculation (Feb 2026). Zone 1: <135, Zone 2: 136-147, Zone 3: 148-158, Zone 4: 159-169, Zone 5: 170+'
) ON CONFLICT DO NOTHING;

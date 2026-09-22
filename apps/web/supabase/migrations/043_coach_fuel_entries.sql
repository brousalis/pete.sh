-- ============================================
-- Fuel: per-meal / per-drink intake entries
-- ============================================
-- Day aggregates stay on coach_nutrition_day. This table is the source of
-- truth for what was logged; actual_* on the day row is recomputed from it.

CREATE TABLE IF NOT EXISTS coach_fuel_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind TEXT NOT NULL CHECK (kind IN ('food', 'drink', 'other')),
  description_raw TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  kcal INTEGER NOT NULL CHECK (kcal >= 0),
  protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
  assumptions TEXT,
  confidence NUMERIC(4, 3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  source TEXT NOT NULL CHECK (source IN ('llm', 'manual', 'reuse')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coach_fuel_entry_log_date_idx
  ON coach_fuel_entry (log_date DESC, logged_at DESC);

ALTER TABLE coach_fuel_entry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON coach_fuel_entry;
CREATE POLICY "service_role_all" ON coach_fuel_entry
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON coach_fuel_entry FROM anon, authenticated;
GRANT ALL ON coach_fuel_entry TO service_role;

DROP TRIGGER IF EXISTS coach_fuel_entry_touch ON coach_fuel_entry;
CREATE TRIGGER coach_fuel_entry_touch
  BEFORE UPDATE ON coach_fuel_entry
  FOR EACH ROW
  EXECUTE FUNCTION coach_touch_updated_at();

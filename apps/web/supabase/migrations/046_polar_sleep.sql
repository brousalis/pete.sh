-- ============================================================================
-- Polar Loop sleep (comparison only — Apple HealthKit stays coach SoT)
-- ============================================================================
-- Stores AccessLink OAuth tokens and nightly sleep aggregates from Polar Flow.
-- Never merged into apple_health_daily_metrics or coach_daily_metric_v.
-- ============================================================================

-- ============================================
-- POLAR OAUTH (single-row personal client)
-- ============================================

CREATE TABLE IF NOT EXISTS polar_oauth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  polar_user_id TEXT,
  needs_reauth BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION ensure_single_polar_oauth()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM polar_oauth) > 0 THEN
    RAISE EXCEPTION 'Only one row allowed in polar_oauth table';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS polar_oauth_single_row ON polar_oauth;
CREATE TRIGGER polar_oauth_single_row
  BEFORE INSERT ON polar_oauth
  FOR EACH ROW EXECUTE FUNCTION ensure_single_polar_oauth();

CREATE OR REPLACE FUNCTION update_polar_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS polar_oauth_updated_at ON polar_oauth;
CREATE TRIGGER polar_oauth_updated_at
  BEFORE UPDATE ON polar_oauth
  FOR EACH ROW EXECUTE FUNCTION update_polar_oauth_updated_at();

-- ============================================
-- POLAR SLEEP NIGHTS
-- ============================================

CREATE TABLE IF NOT EXISTS polar_sleep_nights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  device_id TEXT,
  sleep_start TIMESTAMPTZ,
  sleep_end TIMESTAMPTZ,
  light_sleep INTEGER,
  deep_sleep INTEGER,
  rem_sleep INTEGER,
  unrecognized_sleep_stage INTEGER,
  total_interruption_duration INTEGER,
  short_interruption_duration INTEGER,
  long_interruption_duration INTEGER,
  sleep_score INTEGER,
  continuity DECIMAL(4, 2),
  continuity_class INTEGER,
  sleep_charge INTEGER,
  sleep_goal INTEGER,
  sleep_rating INTEGER,
  sleep_cycles INTEGER,
  group_duration_score DECIMAL(5, 2),
  group_solidity_score DECIMAL(5, 2),
  group_regeneration_score DECIMAL(5, 2),
  hypnogram JSONB,
  heart_rate_samples JSONB,
  raw JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polar_sleep_nights_date
  ON polar_sleep_nights(date DESC);

-- ============================================
-- RLS — service_role only (tokens + health)
-- ============================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['polar_oauth', 'polar_sleep_nights'] LOOP
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

COMMENT ON TABLE polar_oauth IS 'Polar AccessLink OAuth tokens for personal Loop sync; service_role only';
COMMENT ON TABLE polar_sleep_nights IS 'Polar Sleep Plus Stages nights for Apple comparison only; not used by readiness';

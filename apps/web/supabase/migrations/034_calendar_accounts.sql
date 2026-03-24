-- Calendar Accounts & Settings
-- This migration adds multi-account Google Calendar support
-- and calendar display preferences

-- ============================================
-- CALENDAR ACCOUNTS TABLE
-- Stores OAuth tokens per Google account
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  needs_reauth BOOLEAN NOT NULL DEFAULT false,
  selected_calendars JSONB DEFAULT '[]'::jsonb,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_accounts_email ON calendar_accounts(email);
CREATE INDEX IF NOT EXISTS idx_calendar_accounts_active ON calendar_accounts(is_active) WHERE is_active = true;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_calendar_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_accounts_updated_at
  BEFORE UPDATE ON calendar_accounts
  FOR EACH ROW EXECUTE FUNCTION update_calendar_accounts_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- Deny anon access entirely (tokens are sensitive)
-- Only service_role can read/write
-- ============================================
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access calendar_accounts" ON calendar_accounts
  FOR ALL USING (false);

CREATE POLICY "Allow service role all calendar_accounts" ON calendar_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ADD account_id TO calendar_events
-- Preserves account provenance in cached events
-- ============================================
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES calendar_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id);

-- ============================================
-- ADD calendar_config TO app_settings
-- JSONB column for calendar display preferences
-- ============================================
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS calendar_config JSONB NOT NULL DEFAULT '{
  "default_view": "week",
  "week_starts_on": 1,
  "show_fitness_events": true,
  "show_meal_plan_events": true,
  "show_declined_events": false,
  "show_weekends": true
}'::jsonb;

COMMENT ON TABLE calendar_accounts IS 'OAuth tokens and metadata for connected Google Calendar accounts';
COMMENT ON COLUMN calendar_accounts.selected_calendars IS 'Array of {calendarId, name, color, visible} objects';
COMMENT ON COLUMN calendar_accounts.needs_reauth IS 'Set when token refresh fails; shown as warning in settings UI';
COMMENT ON COLUMN calendar_events.account_id IS 'FK to calendar_accounts for multi-account provenance';
COMMENT ON COLUMN app_settings.calendar_config IS 'Calendar display preferences (view, week start, event visibility)';

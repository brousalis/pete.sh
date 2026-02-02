-- App Settings Schema
-- This migration adds a table for storing application-wide settings

-- ============================================
-- APP SETTINGS TABLE
-- Single row table for global app configuration
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Layout settings
  rounded_layout BOOLEAN NOT NULL DEFAULT true,
  -- Theme settings (stored in DB for sync across devices)
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  brand_color TEXT NOT NULL DEFAULT 'yellow' CHECK (brand_color IN ('purple', 'blue', 'teal', 'orange', 'pink', 'yellow')),
  -- Future environment config keys will go here
  -- ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ENSURE SINGLE ROW
-- Trigger to prevent multiple rows
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_app_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM app_settings) > 0 THEN
    RAISE EXCEPTION 'Only one row allowed in app_settings table';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_single_row
  BEFORE INSERT ON app_settings
  FOR EACH ROW EXECUTE FUNCTION ensure_single_app_settings();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_app_settings_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read app_settings" ON app_settings FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all app_settings" ON app_settings FOR ALL USING (auth.role() = 'service_role');

-- Allow anon write access for production interactivity
CREATE POLICY "Allow anon write app_settings" ON app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update app_settings" ON app_settings FOR UPDATE USING (true);

-- ============================================
-- SEED DATA (Default settings)
-- ============================================
INSERT INTO app_settings (rounded_layout, theme, brand_color)
VALUES (true, 'system', 'yellow')
ON CONFLICT DO NOTHING;

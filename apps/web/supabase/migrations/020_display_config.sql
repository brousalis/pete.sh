-- Display Configuration Settings
-- This migration adds display/KVM configuration to app_settings

-- ============================================
-- ADD DISPLAY CONFIG COLUMNS
-- ============================================
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS display_monitor TEXT NOT NULL DEFAULT '\\.\DISPLAY2',
ADD COLUMN IF NOT EXISTS display_primary_input TEXT NOT NULL DEFAULT 'hdmi' CHECK (display_primary_input IN ('hdmi', 'displayport')),
ADD COLUMN IF NOT EXISTS display_secondary_input TEXT NOT NULL DEFAULT 'displayport' CHECK (display_secondary_input IN ('hdmi', 'displayport'));

-- Add comment for documentation
COMMENT ON COLUMN app_settings.display_monitor IS 'Windows display identifier (e.g., \\.\DISPLAY1, \\.\DISPLAY2)';
COMMENT ON COLUMN app_settings.display_primary_input IS 'Primary input source for KVM switching';
COMMENT ON COLUMN app_settings.display_secondary_input IS 'Secondary input source for KVM switching';

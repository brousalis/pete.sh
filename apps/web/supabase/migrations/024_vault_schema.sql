-- Vault Notes Schema Migration
-- Personal note-taking vault with tags, pinning, and attachment support

-- ============================================================================
-- VAULT NOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB NOT NULL DEFAULT '{}',        -- Tiptap JSON format for editing
  content_html TEXT,                           -- Pre-rendered HTML for display/search
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  source_url TEXT,                             -- For web clippings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE vault_notes IS 'Personal vault notes with Tiptap editor content';
COMMENT ON COLUMN vault_notes.content IS 'Tiptap JSON document format for editing';
COMMENT ON COLUMN vault_notes.content_html IS 'Pre-rendered HTML for display and search';
COMMENT ON COLUMN vault_notes.is_pinned IS 'Pinned notes appear at the top of the list';
COMMENT ON COLUMN vault_notes.source_url IS 'Original URL for web clippings';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vault_notes_created_at ON vault_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_notes_updated_at ON vault_notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_notes_is_pinned ON vault_notes(is_pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_notes_tags ON vault_notes USING GIN(tags);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_vault_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vault_notes_updated_at ON vault_notes;
CREATE TRIGGER trigger_vault_notes_updated_at
  BEFORE UPDATE ON vault_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_notes_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE vault_notes ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for API routes)
CREATE POLICY "Service role has full access to vault notes"
  ON vault_notes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon can read all vault notes (for dashboard viewing)
CREATE POLICY "Anon can read all vault notes"
  ON vault_notes
  FOR SELECT
  USING (true);

-- ============================================================================
-- STORAGE BUCKET SETUP
-- ============================================================================

-- IMPORTANT: Run these commands in Supabase SQL Editor to create the storage bucket
-- Or configure via Supabase Dashboard: Storage > Create new bucket

-- Create the vault-attachments bucket (if using SQL):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vault-attachments', 'vault-attachments', true);

-- Storage Bucket Configuration (via Dashboard):
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: vault-attachments
-- 4. Public bucket: Yes (enabled)
-- 5. Click "Create bucket"

-- Then add these RLS policies for the bucket:

-- Policy 1: Public read access
-- CREATE POLICY "Public Access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'vault-attachments');

-- Policy 2: Service role can upload
-- CREATE POLICY "Service role can upload vault attachments" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'vault-attachments'
--     AND auth.role() = 'service_role'
--   );

-- Policy 3: Service role can delete
-- CREATE POLICY "Service role can delete vault attachments" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'vault-attachments'
--     AND auth.role() = 'service_role'
--   );

-- Recommended bucket settings:
-- - Max file size: 10MB (10485760 bytes)

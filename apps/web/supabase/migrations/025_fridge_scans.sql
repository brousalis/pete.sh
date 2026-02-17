-- Fridge Scanner: stores scan history for voice and photo-based ingredient detection
CREATE TABLE fridge_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('voice', 'photo')),
  raw_transcript TEXT,
  identified_items TEXT[] NOT NULL DEFAULT '{}',
  confirmed_items TEXT[] NOT NULL DEFAULT '{}',
  recipes_matched INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fridge_scans_created ON fridge_scans (created_at DESC);

ALTER TABLE fridge_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON fridge_scans FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON fridge_scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON fridge_scans FOR UPDATE USING (true);
CREATE POLICY "Service role full access" ON fridge_scans
  FOR ALL USING (auth.role() = 'service_role');

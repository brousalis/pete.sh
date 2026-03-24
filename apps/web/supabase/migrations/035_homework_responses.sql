-- Homework responses table for storing client homework answers
-- Supports multiple homework documents and respondents via JSONB responses

CREATE TABLE IF NOT EXISTS homework_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id TEXT NOT NULL,
  respondent_id TEXT NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(homework_id, respondent_id)
);

-- Index for fast lookups by homework + respondent
CREATE INDEX IF NOT EXISTS idx_homework_responses_lookup
  ON homework_responses(homework_id, respondent_id);

-- RLS policies
ALTER TABLE homework_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to homework_responses"
  ON homework_responses FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to homework_responses"
  ON homework_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to homework_responses"
  ON homework_responses FOR UPDATE
  USING (true);

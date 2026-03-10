-- Unified Assistant (Option D)
-- Migration 033: assistant_conversations + assistant_user_memory for load_memory / update_memory

-- ============================================
-- ASSISTANT CONVERSATIONS (chat history)
-- ============================================

CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_conv_updated ON assistant_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_user ON assistant_conversations(user_id);

-- ============================================
-- ASSISTANT USER MEMORY (persistent user model)
-- ============================================

CREATE TABLE IF NOT EXISTS assistant_user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_assistant_memory_user ON assistant_user_memory(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for assistant_conversations" ON assistant_conversations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for assistant_user_memory" ON assistant_user_memory
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- CLEANUP FUNCTION (data retention)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_assistant_old_records()
RETURNS void AS $$
BEGIN
  -- Keep last 30 days of conversations
  DELETE FROM assistant_conversations
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

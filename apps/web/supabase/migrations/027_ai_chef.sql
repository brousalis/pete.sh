-- AI Chef tables
-- Migration 027: AI-powered cooking assistant with food preferences and chat history

-- ============================================
-- COOKING PREFERENCES (single-row document)
-- ============================================

CREATE TABLE IF NOT EXISTS cooking_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preferences JSONB NOT NULL DEFAULT '{
    "dislikes": [],
    "allergies": [],
    "dietary": [],
    "cuisinePreferences": [],
    "householdSize": 2,
    "cookingTimePreference": "30-min",
    "notes": ""
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI CHEF CONVERSATIONS (chat history)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_chef_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chef_conv_updated ON ai_chef_conversations(updated_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE cooking_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chef_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for cooking_preferences" ON cooking_preferences
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for ai_chef_conversations" ON ai_chef_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- CLEANUP FUNCTION (data retention)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_ai_chef_old_records()
RETURNS void AS $$
BEGIN
  -- Keep last 30 days of conversations
  DELETE FROM ai_chef_conversations
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- AI Coach tables and body composition columns
-- Migration 023: AI-powered fitness coaching support

-- ============================================
-- BODY COMPOSITION (from Fitindex ES-26M via HealthKit)
-- ============================================

ALTER TABLE apple_health_daily_metrics ADD COLUMN IF NOT EXISTS body_mass_lbs DECIMAL;
ALTER TABLE apple_health_daily_metrics ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL;
ALTER TABLE apple_health_daily_metrics ADD COLUMN IF NOT EXISTS lean_body_mass_lbs DECIMAL;

-- ============================================
-- EXERCISE WEIGHT LOGS (progressive overload tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS exercise_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_version_id UUID REFERENCES fitness_routine_versions(id) ON DELETE SET NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  weight_lbs DECIMAL,
  sets_completed INTEGER,
  reps_completed INTEGER,
  rpe DECIMAL,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ewl_exercise ON exercise_weight_logs(exercise_id, year, week_number);
CREATE INDEX IF NOT EXISTS idx_ewl_logged_at ON exercise_weight_logs(logged_at DESC);

-- ============================================
-- AI COACH INSIGHTS (persisted analysis results)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_coach_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id TEXT REFERENCES fitness_routines(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_context JSONB,
  analysis JSONB NOT NULL,
  training_readiness_score INTEGER,
  has_routine_suggestions BOOLEAN DEFAULT FALSE,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aci_created ON ai_coach_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aci_trigger ON ai_coach_insights(trigger_type);

-- ============================================
-- AI COACH CONVERSATIONS (chat history)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RECIPE NUTRITION (optional macro fields)
-- ============================================

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS calories_per_serving INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS protein_g DECIMAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS fat_g DECIMAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS carbs_g DECIMAL;

-- ============================================
-- CLEANUP FUNCTION for AI coach insights (data retention)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_ai_coach_old_records()
RETURNS void AS $$
BEGIN
  -- Keep last 90 days of insights
  DELETE FROM ai_coach_insights
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Keep last 30 days of conversations
  DELETE FROM ai_coach_conversations
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

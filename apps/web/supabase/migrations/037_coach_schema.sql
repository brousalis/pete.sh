-- ============================================================================
-- PeteCoach Schema
-- ============================================================================
-- AI triathlon coach built on top of the existing apple_health_* raw store.
--
-- Design rules:
--   1. Raw HealthKit data stays in apple_health_*. Coach reads it through the
--      coach_activity_v / coach_daily_metric_v views so sport naming, units and
--      device provenance are normalised in exactly one place.
--   2. Every coach_* table is service_role only. Unlike the smart-home tables,
--      this schema holds medical information (MRI findings, PT notes, symptom
--      logs, medication) and must never be anon-readable.
--   3. Deterministic analytics (TSS, PMC, ACWR, readiness) are persisted in
--      coach_activity_load / coach_daily_readiness so the LLM never recomputes
--      them from raw samples.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ATHLETE
-- ============================================

CREATE TABLE IF NOT EXISTS coach_athlete_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  name TEXT NOT NULL,
  birth_date DATE,
  sex TEXT,
  height_cm DECIMAL(5, 2),

  -- Body composition targets (band, not a deficit target)
  weight_target_low_lbs DECIMAL(5, 2),
  weight_target_high_lbs DECIMAL(5, 2),
  body_fat_target_pct DECIMAL(4, 2),

  -- Physiology
  max_hr INTEGER,
  resting_hr_baseline INTEGER,
  lthr INTEGER,                       -- lactate threshold HR
  css_pace_per_100yd DECIMAL(6, 2),   -- critical swim speed, seconds
  ftp_watts INTEGER,
  vdot DECIMAL(5, 2),

  -- Goal race
  goal_race_name TEXT,
  goal_race_date DATE,
  goal_race_distance TEXT,            -- 'olympic', 'sprint', '70.3', ...
  goal_time_seconds INTEGER,

  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_profile_active
  ON coach_athlete_profile(is_active) WHERE is_active;

-- Scheduling / logistics constraints the planner must respect
CREATE TABLE IF NOT EXISTS coach_constraint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,                 -- 'schedule_window' | 'facility' | 'travel' | 'blackout' | 'preference'
  label TEXT NOT NULL,
  day_of_week INTEGER,                -- 0=Sunday .. 6=Saturday, null = all days
  start_time TIME,
  end_time TIME,
  start_date DATE,
  end_date DATE,
  detail JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_constraint_kind ON coach_constraint(kind) WHERE is_active;

-- ============================================
-- INJURY / MEDICAL
-- ============================================

CREATE TABLE IF NOT EXISTS coach_injury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  body_region TEXT NOT NULL,          -- 'right_knee', 'left_knee', ...
  sites TEXT[] NOT NULL DEFAULT '{}', -- 'pes_anserine', 'patellar_cartilage', 'bakers_cyst', ...
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'managed' | 'resolved'
  severity TEXT,                      -- 'mild' | 'moderate' | 'severe'
  onset_date DATE,
  resolved_date DATE,

  -- Structured clinical findings extracted from imaging / PT notes.
  -- Kept as facts so the guardrail engine can reason without the LLM.
  diagnosis JSONB NOT NULL DEFAULT '{}',
  contraindications TEXT[] NOT NULL DEFAULT '{}',
  clearances JSONB NOT NULL DEFAULT '{}',

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_injury_status ON coach_injury(status);

CREATE TABLE IF NOT EXISTS coach_injury_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_id UUID REFERENCES coach_injury(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,           -- 'imaging' | 'pt_visit' | 'md_visit' | 'flare' | 'clearance' | 'note'
  provider TEXT,
  summary TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '{}',
  document_id UUID,                   -- FK added after coach_document exists
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_injury_event_date ON coach_injury_event(event_date DESC);

CREATE TABLE IF NOT EXISTS coach_symptom_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  site TEXT NOT NULL,                 -- 'r_knee_medial', 'pes_anserine', ...
  pain_score INTEGER NOT NULL CHECK (pain_score BETWEEN 0 AND 10),
  context TEXT,                       -- 'during' | 'after' | 'next_morning' | 'rest'
  activity_id UUID REFERENCES apple_health_workouts(id) ON DELETE SET NULL,
  session_id UUID,                    -- FK added after coach_planned_session exists
  swelling BOOLEAN NOT NULL DEFAULT FALSE,
  instability BOOLEAN NOT NULL DEFAULT FALSE,
  locking BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_symptom_date ON coach_symptom_log(log_date DESC, site);

CREATE TABLE IF NOT EXISTS coach_medication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  medication TEXT NOT NULL,
  dose_mg DECIMAL(8, 2),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_medication_date ON coach_medication_log(log_date DESC);

-- ============================================
-- PHYSICAL THERAPY PROTOCOL
-- ============================================

CREATE TABLE IF NOT EXISTS coach_pt_exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,             -- 'activation' | 'armor' | 'strength' | 'mobility' | 'plyometric'
  target TEXT,                        -- 'vmo', 'glute_med', 'hamstring', ...
  prescription JSONB NOT NULL DEFAULT '{}', -- { sets, reps, hold_seconds, side, band }
  progression JSONB NOT NULL DEFAULT '[]',  -- ordered progression levels
  cues TEXT,
  contraindications TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,                        -- 'physical_therapist' | 'md' | 'coach'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A named block (e.g. "Morning Activation Block") that the planner may not remove
CREATE TABLE IF NOT EXISTS coach_pt_protocol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  time_of_day TEXT NOT NULL,          -- 'morning' | 'evening' | 'pre_session' | 'post_session'
  cadence TEXT NOT NULL DEFAULT 'daily', -- 'daily' | 'training_days' | 'run_days'
  duration_minutes INTEGER,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_pt_protocol_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES coach_pt_protocol(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES coach_pt_exercise(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  prescription_override JSONB,
  UNIQUE (protocol_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS coach_pt_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES coach_pt_protocol(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_items UUID[] NOT NULL DEFAULT '{}',
  skipped BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  UNIQUE (protocol_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_coach_pt_completion_date ON coach_pt_completion(completed_date DESC);

-- ============================================
-- PLAN: MACROCYCLE -> BLOCK -> WEEK -> SESSION
-- ============================================

CREATE TABLE IF NOT EXISTS coach_macrocycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal_race_name TEXT,
  goal_race_date DATE NOT NULL,
  goal_time_seconds INTEGER,
  start_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Target split budget: { swim, t1, bike, t2, run } in seconds
  split_budget JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  macrocycle_id UUID NOT NULL REFERENCES coach_macrocycle(id) ON DELETE CASCADE,
  block_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  phase TEXT NOT NULL,                -- 'rehab' | 'base1' | 'base2' | 'build' | 'peak' | 'taper' | 'race'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goals TEXT[] NOT NULL DEFAULT '{}',
  planned_tests TEXT[] NOT NULL DEFAULT '{}',
  review JSONB,                       -- populated by the end-of-block review job
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (macrocycle_id, block_number)
);

CREATE INDEX IF NOT EXISTS idx_coach_block_dates ON coach_block(start_date, end_date);

CREATE TABLE IF NOT EXISTS coach_week (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES coach_block(id) ON DELETE CASCADE,
  week_start DATE NOT NULL UNIQUE,    -- Monday
  week_number INTEGER NOT NULL,       -- within the macrocycle
  is_deload BOOLEAN NOT NULL DEFAULT FALSE,
  focus TEXT,
  -- Planned aggregates, filled by the planner; actuals computed nightly
  planned_load JSONB NOT NULL DEFAULT '{}',
  actual_load JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'active' | 'complete'
  rationale TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_week_start ON coach_week(week_start DESC);

CREATE TABLE IF NOT EXISTS coach_planned_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES coach_week(id) ON DELETE CASCADE,

  session_date DATE NOT NULL,
  slot TEXT NOT NULL DEFAULT 'primary', -- 'primary' | 'second' | 'pt_morning' | 'pt_evening'
  sort_order INTEGER NOT NULL DEFAULT 0,

  sport TEXT NOT NULL,                -- 'swim' | 'bike' | 'run' | 'strength' | 'pt' | 'brick' | 'rest'
  session_type TEXT NOT NULL,         -- 'z2' | 'tempo' | 'intervals' | 'long' | 'recovery' | 'test' | 'technique'
  title TEXT NOT NULL,
  description TEXT,

  planned_duration_seconds INTEGER,
  planned_distance_meters DECIMAL(12, 2),
  planned_load DECIMAL(8, 2),         -- TSS

  -- WorkoutKit-compatible structured steps. Shape:
  -- { warmup: Step, blocks: [{ repeat: n, steps: [Step] }], cooldown: Step }
  -- Step: { kind, goal: { type, value, unit }, alert: { type, min, max } }
  steps JSONB NOT NULL DEFAULT '{}',
  targets JSONB NOT NULL DEFAULT '{}', -- { hr_zone, pace_range, cadence_range, rpe }

  rationale TEXT,
  guardrail_report JSONB,             -- output of the Injury Guard for this session

  status TEXT NOT NULL DEFAULT 'planned', -- 'planned' | 'completed' | 'skipped' | 'modified' | 'cancelled'
  completed_activity_id UUID REFERENCES apple_health_workouts(id) ON DELETE SET NULL,

  watch_sync_state TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'scheduled' | 'unsupported' | 'failed'
  watch_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_session_date ON coach_planned_session(session_date, sort_order);
CREATE INDEX IF NOT EXISTS idx_coach_session_week ON coach_planned_session(week_id);
CREATE INDEX IF NOT EXISTS idx_coach_session_status ON coach_planned_session(status, session_date);

ALTER TABLE coach_symptom_log
  ADD CONSTRAINT coach_symptom_log_session_fk
  FOREIGN KEY (session_id) REFERENCES coach_planned_session(id) ON DELETE SET NULL;

-- Every deviation from the approved plan, whether coach- or athlete-initiated
CREATE TABLE IF NOT EXISTS coach_audible (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coach_planned_session(id) ON DELETE CASCADE,
  week_id UUID REFERENCES coach_week(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  actor TEXT NOT NULL,                -- 'coach' | 'athlete' | 'guardrail'
  change_type TEXT NOT NULL,          -- 'downgrade' | 'swap' | 'move' | 'cancel' | 'add' | 'upgrade'
  trigger TEXT,                       -- 'pain' | 'readiness' | 'weather' | 'schedule' | 'travel' | 'manual'

  before_state JSONB,
  after_state JSONB,
  reason TEXT NOT NULL,
  guardrail_report JSONB,
  auto_applied BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_coach_audible_created ON coach_audible(created_at DESC);

CREATE TABLE IF NOT EXISTS coach_session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coach_planned_session(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,

  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  max_pain INTEGER CHECK (max_pain BETWEEN 0 AND 10),
  nutrition_adherence INTEGER CHECK (nutrition_adherence BETWEEN 1 AND 5),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_feedback_date ON coach_session_feedback(feedback_date DESC);

CREATE TABLE IF NOT EXISTS coach_benchmark_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_date DATE NOT NULL,
  test_type TEXT NOT NULL,            -- 'css' | 'ftp_20min' | 'run_tt' | 'quad_symmetry' | 'step_down' | 'single_leg_squat'
  sport TEXT,
  result JSONB NOT NULL,              -- shape depends on test_type
  passed BOOLEAN,                     -- for gating tests
  notes TEXT,
  activity_id UUID REFERENCES apple_health_workouts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_benchmark_type ON coach_benchmark_test(test_type, test_date DESC);

-- Imported history of the pre-PeteCoach routine versions, for pattern analysis
CREATE TABLE IF NOT EXISTS coach_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,               -- 'fitness_routine_versions' | 'markdown' | 'manual'
  source_id TEXT,
  effective_from DATE,
  effective_to DATE,
  name TEXT,
  summary TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COMPUTED ANALYTICS (deterministic, never LLM-generated)
-- ============================================

CREATE TABLE IF NOT EXISTS coach_activity_load (
  activity_id UUID PRIMARY KEY REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  sport TEXT NOT NULL,

  tss DECIMAL(8, 2),
  tss_method TEXT,                    -- 'hrTSS' | 'rTSS' | 'sTSS' | 'pTSS' | 'estimated'
  trimp DECIMAL(8, 2),
  intensity_factor DECIMAL(5, 3),
  normalized_power INTEGER,
  efficiency_factor DECIMAL(8, 4),
  decoupling_pct DECIMAL(6, 2),

  zone_seconds JSONB NOT NULL DEFAULT '{}', -- { z1: s, z2: s, ... }
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calc_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_coach_activity_load_date ON coach_activity_load(activity_date DESC);

CREATE TABLE IF NOT EXISTS coach_daily_readiness (
  metric_date DATE PRIMARY KEY,

  -- Inputs (snapshotted so a score is always explainable after the fact)
  hrv_sdnn DECIMAL(6, 2),
  hrv_baseline_7d DECIMAL(6, 2),
  hrv_z_score DECIMAL(6, 3),
  rhr INTEGER,
  rhr_baseline_7d DECIMAL(6, 2),
  sleep_seconds INTEGER,
  sleep_score INTEGER,
  respiratory_rate DECIMAL(5, 2),
  wrist_temp_delta DECIMAL(5, 2),

  ctl DECIMAL(8, 2),
  atl DECIMAL(8, 2),
  tsb DECIMAL(8, 2),
  acwr DECIMAL(6, 3),
  monotony DECIMAL(6, 3),
  strain DECIMAL(10, 2),
  max_pain_7d INTEGER,

  -- Output
  score INTEGER NOT NULL,
  level TEXT NOT NULL,                -- 'fresh' | 'moderate' | 'fatigued' | 'compromised'
  components JSONB NOT NULL DEFAULT '{}',
  flags TEXT[] NOT NULL DEFAULT '{}',

  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calc_version INTEGER NOT NULL DEFAULT 1
);

-- ============================================
-- NUTRITION
-- ============================================

CREATE TABLE IF NOT EXISTS coach_nutrition_day (
  log_date DATE PRIMARY KEY,
  target_kcal INTEGER,
  target_protein_g INTEGER,
  target_carbs_g INTEGER,
  target_fat_g INTEGER,
  actual_kcal INTEGER,
  actual_protein_g INTEGER,
  actual_carbs_g INTEGER,
  actual_fat_g INTEGER,
  fueling_window TEXT,                -- 'high' | 'moderate' | 'low' — periodised to session load
  hydration_ml INTEGER,
  adherence INTEGER CHECK (adherence BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- GEAR
-- ============================================

CREATE TABLE IF NOT EXISTS coach_gear_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,             -- 'shoes' | 'bike' | 'component' | 'wetsuit' | 'sensor' | 'apparel'
  sport TEXT,
  brand TEXT,
  model TEXT,
  purchased_on DATE,
  cost_usd DECIMAL(10, 2),
  retired_on DATE,
  -- Distance-based life for consumables (shoes, chains, tyres)
  life_limit_meters DECIMAL(12, 2),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_gear_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL REFERENCES coach_gear_item(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  distance_meters DECIMAL(12, 2),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gear_id, activity_id)
);

CREATE TABLE IF NOT EXISTS coach_gear_service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL REFERENCES coach_gear_item(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,         -- 'bike_fit' | 'chain' | 'tune' | 'cleat' | 'inspection'
  performed_on DATE,
  due_on DATE,
  interval_meters DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_gear_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  rationale TEXT NOT NULL,
  estimated_cost_usd DECIMAL(10, 2),
  estimated_seconds_saved INTEGER,    -- over the goal race
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'proposed', -- 'proposed' | 'accepted' | 'declined' | 'purchased'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- KNOWLEDGE BASE (pgvector)
-- ============================================

CREATE TABLE IF NOT EXISTS coach_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL,             -- 'book' | 'paper' | 'guideline' | 'medical' | 'plan' | 'note'
  authors TEXT,
  year INTEGER,
  citation TEXT,
  storage_path TEXT,                  -- Supabase Storage key (private bucket)
  source_url TEXT,
  is_medical BOOLEAN NOT NULL DEFAULT FALSE,
  ingested_at TIMESTAMPTZ,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coach_injury_event
  ADD CONSTRAINT coach_injury_event_document_fk
  FOREIGN KEY (document_id) REFERENCES coach_document(id) ON DELETE SET NULL;

-- voyage-3 produces 1024-dimension embeddings
CREATE TABLE IF NOT EXISTS coach_chunk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES coach_document(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  heading TEXT,
  page_number INTEGER,
  token_count INTEGER,
  embedding vector(1024),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_coach_chunk_tsv ON coach_chunk USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_coach_chunk_embedding
  ON coach_chunk USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS coach_pubmed_cache (
  pmid TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  abstract TEXT,
  journal TEXT,
  year INTEGER,
  authors TEXT,
  query TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CONVERSATION + MEMORY
-- ============================================

CREATE TABLE IF NOT EXISTS coach_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  -- Rolling summary of everything before the retained message window
  summary TEXT,
  summary_through_message INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  deep_mode BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_conversation_recent ON coach_conversation(last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS coach_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversation(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  role TEXT NOT NULL,                 -- 'user' | 'assistant' | 'system'
  -- Full AI SDK UIMessage (parts array), so tool calls survive a reload
  content JSONB NOT NULL,
  agent_run_id UUID,                  -- FK added after coach_agent_run exists
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_coach_message_conv ON coach_message(conversation_id, seq);

CREATE TABLE IF NOT EXISTS coach_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type TEXT NOT NULL,          -- 'fact' | 'preference' | 'episode' | 'insight'
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
  -- Decays over time unless reinforced; recall filters on effective strength
  strength DECIMAL(4, 3) NOT NULL DEFAULT 1.0,
  reinforce_count INTEGER NOT NULL DEFAULT 1,
  last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,                        -- 'digest' | 'tool' | 'manual' | 'import'
  source_conversation_id UUID REFERENCES coach_conversation(id) ON DELETE SET NULL,
  superseded_by UUID REFERENCES coach_memory(id) ON DELETE SET NULL,
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_memory_type ON coach_memory(memory_type) WHERE superseded_by IS NULL;
CREATE INDEX IF NOT EXISTS idx_coach_memory_tags ON coach_memory USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_coach_memory_embedding
  ON coach_memory USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS coach_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  entry TEXT NOT NULL,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  concerns TEXT[] NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AGENT RUNS + COST GOVERNANCE
-- ============================================

CREATE TABLE IF NOT EXISTS coach_agent_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job TEXT NOT NULL,                  -- 'chat' | 'briefing' | 'debrief' | 'weekly_plan' | 'block_review' | 'digest' | 'eval'
  model TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,

  input_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  cache_hit_ratio DECIMAL(5, 4),

  budget_state TEXT,                  -- 'normal' | 'degraded' | 'capped' | 'exempt'
  tool_trace JSONB NOT NULL DEFAULT '[]',
  conversation_id UUID REFERENCES coach_conversation(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'error'
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_agent_run_started ON coach_agent_run(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_agent_run_job ON coach_agent_run(job, started_at DESC);

ALTER TABLE coach_message
  ADD CONSTRAINT coach_message_agent_run_fk
  FOREIGN KEY (agent_run_id) REFERENCES coach_agent_run(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS coach_cost_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,               -- 'day' | 'month'
  period_start DATE NOT NULL,
  cap_usd DECIMAL(10, 2) NOT NULL,
  spent_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  degrade_at_pct INTEGER NOT NULL DEFAULT 80,
  notified_at TIMESTAMPTZ,
  UNIQUE (period, period_start)
);

-- Atomically add spend and return the resulting budget state, so concurrent
-- jobs can never both slip under a cap.
CREATE OR REPLACE FUNCTION coach_record_spend(
  p_cost DECIMAL,
  p_day_cap DECIMAL DEFAULT 8.00,
  p_month_cap DECIMAL DEFAULT 120.00
)
RETURNS TABLE (
  day_spent DECIMAL,
  day_cap DECIMAL,
  month_spent DECIMAL,
  month_cap DECIMAL,
  state TEXT
) AS $$
DECLARE
  v_day_spent DECIMAL;
  v_day_cap DECIMAL;
  v_month_spent DECIMAL;
  v_month_cap DECIMAL;
  v_day_pct DECIMAL;
  v_month_pct DECIMAL;
  v_degrade_at INTEGER;
BEGIN
  INSERT INTO coach_cost_budget (period, period_start, cap_usd, spent_usd)
  VALUES ('day', CURRENT_DATE, p_day_cap, p_cost)
  ON CONFLICT (period, period_start)
  DO UPDATE SET spent_usd = coach_cost_budget.spent_usd + p_cost
  RETURNING coach_cost_budget.spent_usd, coach_cost_budget.cap_usd, coach_cost_budget.degrade_at_pct
  INTO v_day_spent, v_day_cap, v_degrade_at;

  INSERT INTO coach_cost_budget (period, period_start, cap_usd, spent_usd)
  VALUES ('month', DATE_TRUNC('month', CURRENT_DATE)::DATE, p_month_cap, p_cost)
  ON CONFLICT (period, period_start)
  DO UPDATE SET spent_usd = coach_cost_budget.spent_usd + p_cost
  RETURNING coach_cost_budget.spent_usd, coach_cost_budget.cap_usd
  INTO v_month_spent, v_month_cap;

  v_day_pct := CASE WHEN v_day_cap > 0 THEN (v_day_spent / v_day_cap) * 100 ELSE 0 END;
  v_month_pct := CASE WHEN v_month_cap > 0 THEN (v_month_spent / v_month_cap) * 100 ELSE 0 END;
  v_degrade_at := COALESCE(v_degrade_at, 80);

  RETURN QUERY SELECT
    v_day_spent,
    v_day_cap,
    v_month_spent,
    v_month_cap,
    CASE
      WHEN v_day_pct >= 100 OR v_month_pct >= 100 THEN 'capped'
      WHEN v_day_pct >= v_degrade_at OR v_month_pct >= v_degrade_at THEN 'degraded'
      ELSE 'normal'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PUSH SUBSCRIPTIONS (Web Push + APNs)
-- ============================================

CREATE TABLE IF NOT EXISTS coach_push_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,                 -- 'web' | 'apns'
  endpoint TEXT,                      -- web push endpoint
  device_token TEXT,                  -- APNs token
  keys JSONB,                         -- { p256dh, auth }
  device_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kind, endpoint),
  UNIQUE (kind, device_token)
);

-- ============================================
-- NORMALISED VIEWS OVER THE RAW HEALTH STORE
-- ============================================

-- Maps HealthKit workout types onto the four coach sports and exposes only the
-- columns the analytics layer needs.
CREATE OR REPLACE VIEW coach_activity_v AS
SELECT
  w.id,
  w.healthkit_id,
  w.start_date,
  w.end_date,
  (w.start_date AT TIME ZONE 'America/Chicago')::DATE AS activity_date,
  w.duration AS duration_seconds,
  CASE
    WHEN w.workout_type IN ('running') THEN 'run'
    WHEN w.workout_type IN ('cycling') THEN 'bike'
    WHEN w.workout_type IN ('swimming') THEN 'swim'
    WHEN w.workout_type IN (
      'functionalStrengthTraining', 'traditionalStrengthTraining', 'coreTraining'
    ) THEN 'strength'
    WHEN w.workout_type IN ('walking', 'hiking') THEN 'walk'
    WHEN w.workout_type IN ('hiit', 'highIntensityIntervalTraining') THEN 'hiit'
    WHEN w.workout_type IN ('rowing', 'elliptical', 'stairClimbing') THEN 'cross'
    ELSE 'other'
  END AS sport,
  w.workout_type AS raw_type,
  w.is_indoor,
  w.distance_meters,
  w.distance_miles,
  w.elevation_gain_meters,
  w.active_calories,
  w.total_calories,
  w.hr_average,
  w.hr_min,
  w.hr_max,
  w.hr_zones,
  w.cadence_average,
  w.pace_average,
  w.running_power_avg,
  w.stride_length_avg,
  w.swimming_stroke_count,
  w.swimming_pool_length_meters,
  w.swimming_location,
  w.effort_score,
  w.source,
  w.device_name,
  w.linked_day,
  w.linked_workout_id,
  l.tss,
  l.tss_method,
  l.trimp,
  l.intensity_factor,
  l.decoupling_pct,
  l.zone_seconds,
  s.id AS planned_session_id
FROM apple_health_workouts w
LEFT JOIN coach_activity_load l ON l.activity_id = w.id
LEFT JOIN coach_planned_session s ON s.completed_activity_id = w.id;

-- Daily metrics joined with computed readiness so one query serves the prompt.
CREATE OR REPLACE VIEW coach_daily_metric_v AS
SELECT
  d.date AS metric_date,
  d.steps,
  d.active_calories,
  d.exercise_minutes,
  d.resting_heart_rate,
  d.heart_rate_variability AS hrv_sdnn,
  d.vo2_max,
  d.sleep_duration AS sleep_seconds,
  d.sleep_deep,
  d.sleep_rem,
  d.sleep_core,
  d.sleep_awake,
  d.body_mass_lbs,
  d.body_fat_percentage,
  d.lean_body_mass_lbs,
  r.hrv_baseline_7d,
  r.hrv_z_score,
  r.rhr_baseline_7d,
  r.ctl,
  r.atl,
  r.tsb,
  r.acwr,
  r.monotony,
  r.strain,
  r.score AS readiness_score,
  r.level AS readiness_level,
  r.flags AS readiness_flags
FROM apple_health_daily_metrics d
LEFT JOIN coach_daily_readiness r ON r.metric_date = d.date;

-- ============================================
-- SEMANTIC SEARCH HELPERS
-- ============================================

CREATE OR REPLACE FUNCTION coach_match_chunks(
  query_embedding vector(1024),
  match_count INTEGER DEFAULT 6,
  min_similarity DECIMAL DEFAULT 0.2
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  title TEXT,
  citation TEXT,
  heading TEXT,
  content TEXT,
  similarity DECIMAL
) AS $$
  SELECT
    c.id,
    c.document_id,
    d.title,
    d.citation,
    c.heading,
    c.content,
    (1 - (c.embedding <=> query_embedding))::DECIMAL AS similarity
  FROM coach_chunk c
  JOIN coach_document d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION coach_match_memories(
  query_embedding vector(1024),
  match_count INTEGER DEFAULT 8,
  min_strength DECIMAL DEFAULT 0.25
)
RETURNS TABLE (
  memory_id UUID,
  memory_type TEXT,
  content TEXT,
  tags TEXT[],
  confidence DECIMAL,
  strength DECIMAL,
  similarity DECIMAL
) AS $$
  SELECT
    m.id,
    m.memory_type,
    m.content,
    m.tags,
    m.confidence,
    m.strength,
    (1 - (m.embedding <=> query_embedding))::DECIMAL AS similarity
  FROM coach_memory m
  WHERE m.embedding IS NOT NULL
    AND m.superseded_by IS NULL
    AND m.strength >= min_strength
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- ROW LEVEL SECURITY — service_role only
-- ============================================
-- Medical data. No anon policies are created, so RLS denies anon by default.

DO $$
DECLARE
  t TEXT;
  coach_tables TEXT[] := ARRAY[
    'coach_athlete_profile', 'coach_constraint',
    'coach_injury', 'coach_injury_event', 'coach_symptom_log', 'coach_medication_log',
    'coach_pt_exercise', 'coach_pt_protocol', 'coach_pt_protocol_item', 'coach_pt_completion',
    'coach_macrocycle', 'coach_block', 'coach_week', 'coach_planned_session',
    'coach_audible', 'coach_session_feedback', 'coach_benchmark_test', 'coach_plan_history',
    'coach_activity_load', 'coach_daily_readiness', 'coach_nutrition_day',
    'coach_gear_item', 'coach_gear_usage', 'coach_gear_service', 'coach_gear_recommendation',
    'coach_document', 'coach_chunk', 'coach_pubmed_cache',
    'coach_conversation', 'coach_message', 'coach_memory', 'coach_journal',
    'coach_agent_run', 'coach_cost_budget', 'coach_push_subscription'
  ];
BEGIN
  FOREACH t IN ARRAY coach_tables LOOP
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

-- Views inherit the base-table RLS, but revoke direct grants for clarity.
REVOKE ALL ON coach_activity_v FROM anon, authenticated;
REVOKE ALL ON coach_daily_metric_v FROM anon, authenticated;
GRANT SELECT ON coach_activity_v TO service_role;
GRANT SELECT ON coach_daily_metric_v TO service_role;

REVOKE ALL ON FUNCTION coach_match_chunks(vector, INTEGER, DECIMAL) FROM anon, authenticated;
REVOKE ALL ON FUNCTION coach_match_memories(vector, INTEGER, DECIMAL) FROM anon, authenticated;
REVOKE ALL ON FUNCTION coach_record_spend(DECIMAL, DECIMAL, DECIMAL) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION coach_match_chunks(vector, INTEGER, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION coach_match_memories(vector, INTEGER, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION coach_record_spend(DECIMAL, DECIMAL, DECIMAL) TO service_role;

-- ============================================
-- updated_at triggers
-- ============================================

CREATE OR REPLACE FUNCTION coach_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
  touch_tables TEXT[] := ARRAY[
    'coach_athlete_profile', 'coach_constraint', 'coach_injury',
    'coach_pt_exercise', 'coach_pt_protocol',
    'coach_macrocycle', 'coach_block', 'coach_week', 'coach_planned_session',
    'coach_nutrition_day', 'coach_gear_item', 'coach_gear_recommendation',
    'coach_conversation', 'coach_memory'
  ];
BEGIN
  FOREACH t IN ARRAY touch_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION coach_touch_updated_at()',
      t, t
    );
  END LOOP;
END $$;

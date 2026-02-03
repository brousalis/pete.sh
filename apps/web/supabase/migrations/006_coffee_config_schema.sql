-- Coffee Configuration Schema
-- This migration adds tables for managing coffee recipes, roast strategies, doses, and rules

-- ============================================
-- COFFEE ROAST STRATEGIES TABLE
-- General brewing rules for each roast type
-- ============================================
CREATE TABLE IF NOT EXISTS coffee_roast_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roast TEXT NOT NULL UNIQUE CHECK (roast IN ('light', 'medium', 'dark')),
  goal TEXT NOT NULL,
  temp TEXT NOT NULL,
  technique TEXT NOT NULL,
  ratio TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COFFEE RECIPES TABLE
-- Recipes for both Switch and Moccamaster methods
-- ============================================
CREATE TABLE IF NOT EXISTS coffee_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL CHECK (method IN ('switch', 'moccamaster')),
  cup_size TEXT NOT NULL, -- '1-cup', '2-cup', '3-4-cup', '8-cup', '10-cup'
  cup_size_label TEXT NOT NULL, -- e.g., '1 Cup (300ml)'
  water_ml INTEGER NOT NULL,
  roast TEXT NOT NULL CHECK (roast IN ('light', 'medium', 'dark')),
  ratio TEXT NOT NULL, -- e.g., '1:16'
  coffee DECIMAL(10, 2) NOT NULL, -- grams
  temp TEXT NOT NULL,
  technique TEXT NOT NULL,
  switch_setting TEXT, -- 'open', 'closed', 'hybrid' for Hario Switch
  mocca_setting TEXT, -- 'half', 'full' for Moccamaster
  timing_cues JSONB DEFAULT '[]', -- Array of TimingCue objects
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(method, cup_size, roast)
);

-- ============================================
-- COFFEE QUICK DOSES TABLE
-- Quick reference dose numbers for grinder
-- ============================================
CREATE TABLE IF NOT EXISTS coffee_quick_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL CHECK (method IN ('switch', 'moccamaster')),
  label TEXT NOT NULL, -- e.g., '1 Cup (Standard)'
  grams DECIMAL(10, 2) NOT NULL,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COFFEE GOLDEN RULES TABLE
-- Universal brewing rules
-- ============================================
CREATE TABLE IF NOT EXISTS coffee_golden_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COFFEE RECOMMENDATIONS TABLE
-- Time-based recipe recommendations
-- ============================================
CREATE TABLE IF NOT EXISTS coffee_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., 'Morning Batch', 'Afternoon Cup', 'Sunday Brunch'
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday), NULL means any day
  hour_start INTEGER NOT NULL CHECK (hour_start >= 0 AND hour_start < 24),
  hour_end INTEGER NOT NULL CHECK (hour_end >= 0 AND hour_end <= 24),
  method TEXT NOT NULL CHECK (method IN ('switch', 'moccamaster')),
  cup_size TEXT NOT NULL,
  roast TEXT NOT NULL CHECK (roast IN ('light', 'medium', 'dark')),
  priority INTEGER NOT NULL DEFAULT 0, -- Higher priority wins when multiple match
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coffee_recipes_method ON coffee_recipes(method);
CREATE INDEX IF NOT EXISTS idx_coffee_recipes_active ON coffee_recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_coffee_quick_doses_method ON coffee_quick_doses(method);
CREATE INDEX IF NOT EXISTS idx_coffee_recommendations_time ON coffee_recommendations(day_of_week, hour_start, hour_end);
CREATE INDEX IF NOT EXISTS idx_coffee_recommendations_active ON coffee_recommendations(is_active);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_coffee_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coffee_roast_strategies_updated_at
  BEFORE UPDATE ON coffee_roast_strategies
  FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

CREATE TRIGGER coffee_recipes_updated_at
  BEFORE UPDATE ON coffee_recipes
  FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

CREATE TRIGGER coffee_quick_doses_updated_at
  BEFORE UPDATE ON coffee_quick_doses
  FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

CREATE TRIGGER coffee_golden_rules_updated_at
  BEFORE UPDATE ON coffee_golden_rules
  FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

CREATE TRIGGER coffee_recommendations_updated_at
  BEFORE UPDATE ON coffee_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE coffee_roast_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_quick_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_golden_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_recommendations ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read coffee_roast_strategies" ON coffee_roast_strategies FOR SELECT USING (true);
CREATE POLICY "Allow public read coffee_recipes" ON coffee_recipes FOR SELECT USING (true);
CREATE POLICY "Allow public read coffee_quick_doses" ON coffee_quick_doses FOR SELECT USING (true);
CREATE POLICY "Allow public read coffee_golden_rules" ON coffee_golden_rules FOR SELECT USING (true);
CREATE POLICY "Allow public read coffee_recommendations" ON coffee_recommendations FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all coffee_roast_strategies" ON coffee_roast_strategies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all coffee_recipes" ON coffee_recipes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all coffee_quick_doses" ON coffee_quick_doses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all coffee_golden_rules" ON coffee_golden_rules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all coffee_recommendations" ON coffee_recommendations FOR ALL USING (auth.role() = 'service_role');

-- Allow anon write access for production interactivity
CREATE POLICY "Allow anon write coffee_roast_strategies" ON coffee_roast_strategies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update coffee_roast_strategies" ON coffee_roast_strategies FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete coffee_roast_strategies" ON coffee_roast_strategies FOR DELETE USING (true);

CREATE POLICY "Allow anon write coffee_recipes" ON coffee_recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update coffee_recipes" ON coffee_recipes FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete coffee_recipes" ON coffee_recipes FOR DELETE USING (true);

CREATE POLICY "Allow anon write coffee_quick_doses" ON coffee_quick_doses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update coffee_quick_doses" ON coffee_quick_doses FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete coffee_quick_doses" ON coffee_quick_doses FOR DELETE USING (true);

CREATE POLICY "Allow anon write coffee_golden_rules" ON coffee_golden_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update coffee_golden_rules" ON coffee_golden_rules FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete coffee_golden_rules" ON coffee_golden_rules FOR DELETE USING (true);

CREATE POLICY "Allow anon write coffee_recommendations" ON coffee_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update coffee_recommendations" ON coffee_recommendations FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete coffee_recommendations" ON coffee_recommendations FOR DELETE USING (true);

-- ============================================
-- SEED DATA (Default values from coffee-v2.md)
-- ============================================

-- Roast Strategies
INSERT INTO coffee_roast_strategies (roast, goal, temp, technique, ratio, sort_order) VALUES
  ('light', 'Acidity & Complexity', '212°F (Boiling)', 'High Agitation. Pour aggressively. Stir blooms.', '1:16 or 1:17', 1),
  ('medium', 'Sweetness & Body', '200°F – 205°F', 'Gentle Agitation. Pour steadily. Minimal stirring.', '1:16 or 1:17', 2),
  ('dark', 'Light & Sweet (No Bitterness)', '195°F (Manual) or Default (Machine)', 'Zero Agitation. Do not stir. Let gravity do the work.', '1:18 (less coffee)', 3)
ON CONFLICT (roast) DO NOTHING;

-- Golden Rules
INSERT INTO coffee_golden_rules (title, description, sort_order) VALUES
  ('RDT Spray', 'Spray beans with one spritz of water before grinding. Shake to coat. Prevents static.', 1),
  ('Filter Rinse', 'ALWAYS rinse paper filters with hot water before adding coffee. Removes cardboard taste.', 2),
  ('Water Quality', 'Moccamaster: Filtered tap is fine. Switch: Use Third Wave Water for fruit clarity.', 3),
  ('Bean Storage', 'Keep in original bag, squeezed tight, in cupboard. Freeze if not finishing in 3 weeks.', 4)
ON CONFLICT DO NOTHING;

-- Quick Doses - Switch
INSERT INTO coffee_quick_doses (method, label, grams, sort_order) VALUES
  ('switch', '1 Cup (Standard)', 18.8, 1),
  ('switch', '2 Cups (Standard)', 37.5, 2),
  ('switch', '2 Cups (Dark)', 33, 3),
  ('switch', '3 Cups (Standard)', 56, 4),
  ('switch', '4 Cups (Standard)', 62.5, 5)
ON CONFLICT DO NOTHING;

-- Quick Doses - Moccamaster
INSERT INTO coffee_quick_doses (method, label, grams, sort_order) VALUES
  ('moccamaster', '2 Cups (Standard)', 35, 1),
  ('moccamaster', '2 Cups (Dark)', 33, 2),
  ('moccamaster', '4 Cups (Standard)', 47, 3),
  ('moccamaster', '6 Cups (Standard)', 59, 4),
  ('moccamaster', '8 Cups (Standard)', 65, 5),
  ('moccamaster', '8 Cups (Dark)', 56, 6),
  ('moccamaster', '10 Cups (Standard)', 73.5, 7),
  ('moccamaster', '10 Cups (Dark)', 69, 8)
ON CONFLICT DO NOTHING;

-- Recommendations
INSERT INTO coffee_recommendations (name, day_of_week, hour_start, hour_end, method, cup_size, roast, priority) VALUES
  ('Sunday Brunch', 0, 8, 14, 'switch', '3-4-cup', 'light', 100),
  ('Morning Batch', NULL, 5, 12, 'moccamaster', '8-cup', 'medium', 50),
  ('Afternoon Cup', NULL, 12, 18, 'switch', '1-cup', 'medium', 50),
  ('Default', NULL, 0, 24, 'moccamaster', '8-cup', 'medium', 0)
ON CONFLICT DO NOTHING;

-- Recipes - Switch
INSERT INTO coffee_recipes (method, cup_size, cup_size_label, water_ml, roast, ratio, coffee, temp, technique, switch_setting, timing_cues) VALUES
  -- 1 Cup
  ('switch', '1-cup', '1 Cup (300ml)', 300, 'light', '1:16', 18.8, '212°F', 'Aggressive Flush. Brisk swirl during steep.', 'hybrid', '[{"time": 0, "label": "Flush", "action": "Pour 60g fast with switch DOWN"}, {"time": 45, "label": "Steep", "action": "Switch UP, pour to 300g, swirl"}, {"time": 150, "label": "Release", "action": "Switch DOWN, let drain"}]'),
  ('switch', '1-cup', '1 Cup (300ml)', 300, 'medium', '1:16', 18.8, '200°F', 'Gentle Flush. One soft swirl during steep.', 'hybrid', '[{"time": 0, "label": "Flush", "action": "Pour 60g gently with switch DOWN"}, {"time": 45, "label": "Steep", "action": "Switch UP, pour to 300g, one soft swirl"}, {"time": 150, "label": "Release", "action": "Switch DOWN, let drain"}]'),
  ('switch', '1-cup', '1 Cup (300ml)', 300, 'dark', '1:18', 16.5, '195°F', 'V60 Mode Only. Switch OPEN. Pour slowly center. No immersion.', 'open', '[]'),
  -- 2 Cups
  ('switch', '2-cup', '2 Cups (600ml)', 600, 'light', '1:16', 37.5, '212°F', '5 Pours. Bloom + 4 aggressive pulses. Keep heat high.', 'open', '[{"time": 0, "label": "Bloom", "action": "Pour ~100g, stir"}, {"time": 45, "label": "Pour 1", "action": "Pour to ~200g"}, {"time": 75, "label": "Pour 2", "action": "Pour to ~350g"}, {"time": 105, "label": "Pour 3", "action": "Pour to ~500g"}, {"time": 135, "label": "Pour 4", "action": "Pour to 600g"}]'),
  ('switch', '2-cup', '2 Cups (600ml)', 600, 'medium', '1:16', 37.5, '205°F', '3 Pours. Bloom → to 350g → to 600g. Pour in center at end.', 'open', '[{"time": 0, "label": "Bloom", "action": "Pour ~100g"}, {"time": 45, "label": "Pour 1", "action": "Pour to 350g"}, {"time": 90, "label": "Pour 2", "action": "Pour to 600g, center pour"}]'),
  ('switch', '2-cup', '2 Cups (600ml)', 600, 'dark', '1:18', 33, '195°F', 'Center Pour Only. Steady in center (quarter size). No stir.', 'open', '[]'),
  -- 3-4 Cups
  ('switch', '3-4-cup', '3–4 Cups (1000ml)', 1000, 'light', '1:16', 62.5, '212°F', 'Excavate Bloom. Stir bottom vigorously. High pour height.', 'open', '[{"time": 0, "label": "Bloom", "action": "Pour 180g, dig to bottom"}, {"time": 45, "label": "Pour 1", "action": "Pour to 500g"}, {"time": 105, "label": "Pour 2", "action": "Pour to 800g"}, {"time": 150, "label": "Pour 3", "action": "Pour to 1000g"}]'),
  ('switch', '3-4-cup', '3–4 Cups (1000ml)', 1000, 'medium', '1:16', 62.5, '212°F', 'Dig Bloom Only. Gentle spiral pours after bloom.', 'open', '[{"time": 0, "label": "Bloom", "action": "Pour 180g, dig bloom"}, {"time": 45, "label": "Pour 1", "action": "Gentle spiral to 500g"}, {"time": 105, "label": "Pour 2", "action": "Gentle spiral to 800g"}, {"time": 150, "label": "Pour 3", "action": "Gentle spiral to 1000g"}]'),
  ('switch', '3-4-cup', '3–4 Cups (1000ml)', 1000, 'dark', '1:18', 56, '195°F', 'No Stir. Gentle bloom. Pour very slowly center to avoid overflow.', 'open', '[]')
ON CONFLICT (method, cup_size, roast) DO NOTHING;

-- Recipes - Moccamaster
INSERT INTO coffee_recipes (method, cup_size, cup_size_label, water_ml, roast, ratio, coffee, temp, technique, mocca_setting, timing_cues) VALUES
  -- 2 Cups
  ('moccamaster', '2-cup', '2 Cups (600ml)', 600, 'light', '1:17', 35, 'Default', 'Stir at 0:30. Pulse flow is slow, so help it get wet.', 'half', '[{"time": 30, "label": "Stir", "action": "Stir wet grounds"}]'),
  ('moccamaster', '2-cup', '2 Cups (600ml)', 600, 'medium', '1:17', 35, 'Default', 'No Stir. Agitation makes medium roast bitter.', 'half', '[]'),
  ('moccamaster', '2-cup', '2 Cups (600ml)', 600, 'dark', '1:18', 33, 'Default', 'NO STIR. Use 1:18 ratio. Let pulse flow handle it.', 'half', '[]'),
  -- 8 Cups
  ('moccamaster', '8-cup', '8 Cups (1 Liter)', 1000, 'light', '1:17', 59, 'Default', 'Stir at 0:45. Break the crust thoroughly.', 'full', '[{"time": 45, "label": "Stir", "action": "Break the crust (3 circles)"}]'),
  ('moccamaster', '8-cup', '8 Cups (1 Liter)', 1000, 'medium', '1:17', 59, 'Default', 'Gentle Stir at 0:45. Just 3 circles to mix.', 'full', '[{"time": 45, "label": "Stir", "action": "Gentle stir (3 circles)"}]'),
  ('moccamaster', '8-cup', '8 Cups (1 Liter)', 1000, 'dark', '1:18', 56, 'Default', 'NO STIR. Use 1:18. Stirring will cause clogging and ashiness.', 'full', '[]'),
  -- 10 Cups
  ('moccamaster', '10-cup', '10 Cups (1.25 Liters)', 1250, 'light', '1:17', 73.5, 'Default', 'Safety Stir at 1:00. Watch for overflow. Fold filter edges HARD.', 'full', '[{"time": 60, "label": "Stir", "action": "Safety stir, watch overflow"}]'),
  ('moccamaster', '10-cup', '10 Cups (1.25 Liters)', 1250, 'medium', '1:17', 73.5, 'Default', 'Safety Stir at 1:00. Be careful if beans are fresh/bloomy.', 'full', '[{"time": 60, "label": "Stir", "action": "Safety stir if needed"}]'),
  ('moccamaster', '10-cup', '10 Cups (1.25 Liters)', 1250, 'dark', '1:18', 69, 'Default', 'ABSOLUTELY NO STIR. Basket full of foam. Stirring causes overflow.', 'full', '[]')
ON CONFLICT (method, cup_size, roast) DO NOTHING;

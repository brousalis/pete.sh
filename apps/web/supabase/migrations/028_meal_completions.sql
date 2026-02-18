-- Meal Completions Schema
-- Tracks when recipes are cooked, with optional ratings and notes.
-- Supports multiple completions per recipe for cooking history.

CREATE TABLE IF NOT EXISTS meal_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  day_of_week TEXT,
  meal_type TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  cooked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_completions_recipe_id ON meal_completions(recipe_id, cooked_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_completions_meal_plan_id ON meal_completions(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_completions_cooked_at ON meal_completions(cooked_at DESC);

ALTER TABLE meal_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read meal_completions" ON meal_completions FOR SELECT USING (true);
CREATE POLICY "Allow service role all meal_completions" ON meal_completions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon write meal_completions" ON meal_completions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update meal_completions" ON meal_completions FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete meal_completions" ON meal_completions FOR DELETE USING (true);

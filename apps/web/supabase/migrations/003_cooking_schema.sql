-- Cooking / Recipe Management Schema
-- This migration adds tables for recipe management, version history, meal planning, and Trader Joe's integration

-- ============================================
-- RECIPES TABLE
-- Main recipe storage
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'custom', -- 'trader_joes', 'custom', 'imported'
  source_url TEXT,
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  servings INTEGER,
  difficulty TEXT, -- 'easy', 'medium', 'hard'
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  instructions JSONB NOT NULL DEFAULT '[]', -- Array of RecipeStep objects
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for recipes
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_recipes_source ON recipes(source);
CREATE INDEX IF NOT EXISTS idx_recipes_is_favorite ON recipes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

-- ============================================
-- RECIPE INGREDIENTS TABLE
-- Ingredients for recipes with quantities
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2),
  unit TEXT, -- 'cup', 'tbsp', 'oz', 'lb', 'g', 'ml', etc.
  notes TEXT, -- e.g., "chopped", "diced", "optional"
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for recipe ingredients
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_order ON recipe_ingredients(recipe_id, order_index);

-- ============================================
-- RECIPE VERSIONS TABLE
-- Version history for recipes (simple approach)
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  commit_message TEXT,
  recipe_snapshot JSONB NOT NULL, -- Full recipe state at this version
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipe_id, version_number)
);

-- Indexes for recipe versions
CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe_id ON recipe_versions(recipe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_versions_created_at ON recipe_versions(created_at DESC);

-- Function to get next version number for a recipe
CREATE OR REPLACE FUNCTION get_next_version_number(p_recipe_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM recipe_versions
  WHERE recipe_id = p_recipe_id;
$$ LANGUAGE SQL;

-- ============================================
-- MEAL PLANS TABLE
-- Weekly meal planning
-- ============================================
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL, -- Monday of the week
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  meals JSONB NOT NULL DEFAULT '{}', -- { monday: { breakfast: recipe_id, lunch: recipe_id, dinner: recipe_id }, ... }
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year, week_number)
);

-- Indexes for meal plans
CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON meal_plans(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_year_week ON meal_plans(year, week_number);

-- ============================================
-- SHOPPING LISTS TABLE
-- Generated shopping lists from meal plans
-- ============================================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]', -- Array of ShoppingListItem objects
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for shopping lists
CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan_id ON shopping_lists(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_status ON shopping_lists(status);

-- ============================================
-- TRADER JOES RECIPES CACHE TABLE
-- Cache for scraped Trader Joe's recipes
-- ============================================
CREATE TABLE IF NOT EXISTS trader_joes_recipes_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tj_recipe_id TEXT UNIQUE,
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  category TEXT, -- 'dinner', 'breakfast', 'lunch', 'desserts', etc.
  image_url TEXT,
  recipe_data JSONB NOT NULL, -- Full scraped recipe data
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Trader Joe's cache
CREATE INDEX IF NOT EXISTS idx_tj_recipes_name ON trader_joes_recipes_cache(name);
CREATE INDEX IF NOT EXISTS idx_tj_recipes_category ON trader_joes_recipes_cache(category);
CREATE INDEX IF NOT EXISTS idx_tj_recipes_last_scraped ON trader_joes_recipes_cache(last_scraped_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get recipe with ingredients
CREATE OR REPLACE FUNCTION get_recipe_with_ingredients(p_recipe_id UUID)
RETURNS TABLE (
  recipe JSONB,
  ingredients JSONB
) AS $$
  SELECT 
    row_to_json(r.*)::JSONB as recipe,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ri.id,
          'name', ri.name,
          'amount', ri.amount,
          'unit', ri.unit,
          'notes', ri.notes,
          'order_index', ri.order_index
        ) ORDER BY ri.order_index
      ) FILTER (WHERE ri.id IS NOT NULL),
      '[]'::JSONB
    ) as ingredients
  FROM recipes r
  LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  WHERE r.id = p_recipe_id
  GROUP BY r.id;
$$ LANGUAGE SQL;

-- Function to get meal plan with recipes
CREATE OR REPLACE FUNCTION get_meal_plan_with_recipes(p_meal_plan_id UUID)
RETURNS TABLE (
  meal_plan JSONB,
  recipes JSONB
) AS $$
  WITH meal_plan_data AS (
    SELECT * FROM meal_plans WHERE id = p_meal_plan_id
  ),
  recipe_ids AS (
    SELECT DISTINCT recipe_id
    FROM meal_plan_data,
    LATERAL jsonb_each(meals) AS day_meals,
    LATERAL jsonb_each(day_meals.value) AS meal_type,
    LATERAL jsonb_array_elements_text(
      CASE 
        WHEN jsonb_typeof(meal_type.value) = 'array' 
        THEN meal_type.value 
        ELSE jsonb_build_array(meal_type.value::TEXT)
      END
    ) AS recipe_id
    WHERE recipe_id IS NOT NULL AND recipe_id != ''
  ),
  recipe_list AS (
    SELECT COALESCE(
      jsonb_agg(
        row_to_json(r.*)::JSONB
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'::JSONB
    ) as recipes
    FROM recipe_ids
    LEFT JOIN recipes r ON r.id::TEXT = recipe_ids.recipe_id
  )
  SELECT 
    row_to_json(mp.*)::JSONB as meal_plan,
    rl.recipes
  FROM meal_plan_data mp
  CROSS JOIN recipe_list rl;
$$ LANGUAGE SQL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_joes_recipes_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all tables
CREATE POLICY "Allow public read recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Allow public read recipe_ingredients" ON recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public read recipe_versions" ON recipe_versions FOR SELECT USING (true);
CREATE POLICY "Allow public read meal_plans" ON meal_plans FOR SELECT USING (true);
CREATE POLICY "Allow public read shopping_lists" ON shopping_lists FOR SELECT USING (true);
CREATE POLICY "Allow public read trader_joes_cache" ON trader_joes_recipes_cache FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all recipes" ON recipes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all recipe_ingredients" ON recipe_ingredients FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all recipe_versions" ON recipe_versions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all meal_plans" ON meal_plans FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all shopping_lists" ON shopping_lists FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all trader_joes_cache" ON trader_joes_recipes_cache FOR ALL USING (auth.role() = 'service_role');

-- Allow anon write access for production interactivity
CREATE POLICY "Allow anon write recipes" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update recipes" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete recipes" ON recipes FOR DELETE USING (true);

CREATE POLICY "Allow anon write recipe_ingredients" ON recipe_ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update recipe_ingredients" ON recipe_ingredients FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete recipe_ingredients" ON recipe_ingredients FOR DELETE USING (true);

CREATE POLICY "Allow anon write recipe_versions" ON recipe_versions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon write meal_plans" ON meal_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update meal_plans" ON meal_plans FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete meal_plans" ON meal_plans FOR DELETE USING (true);

CREATE POLICY "Allow anon write shopping_lists" ON shopping_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update shopping_lists" ON shopping_lists FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete shopping_lists" ON shopping_lists FOR DELETE USING (true);

CREATE POLICY "Allow anon write trader_joes_cache" ON trader_joes_recipes_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update trader_joes_cache" ON trader_joes_recipes_cache FOR UPDATE USING (true);

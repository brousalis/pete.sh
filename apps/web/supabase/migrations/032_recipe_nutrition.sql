-- Recipe Nutrition Enrichment
-- Migration 032: Ingredient nutrition lookup table, recipe nutrition extensions

-- ============================================
-- INGREDIENT NUTRITION (canonical per-ingredient lookup)
-- ============================================

CREATE TABLE IF NOT EXISTS ingredient_nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT UNIQUE NOT NULL,
  fdc_id INTEGER,
  fdc_data_type TEXT, -- 'Foundation', 'SR Legacy', 'Branded'
  calories_per_100g DECIMAL,
  protein_per_100g DECIMAL,
  fat_per_100g DECIMAL,
  carbs_per_100g DECIMAL,
  fiber_per_100g DECIMAL,
  sugar_per_100g DECIMAL,
  sodium_mg_per_100g DECIMAL,
  saturated_fat_per_100g DECIMAL,
  trans_fat_per_100g DECIMAL,
  cholesterol_mg_per_100g DECIMAL,
  density_g_per_cup DECIMAL,
  portion_weight_g DECIMAL,
  portion_description TEXT,
  data_source TEXT NOT NULL DEFAULT 'usda', -- 'usda', 'ai_estimate', 'manual'
  confidence DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredient_nutrition_fdc ON ingredient_nutrition(fdc_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_nutrition_source ON ingredient_nutrition(data_source);

-- ============================================
-- EXTEND RECIPE INGREDIENTS (link to nutrition lookup + cached weight)
-- ============================================

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS nutrition_id UUID REFERENCES ingredient_nutrition(id) ON DELETE SET NULL;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS weight_grams DECIMAL;

-- ============================================
-- EXTEND RECIPES (extended macros + categorization)
-- ============================================

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS fiber_g DECIMAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS sugar_g DECIMAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS sodium_mg DECIMAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS saturated_fat_g DECIMAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_category TEXT[] DEFAULT '{}';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_completeness DECIMAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recipes_nutrition_category ON recipes USING GIN (nutrition_category);

-- ============================================
-- UPDATED_AT TRIGGER for ingredient_nutrition
-- ============================================

CREATE OR REPLACE FUNCTION update_ingredient_nutrition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ingredient_nutrition_updated_at ON ingredient_nutrition;
CREATE TRIGGER trigger_ingredient_nutrition_updated_at
  BEFORE UPDATE ON ingredient_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION update_ingredient_nutrition_updated_at();

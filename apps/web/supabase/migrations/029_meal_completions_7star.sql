-- Update meal_completions rating constraint from 1-5 to 1-7 scale
ALTER TABLE meal_completions DROP CONSTRAINT IF EXISTS meal_completions_rating_check;
ALTER TABLE meal_completions ADD CONSTRAINT meal_completions_rating_check CHECK (rating >= 1 AND rating <= 7);

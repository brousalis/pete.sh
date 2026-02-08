-- Handwritten Recipe Transcriptions
-- Migration to add 5 recipes from handwritten notes

-- ============================================
-- RECIPE 1: Snap Pea Pasta
-- ============================================
DO $$
DECLARE
  recipe_id UUID;
BEGIN
  INSERT INTO recipes (
    name,
    description,
    source,
    prep_time,
    cook_time,
    servings,
    difficulty,
    tags,
    instructions
  ) VALUES (
    'Snap Pea Pasta',
    'A light, fresh pasta dish featuring sugar snap peas, garlic, shallots, and pecorino romano cheese with bright lemon flavor.',
    'custom',
    10,
    15,
    4,
    'easy',
    ARRAY['pasta', 'vegetarian', 'quick', 'spring'],
    '[
      {"step": 1, "text": "Cook pasta according to package directions. Reserve 1/4 cup pasta water before draining."},
      {"step": 2, "text": "Heat butter and olive oil in a large skillet over medium-high heat, stirring until butter melts."},
      {"step": 3, "text": "Add snap peas, garlic, and shallot. Sauté for 4-5 minutes until peas are tender-crisp."},
      {"step": 4, "text": "Turn off heat and add cooked pasta to the skillet. Toss with reserved pasta water."},
      {"step": 5, "text": "Add pecorino romano cheese, lemon zest, and lemon juice. Toss to combine and serve immediately."}
    ]'::JSONB
  ) RETURNING id INTO recipe_id;

  -- Ingredients for Snap Pea Pasta
  INSERT INTO recipe_ingredients (recipe_id, name, amount, unit, notes, order_index) VALUES
    (recipe_id, 'sugar snap peas', 1, 'lb', 'thinly sliced', 1),
    (recipe_id, 'butter', 2, 'tbsp', NULL, 2),
    (recipe_id, 'olive oil', 1, 'tsp', NULL, 3),
    (recipe_id, 'garlic', 4, 'cloves', 'finely chopped', 4),
    (recipe_id, 'shallot', 1, NULL, 'finely chopped', 5),
    (recipe_id, 'pecorino romano cheese', 0.5, 'cup', 'freshly grated', 6),
    (recipe_id, 'lemon', 1, NULL, 'zest and juice', 7),
    (recipe_id, 'pasta', 10, 'oz', NULL, 8);
END $$;

-- ============================================
-- RECIPE 2: Garlic Herb Chicken with Creamy Mash & Roasted Carrots
-- ============================================
DO $$
DECLARE
  recipe_id UUID;
BEGIN
  INSERT INTO recipes (
    name,
    description,
    source,
    prep_time,
    cook_time,
    servings,
    difficulty,
    tags,
    instructions
  ) VALUES (
    'Garlic Herb Chicken with Creamy Mash & Roasted Carrots',
    'Pan-seared chicken thighs with fresh herbs, served alongside creamy mashed potatoes and roasted carrots.',
    'custom',
    15,
    45,
    4,
    'medium',
    ARRAY['chicken', 'dinner', 'comfort food', 'herbs'],
    '[
      {"step": 1, "text": "Preheat oven to 400°F."},
      {"step": 2, "text": "Roast Carrots: Place carrot slices on a baking sheet, drizzle with 1 tsp olive oil to coat, and season with salt. Roast for 25-30 minutes, flipping halfway through."},
      {"step": 3, "text": "Mash: Add potatoes to cold salted water in a pot."},
      {"step": 4, "text": "Bring to a boil, then reduce to simmer for 15-20 minutes until fork-tender."},
      {"step": 5, "text": "Drain potatoes, add butter and milk, and mash until creamy. Season with salt and pepper."},
      {"step": 6, "text": "Chicken: Season chicken thighs with salt, pepper, thyme, and rosemary."},
      {"step": 7, "text": "Heat remaining olive oil in a skillet over medium heat."},
      {"step": 8, "text": "Cook chicken 5-6 minutes on each side until golden brown and crispy."},
      {"step": 9, "text": "Add minced garlic in the last minute of cooking."},
      {"step": 10, "text": "Serve chicken with mashed potatoes and roasted carrots."}
    ]'::JSONB
  ) RETURNING id INTO recipe_id;

  -- Ingredients for Garlic Herb Chicken
  INSERT INTO recipe_ingredients (recipe_id, name, amount, unit, notes, order_index) VALUES
    (recipe_id, 'carrots', 4, NULL, 'cut into pieces', 1),
    (recipe_id, 'garlic', 3, 'cloves', 'minced', 2),
    (recipe_id, 'potatoes', 4, NULL, 'large', 3),
    (recipe_id, 'butter', 5, 'tbsp', NULL, 4),
    (recipe_id, 'milk', 0.5, 'cup', NULL, 5),
    (recipe_id, 'olive oil', 3, 'tsp', NULL, 6),
    (recipe_id, 'fresh thyme', 1, 'tbsp', NULL, 7),
    (recipe_id, 'fresh rosemary', 1, 'tsp', NULL, 8),
    (recipe_id, 'chicken thighs', 4, NULL, 'bone-in, skin-on', 9),
    (recipe_id, 'salt', NULL, NULL, 'to taste', 10),
    (recipe_id, 'pepper', NULL, NULL, 'to taste', 11);
END $$;

-- ============================================
-- RECIPE 3: Italian Sausage & White Bean Soup
-- ============================================
DO $$
DECLARE
  recipe_id UUID;
BEGIN
  INSERT INTO recipes (
    name,
    description,
    source,
    prep_time,
    cook_time,
    servings,
    difficulty,
    tags,
    instructions
  ) VALUES (
    'Italian Sausage & White Bean Soup',
    'A hearty, comforting soup with Italian sausage, white beans, potatoes, and kale in a creamy broth.',
    'custom',
    20,
    45,
    6,
    'medium',
    ARRAY['soup', 'italian', 'sausage', 'comfort food', 'kale'],
    '[
      {"step": 1, "text": "Heat a large pot or Dutch oven over medium-high heat."},
      {"step": 2, "text": "Add Italian sausage and cook until browned and no longer pink, breaking it up as it cooks."},
      {"step": 3, "text": "Add onion, carrots, and celery. Sauté for 4-5 minutes until softened."},
      {"step": 4, "text": "Add garlic and cook for 30-60 seconds until fragrant."},
      {"step": 5, "text": "Add flour and stir to coat the vegetables."},
      {"step": 6, "text": "Add potatoes and chicken broth. Stir to combine."},
      {"step": 7, "text": "Bring to a boil, then reduce heat and simmer for 15 minutes until potatoes are tender."},
      {"step": 8, "text": "Add white beans, kale, and heavy cream. Stir to combine."},
      {"step": 9, "text": "Season with poultry seasoning and Italian seasoning."},
      {"step": 10, "text": "Simmer until kale is wilted and soup has thickened."},
      {"step": 11, "text": "Adjust seasoning with red wine vinegar, salt, and pepper to taste."},
      {"step": 12, "text": "Serve hot, garnished with fresh parsley."}
    ]'::JSONB
  ) RETURNING id INTO recipe_id;

  -- Ingredients for Italian Sausage & White Bean Soup
  INSERT INTO recipe_ingredients (recipe_id, name, amount, unit, notes, order_index) VALUES
    (recipe_id, 'Italian sausage', 1, 'lb', NULL, 1),
    (recipe_id, 'sweet onion', 1, NULL, 'small, diced', 2),
    (recipe_id, 'carrots', 3, NULL, 'peeled and diced', 3),
    (recipe_id, 'celery', 3, 'stalks', 'diced', 4),
    (recipe_id, 'garlic', 4, 'cloves', 'minced', 5),
    (recipe_id, 'poultry seasoning', 1, 'tsp', NULL, 6),
    (recipe_id, 'Italian seasoning', 1, 'tsp', NULL, 7),
    (recipe_id, 'salt', 0.5, 'tsp', NULL, 8),
    (recipe_id, 'pepper', 0.5, 'tsp', NULL, 9),
    (recipe_id, 'flour', 3, 'tbsp', NULL, 10),
    (recipe_id, 'gold potatoes', 4, 'cups', 'cubed', 11),
    (recipe_id, 'chicken broth', 6, 'cups', NULL, 12),
    (recipe_id, 'white beans', 2, 'cans', 'drained and rinsed', 13),
    (recipe_id, 'heavy cream', 1, 'cup', NULL, 14),
    (recipe_id, 'kale', 1, 'bunch', NULL, 15),
    (recipe_id, 'red wine vinegar', 2, 'tbsp', NULL, 16),
    (recipe_id, 'fresh parsley', NULL, NULL, 'for garnish', 17);
END $$;

-- ============================================
-- RECIPE 4: Rice Krispy Treats
-- ============================================
DO $$
DECLARE
  recipe_id UUID;
BEGIN
  INSERT INTO recipes (
    name,
    description,
    source,
    prep_time,
    cook_time,
    servings,
    difficulty,
    tags,
    instructions
  ) VALUES (
    'Rice Krispy Treats',
    'Classic Rice Krispy Treats made extra gooey with extra marshmallows and enhanced with vanilla and salt.',
    'custom',
    10,
    10,
    16,
    'easy',
    ARRAY['dessert', 'snack', 'no-bake', 'kid-friendly'],
    '[
      {"step": 1, "text": "Line a 9x13 inch pan with parchment paper."},
      {"step": 2, "text": "Melt butter in a very large saucepan over low heat."},
      {"step": 3, "text": "Add 9 cups of mini marshmallows and stir until completely melted. Remove from heat."},
      {"step": 4, "text": "Add salt, vanilla, and marshmallow fluff. Mix until completely incorporated."},
      {"step": 5, "text": "Stir in Rice Krispy cereal and remaining 5 cups of marshmallows until evenly coated."},
      {"step": 6, "text": "Pour mixture into prepared pan and distribute evenly."},
      {"step": 7, "text": "Spray hands with cooking spray and gently pat/press mixture down."},
      {"step": 8, "text": "Allow to cool, then slice and enjoy."}
    ]'::JSONB
  ) RETURNING id INTO recipe_id;

  -- Ingredients for Rice Krispy Treats
  INSERT INTO recipe_ingredients (recipe_id, name, amount, unit, notes, order_index) VALUES
    (recipe_id, 'butter', 10, 'tbsp', NULL, 1),
    (recipe_id, 'vanilla extract', 1, 'tsp', NULL, 2),
    (recipe_id, 'salt', 0.5, 'tsp', NULL, 3),
    (recipe_id, 'Rice Krispy cereal', 7, 'oz', 'or 13 oz box', 4),
    (recipe_id, 'mini marshmallows', 20, 'oz', '2 bags (10 oz each)', 5);
END $$;

-- ============================================
-- RECIPE 5: White Chicken Chili
-- ============================================
DO $$
DECLARE
  recipe_id UUID;
BEGIN
  INSERT INTO recipes (
    name,
    description,
    source,
    prep_time,
    cook_time,
    servings,
    difficulty,
    tags,
    instructions
  ) VALUES (
    'White Chicken Chili',
    'A lighter take on chili featuring tender chicken, white beans, corn, and warming spices.',
    'custom',
    15,
    35,
    6,
    'easy',
    ARRAY['chili', 'chicken', 'soup', 'tex-mex', 'comfort food'],
    '[
      {"step": 1, "text": "Heat olive oil in a large pot over medium-high heat."},
      {"step": 2, "text": "Add chicken and cook until browned, 5-7 minutes. Remove and shred or cube."},
      {"step": 3, "text": "Add onion to the pot and cook until softened, 5-7 minutes."},
      {"step": 4, "text": "Add garlic and cook for 1 minute until fragrant."},
      {"step": 5, "text": "Stir in white beans, chicken broth, water, corn, cumin, chili powder, and cayenne pepper."},
      {"step": 6, "text": "Return chicken to the pot."},
      {"step": 7, "text": "Bring chili to a simmer, then reduce heat to low. Cover and cook for 20-25 minutes, stirring occasionally."},
      {"step": 8, "text": "Season with salt and pepper to taste."},
      {"step": 9, "text": "Serve hot with optional toppings like sour cream, cheese, or cilantro."}
    ]'::JSONB
  ) RETURNING id INTO recipe_id;

  -- Ingredients for White Chicken Chili
  INSERT INTO recipe_ingredients (recipe_id, name, amount, unit, notes, order_index) VALUES
    (recipe_id, 'olive oil', 1, 'tbsp', NULL, 1),
    (recipe_id, 'chicken', 1, 'lb', 'shredded or cubed', 2),
    (recipe_id, 'white beans', 2, 'cans', 'drained', 3),
    (recipe_id, 'onion', 1, NULL, 'large, chopped', 4),
    (recipe_id, 'garlic', 2, 'cloves', 'minced', 5),
    (recipe_id, 'corn', 15, 'oz', NULL, 6),
    (recipe_id, 'water', 1, 'cup', NULL, 7),
    (recipe_id, 'chicken broth', 14.5, 'oz', 'or 4 cups', 8),
    (recipe_id, 'cumin', 2, 'tsp', NULL, 9),
    (recipe_id, 'cayenne pepper', 0.25, 'tsp', 'optional', 10),
    (recipe_id, 'chili powder', 0.25, 'tsp', NULL, 11),
    (recipe_id, 'salt', NULL, NULL, 'to taste', 12),
    (recipe_id, 'pepper', NULL, NULL, 'to taste', 13);
END $$;

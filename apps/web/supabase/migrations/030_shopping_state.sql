-- Move shopping interaction state from localStorage to Supabase
-- Adds JSONB columns for checked items, hidden items, manual items, and trip history

ALTER TABLE shopping_lists
  ADD COLUMN IF NOT EXISTS checked_items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS hidden_items  JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS manual_items  JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS trips         JSONB NOT NULL DEFAULT '[]';

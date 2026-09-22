-- ============================================
-- PT interactive player: session sync + demo videos
-- ============================================

-- Demo clip metadata on each exercise (curated YouTube loops).
ALTER TABLE coach_pt_exercise
  ADD COLUMN IF NOT EXISTS demo_youtube_id TEXT,
  ADD COLUMN IF NOT EXISTS demo_start_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demo_loop_seconds INTEGER NOT NULL DEFAULT 30;

-- Live player session for phone-remote ↔ PC-display sync.
CREATE TABLE IF NOT EXISTS coach_pt_player_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES coach_pt_protocol(id) ON DELETE CASCADE,
  protocol_slug TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Chicago')::date,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours')
);

CREATE INDEX IF NOT EXISTS coach_pt_player_session_active_idx
  ON coach_pt_player_session (protocol_slug, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS coach_pt_player_session_updated_idx
  ON coach_pt_player_session (updated_at DESC);

ALTER TABLE coach_pt_player_session ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON coach_pt_player_session;
CREATE POLICY "service_role_all" ON coach_pt_player_session
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON coach_pt_player_session FROM anon, authenticated;
GRANT ALL ON coach_pt_player_session TO service_role;

DROP TRIGGER IF EXISTS coach_pt_player_session_touch ON coach_pt_player_session;
CREATE TRIGGER coach_pt_player_session_touch
  BEFORE UPDATE ON coach_pt_player_session
  FOR EACH ROW
  EXECUTE FUNCTION coach_touch_updated_at();

-- Curated YouTube demo pairings. Review before relying on form cues.
-- Sources noted in comments; start seconds aim at the demo segment.
UPDATE coach_pt_exercise SET
  demo_youtube_id = 'FoftXmw-f68',
  demo_start_seconds = 0,
  demo_loop_seconds = 30
WHERE slug = 'quad-sets';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'y-wV6QK_E_4',
  demo_start_seconds = 15,
  demo_loop_seconds = 30
WHERE slug = 'wall-sit-gtb';

UPDATE coach_pt_exercise SET
  demo_youtube_id = '1rGvg9vYq0Y',
  demo_start_seconds = 20,
  demo_loop_seconds = 30
WHERE slug = 'slr-band';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'Zg7uoc1ITbc',
  demo_start_seconds = 10,
  demo_loop_seconds = 25
WHERE slug = 'iso-wall-runner';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'rdO4kLlpeYU',
  demo_start_seconds = 30,
  demo_loop_seconds = 30
WHERE slug = 'supine-nerve-glides';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'wPM4aRJMRMM',
  demo_start_seconds = 20,
  demo_loop_seconds = 30
WHERE slug = 'bridge-abduction-march';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'TaDDhukV7Kw',
  demo_start_seconds = 15,
  demo_loop_seconds = 30
WHERE slug = 'modified-clamshells';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'j9sKZ5-m7Sk',
  demo_start_seconds = 10,
  demo_loop_seconds = 30
WHERE slug = 'hip-abd-sidelying';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'E3PvJqKqG7g',
  demo_start_seconds = 20,
  demo_loop_seconds = 30
WHERE slug = 'lateral-tap-down';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'g6qbq4Pq9e0',
  demo_start_seconds = 45,
  demo_loop_seconds = 30
WHERE slug = 'pnf-hamstring';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'y-wV6QK_E_4',
  demo_start_seconds = 15,
  demo_loop_seconds = 30
WHERE slug = 'vmo-wall-sit';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'hQgFixeXdZo',
  demo_start_seconds = 30,
  demo_loop_seconds = 30
WHERE slug = 'db-rdl';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'YMmgqO8Jo-k',
  demo_start_seconds = 15,
  demo_loop_seconds = 30
WHERE slug = 'heavy-calf-raise';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'K2pLAiXaWG0',
  demo_start_seconds = 40,
  demo_loop_seconds = 30
WHERE slug = 'copenhagen-plank';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'VWnY0vE5X5g',
  demo_start_seconds = 20,
  demo_loop_seconds = 30
WHERE slug = 'tke';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'nDAnTs0WRks',
  demo_start_seconds = 10,
  demo_loop_seconds = 25
WHERE slug = 'pogo-hops';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'm_Ydw6ZSBM8',
  demo_start_seconds = 15,
  demo_loop_seconds = 30
WHERE slug = 'tibialis-raise';

UPDATE coach_pt_exercise SET
  demo_youtube_id = 'L_xrDAtykMI',
  demo_start_seconds = 20,
  demo_loop_seconds = 30
WHERE slug = 'worlds-greatest-stretch';

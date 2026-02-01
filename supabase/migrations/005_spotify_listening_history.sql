-- Spotify Listening History Schema
-- Stores a persistent history of tracks played on Spotify

-- ============================================
-- SPOTIFY LISTENING HISTORY TABLE
-- Stores individual track plays with deduplication
-- ============================================
CREATE TABLE IF NOT EXISTS spotify_listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Track identification
  track_id TEXT NOT NULL,
  track_uri TEXT NOT NULL,
  -- Track details (denormalized for easy display)
  track_name TEXT NOT NULL,
  track_artists TEXT NOT NULL, -- Comma-separated artist names
  track_artist_ids TEXT, -- Comma-separated artist IDs
  album_name TEXT NOT NULL,
  album_id TEXT,
  album_image_url TEXT,
  duration_ms INTEGER NOT NULL,
  -- Context (what playlist/album was playing)
  context_type TEXT, -- 'album' | 'artist' | 'playlist' | 'show' | null
  context_uri TEXT,
  -- Play metadata
  played_at TIMESTAMPTZ NOT NULL, -- When the track was played (from Spotify API)
  -- Audio features (cached for analytics)
  tempo REAL,
  energy REAL,
  danceability REAL,
  valence REAL,
  -- Sync metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique constraint to prevent duplicate entries
  UNIQUE(track_id, played_at)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_spotify_history_played_at ON spotify_listening_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotify_history_track ON spotify_listening_history(track_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotify_history_artist ON spotify_listening_history(track_artists);
CREATE INDEX IF NOT EXISTS idx_spotify_history_synced ON spotify_listening_history(synced_at DESC);

-- ============================================
-- SPOTIFY SYNC CURSOR TABLE
-- Tracks the last sync position for incremental history fetching
-- ============================================
CREATE TABLE IF NOT EXISTS spotify_sync_cursor (
  id TEXT PRIMARY KEY DEFAULT 'default',
  last_played_at TIMESTAMPTZ, -- Most recent played_at we've synced
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_tracks_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default cursor if not exists
INSERT INTO spotify_sync_cursor (id, last_played_at, total_tracks_synced)
VALUES ('default', NULL, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get listening history with pagination
CREATE OR REPLACE FUNCTION get_spotify_listening_history(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  track_id TEXT,
  track_uri TEXT,
  track_name TEXT,
  track_artists TEXT,
  album_name TEXT,
  album_image_url TEXT,
  duration_ms INTEGER,
  context_type TEXT,
  played_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.track_id,
    h.track_uri,
    h.track_name,
    h.track_artists,
    h.album_name,
    h.album_image_url,
    h.duration_ms,
    h.context_type,
    h.played_at
  FROM spotify_listening_history h
  WHERE (p_start_date IS NULL OR h.played_at >= p_start_date)
    AND (p_end_date IS NULL OR h.played_at <= p_end_date)
  ORDER BY h.played_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get listening stats
CREATE OR REPLACE FUNCTION get_spotify_listening_stats(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_tracks BIGINT,
  unique_tracks BIGINT,
  unique_artists BIGINT,
  total_listening_time_ms BIGINT,
  top_track TEXT,
  top_track_count BIGINT,
  top_artist TEXT,
  top_artist_count BIGINT
) AS $$
DECLARE
  since_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT track_id) as unique_t,
      COUNT(DISTINCT track_artists) as unique_a,
      SUM(duration_ms) as total_time
    FROM spotify_listening_history
    WHERE played_at >= since_date
  ),
  top_track_cte AS (
    SELECT track_name, COUNT(*) as cnt
    FROM spotify_listening_history
    WHERE played_at >= since_date
    GROUP BY track_name
    ORDER BY cnt DESC
    LIMIT 1
  ),
  top_artist_cte AS (
    SELECT track_artists, COUNT(*) as cnt
    FROM spotify_listening_history
    WHERE played_at >= since_date
    GROUP BY track_artists
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT
    s.total,
    s.unique_t,
    s.unique_a,
    s.total_time,
    tt.track_name,
    tt.cnt,
    ta.track_artists,
    ta.cnt
  FROM stats s
  LEFT JOIN top_track_cte tt ON true
  LEFT JOIN top_artist_cte ta ON true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE spotify_listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_sync_cursor ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON spotify_listening_history FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON spotify_sync_cursor FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON spotify_listening_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON spotify_sync_cursor FOR ALL USING (auth.role() = 'service_role');

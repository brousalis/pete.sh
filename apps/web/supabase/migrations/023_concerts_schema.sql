-- ============================================
-- CONCERTS SCHEMA
-- Track concerts, shows, and music events
-- with photos, setlists, and integrations
-- ============================================

-- Main concerts table
CREATE TABLE IF NOT EXISTS concerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Artist info
  artist_name TEXT NOT NULL,
  supporting_artists TEXT[] DEFAULT '{}',
  tour_name TEXT,
  musicbrainz_id TEXT,
  spotify_artist_id TEXT,

  -- Venue info
  venue_name TEXT NOT NULL,
  venue_address TEXT,
  venue_lat REAL,
  venue_lng REAL,
  venue_place_id TEXT,

  -- Event timing
  event_date DATE NOT NULL,
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,

  -- External links
  calendar_event_id TEXT UNIQUE,
  setlist_fm_id TEXT,
  setlist_data JSONB,

  -- Media
  cover_image TEXT,

  -- Personal
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  companions TEXT[] DEFAULT '{}',
  ticket_cost DECIMAL(10, 2),

  -- Status
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'attended', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Concert photos table (separate for per-photo metadata)
CREATE TABLE IF NOT EXISTS concert_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concert_id UUID NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,

  -- Storage
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,

  -- EXIF metadata
  capture_time TIMESTAMPTZ,
  capture_lat REAL,
  capture_lng REAL,

  -- User metadata
  caption TEXT,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  uploaded_via TEXT NOT NULL DEFAULT 'web' CHECK (uploaded_via IN ('web', 'ios_shortcut', 'api')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Concerts indexes
CREATE INDEX IF NOT EXISTS idx_concerts_event_date ON concerts(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_concerts_artist_name ON concerts(artist_name);
CREATE INDEX IF NOT EXISTS idx_concerts_status ON concerts(status);
CREATE INDEX IF NOT EXISTS idx_concerts_venue_name ON concerts(venue_name);
CREATE INDEX IF NOT EXISTS idx_concerts_tags ON concerts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_concerts_created_at ON concerts(created_at DESC);

-- Concert photos indexes
CREATE INDEX IF NOT EXISTS idx_concert_photos_concert_id ON concert_photos(concert_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_concert_photos_capture_time ON concert_photos(concert_id, capture_time);
CREATE INDEX IF NOT EXISTS idx_concert_photos_is_cover ON concert_photos(concert_id) WHERE is_cover = TRUE;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_concerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_concerts_updated_at ON concerts;
CREATE TRIGGER trigger_concerts_updated_at
  BEFORE UPDATE ON concerts
  FOR EACH ROW
  EXECUTE FUNCTION update_concerts_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get concert statistics
CREATE OR REPLACE FUNCTION get_concert_stats(
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_concerts BIGINT,
  total_attended BIGINT,
  total_upcoming BIGINT,
  unique_artists BIGINT,
  unique_venues BIGINT,
  total_spent DECIMAL,
  avg_rating DECIMAL,
  concerts_this_year BIGINT,
  top_venue TEXT,
  top_venue_count BIGINT,
  top_artist TEXT,
  top_artist_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT *
    FROM concerts c
    WHERE (p_year IS NULL OR EXTRACT(YEAR FROM c.event_date) = p_year)
  ),
  stats AS (
    SELECT
      COUNT(*)::BIGINT AS total,
      COUNT(*) FILTER (WHERE f.status = 'attended')::BIGINT AS attended,
      COUNT(*) FILTER (WHERE f.status = 'upcoming')::BIGINT AS upcoming,
      COUNT(DISTINCT f.artist_name)::BIGINT AS artists,
      COUNT(DISTINCT f.venue_name)::BIGINT AS venues,
      COALESCE(SUM(f.ticket_cost), 0)::DECIMAL AS spent,
      COALESCE(AVG(f.rating), 0)::DECIMAL AS avg_rat
    FROM filtered f
  ),
  year_stats AS (
    SELECT COUNT(*)::BIGINT AS this_year
    FROM concerts
    WHERE EXTRACT(YEAR FROM event_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND status != 'cancelled'
  ),
  top_venue_cte AS (
    SELECT f.venue_name AS vname, COUNT(*)::BIGINT AS cnt
    FROM filtered f
    WHERE f.status = 'attended'
    GROUP BY f.venue_name
    ORDER BY cnt DESC
    LIMIT 1
  ),
  top_artist_cte AS (
    SELECT f.artist_name AS aname, COUNT(*)::BIGINT AS cnt
    FROM filtered f
    WHERE f.status = 'attended'
    GROUP BY f.artist_name
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT
    s.total,
    s.attended,
    s.upcoming,
    s.artists,
    s.venues,
    s.spent,
    s.avg_rat,
    ys.this_year,
    tv.vname,
    tv.cnt,
    ta.aname,
    ta.cnt
  FROM stats s
  CROSS JOIN year_stats ys
  LEFT JOIN top_venue_cte tv ON TRUE
  LEFT JOIN top_artist_cte ta ON TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get concert streak (consecutive months with concerts)
CREATE OR REPLACE FUNCTION get_concert_streak()
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER
) AS $$
DECLARE
  curr_streak INTEGER := 0;
  max_streak INTEGER := 0;
  prev_month DATE := NULL;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT date_trunc('month', event_date)::DATE AS concert_month
    FROM concerts
    WHERE status = 'attended'
    ORDER BY concert_month DESC
  LOOP
    IF prev_month IS NULL THEN
      -- Check if the most recent concert month is current or last month
      IF rec.concert_month >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' THEN
        curr_streak := 1;
      ELSE
        curr_streak := 0;
      END IF;
      max_streak := curr_streak;
    ELSE
      IF prev_month - rec.concert_month <= INTERVAL '31 days'
         AND EXTRACT(MONTH FROM age(prev_month, rec.concert_month)) <= 1 THEN
        curr_streak := curr_streak + 1;
      ELSE
        IF curr_streak > max_streak THEN
          max_streak := curr_streak;
        END IF;
        curr_streak := 0;
      END IF;
    END IF;
    prev_month := rec.concert_month;
  END LOOP;

  IF curr_streak > max_streak THEN
    max_streak := curr_streak;
  END IF;

  RETURN QUERY SELECT curr_streak, max_streak;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE concerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concert_photos ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read concerts" ON concerts FOR SELECT USING (true);
CREATE POLICY "Allow public read concert_photos" ON concert_photos FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Allow service role all concerts" ON concerts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all concert_photos" ON concert_photos FOR ALL USING (auth.role() = 'service_role');

-- Anon write access (for web app)
CREATE POLICY "Allow anon insert concerts" ON concerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update concerts" ON concerts FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete concerts" ON concerts FOR DELETE USING (true);

CREATE POLICY "Allow anon insert concert_photos" ON concert_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update concert_photos" ON concert_photos FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete concert_photos" ON concert_photos FOR DELETE USING (true);

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

-- Create the concert-photos bucket (run in Supabase SQL Editor or Dashboard):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('concert-photos', 'concert-photos', true);

-- Storage bucket policies:
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'concert-photos');
-- CREATE POLICY "Service role can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'concert-photos' AND auth.role() = 'service_role');
-- CREATE POLICY "Service role can delete" ON storage.objects FOR DELETE USING (bucket_id = 'concert-photos' AND auth.role() = 'service_role');
-- CREATE POLICY "Anon can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'concert-photos');

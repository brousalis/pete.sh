-- Petehome Supabase Schema
-- This migration creates all tables needed for the hybrid local/production mode

-- ============================================
-- SPOTIFY STATE TABLE
-- Stores the current Spotify playback state
-- ============================================
CREATE TABLE IF NOT EXISTS spotify_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playback_state JSONB, -- SpotifyPlaybackState
  devices JSONB, -- SpotifyDevice[]
  user_info JSONB, -- SpotifyUser (optional)
  is_playing BOOLEAN DEFAULT false,
  current_track_name TEXT,
  current_track_artist TEXT,
  current_track_album TEXT,
  current_track_image_url TEXT,
  progress_ms INTEGER,
  duration_ms INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups of latest state
CREATE INDEX IF NOT EXISTS idx_spotify_state_recorded_at ON spotify_state(recorded_at DESC);

-- ============================================
-- SONOS STATE TABLE
-- Stores state for each Sonos player
-- ============================================
CREATE TABLE IF NOT EXISTS sonos_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  player_name TEXT,
  room_name TEXT,
  state JSONB, -- SonosState
  current_track JSONB, -- SonosTrack
  playback_state TEXT, -- 'PLAYING' | 'PAUSED' | 'STOPPED'
  volume INTEGER,
  is_muted BOOLEAN DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sonos_state_player_recorded ON sonos_state(player_id, recorded_at DESC);

-- ============================================
-- HUE LIGHTS TABLE
-- Stores individual light states
-- ============================================
CREATE TABLE IF NOT EXISTS hue_lights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  light_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  model_id TEXT,
  product_name TEXT,
  state JSONB NOT NULL, -- HueLight.state
  is_on BOOLEAN DEFAULT false,
  brightness INTEGER,
  is_reachable BOOLEAN DEFAULT true,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hue_lights_light_recorded ON hue_lights(light_id, recorded_at DESC);

-- ============================================
-- HUE ZONES TABLE
-- Stores zone/room aggregate states
-- ============================================
CREATE TABLE IF NOT EXISTS hue_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT, -- 'Room' | 'Zone' | 'Entertainment'
  class TEXT,
  lights TEXT[], -- Array of light IDs
  state JSONB NOT NULL, -- HueZone.state
  action JSONB, -- HueZone.action
  any_on BOOLEAN DEFAULT false,
  all_on BOOLEAN DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hue_zones_zone_recorded ON hue_zones(zone_id, recorded_at DESC);

-- ============================================
-- HUE SCENES TABLE
-- Stores scene definitions
-- ============================================
CREATE TABLE IF NOT EXISTS hue_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  zone_id TEXT,
  zone_name TEXT,
  lights TEXT[], -- Array of light IDs
  owner TEXT,
  recycle BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hue_scenes_scene_recorded ON hue_scenes(scene_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_hue_scenes_zone ON hue_scenes(zone_id);

-- ============================================
-- HUE STATUS TABLE
-- Stores aggregate light status
-- ============================================
CREATE TABLE IF NOT EXISTS hue_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_lights INTEGER NOT NULL DEFAULT 0,
  lights_on INTEGER NOT NULL DEFAULT 0,
  any_on BOOLEAN DEFAULT false,
  all_on BOOLEAN DEFAULT false,
  average_brightness INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hue_status_recorded ON hue_status(recorded_at DESC);

-- ============================================
-- FITNESS ROUTINES TABLE
-- Stores the main routine configuration (replaces JSON file)
-- ============================================
CREATE TABLE IF NOT EXISTS fitness_routines (
  id TEXT PRIMARY KEY, -- e.g., 'climber-physique'
  name TEXT NOT NULL,
  user_profile JSONB NOT NULL, -- UserProfile
  injury_protocol JSONB, -- InjuryProtocol
  schedule JSONB NOT NULL, -- WeeklySchedule
  daily_routines JSONB NOT NULL, -- { morning: DailyRoutine, night: DailyRoutine }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FITNESS WEEKS TABLE
-- Stores weekly progress data
-- ============================================
CREATE TABLE IF NOT EXISTS fitness_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id TEXT NOT NULL REFERENCES fitness_routines(id),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  days JSONB NOT NULL DEFAULT '{}', -- Record of day data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(routine_id, week_number, year)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fitness_weeks_routine_week ON fitness_weeks(routine_id, year, week_number);

-- ============================================
-- FITNESS PROGRESS TABLE
-- Stores daily progress entries
-- ============================================
CREATE TABLE IF NOT EXISTS fitness_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id TEXT NOT NULL REFERENCES fitness_routines(id),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  day_of_week TEXT NOT NULL, -- 'monday', 'tuesday', etc.
  workout_completed BOOLEAN DEFAULT false,
  workout_completed_at TIMESTAMPTZ,
  workout_exercises_completed TEXT[],
  morning_routine_completed BOOLEAN DEFAULT false,
  morning_routine_completed_at TIMESTAMPTZ,
  night_routine_completed BOOLEAN DEFAULT false,
  night_routine_completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(routine_id, year, week_number, day_of_week)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fitness_progress_lookup ON fitness_progress(routine_id, year, week_number, day_of_week);

-- ============================================
-- CTA HISTORY TABLE
-- Stores CTA arrival predictions for historical analysis
-- ============================================
CREATE TABLE IF NOT EXISTS cta_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_type TEXT NOT NULL, -- 'bus' | 'train'
  route TEXT NOT NULL, -- e.g., '76', 'Brn'
  stop_id TEXT,
  station_id TEXT,
  direction TEXT,
  predictions JSONB, -- Array of predictions
  error_message TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cta_history_route_recorded ON cta_history(route, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_history_recorded ON cta_history(recorded_at DESC);

-- ============================================
-- CALENDAR EVENTS TABLE
-- Stores calendar event snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL, -- Google Calendar event ID
  calendar_id TEXT DEFAULT 'primary',
  summary TEXT,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  start_date DATE, -- For all-day events
  end_date DATE, -- For all-day events
  is_all_day BOOLEAN DEFAULT false,
  status TEXT, -- 'confirmed' | 'tentative' | 'cancelled'
  html_link TEXT,
  attendees JSONB,
  recurrence TEXT[],
  event_data JSONB NOT NULL, -- Full CalendarEvent
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_recorded ON calendar_events(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_id ON calendar_events(event_id, recorded_at DESC);

-- ============================================
-- SYNC LOG TABLE
-- Tracks when data was last synced
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL, -- 'spotify', 'sonos', 'hue', 'cta', 'calendar', 'fitness'
  status TEXT NOT NULL, -- 'success' | 'error'
  error_message TEXT,
  records_synced INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sync_log_service_synced ON sync_log(service, synced_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get the latest state for a service
CREATE OR REPLACE FUNCTION get_latest_spotify_state()
RETURNS spotify_state AS $$
  SELECT * FROM spotify_state ORDER BY recorded_at DESC LIMIT 1;
$$ LANGUAGE SQL;

-- Function to get the latest Sonos state for a player
CREATE OR REPLACE FUNCTION get_latest_sonos_state(p_player_id TEXT)
RETURNS sonos_state AS $$
  SELECT * FROM sonos_state WHERE player_id = p_player_id ORDER BY recorded_at DESC LIMIT 1;
$$ LANGUAGE SQL;

-- Function to get the latest Hue status
CREATE OR REPLACE FUNCTION get_latest_hue_status()
RETURNS hue_status AS $$
  SELECT * FROM hue_status ORDER BY recorded_at DESC LIMIT 1;
$$ LANGUAGE SQL;

-- Function to get latest lights state
CREATE OR REPLACE FUNCTION get_latest_hue_lights()
RETURNS SETOF hue_lights AS $$
  SELECT DISTINCT ON (light_id) * 
  FROM hue_lights 
  ORDER BY light_id, recorded_at DESC;
$$ LANGUAGE SQL;

-- Function to get latest zones state
CREATE OR REPLACE FUNCTION get_latest_hue_zones()
RETURNS SETOF hue_zones AS $$
  SELECT DISTINCT ON (zone_id) * 
  FROM hue_zones 
  ORDER BY zone_id, recorded_at DESC;
$$ LANGUAGE SQL;

-- Function to get latest scenes
CREATE OR REPLACE FUNCTION get_latest_hue_scenes()
RETURNS SETOF hue_scenes AS $$
  SELECT DISTINCT ON (scene_id) * 
  FROM hue_scenes 
  ORDER BY scene_id, recorded_at DESC;
$$ LANGUAGE SQL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for production security
-- ============================================

-- For now, we'll use service role key for writes and anon key for reads
-- This allows the public to read but only authenticated service can write

ALTER TABLE spotify_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE sonos_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE hue_lights ENABLE ROW LEVEL SECURITY;
ALTER TABLE hue_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE hue_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hue_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cta_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all tables
CREATE POLICY "Allow public read" ON spotify_state FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sonos_state FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON hue_lights FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON hue_zones FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON hue_scenes FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON hue_status FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON fitness_routines FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON fitness_weeks FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON fitness_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON cta_history FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sync_log FOR SELECT USING (true);

-- Allow service role full access (for local mode writes)
CREATE POLICY "Allow service role all" ON spotify_state FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON sonos_state FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON hue_lights FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON hue_zones FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON hue_scenes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON hue_status FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON fitness_routines FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON fitness_weeks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON fitness_progress FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON cta_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON calendar_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role all" ON sync_log FOR ALL USING (auth.role() = 'service_role');

-- Also allow anon key to write to fitness tables (for production mode interactivity)
CREATE POLICY "Allow anon write fitness" ON fitness_routines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update fitness" ON fitness_routines FOR UPDATE USING (true);
CREATE POLICY "Allow anon write fitness_weeks" ON fitness_weeks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update fitness_weeks" ON fitness_weeks FOR UPDATE USING (true);
CREATE POLICY "Allow anon write fitness_progress" ON fitness_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update fitness_progress" ON fitness_progress FOR UPDATE USING (true);

-- Data Retention Schema
-- This migration adds cleanup functions for time-series data to prevent unbounded growth
-- 
-- Retention policies:
-- - CTA history: 7 days
-- - Hue lights: 7 days
-- - Hue zones: 7 days
-- - Hue status: 7 days
-- - Hue scenes: 30 days (static config, rarely changes)
-- - Spotify state: 7 days
-- - Sonos state: 7 days
-- - Calendar events: 30 days
-- - Sync log: 7 days
-- - Apple Health samples: 90 days (detailed), summaries kept indefinitely

-- ============================================
-- CLEANUP FUNCTION: CTA History
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_cta_history(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cta_history 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Hue Lights
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_hue_lights(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hue_lights 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Hue Zones
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_hue_zones(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hue_zones 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Hue Status
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_hue_status(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hue_status 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Hue Scenes
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_hue_scenes(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hue_scenes 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Spotify State
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_spotify_state(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM spotify_state 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Sonos State
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_sonos_state(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sonos_state 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Calendar Events
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_calendar_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM calendar_events 
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Sync Log
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_sync_log(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sync_log 
  WHERE synced_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Apple Health HR Samples (detailed workout data)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_apple_health_hr_samples(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_hr_samples 
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Apple Health Cadence Samples
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_apple_health_cadence_samples(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_cadence_samples 
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTION: Apple Health Pace Samples
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_apple_health_pace_samples(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_pace_samples 
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MASTER CLEANUP FUNCTION
-- Calls all individual cleanup functions with default retention periods
-- Returns a summary of deleted records
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_all_old_records()
RETURNS TABLE (
  table_name TEXT,
  deleted_count INTEGER,
  retention_days INTEGER
) AS $$
BEGIN
  -- CTA History (7 days)
  RETURN QUERY SELECT 'cta_history'::TEXT, cleanup_cta_history(7), 7;
  
  -- Hue data (7 days for state, 30 days for scenes)
  RETURN QUERY SELECT 'hue_lights'::TEXT, cleanup_hue_lights(7), 7;
  RETURN QUERY SELECT 'hue_zones'::TEXT, cleanup_hue_zones(7), 7;
  RETURN QUERY SELECT 'hue_status'::TEXT, cleanup_hue_status(7), 7;
  RETURN QUERY SELECT 'hue_scenes'::TEXT, cleanup_hue_scenes(30), 30;
  
  -- Spotify state (7 days)
  RETURN QUERY SELECT 'spotify_state'::TEXT, cleanup_spotify_state(7), 7;
  
  -- Sonos state (7 days)
  RETURN QUERY SELECT 'sonos_state'::TEXT, cleanup_sonos_state(7), 7;
  
  -- Calendar events (30 days)
  RETURN QUERY SELECT 'calendar_events'::TEXT, cleanup_calendar_events(30), 30;
  
  -- Sync log (7 days)
  RETURN QUERY SELECT 'sync_log'::TEXT, cleanup_sync_log(7), 7;
  
  -- Apple Health samples (90 days)
  RETURN QUERY SELECT 'apple_health_hr_samples'::TEXT, cleanup_apple_health_hr_samples(90), 90;
  RETURN QUERY SELECT 'apple_health_cadence_samples'::TEXT, cleanup_apple_health_cadence_samples(90), 90;
  RETURN QUERY SELECT 'apple_health_pace_samples'::TEXT, cleanup_apple_health_pace_samples(90), 90;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Get table size info
-- Useful for monitoring data growth
-- ============================================
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  data_size TEXT,
  index_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name)::BIGINT,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)))::TEXT,
    pg_size_pretty(pg_relation_size(quote_ident(t.table_name)))::TEXT,
    pg_size_pretty(pg_indexes_size(quote_ident(t.table_name)))::TEXT
  FROM (
    VALUES 
      ('cta_history'),
      ('hue_lights'),
      ('hue_zones'),
      ('hue_status'),
      ('hue_scenes'),
      ('spotify_state'),
      ('spotify_listening_history'),
      ('sonos_state'),
      ('calendar_events'),
      ('sync_log'),
      ('apple_health_workouts'),
      ('apple_health_hr_samples'),
      ('apple_health_cadence_samples'),
      ('apple_health_pace_samples')
  ) AS t(table_name)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND tables.table_name = t.table_name
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Get record counts per table
-- Quick way to check data accumulation
-- ============================================
CREATE OR REPLACE FUNCTION get_record_counts()
RETURNS TABLE (
  table_name TEXT,
  record_count BIGINT,
  oldest_record TIMESTAMPTZ,
  newest_record TIMESTAMPTZ
) AS $$
BEGIN
  -- CTA History
  RETURN QUERY 
  SELECT 'cta_history'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM cta_history;
  
  -- Hue Lights
  RETURN QUERY 
  SELECT 'hue_lights'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM hue_lights;
  
  -- Hue Zones
  RETURN QUERY 
  SELECT 'hue_zones'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM hue_zones;
  
  -- Hue Status
  RETURN QUERY 
  SELECT 'hue_status'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM hue_status;
  
  -- Hue Scenes
  RETURN QUERY 
  SELECT 'hue_scenes'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM hue_scenes;
  
  -- Spotify State
  RETURN QUERY 
  SELECT 'spotify_state'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM spotify_state;
  
  -- Spotify Listening History
  RETURN QUERY 
  SELECT 'spotify_listening_history'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(played_at), 
         MAX(played_at) 
  FROM spotify_listening_history;
  
  -- Sonos State
  RETURN QUERY 
  SELECT 'sonos_state'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM sonos_state;
  
  -- Calendar Events
  RETURN QUERY 
  SELECT 'calendar_events'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(recorded_at), 
         MAX(recorded_at) 
  FROM calendar_events;
  
  -- Sync Log
  RETURN QUERY 
  SELECT 'sync_log'::TEXT, 
         COUNT(*)::BIGINT, 
         MIN(synced_at), 
         MAX(synced_at) 
  FROM sync_log;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions for service role
GRANT EXECUTE ON FUNCTION cleanup_cta_history(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_hue_lights(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_hue_zones(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_hue_status(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_hue_scenes(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_spotify_state(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_sonos_state(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_calendar_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_sync_log(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_apple_health_hr_samples(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_apple_health_cadence_samples(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_apple_health_pace_samples(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_all_old_records() TO service_role;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO service_role;
GRANT EXECUTE ON FUNCTION get_record_counts() TO service_role;

-- Also allow anon to read stats (useful for monitoring)
GRANT EXECUTE ON FUNCTION get_table_sizes() TO anon;
GRANT EXECUTE ON FUNCTION get_record_counts() TO anon;

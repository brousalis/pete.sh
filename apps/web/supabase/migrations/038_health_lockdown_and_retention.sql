-- ============================================================================
-- Health data lockdown + retention policy for a year-long training cycle
-- ============================================================================
-- Two problems this fixes:
--
--   1. apple_health_* was anon-readable (migration 002 created "Allow public
--      read" policies). pete.sh is a public origin, so anyone could read a full
--      year of heart rate, GPS routes, sleep and body composition. Writes were
--      also anon-insertable with WITH CHECK (true), meaning the PeteWatch API
--      key was the only thing standing between the internet and the dataset.
--
--   2. cleanup_all_old_records() deleted HR/cadence/pace samples after 90 days.
--      PeteCoach needs the full 48-week history to compute zone distributions,
--      decoupling and CTL progression across the whole build. Coach
--      conversations were also on a 30-day cleanup, which would erase training
--      context mid-season.
-- ============================================================================

-- ============================================
-- 1. LOCK DOWN apple_health_* AND RELATED
-- ============================================

DO $$
DECLARE
  t TEXT;
  pol RECORD;
  health_tables TEXT[] := ARRAY[
    'apple_health_workouts',
    'apple_health_hr_samples',
    'apple_health_cadence_samples',
    'apple_health_pace_samples',
    'apple_health_routes',
    'apple_health_daily_metrics',
    'apple_health_splits',
    'apple_health_workout_events',
    'apple_health_cycling_speed_samples',
    'apple_health_cycling_cadence_samples',
    'apple_health_cycling_power_samples',
    'apple_health_walking_speed_samples',
    'apple_health_walking_step_length_samples',
    'user_hr_zones_config',
    'exercise_healthkit_links',
    'exercise_weight_logs',
    'ai_coach_insights',
    'ai_coach_conversations',
    'assistant_conversations',
    'assistant_user_memory',
    'maple_walks',
    'maple_bathroom_markers'
  ];
BEGIN
  FOREACH t IN ARRAY health_tables LOOP
    -- Skip tables that don't exist in this environment
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Drop every existing policy so no permissive anon rule survives
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "service_role_all" ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
      t
    );
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON %I TO service_role', t);
  END LOOP;
END $$;

-- The helper functions from migration 002 run as the caller, but revoke the
-- anon grants so they cannot be used as a read side channel.
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOR fn IN
    SELECT format('%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_latest_daily_metrics',
        'get_recent_workouts',
        'get_workout_hr_chart',
        'get_weekly_training_summary',
        'get_table_sizes',
        'get_record_counts'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- ============================================
-- 2. RETENTION: KEEP TRAINING SAMPLES
-- ============================================
-- Storage cost of keeping everything is small relative to its value:
-- ~400 sessions/year x ~2,500 HR samples ≈ 1M rows ≈ a few hundred MB on Pro.
-- Non-training samples (walks, misc) are still pruned so the tables don't grow
-- without bound from all-day background recording.

CREATE OR REPLACE FUNCTION cleanup_apple_health_hr_samples(retention_days INTEGER DEFAULT 400)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_hr_samples s
  WHERE s.timestamp < NOW() - (retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM apple_health_workouts w
      WHERE w.id = s.workout_id
        AND w.workout_type IN (
          'running', 'cycling', 'swimming',
          'functionalStrengthTraining', 'traditionalStrengthTraining',
          'coreTraining', 'hiit', 'highIntensityIntervalTraining',
          'rowing', 'elliptical', 'stairClimbing'
        )
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_apple_health_cadence_samples(retention_days INTEGER DEFAULT 400)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_cadence_samples s
  WHERE s.timestamp < NOW() - (retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM apple_health_workouts w
      WHERE w.id = s.workout_id
        AND w.workout_type IN ('running', 'cycling', 'swimming')
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_apple_health_pace_samples(retention_days INTEGER DEFAULT 400)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM apple_health_pace_samples s
  WHERE s.timestamp < NOW() - (retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM apple_health_workouts w
      WHERE w.id = s.workout_id
        AND w.workout_type IN ('running', 'cycling', 'swimming')
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Master cleanup: raise sample retention and stop deleting coach chats.
CREATE OR REPLACE FUNCTION cleanup_all_old_records()
RETURNS TABLE (
  table_name TEXT,
  deleted_count INTEGER,
  retention_days INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT 'cta_history'::TEXT, cleanup_cta_history(7), 7;
  RETURN QUERY SELECT 'hue_lights'::TEXT, cleanup_hue_lights(7), 7;
  RETURN QUERY SELECT 'hue_zones'::TEXT, cleanup_hue_zones(7), 7;
  RETURN QUERY SELECT 'hue_status'::TEXT, cleanup_hue_status(7), 7;
  RETURN QUERY SELECT 'hue_scenes'::TEXT, cleanup_hue_scenes(30), 30;
  RETURN QUERY SELECT 'spotify_state'::TEXT, cleanup_spotify_state(7), 7;
  RETURN QUERY SELECT 'sonos_state'::TEXT, cleanup_sonos_state(7), 7;
  RETURN QUERY SELECT 'calendar_events'::TEXT, cleanup_calendar_events(30), 30;
  RETURN QUERY SELECT 'sync_log'::TEXT, cleanup_sync_log(7), 7;

  -- Training samples: only non-training activities are pruned, after 400 days
  RETURN QUERY SELECT 'apple_health_hr_samples'::TEXT, cleanup_apple_health_hr_samples(400), 400;
  RETURN QUERY SELECT 'apple_health_cadence_samples'::TEXT, cleanup_apple_health_cadence_samples(400), 400;
  RETURN QUERY SELECT 'apple_health_pace_samples'::TEXT, cleanup_apple_health_pace_samples(400), 400;

  -- Note: coach_* tables are intentionally excluded from all cleanup.
END;
$$ LANGUAGE plpgsql;

-- Retire the legacy AI coach cleanup so training conversations are not deleted
-- mid-season. The function is kept (other code may call it) but neutered.
-- 023 created this as RETURNS void; CREATE OR REPLACE cannot change a return
-- type, so drop first.
DROP FUNCTION IF EXISTS cleanup_ai_coach_old_records();
CREATE FUNCTION cleanup_ai_coach_old_records()
RETURNS INTEGER AS $$
BEGIN
  -- Disabled by migration 038: PeteCoach keeps full training history.
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_apple_health_hr_samples(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_apple_health_cadence_samples(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_apple_health_pace_samples(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_all_old_records() TO service_role;
REVOKE ALL ON FUNCTION cleanup_all_old_records() FROM anon, authenticated;

-- ============================================
-- 3. NOTIFY THE COACH WORKER ON NEW ACTIVITY
-- ============================================
-- The worker LISTENs on this channel and enqueues a debrief job, so a post-
-- workout debrief lands within minutes of the phone syncing.

CREATE OR REPLACE FUNCTION coach_notify_activity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'coach_activity',
    json_build_object(
      'activity_id', NEW.id,
      'healthkit_id', NEW.healthkit_id,
      'workout_type', NEW.workout_type,
      'start_date', NEW.start_date,
      'op', TG_OP
    )::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_activity_notify ON apple_health_workouts;
CREATE TRIGGER coach_activity_notify
  AFTER INSERT OR UPDATE OF duration, distance_meters, hr_average
  ON apple_health_workouts
  FOR EACH ROW
  EXECUTE FUNCTION coach_notify_activity();

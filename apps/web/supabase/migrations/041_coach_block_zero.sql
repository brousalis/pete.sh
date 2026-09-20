-- ============================================================================
-- Block 0: return to run and rehab foundation
-- ============================================================================
-- The first eight weeks of the 48-week macrocycle, seeded so the system has a
-- plan on day one rather than waiting for the first Sunday planning job.
--
-- Shape of this block, and why:
--
--   Swimming carries the aerobic load. It is pain-free, it is the largest
--   available time saving for sub-3, and it costs the knee nothing.
--
--   Running returns by frequency first. Two short walk/run sessions a week
--   with 48+ hours between them, growing by minutes rather than miles. The
--   original injury came from adding distance quickly; this block is
--   deliberately slower than it feels necessary.
--
--   Cycling stays high-cadence and low-torque. Low cadence is the specific
--   mechanism that aggravated the pes anserine.
--
--   Strength twice a week, quad-dominant. The MRI report names quad strength
--   as the primary remedy for the medial patellar cartilage wear, so it is
--   the one thing in this block that is not negotiable.
--
-- Weeks 4 and 8 are deloads. Week 3 carries the baseline tests.
-- ============================================================================

DO $$
DECLARE
  v_macrocycle_id UUID;
  v_block_id UUID;
  v_start_date DATE := '2026-09-21';  -- Monday
BEGIN
  SELECT id INTO v_macrocycle_id FROM coach_macrocycle WHERE is_active LIMIT 1;

  IF v_macrocycle_id IS NULL THEN
    RAISE NOTICE 'No active macrocycle; skipping Block 0 seed.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM coach_block WHERE macrocycle_id = v_macrocycle_id AND block_number = 1) THEN
    RAISE NOTICE 'Block 1 already exists; skipping.';
    RETURN;
  END IF;

  INSERT INTO coach_block (
    macrocycle_id, block_number, name, phase, start_date, end_date, goals, planned_tests
  ) VALUES (
    v_macrocycle_id,
    1,
    'Return to run and rehab foundation',
    'rehab',
    v_start_date,
    v_start_date + 55,  -- 8 weeks
    ARRAY[
      'Return to running without a symptom flare, by frequency then duration',
      'Establish a swim baseline and begin closing the largest gap to sub-3',
      'Rebuild quad strength to pass the symmetry gate that unlocks run intensity',
      'Re-establish cycling volume at high cadence and low torque',
      'Complete both PT blocks every day'
    ],
    ARRAY['css', 'quad_symmetry', 'run_tt']
  )
  RETURNING id INTO v_block_id;

  -- ------------------------------------------------------------------
  -- Weeks
  -- ------------------------------------------------------------------
  INSERT INTO coach_week (block_id, week_start, week_number, is_deload, focus, status, rationale)
  VALUES
    (v_block_id, v_start_date,      1, FALSE,
     'Re-entry. Establish the rhythm, keep everything comfortable.',
     'approved',
     'Nothing here is hard. The point of week one is showing the knee that training resumed without giving it a reason to object.'),
    (v_block_id, v_start_date + 7,  2, FALSE,
     'Add the second run. Hold everything else.',
     'draft',
     'Frequency before duration: a second short run is a bigger adaptation signal than a longer single run, at lower risk.'),
    (v_block_id, v_start_date + 14, 3, FALSE,
     'Baseline tests: CSS and quad symmetry.',
     'draft',
     'Both tests gate later decisions. CSS sets swim training paces and the race projection; quad symmetry decides when run intensity can start.'),
    (v_block_id, v_start_date + 21, 4, TRUE,
     'Deload. Absorb three weeks of new load.',
     'draft',
     'Connective tissue adapts more slowly than the cardiovascular system. The deload is for the knee, not for the lungs.'),
    (v_block_id, v_start_date + 28, 5, FALSE,
     'Extend run duration. First continuous running.',
     'draft',
     'Walk intervals come out only once two runs a week have been symptom-free for a month.'),
    (v_block_id, v_start_date + 35, 6, FALSE,
     'Add swim volume. Longer aerobic bike.',
     'draft',
     'With running still capped, the aerobic build happens in the pool and on the bike where there is no impact cost.'),
    (v_block_id, v_start_date + 42, 7, FALSE,
     'Third run. Retest quad symmetry.',
     'draft',
     'A third run only if the first two have stayed clean. Retesting symmetry determines whether Base 1 can include intensity.'),
    (v_block_id, v_start_date + 49, 8, TRUE,
     'Deload and block review.',
     'draft',
     'Consolidate before Base 1 and re-budget the race splits against the measured CSS.');

  -- ------------------------------------------------------------------
  -- Week 1 sessions
  -- ------------------------------------------------------------------
  -- Spelled out in full because this is the week that runs before the coach
  -- has generated anything, and because the shape is the template the
  -- planner follows for the rest of the block.

  INSERT INTO coach_planned_session (
    week_id, session_date, slot, sort_order, sport, session_type, title, description,
    planned_duration_seconds, planned_distance_meters, planned_load, steps, targets, rationale, status
  )
  SELECT
    w.id, x.session_date, 'primary', 0, x.sport, x.session_type, x.title, x.description,
    x.duration, x.distance, x.load, x.steps::JSONB, x.targets::JSONB, x.rationale, 'planned'
  FROM coach_week w
  JOIN (VALUES
    -- Monday: swim technique + strength. No impact to open the week.
    (v_start_date, 'swim', 'technique', 'Technique swim',
     '6 x 100 yd drill/swim by 50, 20 s rest. Focus on catch and a steady kick. Open turns are fine.',
     2100, 1600, 24,
     '{"warmup":{"kind":"warmup","goal":{"type":"distance","value":300,"unit":"yards"},"note":"Easy, mixed stroke"},"blocks":[{"repeat":6,"steps":[{"kind":"work","label":"Drill/swim","goal":{"type":"distance","value":100,"unit":"yards"},"note":"50 drill, 50 swim"},{"kind":"recovery","goal":{"type":"time","value":20,"unit":"seconds"}}]}],"cooldown":{"kind":"cooldown","goal":{"type":"distance","value":200,"unit":"yards"}}}',
     '{"rpe":4}',
     'Swimming is the only discipline with no knee cost and the biggest time saving available. Week one is technique, not fitness.'),

    (v_start_date, 'strength', 'strength', 'Lower body: quad focus',
     'VMO wall sits 3 x 45 s, TKEs 3 x 15, DB RDLs 3 x 10, heavy calf raises 4 x 12, Copenhagen planks 3 x 20 s each side. No heavy passive stretching.',
     2700, NULL, 27, '{}', '{"rpe":6}',
     'The MRI names quad strength as the primary remedy for the cartilage wear. This is the single most important session in the block.'),

    -- Tuesday: first run back, walk/run.
    (v_start_date + 1, 'run', 'walk_run', 'Walk/run: 6 x (2 min run, 2 min walk)',
     '10 min walk warmup, then 6 rounds of 2 min easy running and 2 min walking. Stop immediately if medial knee pain reaches 4/10.',
     2040, 2400, 20,
     '{"warmup":{"kind":"warmup","goal":{"type":"time","value":600,"unit":"seconds"},"note":"Brisk walk"},"blocks":[{"repeat":6,"steps":[{"kind":"work","label":"Run","goal":{"type":"time","value":120,"unit":"seconds"},"alert":{"type":"heartRate","zone":2}},{"kind":"recovery","label":"Walk","goal":{"type":"time","value":120,"unit":"seconds"}}]}],"cooldown":{"kind":"cooldown","goal":{"type":"time","value":300,"unit":"seconds"},"note":"Walk"}}',
     '{"hrZone":2,"rpe":3}',
     'First run in months. Twelve minutes of running total, broken up. It will feel absurdly easy, which is the point.'),

    -- Wednesday: high-cadence bike.
    (v_start_date + 2, 'bike', 'z2', 'Z2 spin, high cadence',
     '40 min steady at 90-100 rpm with light resistance. Cadence matters more than power here.',
     2400, NULL, 27, '{}', '{"hrZone":2,"cadenceRange":[90,100],"rpe":4}',
     'Low cadence and high pedal force is the mechanism that aggravated the pes anserine. Spinning rebuilds cycling volume without reproducing it.'),

    -- Thursday: swim aerobic + upper body.
    (v_start_date + 3, 'swim', 'z2', 'Aerobic swim',
     '1500 yd continuous or broken into 3 x 500 with 30 s rest. Comfortable throughout.',
     2700, 1800, 30, '{}', '{"rpe":5}',
     'Building the aerobic base where it costs nothing. This is where the fitness comes from while running is capped.'),

    (v_start_date + 3, 'strength', 'strength', 'Upper body and core',
     'Pull-ups 3 x 8, DB rows, incline bench, DB shoulder press, suitcase carries, ab wheel.',
     2700, NULL, 24, '{}', '{"rpe":6}',
     'Maintains the strength base already built, and keeps a training day that asks nothing of the knee.'),

    -- Friday: second run.
    (v_start_date + 4, 'run', 'walk_run', 'Walk/run: 6 x (2 min run, 2 min walk)',
     'Same as Tuesday. Do not extend it because it felt easy — that is how the last injury started.',
     2040, 2400, 20,
     '{"warmup":{"kind":"warmup","goal":{"type":"time","value":600,"unit":"seconds"},"note":"Brisk walk"},"blocks":[{"repeat":6,"steps":[{"kind":"work","label":"Run","goal":{"type":"time","value":120,"unit":"seconds"},"alert":{"type":"heartRate","zone":2}},{"kind":"recovery","label":"Walk","goal":{"type":"time","value":120,"unit":"seconds"}}]}],"cooldown":{"kind":"cooldown","goal":{"type":"time","value":300,"unit":"seconds"},"note":"Walk"}}',
     '{"hrZone":2,"rpe":3}',
     '72 hours after Tuesday, comfortably past the 48-hour minimum. Identical load: the variable being tested this week is frequency, nothing else.'),

    -- Saturday: longer swim + longer spin.
    (v_start_date + 5, 'swim', 'endurance', 'Longer aerobic swim',
     '2000 yd as 4 x 500, 30 s rest. Steady, even pacing across all four.',
     3300, 2400, 38, '{}', '{"rpe":5}',
     'The weekend long session lives in the pool for now. Even splits build the pacing discipline the race swim needs.'),

    (v_start_date + 5, 'bike', 'endurance', 'Endurance spin',
     '60 min steady Z2, cadence above 88 rpm throughout.',
     3600, NULL, 41, '{}', '{"hrZone":2,"cadenceRange":[88,100],"rpe":4}',
     'Paired with the swim as a low-impact double. Neither session loads the knee, so this is a legitimate two-a-day under the rules.'),

    -- Sunday: rest.
    (v_start_date + 6, 'rest', 'rest', 'Rest',
     'Complete rest. Light activation and nerve glides only.',
     NULL, NULL, 0, '{}', '{}',
     'One full rest day is a hard rule, not a preference. Connective tissue does most of its remodelling here.')
  ) AS x(
    session_date, sport, session_type, title, description,
    duration, distance, load, steps, targets, rationale
  ) ON TRUE
  WHERE w.week_start = v_start_date;

  RAISE NOTICE 'Seeded Block 1 with 8 weeks and week 1 sessions.';
END $$;

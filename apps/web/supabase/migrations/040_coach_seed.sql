-- ============================================================================
-- PeteCoach seed: athlete, injury, PT protocol, constraints, macrocycle
-- ============================================================================
-- Real data, not fixtures. The guardrail engine reads these rows directly, so
-- the clinical findings and PT prescriptions here are load-bearing: they
-- decide what the planner is allowed to schedule.
--
-- Clinical source: knee MRI report and physical therapy notes (Sept 2026).
-- Anything marked in contraindications came from a clinician, not the coach.
-- ============================================================================

-- ============================================
-- ATHLETE
-- ============================================

INSERT INTO coach_athlete_profile (
  name, birth_date, sex, height_cm,
  weight_target_low_lbs, weight_target_high_lbs, body_fat_target_pct,
  max_hr, resting_hr_baseline,
  css_pace_per_100yd,
  goal_race_name, goal_race_date, goal_race_distance, goal_time_seconds,
  timezone, notes
)
SELECT
  'Pete',
  '1989-01-01',            -- year-accurate; exact date not required by any rule
  'male',
  182.88,                  -- 6'0"
  170, 175,
  10.5,
  185,                     -- inherited from user_hr_zones_config; retest to confirm
  52,
  150,                     -- ~2:30/100yd at baseline; CSS test in week 3 replaces this
  'Supertri Chicago — Olympic',
  '2027-08-22',
  'olympic',
  10800,                   -- sub 3:00:00
  'America/Chicago',
  'Former college athlete. Trained 6 days/week for a year, 226 -> 173 lbs. '
  'Returning from a bilateral (right-dominant) knee injury. Health first, '
  'then consistency, then the sub-3 goal.'
WHERE NOT EXISTS (SELECT 1 FROM coach_athlete_profile WHERE is_active);

-- ============================================
-- CONSTRAINTS
-- ============================================

INSERT INTO coach_constraint (kind, label, detail) VALUES
  ('facility', '25 yd indoor pool',
   '{"sport":"swim","course":"scy","length_yards":25,"flip_turns":false,"note":"Open turns with occasional rest. Race is 1500 m open water, so convert paces."}'),
  ('facility', 'Lakefront Trail',
   '{"sports":["run","bike"],"surface":"paved","note":"Primary outdoor venue. Unreliable Dec-Mar (ice, wind off the lake)."}'),
  ('facility', 'Indoor bike',
   '{"sport":"bike","type":"indoor_trainer","power_meter":false,"note":"HR and cadence only. A smart trainer is the top gear recommendation but is not assumed."}'),
  ('preference', 'Six training days per week',
   '{"days_per_week":6,"rest_day":"sunday","two_a_day":"allowed_when_low_impact","note":"Open to doubles, but health is prioritised over volume."}'),
  ('preference', 'Weekday schedule',
   '{"occupation":"principal software engineer","note":"Weekday sessions before work or in the evening; long sessions on weekends."}')
ON CONFLICT DO NOTHING;

-- ============================================
-- INJURY
-- ============================================

INSERT INTO coach_injury (
  name, body_region, sites, status, severity, onset_date,
  diagnosis, contraindications, clearances, notes
)
SELECT
  'Bilateral medial knee pain (right dominant)',
  'knee',
  ARRAY['r_knee_medial', 'l_knee_medial', 'pes_anserine', 'patellar_cartilage', 'bakers_cyst', 'hamstring_tendon'],
  'managed',
  'moderate',
  '2026-06-15',
  jsonb_build_object(
    'imaging', 'MRI',
    'no_stress_injury', true,
    'no_meniscal_tear', true,
    'findings', jsonb_build_array(
      'Cartilage wear along the medial aspect of the patella',
      'Small medial plica (scar tissue band)',
      'Inflammation in one hamstring tendon',
      'Small Baker''s cyst posteriorly'
    ),
    'pt_assessment', 'Pes anserine identified as the primary pain generator, alongside the Baker''s cyst. Both markedly improved; cleared for a graded return to full training.',
    'surgical_intervention_required', false,
    'mechanism', 'Overextension on a 40-mile ride the week after a 7-mile PR run',
    'primary_remedy', 'Keep the quadriceps very strong; anti-inflammatories as needed'
  ),
  ARRAY[
    'No heavy passive stretching of the injured side (no pigeon pose)',
    'No high-torque, low-cadence cycling during rehab blocks',
    'No sudden jumps in running volume or long-ride distance',
    'Avoid deep loaded knee flexion under fatigue'
  ],
  jsonb_build_object(
    'return_to_training', 'graded',
    'cleared_by', 'physical therapy',
    'cleared_on', '2026-09-14',
    'conditions', jsonb_build_array(
      'Continue the prescribed activation and armor blocks daily',
      'Progress running by frequency, then duration, then intensity',
      'Stop and reassess on medial knee pain of 4/10 or higher'
    )
  ),
  'Ran up to 16 mi/week outdoors at 10:00-10:15 Z2 before the injury. Took 2-3 '
  'months off running. Swimming became the main aerobic stimulus and is '
  'pain-free. Cycling reproduced symptoms at low cadence / high torque, so '
  'cadence discipline is a guardrail rather than a preference.'
WHERE NOT EXISTS (SELECT 1 FROM coach_injury WHERE body_region = 'knee');

INSERT INTO coach_injury_event (injury_id, event_date, event_type, provider, summary, findings)
SELECT
  i.id, '2026-08-20', 'imaging', 'Sports medicine (MD)',
  'Knee MRI: no stress injury or meniscal tear. Medial patellar cartilage wear, small medial plica, hamstring tendon inflammation, small Baker''s cyst. No surgical intervention required.',
  jsonb_build_object(
    'recommendation', 'Keep quads very strong; be consistent with anti-inflammatories while training for the triathlon.'
  )
FROM coach_injury i
WHERE i.body_region = 'knee'
  AND NOT EXISTS (SELECT 1 FROM coach_injury_event WHERE event_date = '2026-08-20' AND event_type = 'imaging');

INSERT INTO coach_injury_event (injury_id, event_date, event_type, provider, summary, findings)
SELECT
  i.id, '2026-09-14', 'clearance', 'Physical therapy',
  'Pes anserine and Baker''s cyst both markedly improved over the past week. Cleared to return to full training, continuing the prescribed exercise program.',
  jsonb_build_object('primary_pain_generator', 'pes anserine', 'secondary', 'Baker''s cyst')
FROM coach_injury i
WHERE i.body_region = 'knee'
  AND NOT EXISTS (SELECT 1 FROM coach_injury_event WHERE event_date = '2026-09-14' AND event_type = 'clearance');

-- ============================================
-- PT EXERCISES
-- ============================================
-- Prescriptions transcribed from the physical therapist's program.

INSERT INTO coach_pt_exercise (slug, name, category, target, prescription, cues, source) VALUES
  ('quad-sets', 'Quad Sets', 'activation', 'vmo',
   '{"sets":4,"hold_seconds":45}', 'Drive the knee down, squeeze the quad hard, keep breathing.', 'physical_therapist'),
  ('wall-sit-gtb', 'Wall Sit with Glute Band', 'activation', 'quad',
   '{"sets":3,"hold_seconds":30,"equipment":"glute band"}', 'Press out against the band the whole hold.', 'physical_therapist'),
  ('slr-band', 'Straight Leg Raise with Band', 'activation', 'quad',
   '{"sets":2,"reps":10,"side":"each","equipment":"band"}', 'Lock the knee before the leg leaves the floor.', 'physical_therapist'),
  ('iso-wall-runner', 'ISO Wall Runner', 'activation', 'hip_flexor',
   '{"sets":2,"reps":10,"hold_seconds":3,"equipment":"yellow ball"}', 'Hold the ball against the wall with steady pressure.', 'physical_therapist'),
  ('supine-nerve-glides', 'Supine Nerve Glides with Hamstring Extension', 'mobility', 'sciatic',
   '{"sets":2,"reps":10,"side":"each","tempo":"slow"}', 'Glide, never stretch to end range.', 'physical_therapist'),
  ('bridge-abduction-march', 'Bridge + Abduction / March with Band', 'armor', 'glute_max',
   '{"sets":2,"reps":10,"hold_seconds":3,"equipment":"band"}', 'Keep the pelvis level through the march.', 'physical_therapist'),
  ('modified-clamshells', 'Modified Clamshells', 'armor', 'glute_med',
   '{"sets":3,"reps":20,"side":"each","equipment":"band"}', 'No pelvic rotation; the movement is at the hip only.', 'physical_therapist'),
  ('hip-abd-sidelying', 'Side-Lying Hip Abduction with Band', 'armor', 'glute_med',
   '{"sets":2,"reps":10,"side":"each","equipment":"band"}', 'Lead with the heel, toe slightly down.', 'physical_therapist'),
  ('lateral-tap-down', '6" Lateral Tap Down', 'armor', 'quad',
   '{"sets":2,"reps":10,"side":"each","height_inches":6}', 'Control the descent; knee tracks over the second toe.', 'physical_therapist'),
  ('pnf-hamstring', 'Supine PNF Contract-Relax Hamstring Stretch', 'mobility', 'hamstring',
   '{"sets":3,"side":"each","contract_seconds":5,"stretch_seconds":10}', 'Contract into the hand, then relax into a small new range.', 'physical_therapist'),
  ('vmo-wall-sit', 'VMO Wall Sit', 'strength', 'vmo',
   '{"sets":3,"hold_seconds":45}', 'Ball between the knees; squeeze throughout.', 'physical_therapist'),
  ('db-rdl', 'Dumbbell Romanian Deadlift', 'strength', 'hamstring',
   '{"sets":3,"reps":10}', 'Hinge, do not squat. Stop before the low back rounds.', 'coach'),
  ('heavy-calf-raise', 'Heavy Calf Raises', 'strength', 'calf',
   '{"sets":4,"reps":12}', 'Full range, pause at the top.', 'coach'),
  ('copenhagen-plank', 'Copenhagen Plank', 'strength', 'adductor',
   '{"sets":3,"hold_seconds":20,"side":"each"}', 'Start short-lever; progress to long-lever only when pain-free.', 'physical_therapist'),
  ('tke', 'Terminal Knee Extension', 'strength', 'vmo',
   '{"sets":3,"reps":15,"equipment":"band"}', 'Finish every rep with the knee fully straight.', 'physical_therapist'),
  ('pogo-hops', 'Pogo Hops', 'plyometric', 'calf',
   '{"sets":3,"reps":20}', 'Stiff ankles, minimal knee bend, quiet landings.', 'physical_therapist'),
  ('tibialis-raise', 'Tibialis Raises', 'strength', 'tibialis',
   '{"sets":3,"reps":20}', 'Control the lowering.', 'coach'),
  ('worlds-greatest-stretch', 'World''s Greatest Stretch', 'mobility', 'hip',
   '{"reps":5,"side":"each"}', 'Pre-run only; active, not a held stretch.', 'coach')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PT PROTOCOLS (non-removable by the planner)
-- ============================================

INSERT INTO coach_pt_protocol (slug, name, time_of_day, cadence, duration_minutes, is_mandatory, description) VALUES
  ('morning-activation', 'Morning Activation Block', 'morning', 'daily', 7, TRUE,
   'Wakes up the quad and hip before any load. Non-negotiable: the MRI remedy for the medial patellar cartilage wear is quad strength, and this is the daily dose.'),
  ('evening-armor', 'Evening Armor Block', 'evening', 'daily', 12, TRUE,
   'Posterior chain and lateral hip work plus the hamstring PNF flush. Targets the pes anserine, which the PT identified as the primary pain generator.'),
  ('pre-run-warmup', 'Pre-Run Warmup', 'pre_session', 'run_days', 4, TRUE,
   'Active mobility before any running. Required before every run.'),
  ('post-run-landing', 'Post-Run Landing Sequence', 'post_session', 'run_days', 15, TRUE,
   'Walking cooldown, couch stretch, wall calf drop, massage gun sweep, neutral-grip hang. Note: pigeon pose was removed — heavy passive stretching of the injured side is contraindicated.')
ON CONFLICT (slug) DO NOTHING;

-- Morning Activation Block
INSERT INTO coach_pt_protocol_item (protocol_id, exercise_id, sort_order)
SELECT p.id, e.id, x.sort_order
FROM coach_pt_protocol p
JOIN (VALUES
  ('quad-sets', 1), ('wall-sit-gtb', 2), ('slr-band', 3),
  ('iso-wall-runner', 4), ('supine-nerve-glides', 5)
) AS x(slug, sort_order) ON TRUE
JOIN coach_pt_exercise e ON e.slug = x.slug
WHERE p.slug = 'morning-activation'
ON CONFLICT (protocol_id, exercise_id) DO NOTHING;

-- Evening Armor Block
INSERT INTO coach_pt_protocol_item (protocol_id, exercise_id, sort_order)
SELECT p.id, e.id, x.sort_order
FROM coach_pt_protocol p
JOIN (VALUES
  ('bridge-abduction-march', 1), ('modified-clamshells', 2),
  ('hip-abd-sidelying', 3), ('lateral-tap-down', 4), ('pnf-hamstring', 5)
) AS x(slug, sort_order) ON TRUE
JOIN coach_pt_exercise e ON e.slug = x.slug
WHERE p.slug = 'evening-armor'
ON CONFLICT (protocol_id, exercise_id) DO NOTHING;

-- Pre-run warmup
INSERT INTO coach_pt_protocol_item (protocol_id, exercise_id, sort_order)
SELECT p.id, e.id, 1
FROM coach_pt_protocol p
JOIN coach_pt_exercise e ON e.slug = 'worlds-greatest-stretch'
WHERE p.slug = 'pre-run-warmup'
ON CONFLICT (protocol_id, exercise_id) DO NOTHING;

-- ============================================
-- MACROCYCLE + SPLIT BUDGET
-- ============================================
-- Budget derived from the sub-3 target. The swim is the largest and cheapest
-- gain (2:30 -> ~2:00 per 100 yd is worth roughly 7 minutes and costs the
-- knee nothing), so it carries the biggest required improvement.

INSERT INTO coach_macrocycle (name, goal_race_name, goal_race_date, goal_time_seconds, start_date, split_budget, notes)
SELECT
  'Road to Chicago 2027',
  'Supertri Chicago — Olympic',
  '2027-08-22',
  10800,
  '2026-09-21',
  jsonb_build_object(
    'swim_seconds', 1980,   -- 33:00 for 1500 m (~2:03/100 yd equivalent, wetsuit)
    't1_seconds', 420,      -- 7:00, long barefoot run from swim exit to DuSable Harbor
    'bike_seconds', 4680,   -- 1:18:00 for 40 km (~19.1 mph)
    't2_seconds', 150,      -- 2:30
    'run_seconds', 3510     -- 58:30 for 10 km (~9:25/mi off the bike)
  ),
  'Total budget 2:57:00, leaving three minutes of slack against the 3:00 goal. '
  'Re-budgeted monthly from measured CSS, bike benchmark and VDOT. Knee health '
  'outranks the goal: if the run build cannot proceed safely, the projection '
  'moves, not the rehab.'
WHERE NOT EXISTS (SELECT 1 FROM coach_macrocycle WHERE is_active);

-- ============================================
-- COST BUDGET DEFAULTS
-- ============================================

INSERT INTO coach_cost_budget (period, period_start, cap_usd, degrade_at_pct)
VALUES
  ('day', CURRENT_DATE, 8.00, 80),
  ('month', DATE_TRUNC('month', CURRENT_DATE)::DATE, 120.00, 80)
ON CONFLICT (period, period_start) DO NOTHING;

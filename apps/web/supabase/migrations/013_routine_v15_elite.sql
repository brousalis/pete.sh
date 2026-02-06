-- Routine V15: Rock Climber & Lean Physique Protocol (Version 15 Elite)
-- Updates from v14: weight 205->196, new Achilles/Elbow rehab protocol,
-- Velocity Hiking strategy, updated Morning/Night mobility routines,
-- and overhauled workout definitions across all days.
--
-- Key changes:
--   - Monday: warmup restructured (heel holds, bridges), exercise D changed to
--     DB Wrist Extension Eccentrics (rehab), flush changed from run to bike,
--     mobility changed to couch stretch + pigeon
--   - Tuesday: warmup removed, A2 changed to Hand Walkouts, B changed to
--     Hollow Body Rocks, Stomach Vacuums removed, flush changed to Velocity Hike
--   - Wednesday: run now 170 BPM cadence-locked, hike changed to Velocity (4.0 MPH / 8%)
--   - Thursday: run extended to 4-5 miles, nose breathing added
--   - Friday: warmup removed, A changed to Incline DB Y Raises, rehab finisher added
--   - Saturday: playlist 180 BPM, finisher changed from Stomach Vacuums to Frozen Bottle Roll
--   - Morning routine: added Isometric Heel Holds, added Finger Extensions, removed Dead Hang
--   - Night routine: changed to Couch Stretch + Frog Stretch + Wrist Flexor Stretch

-- ============================================
-- INSERT VERSION 15 INTO fitness_routine_versions
-- ============================================
INSERT INTO fitness_routine_versions (
  routine_id,
  version_number,
  name,
  change_summary,
  user_profile,
  injury_protocol,
  schedule,
  daily_routines,
  workout_definitions,
  is_active,
  is_draft,
  activated_at
) VALUES (
  'climber-physique',
  15,
  'Rock Climber & Lean Physique Protocol (V15 Elite)',
  'Updated weight to 196 lbs (target 185). Added Achilles/Elbow rehab protocol with Velocity Hiking strategy. Restructured morning/night routines. Monday: warmup heel holds + bridges, D changed to wrist eccentrics rehab, flush to bike. Tuesday: warmup removed, A2 to inchworms, B to hollow body rocks, vacuums removed, flush to velocity hike. Wednesday: cadence-locked run, velocity hike. Thursday: 4-5 mile run. Friday: warmup removed, Y raises to incline DB, rehab finisher added. Saturday: 180 BPM, frozen bottle roll finisher.',

  -- user_profile
  '{
    "goal": "Climber Physique (Wire-strong, vascular, 185 lb target)",
    "stats": {
      "height": "5''11\"",
      "weight": 196
    },
    "schedule": {
      "fasted": true,
      "startDay": "monday",
      "trainingTime": "12:00 PM",
      "trainingWindow": "2 Hours (12:00 PM - 2:00 PM)"
    },
    "shoeStrategy": {
      "cardio": ["Cushioned Running Shoes"],
      "lifting": ["Cushioned Running Shoes"]
    },
    "musicStrategy": {
      "wednesday": "170 BPM (Cadence Lock)",
      "thursday": "170 BPM (Cadence Lock)",
      "saturday": "180 BPM (Sprint Speed)"
    }
  }'::jsonb,

  -- injury_protocol
  '{
    "name": "Achilles & Elbow Rehab Protocol",
    "status": "active",
    "description": "Combined Achilles tendon recovery and Golfer''s Elbow remodeling protocol",
    "rules": [
      "Achilles Saver: Wear Cushioned Running Shoes for ALL workouts (even lifting) for the next 7 days",
      "Incline Cap: Keep treadmill incline between 5% - 8%",
      "Elbow Remodeling: No weighted pulling. Use Straps for RDLs",
      "Daily Finger Extensions + Wrist Eccentrics",
      "Velocity Hike: Add SPEED not weight. Target 4.0 - 4.2 MPH Power Walk. Do not jog",
      "Salt Rule: 1 tsp Salt + Electrolytes in water during workout (Mandatory)",
      "Toe Lube Rule: Apply Vaseline/BodyGlide to toes before every run"
    ],
    "dailyRehab": [
      {
        "name": "Finger Extensions",
        "description": "Rubber band on fingers. Open wide.",
        "frequency": "daily",
        "sets": 2,
        "reps": 25
      },
      {
        "name": "DB Wrist Extension Eccentrics",
        "description": "Forearm on bench, palm down. Lift with help, lower slowly (5 sec) with bad arm.",
        "frequency": "workout days",
        "sets": 3,
        "reps": 15
      }
    ]
  }'::jsonb,

  -- schedule
  '{
    "monday": {
      "focus": "Strength",
      "goal": "Lift (Elbow Safe) + 40m Bike + Wrist Rehab"
    },
    "tuesday": {
      "focus": "Core",
      "goal": "Core (Hollow Body) + 45m Velocity Hike"
    },
    "wednesday": {
      "focus": "Hybrid",
      "goal": "Run (2mi) + Hike (45-60m Velocity)"
    },
    "thursday": {
      "focus": "Endurance",
      "goal": "Run (4-5mi Slow) + 20m Spin Flush"
    },
    "friday": {
      "focus": "Circuit",
      "goal": "Circuit (DB Y-Raise) + 30m Bike"
    },
    "saturday": {
      "focus": "HIIT",
      "goal": "Sprints (20m) + Walk + Ice Bottle"
    },
    "sunday": {
      "focus": "Rest",
      "goal": "10k Steps (No Gym)"
    }
  }'::jsonb,

  -- daily_routines
  '{
    "morning": {
      "id": "oil-the-hinge",
      "name": "The Morning Armor Routine",
      "type": "morning",
      "duration": 10,
      "description": "Do this immediately after waking up. Sequence matters.",
      "exercises": [
        {
          "name": "Isometric Heel Holds (Achilles Fix)",
          "action": "Stand on edge of step (or flat). Lift to toes. Hold 45 seconds.",
          "why": "Rebuilds Achilles tendon strength through isometric loading",
          "duration": 135,
          "sets": 3,
          "description": "Primary Achilles rehab exercise. Isometric holds build tendon resilience."
        },
        {
          "name": "Deep Squat Hold (Active)",
          "action": "Drop into deep squat. Use doorframe for balance if needed. Duration: 60 seconds.",
          "why": "Opens ankles, knees, and hips for the day",
          "duration": 60,
          "description": "Opens ankles, knees, and hips. Essential for climbing high-step moves."
        },
        {
          "name": "T-Spine Rotations",
          "action": "From squat or hands/knees, reach arm to sky. 5 reps per side.",
          "why": "Prevents hunchback posture from pulling and carrying",
          "duration": 60,
          "description": "Prevents developing a hunchback posture from all the pulling and carrying."
        },
        {
          "name": "Finger Extensions",
          "action": "Rubber band on fingers. Open wide. 2 sets x 25 reps.",
          "why": "Elbow rehab and grip balance",
          "sets": 2,
          "reps": 25,
          "description": "Counterbalances grip work and aids elbow remodeling."
        }
      ]
    },
    "night": {
      "id": "release-the-brakes",
      "name": "The Night Release Routine",
      "type": "night",
      "duration": 12,
      "description": "Do this right before bed.",
      "exercises": [
        {
          "name": "Couch Stretch (Mandatory)",
          "action": "Knee against wall. Squeeze glute. Hold: 2 Minutes per side.",
          "why": "Fixes tight hip flexors from running and hiking",
          "duration": 240,
          "description": "The #1 stretch. Running and hiking tighten hip flexors causing lower back pain and weak glutes."
        },
        {
          "name": "Frog Stretch",
          "action": "Knees wide, hips back. Hold 2 Mins.",
          "why": "Opens hips and inner thighs",
          "duration": 120,
          "description": "Deep hip opener for climbing and squatting mobility."
        },
        {
          "name": "Wrist Flexor Stretch",
          "action": "Gentle pull back on fingers. Hold 30s.",
          "why": "Elbow rehab - lengthens forearm flexors",
          "duration": 30,
          "description": "Part of elbow remodeling protocol. Lengthens tight forearm flexors."
        }
      ]
    }
  }'::jsonb,

  -- workout_definitions (Record<DayOfWeek, Workout>)
  '{
    "monday": {
      "id": "monday-density-strength",
      "day": "monday",
      "name": "Density Strength",
      "focus": "strength",
      "goal": "Build wire-strong muscle density. Low Reps.",
      "notes": [
        "2-Hour Block: Warm-up (20m) + Lift (50m) + Bike (40m) + Mobility",
        "Stop 1 rep before failure"
      ],
      "warmup": {
        "name": "Warm-up",
        "duration": 20,
        "exercises": [
          {
            "id": "warmup-1",
            "name": "Isometric Heel Holds (Achilles)",
            "sets": 3,
            "duration": 45,
            "notes": "3 x 45-sec holds. Warm-up the Achilles."
          },
          {
            "id": "warmup-2",
            "name": "Glute Bridges + Single-Leg Bridges",
            "reps": 20,
            "notes": "20 Bridges + 10 Single-Leg Bridges"
          },
          {
            "id": "warmup-3",
            "name": "Single-Leg Stance (Eyes Closed)",
            "sets": 2,
            "duration": 60,
            "notes": "2 x 60s per leg. Balance / proprioception.",
            "youtubeVideoId": "78PpqNX_t0w"
          }
        ]
      },
      "exercises": [
        {
          "id": "monday-a1",
          "name": "Straight-Arm Cable Pulldowns",
          "sets": 3,
          "reps": 15,
          "form": "Arms locked. Push bar to thighs using lats.",
          "notes": "12-15 reps",
          "isElbowSafe": true,
          "youtubeVideoId": "G9uNaXGTJ4w"
        },
        {
          "id": "monday-a2",
          "name": "DB Push Press",
          "sets": 3,
          "reps": 6,
          "rest": 120,
          "form": "Slight leg dip to drive up, 3-sec slow lower.",
          "notes": "4-6 reps",
          "youtubeVideoId": "sElIkjcfyNY"
        },
        {
          "id": "monday-b1",
          "name": "Romanian Deadlift (RDL)",
          "sets": 3,
          "reps": 6,
          "rest": 90,
          "form": "Use Straps. Push hips back. Feel hamstring stretch.",
          "notes": "5-6 reps",
          "youtubeVideoId": "7j-2w4-P14I"
        },
        {
          "id": "monday-b2",
          "name": "DB Reverse Lunges",
          "sets": 3,
          "reps": 10,
          "form": "Step back far. Drive through the front heel.",
          "notes": "8-10 reps per leg",
          "youtubeVideoId": "Q2k3kYbtOcI"
        },
        {
          "id": "monday-c",
          "name": "Bear Hug Carry",
          "sets": 3,
          "form": "Hug plate/sandbag to chest. Squeeze with arms.",
          "notes": "Max Time",
          "isElbowSafe": true
        },
        {
          "id": "monday-d",
          "name": "DB Wrist Extension Eccentrics (Rehab)",
          "sets": 3,
          "reps": 15,
          "form": "Forearm on bench, palm down. Lift with help, lower slowly (5 sec) with bad arm.",
          "notes": "Elbow rehab exercise"
        }
      ],
      "metabolicFlush": {
        "name": "The Metabolic Flush",
        "duration": 40,
        "exercises": [
          {
            "id": "monday-flush",
            "name": "Stationary Bike",
            "form": "Zone 2. Consistent cadence.",
            "notes": "40 Minutes @ Zone 2",
            "duration": 2400
          }
        ]
      },
      "mobility": {
        "name": "Deep Mobility",
        "exercises": [
          {
            "id": "monday-mobility-1",
            "name": "Couch Stretch (Hip Flexors)",
            "notes": "2 mins per side",
            "duration": 240
          },
          {
            "id": "monday-mobility-2",
            "name": "Pigeon Pose",
            "notes": "2 mins per side",
            "duration": 120,
            "youtubeVideoId": "AI5A1PRYX7E"
          }
        ]
      }
    },
    "tuesday": {
      "id": "tuesday-core-posture",
      "day": "tuesday",
      "name": "Waist & Core",
      "focus": "core",
      "goal": "Narrow waist & Gymnastic Strength.",
      "notes": [
        "No warmup section - exercises go straight into core work"
      ],
      "exercises": [
        {
          "id": "tuesday-a1",
          "name": "Cable Pallof Press",
          "sets": 3,
          "reps": 12,
          "form": "Anti-rotation",
          "notes": "12 reps/side",
          "youtubeVideoId": "xeFp4MXad98"
        },
        {
          "id": "tuesday-a2",
          "name": "Hand Walkouts (Inchworms)",
          "sets": 3,
          "reps": 10,
          "form": "Walk hands out to plank, walk back. Slow and controlled.",
          "notes": "8-10 reps"
        },
        {
          "id": "tuesday-b",
          "name": "Hollow Body Rocks",
          "sets": 3,
          "duration": 45,
          "form": "Lower back glued to floor. Rock like a boat. Ribs down.",
          "notes": "30-45 secs per set",
          "isElbowSafe": true
        },
        {
          "id": "tuesday-c",
          "name": "Lying Leg Raises",
          "sets": 3,
          "reps": 15,
          "form": "Lower back stays on floor.",
          "isElbowSafe": true,
          "youtubeVideoId": "JB2oyawG9KI"
        },
        {
          "id": "tuesday-d",
          "name": "Face Pulls",
          "sets": 3,
          "reps": 15,
          "form": "Rope to forehead. Light weight.",
          "youtubeVideoId": "qEyoBOpvqR4"
        }
      ],
      "metabolicFlush": {
        "name": "The Velocity Flush",
        "duration": 45,
        "exercises": [
          {
            "id": "tue-flush",
            "name": "Power Walk (Velocity Hike)",
            "form": "Do not jog. Walk aggressively.",
            "notes": "45 Mins @ 4.0 - 4.2 MPH. Incline: 5% - 8% (Achilles Safe Zone).",
            "duration": 2700
          }
        ]
      }
    },
    "wednesday": {
      "id": "wednesday-fat-incinerator",
      "day": "wednesday",
      "name": "Fat Incinerator",
      "focus": "cardio",
      "goal": "Glycogen Depletion -> Fat Oxidation.",
      "notes": [
        "Playlist: 170 BPM (Cadence Lock)",
        "This is the biggest calorie burner of the week"
      ],
      "exercises": [
        {
          "id": "wed-phase1",
          "name": "The Run",
          "form": "Cadence: 167+ SPM. Use 2% Incline to force turnover.",
          "notes": "2 Miles. Playlist: 170 BPM.",
          "duration": 1200
        },
        {
          "id": "wed-phase2",
          "name": "The Extended Velocity Hike",
          "form": "Every 5 mins, walk with hands overhead for 60 seconds (Heart Rate Hack).",
          "notes": "45-60 Minutes. 4.0 MPH / 8% Incline.",
          "duration": 3600
        }
      ],
      "finisher": [
        {
          "id": "wed-prehab-1",
          "name": "Tibialis Raises",
          "sets": 3,
          "reps": 25,
          "notes": "Post-workout prehab.",
          "youtubeVideoId": "VzIcGAgBiaM"
        }
      ]
    },
    "thursday": {
      "id": "thursday-endurance",
      "day": "thursday",
      "name": "Endurance",
      "focus": "cardio",
      "goal": "Caloric burn without impact damage.",
      "notes": [
        "Playlist: 170 BPM",
        "Lubricate toes before run",
        "Mid-foot strike (Shuffle)",
        "Recovery bike is mandatory - flushes lactic acid"
      ],
      "exercises": [
        {
          "id": "thu-run",
          "name": "Run",
          "form": "Slow (Zone 2). Breathe through nose. Mid-foot strike.",
          "notes": "4.0 to 5.0 Miles. Lubricate toes. Playlist: 170 BPM."
        },
        {
          "id": "thu-flush",
          "name": "Recovery Flush",
          "form": "Very light resistance.",
          "notes": "20 Mins Stationary Bike (Mandatory).",
          "duration": 1200
        }
      ]
    },
    "friday": {
      "id": "friday-shin-saver-circuit",
      "day": "friday",
      "name": "The Shin-Saver Circuit",
      "focus": "conditioning",
      "goal": "Conditioning. Zero Rest.",
      "notes": [
        "4 Rounds: A -> B -> C -> D with No Rest between exercises",
        "Rest 2 mins after completing all 4 exercises, then repeat"
      ],
      "exercises": [
        {
          "id": "friday-circuit-a",
          "name": "Incline DB \"Y\" Raises",
          "reps": 15,
          "form": "Lie face down on incline bench. Arms form a Y.",
          "notes": "12-15 reps"
        },
        {
          "id": "friday-circuit-b",
          "name": "Push-ups",
          "reps": 20,
          "form": "Fast tempo",
          "notes": "15-20 reps",
          "youtubeVideoId": "WDIpL0pjun0"
        },
        {
          "id": "friday-circuit-c",
          "name": "Chest-Supported Row",
          "reps": 15,
          "form": "Neutral grip.",
          "notes": "12-15 reps",
          "isElbowSafe": true,
          "youtubeVideoId": "FTwvmczf7bE"
        },
        {
          "id": "friday-circuit-d",
          "name": "Rower Sprint OR Air Bike",
          "notes": "60 seconds Max Effort.",
          "duration": 60
        }
      ],
      "metabolicFlush": {
        "name": "The Metabolic Flush",
        "duration": 30,
        "exercises": [
          {
            "id": "fri-flush",
            "name": "Stationary Bike",
            "form": "Zone 2.",
            "notes": "30 Minutes",
            "duration": 1800
          }
        ]
      },
      "finisher": [
        {
          "id": "fri-rehab-1",
          "name": "DB Wrist Extension Eccentrics (Rehab)",
          "sets": 3,
          "reps": 15,
          "form": "Forearm on bench, palm down. Lift with help, lower slowly (5 sec).",
          "notes": "Elbow rehab finisher"
        }
      ]
    },
    "saturday": {
      "id": "saturday-hiit-sprints",
      "day": "saturday",
      "name": "HIIT Sprints",
      "focus": "hiit",
      "goal": "Speed & Power.",
      "notes": [
        "Playlist: 180 BPM",
        "Cushioned Running Shoes required"
      ],
      "warmup": {
        "name": "Warm-up",
        "duration": 5,
        "exercises": [
          {
            "id": "sat-warmup-1",
            "name": "5 min Jog",
            "notes": "Easy pace"
          }
        ]
      },
      "exercises": [
        {
          "id": "sat-intervals",
          "name": "HIIT Intervals",
          "form": "Cushioned Shoes. Playlist: 180 BPM.",
          "notes": "30 seconds Sprint (9.0+ mph) / 90 seconds Walk. 20 Mins total.",
          "duration": 1200
        }
      ],
      "finisher": [
        {
          "id": "sat-cooldown",
          "name": "Cool Down Walk",
          "notes": "20 min Walk",
          "duration": 1200
        },
        {
          "id": "sat-finisher",
          "name": "Frozen Water Bottle Roll (Foot Care)",
          "notes": "Roll frozen water bottle under feet immediately when home.",
          "duration": 300
        }
      ]
    },
    "sunday": {
      "id": "sunday-active-recovery",
      "day": "sunday",
      "name": "Active Recovery",
      "focus": "recovery",
      "goal": "No gym. Walking only.",
      "exercises": [
        {
          "id": "sun-walk",
          "name": "10,000 Steps",
          "notes": "No gym. Walk outside."
        }
      ]
    }
  }'::jsonb,

  true,   -- is_active (trigger will deactivate previous active version)
  false,  -- is_draft
  NOW()   -- activated_at
);

-- ============================================
-- UPDATE workout_definitions TABLE
-- (fast-access table for active workout definitions)
-- ============================================

-- Monday
INSERT INTO workout_definitions (routine_id, day_of_week, workout)
VALUES (
  'climber-physique',
  'monday',
  '{
    "id": "monday-density-strength",
    "day": "monday",
    "name": "Density Strength",
    "focus": "strength",
    "goal": "Build wire-strong muscle density. Low Reps.",
    "notes": [
      "2-Hour Block: Warm-up (20m) + Lift (50m) + Bike (40m) + Mobility",
      "Stop 1 rep before failure"
    ],
    "warmup": {
      "name": "Warm-up",
      "duration": 20,
      "exercises": [
        {
          "id": "warmup-1",
          "name": "Isometric Heel Holds (Achilles)",
          "sets": 3,
          "duration": 45,
          "notes": "3 x 45-sec holds. Warm-up the Achilles."
        },
        {
          "id": "warmup-2",
          "name": "Glute Bridges + Single-Leg Bridges",
          "reps": 20,
          "notes": "20 Bridges + 10 Single-Leg Bridges"
        },
        {
          "id": "warmup-3",
          "name": "Single-Leg Stance (Eyes Closed)",
          "sets": 2,
          "duration": 60,
          "notes": "2 x 60s per leg. Balance / proprioception.",
          "youtubeVideoId": "78PpqNX_t0w"
        }
      ]
    },
    "exercises": [
      {
        "id": "monday-a1",
        "name": "Straight-Arm Cable Pulldowns",
        "sets": 3,
        "reps": 15,
        "form": "Arms locked. Push bar to thighs using lats.",
        "notes": "12-15 reps",
        "isElbowSafe": true,
        "youtubeVideoId": "G9uNaXGTJ4w"
      },
      {
        "id": "monday-a2",
        "name": "DB Push Press",
        "sets": 3,
        "reps": 6,
        "rest": 120,
        "form": "Slight leg dip to drive up, 3-sec slow lower.",
        "notes": "4-6 reps",
        "youtubeVideoId": "sElIkjcfyNY"
      },
      {
        "id": "monday-b1",
        "name": "Romanian Deadlift (RDL)",
        "sets": 3,
        "reps": 6,
        "rest": 90,
        "form": "Use Straps. Push hips back. Feel hamstring stretch.",
        "notes": "5-6 reps",
        "youtubeVideoId": "7j-2w4-P14I"
      },
      {
        "id": "monday-b2",
        "name": "DB Reverse Lunges",
        "sets": 3,
        "reps": 10,
        "form": "Step back far. Drive through the front heel.",
        "notes": "8-10 reps per leg",
        "youtubeVideoId": "Q2k3kYbtOcI"
      },
      {
        "id": "monday-c",
        "name": "Bear Hug Carry",
        "sets": 3,
        "form": "Hug plate/sandbag to chest. Squeeze with arms.",
        "notes": "Max Time",
        "isElbowSafe": true
      },
      {
        "id": "monday-d",
        "name": "DB Wrist Extension Eccentrics (Rehab)",
        "sets": 3,
        "reps": 15,
        "form": "Forearm on bench, palm down. Lift with help, lower slowly (5 sec) with bad arm.",
        "notes": "Elbow rehab exercise"
      }
    ],
    "metabolicFlush": {
      "name": "The Metabolic Flush",
      "duration": 40,
      "exercises": [
        {
          "id": "monday-flush",
          "name": "Stationary Bike",
          "form": "Zone 2. Consistent cadence.",
          "notes": "40 Minutes @ Zone 2",
          "duration": 2400
        }
      ]
    },
    "mobility": {
      "name": "Deep Mobility",
      "exercises": [
        {
          "id": "monday-mobility-1",
          "name": "Couch Stretch (Hip Flexors)",
          "notes": "2 mins per side",
          "duration": 240
        },
        {
          "id": "monday-mobility-2",
          "name": "Pigeon Pose",
          "notes": "2 mins per side",
          "duration": 120,
          "youtubeVideoId": "AI5A1PRYX7E"
        }
      ]
    }
  }'::jsonb
)
ON CONFLICT (routine_id, day_of_week)
DO UPDATE SET
  workout = EXCLUDED.workout,
  updated_at = NOW();

-- Tuesday
INSERT INTO workout_definitions (routine_id, day_of_week, workout)
VALUES (
  'climber-physique',
  'tuesday',
  '{
    "id": "tuesday-core-posture",
    "day": "tuesday",
    "name": "Waist & Core",
    "focus": "core",
    "goal": "Narrow waist & Gymnastic Strength.",
    "notes": [
      "No warmup section - exercises go straight into core work"
    ],
    "exercises": [
      {
        "id": "tuesday-a1",
        "name": "Cable Pallof Press",
        "sets": 3,
        "reps": 12,
        "form": "Anti-rotation",
        "notes": "12 reps/side",
        "youtubeVideoId": "xeFp4MXad98"
      },
      {
        "id": "tuesday-a2",
        "name": "Hand Walkouts (Inchworms)",
        "sets": 3,
        "reps": 10,
        "form": "Walk hands out to plank, walk back. Slow and controlled.",
        "notes": "8-10 reps"
      },
      {
        "id": "tuesday-b",
        "name": "Hollow Body Rocks",
        "sets": 3,
        "duration": 45,
        "form": "Lower back glued to floor. Rock like a boat. Ribs down.",
        "notes": "30-45 secs per set",
        "isElbowSafe": true
      },
      {
        "id": "tuesday-c",
        "name": "Lying Leg Raises",
        "sets": 3,
        "reps": 15,
        "form": "Lower back stays on floor.",
        "isElbowSafe": true,
        "youtubeVideoId": "JB2oyawG9KI"
      },
      {
        "id": "tuesday-d",
        "name": "Face Pulls",
        "sets": 3,
        "reps": 15,
        "form": "Rope to forehead. Light weight.",
        "youtubeVideoId": "qEyoBOpvqR4"
      }
    ],
    "metabolicFlush": {
      "name": "The Velocity Flush",
      "duration": 45,
      "exercises": [
        {
          "id": "tue-flush",
          "name": "Power Walk (Velocity Hike)",
          "form": "Do not jog. Walk aggressively.",
          "notes": "45 Mins @ 4.0 - 4.2 MPH. Incline: 5% - 8% (Achilles Safe Zone).",
          "duration": 2700
        }
      ]
    }
  }'::jsonb
)
ON CONFLICT (routine_id, day_of_week)
DO UPDATE SET
  workout = EXCLUDED.workout,
  updated_at = NOW();

-- Wednesday
INSERT INTO workout_definitions (routine_id, day_of_week, workout)
VALUES (
  'climber-physique',
  'wednesday',
  '{
    "id": "wednesday-fat-incinerator",
    "day": "wednesday",
    "name": "Fat Incinerator",
    "focus": "cardio",
    "goal": "Glycogen Depletion -> Fat Oxidation.",
    "notes": [
      "Playlist: 170 BPM (Cadence Lock)",
      "This is the biggest calorie burner of the week"
    ],
    "exercises": [
      {
        "id": "wed-phase1",
        "name": "The Run",
        "form": "Cadence: 167+ SPM. Use 2% Incline to force turnover.",
        "notes": "2 Miles. Playlist: 170 BPM.",
        "duration": 1200
      },
      {
        "id": "wed-phase2",
        "name": "The Extended Velocity Hike",
        "form": "Every 5 mins, walk with hands overhead for 60 seconds (Heart Rate Hack).",
        "notes": "45-60 Minutes. 4.0 MPH / 8% Incline.",
        "duration": 3600
      }
    ],
    "finisher": [
      {
        "id": "wed-prehab-1",
        "name": "Tibialis Raises",
        "sets": 3,
        "reps": 25,
        "notes": "Post-workout prehab.",
        "youtubeVideoId": "VzIcGAgBiaM"
      }
    ]
  }'::jsonb
)
ON CONFLICT (routine_id, day_of_week)
DO UPDATE SET
  workout = EXCLUDED.workout,
  updated_at = NOW();

-- Thursday
INSERT INTO workout_definitions (routine_id, day_of_week, workout)
VALUES (
  'climber-physique',
  'thursday',
  '{
    "id": "thursday-endurance",
    "day": "thursday",
    "name": "Endurance",
    "focus": "cardio",
    "goal": "Caloric burn without impact damage.",
    "notes": [
      "Playlist: 170 BPM",
      "Lubricate toes before run",
      "Mid-foot strike (Shuffle)",
      "Recovery bike is mandatory - flushes lactic acid"
    ],
    "exercises": [
      {
        "id": "thu-run",
        "name": "Run",
        "form": "Slow (Zone 2). Breathe through nose. Mid-foot strike.",
        "notes": "4.0 to 5.0 Miles. Lubricate toes. Playlist: 170 BPM."
      },
      {
        "id": "thu-flush",
        "name": "Recovery Flush",
        "form": "Very light resistance.",
        "notes": "20 Mins Stationary Bike (Mandatory).",
        "duration": 1200
      }
    ]
  }'::jsonb
)
ON CONFLICT (routine_id, day_of_week)
DO UPDATE SET
  workout = EXCLUDED.workout,
  updated_at = NOW();

-- Friday
INSERT INTO workout_definitions (routine_id, day_of_week, workout)
VALUES (
  'climber-physique',
  'friday',
  '{
    "id": "friday-shin-saver-circuit",
    "day": "friday",
    "name": "The Shin-Saver Circuit",
    "focus": "conditioning",
    "goal": "Conditioning. Zero Rest.",
    "notes": [
      "4 Rounds: A -> B -> C -> D with No Rest between exercises",
      "Rest 2 mins after completing all 4 exercises, then repeat"
    ],
    "exercises": [
      {
        "id": "friday-circuit-a",
        "name": "Incline DB \"Y\" Raises",
        "reps": 15,
        "form": "Lie face down on incline bench. Arms form a Y.",
        "notes": "12-15 reps"
      },
      {
        "id": "friday-circuit-b",
        "name": "Push-ups",
        "reps": 20,
        "form": "Fast tempo",
        "notes": "15-20 reps",
        "youtubeVideoId": "WDIpL0pjun0"
      },
      {
        "id": "friday-circuit-c",
        "name": "Chest-Supported Row",
        "reps": 15,
        "form": "Neutral grip.",
        "notes": "12-15 reps",
        "isElbowSafe": true,
        "youtubeVideoId": "FTwvmczf7bE"
      },
      {
        "id": "friday-circuit-d",
        "name": "Rower Sprint OR Air Bike",
        "notes": "60 seconds Max Effort.",
        "duration": 60
      }
    ],
    "metabolicFlush": {
      "name": "The Metabolic Flush",
      "duration": 30,
      "exercises": [
        {
          "id": "fri-flush",
          "name": "Stationary Bike",
          "form": "Zone 2.",
          "notes": "30 Minutes",
          "duration": 1800
        }
      ]
    },
    "finisher": [
      {
        "id": "fri-rehab-1",
        "name": "DB Wrist Extension Eccentrics (Rehab)",
        "sets": 3,
        "reps": 15,
        "form": "Forearm on bench, palm down. Lift with help, lower slowly (5 sec).",
        "notes": "Elbow rehab finisher"
      }
    ]
  }'::jsonb
)
ON CONFLICT (routine_id, day_of_week)
DO UPDATE SET
  workout = EXCLUDED.workout,
  updated_at = NOW();

-- Saturday
INSERT INTO workout_definitions (routine_id, day_of_week, workout)
VALUES (
  'climber-physique',
  'saturday',
  '{
    "id": "saturday-hiit-sprints",
    "day": "saturday",
    "name": "HIIT Sprints",
    "focus": "hiit",
    "goal": "Speed & Power.",
    "notes": [
      "Playlist: 180 BPM",
      "Cushioned Running Shoes required"
    ],
    "warmup": {
      "name": "Warm-up",
      "duration": 5,
      "exercises": [
        {
          "id": "sat-warmup-1",
          "name": "5 min Jog",
          "notes": "Easy pace"
        }
      ]
    },
    "exercises": [
      {
        "id": "sat-intervals",
        "name": "HIIT Intervals",
        "form": "Cushioned Shoes. Playlist: 180 BPM.",
        "notes": "30 seconds Sprint (9.0+ mph) / 90 seconds Walk. 20 Mins total.",
        "duration": 1200
      }
    ],
    "finisher": [
      {
        "id": "sat-cooldown",
        "name": "Cool Down Walk",
        "notes": "20 min Walk",
        "duration": 1200
      },
      {
        "id": "sat-finisher",
        "name": "Frozen Water Bottle Roll (Foot Care)",
        "notes": "Roll frozen water bottle under feet immediately when home.",
        "duration": 300
      }
    ]
  }'::jsonb
)
ON CONFLICT (routine_id, day_of_week)
DO UPDATE SET
  workout = EXCLUDED.workout,
  updated_at = NOW();

-- Sunday (unchanged but included for completeness)
INSERT INTO workout_definitions (routine_id, day_of_week, workout)
VALUES (
  'climber-physique',
  'sunday',
  '{
    "id": "sunday-active-recovery",
    "day": "sunday",
    "name": "Active Recovery",
    "focus": "recovery",
    "goal": "No gym. Walking only.",
    "exercises": [
      {
        "id": "sun-walk",
        "name": "10,000 Steps",
        "notes": "No gym. Walk outside."
      }
    ]
  }'::jsonb
)
ON CONFLICT (routine_id, day_of_week)
DO UPDATE SET
  workout = EXCLUDED.workout,
  updated_at = NOW();

-- ============================================
-- UPDATE fitness_routines TABLE
-- (main routine record with latest data)
-- ============================================
UPDATE fitness_routines
SET
  name = 'Rock Climber & Lean Physique Protocol (V15 Elite)',
  user_profile = '{
    "goal": "Climber Physique (Wire-strong, vascular, 185 lb target)",
    "stats": {
      "height": "5''11\"",
      "weight": 196
    },
    "schedule": {
      "fasted": true,
      "startDay": "monday",
      "trainingTime": "12:00 PM",
      "trainingWindow": "2 Hours (12:00 PM - 2:00 PM)"
    },
    "shoeStrategy": {
      "cardio": ["Cushioned Running Shoes"],
      "lifting": ["Cushioned Running Shoes"]
    },
    "musicStrategy": {
      "wednesday": "170 BPM (Cadence Lock)",
      "thursday": "170 BPM (Cadence Lock)",
      "saturday": "180 BPM (Sprint Speed)"
    }
  }'::jsonb,
  injury_protocol = '{
    "name": "Achilles & Elbow Rehab Protocol",
    "status": "active",
    "description": "Combined Achilles tendon recovery and Golfer''s Elbow remodeling protocol",
    "rules": [
      "Achilles Saver: Wear Cushioned Running Shoes for ALL workouts (even lifting) for the next 7 days",
      "Incline Cap: Keep treadmill incline between 5% - 8%",
      "Elbow Remodeling: No weighted pulling. Use Straps for RDLs",
      "Daily Finger Extensions + Wrist Eccentrics",
      "Velocity Hike: Add SPEED not weight. Target 4.0 - 4.2 MPH Power Walk. Do not jog",
      "Salt Rule: 1 tsp Salt + Electrolytes in water during workout (Mandatory)",
      "Toe Lube Rule: Apply Vaseline/BodyGlide to toes before every run"
    ],
    "dailyRehab": [
      {
        "name": "Finger Extensions",
        "description": "Rubber band on fingers. Open wide.",
        "frequency": "daily",
        "sets": 2,
        "reps": 25
      },
      {
        "name": "DB Wrist Extension Eccentrics",
        "description": "Forearm on bench, palm down. Lift with help, lower slowly (5 sec) with bad arm.",
        "frequency": "workout days",
        "sets": 3,
        "reps": 15
      }
    ]
  }'::jsonb,
  schedule = '{
    "monday": {
      "focus": "Strength",
      "goal": "Lift (Elbow Safe) + 40m Bike + Wrist Rehab"
    },
    "tuesday": {
      "focus": "Core",
      "goal": "Core (Hollow Body) + 45m Velocity Hike"
    },
    "wednesday": {
      "focus": "Hybrid",
      "goal": "Run (2mi) + Hike (45-60m Velocity)"
    },
    "thursday": {
      "focus": "Endurance",
      "goal": "Run (4-5mi Slow) + 20m Spin Flush"
    },
    "friday": {
      "focus": "Circuit",
      "goal": "Circuit (DB Y-Raise) + 30m Bike"
    },
    "saturday": {
      "focus": "HIIT",
      "goal": "Sprints (20m) + Walk + Ice Bottle"
    },
    "sunday": {
      "focus": "Rest",
      "goal": "10k Steps (No Gym)"
    }
  }'::jsonb,
  daily_routines = '{
    "morning": {
      "id": "oil-the-hinge",
      "name": "The Morning Armor Routine",
      "type": "morning",
      "duration": 10,
      "description": "Do this immediately after waking up. Sequence matters.",
      "exercises": [
        {
          "name": "Isometric Heel Holds (Achilles Fix)",
          "action": "Stand on edge of step (or flat). Lift to toes. Hold 45 seconds.",
          "why": "Rebuilds Achilles tendon strength through isometric loading",
          "duration": 135,
          "sets": 3,
          "description": "Primary Achilles rehab exercise. Isometric holds build tendon resilience."
        },
        {
          "name": "Deep Squat Hold (Active)",
          "action": "Drop into deep squat. Use doorframe for balance if needed. Duration: 60 seconds.",
          "why": "Opens ankles, knees, and hips for the day",
          "duration": 60,
          "description": "Opens ankles, knees, and hips. Essential for climbing high-step moves."
        },
        {
          "name": "T-Spine Rotations",
          "action": "From squat or hands/knees, reach arm to sky. 5 reps per side.",
          "why": "Prevents hunchback posture from pulling and carrying",
          "duration": 60,
          "description": "Prevents developing a hunchback posture from all the pulling and carrying."
        },
        {
          "name": "Finger Extensions",
          "action": "Rubber band on fingers. Open wide. 2 sets x 25 reps.",
          "why": "Elbow rehab and grip balance",
          "sets": 2,
          "reps": 25,
          "description": "Counterbalances grip work and aids elbow remodeling."
        }
      ]
    },
    "night": {
      "id": "release-the-brakes",
      "name": "The Night Release Routine",
      "type": "night",
      "duration": 12,
      "description": "Do this right before bed.",
      "exercises": [
        {
          "name": "Couch Stretch (Mandatory)",
          "action": "Knee against wall. Squeeze glute. Hold: 2 Minutes per side.",
          "why": "Fixes tight hip flexors from running and hiking",
          "duration": 240,
          "description": "The #1 stretch. Running and hiking tighten hip flexors causing lower back pain and weak glutes."
        },
        {
          "name": "Frog Stretch",
          "action": "Knees wide, hips back. Hold 2 Mins.",
          "why": "Opens hips and inner thighs",
          "duration": 120,
          "description": "Deep hip opener for climbing and squatting mobility."
        },
        {
          "name": "Wrist Flexor Stretch",
          "action": "Gentle pull back on fingers. Hold 30s.",
          "why": "Elbow rehab - lengthens forearm flexors",
          "duration": 30,
          "description": "Part of elbow remodeling protocol. Lengthens tight forearm flexors."
        }
      ]
    }
  }'::jsonb,
  updated_at = NOW()
WHERE id = 'climber-physique';

import Foundation

enum WorkoutData {
    static let days: [Day] = [day1, day2, day3, day4, day5, day6, day7]
    
    // MARK: - Day 1: Density Strength (Monday)
    
    static let day1 = Day(
        id: 1,
        name: "Density Strength",
        shortName: "Heavy Lifts",
        goal: "Build wire-strong muscle density. Stop sets 1 rep before failure.",
        sections: [
            WorkoutSection(
                name: "Warm-up",
                subtitle: "The \"Armor\" Warm-up (8 Mins)",
                sectionType: .warmup,
                estimatedMinutes: 8,
                exercises: [
                    Exercise(name: "Rower/Elliptical", duration: "5 min", note: "Light sweat"),
                    Exercise(name: "Finger Extensions", sets: 2, reps: "20", note: "Use a rubber band around fingers; open hand wide", restSeconds: 30),
                    Exercise(name: "Scapular Pull-ups", sets: 2, reps: "10", note: "Hang straight, shrug shoulders down (keep arms straight)", restSeconds: 30),
                    Exercise(name: "Bodyweight Pull-ups", sets: 1, reps: "5", note: "Warm-up set"),
                    Exercise(name: "Light Press", sets: 1, reps: "5", note: "Warm-up set")
                ]
            ),
            WorkoutSection(
                name: "Workout",
                sectionType: .workout,
                estimatedMinutes: 35,
                exercises: [
                    Exercise(name: "Weighted Neutral-Grip Pull-ups", label: "A1", sets: 3, reps: "3-5", note: "Counter-Balance: Add weight if you lose body weight.", restSeconds: 120),
                    Exercise(name: "DB Push Press", label: "A2", sets: 3, reps: "4-6", note: "Slight leg dip to drive up, 3-second slow lower.", restSeconds: 120),
                    Exercise(name: "Romanian Deadlift (RDL)", label: "B1", sets: 3, reps: "5-6", note: "Hips back. Feel the hamstring stretch.", restSeconds: 90),
                    Exercise(name: "DB Reverse Lunges", label: "B2", sets: 3, reps: "8-10/leg", note: "Hold heavy DBs. Step back far. Drive through front heel to stand up fast.", restSeconds: 90),
                    Exercise(name: "Heavy Farmer's Carry", label: "C", sets: 3, reps: "Max Time", note: "Walk until grip fails.", restSeconds: 60),
                    Exercise(name: "Cable Pull-Throughs", label: "D", sets: 3, reps: "15-20", note: "Rope on low pulley, face away. Hinge hips back until hamstring stretch, snap hips forward and squeeze glutes. Don't pull with arms.", restSeconds: 60)
                ]
            ),
            WorkoutSection(
                name: "Cool Down",
                sectionType: .cooldown,
                estimatedMinutes: 2,
                exercises: [
                    Exercise(name: "Dead Hang", duration: "60 sec", note: "Decompress spine")
                ]
            )
        ]
    )
    
    // MARK: - Day 2: Waist, Core & Posture (Tuesday)
    
    static let day2 = Day(
        id: 2,
        name: "Waist, Core & Posture",
        shortName: "Core",
        goal: "Shrink waist diameter, improve posture, and vascularity.",
        sections: [
            WorkoutSection(
                name: "Warm-up",
                subtitle: "5 Mins",
                sectionType: .warmup,
                estimatedMinutes: 5,
                exercises: [
                    Exercise(name: "Incline Walk", duration: "5 min", note: "Easy pace"),
                    Exercise(name: "Cat-Cow Stretches", sets: 2, reps: "10", note: "Loosen spine", restSeconds: 30),
                    Exercise(name: "World's Greatest Stretch", sets: 2, reps: "5", note: "Deep lunge with rotation", restSeconds: 30)
                ]
            ),
            WorkoutSection(
                name: "Workout",
                sectionType: .workout,
                estimatedMinutes: 25,
                exercises: [
                    Exercise(name: "Cable Pallof Press", label: "A1", sets: 3, reps: "12/side", note: "Stand sideways to cable. Fight the rotation.", restSeconds: 45),
                    Exercise(name: "Ab Rollouts", label: "A2", sets: 3, reps: "10", note: "Pause at full extension. Keep back flat.", restSeconds: 45),
                    Exercise(name: "Hanging Knee Raises", label: "B", sets: 3, reps: "15", note: "Focus on curling your pelvis up, not just lifting legs.", restSeconds: 45),
                    Exercise(name: "Stomach Vacuums", label: "C", sets: 3, reps: "20 sec", note: "Exhale all air, suck navel to spine.", restSeconds: 30),
                    Exercise(name: "Plate Pinches", label: "D", sets: 3, reps: "Failure", note: "Pinch two 10lb plates (smooth side out) together.", restSeconds: 60),
                    Exercise(name: "Face Pulls", label: "E", sets: 3, reps: "15", note: "Use rope attachment. Pull to forehead. Squeeze rear delts to fix posture.", restSeconds: 45)
                ]
            ),
            WorkoutSection(
                name: "Cool Down",
                sectionType: .cooldown,
                estimatedMinutes: 3,
                exercises: [
                    Exercise(name: "Child's Pose", duration: "60 sec", note: "Arms extended, sink hips back"),
                    Exercise(name: "Supine Twist", duration: "30 sec/side", note: "Knees to one side, look opposite")
                ]
            )
        ]
    )
    
    // MARK: - Day 3: Fat Incinerator (Wednesday)
    
    static let day3 = Day(
        id: 3,
        name: "Fat Incinerator",
        shortName: "Hybrid Cardio",
        goal: "Glycogen Depletion → Fat Oxidation.",
        sections: [
            WorkoutSection(
                name: "Warm-up",
                sectionType: .warmup,
                estimatedMinutes: 3,
                exercises: [
                    Exercise(name: "Calf Pumps", sets: 1, reps: "20", note: "Wall stretch"),
                    Exercise(name: "Glute Bridges", sets: 2, reps: "15", note: "Wake up the glutes", restSeconds: 30)
                ]
            ),
            WorkoutSection(
                name: "The Protocol",
                subtitle: "Run → Hike (switch activity after run)",
                sectionType: .workout,
                estimatedMinutes: 40,
                exercises: [
                    Exercise(name: "The Run", duration: "~20 min", note: "Exactly 2 Miles @ 10:00-10:30 pace. Zone 2 breathing (nose only if possible). Save your knees."),
                    Exercise(name: "The Hike", duration: "20 min", note: "15% incline, 3.0 MPH. HANDS OFF RAILS. Switch to Incline Walk activity.")
                ]
            ),
            WorkoutSection(
                name: "Pre-hab",
                subtitle: "Injury Prevention",
                sectionType: .prehab,
                estimatedMinutes: 5,
                exercises: [
                    Exercise(name: "Tibialis Raises", sets: 3, reps: "25", note: "Lean butt against wall, lift toes to shins (wall leans).", restSeconds: 30),
                    Exercise(name: "Pigeon Pose", duration: "60 sec/side", note: "Hold 60 seconds per side to open hips.")
                ]
            ),
            WorkoutSection(
                name: "Cool Down",
                sectionType: .cooldown,
                estimatedMinutes: 3,
                exercises: [
                    Exercise(name: "Standing Quad Stretch", duration: "30 sec/side", note: "Hold wall for balance"),
                    Exercise(name: "Calf Stretch", duration: "30 sec/side", note: "Against wall, heel down")
                ]
            )
        ]
    )
    
    // MARK: - Day 4: Active Recovery (Thursday)
    
    static let day4 = Day(
        id: 4,
        name: "Active Recovery",
        shortName: "Rest Day",
        goal: "System reset. No Gym.",
        sections: [
            WorkoutSection(
                name: "Recovery",
                sectionType: .recovery,
                exercises: [
                    Exercise(name: "10,000 Steps", note: "Walk outside. No running."),
                    Exercise(name: "Foam Rolling", duration: "5-10 min", note: "Optional: Quads, IT band, upper back")
                ]
            )
        ]
    )
    
    // MARK: - Day 5: The Climber's Circuit (Friday)
    
    static let day5 = Day(
        id: 5,
        name: "The Climber's Circuit",
        shortName: "Metabolic",
        goal: "Metabolic conditioning. High speed. Zero Rest.",
        sections: [
            WorkoutSection(
                name: "Warm-up",
                sectionType: .warmup,
                estimatedMinutes: 7,
                exercises: [
                    Exercise(name: "Rowing Machine", duration: "5 min", note: "Moderate pace"),
                    Exercise(name: "Reverse Wrist Curls", sets: 2, reps: "15", note: "Palms down, lift knuckles. Protects elbows.", restSeconds: 30)
                ]
            ),
            WorkoutSection(
                name: "Circuit",
                subtitle: "A→B→C→D with zero rest. Rest 2 mins after D.",
                sectionType: .circuit,
                rounds: 4,
                estimatedMinutes: 20,
                exercises: [
                    Exercise(name: "Inverted Rows", label: "A", reps: "12-15", note: "Smith Machine bar or TRX. Pull chest to bar fast."),
                    Exercise(name: "Push-ups", label: "B", reps: "15-20", note: "Fast tempo."),
                    Exercise(name: "Dumbbell Rows", label: "C", reps: "12/side", note: "Full stretch."),
                    Exercise(name: "Jump Rope", label: "D", duration: "60 sec", note: "Fast spin.", restSeconds: 120)
                ]
            ),
            WorkoutSection(
                name: "Finisher",
                sectionType: .finisher,
                estimatedMinutes: 5,
                exercises: [
                    Exercise(name: "Dead Hang", sets: 3, reps: "Failure", note: "Absolute failure. Go to the limit.", restSeconds: 60)
                ]
            ),
            WorkoutSection(
                name: "Cool Down",
                sectionType: .cooldown,
                estimatedMinutes: 3,
                exercises: [
                    Exercise(name: "Doorway Chest Stretch", duration: "30 sec/side", note: "Arm against doorframe, lean through"),
                    Exercise(name: "Lat Stretch", duration: "30 sec/side", note: "Grab fixed object, sink hips away")
                ]
            )
        ]
    )
    
    // MARK: - Day 6: HIIT Sprints (Saturday)
    
    static let day6 = Day(
        id: 6,
        name: "HIIT Sprints",
        shortName: "Sprints",
        goal: "EPOC (Afterburn). Maximum calorie burn.",
        sections: [
            WorkoutSection(
                name: "Warm-up",
                sectionType: .warmup,
                estimatedMinutes: 7,
                exercises: [
                    Exercise(name: "Jog", duration: "5 min", note: "0% incline, slow"),
                    Exercise(name: "Dynamic Drills", duration: "2 min", note: "High Knees, Butt Kicks")
                ]
            ),
            WorkoutSection(
                name: "Workout",
                subtitle: "20 Minutes",
                sectionType: .workout,
                estimatedMinutes: 20,
                exercises: [
                    Exercise(name: "Intervals", duration: "20 min", note: "30s Sprint (9.0+ MPH) / 90s Walk (3.0 MPH). 0-1% Incline only. Do not sprint on hills (Achilles risk).")
                ]
            ),
            WorkoutSection(
                name: "Cool Down",
                sectionType: .cooldown,
                estimatedMinutes: 5,
                exercises: [
                    Exercise(name: "Walk", duration: "3 min", note: "Gradually slow pace, bring HR down"),
                    Exercise(name: "Stomach Vacuums", sets: 4, reps: "20 sec", note: "Exhale all air, suck navel to spine.", restSeconds: 15)
                ]
            )
        ]
    )
    
    // MARK: - Day 7: Active Recovery (Sunday)
    
    static let day7 = Day(
        id: 7,
        name: "Active Recovery",
        shortName: "Rest Day",
        goal: "System reset. Prepare for Monday.",
        sections: [
            WorkoutSection(
                name: "Recovery",
                sectionType: .recovery,
                exercises: [
                    Exercise(name: "10,000 Steps", note: "Walk outside. Prepare meals for Monday."),
                    Exercise(name: "Stretching", duration: "10 min", note: "Optional: Full body mobility routine")
                ]
            )
        ]
    )
}

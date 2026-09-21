import Foundation

/// Maps API workout models to watch app models (Day, WorkoutSection, Exercise)
/// Maintains backward compatibility by replicating the exact ID generation algorithm
enum WorkoutMapper {

    // MARK: - Day Mapping

    /// Map API workouts to watch app Day models
    /// - Parameter apiWorkouts: Dictionary of day name -> APIWorkout
    /// - Returns: Array of Day models sorted by day number
    static func mapToDays(_ apiWorkouts: [String: APIWorkout]) -> [Day] {
        let dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

        return dayOrder.compactMap { dayName -> Day? in
            guard let apiWorkout = apiWorkouts[dayName] else { return nil }

            let dayNumber = dayOrder.firstIndex(of: dayName)! + 1
            return mapToDay(apiWorkout, dayNumber: dayNumber)
        }
    }

    /// Map a single API workout to a Day model
    static func mapToDay(_ api: APIWorkout, dayNumber: Int) -> Day {
        var sections: [WorkoutSection] = []

        // Warmup section
        if let warmup = api.warmup {
            sections.append(WorkoutSection(
                name: warmup.name,
                subtitle: warmup.duration.map { "\($0) Mins" },
                sectionType: .warmup,
                estimatedMinutes: warmup.duration,
                exercises: warmup.exercises.map { mapToExercise($0) }
            ))
        }

        // Main workout section
        if !api.exercises.isEmpty {
            // Determine section type based on focus
            let sectionType: SectionType = api.focus == "conditioning" ? .circuit : .workout
            let rounds = api.focus == "conditioning" ? 4 : nil  // Circuit rounds

            sections.append(WorkoutSection(
                name: "Workout",
                subtitle: api.notes?.first,
                sectionType: sectionType,
                rounds: rounds,
                estimatedMinutes: api.duration,
                exercises: api.exercises.map { mapToExercise($0) }
            ))
        }

        // Finisher section
        if let finisher = api.finisher, !finisher.isEmpty {
            sections.append(WorkoutSection(
                name: "Finisher",
                sectionType: .finisher,
                exercises: finisher.map { mapToExercise($0) }
            ))
        }

        // Metabolic Flush section
        if let metabolicFlush = api.metabolicFlush {
            sections.append(WorkoutSection(
                name: metabolicFlush.name,
                sectionType: .cooldown,
                estimatedMinutes: metabolicFlush.duration,
                exercises: metabolicFlush.exercises.map { mapToExercise($0) }
            ))
        }

        // Mobility/Cool Down section
        if let mobility = api.mobility {
            sections.append(WorkoutSection(
                name: mobility.name,
                subtitle: mobility.duration.map { "\($0) Mins" },
                sectionType: .cooldown,
                estimatedMinutes: mobility.duration,
                exercises: mobility.exercises.map { mapToExercise($0) }
            ))
        }

        // Derive short name from workout name
        let shortName = deriveShortName(from: api.name, focus: api.focus)

        return Day(
            id: dayNumber,
            name: api.name,
            shortName: shortName,
            goal: api.goal ?? api.name,
            sections: sections
        )
    }

    // MARK: - Exercise Mapping

    /// Map API exercise to watch app Exercise model
    /// Extracts label from exercise ID (e.g., "monday-a1" -> "A1")
    static func mapToExercise(_ api: APIExercise) -> Exercise {
        // Extract label from ID (e.g., "monday-a1" -> "A1", "friday-circuit-a" -> "A")
        let label = extractLabel(from: api.id)

        // Format reps string
        let repsString: String? = {
            if let reps = api.reps {
                return "\(reps)"
            }
            return nil
        }()

        // Format duration string
        let durationString: String? = {
            guard let duration = api.duration else { return nil }
            if duration >= 60 {
                let mins = duration / 60
                let secs = duration % 60
                if secs > 0 {
                    return "\(mins) min \(secs) sec"
                }
                return "\(mins) min"
            }
            return "\(duration) sec"
        }()

        // Build note from form and notes
        let note = buildNote(form: api.form, notes: api.notes)

        return Exercise(
            name: api.name,
            label: label,
            sets: api.sets,
            reps: repsString,
            duration: durationString,
            note: note,
            restSeconds: api.rest
        )
    }

    // MARK: - Helper Functions

    /// Extract superset/circuit label from exercise ID
    /// Examples:
    ///   "monday-a1" -> "A1"
    ///   "monday-a2" -> "A2"
    ///   "monday-b1" -> "B1"
    ///   "friday-circuit-a" -> "A"
    ///   "warmup-1" -> nil (warmup exercises don't get labels)
    private static func extractLabel(from exerciseId: String) -> String? {
        let id = exerciseId.lowercased()

        // Skip warmup, mobility, flush exercises
        if id.contains("warmup") || id.contains("mobility") || id.contains("flush") {
            return nil
        }

        // Pattern 1: "day-letter+number" (e.g., "monday-a1", "monday-b2")
        // Extract the last component after the day name
        let components = id.split(separator: "-")
        guard components.count >= 2 else { return nil }

        let lastComponent = String(components.last!)

        // Check if it's a letter+number pattern (a1, b2, c1, etc.)
        if lastComponent.count <= 3 {
            let firstChar = lastComponent.first!
            if firstChar.isLetter {
                // Has number after letter (a1, b2)
                if lastComponent.count > 1 && lastComponent.dropFirst().allSatisfy({ $0.isNumber }) {
                    return lastComponent.uppercased()
                }
                // Just a letter (a, b, c for circuit)
                return String(firstChar).uppercased()
            }
        }

        // Pattern 2: "day-section-letter" (e.g., "friday-circuit-a")
        if components.count >= 3 {
            let lastChar = components.last!
            if lastChar.count == 1 && lastChar.first!.isLetter {
                return String(lastChar).uppercased()
            }
        }

        return nil
    }

    /// Build note string from form and notes fields
    private static func buildNote(form: String?, notes: String?) -> String? {
        switch (form, notes) {
        case let (f?, n?):
            return "\(f) \(n)"
        case let (f?, nil):
            return f
        case let (nil, n?):
            return n
        case (nil, nil):
            return nil
        }
    }

    /// Derive a short name for the workout
    private static func deriveShortName(from name: String, focus: String) -> String {
        // Map common patterns
        let lowercaseName = name.lowercased()

        if lowercaseName.contains("density") || lowercaseName.contains("strength") {
            return "Heavy Lifts"
        }
        if lowercaseName.contains("core") || lowercaseName.contains("waist") || lowercaseName.contains("posture") {
            return "Core"
        }
        if lowercaseName.contains("hybrid") || lowercaseName.contains("cardio") {
            return "Hybrid Cardio"
        }
        if lowercaseName.contains("recovery") {
            return "Rest Day"
        }
        if lowercaseName.contains("circuit") || lowercaseName.contains("climber") || lowercaseName.contains("shin") {
            return "Metabolic"
        }
        if lowercaseName.contains("hiit") || lowercaseName.contains("sprint") {
            return "Sprints"
        }

        // Fallback to focus-based name
        switch focus.lowercased() {
        case "strength":
            return "Strength"
        case "core":
            return "Core"
        case "cardio":
            return "Cardio"
        case "recovery":
            return "Rest Day"
        case "conditioning", "hiit":
            return "Metabolic"
        default:
            return "Workout"
        }
    }
}

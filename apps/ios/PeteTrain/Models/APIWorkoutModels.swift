import Foundation

// MARK: - API Response Wrapper

/// Response wrapper for workout definitions API
struct APIWorkoutDefinitionsResponse: Codable {
    let success: Bool
    let data: APIWorkoutDefinitionsData?
    let error: String?
}

/// Data payload containing definitions and version info
struct APIWorkoutDefinitionsData: Codable {
    let definitions: [String: APIWorkout]
    let version: APIVersionInfo?
}

/// Version info from the active routine version
struct APIVersionInfo: Codable {
    let number: Int
    let name: String
    let activatedAt: String?
}

// MARK: - Workout Definition

/// Workout definition from the Petehome API
/// Maps to fitness.types.ts Workout interface
struct APIWorkout: Codable {
    let id: String
    let name: String
    let focus: String
    let day: String
    let description: String?
    let goal: String?
    let warmup: APIWarmup?
    let exercises: [APIExercise]
    let finisher: [APIExercise]?
    let metabolicFlush: APIWorkoutSection?
    let mobility: APIWorkoutSection?
    let duration: Int?
    let notes: [String]?
}

// MARK: - Warmup

/// Warmup section from the API
struct APIWarmup: Codable {
    let name: String
    let exercises: [APIExercise]
    let duration: Int?
}

// MARK: - Workout Section

/// Generic workout section (metabolicFlush, mobility)
struct APIWorkoutSection: Codable {
    let name: String
    let duration: Int?
    let exercises: [APIExercise]
}

// MARK: - Exercise

/// Exercise definition from the API
/// Maps to fitness.types.ts Exercise interface
struct APIExercise: Codable {
    let id: String
    let name: String
    let sets: Int?
    let reps: Int?
    let weight: Int?
    let duration: Int?  // in seconds
    let rest: Int?      // in seconds
    let notes: String?
    let form: String?
    let isElbowSafe: Bool?
    let isStandard: Bool?
    let youtubeVideoId: String?
    let alternative: APIExerciseAlternative?
}

// MARK: - Exercise Alternative

/// Alternative exercise option
struct APIExerciseAlternative: Codable {
    let name: String
    let sets: Int?
    let reps: Int?
    let form: String?
    let youtubeVideoId: String?
}

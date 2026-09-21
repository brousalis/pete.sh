import Foundation

// MARK: - Section Type

/// Classifies sections for HealthKit activity switching and UI theming
enum SectionType: String, CaseIterable {
    case warmup      // Light cardio, mobility - could be tracked as separate activity
    case workout     // Main working sets - primary activity type
    case circuit     // Circuit training - zero rest between exercises, rest between rounds
    case cooldown    // Stretching, decompression - lower intensity
    case prehab      // Injury prevention work - similar to cooldown
    case finisher    // High intensity end - still part of main workout
    case recovery    // Active recovery days - walking, mobility
    
    /// Color for UI theming
    var themeColor: String {
        switch self {
        case .warmup: return "orange"
        case .workout: return "green"
        case .circuit: return "yellow"
        case .cooldown: return "cyan"
        case .prehab: return "blue"
        case .finisher: return "red"
        case .recovery: return "purple"
        }
    }
    
    /// SF Symbol for section type
    var icon: String {
        switch self {
        case .warmup: return "flame"
        case .workout: return "figure.strengthtraining.traditional"
        case .circuit: return "arrow.trianglehead.2.clockwise.rotate.90"
        case .cooldown: return "wind"
        case .prehab: return "bandage"
        case .finisher: return "bolt.fill"
        case .recovery: return "heart.fill"
        }
    }
    
    /// Whether this section counts toward main workout completion
    var countsTowardCompletion: Bool {
        switch self {
        case .warmup, .cooldown, .prehab: return false
        case .workout, .circuit, .finisher, .recovery: return true
        }
    }
    
    /// Suggested HealthKit activity type for this section
    var suggestedActivityType: String {
        switch self {
        case .warmup: return "mixedCardio"
        case .workout: return "functionalStrength"
        case .circuit: return "functionalStrength"
        case .cooldown: return "flexibility"
        case .prehab: return "flexibility"
        case .finisher: return "functionalStrength"
        case .recovery: return "walking"
        }
    }
}

// MARK: - Workout Section

struct WorkoutSection: Identifiable, Hashable {
    let id: UUID
    let name: String
    let subtitle: String?
    let sectionType: SectionType
    let exercises: [Exercise]
    
    /// For circuit sections - how many rounds to complete
    let rounds: Int?
    
    /// Estimated duration in minutes (for time planning)
    let estimatedMinutes: Int?
    
    init(
        id: UUID = UUID(),
        name: String,
        subtitle: String? = nil,
        sectionType: SectionType = .workout,
        rounds: Int? = nil,
        estimatedMinutes: Int? = nil,
        exercises: [Exercise]
    ) {
        self.id = id
        self.name = name
        self.subtitle = subtitle
        self.sectionType = sectionType
        self.rounds = rounds
        self.estimatedMinutes = estimatedMinutes
        self.exercises = exercises
    }
    
    /// Whether this is a circuit with multiple rounds
    var isCircuit: Bool {
        sectionType == .circuit && (rounds ?? 1) > 1
    }
    
    /// Total exercises including rounds (e.g., 4 exercises × 4 rounds = 16)
    var totalExerciseInstances: Int {
        exercises.count * (rounds ?? 1)
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: WorkoutSection, rhs: WorkoutSection) -> Bool {
        lhs.id == rhs.id
    }
}

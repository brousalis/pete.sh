import Foundation

struct Day: Identifiable, Hashable {
    let id: Int
    let name: String
    let shortName: String
    let goal: String
    let sections: [WorkoutSection]
    
    // MARK: - Activity Type Configuration
    
    /// The starting activity type for this day's workout
    /// This is what the workout begins with - no picker needed for single-activity days
    var startingActivityType: WorkoutActivityType {
        switch id {
        case 1: return .functionalStrength  // Density Strength - heavy compound lifts
        case 2: return .functionalStrength  // Core & Posture - stability work
        case 3: return .indoorRun           // Hybrid Cardio - starts with treadmill run
        case 4: return .inclineWalk         // Active Recovery (if tracked)
        case 5: return .functionalStrength  // Climber's Circuit - metabolic resistance
        case 6: return .hiit                // HIIT Sprints - true interval training
        case 7: return .inclineWalk         // Active Recovery (if tracked)
        default: return .functionalStrength
        }
    }
    
    /// Whether this day has multiple activity phases that require switching
    /// If true, we'll auto-prompt to switch at defined transition points
    var isMultiActivityDay: Bool {
        switch id {
        case 3: return true   // Day 3: Run → Walk
        default: return false
        }
    }
    
    /// Exercise transitions - when completing exercise ID (key), switch to activity type (value)
    /// This maps "completing THIS exercise" → "switch to THIS activity for the next one"
    var exerciseTransitions: [String: WorkoutActivityType] {
        switch id {
        case 3:
            // Day 3: After completing "The Run" → switch to Walking for "The Hike"
            return ["the-run": .inclineWalk]
        default:
            return [:]
        }
    }
    
    /// Whether this is a recovery/rest day (passive step tracking, no live workout)
    var isRecoveryDay: Bool {
        id == 4 || id == 7
    }
    
    
    // MARK: - Computed Properties
    
    var totalExercises: Int {
        sections.reduce(0) { $0 + $1.exercises.count }
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Day, rhs: Day) -> Bool {
        lhs.id == rhs.id
    }
}



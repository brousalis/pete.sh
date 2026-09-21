import Foundation
import SwiftData

/// Tracks performance data for a specific exercise instance
@Model
final class ExerciseLog {
    var id: UUID = UUID()
    var date: Date = Date()
    var exerciseId: String = ""  // Stable exercise ID
    var dayNumber: Int = 1
    
    // Performance data
    var weightUsed: Double?       // Weight in lbs
    var repsCompleted: Int?       // Actual reps done
    var setsCompleted: Int?       // Actual sets done
    var durationSeconds: Int?     // Time for duration-based exercises
    var distance: Double?         // Distance in meters (for runs/walks)
    
    // Notes
    var notes: String?
    var difficulty: Difficulty?   // How hard it felt
    
    enum Difficulty: Int, Codable, CaseIterable {
        case tooEasy = 1
        case justRight = 2
        case challenging = 3
        case tooHard = 4
        
        var label: String {
            switch self {
            case .tooEasy: return "Too Easy"
            case .justRight: return "Just Right"
            case .challenging: return "Challenging"
            case .tooHard: return "Too Hard"
            }
        }
        
        var emoji: String {
            switch self {
            case .tooEasy: return "😴"
            case .justRight: return "💪"
            case .challenging: return "🔥"
            case .tooHard: return "😵"
            }
        }
    }
    
    init(
        id: UUID = UUID(),
        date: Date = Date(),
        exerciseId: String,
        dayNumber: Int,
        weightUsed: Double? = nil,
        repsCompleted: Int? = nil,
        setsCompleted: Int? = nil,
        durationSeconds: Int? = nil,
        distance: Double? = nil,
        notes: String? = nil,
        difficulty: Difficulty? = nil
    ) {
        self.id = id
        self.date = date
        self.exerciseId = exerciseId
        self.dayNumber = dayNumber
        self.weightUsed = weightUsed
        self.repsCompleted = repsCompleted
        self.setsCompleted = setsCompleted
        self.durationSeconds = durationSeconds
        self.distance = distance
        self.notes = notes
        self.difficulty = difficulty
    }
    
    var formattedWeight: String? {
        guard let weight = weightUsed else { return nil }
        if weight == floor(weight) {
            return "\(Int(weight)) lbs"
        }
        return String(format: "%.1f lbs", weight)
    }
    
    var formattedDuration: String? {
        guard let duration = durationSeconds else { return nil }
        let minutes = duration / 60
        let seconds = duration % 60
        if minutes > 0 {
            return "\(minutes)m \(seconds)s"
        }
        return "\(seconds)s"
    }
}

// MARK: - Personal Record

@Model
final class PersonalRecord {
    var id: UUID = UUID()
    var exerciseId: String = ""
    var recordType: RecordType = PersonalRecord.RecordType.maxWeight
    var value: Double = 0.0           // Weight, reps, time, or distance
    var date: Date = Date()
    var notes: String?
    
    enum RecordType: Int, Codable {
        case maxWeight = 0
        case maxReps = 1
        case maxDuration = 2
        case maxDistance = 3
        case fastestTime = 4
        
        var label: String {
            switch self {
            case .maxWeight: return "Max Weight"
            case .maxReps: return "Max Reps"
            case .maxDuration: return "Longest Duration"
            case .maxDistance: return "Longest Distance"
            case .fastestTime: return "Fastest Time"
            }
        }
        
        var icon: String {
            switch self {
            case .maxWeight: return "scalemass.fill"
            case .maxReps: return "repeat"
            case .maxDuration: return "timer"
            case .maxDistance: return "figure.run"
            case .fastestTime: return "bolt.fill"
            }
        }
    }
    
    init(
        id: UUID = UUID(),
        exerciseId: String,
        recordType: RecordType,
        value: Double,
        date: Date = Date(),
        notes: String? = nil
    ) {
        self.id = id
        self.exerciseId = exerciseId
        self.recordType = recordType
        self.value = value
        self.date = date
        self.notes = notes
    }
    
    var formattedValue: String {
        switch recordType {
        case .maxWeight:
            return value == floor(value) ? "\(Int(value)) lbs" : String(format: "%.1f lbs", value)
        case .maxReps:
            return "\(Int(value)) reps"
        case .maxDuration:
            let minutes = Int(value) / 60
            let seconds = Int(value) % 60
            return minutes > 0 ? "\(minutes)m \(seconds)s" : "\(seconds)s"
        case .maxDistance:
            let km = value / 1000
            return String(format: "%.2f km", km)
        case .fastestTime:
            let hours = Int(value) / 3600
            let minutes = (Int(value) % 3600) / 60
            let seconds = Int(value) % 60
            
            if hours > 0 {
                return String(format: "%d:%02d:%02d", hours, minutes, seconds)
            } else {
                return String(format: "%d:%02d", minutes, seconds)
            }
        }
    }
}

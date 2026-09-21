import Foundation

struct Exercise: Identifiable, Hashable {
    /// Stable ID derived from exercise name and label - survives app rebuilds
    let id: String
    let name: String
    let label: String?
    let sets: Int?
    let reps: String?
    let duration: String?
    let note: String?
    /// Default rest time in seconds (nil means no specific rest)
    let restSeconds: Int?
    
    init(
        name: String,
        label: String? = nil,
        sets: Int? = nil,
        reps: String? = nil,
        duration: String? = nil,
        note: String? = nil,
        restSeconds: Int? = nil
    ) {
        // Create stable ID from name + label
        let baseId = name.lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
            .replacingOccurrences(of: "/", with: "-")
        
        if let label = label {
            self.id = "\(label.lowercased())-\(baseId)"
        } else {
            self.id = baseId
        }
        
        self.name = name
        self.label = label
        self.sets = sets
        self.reps = reps
        self.duration = duration
        self.note = note
        self.restSeconds = restSeconds
    }
    
    var formattedSetsReps: String? {
        if let sets = sets, let reps = reps {
            return "\(sets)×\(reps)"
        } else if let reps = reps {
            return reps
        } else if let duration = duration {
            return duration
        }
        return nil
    }
    
    /// Whether this exercise has a duration (vs sets/reps)
    var isDurationBased: Bool {
        duration != nil && sets == nil
    }
    
    /// Parse duration string to seconds (e.g., "30 sec" -> 30, "5 min" -> 300)
    var durationSeconds: Int? {
        guard let duration = duration else { return nil }
        let lowered = duration.lowercased()
        
        // Handle "30-60 sec" -> take first number
        let numbers = lowered.components(separatedBy: CharacterSet.decimalDigits.inverted)
            .compactMap { Int($0) }
            .filter { $0 > 0 }
        
        guard let firstNumber = numbers.first else { return nil }
        
        if lowered.contains("min") {
            return firstNumber * 60
        } else {
            return firstNumber
        }
    }
    
    /// Extract superset group letter from label (e.g., "A1" -> "A", "B2" -> "B")
    var supersetGroup: String? {
        guard let label = label else { return nil }
        // Extract just the letter portion (A, B, C, etc.)
        let letters = label.filter { $0.isLetter }
        return letters.isEmpty ? nil : letters
    }
    
    /// Check if this exercise is part of a superset (has number in label like A1, A2)
    var isSuperset: Bool {
        guard let label = label else { return false }
        let hasLetter = label.contains { $0.isLetter }
        let hasNumber = label.contains { $0.isNumber }
        return hasLetter && hasNumber
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Exercise, rhs: Exercise) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Superset Grouping Helper

struct ExerciseGroup: Identifiable {
    let id: String
    let groupLabel: String?  // "A", "B", "C" or nil for ungrouped
    let exercises: [Exercise]
    
    var isSuperset: Bool {
        exercises.count > 1 && groupLabel != nil
    }
    
    /// Get rest time for the group (use the last exercise's rest time)
    var restSeconds: Int? {
        exercises.last?.restSeconds
    }
}

extension Array where Element == Exercise {
    /// Groups exercises by their superset label (A, B, C, etc.)
    /// Ungrouped exercises get their own single-item group
    func groupedBySupersets() -> [ExerciseGroup] {
        var groups: [ExerciseGroup] = []
        var currentGroup: (label: String?, exercises: [Exercise]) = (nil, [])
        
        for exercise in self {
            let groupLabel = exercise.supersetGroup
            
            if let label = groupLabel {
                // This exercise has a superset label
                if currentGroup.label == label {
                    // Same group, add to it
                    currentGroup.exercises.append(exercise)
                } else {
                    // Different group - save current and start new
                    if !currentGroup.exercises.isEmpty {
                        groups.append(ExerciseGroup(
                            id: currentGroup.label ?? UUID().uuidString,
                            groupLabel: currentGroup.label,
                            exercises: currentGroup.exercises
                        ))
                    }
                    currentGroup = (label, [exercise])
                }
            } else {
                // No superset label - save current group and add this as standalone
                if !currentGroup.exercises.isEmpty {
                    groups.append(ExerciseGroup(
                        id: currentGroup.label ?? UUID().uuidString,
                        groupLabel: currentGroup.label,
                        exercises: currentGroup.exercises
                    ))
                    currentGroup = (nil, [])
                }
                // Add standalone exercise
                groups.append(ExerciseGroup(
                    id: exercise.id,
                    groupLabel: nil,
                    exercises: [exercise]
                ))
            }
        }
        
        // Don't forget the last group
        if !currentGroup.exercises.isEmpty {
            groups.append(ExerciseGroup(
                id: currentGroup.label ?? UUID().uuidString,
                groupLabel: currentGroup.label,
                exercises: currentGroup.exercises
            ))
        }
        
        return groups
    }
}




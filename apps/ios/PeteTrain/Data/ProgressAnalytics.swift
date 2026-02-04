import Foundation
import SwiftData

/// Analytics engine for progressive overload tracking
@MainActor
@Observable
final class ProgressAnalytics {
    
    static let shared = ProgressAnalytics()
    
    private var modelContext: ModelContext?
    
    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    // MARK: - Exercise Progress Data
    
    struct ExerciseProgressPoint: Identifiable {
        let id = UUID()
        let date: Date
        let weight: Double?
        let reps: Int?
        let volume: Double? // sets × reps × weight
        let difficulty: ExerciseLog.Difficulty?
    }
    
    struct ExerciseProgress {
        let exerciseId: String
        let exerciseName: String
        let dataPoints: [ExerciseProgressPoint]
        let currentMax: Double?
        let previousMax: Double?
        let improvement: Double? // percentage
        let estimatedOneRepMax: Double?
        let avgDifficulty: Double?
    }
    
    /// Get progress history for a specific exercise
    func getExerciseProgress(exerciseId: String, exerciseName: String, limit: Int = 20) -> ExerciseProgress {
        guard let modelContext = modelContext else {
            return ExerciseProgress(exerciseId: exerciseId, exerciseName: exerciseName, dataPoints: [], currentMax: nil, previousMax: nil, improvement: nil, estimatedOneRepMax: nil, avgDifficulty: nil)
        }
        
        let predicate = #Predicate<ExerciseLog> { log in
            log.exerciseId == exerciseId
        }
        
        var descriptor = FetchDescriptor<ExerciseLog>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        descriptor.fetchLimit = limit
        
        do {
            let logs = try modelContext.fetch(descriptor)
            let reversedLogs = logs.reversed() // chronological order
            
            let dataPoints = reversedLogs.map { log in
                let volume: Double? = {
                    guard let weight = log.weightUsed,
                          let reps = log.repsCompleted else { return nil }
                    let sets = log.setsCompleted ?? 1
                    return Double(sets) * Double(reps) * weight
                }()
                
                return ExerciseProgressPoint(
                    date: log.date,
                    weight: log.weightUsed,
                    reps: log.repsCompleted,
                    volume: volume,
                    difficulty: log.difficulty
                )
            }
            
            // Calculate max weights
            let weights = dataPoints.compactMap { $0.weight }
            let currentMax = weights.last
            let previousMax = weights.dropLast().max()
            
            // Calculate improvement
            let improvement: Double? = {
                guard let current = currentMax, let previous = previousMax, previous > 0 else { return nil }
                return ((current - previous) / previous) * 100
            }()
            
            // Estimated 1RM using Brzycki formula: weight × (36 / (37 - reps))
            let estimatedOneRepMax: Double? = {
                guard let lastLog = logs.first,
                      let weight = lastLog.weightUsed,
                      let reps = lastLog.repsCompleted,
                      reps > 0 && reps < 37 else { return nil }
                return weight * (36.0 / (37.0 - Double(reps)))
            }()
            
            // Average difficulty
            let difficulties = dataPoints.compactMap { $0.difficulty?.rawValue }
            let avgDifficulty = difficulties.isEmpty ? nil : Double(difficulties.reduce(0, +)) / Double(difficulties.count)
            
            return ExerciseProgress(
                exerciseId: exerciseId,
                exerciseName: exerciseName,
                dataPoints: Array(dataPoints),
                currentMax: currentMax,
                previousMax: previousMax,
                improvement: improvement,
                estimatedOneRepMax: estimatedOneRepMax,
                avgDifficulty: avgDifficulty
            )
        } catch {
            return ExerciseProgress(exerciseId: exerciseId, exerciseName: exerciseName, dataPoints: [], currentMax: nil, previousMax: nil, improvement: nil, estimatedOneRepMax: nil, avgDifficulty: nil)
        }
    }
    
    /// Get last N sessions for an exercise
    func getLastSessions(exerciseId: String, count: Int = 4) -> [ExerciseLog] {
        guard let modelContext = modelContext else { return [] }
        
        let predicate = #Predicate<ExerciseLog> { log in
            log.exerciseId == exerciseId
        }
        
        var descriptor = FetchDescriptor<ExerciseLog>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        descriptor.fetchLimit = count
        
        do {
            return try modelContext.fetch(descriptor)
        } catch {
            return []
        }
    }

    // MARK: - Comparison Helpers
    
    struct SessionComparison {
        let current: ExerciseLog?
        let previous: ExerciseLog?
        let weightChange: Double?
        let repChange: Int?
        let trend: Trend
        
        enum Trend {
            case improving, maintaining, declining, noData
            
            var icon: String {
                switch self {
                case .improving: return "arrow.up.right"
                case .maintaining: return "arrow.right"
                case .declining: return "arrow.down.right"
                case .noData: return "minus"
                }
            }
            
            var color: String {
                switch self {
                case .improving: return "green"
                case .maintaining: return "orange"
                case .declining: return "red"
                case .noData: return "gray"
                }
            }
        }
    }
    
    func compareLastTwoSessions(exerciseId: String) -> SessionComparison {
        let sessions = getLastSessions(exerciseId: exerciseId, count: 2)
        
        guard let current = sessions.first else {
            return SessionComparison(current: nil, previous: nil, weightChange: nil, repChange: nil, trend: .noData)
        }
        
        guard sessions.count > 1, let previous = sessions.last else {
            return SessionComparison(current: current, previous: nil, weightChange: nil, repChange: nil, trend: .noData)
        }
        
        let weightChange: Double? = {
            guard let currentWeight = current.weightUsed, let previousWeight = previous.weightUsed else { return nil }
            return currentWeight - previousWeight
        }()
        
        let repChange: Int? = {
            guard let currentReps = current.repsCompleted, let previousReps = previous.repsCompleted else { return nil }
            return currentReps - previousReps
        }()
        
        // Determine trend
        let trend: SessionComparison.Trend = {
            if let wc = weightChange {
                if wc > 0 { return .improving }
                if wc < 0 { return .declining }
            }
            if let rc = repChange {
                if rc > 0 { return .improving }
                if rc < 0 { return .declining }
            }
            return .maintaining
        }()
        
        return SessionComparison(
            current: current,
            previous: previous,
            weightChange: weightChange,
            repChange: repChange,
            trend: trend
        )
    }
}

// MARK: - Formatting Helpers

extension ProgressAnalytics {
    
    nonisolated static func formatVolume(_ volume: Double) -> String {
        if volume >= 10000 {
            return String(format: "%.1fK", volume / 1000)
        }
        return "\(Int(volume))"
    }
    
    nonisolated static func formatWeight(_ weight: Double) -> String {
        if weight == floor(weight) {
            return "\(Int(weight))"
        }
        return String(format: "%.1f", weight)
    }
    
    nonisolated static func format1RM(_ oneRM: Double) -> String {
        return "\(Int(round(oneRM))) lbs"
    }
}


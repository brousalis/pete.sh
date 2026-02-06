import Foundation
import SwiftData
import Observation

@MainActor
@Observable
final class PRManager {
    static let shared = PRManager()
    
    private var modelContext: ModelContext?
    
    // Recently broken PRs (for display)
    var recentPRs: [PersonalRecord] = []
    
    private init() {}
    
    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    // MARK: - Check and Create PRs
    
    /// Check if a new exercise log sets a PR, and create the PR record if so
    func checkAndRecordPR(for log: ExerciseLog) -> PersonalRecord? {
        guard let modelContext = modelContext else { return nil }
        
        var newPR: PersonalRecord?
        
        // Check weight PR
        if let weight = log.weightUsed, weight > 0 {
            if let existingPR = getExistingPR(exerciseId: log.exerciseId, type: .maxWeight) {
                if weight > existingPR.value {
                    // New PR!
                    existingPR.value = weight
                    existingPR.date = log.date
                    newPR = existingPR
                }
            } else {
                // First time - create PR
                let pr = PersonalRecord(
                    exerciseId: log.exerciseId,
                    recordType: .maxWeight,
                    value: weight,
                    date: log.date
                )
                modelContext.insert(pr)
                newPR = pr
            }
        }
        
        // Check reps PR
        if let reps = log.repsCompleted, reps > 0 {
            if let existingPR = getExistingPR(exerciseId: log.exerciseId, type: .maxReps) {
                if Double(reps) > existingPR.value {
                    existingPR.value = Double(reps)
                    existingPR.date = log.date
                    if newPR == nil { newPR = existingPR }
                }
            } else {
                let pr = PersonalRecord(
                    exerciseId: log.exerciseId,
                    recordType: .maxReps,
                    value: Double(reps),
                    date: log.date
                )
                modelContext.insert(pr)
                if newPR == nil { newPR = pr }
            }
        }
        
        // Check duration PR
        if let duration = log.durationSeconds, duration > 0 {
            if let existingPR = getExistingPR(exerciseId: log.exerciseId, type: .maxDuration) {
                if Double(duration) > existingPR.value {
                    existingPR.value = Double(duration)
                    existingPR.date = log.date
                    if newPR == nil { newPR = existingPR }
                }
            } else {
                let pr = PersonalRecord(
                    exerciseId: log.exerciseId,
                    recordType: .maxDuration,
                    value: Double(duration),
                    date: log.date
                )
                modelContext.insert(pr)
                if newPR == nil { newPR = pr }
            }
        }
        
        // Save changes
        if newPR != nil {
            do {
                try modelContext.save()
                recentPRs.insert(newPR!, at: 0)
                if recentPRs.count > 5 {
                    recentPRs.removeLast()
                }
            } catch {
                print("Failed to save PR: \(error)")
            }
        }
        
        return newPR
    }
    
    // MARK: - Query PRs
    
    private func getExistingPR(exerciseId: String, type: PersonalRecord.RecordType) -> PersonalRecord? {
        guard let modelContext = modelContext else { return nil }
        
        // Fetch all PRs for this exercise, then filter in memory
        // (SwiftData predicates don't support .rawValue on enums)
        let predicate = #Predicate<PersonalRecord> { pr in
            pr.exerciseId == exerciseId
        }
        
        let descriptor = FetchDescriptor<PersonalRecord>(predicate: predicate)
        
        do {
            let results = try modelContext.fetch(descriptor)
            return results.first { $0.recordType == type }
        } catch {
            print("Failed to fetch PR: \(error)")
            return nil
        }
    }
    
    func getPR(exerciseId: String, type: PersonalRecord.RecordType) -> PersonalRecord? {
        return getExistingPR(exerciseId: exerciseId, type: type)
    }
    
    func getAllPRs(for exerciseId: String) -> [PersonalRecord] {
        guard let modelContext = modelContext else { return [] }
        
        let predicate = #Predicate<PersonalRecord> { pr in
            pr.exerciseId == exerciseId
        }
        
        let descriptor = FetchDescriptor<PersonalRecord>(predicate: predicate)
        
        do {
            let results = try modelContext.fetch(descriptor)
            // Sort by recordType in memory since SwiftData can't sort by enum rawValue
            return results.sorted { $0.recordType.rawValue < $1.recordType.rawValue }
        } catch {
            print("Failed to fetch PRs: \(error)")
            return []
        }
    }
    
    func getAllPRs() -> [PersonalRecord] {
        guard let modelContext = modelContext else { return [] }
        
        let descriptor = FetchDescriptor<PersonalRecord>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        
        do {
            return try modelContext.fetch(descriptor)
        } catch {
            print("Failed to fetch all PRs: \(error)")
            return []
        }
    }
    
    // MARK: - Exercise Name Lookup
    
    func exerciseName(for exerciseId: String) -> String {
        // Search through all workout days for the exercise
        for day in WorkoutDataManager.shared.days {
            for section in day.sections {
                if let exercise = section.exercises.first(where: { $0.id == exerciseId }) {
                    return exercise.name
                }
            }
        }
        return "Unknown Exercise"
    }
}


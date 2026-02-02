import Foundation
import SwiftData

/// Handles data export for backup purposes
struct DataExporter {
    
    // MARK: - Export Models
    
    struct ExportData: Codable {
        let exportDate: Date
        let appVersion: String
        let workoutRecords: [WorkoutRecordExport]
        let exerciseLogs: [ExerciseLogExport]
        let personalRecords: [PersonalRecordExport]
        let trainingCycles: [TrainingCycleExport]
    }
    
    struct WorkoutRecordExport: Codable {
        let id: String
        let date: Date
        let dayNumber: Int
        let completedExerciseIds: [String]
        let skippedExerciseIds: [String]
        let startTime: Date?
        let endTime: Date?
        let notes: String?
        let caloriesBurned: Double?
    }
    
    struct ExerciseLogExport: Codable {
        let id: String
        let date: Date
        let exerciseId: String
        let dayNumber: Int
        let weightUsed: Double?
        let repsCompleted: Int?
        let setsCompleted: Int?
        let durationSeconds: Int?
        let difficulty: Int?
    }
    
    struct PersonalRecordExport: Codable {
        let id: String
        let exerciseId: String
        let recordType: Int
        let value: Double
        let date: Date
    }
    
    struct TrainingCycleExport: Codable {
        let id: String
        let startDate: Date
        let weekNumber: Int
        let isDeloadWeek: Bool
    }
    
    // MARK: - Export
    
    static func exportAllData(modelContext: ModelContext) -> ExportData? {
        do {
            // Fetch all workout records
            let workoutDescriptor = FetchDescriptor<WorkoutRecord>(
                sortBy: [SortDescriptor(\.date, order: .reverse)]
            )
            let workoutRecords = try modelContext.fetch(workoutDescriptor)
            
            // Fetch all exercise logs
            let logDescriptor = FetchDescriptor<ExerciseLog>(
                sortBy: [SortDescriptor(\.date, order: .reverse)]
            )
            let exerciseLogs = try modelContext.fetch(logDescriptor)
            
            // Fetch all PRs
            let prDescriptor = FetchDescriptor<PersonalRecord>(
                sortBy: [SortDescriptor(\.date, order: .reverse)]
            )
            let prs = try modelContext.fetch(prDescriptor)
            
            // Fetch all training cycles
            let cycleDescriptor = FetchDescriptor<TrainingCycle>(
                sortBy: [SortDescriptor(\.startDate, order: .reverse)]
            )
            let cycles = try modelContext.fetch(cycleDescriptor)
            
            // Convert to export format
            let exportedWorkouts = workoutRecords.map { record in
                WorkoutRecordExport(
                    id: record.id.uuidString,
                    date: record.date,
                    dayNumber: record.dayNumber,
                    completedExerciseIds: record.completedExerciseIds,
                    skippedExerciseIds: record.skippedExerciseIds,
                    startTime: record.startTime,
                    endTime: record.endTime,
                    notes: record.notes,
                    caloriesBurned: record.caloriesBurned
                )
            }
            
            let exportedLogs = exerciseLogs.map { log in
                ExerciseLogExport(
                    id: log.id.uuidString,
                    date: log.date,
                    exerciseId: log.exerciseId,
                    dayNumber: log.dayNumber,
                    weightUsed: log.weightUsed,
                    repsCompleted: log.repsCompleted,
                    setsCompleted: log.setsCompleted,
                    durationSeconds: log.durationSeconds,
                    difficulty: log.difficulty?.rawValue
                )
            }
            
            let exportedPRs = prs.map { pr in
                PersonalRecordExport(
                    id: pr.id.uuidString,
                    exerciseId: pr.exerciseId,
                    recordType: pr.recordType.rawValue,
                    value: pr.value,
                    date: pr.date
                )
            }
            
            let exportedCycles = cycles.map { cycle in
                TrainingCycleExport(
                    id: cycle.id.uuidString,
                    startDate: cycle.startDate,
                    weekNumber: cycle.weekNumber,
                    isDeloadWeek: cycle.isDeloadWeek
                )
            }
            
            let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
            
            return ExportData(
                exportDate: Date(),
                appVersion: appVersion,
                workoutRecords: exportedWorkouts,
                exerciseLogs: exportedLogs,
                personalRecords: exportedPRs,
                trainingCycles: exportedCycles
            )
            
        } catch {
            print("Failed to export data: \(error)")
            return nil
        }
    }
    
    static func exportToJSON(modelContext: ModelContext) -> String? {
        guard let exportData = exportAllData(modelContext: modelContext) else {
            return nil
        }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        
        do {
            let jsonData = try encoder.encode(exportData)
            return String(data: jsonData, encoding: .utf8)
        } catch {
            print("Failed to encode JSON: \(error)")
            return nil
        }
    }
    
    // MARK: - Summary Stats
    
    struct ExportSummary {
        let totalWorkouts: Int
        let totalExerciseLogs: Int
        let totalPRs: Int
        let dateRange: String
    }
    
    static func getSummary(modelContext: ModelContext) -> ExportSummary {
        do {
            let workoutDescriptor = FetchDescriptor<WorkoutRecord>()
            let workouts = try modelContext.fetch(workoutDescriptor)
            
            let logDescriptor = FetchDescriptor<ExerciseLog>()
            let logs = try modelContext.fetch(logDescriptor)
            
            let prDescriptor = FetchDescriptor<PersonalRecord>()
            let prs = try modelContext.fetch(prDescriptor)
            
            let dates = workouts.map { $0.date }
            let dateRange: String
            if let oldest = dates.min(), let newest = dates.max() {
                let formatter = DateFormatter()
                formatter.dateFormat = "MMM d, yyyy"
                dateRange = "\(formatter.string(from: oldest)) - \(formatter.string(from: newest))"
            } else {
                dateRange = "No data"
            }
            
            return ExportSummary(
                totalWorkouts: workouts.count,
                totalExerciseLogs: logs.count,
                totalPRs: prs.count,
                dateRange: dateRange
            )
        } catch {
            return ExportSummary(
                totalWorkouts: 0,
                totalExerciseLogs: 0,
                totalPRs: 0,
                dateRange: "Error"
            )
        }
    }
}






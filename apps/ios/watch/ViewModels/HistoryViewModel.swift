import Foundation
import Observation
import SwiftData

@MainActor
@Observable
final class HistoryViewModel {
    private var modelContext: ModelContext?

    var records: [WorkoutRecord] = []
    var currentStreak: Int = 0
    var totalWorkouts: Int = 0

    // Cache for calendar lookups
    private var recordsByDate: [Date: WorkoutRecord] = [:]

    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
        loadHistory()
    }

    func loadHistory() {
        guard let modelContext = modelContext else { return }

        let descriptor = FetchDescriptor<WorkoutRecord>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )

        do {
            records = try modelContext.fetch(descriptor)
            calculateStats()
            buildDateCache()
        } catch {
            print("Failed to fetch history: \(error)")
        }
    }

    private func calculateStats() {
        totalWorkouts = records.filter { record in
            guard let day = WorkoutDataManager.shared.day(for: record.dayNumber) else { return false }
            return record.isComplete(for: day)
        }.count
        currentStreak = calculateStreak()
    }
    
    private func buildDateCache() {
        let calendar = Calendar.current
        recordsByDate = [:]
        
        for record in records {
            let dateKey = calendar.startOfDay(for: record.date)
            // Keep the most recent record for each day
            if recordsByDate[dateKey] == nil {
                recordsByDate[dateKey] = record
            }
        }
    }
    
    private func calculateStreak() -> Int {
        let calendar = Calendar.current
        var streak = 0
        var checkDate = calendar.startOfDay(for: Date())

        let completedDates = Set(records.filter { record in
            guard let day = WorkoutDataManager.shared.day(for: record.dayNumber) else { return false }
            return record.isComplete(for: day)
        }.map { calendar.startOfDay(for: $0.date) })

        while completedDates.contains(checkDate) {
            streak += 1
            guard let previousDay = calendar.date(byAdding: .day, value: -1, to: checkDate) else { break }
            checkDate = previousDay
        }

        return streak
    }
    
    func recordsForWeek(weekOffset: Int = 0) -> [WorkoutRecord] {
        let calendar = Calendar.current
        guard let weekStart = calendar.date(byAdding: .weekOfYear, value: -weekOffset, to: Date()),
              let weekEnd = calendar.date(byAdding: .day, value: 7, to: weekStart) else {
            return []
        }
        
        let startOfWeek = calendar.startOfDay(for: weekStart)
        
        return records.filter { record in
            let recordDate = calendar.startOfDay(for: record.date)
            return recordDate >= startOfWeek && recordDate < weekEnd
        }
    }
    
    func record(for date: Date) -> WorkoutRecord? {
        let calendar = Calendar.current
        let dateKey = calendar.startOfDay(for: date)
        return recordsByDate[dateKey]
    }
    
    func day(for record: WorkoutRecord) -> Day? {
        WorkoutDataManager.shared.day(for: record.dayNumber)
    }
}


import Foundation
import SwiftData

/// Tracks training cycles for deload week detection
@Model
final class TrainingCycle {
    var id: UUID = UUID()
    var startDate: Date = Date()
    var weekNumber: Int = 1          // 1-5, resets after deload
    var isDeloadWeek: Bool = false
    var notes: String?
    
    /// Default cycle length before deload
    static let cycleLength = 5   // Deload every 5th week
    
    init(
        id: UUID = UUID(),
        startDate: Date = Date(),
        weekNumber: Int = 1,
        isDeloadWeek: Bool = false,
        notes: String? = nil
    ) {
        self.id = id
        self.startDate = startDate
        self.weekNumber = weekNumber
        self.isDeloadWeek = isDeloadWeek
        self.notes = notes
    }
    
    /// Progress through the cycle (0.0 to 1.0)
    var cycleProgress: Double {
        Double(weekNumber) / Double(Self.cycleLength)
    }
    
    /// Weeks until next deload
    var weeksUntilDeload: Int {
        if isDeloadWeek { return 0 }
        return Self.cycleLength - weekNumber
    }
    
    /// Label for current week
    var weekLabel: String {
        if isDeloadWeek {
            return "Deload Week"
        }
        return "Week \(weekNumber) of \(Self.cycleLength)"
    }
}

// MARK: - Training Cycle Manager

@MainActor
@Observable
final class TrainingCycleManager {
    static let shared = TrainingCycleManager()
    
    private var modelContext: ModelContext?
    var currentCycle: TrainingCycle?
    
    private init() {}
    
    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
        loadOrCreateCurrentCycle()
    }
    
    private func loadOrCreateCurrentCycle() {
        guard let modelContext = modelContext else { return }
        
        let calendar = Calendar.current
        let now = Date()
        
        // Get start of current week (Monday)
        var components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)
        components.weekday = 2 // Monday
        guard let startOfWeek = calendar.date(from: components) else { return }
        
        // Look for existing cycle this week
        let predicate = #Predicate<TrainingCycle> { cycle in
            cycle.startDate >= startOfWeek
        }
        
        let descriptor = FetchDescriptor<TrainingCycle>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.startDate, order: .reverse)]
        )
        
        do {
            let cycles = try modelContext.fetch(descriptor)
            if let existing = cycles.first {
                currentCycle = existing
            } else {
                // Create new cycle - check previous week to determine week number
                let newWeekNumber = calculateNewWeekNumber()
                let isDeload = newWeekNumber == TrainingCycle.cycleLength
                
                let newCycle = TrainingCycle(
                    startDate: startOfWeek,
                    weekNumber: newWeekNumber,
                    isDeloadWeek: isDeload
                )
                modelContext.insert(newCycle)
                try modelContext.save()
                currentCycle = newCycle
            }
        } catch {
            print("Failed to load/create training cycle: \(error)")
        }
    }
    
    private func calculateNewWeekNumber() -> Int {
        guard let modelContext = modelContext else { return 1 }
        
        // Get previous cycle
        let descriptor = FetchDescriptor<TrainingCycle>(
            sortBy: [SortDescriptor(\.startDate, order: .reverse)]
        )
        
        do {
            let cycles = try modelContext.fetch(descriptor)
            if let lastCycle = cycles.first {
                if lastCycle.isDeloadWeek {
                    // After deload, start fresh at week 1
                    return 1
                } else {
                    // Increment week number
                    return min(lastCycle.weekNumber + 1, TrainingCycle.cycleLength)
                }
            }
        } catch {
            print("Failed to fetch previous cycle: \(error)")
        }
        
        return 1
    }
    
    /// Manually set current week as deload
    func markAsDeload() {
        guard let modelContext = modelContext, let cycle = currentCycle else { return }
        
        cycle.isDeloadWeek = true
        
        do {
            try modelContext.save()
        } catch {
            print("Failed to mark deload: \(error)")
        }
    }
    
    /// Reset cycle (start fresh from week 1)
    func resetCycle() {
        guard let modelContext = modelContext, let cycle = currentCycle else { return }
        
        cycle.weekNumber = 1
        cycle.isDeloadWeek = false
        
        do {
            try modelContext.save()
        } catch {
            print("Failed to reset cycle: \(error)")
        }
    }
    
    var isDeloadWeek: Bool {
        currentCycle?.isDeloadWeek ?? false
    }
    
    var currentWeekNumber: Int {
        currentCycle?.weekNumber ?? 1
    }
    
    var weeksUntilDeload: Int {
        currentCycle?.weeksUntilDeload ?? TrainingCycle.cycleLength
    }
}







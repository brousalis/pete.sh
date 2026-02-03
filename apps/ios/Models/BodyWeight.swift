import Foundation
import SwiftData

/// Tracks body weight entries for relative strength calculations
@Model
final class BodyWeight {
    var id: UUID = UUID()
    var date: Date = Date()
    var weight: Double = 0.0  // in lbs
    var notes: String?
    var syncedToHealthKitFlag: Bool?  // Track if this entry was saved to HealthKit (optional for migration)
    
    init(
        id: UUID = UUID(),
        date: Date = Date(),
        weight: Double,
        notes: String? = nil,
        syncedToHealthKit: Bool = false
    ) {
        self.id = id
        self.date = date
        self.weight = weight
        self.notes = notes
        self.syncedToHealthKitFlag = syncedToHealthKit
    }
    
    /// Whether this entry has been synced to HealthKit (defaults to false for old entries)
    var syncedToHealthKit: Bool {
        get { syncedToHealthKitFlag ?? false }
        set { syncedToHealthKitFlag = newValue }
    }
    
    var formattedWeight: String {
        if weight == floor(weight) {
            return "\(Int(weight)) lbs"
        }
        return String(format: "%.1f lbs", weight)
    }
}

// MARK: - Body Weight Manager

@MainActor
@Observable
final class BodyWeightManager {
    
    static let shared = BodyWeightManager()
    
    private var modelContext: ModelContext?
    private var healthKit: HealthKitManager { HealthKitManager.shared }
    
    // Current weight (most recent)
    var currentWeight: Double?
    var previousWeight: Double?
    var weightChange: Double?
    var entries: [BodyWeight] = []
    
    // HealthKit sync state
    var isSyncingWithHealthKit = false
    var lastHealthKitSync: Date?
    
    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
        loadEntries()
    }
    
    func loadEntries() {
        guard let modelContext = modelContext else { return }
        
        let descriptor = FetchDescriptor<BodyWeight>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        
        do {
            entries = try modelContext.fetch(descriptor)
            currentWeight = entries.first?.weight
            previousWeight = entries.dropFirst().first?.weight
            
            if let current = currentWeight, let previous = previousWeight {
                weightChange = current - previous
            } else {
                weightChange = nil
            }
        } catch {
            print("Failed to load body weight entries: \(error)")
        }
    }
    
    /// Log weight locally and sync to HealthKit
    func logWeight(_ weight: Double, notes: String? = nil, syncToHealthKit: Bool = true) {
        guard let modelContext = modelContext else { return }
        
        let entry = BodyWeight(weight: weight, notes: notes, syncedToHealthKit: false)
        modelContext.insert(entry)
        
        do {
            try modelContext.save()
            loadEntries()
            
            // Sync to HealthKit
            if syncToHealthKit {
                Task {
                    await syncEntryToHealthKit(entry)
                }
            }
        } catch {
            print("Failed to save body weight: \(error)")
        }
    }
    
    /// Sync a single entry to HealthKit
    private func syncEntryToHealthKit(_ entry: BodyWeight) async {
        guard let modelContext = modelContext else { return }
        
        do {
            try await healthKit.saveBodyWeight(entry.weight, date: entry.date)
            
            // Mark as synced
            entry.syncedToHealthKit = true
            try modelContext.save()
            
            print("✅ Body weight synced to HealthKit: \(entry.weight) lbs")
        } catch {
            print("❌ Failed to sync body weight to HealthKit: \(error)")
        }
    }
    
    /// Sync any unsynced entries to HealthKit
    func syncUnsyncedEntriesToHealthKit() async {
        guard let modelContext = modelContext else { return }
        
        let unsyncedEntries = entries.filter { !$0.syncedToHealthKit }
        
        guard !unsyncedEntries.isEmpty else {
            print("ℹ️ All body weight entries already synced to HealthKit")
            return
        }
        
        isSyncingWithHealthKit = true
        
        for entry in unsyncedEntries {
            await syncEntryToHealthKit(entry)
        }
        
        isSyncingWithHealthKit = false
        lastHealthKitSync = Date()
    }
    
    /// Import body weight from HealthKit (if newer than local data)
    func importFromHealthKit() async {
        guard let modelContext = modelContext else { return }
        
        // Get latest from HealthKit
        await healthKit.fetchBodyWeight()
        
        guard let hkWeight = healthKit.healthKitBodyWeight,
              let hkDate = healthKit.healthKitBodyWeightDate else {
            print("ℹ️ No body weight in HealthKit to import")
            return
        }
        
        // Check if we already have this entry (within 1 minute)
        let existingEntry = entries.first { entry in
            abs(entry.date.timeIntervalSince(hkDate)) < 60 && abs(entry.weight - hkWeight) < 0.1
        }
        
        if existingEntry != nil {
            print("ℹ️ HealthKit body weight already exists locally")
            return
        }
        
        // Check if HealthKit has a newer entry than our latest
        if let latestLocal = entries.first {
            if hkDate > latestLocal.date {
                // HealthKit is newer - import it
                let entry = BodyWeight(
                    date: hkDate,
                    weight: hkWeight,
                    notes: "Imported from Health",
                    syncedToHealthKit: true
                )
                modelContext.insert(entry)
                
                do {
                    try modelContext.save()
                    loadEntries()
                    print("✅ Imported body weight from HealthKit: \(hkWeight) lbs")
                } catch {
                    print("❌ Failed to save imported body weight: \(error)")
                }
            }
        } else {
            // No local entries - import from HealthKit
            let entry = BodyWeight(
                date: hkDate,
                weight: hkWeight,
                notes: "Imported from Health",
                syncedToHealthKit: true
            )
            modelContext.insert(entry)
            
            do {
                try modelContext.save()
                loadEntries()
                print("✅ Imported body weight from HealthKit: \(hkWeight) lbs")
            } catch {
                print("❌ Failed to save imported body weight: \(error)")
            }
        }
    }
    
    func deleteEntry(_ entry: BodyWeight) {
        guard let modelContext = modelContext else { return }
        
        modelContext.delete(entry)
        
        do {
            try modelContext.save()
            loadEntries()
        } catch {
            print("Failed to delete body weight entry: \(error)")
        }
    }
    
    // MARK: - Daily Check
    
    /// Check if weight has been logged today (local or HealthKit)
    var hasLoggedToday: Bool {
        // Check local entries first
        if let latest = entries.first, Calendar.current.isDateInToday(latest.date) {
            return true
        }
        // Also check HealthKit body weight
        if let hkDate = healthKit.healthKitBodyWeightDate, Calendar.current.isDateInToday(hkDate) {
            return true
        }
        return false
    }
    
    /// Days since last weight entry
    var daysSinceLastEntry: Int? {
        guard let latest = entries.first else { return nil }
        return Calendar.current.dateComponents([.day], from: latest.date, to: Date()).day
    }
    
    // MARK: - Relative Strength
    
    /// Calculate relative strength (weight lifted / body weight)
    func relativeStrength(liftedWeight: Double) -> Double? {
        guard let bodyWeight = currentWeight, bodyWeight > 0 else { return nil }
        return liftedWeight / bodyWeight
    }
    
    /// Format relative strength as BW multiple
    func formattedRelativeStrength(liftedWeight: Double) -> String? {
        guard let rs = relativeStrength(liftedWeight: liftedWeight) else { return nil }
        return String(format: "%.2f×BW", rs)
    }
    
    /// Counter-balance weight recommendation (for weighted pull-ups)
    /// If you lose weight, add that to your belt
    func counterBalanceRecommendation(previousBeltWeight: Double) -> (newBeltWeight: Double, change: Double)? {
        guard let current = currentWeight, let previous = previousWeight else { return nil }
        
        let bodyWeightChange = current - previous
        
        // If you lost body weight, increase belt weight by that amount
        // If you gained body weight, decrease belt weight by that amount
        let beltAdjustment = -bodyWeightChange
        let newBeltWeight = max(0, previousBeltWeight + beltAdjustment)
        
        return (newBeltWeight, beltAdjustment)
    }
    
    // MARK: - Trends
    
    struct WeightTrend {
        let direction: Direction
        let amount: Double
        let percentage: Double
        
        enum Direction {
            case up, down, stable
            
            var icon: String {
                switch self {
                case .up: return "arrow.up.right"
                case .down: return "arrow.down.right"
                case .stable: return "arrow.right"
                }
            }
            
            var color: String {
                switch self {
                case .up: return "red"
                case .down: return "green"
                case .stable: return "orange"
                }
            }
        }
    }
    
    func getWeightTrend(days: Int = 7) -> WeightTrend? {
        guard entries.count >= 2 else { return nil }
        
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        let recentEntries = entries.filter { $0.date >= cutoffDate }
        
        guard let latest = recentEntries.first?.weight,
              let oldest = recentEntries.last?.weight,
              oldest > 0 else { return nil }
        
        let change = latest - oldest
        let percentage = (change / oldest) * 100
        
        let direction: WeightTrend.Direction
        if abs(change) < 0.5 {
            direction = .stable
        } else if change > 0 {
            direction = .up
        } else {
            direction = .down
        }
        
        return WeightTrend(direction: direction, amount: abs(change), percentage: percentage)
    }
}


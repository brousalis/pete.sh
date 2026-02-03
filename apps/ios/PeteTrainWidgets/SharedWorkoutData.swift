import Foundation
import WidgetKit

/// Shared data model for communication between main app and widget
/// Uses App Groups for data sharing
struct SharedWorkoutData: Codable {
    let dayNumber: Int
    let dayName: String
    let shortName: String
    let completedCount: Int
    let totalExercises: Int
    let skippedCount: Int
    let isWorkoutActive: Bool
    let lastUpdated: Date
    
    /// Progress as a fraction (0.0 to 1.0)
    var progress: Double {
        let effectiveTotal = totalExercises - skippedCount
        guard effectiveTotal > 0 else { return 0 }
        return Double(completedCount) / Double(effectiveTotal)
    }
    
    /// Whether workout is fully complete
    var isComplete: Bool {
        let effectiveTotal = totalExercises - skippedCount
        return completedCount >= effectiveTotal && effectiveTotal > 0
    }
    
    /// Weekday name for the current day number
    var weekdayName: String {
        let names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        guard dayNumber >= 1 && dayNumber <= 7 else { return "" }
        return names[dayNumber - 1]
    }
    
    /// Short weekday name
    var shortWeekdayName: String {
        let names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        guard dayNumber >= 1 && dayNumber <= 7 else { return "" }
        return names[dayNumber - 1]
    }
    
    /// Whether this is a recovery day
    var isRecoveryDay: Bool {
        dayNumber == 4 || dayNumber == 7
    }
}

// MARK: - App Group Storage

extension SharedWorkoutData {
    /// App Group identifier - must match entitlements
    static let appGroupIdentifier = "group.com.petetrain.app"
    
    /// Key for storing workout data
    private static let storageKey = "currentWorkoutData"
    
    /// Get shared UserDefaults for App Group
    private static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupIdentifier)
    }
    
    /// Save data to shared container
    func save() {
        guard let defaults = Self.sharedDefaults else {
            print("⚠️ Could not access shared UserDefaults")
            return
        }
        
        do {
            let data = try JSONEncoder().encode(self)
            defaults.set(data, forKey: Self.storageKey)
            defaults.synchronize()
            print("✅ Saved workout data to widget: \(completedCount)/\(totalExercises)")
        } catch {
            print("❌ Failed to encode workout data: \(error)")
        }
    }
    
    /// Load data from shared container
    static func load() -> SharedWorkoutData? {
        guard let defaults = sharedDefaults else { return nil }
        
        // Try dictionary format first (from main app)
        if let dict = defaults.dictionary(forKey: storageKey) {
            guard let dayNumber = dict["dayNumber"] as? Int,
                  let dayName = dict["dayName"] as? String,
                  let shortName = dict["shortName"] as? String,
                  let completedCount = dict["completedCount"] as? Int,
                  let totalExercises = dict["totalExercises"] as? Int,
                  let skippedCount = dict["skippedCount"] as? Int,
                  let isWorkoutActive = dict["isWorkoutActive"] as? Bool else {
                return nil
            }
            
            let lastUpdated: Date
            if let timestamp = dict["lastUpdated"] as? TimeInterval {
                lastUpdated = Date(timeIntervalSince1970: timestamp)
            } else {
                lastUpdated = Date()
            }
            
            return SharedWorkoutData(
                dayNumber: dayNumber,
                dayName: dayName,
                shortName: shortName,
                completedCount: completedCount,
                totalExercises: totalExercises,
                skippedCount: skippedCount,
                isWorkoutActive: isWorkoutActive,
                lastUpdated: lastUpdated
            )
        }
        
        // Fall back to Codable format
        if let data = defaults.data(forKey: storageKey) {
            do {
                return try JSONDecoder().decode(SharedWorkoutData.self, from: data)
            } catch {
                print("❌ Failed to decode workout data: \(error)")
            }
        }
        
        return nil
    }
    
    /// Create placeholder data for previews
    static var placeholder: SharedWorkoutData {
        SharedWorkoutData(
            dayNumber: 1,
            dayName: "Density Strength",
            shortName: "Heavy Lifts",
            completedCount: 5,
            totalExercises: 12,
            skippedCount: 0,
            isWorkoutActive: false,
            lastUpdated: Date()
        )
    }
    
    /// Request widget timeline refresh
    static func refreshWidget() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}


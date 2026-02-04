import Foundation

enum CycleManager {
    
    // MARK: - Dev Mode
    
    private static let devModeKey = "devModeEnabled"
    private static let devDayOverrideKey = "devDayOverride"
    
    static var isDevModeEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: devModeKey) }
        set { UserDefaults.standard.set(newValue, forKey: devModeKey) }
    }
    
    /// Day override (1-7), only used when dev mode is enabled
    static var devDayOverride: Int {
        get {
            let value = UserDefaults.standard.integer(forKey: devDayOverrideKey)
            return value == 0 ? 1 : value
        }
        set { UserDefaults.standard.set(newValue, forKey: devDayOverrideKey) }
    }
    
    // MARK: - Day Calculation
    
    /// Returns the workout day number (1-7) based on the current day of the week
    /// Monday = Day 1, Tuesday = Day 2, ..., Sunday = Day 7
    static func currentDayNumber(for date: Date = Date()) -> Int {
        // Dev mode override
        if isDevModeEnabled {
            return devDayOverride
        }
        
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)
        
        // Calendar weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
        // We want: Monday = 1, Tuesday = 2, ..., Sunday = 7
        // So: if Sunday (1) -> 7, else weekday - 1
        if weekday == 1 {
            return 7  // Sunday
        } else {
            return weekday - 1  // Monday=1, Tuesday=2, etc.
        }
    }
    
    /// Returns the Day object for the current day of the week
    /// WorkoutData.days automatically uses dynamic data from WorkoutDataManager when available
    static func currentDay(for date: Date = Date()) -> Day {
        let dayNumber = currentDayNumber(for: date)
        return WorkoutData.days.first { $0.id == dayNumber } ?? WorkoutData.days[0]
    }
    
    /// Returns the name of the current weekday
    static func currentWeekdayName(for date: Date = Date()) -> String {
        // Dev mode: show the overridden day's weekday name
        if isDevModeEnabled {
            let names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            return names[devDayOverride - 1]
        }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE"
        return formatter.string(from: date)
    }
}

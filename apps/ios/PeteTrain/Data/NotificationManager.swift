import Foundation
import UserNotifications
import WatchKit

/// Manages workout reminder notifications
@MainActor
@Observable
final class NotificationManager: NSObject {
    
    static let shared = NotificationManager()
    
    // MARK: - Notification Categories & Actions
    static let gymArrivalCategory = "GYM_ARRIVAL"
    static let syncWorkoutCategory = "SYNC_WORKOUT"
    static let startWorkoutAction = "START_WORKOUT"
    static let syncNowAction = "SYNC_NOW"
    static let dismissAction = "DISMISS"

    // MARK: - State
    var isAuthorized = false
    var pendingNotifications: [UNNotificationRequest] = []

    // MARK: - Callbacks
    var onStartWorkoutFromNotification: (() -> Void)?
    var onSyncFromNotification: (() -> Void)?
    
    // MARK: - Settings (persisted via UserDefaults)
    
    var remindersEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "workoutRemindersEnabled") }
        set {
            UserDefaults.standard.set(newValue, forKey: "workoutRemindersEnabled")
            if newValue {
                scheduleWorkoutReminders()
            } else {
                cancelAllReminders()
            }
        }
    }
    
    var reminderHour: Int {
        get { UserDefaults.standard.object(forKey: "reminderHour") as? Int ?? 12 } // Default 12 PM
        set {
            UserDefaults.standard.set(newValue, forKey: "reminderHour")
            if remindersEnabled {
                scheduleWorkoutReminders()
            }
        }
    }
    
    var reminderMinute: Int {
        get { UserDefaults.standard.object(forKey: "reminderMinute") as? Int ?? 0 }
        set {
            UserDefaults.standard.set(newValue, forKey: "reminderMinute")
            if remindersEnabled {
                scheduleWorkoutReminders()
            }
        }
    }
    
    var reminderTimeFormatted: String {
        let hour = reminderHour % 12 == 0 ? 12 : reminderHour % 12
        let ampm = reminderHour < 12 ? "AM" : "PM"
        return String(format: "%d:%02d %@", hour, reminderMinute, ampm)
    }
    
    // Skip recovery days (Thursday/Day 4, Sunday/Day 7)
    var skipRecoveryDays: Bool {
        get { UserDefaults.standard.object(forKey: "skipRecoveryDayReminders") as? Bool ?? true }
        set {
            UserDefaults.standard.set(newValue, forKey: "skipRecoveryDayReminders")
            if remindersEnabled {
                scheduleWorkoutReminders()
            }
        }
    }
    
    // Morning weight reminder
    var weightReminderEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "weightReminderEnabled") }
        set {
            UserDefaults.standard.set(newValue, forKey: "weightReminderEnabled")
            if newValue {
                scheduleWeightReminder()
            } else {
                cancelWeightReminder()
            }
        }
    }
    
    var weightReminderHour: Int {
        get { UserDefaults.standard.object(forKey: "weightReminderHour") as? Int ?? 7 } // Default 7 AM
        set {
            UserDefaults.standard.set(newValue, forKey: "weightReminderHour")
            if weightReminderEnabled {
                scheduleWeightReminder()
            }
        }
    }
    
    // MARK: - Initialization
    
    private override init() {
        super.init()
        registerCategories()
        setupNotificationDelegate()
        checkAuthorization()
    }
    
    /// Register notification categories with actions
    private func registerCategories() {
        // Start Workout action
        let startAction = UNNotificationAction(
            identifier: Self.startWorkoutAction,
            title: "Open App",
            options: [.foreground]  // Opens app
        )

        // Sync Now action
        let syncAction = UNNotificationAction(
            identifier: Self.syncNowAction,
            title: "Sync Now",
            options: [.foreground]  // Opens app and syncs
        )

        // Dismiss action
        let dismissAction = UNNotificationAction(
            identifier: Self.dismissAction,
            title: "Dismiss",
            options: []
        )

        // Gym Arrival category
        let gymCategory = UNNotificationCategory(
            identifier: Self.gymArrivalCategory,
            actions: [startAction, dismissAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // Sync Workout category
        let syncCategory = UNNotificationCategory(
            identifier: Self.syncWorkoutCategory,
            actions: [syncAction, dismissAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        UNUserNotificationCenter.current().setNotificationCategories([gymCategory, syncCategory])
        print("🔔 Registered notification categories")
    }
    
    private func setupNotificationDelegate() {
        UNUserNotificationCenter.current().delegate = self
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            await MainActor.run {
                isAuthorized = granted
            }
            return granted
        } catch {
            print("🔔 Notification authorization error: \(error)")
            return false
        }
    }
    
    func checkAuthorization() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            Task { @MainActor in
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }
    
    // MARK: - Scheduling
    
    /// Schedule workout reminders for each training day
    func scheduleWorkoutReminders() {
        // Cancel existing first
        cancelAllReminders()
        
        guard isAuthorized else {
            print("🔔 Not authorized for notifications")
            return
        }
        
        // Training days and their weekday (Calendar weekday: 1=Sun, 2=Mon, ..., 7=Sat)
        // Day 1 = Monday = Calendar weekday 2
        // Day 2 = Tuesday = Calendar weekday 3
        // Day 3 = Wednesday = Calendar weekday 4
        // Day 4 = Thursday = Calendar weekday 5 (Recovery)
        // Day 5 = Friday = Calendar weekday 6
        // Day 6 = Saturday = Calendar weekday 7
        // Day 7 = Sunday = Calendar weekday 1 (Recovery)
        
        let trainingSchedule: [(dayNumber: Int, calendarWeekday: Int, name: String, isRecovery: Bool)] = [
            (1, 2, "Strength & Power", false),
            (2, 3, "Core & Waist Control", false),
            (3, 4, "Hybrid Cardio", false),
            (4, 5, "Active Recovery", true),
            (5, 6, "Definition Circuit", false),
            (6, 7, "HIIT Sprints", false),
            (7, 1, "Active Recovery", true)
        ]
        
        for day in trainingSchedule {
            // Skip recovery days if setting is enabled
            if skipRecoveryDays && day.isRecovery {
                continue
            }
            
            let content = UNMutableNotificationContent()
            
            if day.isRecovery {
                content.title = "Rest Day 🚶"
                content.body = "Aim for 10,000 steps today"
            } else {
                content.title = "Time to Train 💪"
                content.body = "Day \(day.dayNumber): \(day.name)"
            }
            
            content.sound = .default
            content.categoryIdentifier = "WORKOUT_REMINDER"
            
            // Create weekly repeating trigger
            var dateComponents = DateComponents()
            dateComponents.weekday = day.calendarWeekday
            dateComponents.hour = reminderHour
            dateComponents.minute = reminderMinute
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            
            let request = UNNotificationRequest(
                identifier: "workout-reminder-day\(day.dayNumber)",
                content: content,
                trigger: trigger
            )
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("🔔 Failed to schedule reminder for day \(day.dayNumber): \(error)")
                } else {
                    print("🔔 Scheduled reminder for day \(day.dayNumber) at weekday \(day.calendarWeekday)")
                }
            }
        }
        
        loadPendingNotifications()
    }
    
    /// Schedule daily morning weight reminder
    func scheduleWeightReminder() {
        cancelWeightReminder()
        
        guard isAuthorized else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "Morning Weigh-in ⚖️"
        content.body = "Log your weight to track progress"
        content.sound = .default
        content.categoryIdentifier = "WEIGHT_REMINDER"
        
        // Daily at the specified hour
        var dateComponents = DateComponents()
        dateComponents.hour = weightReminderHour
        dateComponents.minute = 0
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        
        let request = UNNotificationRequest(
            identifier: "weight-reminder-daily",
            content: content,
            trigger: trigger
        )

        let hour = weightReminderHour // Capture before closure
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("🔔 Failed to schedule weight reminder: \(error)")
            } else {
                print("🔔 Scheduled daily weight reminder at \(hour):00")
            }
        }

        loadPendingNotifications()
    }
    
    func cancelWeightReminder() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["weight-reminder-daily"])
    }
    
    // MARK: - Cancellation
    
    func cancelAllReminders() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        pendingNotifications = []
    }
    
    func cancelReminder(identifier: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
        loadPendingNotifications()
    }
    
    // MARK: - Gym Arrival Notification
    
    /// Send immediate notification when user arrives at gym
    func sendGymArrivalNotification(dayNumber: Int, dayName: String) {
        guard isAuthorized else {
            print("🔔 Not authorized - can't send gym arrival notification")
            return
        }
        
        let content = UNMutableNotificationContent()
        content.title = "You're at the gym! 🏋️"
        content.body = "Day \(dayNumber): \(dayName) — Ready to start?"
        content.sound = .default
        content.categoryIdentifier = Self.gymArrivalCategory
        
        // Add workout info to userInfo for potential use
        content.userInfo = [
            "dayNumber": dayNumber,
            "dayName": dayName,
            "type": "gymArrival"
        ]
        
        // Trigger immediately
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        
        let request = UNNotificationRequest(
            identifier: "gym-arrival-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("🔔 Failed to send gym arrival notification: \(error)")
            } else {
                print("🔔 Sent gym arrival notification for Day \(dayNumber): \(dayName)")
            }
        }
    }

    // MARK: - Sync Reminder Notification

    /// Send notification when arriving home with unsynced workouts
    func sendSyncReminderNotification(pendingCount: Int) {
        guard isAuthorized else {
            print("🔔 Not authorized - can't send sync reminder notification")
            return
        }

        guard pendingCount > 0 else {
            print("🔔 No pending workouts to sync")
            return
        }

        let content = UNMutableNotificationContent()
        content.title = "Workout Complete! 🏠"
        if pendingCount == 1 {
            content.body = "You have 1 workout ready to sync to Petehome"
        } else {
            content.body = "You have \(pendingCount) workouts ready to sync to Petehome"
        }
        content.sound = .default
        content.categoryIdentifier = Self.syncWorkoutCategory

        content.userInfo = [
            "pendingCount": pendingCount,
            "type": "syncReminder"
        ]

        // Trigger immediately
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "sync-reminder-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("🔔 Failed to send sync reminder notification: \(error)")
            } else {
                print("🔔 Sent sync reminder notification for \(pendingCount) pending workout(s)")
            }
        }
    }

    /// Send notification that sync is in progress (auto-sync)
    func sendSyncingNotification(workoutCount: Int) {
        guard isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "Syncing Workouts 🔄"
        if workoutCount == 1 {
            content.body = "Syncing 1 workout to Petehome..."
        } else {
            content.body = "Syncing \(workoutCount) workouts to Petehome..."
        }
        content.sound = .default

        content.userInfo = [
            "workoutCount": workoutCount,
            "type": "syncing"
        ]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "syncing-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("🔔 Failed to send syncing notification: \(error)")
            } else {
                print("🔔 Sent syncing notification for \(workoutCount) workout(s)")
            }
        }
    }

    // MARK: - Loading
    
    func loadPendingNotifications() {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            Task { @MainActor in
                self.pendingNotifications = requests
            }
        }
    }
}

// MARK: - Time Picker Helper

extension NotificationManager {
    
    /// Update reminder time from the routine's training time string (e.g. "12:00 PM")
    /// Called when workout definitions are fetched from the API
    func updateFromTrainingTime(_ timeString: String) {
        guard let (hour, minute) = Self.parseTimeString(timeString) else {
            print("🔔 Could not parse training time: \(timeString)")
            return
        }

        let changed = hour != reminderHour || minute != reminderMinute
        guard changed else { return }

        print("🔔 Updating reminder time from routine: \(timeString) → \(hour):\(String(format: "%02d", minute))")
        // Set both without triggering reschedule twice
        UserDefaults.standard.set(hour, forKey: "reminderHour")
        UserDefaults.standard.set(minute, forKey: "reminderMinute")
        if remindersEnabled {
            scheduleWorkoutReminders()
        }
    }

    /// Parse a time string like "12:00 PM" or "2:30 PM" into (hour24, minute)
    static func parseTimeString(_ timeString: String) -> (hour: Int, minute: Int)? {
        let trimmed = timeString.trimmingCharacters(in: .whitespaces)
        let parts = trimmed.split(separator: " ")
        guard parts.count == 2 else { return nil }

        let timeParts = parts[0].split(separator: ":")
        guard timeParts.count == 2,
              var hour = Int(timeParts[0]),
              let minute = Int(timeParts[1]) else { return nil }

        let period = parts[1].uppercased()
        if period == "PM" && hour != 12 { hour += 12 }
        if period == "AM" && hour == 12 { hour = 0 }

        guard (0...23).contains(hour), (0...59).contains(minute) else { return nil }
        return (hour, minute)
    }

    static let availableHours = Array(5...22) // 5 AM to 10 PM
    
    static func formatHour(_ hour: Int) -> String {
        let displayHour = hour % 12 == 0 ? 12 : hour % 12
        let ampm = hour < 12 ? "AM" : "PM"
        return "\(displayHour) \(ampm)"
    }
}

// MARK: - Notification Delegate

extension NotificationManager: UNUserNotificationCenterDelegate {
    
    /// Handle notification when app is in foreground
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound])
    }
    
    /// Handle notification action response
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let actionIdentifier = response.actionIdentifier
        let categoryIdentifier = response.notification.request.content.categoryIdentifier
        
        print("🔔 Notification response: action=\(actionIdentifier), category=\(categoryIdentifier)")
        
        Task { @MainActor in
            switch categoryIdentifier {
            case Self.gymArrivalCategory:
                switch actionIdentifier {
                case Self.startWorkoutAction, UNNotificationDefaultActionIdentifier:
                    // User tapped "Open App" or tapped the notification itself
                    print("🔔 User opened app from gym arrival notification")
                    WKInterfaceDevice.current().play(.success)
                    onStartWorkoutFromNotification?()

                case Self.dismissAction:
                    print("🔔 User dismissed gym arrival notification")
                    WKInterfaceDevice.current().play(.click)

                default:
                    break
                }

            case Self.syncWorkoutCategory:
                switch actionIdentifier {
                case Self.syncNowAction, UNNotificationDefaultActionIdentifier:
                    // User tapped "Sync Now" or tapped the notification itself
                    print("🔔 User wants to sync workout from notification")
                    WKInterfaceDevice.current().play(.success)
                    onSyncFromNotification?()

                case Self.dismissAction:
                    print("🔔 User dismissed sync reminder notification")
                    WKInterfaceDevice.current().play(.click)

                default:
                    break
                }

            default:
                break
            }
            completionHandler()
        }
    }
}

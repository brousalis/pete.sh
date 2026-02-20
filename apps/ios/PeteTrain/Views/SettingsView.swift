import SwiftUI
import SwiftData
import WatchKit

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("devModeEnabled") private var devModeEnabled = false
    @AppStorage("devDayOverride") private var devDayOverride = 1
    @AppStorage("skipRestInGuidedMode") private var skipRestInGuidedMode = true
    @AppStorage("trackSetsInGuidedMode") private var trackSetsInGuidedMode = true
    @State private var healthKit = HealthKitManager.shared
    @State private var locationManager = LocationManager.shared
    @State private var notificationManager = NotificationManager.shared
    @State private var syncManager = SyncManager.shared
    @State private var workoutDataManager = WorkoutDataManager.shared
    @State private var showManualLog = false
    @State private var showHistoricalSync = false
    @State private var historicalSyncResult: HistoricalSyncResult?
    
    private var currentWeekday: String {
        CycleManager.currentWeekdayName()
    }
    
    private var currentDayNumber: Int {
        CycleManager.currentDayNumber()
    }
    
    private var currentDay: Day {
        workoutDataManager.day(for: currentDayNumber) ?? Day.placeholder(for: currentDayNumber)
    }
    
    var body: some View {
        List {
            SwiftUI.Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Today")
                        .font(.system(size: 12, design: .rounded))
                    
                    Text(currentWeekday)
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Workout")
                        .font(.system(size: 12, design: .rounded))
                    
                    HStack(spacing: 6) {
                        Text("Day \(currentDayNumber)")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.orange)
                        
                        Text("•")
                            .foregroundStyle(.secondary)
                        
                        Text(currentDay.name)
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
            } header: {
                Text("Schedule")
            } footer: {
                Text("Monday = Day 1, Sunday = Day 7")
                    .font(.system(.caption2, design: .rounded))
            }
            
            // Weekly Stats Section
            SwiftUI.Section {
                HStack(spacing: 12) {
                    SettingsStatItem(
                        icon: "flame.fill",
                        value: formatCalories(healthKit.weeklyActiveCalories),
                        label: "Cal",
                        color: .red
                    )
                    
                    SettingsStatItem(
                        icon: "figure.run",
                        value: "\(healthKit.weeklyWorkoutCount)",
                        label: "Workouts",
                        color: .green
                    )
                    
                    SettingsStatItem(
                        icon: "bolt.fill",
                        value: "\(Int(healthKit.weeklyExerciseMinutes))",
                        label: "Min",
                        color: .cyan
                    )
                }
                .padding(.vertical, 4)
            } header: {
                Text("This Week")
            }
            
            // Health Stats Section
            SwiftUI.Section {
                if healthKit.restingHeartRate > 0 {
                    HStack {
                        Image(systemName: "heart.fill")
                            .foregroundStyle(.red)
                            .font(.caption)
                        Text("Resting HR")
                            .font(.system(.caption, design: .rounded))
                        Spacer()
                        Text("\(Int(healthKit.restingHeartRate)) BPM")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
                
                HStack {
                    Image(systemName: "figure.walk")
                        .foregroundStyle(.orange)
                        .font(.caption)
                    Text("Today's Distance")
                        .font(.system(.caption, design: .rounded))
                    Spacer()
                    Text(healthKit.formattedTodayDistance)
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                HStack {
                    Image(systemName: "heart.text.square.fill")
                        .foregroundStyle(.pink)
                        .font(.caption)
                    Text("Move Goal")
                        .font(.system(.caption, design: .rounded))
                    Spacer()
                    Text("\(Int(healthKit.moveGoal)) CAL")
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                // Manual workout log
                Button {
                    showManualLog = true
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(.red)
                            .font(.caption)
                        Text("Log Workout Manually")
                            .font(.system(.caption, design: .rounded))
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)
            } header: {
                Text("Health")
            } footer: {
                Text("Use manual log if you forgot to start live workout")
                    .font(.system(.caption2, design: .rounded))
            }
            
            // Weekly Schedule Section
            SwiftUI.Section {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(1...7), id: \.self) { dayNum in
                        let day = workoutDataManager.day(for: dayNum)
                        let weekdayName = weekdayName(for: dayNum)
                        let isToday = dayNum == currentDayNumber

                        HStack {
                            Text(weekdayName)
                                .font(.system(.caption, design: .rounded))
                                .foregroundStyle(isToday ? .orange : .secondary)
                                .frame(width: 36, alignment: .leading)

                            Text(day?.shortName ?? "")
                                .font(.system(.caption, design: .rounded))
                                .foregroundStyle(isToday ? .white : .secondary)
                        }
                    }
                }
                .padding(.vertical, 4)
            } header: {
                Text("Weekly Schedule")
            }
            
            // Data Management Section
            SwiftUI.Section {
                let summary = DataExporter.getSummary(modelContext: modelContext)
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Workouts")
                            .font(.system(.caption, design: .rounded))
                        Spacer()
                        Text("\(summary.totalWorkouts)")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    
                    HStack {
                        Text("Exercise Logs")
                            .font(.system(.caption, design: .rounded))
                        Spacer()
                        Text("\(summary.totalExerciseLogs)")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    
                    HStack {
                        Text("PRs")
                            .font(.system(.caption, design: .rounded))
                        Spacer()
                        Text("\(summary.totalPRs)")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    
                    Text(summary.dateRange)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.tertiary)
                }
                
                NavigationLink {
                    DataExportView()
                } label: {
                    HStack {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundStyle(.cyan)
                        Text("Export Data")
                            .font(.system(.caption, design: .rounded))
                    }
                }
            } header: {
                Text("Data")
            }
            
            // Location Automation Section
            SwiftUI.Section {
                Toggle(isOn: Binding(
                    get: { locationManager.isEnabled },
                    set: { locationManager.isEnabled = $0 }
                )) {
                    HStack {
                        Image(systemName: "location.fill")
                            .foregroundStyle(.blue)
                            .font(.caption)
                        Text("Auto Workout")
                            .font(.system(.subheadline, design: .rounded))
                    }
                }
                .tint(.blue)
                .onChange(of: locationManager.isEnabled) { _, enabled in
                    if enabled && !locationManager.isAuthorized {
                        locationManager.requestAuthorization()
                    }
                    WKInterfaceDevice.current().play(.click)
                }
                
                if locationManager.isEnabled {
                    Toggle(isOn: Binding(
                        get: { locationManager.autoStartEnabled },
                        set: { locationManager.autoStartEnabled = $0 }
                    )) {
                        Text("Start at gym")
                            .font(.system(.caption, design: .rounded))
                    }
                    .tint(.green)
                    
                    Toggle(isOn: Binding(
                        get: { locationManager.autoStopEnabled },
                        set: { locationManager.autoStopEnabled = $0 }
                    )) {
                        Text("Stop when home")
                            .font(.system(.caption, design: .rounded))
                    }
                    .tint(.orange)
                    
                    // Status
                    HStack {
                        Circle()
                            .fill(locationManager.isMonitoring ? Color.green : Color.gray)
                            .frame(width: 8, height: 8)
                        Text(locationManager.statusDescription)
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                        Spacer()
                        if locationManager.isAtGym {
                            Text("🏋️")
                        } else if locationManager.isAtHome {
                            Text("🏠")
                        }
                    }
                }
            } header: {
                Text("Location")
            } footer: {
                if locationManager.isEnabled {
                    Text("Auto-start at gym, auto-stop when you get home")
                        .font(.system(.caption2, design: .rounded))
                } else {
                    Text("Enable to auto-start/stop workouts by location")
                        .font(.system(.caption2, design: .rounded))
                }
            }
            
            // Location Setup Section (only show when location is enabled)
            if locationManager.isEnabled {
                // Gym Location Row
                SwiftUI.Section {
                    HStack {
                        Image(systemName: "dumbbell.fill")
                            .foregroundStyle(.green)
                            .font(.caption)
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                Text("Gym")
                                    .font(.system(.caption, design: .rounded))
                                if locationManager.isUsingDefaultGymLocation {
                                    Text("(default)")
                                        .font(.system(.caption2, design: .rounded))
                                        .foregroundStyle(.secondary)
                                }
                            }
                            if let distance = locationManager.distanceToGym {
                                Text("\(locationManager.formattedDistanceToGym) away")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundStyle(distance <= LocationManager.gymRadius ? .green : .secondary)
                            }
                        }
                        Spacer()
                        Button {
                            locationManager.setCurrentAsGym()
                        } label: {
                            Image(systemName: "location.fill")
                                .font(.caption2)
                                .foregroundStyle(.green)
                        }
                        .buttonStyle(.plain)
                        .disabled(locationManager.currentLocation == nil)
                    }

                    if locationManager.showGymSaved {
                        Text("✓ Gym location saved!")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.green)
                    }
                } header: {
                    Text("Gym Location")
                }

                // Home Location Row
                SwiftUI.Section {
                    HStack {
                        Image(systemName: "house.fill")
                            .foregroundStyle(.cyan)
                            .font(.caption)
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                Text("Home")
                                    .font(.system(.caption, design: .rounded))
                                if locationManager.isUsingDefaultHomeLocation {
                                    Text("(default)")
                                        .font(.system(.caption2, design: .rounded))
                                        .foregroundStyle(.secondary)
                                }
                            }
                            if let distance = locationManager.distanceToHome {
                                Text("\(locationManager.formattedDistanceToHome) away")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundStyle(distance <= LocationManager.homeRadius ? .cyan : .secondary)
                            }
                        }
                        Spacer()
                        Button {
                            locationManager.setCurrentAsHome()
                        } label: {
                            Image(systemName: "location.fill")
                                .font(.caption2)
                                .foregroundStyle(.cyan)
                        }
                        .buttonStyle(.plain)
                        .disabled(locationManager.currentLocation == nil)
                    }

                    if locationManager.showHomeSaved {
                        Text("✓ Home location saved!")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.cyan)
                    }
                } header: {
                    Text("Home Location")
                }

                // Reset to Defaults
                if !locationManager.isUsingDefaultGymLocation || !locationManager.isUsingDefaultHomeLocation {
                    SwiftUI.Section {
                        Button {
                            locationManager.resetToDefaultLocations()
                        } label: {
                            HStack {
                                Image(systemName: "arrow.counterclockwise")
                                    .font(.caption)
                                Text("Reset to Defaults")
                                    .font(.system(.caption, design: .rounded))
                            }
                            .foregroundStyle(.orange)
                        }
                        .buttonStyle(.plain)
                    } footer: {
                        Text("Gym: \(Int(LocationManager.gymRadius))m • Home: \(Int(LocationManager.homeRadius))m radius")
                            .font(.system(.caption2, design: .rounded))
                    }
                }
            }
            
            // Workout Settings Section
            SwiftUI.Section {
                Toggle(isOn: $skipRestInGuidedMode) {
                    HStack {
                        Image(systemName: "forward.fill")
                            .foregroundStyle(.cyan)
                            .font(.caption)
                        Text("Auto-Skip Rest")
                            .font(.system(.subheadline, design: .rounded))
                    }
                }
                .tint(.cyan)
                .onChange(of: skipRestInGuidedMode) { _, _ in
                    WKInterfaceDevice.current().play(.click)
                }
                
                Toggle(isOn: $trackSetsInGuidedMode) {
                    HStack {
                        Image(systemName: "circle.grid.3x3.fill")
                            .foregroundStyle(.orange)
                            .font(.caption)
                        Text("Track Each Set")
                            .font(.system(.subheadline, design: .rounded))
                    }
                }
                .tint(.orange)
                .onChange(of: trackSetsInGuidedMode) { _, _ in
                    WKInterfaceDevice.current().play(.click)
                }
            } header: {
                Text("Guided Workouts")
            } footer: {
                if trackSetsInGuidedMode {
                    Text("Complete each set before moving to next exercise")
                        .font(.system(.caption2, design: .rounded))
                } else {
                    Text("Complete exercise once and move to next")
                        .font(.system(.caption2, design: .rounded))
                }
            }
            
            // Notifications Section
            SwiftUI.Section {
                Toggle(isOn: Binding(
                    get: { notificationManager.remindersEnabled },
                    set: { newValue in
                        if newValue && !notificationManager.isAuthorized {
                            Task {
                                let granted = await notificationManager.requestAuthorization()
                                if granted {
                                    notificationManager.remindersEnabled = true
                                }
                            }
                        } else {
                            notificationManager.remindersEnabled = newValue
                        }
                        WKInterfaceDevice.current().play(.click)
                    }
                )) {
                    HStack {
                        Image(systemName: "bell.fill")
                            .foregroundStyle(.orange)
                            .font(.caption)
                        Text("Workout Reminders")
                            .font(.system(.subheadline, design: .rounded))
                    }
                }
                .tint(.orange)
                
                if notificationManager.remindersEnabled {
                    // Time picker
                    Picker("Time", selection: Binding(
                        get: { notificationManager.reminderHour },
                        set: { notificationManager.reminderHour = $0 }
                    )) {
                        ForEach(NotificationManager.availableHours, id: \.self) { hour in
                            Text(NotificationManager.formatHour(hour))
                                .tag(hour)
                        }
                    }
                    .font(.system(.caption, design: .rounded))
                    
                    Toggle(isOn: Binding(
                        get: { notificationManager.skipRecoveryDays },
                        set: { notificationManager.skipRecoveryDays = $0 }
                    )) {
                        Text("Skip rest days")
                            .font(.system(.caption, design: .rounded))
                    }
                    .tint(.green)
                    
                    // Status
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(.green)
                        Text("\(notificationManager.pendingNotifications.count) reminders scheduled")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
            } header: {
                Text("Notifications")
            } footer: {
                Text("Daily reminder to train at your preferred time")
                    .font(.system(.caption2, design: .rounded))
            }
            
            // Routine Section
            SwiftUI.Section {
                Button {
                    Task {
                        WKInterfaceDevice.current().play(.click)
                        await workoutDataManager.refreshFromAPI()
                        if workoutDataManager.lastError == nil {
                            WKInterfaceDevice.current().play(.success)
                        } else {
                            WKInterfaceDevice.current().play(.failure)
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "arrow.down.circle")
                            .foregroundStyle(.green)
                            .font(.caption)
                        Text("Fetch Latest Routine")
                            .font(.system(.caption, design: .rounded))
                        Spacer()
                        if workoutDataManager.isLoading {
                            ProgressView()
                                .scaleEffect(0.7)
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(workoutDataManager.isLoading)

                HStack {
                    Text("Status")
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(workoutDataManager.statusDescription)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Routine")
            } footer: {
                Text("Fetches and caches the latest workout routine from Petehome")
                    .font(.system(.caption2, design: .rounded))
            }

            // Petehome Sync Section
            SwiftUI.Section {
                // Auto-sync toggle
                Toggle(isOn: Binding(
                    get: { syncManager.autoSyncEnabled },
                    set: { syncManager.autoSyncEnabled = $0 }
                )) {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundStyle(.cyan)
                            .font(.caption)
                        Text("Auto-Sync Workouts")
                            .font(.system(.subheadline, design: .rounded))
                    }
                }
                .tint(.cyan)
                .onChange(of: syncManager.autoSyncEnabled) { _, _ in
                    WKInterfaceDevice.current().play(.click)
                }
                
                // Sync status
                HStack {
                    Circle()
                        .fill(syncStatusColor)
                        .frame(width: 8, height: 8)
                    Text(syncManager.statusDescription)
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                    Spacer()
                    if syncManager.isSyncing {
                        ProgressView()
                            .scaleEffect(0.7)
                    }
                }
                
                // Last sync time
                if syncManager.lastSyncDate != nil {
                    HStack {
                        Text("Last sync")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(syncManager.lastSyncDescription)
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
                
                // Manual sync button
                Button {
                    Task {
                        WKInterfaceDevice.current().play(.click)
                        await syncManager.performFullSync()
                        if syncManager.syncStatus == .success {
                            WKInterfaceDevice.current().play(.success)
                        } else {
                            WKInterfaceDevice.current().play(.failure)
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                            .foregroundStyle(.cyan)
                            .font(.caption)
                        Text("Sync Now")
                            .font(.system(.caption, design: .rounded))
                        Spacer()
                        if syncManager.pendingWorkoutsCount > 0 {
                            Text("\(syncManager.pendingWorkoutsCount) pending")
                                .font(.system(.caption2, design: .rounded))
                                .foregroundStyle(.orange)
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(syncManager.isSyncing)

                // Historical sync
                Button {
                    historicalSyncResult = nil
                    showHistoricalSync = true
                } label: {
                        HStack {
                            Image(systemName: "clock.arrow.circlepath")
                                .foregroundStyle(.purple)
                                .font(.caption)
                            Text("Sync Historical Data")
                                .font(.system(.caption, design: .rounded))
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                        }
                    }
                .buttonStyle(.plain)
                .disabled(syncManager.isHistoricalSyncInProgress)

                // Historical sync progress
                if syncManager.isHistoricalSyncInProgress {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Syncing...")
                                .font(.system(.caption, design: .rounded))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(syncManager.historicalSyncCompleted)/\(syncManager.historicalSyncTotal)")
                                .font(.system(.caption, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.cyan)
                        }
                        
                        ProgressView(value: syncManager.historicalSyncProgress)
                            .tint(.cyan)
                        
                        if syncManager.historicalSyncFailed > 0 {
                            Text("\(syncManager.historicalSyncFailed) failed")
                                .font(.system(.caption2, design: .rounded))
                                .foregroundStyle(.red)
                        }
                    }
                    .padding(.vertical, 4)
                }
                
            } header: {
                Text("Petehome Sync")
            } footer: {
                Text("Syncs workouts & daily metrics to Petehome")
                    .font(.system(.caption2, design: .rounded))
            }
            
            // Dev Mode Section
            SwiftUI.Section {
                Toggle(isOn: $devModeEnabled) {
                    Text("Dev Mode")
                        .font(.system(.subheadline, design: .rounded))
                }
                .tint(.orange)
                
                if devModeEnabled {
                    Picker("Day Override", selection: $devDayOverride) {
                        ForEach(1...7, id: \.self) { dayNum in
                            let day = workoutDataManager.day(for: dayNum)
                            Text("Day \(dayNum): \(day?.shortName ?? "")")
                                .tag(dayNum)
                        }
                    }
                    .font(.system(.caption, design: .rounded))
                }
            } header: {
                Text("Developer")
            } footer: {
                if devModeEnabled {
                    Text("Override active — showing Day \(devDayOverride)")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.orange)
                }
            }
        }
        .navigationTitle("Settings")
        .sheet(isPresented: $showManualLog) {
            NavigationStack {
                WorkoutCompleteView(
                    day: currentDay,
                    duration: 2700  // Default 45 min estimate
                )
            }
        }
        .sheet(isPresented: $showHistoricalSync) {
            HistoricalSyncSheet(
                syncManager: syncManager,
                result: $historicalSyncResult
            )
        }
        .onAppear {
            Task {
                await healthKit.fetchWeeklyStats()
                await healthKit.fetchAllTodayData()
            }
        }
    }
    
    private func weekdayName(for dayNumber: Int) -> String {
        let names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return names[dayNumber - 1]
    }
    
    private func formatCalories(_ calories: Double) -> String {
        if calories >= 1000 {
            return String(format: "%.1fk", calories / 1000)
        }
        return "\(Int(calories))"
    }
    
    private var syncStatusColor: Color {
        switch syncManager.statusColor {
        case "green": return .green
        case "red": return .red
        case "orange": return .orange
        case "cyan": return .cyan
        default: return .gray
        }
    }
}

// MARK: - Helper Views

struct SettingsStatItem: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(color)
            Text(value)
                .font(.system(.caption, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
            Text(label)
                .font(.system(size: 8, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Historical Sync Sheet

struct HistoricalSyncSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var syncManager: SyncManager
    @Binding var result: HistoricalSyncResult?
    
    @State private var selectedDays = 365
    @State private var syncWorkouts = true
    @State private var syncDailyMetrics = true
    @State private var isSyncing = false
    @State private var dailyMetricsSynced = 0
    
    let dayOptions = [30, 90, 180, 365, 730, 1825, 0] // 0 = all time
    
    func dayOptionLabel(_ days: Int) -> String {
        switch days {
        case 0: return "All Time"
        case 365: return "1 Year"
        case 730: return "2 Years"
        case 1825: return "5 Years"
        default: return "\(days) days"
        }
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Info
                    VStack(spacing: 8) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 32))
                            .foregroundStyle(.purple)
                        
                        Text("Sync Historical Data")
                            .font(.system(.headline, design: .rounded))
                        
                        Text("Upload past workouts and daily metrics to Petehome")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.bottom, 8)
                    
                    // Days selector
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Time Range")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                        
                        Picker("Days", selection: $selectedDays) {
                            ForEach(dayOptions, id: \.self) { days in
                                Text(dayOptionLabel(days)).tag(days)
                            }
                        }
                        .pickerStyle(.wheel)
                        .frame(height: 60)
                    }
                    
                    // Options
                    VStack(spacing: 8) {
                        Toggle(isOn: $syncWorkouts) {
                            HStack {
                                Image(systemName: "figure.run")
                                    .foregroundStyle(.green)
                                    .font(.caption)
                                Text("Workouts")
                                    .font(.system(.caption, design: .rounded))
                            }
                        }
                        .tint(.green)
                        
                        Toggle(isOn: $syncDailyMetrics) {
                            HStack {
                                Image(systemName: "chart.bar.fill")
                                    .foregroundStyle(.cyan)
                                    .font(.caption)
                                Text("Daily Metrics")
                                    .font(.system(.caption, design: .rounded))
                            }
                        }
                        .tint(.cyan)
                    }
                    .padding(.vertical, 8)
                    
                    // Progress
                    if isSyncing || syncManager.isHistoricalSyncInProgress {
                        VStack(spacing: 8) {
                            ProgressView(value: syncManager.historicalSyncProgress)
                                .tint(.purple)
                            
                            HStack {
                                Text("Syncing...")
                                    .font(.system(.caption, design: .rounded))
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text("\(syncManager.historicalSyncCompleted)/\(syncManager.historicalSyncTotal)")
                                    .font(.system(.caption, design: .rounded))
                                    .monospacedDigit()
                            }
                            
                            if syncManager.historicalSyncFailed > 0 {
                                Text("\(syncManager.historicalSyncFailed) failed")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundStyle(.red)
                            }
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.white.opacity(0.08))
                        )
                    }
                    
                    // Result
                    if let result = result {
                        VStack(spacing: 6) {
                            Image(systemName: result.failed == 0 ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                .font(.title2)
                                .foregroundStyle(result.failed == 0 ? .green : .orange)
                            
                            Text(result.summary)
                                .font(.system(.caption, design: .rounded))
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                            
                            if dailyMetricsSynced > 0 {
                                Text("\(dailyMetricsSynced) days of metrics synced")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundStyle(.cyan)
                            }
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.white.opacity(0.08))
                        )
                    }
                    
                    Spacer(minLength: 16)
                    
                    // Sync Button
                    Button {
                        startSync()
                    } label: {
                        HStack {
                            if isSyncing {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "arrow.up.circle.fill")
                                Text("Start Sync")
                            }
                        }
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.purple)
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(isSyncing || (!syncWorkouts && !syncDailyMetrics))
                    
                    // Done Button (after sync)
                    if result != nil && !isSyncing {
                        Button {
                            dismiss()
                        } label: {
                            Text("Done")
                                .font(.system(.subheadline, design: .rounded))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.15))
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()
            }
            .navigationTitle("Historical Sync")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .font(.system(.caption, design: .rounded))
                    .disabled(isSyncing)
                }
            }
        }
    }
    
    private func startSync() {
        isSyncing = true
        result = nil
        dailyMetricsSynced = 0
        WKInterfaceDevice.current().play(.click)
        
        Task {
            // Sync workouts
            if syncWorkouts {
                result = await syncManager.syncHistoricalWorkouts(days: selectedDays)
            }
            
            // Sync daily metrics
            if syncDailyMetrics {
                dailyMetricsSynced = await syncManager.syncHistoricalDailyMetrics(days: selectedDays)
            }
            
            // Create a default result if only syncing metrics
            if !syncWorkouts && syncDailyMetrics {
                result = HistoricalSyncResult(
                    total: 0,
                    synced: 0,
                    skipped: 0,
                    failed: 0,
                    errors: []
                )
            }
            
            isSyncing = false
            
            if (result?.failed ?? 0) == 0 {
                WKInterfaceDevice.current().play(.success)
            } else {
                WKInterfaceDevice.current().play(.notification)
            }
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
    .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

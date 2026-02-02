import SwiftUI
import SwiftData
import WatchKit

/// Consolidated Settings + History view (Page 3)
/// Contains all settings in one place - no duplicates
struct SettingsHistoryView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var healthKit = HealthKitManager.shared
    @State private var cycleManager = TrainingCycleManager.shared
    @State private var locationManager = LocationManager.shared
    @State private var bodyWeightManager = BodyWeightManager.shared
    @State private var notificationManager = NotificationManager.shared
    @State private var syncManager = SyncManager.shared
    @State private var historyViewModel = HistoryViewModel()

    @AppStorage("devModeEnabled") private var devModeEnabled = false
    @AppStorage("devDayOverride") private var devDayOverride = 1

    // Sheet states
    @State private var showHistoricalSync = false
    @State private var historicalSyncResult: HistoricalSyncResult?

    var body: some View {
        List {
            // MARK: - Sync & Data Section (at top)
            syncDataSection

            // MARK: - Progress Section
            progressSection

            // MARK: - Health Section
            healthSection

            // MARK: - Automation Section
            automationSection

            // MARK: - Developer Section
            developerSection
        }
        .listStyle(.plain)
        .sheet(isPresented: $showHistoricalSync) {
            HistoricalSyncSheet(syncManager: syncManager, result: $historicalSyncResult)
        }
        .onAppear {
            cycleManager.configure(with: modelContext)
            bodyWeightManager.configure(with: modelContext)
            historyViewModel.configure(with: modelContext)
            Task {
                await healthKit.fetchWeeklyStats()
            }
        }
    }

    // MARK: - Progress Section

    @ViewBuilder
    private var progressSection: some View {
        // Quick stats row
        HStack(spacing: 0) {
            MiniStatItem(value: "\(historyViewModel.currentStreak)", label: "Streak", icon: "flame.fill", color: historyViewModel.currentStreak > 0 ? .orange : .secondary)
            MiniStatItem(value: "\(historyViewModel.totalWorkouts)", label: "Total", icon: "checkmark.seal.fill", color: .green)
            MiniStatItem(value: formatCalories(healthKit.weeklyActiveCalories), label: "Week", icon: "flame", color: .red)
        }
        .padding(.vertical, 8)
        .listRowBackground(Color.white.opacity(0.06))
        .listRowInsets(EdgeInsets(top: 0, leading: 8, bottom: 0, trailing: 8))

        // Week calendar
        WeekCalendarRow(viewModel: historyViewModel)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8))

        // Training cycle
        TrainingCycleRow(cycleManager: cycleManager)
            .listRowBackground(Color.white.opacity(0.06))
            .listRowInsets(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8))
    }

    // MARK: - Health Section

    @ViewBuilder
    private var healthSection: some View {
        // Section header
        Text("HEALTH")
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 4, trailing: 8))

        // Body weight
        NavigationLink {
            BodyWeightView()
        } label: {
            HStack {
                Image(systemName: "scalemass.fill")
                    .font(.caption)
                    .foregroundStyle(.cyan)
                    .frame(width: 24)
                Text("Body Weight")
                    .font(.system(size: 13, design: .rounded))
                Spacer()
                if let weight = bodyWeightManager.currentWeight {
                    Text("\(Int(weight)) lbs")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(.cyan)
                }
            }
        }
        .listRowBackground(Color.white.opacity(0.06))
        .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))

        // Volume trends
        NavigationLink {
            WeeklyVolumeView()
        } label: {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
                    .frame(width: 24)
                Text("Volume Trends")
                    .font(.system(size: 13, design: .rounded))
            }
        }
        .listRowBackground(Color.white.opacity(0.06))
        .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))
    }

    // MARK: - Automation Section

    @ViewBuilder
    private var automationSection: some View {
        // Section header
        Text("AUTOMATION")
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 4, trailing: 8))

        // Notifications
        NotificationsRow(notificationManager: notificationManager)
            .listRowBackground(Color.white.opacity(0.06))
            .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))
    }

    // MARK: - Sync & Data Section

    @ViewBuilder
    private var syncDataSection: some View {
        // Section header
        Text("SYNC & DATA")
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 4, trailing: 8))

        // Petehome sync
        PetehomeSyncRow(
            syncManager: syncManager,
            onHistoricalSync: {
                historicalSyncResult = nil
                showHistoricalSync = true
            }
        )
        .listRowBackground(Color.white.opacity(0.06))
        .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))

        // Location automation (combined with sync)
        LocationAutomationRow(locationManager: locationManager, syncManager: syncManager)
            .listRowBackground(Color.white.opacity(0.06))
            .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))
    }

    // MARK: - Developer Section

    @ViewBuilder
    private var developerSection: some View {
        // Dev mode toggle
        Toggle(isOn: $devModeEnabled) {
            HStack {
                Image(systemName: "hammer.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
                    .frame(width: 24)
                Text("Developer Mode")
                    .font(.system(size: 13, design: .rounded))
            }
        }
        .tint(.orange)
        .listRowBackground(Color.white.opacity(0.06))
        .listRowInsets(EdgeInsets(top: 12, leading: 8, bottom: 6, trailing: 8))

        // Day override when dev mode enabled
        if devModeEnabled {
            Picker("Day Override", selection: $devDayOverride) {
                ForEach(Array(1...7), id: \.self) { dayNum in
                    let day = WorkoutData.days.first { $0.id == dayNum }
                    Text("Day \(dayNum): \(day?.shortName ?? "")").tag(dayNum)
                }
            }
            .font(.system(size: 12, design: .rounded))
            .listRowBackground(Color.orange.opacity(0.1))
            .listRowInsets(EdgeInsets(top: 4, leading: 8, bottom: 8, trailing: 8))
        }
    }

    private func formatCalories(_ calories: Double) -> String {
        if calories >= 1000 {
            return String(format: "%.1fk", calories / 1000)
        }
        return "\(Int(calories))"
    }
}

// MARK: - Mini Stat Item

private struct MiniStatItem: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
            Text(label)
                .font(.system(size: 8, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Week Calendar Row

private struct WeekCalendarRow: View {
    var viewModel: HistoryViewModel
    private var calendar: Calendar { Calendar.current }

    private var thisWeekDates: [Date] {
        let today = Date()
        guard let monday = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)) else { return [] }
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: monday) }
    }

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Text("This Week")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                Spacer()
                NavigationLink {
                    HistoryView()
                } label: {
                    Text("History")
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(.orange)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 3) {
                ForEach(Array(thisWeekDates.enumerated()), id: \.offset) { index, date in
                    let letters = ["M", "T", "W", "T", "F", "S", "S"]
                    let record = viewModel.record(for: date)
                    let isToday = calendar.isDateInToday(date)
                    let isFuture = date > Date()

                    VStack(spacing: 2) {
                        Text(letters[index])
                            .font(.system(size: 7, design: .rounded))
                            .foregroundStyle(.secondary)

                        Circle()
                            .fill(isToday ? Color.orange.opacity(0.25) : Color.clear)
                            .overlay(
                                Circle()
                                    .strokeBorder(
                                        isFuture ? Color.clear :
                                            (record == nil ? Color.red.opacity(0.3) :
                                                (record!.isComplete ? Color.green : Color.orange)),
                                        lineWidth: 2
                                    )
                            )
                            .overlay {
                                if let record = record, record.isComplete {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 7, weight: .bold))
                                        .foregroundStyle(.green)
                                }
                            }
                            .frame(width: 18, height: 18)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 4)
    }
}

// MARK: - Training Cycle Row

private struct TrainingCycleRow: View {
    @Bindable var cycleManager: TrainingCycleManager

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(cycleManager.currentCycle?.weekLabel ?? "Week 1")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(cycleManager.isDeloadWeek ? .green : .white)

                if cycleManager.isDeloadWeek {
                    Text("Deload week - lighter intensity")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.green.opacity(0.8))
                } else {
                    Text("\(cycleManager.weeksUntilDeload) weeks until deload")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Progress ring
            CycleProgressRing(
                progress: cycleManager.currentCycle?.cycleProgress ?? 0.2,
                isDeload: cycleManager.isDeloadWeek
            )
            .frame(width: 32, height: 32)

            // Action button
            Button {
                if cycleManager.isDeloadWeek {
                    cycleManager.resetCycle()
                } else {
                    cycleManager.markAsDeload()
                }
                WKInterfaceDevice.current().play(.click)
            } label: {
                Image(systemName: cycleManager.isDeloadWeek ? "arrow.counterclockwise" : "leaf.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(cycleManager.isDeloadWeek ? .orange : .green)
                    .frame(width: 28, height: 28)
                    .background(Circle().fill((cycleManager.isDeloadWeek ? Color.orange : Color.green).opacity(0.15)))
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 6)
    }
}

// MARK: - Location Automation Row (combined location + auto-sync)

private struct LocationAutomationRow: View {
    @Bindable var locationManager: LocationManager
    @Bindable var syncManager: SyncManager

    var body: some View {
        VStack(spacing: 8) {
            // Main toggle - enables location-based features
            Toggle(isOn: Binding(
                get: { locationManager.isEnabled },
                set: { newValue in
                    locationManager.isEnabled = newValue
                    WKInterfaceDevice.current().play(.click)

                    if newValue && !locationManager.isAuthorized {
                        locationManager.requestAuthorization()
                    }
                }
            )) {
                HStack {
                    Image(systemName: "location.fill")
                        .font(.caption)
                        .foregroundStyle(.blue)
                        .frame(width: 24)
                    Text("Smart Sync")
                        .font(.system(size: 13, design: .rounded))
                }
            }
            .tint(.blue)

            // Expanded options when enabled
            if locationManager.isEnabled {
                // Show authorization warning if not authorized
                if !locationManager.isAuthorized {
                    VStack(spacing: 4) {
                        Text(locationManager.authorizationDenied ? "Location permission denied" : "Requesting location access...")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundStyle(locationManager.authorizationDenied ? .red : .orange)
                        if locationManager.authorizationDenied {
                            Text("Open Watch Settings → Privacy → Location Services → PeteTrain")
                                .font(.system(size: 8, design: .rounded))
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.leading, 28)
                }

                VStack(spacing: 6) {
                    // What this does
                    Text("Notifies at gym, auto-syncs at home")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)

                    // Status
                    HStack {
                        Circle()
                            .fill(locationManager.isMonitoring ? Color.green : Color.gray)
                            .frame(width: 6, height: 6)
                        Text(locationManager.statusDescription)
                            .font(.system(size: 9, design: .rounded))
                            .foregroundStyle(.secondary)
                        Spacer()
                        if locationManager.isAtGym {
                            Text("At Gym")
                                .font(.system(size: 8, weight: .medium, design: .rounded))
                                .foregroundStyle(.green)
                        } else if locationManager.isAtHome {
                            Text("At Home")
                                .font(.system(size: 8, weight: .medium, design: .rounded))
                                .foregroundStyle(.cyan)
                        }
                    }

                    // Location buttons
                    HStack(spacing: 8) {
                        LocationSetButton(
                            label: "Gym",
                            icon: "dumbbell.fill",
                            color: .green,
                            isSet: locationManager.hasGymLocationSet,
                            onSet: { locationManager.setCurrentAsGym() },
                            onClear: { locationManager.clearGymLocation() }
                        )

                        LocationSetButton(
                            label: "Home",
                            icon: "house.fill",
                            color: .cyan,
                            isSet: locationManager.hasHomeLocationSet,
                            onSet: { locationManager.setCurrentAsHome() },
                            onClear: { locationManager.clearHomeLocation() }
                        )
                    }

                    if locationManager.needsLocationSetup {
                        Text("Set both locations to enable")
                            .font(.system(size: 8, design: .rounded))
                            .foregroundStyle(.orange)
                    }
                }
                .padding(.leading, 28)
            }
        }
        .padding(.vertical, 4)
        .onAppear {
            locationManager.recheckAuthorization()
        }
    }
}

private struct LocationSetButton: View {
    let label: String
    let icon: String
    let color: Color
    let isSet: Bool
    let onSet: () -> Void
    let onClear: () -> Void

    var body: some View {
        Button {
            if isSet {
                onClear()
            } else {
                onSet()
            }
            WKInterfaceDevice.current().play(.click)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 9))
                Text(isSet ? label : "Set \(label)")
                    .font(.system(size: 9, design: .rounded))
                if isSet {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 8))
                }
            }
            .foregroundStyle(isSet ? color : .secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(isSet ? color.opacity(0.15) : Color.white.opacity(0.05))
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Notifications Row

private struct NotificationsRow: View {
    @Bindable var notificationManager: NotificationManager

    var body: some View {
        VStack(spacing: 8) {
            // Main toggle
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
                        .font(.caption)
                        .foregroundStyle(.orange)
                        .frame(width: 24)
                    Text("Reminders")
                        .font(.system(size: 13, design: .rounded))
                }
            }
            .tint(.orange)

            // Time picker when enabled
            if notificationManager.remindersEnabled {
                Picker("Reminder Time", selection: Binding(
                    get: { notificationManager.reminderHour },
                    set: { notificationManager.reminderHour = $0 }
                )) {
                    ForEach(NotificationManager.availableHours, id: \.self) { hour in
                        Text(NotificationManager.formatHour(hour)).tag(hour)
                    }
                }
                .font(.system(size: 11, design: .rounded))
                .padding(.leading, 28)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Petehome Sync Row

private struct PetehomeSyncRow: View {
    @Bindable var syncManager: SyncManager
    let onHistoricalSync: () -> Void
    @State private var showDebugLog = false

    private var statusColor: Color {
        switch syncManager.statusColor {
        case "green": return .green
        case "red": return .red
        case "orange": return .orange
        case "cyan": return .cyan
        default: return .gray
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            // Header
            HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.caption)
                    .foregroundStyle(.cyan)
                    .frame(width: 24)
                Text("Petehome Sync")
                    .font(.system(size: 13, design: .rounded))
                Spacer()
                if syncManager.isSyncing {
                    ProgressView()
                        .scaleEffect(0.5)
                }
            }

            // Status & actions
            VStack(spacing: 6) {
                // Status line
                HStack {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 6, height: 6)
                    Text(syncManager.statusDescription)
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                    Spacer()
                    if syncManager.pendingWorkoutsCount > 0 {
                        Text("\(syncManager.pendingWorkoutsCount) pending")
                            .font(.system(size: 8, design: .rounded))
                            .foregroundStyle(.orange)
                    }
                }

                // Action buttons
                HStack(spacing: 8) {
                    // Sync now
                    Button {
                        Task {
                            WKInterfaceDevice.current().play(.click)
                            showDebugLog = true
                            await syncManager.performFullSync()
                            WKInterfaceDevice.current().play(syncManager.syncStatus == .success ? .success : .failure)
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 9))
                            Text("Sync Now")
                                .font(.system(size: 9, design: .rounded))
                        }
                        .foregroundStyle(.cyan)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(RoundedRectangle(cornerRadius: 6).fill(Color.cyan.opacity(0.15)))
                    }
                    .buttonStyle(.plain)
                    .disabled(syncManager.isSyncing)

                    // Historical sync
                    Button(action: onHistoricalSync) {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 9))
                            Text("History")
                                .font(.system(size: 9, design: .rounded))
                        }
                        .foregroundStyle(.purple)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(RoundedRectangle(cornerRadius: 6).fill(Color.purple.opacity(0.15)))
                    }
                    .buttonStyle(.plain)
                }

                // Debug log toggle
                if !syncManager.debugLog.isEmpty || syncManager.isSyncing {
                    Button {
                        showDebugLog.toggle()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: showDebugLog ? "chevron.up" : "chevron.down")
                                .font(.system(size: 8))
                            Text(showDebugLog ? "Hide Log" : "Show Log")
                                .font(.system(size: 8, design: .rounded))
                        }
                        .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }

                // Debug log content
                if showDebugLog && !syncManager.debugLog.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(Array(syncManager.debugLog.enumerated()), id: \.offset) { _, line in
                            Text(line)
                                .font(.system(size: 8, design: .monospaced))
                                .foregroundStyle(lineColor(for: line))
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(6)
                    .background(Color.black.opacity(0.3))
                    .cornerRadius(6)
                }
            }
            .padding(.leading, 28)
        }
        .padding(.vertical, 4)
    }

    private func lineColor(for line: String) -> Color {
        if line.contains("❌") { return .red }
        if line.contains("✅") { return .green }
        if line.contains("⚠️") { return .orange }
        if line.contains("📤") { return .cyan }
        return .secondary
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SettingsHistoryView()
    }
    .modelContainer(for: [WorkoutRecord.self, TrainingCycle.self], inMemory: true)
}

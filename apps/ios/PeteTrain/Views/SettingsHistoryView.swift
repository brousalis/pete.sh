import SwiftUI
import SwiftData
import WatchKit

/// Consolidated Settings + History view (Page 3)
/// Contains all settings in one place - no duplicates
struct SettingsHistoryView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var locationManager = LocationManager.shared
    @State private var notificationManager = NotificationManager.shared
    @State private var syncManager = SyncManager.shared
    @State private var workoutDataManager = WorkoutDataManager.shared
    @State private var mapleWalkManager = MapleWalkManager.shared

    @AppStorage("devModeEnabled") private var devModeEnabled = false
    @AppStorage("devDayOverride") private var devDayOverride = 1

    // Sheet states
    @State private var showHistoricalSync = false
    @State private var historicalSyncResult: HistoricalSyncResult?
    @State private var showMapleWalk = false
    @State private var showConcurrentWorkoutAlert = false

    var body: some View {
        List {
            // MARK: - Maple Walk Section
            mapleWalkSection

            // MARK: - Sync & Data Section (at top)
            syncDataSection

            // MARK: - Workout Data Section
            workoutDataSection

            // MARK: - Automation Section
            automationSection

            // MARK: - Developer Section
            developerSection
        }
        .listStyle(.plain)
        .sheet(isPresented: $showHistoricalSync) {
            HistoricalSyncSheet(syncManager: syncManager, result: $historicalSyncResult)
        }
        .fullScreenCover(isPresented: $showMapleWalk) {
            MapleWalkView()
        }
        .alert("Workout Active", isPresented: $showConcurrentWorkoutAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("End your current workout before starting a Maple Walk.")
        }
    }

    // MARK: - Workout Data Section

    @ViewBuilder
    private var workoutDataSection: some View {
        // Section header
        Text("WORKOUT DATA")
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 4, trailing: 8))

        // Workout data row
        WorkoutDataRow(manager: workoutDataManager)
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

    // MARK: - Maple Walk Section

    @ViewBuilder
    private var mapleWalkSection: some View {
        Button {
            if mapleWalkManager.isActive {
                showMapleWalk = true
            } else {
                showMapleWalk = true
            }
        } label: {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.green.opacity(0.15))
                        .frame(width: 32, height: 32)
                    Text("🐾")
                        .font(.system(size: 16))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Maple Walk")
                        .font(.system(.body, design: .rounded))
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)

                    if mapleWalkManager.isActive {
                        Text("Walk in progress...")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.green.opacity(0.7))
                    } else {
                        Text("Track bathroom breaks")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if mapleWalkManager.isActive {
                    Circle()
                        .fill(.green)
                        .frame(width: 8, height: 8)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .listRowBackground(Color.green.opacity(0.06))
        .listRowInsets(EdgeInsets(top: 10, leading: 8, bottom: 10, trailing: 8))
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

        // Smart sync toggle
        SmartSyncRow(locationManager: locationManager)
            .listRowBackground(Color.white.opacity(0.06))
            .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))

        // Saved locations section (only when smart sync is enabled)
        if locationManager.isEnabled {
            Text("SAVED LOCATIONS")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 4, trailing: 8))

            SavedLocationsRow(locationManager: locationManager)
                .listRowBackground(Color.white.opacity(0.06))
                .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))
        }
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
                    let day = workoutDataManager.day(for: dayNum)
                    Text("Day \(dayNum): \(day?.shortName ?? "")").tag(dayNum)
                }
            }
            .font(.system(size: 12, design: .rounded))
            .listRowBackground(Color.orange.opacity(0.1))
            .listRowInsets(EdgeInsets(top: 4, leading: 8, bottom: 8, trailing: 8))
        }
    }
}

// MARK: - Smart Sync Toggle Row

private struct SmartSyncRow: View {
    @Bindable var locationManager: LocationManager

    var body: some View {
        VStack(spacing: 8) {
            // Main toggle
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

            // Status when enabled
            if locationManager.isEnabled {
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
                } else {
                    VStack(spacing: 4) {
                        Text("Notifies at gym, auto-syncs at home")
                            .font(.system(size: 9, design: .rounded))
                            .foregroundStyle(.secondary)

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
                    }
                    .padding(.leading, 28)
                }
            }
        }
        .padding(.vertical, 4)
        .onAppear {
            locationManager.recheckAuthorization()
        }
    }
}

// MARK: - Saved Locations Row

private struct SavedLocationsRow: View {
    @Bindable var locationManager: LocationManager

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Gym row
            HStack(spacing: 6) {
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(.green)
                    .frame(width: 20)
                Text("Gym")
                    .font(.system(size: 11, design: .rounded))
                if locationManager.isUsingDefaultGymLocation {
                    Text("(default)")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let distance = locationManager.distanceToGym {
                    Text(locationManager.formattedDistanceToGym)
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(distance <= LocationManager.gymRadius ? .green : .secondary)
                }
                Button {
                    locationManager.setCurrentAsGym()
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    Image(systemName: "location.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.green)
                        .padding(6)
                        .background(Circle().fill(Color.green.opacity(0.15)))
                }
                .buttonStyle(.plain)
            }

            // Home row
            HStack(spacing: 6) {
                Image(systemName: "house.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(.cyan)
                    .frame(width: 20)
                Text("Home")
                    .font(.system(size: 11, design: .rounded))
                if locationManager.isUsingDefaultHomeLocation {
                    Text("(default)")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let distance = locationManager.distanceToHome {
                    Text(locationManager.formattedDistanceToHome)
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(distance <= LocationManager.homeRadius ? .cyan : .secondary)
                }
                Button {
                    locationManager.setCurrentAsHome()
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    Image(systemName: "location.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.cyan)
                        .padding(6)
                        .background(Circle().fill(Color.cyan.opacity(0.15)))
                }
                .buttonStyle(.plain)
            }

            // Reset to defaults button
            if !locationManager.isUsingDefaultGymLocation || !locationManager.isUsingDefaultHomeLocation {
                Button {
                    locationManager.resetToDefaultLocations()
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 9))
                        Text("Reset to Defaults")
                            .font(.system(size: 10, design: .rounded))
                    }
                    .foregroundStyle(.orange)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 4)
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

// MARK: - Workout Data Row

private struct WorkoutDataRow: View {
    @Bindable var manager: WorkoutDataManager

    private var sourceColor: Color {
        switch manager.dataSource {
        case .api:
            return .green
        case .cache:
            return .cyan
        case .fallback:
            return .orange
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            // Header
            HStack {
                Image(systemName: "dumbbell.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
                    .frame(width: 24)
                Text("Workout Definitions")
                    .font(.system(size: 13, design: .rounded))
                Spacer()
                if manager.isLoading {
                    ProgressView()
                        .scaleEffect(0.5)
                }
            }

            // Status
            VStack(spacing: 6) {
                HStack {
                    Circle()
                        .fill(sourceColor)
                        .frame(width: 6, height: 6)
                    Text(manager.statusDescription)
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                    Spacer()
                }

                // Error message
                if let error = manager.lastError {
                    Text(error)
                        .font(.system(size: 8, design: .rounded))
                        .foregroundStyle(.red)
                        .lineLimit(2)
                }

                // Refresh button
                Button {
                    Task {
                        WKInterfaceDevice.current().play(.click)
                        await manager.refreshFromAPI()
                        WKInterfaceDevice.current().play(manager.lastError == nil ? .success : .failure)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 9))
                        Text("Refresh from API")
                            .font(.system(size: 9, design: .rounded))
                    }
                    .foregroundStyle(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(RoundedRectangle(cornerRadius: 6).fill(Color.green.opacity(0.15)))
                }
                .buttonStyle(.plain)
                .disabled(manager.isLoading)
            }
            .padding(.leading, 28)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SettingsHistoryView()
    }
    .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

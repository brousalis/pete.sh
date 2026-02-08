import SwiftUI
import SwiftData
import WatchKit

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.scenePhase) private var scenePhase
    @State private var viewModel = WorkoutViewModel()
    @State private var healthKit = HealthKitManager.shared
    @State private var prManager = PRManager.shared
    @State private var locationManager = LocationManager.shared
    @State private var notificationManager = NotificationManager.shared
    @State private var syncManager = SyncManager.shared
    @State private var workoutDataManager = WorkoutDataManager.shared

    /// Track when the app last became active to throttle syncs
    @State private var lastActiveSyncDate: Date?

    /// Minimum time between auto-syncs (15 minutes for watch since it's opened less frequently)
    private let minimumSyncInterval: TimeInterval = 15 * 60

    var body: some View {
        DayView(viewModel: viewModel)
            .onAppear {
                configureManagers()
                requestAuthorizations()
                setupLocationCallbacks()
                setupNotificationCallbacks()
            }
            .onChange(of: workoutDataManager.days.count) { oldCount, newCount in
                // Refresh view when workout data loads from API
                if oldCount == 0 && newCount > 0 {
                    viewModel.refreshDay()
                }
            }
            .onChange(of: scenePhase) { oldPhase, newPhase in
                if newPhase == .active {
                    handleAppBecameActive()
                }
            }
    }

    /// Handle app becoming active - sync daily metrics if auto-sync is enabled
    private func handleAppBecameActive() {
        guard syncManager.autoSyncEnabled else { return }

        // Determine if enough time has passed since last sync
        let shouldSync: Bool
        if let lastSync = lastActiveSyncDate {
            shouldSync = Date().timeIntervalSince(lastSync) >= minimumSyncInterval
        } else {
            // First activation this session - sync
            shouldSync = true
        }

        if shouldSync {
            lastActiveSyncDate = Date()
            Task { @MainActor in
                print("📱 Auto-syncing daily metrics on app activation")
                await syncManager.syncDailyMetrics()
            }
        }
    }

    private func configureManagers() {
        viewModel.configure(with: modelContext)
        prManager.configure(with: modelContext)
    }

    private func requestAuthorizations() {
        Task {
            // HealthKit authorization
            let healthAuthorized = await healthKit.requestAuthorization()
            if healthAuthorized {
                await healthKit.fetchAllTodayData()
                await healthKit.fetchWeeklyStats()
            }

            // Notification authorization (for gym arrival notifications)
            _ = await notificationManager.requestAuthorization()
        }
    }

    private func setupLocationCallbacks() {
        // Capture references for use in closures
        let vm = viewModel
        let lm = locationManager
        let nm = notificationManager
        let sm = syncManager

        // Send notification when arriving at gym
        locationManager.onArriveAtGym = {
            Task { @MainActor in
                let day = vm.currentDay
                nm.sendGymArrivalNotification(dayNumber: day.id, dayName: day.name)
                print("📍 Sent gym arrival notification for Day \(day.id): \(day.name)")

                withAnimation {
                    lm.showToast(message: "At gym • Day \(day.id)", icon: "dumbbell.fill")
                }
            }
        }

        // Auto-sync when arriving home after gym
        locationManager.onLeaveGymAndArriveHome = {
            Task { @MainActor in
                print("📍 Arrived home after gym. Checking for unsynced workouts...")

                // Check for unsynced workouts from today
                let unsyncedCount = await sm.getUnsyncedWorkoutCount()
                print("📍 Unsynced workouts: \(unsyncedCount)")

                if unsyncedCount > 0 {
                    // Show toast and notification
                    withAnimation {
                        lm.showToast(message: "Syncing \(unsyncedCount) workout(s)...", icon: "arrow.triangle.2.circlepath")
                    }

                    // Send notification so user knows sync is happening
                    nm.sendSyncingNotification(workoutCount: unsyncedCount)

                    // AUTO-SYNC the workouts
                    print("📍 Starting auto-sync...")
                    let result = await sm.syncRecentWorkouts()
                    print("📍 Auto-sync complete: \(result.synced) synced, \(result.skipped) skipped, \(result.failed) failed")

                    // Show completion toast
                    if result.failed == 0 {
                        withAnimation {
                            lm.showToast(message: "✓ \(result.synced) synced!", icon: "checkmark.circle.fill")
                        }
                        WKInterfaceDevice.current().play(.success)
                    } else {
                        withAnimation {
                            lm.showToast(message: "\(result.failed) failed to sync", icon: "exclamationmark.triangle.fill")
                        }
                        WKInterfaceDevice.current().play(.failure)
                    }
                } else {
                    withAnimation {
                        lm.showToast(message: "Welcome home!", icon: "house.fill")
                    }
                }
            }
        }
    }

    private func setupNotificationCallbacks() {
        let sm = syncManager

        // Handle sync from notification
        notificationManager.onSyncFromNotification = {
            Task { @MainActor in
                print("🔔 Syncing recent workouts from notification...")
                let result = await sm.syncRecentWorkouts()
                print("🔔 Sync complete: \(result.synced) synced, \(result.skipped) already synced, \(result.failed) failed")
            }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [WorkoutRecord.self, ExerciseLog.self, PersonalRecord.self], inMemory: true)
}

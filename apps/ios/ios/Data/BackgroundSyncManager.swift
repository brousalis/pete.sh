import Foundation
import BackgroundTasks

/// Manages background sync tasks for the iOS app
/// Schedules periodic background app refresh to sync daily health metrics
@MainActor
final class BackgroundSyncManager {

    static let shared = BackgroundSyncManager()

    // MARK: - Task Identifiers

    /// Background task identifier for daily metrics sync
    /// Must match the identifier in Info.plist BGTaskSchedulerPermittedIdentifiers
    static let dailyMetricsSyncTaskIdentifier = "com.petehome.dailyMetricsSync"

    // MARK: - Configuration

    /// Minimum interval between background syncs (4 hours)
    private let minimumSyncInterval: TimeInterval = 4 * 60 * 60

    // MARK: - Dependencies

    private let syncManager: HealthKitSyncManager

    // MARK: - Init

    private init() {
        self.syncManager = HealthKitSyncManager.shared
    }

    // MARK: - Registration

    /// Register all background tasks with the system
    /// Call this in the app delegate's `application(_:didFinishLaunchingWithOptions:)`
    /// or in the App's init for SwiftUI lifecycle
    func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.dailyMetricsSyncTaskIdentifier,
            using: nil
        ) { [weak self] task in
            guard let self = self else {
                task.setTaskCompleted(success: false)
                return
            }
            Task { @MainActor in
                await self.handleDailyMetricsSyncTask(task as! BGAppRefreshTask)
            }
        }

        print("[BackgroundSync] Registered background task: \(Self.dailyMetricsSyncTaskIdentifier)")
    }

    // MARK: - Scheduling

    /// Schedule the next background sync
    /// Call this after completing a sync to ensure continuous background updates
    func scheduleBackgroundSync() {
        let request = BGAppRefreshTaskRequest(identifier: Self.dailyMetricsSyncTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: minimumSyncInterval)

        do {
            try BGTaskScheduler.shared.submit(request)
            print("[BackgroundSync] Scheduled next sync for \(request.earliestBeginDate?.description ?? "unknown")")
        } catch {
            print("[BackgroundSync] Failed to schedule background sync: \(error.localizedDescription)")
        }
    }

    /// Cancel any pending background sync tasks
    func cancelPendingTasks() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.dailyMetricsSyncTaskIdentifier)
        print("[BackgroundSync] Cancelled pending background sync tasks")
    }

    // MARK: - Task Handling

    /// Handle the background sync task
    private func handleDailyMetricsSyncTask(_ task: BGAppRefreshTask) async {
        print("[BackgroundSync] Starting background daily metrics sync")

        // Schedule the next sync before starting (in case this one fails or is cancelled)
        scheduleBackgroundSync()

        // Set up expiration handler
        task.expirationHandler = { [weak self] in
            print("[BackgroundSync] Task expired before completion")
            // Cancel any ongoing sync work if possible
            Task { @MainActor in
                self?.syncManager.log("Background sync cancelled due to time limit")
            }
        }

        // Perform the sync
        do {
            let syncedCount = await syncManager.syncDailyMetrics(days: 1)
            let success = syncedCount > 0
            task.setTaskCompleted(success: success)
            print("[BackgroundSync] Completed sync: \(syncedCount) day(s) synced, success: \(success)")
        } catch {
            print("[BackgroundSync] Sync failed: \(error.localizedDescription)")
            task.setTaskCompleted(success: false)
        }
    }

    // MARK: - Manual Trigger for Testing

    /// Manually trigger a sync (for testing purposes)
    /// In production, background syncs are triggered by the system
    func triggerSyncNow() async {
        print("[BackgroundSync] Manually triggered sync")
        _ = await syncManager.syncDailyMetrics(days: 1)
    }
}

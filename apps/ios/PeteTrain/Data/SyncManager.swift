import Foundation
import HealthKit
import Observation

/// Manages synchronization of workout and health data to Petehome
@MainActor
@Observable
final class SyncManager {
    
    static let shared = SyncManager()
    
    // MARK: - State

    var syncStatus: SyncStatus = .idle
    var lastSyncDate: Date?
    var lastSyncError: String?
    var pendingWorkoutsCount: Int = 0
    var isSyncing: Bool { syncStatus == .syncing }

    // MARK: - Debug Log (on-screen)
    var debugLog: [String] = []
    private let maxDebugLines = 50

    func log(_ message: String) {
        print(message) // Also print to console
        debugLog.append(message)
        if debugLog.count > maxDebugLines {
            debugLog.removeFirst()
        }
    }

    func clearLog() {
        debugLog.removeAll()
    }
    
    // Historical sync progress
    var isHistoricalSyncInProgress = false
    var historicalSyncTotal: Int = 0
    var historicalSyncCompleted: Int = 0
    var historicalSyncFailed: Int = 0
    var historicalSyncProgress: Double {
        guard historicalSyncTotal > 0 else { return 0 }
        return Double(historicalSyncCompleted + historicalSyncFailed) / Double(historicalSyncTotal)
    }
    
    // MARK: - Settings
    
    @ObservationIgnored
    private let defaults = UserDefaults.standard
    
    private let lastSyncKey = "petehome.lastSyncTimestamp"
    private let pendingWorkoutsKey = "petehome.pendingWorkouts"
    private let autoSyncEnabledKey = "petehome.autoSyncEnabled"
    
    var autoSyncEnabled: Bool {
        get { defaults.bool(forKey: autoSyncEnabledKey) }
        set { defaults.set(newValue, forKey: autoSyncEnabledKey) }
    }
    
    var lastSyncTimestamp: Date? {
        get { defaults.object(forKey: lastSyncKey) as? Date }
        set { defaults.set(newValue, forKey: lastSyncKey) }
    }
    
    // MARK: - Queue
    
    private var pendingWorkouts: [QueuedWorkout] {
        get {
            guard let data = defaults.data(forKey: pendingWorkoutsKey),
                  let workouts = try? JSONDecoder().decode([QueuedWorkout].self, from: data) else {
                return []
            }
            return workouts
        }
        set {
            let data = try? JSONEncoder().encode(newValue)
            defaults.set(data, forKey: pendingWorkoutsKey)
            pendingWorkoutsCount = newValue.count
        }
    }
    
    // MARK: - Dependencies
    
    private let healthKit = HealthKitManager.shared
    private let api = PetehomeAPI.shared
    
    // MARK: - Init
    
    private init() {
        // Load initial state
        lastSyncDate = lastSyncTimestamp
        pendingWorkoutsCount = pendingWorkouts.count
        
        // Set default for auto-sync
        if !defaults.exists(key: autoSyncEnabledKey) {
            autoSyncEnabled = true
        }
    }
    
    // MARK: - Public API
    
    /// Check if sync is available (API configured)
    var canSync: Bool {
        api.isConfigured
    }
    
    /// Sync a completed workout to Petehome
    /// Called automatically after live workouts end
    func syncWorkout(_ workout: HKWorkout, linkedDay: Day?) async {
        guard canSync else {
            print("⚠️ Petehome sync not configured, skipping")
            return
        }
        
        syncStatus = .syncing
        lastSyncError = nil
        
        do {
            // Build the payload
            let payload = try await healthKit.buildWorkoutPayload(workout: workout, linkedDay: linkedDay)
            
            // Sync with retry
            try await api.syncWorkoutWithRetry(payload)
            
            // Success
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
            syncStatus = .success
            
            print("✅ Workout synced to Petehome: \(workout.uuid.uuidString)")
            
        } catch {
            print("❌ Failed to sync workout: \(error.localizedDescription)")
            lastSyncError = error.localizedDescription
            syncStatus = .failed
            
            // Queue for retry
            enqueueWorkout(workout, dayNumber: linkedDay?.id)
        }
    }
    
    /// Sync today's daily health metrics
    func syncDailyMetrics() async {
        guard canSync else {
            print("⚠️ Petehome sync not configured, skipping daily metrics")
            return
        }
        
        syncStatus = .syncing
        lastSyncError = nil
        
        do {
            let metrics = try await healthKit.queryDailyMetrics(for: Date())
            try await api.syncDailyMetrics(metrics)
            
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
            syncStatus = .success
            
            print("✅ Daily metrics synced to Petehome")
            
        } catch {
            print("❌ Failed to sync daily metrics: \(error.localizedDescription)")
            lastSyncError = error.localizedDescription
            syncStatus = .failed
        }
    }
    
    /// Perform a full sync - recent workouts + queued workouts + daily metrics
    func performFullSync() async {
        clearLog()

        guard canSync else {
            log("❌ API not configured")
            return
        }

        syncStatus = .syncing
        lastSyncError = nil

        log("🔄 Starting full sync...")

        // First, sync recent workouts from HealthKit (last 7 days)
        log("🔄 Fetching HealthKit workouts...")
        let result = await syncHistoricalWorkouts(days: 7)
        log("🔄 Result: \(result.synced) synced, \(result.skipped) skipped, \(result.failed) failed")

        // Process queued workouts (previously failed)
        if !pendingWorkouts.isEmpty {
            log("🔄 Processing \(pendingWorkouts.count) queued...")
            await processQueue()
        }

        // Sync today's metrics
        log("🔄 Syncing daily metrics...")
        await syncDailyMetrics()

        log("✅ Sync complete")
    }
    
    /// Process the offline queue of failed syncs
    func processQueue() async {
        guard canSync else { return }

        let queue = pendingWorkouts
        guard !queue.isEmpty else { return }

        print("📤 Processing sync queue: \(queue.count) workouts")
        
        var newQueue: [QueuedWorkout] = []
        
        for queuedWorkout in queue {
            // Skip if too many retries
            if queuedWorkout.retryCount >= 5 {
                print("⏭️ Skipping workout \(queuedWorkout.id) - too many retries")
                continue
            }
            
            // Try to fetch and sync the workout
            do {
                if let workout = try await fetchWorkout(id: queuedWorkout.id) {
                    let day = queuedWorkout.dayNumber.flatMap { dayNum in WorkoutData.days.first { $0.id == dayNum } }
                    let payload = try await healthKit.buildWorkoutPayload(workout: workout, linkedDay: day)
                    try await api.syncWorkoutWithRetry(payload)
                    print("✅ Queued workout synced: \(queuedWorkout.id)")
                } else {
                    print("⚠️ Could not find workout \(queuedWorkout.id) in HealthKit")
                }
            } catch {
                print("❌ Failed to sync queued workout: \(error.localizedDescription)")
                var updatedWorkout = queuedWorkout
                updatedWorkout.retryCount += 1
                updatedWorkout.lastError = error.localizedDescription
                newQueue.append(updatedWorkout)
            }
        }
        
        pendingWorkouts = newQueue
        
        if newQueue.isEmpty {
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
        }
    }
    
    /// Clear the pending queue
    func clearQueue() {
        pendingWorkouts = []
    }
    
    // MARK: - Recent Workout Sync

    /// Get count of unsynced workouts from today
    /// Used to show sync reminder notification
    func getUnsyncedWorkoutCount() async -> Int {
        guard canSync else { return 0 }

        do {
            // Get today's workouts from HealthKit
            let workouts = try await fetchAllWorkouts(days: 1)
            guard !workouts.isEmpty else { return 0 }

            // Get already-synced workout IDs
            let alreadySynced = try await api.getSyncedWorkoutIDs(limit: 100)

            // Count unsynced
            let unsyncedCount = workouts.filter { !alreadySynced.contains($0.uuid.uuidString) }.count
            return unsyncedCount
        } catch {
            print("⚠️ Could not check unsynced workout count: \(error.localizedDescription)")
            return 0
        }
    }

    /// Sync today's workouts to Petehome
    /// Convenience method for sync reminder notification
    func syncRecentWorkouts() async -> HistoricalSyncResult {
        return await syncHistoricalWorkouts(days: 1)
    }

    // MARK: - Historical Sync

    /// Sync all historical workouts from HealthKit
    /// - Parameter days: Number of days to look back (default 90)
    /// - Returns: Summary of sync results
    func syncHistoricalWorkouts(days: Int = 90) async -> HistoricalSyncResult {
        guard canSync else {
            log("❌ API not configured")
            return HistoricalSyncResult(total: 0, synced: 0, skipped: 0, failed: 0, errors: ["API not configured"])
        }

        isHistoricalSyncInProgress = true
        historicalSyncTotal = 0
        historicalSyncCompleted = 0
        historicalSyncFailed = 0
        syncStatus = .syncing
        lastSyncError = nil

        log("📦 Sync last \(days) days...")

        // Get already-synced workout IDs to avoid duplicates
        var alreadySynced: Set<String> = []
        do {
            alreadySynced = try await api.getSyncedWorkoutIDs(limit: 500)
            log("📦 Server has \(alreadySynced.count) workouts")
        } catch {
            log("⚠️ Can't check server: \(error.localizedDescription)")
        }

        // Fetch all workouts from HealthKit
        let workouts: [HKWorkout]
        do {
            workouts = try await fetchAllWorkouts(days: days)
            log("📦 HealthKit: \(workouts.count) workouts")
            for workout in workouts.prefix(5) {
                let duration = Int(workout.duration / 60)
                let dateStr = workout.startDate.formatted(date: .omitted, time: .shortened)
                let idShort = String(workout.uuid.uuidString.prefix(8))
                log("  • \(workout.workoutActivityType.petehomeType) \(duration)m @\(dateStr) [\(idShort)]")
            }
            if workouts.count > 5 {
                log("  ... +\(workouts.count - 5) more")
            }
            if workouts.isEmpty {
                log("⚠️ No workouts found in HealthKit!")
                log("Check: Settings > Health > PeteTrain > Workouts = ON")
            }
        } catch {
            log("❌ HealthKit error: \(error.localizedDescription)")
            isHistoricalSyncInProgress = false
            syncStatus = .failed
            lastSyncError = error.localizedDescription
            return HistoricalSyncResult(total: 0, synced: 0, skipped: 0, failed: 0, errors: [error.localizedDescription])
        }
        
        // Filter out already-synced workouts
        let workoutsToSync = workouts.filter { !alreadySynced.contains($0.uuid.uuidString) }
        let skippedCount = workouts.count - workoutsToSync.count

        log("📦 To sync: \(workoutsToSync.count), already synced: \(skippedCount)")

        // Show which ones are being skipped vs synced
        if !workouts.isEmpty && workoutsToSync.isEmpty {
            log("⚠️ All workouts already on server:")
            for workout in workouts.prefix(3) {
                let idShort = String(workout.uuid.uuidString.prefix(8))
                log("  skip: [\(idShort)] \(workout.workoutActivityType.petehomeType)")
            }
        }

        if workoutsToSync.isEmpty {
            log("✅ All workouts already synced!")
            isHistoricalSyncInProgress = false
            syncStatus = .success
            return HistoricalSyncResult(total: 0, synced: 0, skipped: skippedCount, failed: 0, errors: [])
        }

        historicalSyncTotal = workoutsToSync.count

        var syncedCount = 0
        var failedCount = 0
        var errors: [String] = []

        // Sync each workout - fail immediately on first error
        for (index, workout) in workoutsToSync.enumerated() {
            let duration = Int(workout.duration / 60)
            log("📤 [\(index + 1)/\(workoutsToSync.count)] \(workout.workoutActivityType.petehomeType) \(duration)m...")

            do {
                // Try to match to a Pete Train day based on workout type and day of week
                let linkedDay = matchWorkoutToDay(workout)
                let payload = try await healthKit.buildWorkoutPayload(workout: workout, linkedDay: linkedDay)
                try await api.syncWorkoutWithRetry(payload, maxRetries: 2)

                syncedCount += 1
                historicalSyncCompleted = syncedCount
                log("   ✅ Synced!")

            } catch {
                // Fail immediately on first error
                failedCount += 1
                historicalSyncFailed = failedCount
                let errorMsg = "\(workout.workoutActivityType.petehomeType): \(error.localizedDescription)"
                errors.append(errorMsg)
                log("   ❌ \(error.localizedDescription)")

                isHistoricalSyncInProgress = false
                syncStatus = .failed
                lastSyncError = errorMsg

                return HistoricalSyncResult(
                    total: workoutsToSync.count,
                    synced: syncedCount,
                    skipped: skippedCount,
                    failed: failedCount,
                    errors: errors
                )
            }

            // Small delay to avoid rate limiting
            if index < workoutsToSync.count - 1 {
                try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 second
            }
        }
        
        isHistoricalSyncInProgress = false
        
        if failedCount == 0 && syncedCount > 0 {
            syncStatus = .success
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
        } else if syncedCount == 0 && failedCount > 0 {
            syncStatus = .failed
            lastSyncError = "All \(failedCount) workouts failed to sync"
        } else if syncedCount == 0 && failedCount == 0 {
            syncStatus = .success
        } else {
            syncStatus = .success
        }
        
        let result = HistoricalSyncResult(
            total: workoutsToSync.count,
            synced: syncedCount,
            skipped: skippedCount,
            failed: failedCount,
            errors: errors
        )
        
        print("📦 Historical sync complete: \(result.synced) synced, \(result.skipped) skipped, \(result.failed) failed")
        
        return result
    }
    
    /// Fetch all workouts from HealthKit within a date range
    /// - Parameter days: Number of days to look back, or 0 for all time
    private func fetchAllWorkouts(days: Int) async throws -> [HKWorkout] {
        let endDate = Date()
        let startDate: Date
        
        if days == 0 {
            // All time - go back to HealthKit's beginning (2014)
            startDate = Date(timeIntervalSince1970: 0)
        } else {
            let calendar = Calendar.current
            guard let date = calendar.date(byAdding: .day, value: -days, to: endDate) else {
                return []
            }
            startDate = date
        }
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: .workoutType(),
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let workouts = (samples as? [HKWorkout]) ?? []
                continuation.resume(returning: workouts)
            }
            
            HealthKitManager.shared.healthStore.execute(query)
        }
    }

    /// Try to match a HealthKit workout to a Pete Train day based on workout type and day of week
    /// WorkoutData.days automatically uses dynamic data from WorkoutDataManager when available
    private func matchWorkoutToDay(_ workout: HKWorkout) -> Day? {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: workout.startDate)

        // Convert to Pete Train day number (Mon=1, Sun=7)
        let dayNumber: Int
        if weekday == 1 {
            dayNumber = 7 // Sunday
        } else {
            dayNumber = weekday - 1
        }

        // Find the day (WorkoutData.days uses dynamic data when available)
        guard let day = WorkoutData.days.first(where: { $0.id == dayNumber }) else {
            return nil
        }

        // Verify the workout type matches what Pete Train would have recorded
        let expectedType = day.startingActivityType.healthKitType
        if workout.workoutActivityType == expectedType {
            return day
        }

        // Also check if it's a Pete Train workout by brand name
        if let brand = workout.metadata?[HKMetadataKeyWorkoutBrandName] as? String,
           brand.contains("Pete Train") {
            return day
        }

        return nil
    }
    
    /// Sync historical daily metrics for the past N days
    /// - Parameter days: Number of days to sync, or 0 for all time (capped at 365 for performance)
    func syncHistoricalDailyMetrics(days: Int = 30) async -> Int {
        guard canSync else { return 0 }
        
        // Cap daily metrics at 365 days for performance (daily metrics are less critical for history)
        let effectiveDays = days == 0 ? 365 : min(days, 365)
        
        isHistoricalSyncInProgress = true
        historicalSyncTotal = effectiveDays
        historicalSyncCompleted = 0
        historicalSyncFailed = 0
        syncStatus = .syncing
        
        print("📊 Syncing daily metrics for last \(effectiveDays) days...")
        
        let calendar = Calendar.current
        var syncedCount = 0
        
        for dayOffset in 0..<effectiveDays {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: Date()) else {
                continue
            }
            
            do {
                let metrics = try await healthKit.queryDailyMetrics(for: date)
                try await api.syncDailyMetrics(metrics)
                syncedCount += 1
                historicalSyncCompleted = syncedCount
                print("   ✅ Day \(dayOffset + 1)/\(days): \(metrics.date)")
            } catch {
                historicalSyncFailed += 1
                print("   ❌ Day \(dayOffset + 1)/\(days) failed: \(error.localizedDescription)")
            }
            
            // Small delay
            if dayOffset < effectiveDays - 1 {
                try? await Task.sleep(nanoseconds: 250_000_000) // 0.25 second
            }
        }
        
        isHistoricalSyncInProgress = false
        syncStatus = syncedCount > 0 ? .success : .failed
        
        if syncedCount > 0 {
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
        }
        
        print("📊 Daily metrics sync complete: \(syncedCount)/\(effectiveDays) days")
        
        return syncedCount
    }
    
    /// Test the API connection
    func testConnection() async -> Bool {
        print("🔌 SyncManager.testConnection() starting...")
        print("🔌 API configured: \(api.isConfigured)")
        print("🔌 Configuration: \(api.configurationSummary)")

        do {
            let result = try await api.testConnection()
            print("✅ Connection test passed")
            return result
        } catch PetehomeAPIError.unauthorized(let raw) {
            print("❌ Unauthorized: \(raw)")
            lastSyncError = "Unauthorized: \(raw)"
            return false
        } catch {
            print("❌ Connection test failed: \(error.localizedDescription)")
            lastSyncError = error.localizedDescription
            return false
        }
    }
    
    // MARK: - Queue Management
    
    private func enqueueWorkout(_ workout: HKWorkout, dayNumber: Int?) {
        var queue = pendingWorkouts
        
        // Don't add duplicates
        guard !queue.contains(where: { $0.id == workout.uuid.uuidString }) else {
            return
        }
        
        let queuedWorkout = QueuedWorkout(
            healthKitId: workout.uuid.uuidString,
            dayNumber: dayNumber
        )
        
        queue.append(queuedWorkout)
        pendingWorkouts = queue
        
        print("📥 Workout queued for retry: \(workout.uuid.uuidString)")
    }
    
    private func fetchWorkout(id: String) async throws -> HKWorkout? {
        guard let uuid = UUID(uuidString: id) else { return nil }
        
        let predicate = HKQuery.predicateForObject(with: uuid)
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: .workoutType(),
                predicate: predicate,
                limit: 1,
                sortDescriptors: nil
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let workout = samples?.first as? HKWorkout
                continuation.resume(returning: workout)
            }
            
            HealthKitManager.shared.healthStore.execute(query)
        }
    }

    // MARK: - Formatted Output
    
    var lastSyncDescription: String {
        guard let date = lastSyncDate else {
            return "Never synced"
        }
        
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
    
    var statusDescription: String {
        switch syncStatus {
        case .idle:
            return pendingWorkoutsCount > 0 ? "\(pendingWorkoutsCount) pending" : "Ready"
        case .syncing:
            return "Syncing..."
        case .success:
            return "Synced"
        case .failed:
            return lastSyncError ?? "Failed"
        case .queued:
            return "\(pendingWorkoutsCount) queued"
        }
    }
    
    var statusColor: String {
        switch syncStatus {
        case .idle:
            return pendingWorkoutsCount > 0 ? "orange" : "gray"
        case .syncing:
            return "cyan"
        case .success:
            return "green"
        case .failed:
            return "red"
        case .queued:
            return "orange"
        }
    }
}

// MARK: - UserDefaults Extension

extension UserDefaults {
    func exists(key: String) -> Bool {
        object(forKey: key) != nil
    }
}

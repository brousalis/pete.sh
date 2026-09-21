import Foundation
import HealthKit

/// Near-real-time HealthKit ingestion.
///
/// Previously the phone only synced on app activation or a `BGAppRefreshTask`,
/// so a workout could sit on the device for hours. petehome's post-workout
/// debrief is only useful if it lands while the session is still fresh, so the
/// app now registers `HKObserverQuery` with background delivery: HealthKit
/// wakes the app when new samples are written and the sync runs immediately.
///
/// Requires the `com.apple.developer.healthkit.background-delivery`
/// entitlement and the `HealthKit` background mode.
@MainActor
final class HealthKitObserver {

    static let shared = HealthKitObserver()

    private let healthStore = HKHealthStore()
    private var activeQueries: [HKObserverQuery] = []
    private var isStarted = false

    /// Collapse bursts of HealthKit notifications into a single sync. Ending a
    /// workout writes many sample types at once, which would otherwise fire
    /// the observer a dozen times in a few seconds.
    private var pendingSync: Task<Void, Never>?
    private let debounceNanoseconds: UInt64 = 20 * 1_000_000_000

    private init() {}

    /// Sample types worth waking the app for.
    private var observedTypes: [HKSampleType] {
        var types: [HKSampleType] = [HKObjectType.workoutType()]
        types.append(HKQuantityType(.heartRateVariabilitySDNN))
        if let rmssd = HealthKitPetehome.rmssdType {
            types.append(rmssd)
        }
        types.append(HKQuantityType(.restingHeartRate))
        types.append(HKQuantityType(.bodyMass))
        types.append(HKQuantityType(.vo2Max))
        types.append(HKCategoryType(.sleepAnalysis))
        return types
    }

    // MARK: - Lifecycle

    func start() {
        guard HKHealthStore.isHealthDataAvailable() else {
            log("HealthKit unavailable on this device")
            return
        }
        guard !isStarted else { return }
        isStarted = true

        for type in observedTypes {
            registerObserver(for: type)
            enableBackgroundDelivery(for: type)
        }

        log("Observing \(observedTypes.count) HealthKit types with background delivery")
    }

    func stop() {
        for query in activeQueries {
            healthStore.stop(query)
        }
        activeQueries.removeAll()
        pendingSync?.cancel()
        pendingSync = nil
        isStarted = false
    }

    // MARK: - Observers

    private func registerObserver(for type: HKSampleType) {
        let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completionHandler, error in
            if let error {
                let ref = self
                Task { @MainActor in
                    ref?.log("Observer error for \(type.identifier): \(error.localizedDescription)")
                }
                // Still call the handler; not doing so causes HealthKit to
                // stop delivering updates for this type.
                completionHandler()
                return
            }

            let ref = self
            Task { @MainActor in
                ref?.scheduleSync(reason: type.identifier)
                // HealthKit requires the completion handler on the same
                // delivery to acknowledge receipt, otherwise it retries with
                // backoff and eventually disables the observer.
                completionHandler()
            }
        }

        healthStore.execute(query)
        activeQueries.append(query)
    }

    private func enableBackgroundDelivery(for type: HKSampleType) {
        // Sleep and body mass only change once a day; hourly is plenty and
        // avoids waking the app unnecessarily.
        let frequency: HKUpdateFrequency = type == HKObjectType.workoutType() ? .immediate : .hourly

        healthStore.enableBackgroundDelivery(for: type, frequency: frequency) { [weak self] success, error in
            let ref = self
            Task { @MainActor in
                if let error {
                    ref?.log("Background delivery failed for \(type.identifier): \(error.localizedDescription)")
                } else if !success {
                    ref?.log("Background delivery declined for \(type.identifier)")
                }
            }
        }
    }

    // MARK: - Debounced sync

    private func scheduleSync(reason: String) {
        pendingSync?.cancel()
        pendingSync = Task { [weak self] in
            try? await Task.sleep(nanoseconds: self?.debounceNanoseconds ?? 20_000_000_000)
            guard !Task.isCancelled else { return }
            await self?.runSync(reason: reason)
        }
    }

    private func runSync(reason: String) async {
        let manager = HealthKitSyncManager.shared
        guard manager.canSync else {
            log("Skipping observer sync (\(reason)): API not configured")
            return
        }

        log("Observer sync triggered by \(reason)")

        // Two days of lookback covers workouts that started before midnight
        // and metrics that Apple backfills after the fact.
        let workouts = await manager.syncHistoricalWorkouts(days: 2)
        let metrics = await manager.syncDailyMetrics(days: 2)

        log("Observer sync complete: \(workouts.synced) workouts, \(metrics) days")
    }

    private func log(_ message: String) {
        print("[HealthKitObserver] \(message)")
    }
}

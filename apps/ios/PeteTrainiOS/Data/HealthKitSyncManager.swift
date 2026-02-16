import Foundation
import HealthKit
import Observation
import CoreLocation

/// Manages synchronization of workout and health data to Petehome from iOS
@MainActor
@Observable
final class HealthKitSyncManager {

    static let shared = HealthKitSyncManager()

    // MARK: - HealthKit

    let healthStore = HKHealthStore()
    var isAuthorized = false

    // MARK: - State

    var syncStatus: SyncStatus = .idle
    var lastSyncDate: Date?
    var lastSyncError: String?
    var pendingCount: Int = 0
    var isSyncing: Bool { syncStatus == .syncing }

    // MARK: - Debug Log (on-screen)

    var debugLog: [String] = []
    private let maxDebugLines = 100

    func log(_ message: String) {
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        let logLine = "[\(timestamp)] \(message)"
        print(logLine) // Also print to console
        debugLog.append(logLine)
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

    private let lastSyncKey = "petehome.ios.lastSyncTimestamp"
    private let autoSyncEnabledKey = "petehome.ios.autoSyncEnabled"

    var autoSyncEnabled: Bool {
        get { defaults.bool(forKey: autoSyncEnabledKey) }
        set { defaults.set(newValue, forKey: autoSyncEnabledKey) }
    }

    var lastSyncTimestamp: Date? {
        get { defaults.object(forKey: lastSyncKey) as? Date }
        set { defaults.set(newValue, forKey: lastSyncKey) }
    }

    // MARK: - Dependencies

    private let api = PetehomeAPI.shared

    // MARK: - Heart Rate (for zone calculations)

    var maxHeartRate: Double = 190 // 220 - age, updated from HealthKit if available
    var restingHeartRate: Double = 0

    // MARK: - Init

    private init() {
        // Load initial state
        lastSyncDate = lastSyncTimestamp
    }

    // MARK: - HealthKit Authorization

    var isHealthKitAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    func requestHealthKitAuthorization() async -> Bool {
        guard isHealthKitAvailable else {
            log("HealthKit not available on this device")
            return false
        }

        let typesToRead: Set<HKObjectType> = [
            // Activity
            HKQuantityType(.stepCount),
            HKQuantityType(.distanceWalkingRunning),
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.basalEnergyBurned),
            HKQuantityType(.appleExerciseTime),
            HKQuantityType(.appleStandTime),
            // Heart
            HKQuantityType(.heartRate),
            HKQuantityType(.restingHeartRate),
            HKQuantityType(.heartRateVariabilitySDNN),
            // Cardio Fitness
            HKQuantityType(.vo2Max),
            // Running Metrics
            HKQuantityType(.runningSpeed),
            HKQuantityType(.runningStrideLength),
            HKQuantityType(.runningPower),
            HKQuantityType(.runningGroundContactTime),
            HKQuantityType(.runningVerticalOscillation),
            // Cycling Metrics
            HKQuantityType(.cyclingSpeed),
            HKQuantityType(.cyclingCadence),
            HKQuantityType(.cyclingPower),
            HKQuantityType(.distanceCycling),
            // Walking Metrics
            HKQuantityType(.walkingHeartRateAverage),
            HKQuantityType(.walkingDoubleSupportPercentage),
            HKQuantityType(.walkingAsymmetryPercentage),
            HKQuantityType(.walkingSpeed),
            HKQuantityType(.walkingStepLength),
            // Workout Effort
            HKQuantityType(.physicalEffort),
            // Activity Summary
            HKObjectType.activitySummaryType(),
            // Workouts & Routes
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
            // User characteristics (for age-based max HR calculation)
            HKCharacteristicType(.dateOfBirth)
        ]

        do {
            try await healthStore.requestAuthorization(toShare: [], read: typesToRead)
            self.isAuthorized = true
            log("HealthKit authorized")
            await fetchUserAgeAndUpdateMaxHR()
            return true
        } catch {
            log("HealthKit authorization failed: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - User Age & Max HR

    private func fetchUserAgeAndUpdateMaxHR() async {
        // Pete's DOB for max HR calculation when HealthKit doesn't have it
        let ownerDateOfBirth: DateComponents = {
            var components = DateComponents()
            components.year = 1988
            components.month = 12
            components.day = 16
            return components
        }()

        // Try HealthKit first
        if isHealthKitAvailable {
            do {
                let dateOfBirth = try healthStore.dateOfBirthComponents()
                if let birthDate = Calendar.current.date(from: dateOfBirth) {
                    let age = Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year ?? 30
                    self.maxHeartRate = Double(220 - age)
                    log("Age from HealthKit: \(age) years, max HR: \(Int(maxHeartRate)) bpm")
                    return
                }
            } catch {
                // Fall through to use owner DOB
            }
        }

        // Use owner's DOB as fallback
        if let birthDate = Calendar.current.date(from: ownerDateOfBirth) {
            let age = Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year ?? 37
            self.maxHeartRate = Double(220 - age)
            log("Using owner DOB: \(age) years, max HR: \(Int(maxHeartRate)) bpm")
        }
    }

    // MARK: - Public API

    /// Check if sync is available (API configured)
    var canSync: Bool {
        api.isConfigured
    }

    /// Test the API connection
    func testConnection() async -> Bool {
        log("Testing connection...")
        log("API: \(api.configurationSummary)")

        do {
            let result = try await api.testConnection()
            log("Connection test passed")
            return result
        } catch PetehomeAPIError.unauthorized(let raw) {
            log("Unauthorized: \(raw)")
            lastSyncError = "Unauthorized"
            return false
        } catch {
            log("Connection failed: \(error.localizedDescription)")
            lastSyncError = error.localizedDescription
            return false
        }
    }

    /// Sync recent workouts (last N days)
    func syncRecent(days: Int = 7, forceResync: Bool = false) async -> HistoricalSyncResult {
        return await syncHistoricalWorkouts(days: days, forceResync: forceResync)
    }

    /// Sync all history
    func syncAllHistory(forceResync: Bool = false) async -> HistoricalSyncResult {
        return await syncHistoricalWorkouts(days: 365, forceResync: forceResync)
    }

    // MARK: - Historical Sync

    /// Sync historical workouts from HealthKit
    func syncHistoricalWorkouts(days: Int = 90, forceResync: Bool = false) async -> HistoricalSyncResult {
        guard canSync else {
            log("API not configured")
            return HistoricalSyncResult(total: 0, synced: 0, skipped: 0, failed: 0, errors: ["API not configured"])
        }

        isHistoricalSyncInProgress = true
        historicalSyncTotal = 0
        historicalSyncCompleted = 0
        historicalSyncFailed = 0
        syncStatus = .syncing
        lastSyncError = nil

        log("Starting sync for last \(days) days...")

        // Get already-synced workout IDs to avoid duplicates
        var alreadySynced: Set<String> = []
        if forceResync {
            log("Force resync enabled — will re-upload all workouts")
        } else {
            do {
                alreadySynced = try await api.getSyncedWorkoutIDs(limit: 500)
                log("Server has \(alreadySynced.count) workouts")
            } catch {
                log("Can't check server: \(error.localizedDescription)")
            }
        }

        // Fetch all workouts from HealthKit
        let workouts: [HKWorkout]
        do {
            workouts = try await fetchAllWorkouts(days: days)
            log("HealthKit: \(workouts.count) workouts found")
            for workout in workouts.prefix(5) {
                let duration = Int(workout.duration / 60)
                let dateStr = workout.startDate.formatted(date: .abbreviated, time: .shortened)
                let idShort = String(workout.uuid.uuidString.prefix(8))
                log("  \(workout.workoutActivityType.petehomeType) \(duration)m @\(dateStr) [\(idShort)]")
            }
            if workouts.count > 5 {
                log("  ... +\(workouts.count - 5) more")
            }
            if workouts.isEmpty {
                log("No workouts found in HealthKit")
                log("Check: Settings > Health > PeteTrain iOS > Workouts = ON")
            }
        } catch {
            log("HealthKit error: \(error.localizedDescription)")
            isHistoricalSyncInProgress = false
            syncStatus = .failed
            lastSyncError = error.localizedDescription
            return HistoricalSyncResult(total: 0, synced: 0, skipped: 0, failed: 0, errors: [error.localizedDescription])
        }

        // Filter out already-synced workouts
        let workoutsToSync = workouts.filter { !alreadySynced.contains($0.uuid.uuidString) }
        let skippedCount = workouts.count - workoutsToSync.count

        log("To sync: \(workoutsToSync.count), already synced: \(skippedCount)")

        if workoutsToSync.isEmpty {
            log("All workouts already synced!")
            isHistoricalSyncInProgress = false
            syncStatus = .success
            return HistoricalSyncResult(total: 0, synced: 0, skipped: skippedCount, failed: 0, errors: [])
        }

        historicalSyncTotal = workoutsToSync.count

        var syncedCount = 0
        var failedCount = 0
        var errors: [String] = []

        // Sync each workout
        for (index, workout) in workoutsToSync.enumerated() {
            let duration = Int(workout.duration / 60)
            log("[\(index + 1)/\(workoutsToSync.count)] \(workout.workoutActivityType.petehomeType) \(duration)m...")

            do {
                let payload = try await buildWorkoutPayload(workout: workout)
                try await api.syncWorkoutWithRetry(payload, maxRetries: 2)

                syncedCount += 1
                historicalSyncCompleted = syncedCount
                log("  Synced!")

            } catch {
                failedCount += 1
                historicalSyncFailed = failedCount
                let errorMsg = "\(workout.workoutActivityType.petehomeType): \(error.localizedDescription)"
                errors.append(errorMsg)
                log("  Failed: \(error.localizedDescription)")

                // Continue on error (don't fail immediately)
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
            log("Sync complete: \(syncedCount) synced")
        } else if syncedCount == 0 && failedCount > 0 {
            syncStatus = .failed
            lastSyncError = "All \(failedCount) workouts failed to sync"
            log("Sync failed: all \(failedCount) workouts failed")
        } else if syncedCount == 0 && failedCount == 0 {
            syncStatus = .success
            log("No new workouts to sync")
        } else {
            syncStatus = .success
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
            log("Sync complete: \(syncedCount) synced, \(failedCount) failed")
        }

        let result = HistoricalSyncResult(
            total: workoutsToSync.count,
            synced: syncedCount,
            skipped: skippedCount,
            failed: failedCount,
            errors: errors
        )

        return result
    }

    /// Sync daily metrics for a date range
    func syncDailyMetrics(days: Int = 7) async -> Int {
        guard canSync else {
            log("API not configured")
            return 0
        }

        log("Syncing daily metrics for last \(days) days...")

        let calendar = Calendar.current
        var syncedCount = 0

        for dayOffset in 0..<days {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: Date()) else {
                continue
            }

            do {
                let metrics = try await queryDailyMetrics(for: date)
                try await api.syncDailyMetrics(metrics)
                syncedCount += 1
                log("Day \(dayOffset + 1)/\(days): \(metrics.date) - synced")
            } catch {
                log("Day \(dayOffset + 1)/\(days) failed: \(error.localizedDescription)")
            }

            // Small delay
            if dayOffset < days - 1 {
                try? await Task.sleep(nanoseconds: 250_000_000) // 0.25 second
            }
        }

        log("Daily metrics sync: \(syncedCount)/\(days) days synced")

        if syncedCount > 0 {
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
        }

        return syncedCount
    }

    /// Sync all historical daily metrics (up to 365 days)
    func syncAllDailyMetricsHistory() async -> Int {
        guard canSync else {
            log("API not configured")
            return 0
        }

        log("Starting full daily metrics history sync (365 days)...")

        // Use the historical sync progress tracking
        isHistoricalSyncInProgress = true
        historicalSyncTotal = 365
        historicalSyncCompleted = 0
        historicalSyncFailed = 0

        let calendar = Calendar.current
        var syncedCount = 0

        for dayOffset in 0..<365 {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: Date()) else {
                historicalSyncFailed += 1
                continue
            }

            do {
                let metrics = try await queryDailyMetrics(for: date)
                try await api.syncDailyMetrics(metrics)
                syncedCount += 1
                historicalSyncCompleted += 1

                // Log progress every 30 days
                if (dayOffset + 1) % 30 == 0 {
                    log("Daily metrics: \(dayOffset + 1)/365 days processed (\(syncedCount) synced)")
                }
            } catch {
                historicalSyncFailed += 1
                // Only log failures periodically to avoid log spam
                if historicalSyncFailed <= 5 {
                    log("Day \(dayOffset + 1) failed: \(error.localizedDescription)")
                }
            }

            // Small delay to avoid overwhelming the API
            if dayOffset < 364 {
                try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
            }
        }

        isHistoricalSyncInProgress = false
        log("Full daily metrics sync complete: \(syncedCount)/365 days synced, \(historicalSyncFailed) failed")

        if syncedCount > 0 {
            lastSyncTimestamp = Date()
            lastSyncDate = lastSyncTimestamp
        }

        return syncedCount
    }

    // MARK: - HealthKit Queries

    private func fetchAllWorkouts(days: Int) async throws -> [HKWorkout] {
        let endDate = Date()
        let startDate: Date

        if days == 0 {
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

            self.healthStore.execute(query)
        }
    }

    // MARK: - Workout Payload Building

    private func buildWorkoutPayload(workout: HKWorkout) async throws -> WorkoutPayload {
        // Query all samples in parallel for efficiency
        async let hrSamples = queryHeartRateSamples(for: workout)
        async let cadenceSamples = queryCadenceSamples(for: workout)
        async let paceSamples = queryPaceSamples(for: workout)
        async let route = queryRoute(for: workout)
        
        // Query advanced running metrics (only available for running workouts)
        let isRunning = workout.workoutActivityType == .running
        async let strideLength = isRunning ? queryStrideLength(for: workout) : nil
        async let runningPower = isRunning ? queryRunningPower(for: workout) : nil
        async let groundContactTime = isRunning ? queryGroundContactTime(for: workout) : nil
        async let verticalOscillation = isRunning ? queryVerticalOscillation(for: workout) : nil
        
        // Query cycling metrics (only for cycling workouts)
        async let cyclingMetrics = queryCyclingMetrics(for: workout)
        
        // Query walking metrics (for walking and 'other' workouts - Maple walks use 'other' type)
        async let walkingMetrics = queryWalkingMetrics(for: workout)
        
        // Query effort score (available for all workout types)
        async let effortScore = queryEffortScore(for: workout)

        let hrSamplesResult = try await hrSamples
        let cadenceSamplesResult = try await cadenceSamples
        let paceSamplesResult = try await paceSamples
        let routeResult = try await route
        
        // Await advanced metrics
        let strideLengthResult = try await strideLength
        let runningPowerResult = try await runningPower
        let groundContactTimeResult = try await groundContactTime
        let verticalOscillationResult = try await verticalOscillation
        
        // Await cycling, walking, and effort
        let cyclingMetricsResult = try await cyclingMetrics
        let walkingMetricsResult = try await walkingMetrics
        let effortScoreResult = try await effortScore
        
        // Get workout events (synchronous)
        let workoutEvents = queryWorkoutEvents(for: workout)

        let hrValues = hrSamplesResult.map { $0.bpm }
        let avgHR = hrValues.isEmpty ? 0 : hrValues.reduce(0, +) / hrValues.count
        let minHR = hrValues.min() ?? 0
        let maxHR = hrValues.max() ?? 0

        let hrZones = calculateHeartRateZones(samples: hrSamplesResult, workoutDuration: workout.duration)

        let heartRateSummary = HeartRateSummary(
            average: avgHR,
            min: minHR,
            max: maxHR,
            resting: Int(restingHeartRate) > 0 ? Int(restingHeartRate) : nil,
            zones: hrZones
        )

        var runningMetrics: PetehomeRunningMetrics? = nil
        let hasRunningData = !cadenceSamplesResult.isEmpty || !paceSamplesResult.isEmpty ||
                             strideLengthResult != nil || runningPowerResult != nil
        
        if hasRunningData {
            let avgCadence = cadenceSamplesResult.isEmpty ? 0 : cadenceSamplesResult.map { $0.stepsPerMinute }.reduce(0, +) / cadenceSamplesResult.count
            let avgPace = paceSamplesResult.isEmpty ? 0 : paceSamplesResult.map { $0.minutesPerMile }.reduce(0, +) / Double(paceSamplesResult.count)
            let bestPace = paceSamplesResult.map { $0.minutesPerMile }.filter { $0 > 0 }.min() ?? 0
            
            // Calculate mile splits
            let splits = calculateMileSplits(
                for: workout,
                hrSamples: hrSamplesResult,
                cadenceSamples: cadenceSamplesResult,
                paceSamples: paceSamplesResult
            )

            runningMetrics = PetehomeRunningMetrics(
                cadence: PetehomeCadenceData(average: avgCadence, samples: cadenceSamplesResult),
                pace: PetehomePaceData(average: avgPace, best: bestPace, samples: paceSamplesResult),
                strideLength: strideLengthResult,
                runningPower: runningPowerResult,
                groundContactTime: groundContactTimeResult,
                verticalOscillation: verticalOscillationResult,
                splits: splits.isEmpty ? nil : splits
            )
        }

        let activeCalories = workout.statistics(for: HKQuantityType(.activeEnergyBurned))?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
        let basalCalories = workout.statistics(for: HKQuantityType(.basalEnergyBurned))?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
        let totalCalories = activeCalories + basalCalories
        let distanceMeters = workout.statistics(for: HKQuantityType(.distanceWalkingRunning))?.sumQuantity()?.doubleValue(for: .meter())

        let deviceInfo = PetehomeDeviceInfo(
            name: "iPhone",
            model: nil,
            hardwareVersion: nil,
            softwareVersion: nil
        )

        // Determine indoor/outdoor from workout metadata
        let isIndoor: Bool?
        if let indoorMetadata = workout.metadata?[HKMetadataKeyIndoorWorkout] as? Bool {
            isIndoor = indoorMetadata
        } else {
            // Fallback: infer from workout activity type and whether route exists
            switch workout.workoutActivityType {
            case .running, .walking, .hiking, .cycling, .other:
                isIndoor = routeResult == nil // No route likely means indoor (hiking/other = Maple walks)
            default:
                isIndoor = true // Strength, HIIT, etc. are indoor
            }
        }

        let appleHealthWorkout = AppleHealthWorkout(
            id: workout.uuid.uuidString,
            workoutType: workout.workoutActivityType.petehomeType,
            workoutTypeRaw: Int(workout.workoutActivityType.rawValue),
            startDate: workout.startDate.iso8601String,
            endDate: workout.endDate.iso8601String,
            duration: Int(workout.duration),
            activeCalories: activeCalories,
            totalCalories: totalCalories,
            distance: distanceMeters,
            distanceMiles: distanceMeters.map { $0 / 1609.344 },
            elevationGain: routeResult?.totalElevationGain,
            isIndoor: isIndoor,
            heartRate: heartRateSummary,
            heartRateSamples: hrSamplesResult,
            runningMetrics: runningMetrics,
            cyclingMetrics: cyclingMetricsResult,
            walkingMetrics: walkingMetricsResult,
            route: routeResult,
            workoutEvents: workoutEvents.isEmpty ? nil : workoutEvents,
            effortScore: effortScoreResult,
            source: "PeteTrain-iOS",
            sourceVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
            device: deviceInfo,
            weather: nil
        )

        return WorkoutPayload(
            workout: appleHealthWorkout,
            linkedWorkoutId: nil,
            linkedDay: nil
        )
    }

    // MARK: - Heart Rate Samples

    private func queryHeartRateSamples(for workout: HKWorkout) async throws -> [PetehomeHeartRateSample] {
        let heartRateType = HKQuantityType(.heartRate)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: heartRateType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { [weak self] _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                let hrSamples: [PetehomeHeartRateSample] = (samples as? [HKQuantitySample])?.map { sample in
                    PetehomeHeartRateSample(
                        timestamp: sample.startDate.iso8601String,
                        bpm: Int(sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))),
                        motionContext: self?.getMotionContext(from: sample)
                    )
                } ?? []

                let downsampledSamples = self?.downsampleHRSamples(hrSamples, targetInterval: 5) ?? hrSamples
                continuation.resume(returning: downsampledSamples)
            }

            self.healthStore.execute(query)
        }
    }

    private nonisolated func getMotionContext(from sample: HKQuantitySample) -> String {
        guard let context = sample.metadata?[HKMetadataKeyHeartRateMotionContext] as? Int else {
            return "notSet"
        }
        switch HKHeartRateMotionContext(rawValue: context) {
        case .sedentary: return "sedentary"
        case .active: return "active"
        default: return "notSet"
        }
    }

    private nonisolated func downsampleHRSamples(_ samples: [PetehomeHeartRateSample], targetInterval: TimeInterval = 5) -> [PetehomeHeartRateSample] {
        guard samples.count > 100 else { return samples }

        let formatter = ISO8601DateFormatter()
        var result: [PetehomeHeartRateSample] = []
        var lastTimestamp: Date?

        for sample in samples {
            guard let date = formatter.date(from: sample.timestamp) else { continue }

            if let last = lastTimestamp {
                if date.timeIntervalSince(last) >= targetInterval {
                    result.append(sample)
                    lastTimestamp = date
                }
            } else {
                result.append(sample)
                lastTimestamp = date
            }
        }

        return result
    }

    // MARK: - Cadence Samples

    private func queryCadenceSamples(for workout: HKWorkout) async throws -> [PetehomeCadenceSample] {
        // Try to calculate cadence from speed and stride length first (more accurate)
        // Cadence = Speed / Stride Length (in steps per minute)
        let cadenceFromMetrics = try await queryCadenceFromSpeedAndStride(for: workout)
        if !cadenceFromMetrics.isEmpty {
            return cadenceFromMetrics
        }
        
        // Fallback: Query individual step count samples and calculate cadence from sample duration
        let stepType = HKQuantityType(.stepCount)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: stepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                var cadenceSamples: [PetehomeCadenceSample] = []
                
                if let quantitySamples = samples as? [HKQuantitySample] {
                    for sample in quantitySamples {
                        let steps = sample.quantity.doubleValue(for: .count())
                        let durationMinutes = sample.endDate.timeIntervalSince(sample.startDate) / 60.0
                        
                        // Calculate steps per minute for this sample
                        if durationMinutes > 0 {
                            let stepsPerMinute = Int(steps / durationMinutes)
                            // Only include reasonable cadence values (100-220 SPM for running)
                            if stepsPerMinute >= 100 && stepsPerMinute <= 220 {
                                cadenceSamples.append(PetehomeCadenceSample(
                                    timestamp: sample.startDate.iso8601String,
                                    stepsPerMinute: stepsPerMinute
                                ))
                            }
                        }
                    }
                }

                continuation.resume(returning: cadenceSamples)
            }

            self.healthStore.execute(query)
        }
    }
    
    /// Calculate cadence from running speed and stride length
    /// Formula: Cadence (spm) = Speed (m/s) / Stride Length (m) * 60
    private func queryCadenceFromSpeedAndStride(for workout: HKWorkout) async throws -> [PetehomeCadenceSample] {
        let speedType = HKQuantityType(.runningSpeed)
        let strideType = HKQuantityType(.runningStrideLength)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        // Query speed samples
        let speedSamples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: speedType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKQuantitySample]) ?? [])
            }
            self.healthStore.execute(query)
        }
        
        // Query stride length samples
        let strideSamples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: strideType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKQuantitySample]) ?? [])
            }
            self.healthStore.execute(query)
        }
        
        // Need both speed and stride samples to calculate cadence
        guard !speedSamples.isEmpty && !strideSamples.isEmpty else {
            return []
        }
        
        // Create a dictionary of stride lengths by timestamp for quick lookup
        var strideByTimestamp: [TimeInterval: Double] = [:]
        for sample in strideSamples {
            let stride = sample.quantity.doubleValue(for: .meter())
            strideByTimestamp[sample.startDate.timeIntervalSinceReferenceDate] = stride
        }
        
        var cadenceSamples: [PetehomeCadenceSample] = []
        
        for speedSample in speedSamples {
            let speedMps = speedSample.quantity.doubleValue(for: .meter().unitDivided(by: .second()))
            
            // Find nearest stride length sample
            let timestamp = speedSample.startDate.timeIntervalSinceReferenceDate
            var nearestStride: Double? = nil
            var minDiff = TimeInterval.infinity
            
            for (strideTimestamp, stride) in strideByTimestamp {
                let diff = abs(timestamp - strideTimestamp)
                if diff < minDiff && diff < 60 { // Within 60 seconds
                    minDiff = diff
                    nearestStride = stride
                }
            }
            
            if let stride = nearestStride, stride > 0 {
                // Cadence = (speed / stride) * 60 seconds
                let cadence = Int((speedMps / stride) * 60.0)
                
                // Filter to reasonable running cadence
                if cadence >= 100 && cadence <= 220 {
                    cadenceSamples.append(PetehomeCadenceSample(
                        timestamp: speedSample.startDate.iso8601String,
                        stepsPerMinute: cadence
                    ))
                }
            }
        }
        
        return cadenceSamples
    }
    
    /// Fallback method to calculate cadence from step count aggregated per minute
    private func queryCadenceFromStepCount(for workout: HKWorkout) async throws -> [PetehomeCadenceSample] {
        let stepType = HKQuantityType(.stepCount)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )

        let interval = DateComponents(minute: 1)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsCollectionQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum,
                anchorDate: workout.startDate,
                intervalComponents: interval
            )

            query.initialResultsHandler = { _, results, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                var samples: [PetehomeCadenceSample] = []
                results?.enumerateStatistics(from: workout.startDate, to: workout.endDate) { statistics, _ in
                    if let sum = statistics.sumQuantity() {
                        let steps = sum.doubleValue(for: .count())
                        // This is total steps in the minute, which equals steps-per-minute
                        let stepsPerMinute = Int(steps)
                        // Only include reasonable cadence values
                        if stepsPerMinute >= 100 && stepsPerMinute <= 220 {
                            samples.append(PetehomeCadenceSample(
                                timestamp: statistics.startDate.iso8601String,
                                stepsPerMinute: stepsPerMinute
                            ))
                        }
                    }
                }

                continuation.resume(returning: samples)
            }

            self.healthStore.execute(query)
        }
    }

    // MARK: - Pace Samples

    private func queryPaceSamples(for workout: HKWorkout) async throws -> [PetehomePaceSample] {
        let speedType = HKQuantityType(.runningSpeed)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: speedType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                let paceSamples: [PetehomePaceSample] = (samples as? [HKQuantitySample])?.map { sample in
                    let speedMps = sample.quantity.doubleValue(for: .meter().unitDivided(by: .second()))
                    let speedMph = speedMps * 2.237
                    let minutesPerMile = speedMph > 0 ? 60.0 / speedMph : 0

                    return PetehomePaceSample(
                        timestamp: sample.startDate.iso8601String,
                        minutesPerMile: minutesPerMile,
                        speedMph: speedMph
                    )
                } ?? []

                continuation.resume(returning: paceSamples)
            }

            self.healthStore.execute(query)
        }
    }
    
    // MARK: - Advanced Running Metrics
    
    /// Query stride length samples from HealthKit
    private func queryStrideLength(for workout: HKWorkout) async throws -> PetehomeStrideLengthData? {
        let strideLengthType = HKQuantityType(.runningStrideLength)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: strideLengthType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let strideSamples: [PetehomeStrideLengthSample] = quantitySamples.map { sample in
                    let meters = sample.quantity.doubleValue(for: .meter())
                    return PetehomeStrideLengthSample(
                        timestamp: sample.startDate.iso8601String,
                        meters: meters
                    )
                }
                
                let avgStride = strideSamples.map { $0.meters }.reduce(0, +) / Double(strideSamples.count)
                
                continuation.resume(returning: PetehomeStrideLengthData(
                    average: avgStride,
                    samples: strideSamples
                ))
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Query running power samples from HealthKit
    private func queryRunningPower(for workout: HKWorkout) async throws -> PetehomeRunningPowerData? {
        let powerType = HKQuantityType(.runningPower)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: powerType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let powerSamples: [PetehomeRunningPowerSample] = quantitySamples.map { sample in
                    let watts = sample.quantity.doubleValue(for: .watt())
                    return PetehomeRunningPowerSample(
                        timestamp: sample.startDate.iso8601String,
                        watts: watts
                    )
                }
                
                let avgPower = powerSamples.map { $0.watts }.reduce(0, +) / Double(powerSamples.count)
                
                continuation.resume(returning: PetehomeRunningPowerData(
                    average: avgPower,
                    samples: powerSamples
                ))
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Query ground contact time samples from HealthKit
    private func queryGroundContactTime(for workout: HKWorkout) async throws -> PetehomeGroundContactTimeData? {
        let gctType = HKQuantityType(.runningGroundContactTime)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: gctType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let gctSamples: [PetehomeGroundContactTimeSample] = quantitySamples.map { sample in
                    let milliseconds = sample.quantity.doubleValue(for: .secondUnit(with: .milli))
                    return PetehomeGroundContactTimeSample(
                        timestamp: sample.startDate.iso8601String,
                        milliseconds: milliseconds
                    )
                }
                
                let avgGCT = gctSamples.map { $0.milliseconds }.reduce(0, +) / Double(gctSamples.count)
                
                continuation.resume(returning: PetehomeGroundContactTimeData(
                    average: avgGCT,
                    samples: gctSamples
                ))
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Query vertical oscillation samples from HealthKit
    private func queryVerticalOscillation(for workout: HKWorkout) async throws -> PetehomeVerticalOscillationData? {
        let voType = HKQuantityType(.runningVerticalOscillation)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: voType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let voSamples: [PetehomeVerticalOscillationSample] = quantitySamples.map { sample in
                    let centimeters = sample.quantity.doubleValue(for: .meterUnit(with: .centi))
                    return PetehomeVerticalOscillationSample(
                        timestamp: sample.startDate.iso8601String,
                        centimeters: centimeters
                    )
                }
                
                let avgVO = voSamples.map { $0.centimeters }.reduce(0, +) / Double(voSamples.count)
                
                continuation.resume(returning: PetehomeVerticalOscillationData(
                    average: avgVO,
                    samples: voSamples
                ))
            }
            
            self.healthStore.execute(query)
        }
    }
    
    // MARK: - Mile Splits
    
    /// Calculate mile splits from distance and time data
    private func calculateMileSplits(
        for workout: HKWorkout,
        hrSamples: [PetehomeHeartRateSample],
        cadenceSamples: [PetehomeCadenceSample],
        paceSamples: [PetehomePaceSample]
    ) -> [PetehomeSplit] {
        guard let distanceMeters = workout.statistics(for: HKQuantityType(.distanceWalkingRunning))?.sumQuantity()?.doubleValue(for: .meter()),
              distanceMeters > 0 else {
            return []
        }
        
        let distanceMiles = distanceMeters / 1609.344
        let numFullMiles = Int(distanceMiles)
        
        guard numFullMiles > 0 else { return [] }
        
        var splits: [PetehomeSplit] = []
        let totalDuration = workout.duration
        
        // If we have pace samples, use them for accurate splits
        if !paceSamples.isEmpty {
            let samplesPerMile = paceSamples.count / numFullMiles
            
            for mileNum in 1...numFullMiles {
                let startIdx = (mileNum - 1) * samplesPerMile
                let endIdx = min(mileNum * samplesPerMile, paceSamples.count)
                let milePaceSamples = Array(paceSamples[startIdx..<endIdx])
                
                let avgPace = milePaceSamples.isEmpty ? 0 :
                    milePaceSamples.map { $0.minutesPerMile }.reduce(0, +) / Double(milePaceSamples.count)
                let timeSeconds = avgPace * 60
                
                // Find corresponding HR samples
                let hrStartIdx = (mileNum - 1) * hrSamples.count / numFullMiles
                let hrEndIdx = mileNum * hrSamples.count / numFullMiles
                let mileHrSamples = Array(hrSamples[hrStartIdx..<min(hrEndIdx, hrSamples.count)])
                let avgHr = mileHrSamples.isEmpty ? nil :
                    mileHrSamples.map { $0.bpm }.reduce(0, +) / mileHrSamples.count
                
                // Find corresponding cadence samples
                let cadenceStartIdx = (mileNum - 1) * cadenceSamples.count / numFullMiles
                let cadenceEndIdx = mileNum * cadenceSamples.count / numFullMiles
                let mileCadenceSamples = Array(cadenceSamples[cadenceStartIdx..<min(cadenceEndIdx, cadenceSamples.count)])
                let avgCadence = mileCadenceSamples.isEmpty ? nil :
                    mileCadenceSamples.map { $0.stepsPerMinute }.reduce(0, +) / mileCadenceSamples.count
                
                splits.append(PetehomeSplit(
                    splitNumber: mileNum,
                    splitType: "mile",
                    distanceMeters: 1609.344,
                    timeSeconds: timeSeconds,
                    avgPace: avgPace,
                    avgHeartRate: avgHr,
                    avgCadence: avgCadence,
                    elevationChange: nil
                ))
            }
        } else {
            // Fallback: calculate splits from total time and distance
            let avgPace = totalDuration / 60.0 / distanceMiles // min/mile
            let mileTime = avgPace * 60 // seconds per mile
            
            for mileNum in 1...numFullMiles {
                splits.append(PetehomeSplit(
                    splitNumber: mileNum,
                    splitType: "mile",
                    distanceMeters: 1609.344,
                    timeSeconds: mileTime,
                    avgPace: avgPace,
                    avgHeartRate: nil,
                    avgCadence: nil,
                    elevationChange: nil
                ))
            }
        }
        
        return splits
    }
    
    // MARK: - Cycling Metrics
    
    /// Query cycling metrics for a cycling workout
    private func queryCyclingMetrics(for workout: HKWorkout) async throws -> PetehomeCyclingMetrics? {
        // Only query cycling metrics for cycling workouts
        guard workout.workoutActivityType == .cycling else { return nil }
        
        async let speedSamples = queryCyclingSpeed(for: workout)
        async let cadenceSamples = queryCyclingCadence(for: workout)
        async let powerSamples = queryCyclingPower(for: workout)
        
        let speedResult = try await speedSamples
        let cadenceResult = try await cadenceSamples
        let powerResult = try await powerSamples
        
        // Return nil if no cycling data available
        guard !speedResult.isEmpty || !cadenceResult.isEmpty || !powerResult.isEmpty else {
            return nil
        }
        
        let avgSpeed = speedResult.isEmpty ? nil : speedResult.map { $0.speedMph }.reduce(0, +) / Double(speedResult.count)
        let maxSpeed = speedResult.map { $0.speedMph }.max()
        let avgCadence = cadenceResult.isEmpty ? nil : cadenceResult.map { $0.rpm }.reduce(0, +) / cadenceResult.count
        let avgPower = powerResult.isEmpty ? nil : powerResult.map { $0.watts }.reduce(0, +) / Double(powerResult.count)
        let maxPower = powerResult.map { $0.watts }.max()
        
        return PetehomeCyclingMetrics(
            avgSpeed: avgSpeed,
            maxSpeed: maxSpeed,
            avgCadence: avgCadence,
            avgPower: avgPower,
            maxPower: maxPower,
            speedSamples: speedResult.isEmpty ? nil : speedResult,
            cadenceSamples: cadenceResult.isEmpty ? nil : cadenceResult,
            powerSamples: powerResult.isEmpty ? nil : powerResult
        )
    }
    
    private func queryCyclingSpeed(for workout: HKWorkout) async throws -> [PetehomeCyclingSpeedSample] {
        let speedType = HKQuantityType(.cyclingSpeed)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: speedType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let speedSamples: [PetehomeCyclingSpeedSample] = (samples as? [HKQuantitySample])?.map { sample in
                    let speedMps = sample.quantity.doubleValue(for: .meter().unitDivided(by: .second()))
                    let speedMph = speedMps * 2.237
                    return PetehomeCyclingSpeedSample(
                        timestamp: sample.startDate.iso8601String,
                        speedMph: speedMph
                    )
                } ?? []
                
                continuation.resume(returning: speedSamples)
            }
            
            self.healthStore.execute(query)
        }
    }
    
    private func queryCyclingCadence(for workout: HKWorkout) async throws -> [PetehomeCyclingCadenceSample] {
        let cadenceType = HKQuantityType(.cyclingCadence)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: cadenceType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let cadenceSamples: [PetehomeCyclingCadenceSample] = (samples as? [HKQuantitySample])?.map { sample in
                    let rpm = Int(sample.quantity.doubleValue(for: .count().unitDivided(by: .minute())))
                    return PetehomeCyclingCadenceSample(
                        timestamp: sample.startDate.iso8601String,
                        rpm: rpm
                    )
                } ?? []
                
                continuation.resume(returning: cadenceSamples)
            }
            
            self.healthStore.execute(query)
        }
    }
    
    private func queryCyclingPower(for workout: HKWorkout) async throws -> [PetehomeCyclingPowerSample] {
        let powerType = HKQuantityType(.cyclingPower)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: powerType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let powerSamples: [PetehomeCyclingPowerSample] = (samples as? [HKQuantitySample])?.map { sample in
                    let watts = sample.quantity.doubleValue(for: .watt())
                    return PetehomeCyclingPowerSample(
                        timestamp: sample.startDate.iso8601String,
                        watts: watts
                    )
                } ?? []
                
                continuation.resume(returning: powerSamples)
            }
            
            self.healthStore.execute(query)
        }
    }
    
    // MARK: - Workout Events
    
    /// Query workout events (pauses, resumes, segments, laps) from a workout
    private func queryWorkoutEvents(for workout: HKWorkout) -> [PetehomeWorkoutEvent] {
        guard let events = workout.workoutEvents else { return [] }
        
        var petehomeEvents: [PetehomeWorkoutEvent] = []
        var segmentIndex = 0
        var lapNumber = 0
        
        for event in events {
            let eventType: String
            var metadata: PetehomeEventMetadata? = nil
            
            switch event.type {
            case .pause:
                eventType = "pause"
            case .resume:
                eventType = "resume"
            case .motionPaused:
                eventType = "motion_pause"
            case .motionResumed:
                eventType = "motion_resume"
            case .segment:
                eventType = "segment"
                segmentIndex += 1
                metadata = PetehomeEventMetadata(
                    segmentIndex: segmentIndex,
                    lapNumber: nil,
                    distance: nil,
                    splitTime: event.dateInterval.duration
                )
            case .lap:
                eventType = "lap"
                lapNumber += 1
                metadata = PetehomeEventMetadata(
                    segmentIndex: nil,
                    lapNumber: lapNumber,
                    distance: nil,
                    splitTime: event.dateInterval.duration
                )
            case .marker:
                eventType = "marker"
            case .pauseOrResumeRequest:
                eventType = "pause_request"
            @unknown default:
                eventType = "unknown"
            }
            
            petehomeEvents.append(PetehomeWorkoutEvent(
                type: eventType,
                timestamp: event.dateInterval.start.iso8601String,
                duration: event.dateInterval.duration,
                metadata: metadata
            ))
        }
        
        return petehomeEvents
    }
    
    // MARK: - Effort Score
    
    /// Query physical effort score for a workout (iOS 17+/watchOS 10+)
    private func queryEffortScore(for workout: HKWorkout) async throws -> Double? {
        let effortType = HKQuantityType(.physicalEffort)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: effortType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                // Calculate average effort score (scale 0-10)
                let effortUnit = HKUnit.appleEffortScore()
                let compatibleSamples = quantitySamples.filter { $0.quantity.is(compatibleWith: effortUnit) }
                guard !compatibleSamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                let totalEffort = compatibleSamples.reduce(0.0) { sum, sample in
                    sum + sample.quantity.doubleValue(for: effortUnit)
                }
                let avgEffort = totalEffort / Double(compatibleSamples.count)
                
                continuation.resume(returning: avgEffort)
            }
            
            self.healthStore.execute(query)
        }
    }

    // MARK: - Route

    private func queryRoute(for workout: HKWorkout) async throws -> PetehomeWorkoutRoute? {
        let routeType = HKSeriesType.workoutRoute()
        let predicate = HKQuery.predicateForObjects(from: workout)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: routeType,
                predicate: predicate,
                limit: 1,
                sortDescriptors: nil
            ) { [weak self] _, samples, error in
                guard let self = self else {
                    continuation.resume(returning: nil)
                    return
                }

                guard let route = samples?.first as? HKWorkoutRoute else {
                    continuation.resume(returning: nil)
                    return
                }

                Task { @MainActor in
                    do {
                        let locations = try await self.queryRouteLocations(route: route)
                        let routeData = self.buildRouteData(from: locations)
                        continuation.resume(returning: routeData)
                    } catch {
                        continuation.resume(returning: nil)
                    }
                }
            }

            self.healthStore.execute(query)
        }
    }

    private func queryRouteLocations(route: HKWorkoutRoute) async throws -> [CLLocation] {
        return try await withCheckedThrowingContinuation { continuation in
            var allLocations: [CLLocation] = []

            let query = HKWorkoutRouteQuery(route: route) { _, locations, done, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                if let locations = locations {
                    allLocations.append(contentsOf: locations)
                }

                if done {
                    continuation.resume(returning: allLocations)
                }
            }

            self.healthStore.execute(query)
        }
    }

    private func buildRouteData(from locations: [CLLocation]) -> PetehomeWorkoutRoute {
        var totalElevationGain: Double = 0
        var totalElevationLoss: Double = 0
        var previousAltitude: Double?

        let samples = locations.map { location in
            if let prev = previousAltitude {
                let diff = location.altitude - prev
                if diff > 0 {
                    totalElevationGain += diff
                } else {
                    totalElevationLoss += abs(diff)
                }
            }
            previousAltitude = location.altitude

            return PetehomeLocationSample(
                timestamp: location.timestamp.iso8601String,
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude,
                altitude: location.altitude,
                speed: max(0, location.speed),
                course: max(0, location.course),
                horizontalAccuracy: location.horizontalAccuracy,
                verticalAccuracy: location.verticalAccuracy
            )
        }

        let totalDistance = locations.isEmpty ? 0 :
            zip(locations, locations.dropFirst()).reduce(0.0) { sum, pair in
                sum + pair.0.distance(from: pair.1)
            }

        return PetehomeWorkoutRoute(
            totalDistance: totalDistance,
            totalElevationGain: totalElevationGain,
            totalElevationLoss: totalElevationLoss,
            samples: samples
        )
    }

    // MARK: - Walking Metrics (for Maple walks)
    
    /// Whether a workout type is eligible for walking metrics (walking, hiking, or other for Maple dog walks)
    private func isWalkingOrMapleWorkout(_ workout: HKWorkout) -> Bool {
        let type = workout.workoutActivityType
        return type == .walking || type == .hiking || type == .other
    }
    
    /// Query walking speed samples from HealthKit (for walking and 'other' workouts)
    private func queryWalkingSpeed(for workout: HKWorkout) async throws -> (average: Double?, samples: [PetehomeWalkingSpeedSample])? {
        guard isWalkingOrMapleWorkout(workout) else { return nil }
        
        let speedType = HKQuantityType(.walkingSpeed)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: speedType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let speedSamples: [PetehomeWalkingSpeedSample] = quantitySamples.map { sample in
                    let metersPerSecond = sample.quantity.doubleValue(for: .meter().unitDivided(by: .second()))
                    return PetehomeWalkingSpeedSample(
                        timestamp: sample.startDate.iso8601String,
                        metersPerSecond: metersPerSecond
                    )
                }
                
                let avgSpeed = speedSamples.map { $0.metersPerSecond }.reduce(0, +) / Double(speedSamples.count)
                
                continuation.resume(returning: (average: avgSpeed, samples: speedSamples))
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Query walking step length samples from HealthKit (for walking and 'other' workouts)
    private func queryWalkingStepLength(for workout: HKWorkout) async throws -> (average: Double?, samples: [PetehomeWalkingStepLengthSample])? {
        guard isWalkingOrMapleWorkout(workout) else { return nil }
        
        let stepLengthType = HKQuantityType(.walkingStepLength)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: stepLengthType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let stepLengthSamples: [PetehomeWalkingStepLengthSample] = quantitySamples.map { sample in
                    let meters = sample.quantity.doubleValue(for: .meter())
                    return PetehomeWalkingStepLengthSample(
                        timestamp: sample.startDate.iso8601String,
                        meters: meters
                    )
                }
                
                let avgStepLength = stepLengthSamples.map { $0.meters }.reduce(0, +) / Double(stepLengthSamples.count)
                
                continuation.resume(returning: (average: avgStepLength, samples: stepLengthSamples))
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Query walking double support percentage from HealthKit (for walking and 'other' workouts)
    private func queryWalkingDoubleSupport(for workout: HKWorkout) async throws -> Double? {
        guard isWalkingOrMapleWorkout(workout) else { return nil }
        
        let doubleSupportType = HKQuantityType(.walkingDoubleSupportPercentage)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: doubleSupportType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let values = quantitySamples.map { $0.quantity.doubleValue(for: .percent()) * 100 }
                let avgDoubleSupport = values.reduce(0, +) / Double(values.count)
                
                continuation.resume(returning: avgDoubleSupport)
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Query walking asymmetry percentage from HealthKit (for walking and 'other' workouts)
    private func queryWalkingAsymmetry(for workout: HKWorkout) async throws -> Double? {
        guard isWalkingOrMapleWorkout(workout) else { return nil }
        
        let asymmetryType = HKQuantityType(.walkingAsymmetryPercentage)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: asymmetryType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let values = quantitySamples.map { $0.quantity.doubleValue(for: .percent()) * 100 }
                let avgAsymmetry = values.reduce(0, +) / Double(values.count)
                
                continuation.resume(returning: avgAsymmetry)
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Query step count during a walking or 'other' workout
    private func queryWalkingStepCount(for workout: HKWorkout) async throws -> Int? {
        guard isWalkingOrMapleWorkout(workout) else { return nil }
        
        let stepType = HKQuantityType(.stepCount)
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, statistics, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let sum = statistics?.sumQuantity() else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let steps = Int(sum.doubleValue(for: .count()))
                continuation.resume(returning: steps)
            }
            
            self.healthStore.execute(query)
        }
    }
    
    /// Build walking metrics for a walking or 'other' workout (for Maple walks)
    private func queryWalkingMetrics(for workout: HKWorkout) async throws -> PetehomeWalkingMetrics? {
        guard isWalkingOrMapleWorkout(workout) else { return nil }
        
        // Query all walking metrics in parallel
        async let speedData = queryWalkingSpeed(for: workout)
        async let stepLengthData = queryWalkingStepLength(for: workout)
        async let doubleSupport = queryWalkingDoubleSupport(for: workout)
        async let asymmetry = queryWalkingAsymmetry(for: workout)
        async let stepCount = queryWalkingStepCount(for: workout)
        
        let speedResult = try await speedData
        let stepLengthResult = try await stepLengthData
        let doubleSupportResult = try await doubleSupport
        let asymmetryResult = try await asymmetry
        let stepCountResult = try await stepCount
        
        // Only return metrics if we have at least some data
        let hasData = speedResult != nil || stepLengthResult != nil || 
                      doubleSupportResult != nil || asymmetryResult != nil || stepCountResult != nil
        
        guard hasData else { return nil }
        
        return PetehomeWalkingMetrics(
            avgSpeed: speedResult?.average,
            avgStepLength: stepLengthResult?.average,
            doubleSupportPercentage: doubleSupportResult,
            asymmetryPercentage: asymmetryResult,
            stepCount: stepCountResult,
            speedSamples: speedResult?.samples,
            stepLengthSamples: stepLengthResult?.samples
        )
    }

    // MARK: - Heart Rate Zones

    private func calculateHeartRateZones(samples: [PetehomeHeartRateSample], workoutDuration: TimeInterval) -> [PetehomeHeartRateZone] {
        guard !samples.isEmpty else { return [] }

        let maxHR = self.maxHeartRate
        let zones: [(name: String, minPercent: Double, maxPercent: Double)] = [
            ("rest", 0.0, 0.5),
            ("warmUp", 0.5, 0.6),
            ("fatBurn", 0.6, 0.7),
            ("cardio", 0.7, 0.8),
            ("peak", 0.8, 1.0)
        ]

        var zoneDurations: [String: TimeInterval] = [:]
        for zone in zones {
            zoneDurations[zone.name] = 0
        }

        for i in 0..<samples.count {
            let sample = samples[i]
            let hrPercent = Double(sample.bpm) / maxHR

            let duration: TimeInterval
            if i < samples.count - 1 {
                if let currentDate = sample.timestamp.iso8601Date,
                   let nextDate = samples[i + 1].timestamp.iso8601Date {
                    duration = nextDate.timeIntervalSince(currentDate)
                } else {
                    duration = 5
                }
            } else {
                duration = 5
            }

            for zone in zones {
                if hrPercent >= zone.minPercent && hrPercent < zone.maxPercent {
                    zoneDurations[zone.name, default: 0] += duration
                    break
                }
            }

            if hrPercent >= 1.0 {
                zoneDurations["peak", default: 0] += duration
            }
        }

        let totalTime = zoneDurations.values.reduce(0, +)
        guard totalTime > 0 else { return [] }

        return zones.map { zone in
            let duration = zoneDurations[zone.name] ?? 0
            let percentage = Int((duration / totalTime) * 100)
            return PetehomeHeartRateZone(
                name: zone.name,
                minBpm: Int(zone.minPercent * maxHR),
                maxBpm: Int(zone.maxPercent * maxHR),
                duration: Int(duration),
                percentage: percentage
            )
        }
    }

    // MARK: - Daily Metrics

    func queryDailyMetrics(for date: Date) async throws -> PetehomeDailyMetrics {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!

        async let steps = queryDailySum(.stepCount, start: startOfDay, end: endOfDay)
        async let activeCalories = queryDailySum(.activeEnergyBurned, start: startOfDay, end: endOfDay)
        async let basalCalories = queryDailySum(.basalEnergyBurned, start: startOfDay, end: endOfDay)
        async let exerciseMinutes = queryDailySum(.appleExerciseTime, start: startOfDay, end: endOfDay)
        async let restingHR = queryMostRecentSample(.restingHeartRate, start: startOfDay, end: endOfDay)
        async let hrv = queryMostRecentSample(.heartRateVariabilitySDNN, start: startOfDay, end: endOfDay)
        async let vo2Max = queryMostRecentSample(.vo2Max, start: startOfDay, end: endOfDay)
        async let walkingHR = queryMostRecentSample(.walkingHeartRateAverage, start: startOfDay, end: endOfDay)
        async let walkingDoubleSupport = queryMostRecentSample(.walkingDoubleSupportPercentage, start: startOfDay, end: endOfDay)
        async let walkingAsymmetry = queryMostRecentSample(.walkingAsymmetryPercentage, start: startOfDay, end: endOfDay)
        async let walkingSpeed = queryMostRecentSample(.walkingSpeed, start: startOfDay, end: endOfDay)
        async let walkingStepLength = queryMostRecentSample(.walkingStepLength, start: startOfDay, end: endOfDay)

        // Fetch activity summary including stand hours AND activity ring goals
        let activitySummary = await queryActivitySummary(for: date)

        return await PetehomeDailyMetrics(
            date: date.dateOnlyString,
            steps: Int(steps),
            activeCalories: activeCalories,
            totalCalories: activeCalories + basalCalories,
            exerciseMinutes: Int(exerciseMinutes),
            standHours: activitySummary.standHours,
            moveGoal: activitySummary.moveGoal,
            exerciseGoal: activitySummary.exerciseGoal,
            standGoal: activitySummary.standGoal,
            restingHeartRate: restingHR != nil ? Int(restingHR!) : nil,
            heartRateVariability: hrv,
            vo2Max: vo2Max,
            sleepDuration: nil,
            sleepStages: nil,
            walkingHeartRateAverage: walkingHR != nil ? Int(walkingHR!) : nil,
            walkingDoubleSupportPercentage: walkingDoubleSupport,
            walkingAsymmetryPercentage: walkingAsymmetry,
            walkingSpeed: walkingSpeed,
            walkingStepLength: walkingStepLength,
            source: "PeteTrain-iOS",
            recordedAt: Date().iso8601String
        )
    }

    private func queryDailySum(_ identifier: HKQuantityTypeIdentifier, start: Date, end: Date) async -> Double {
        let type = HKQuantityType(identifier)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let unit = unitForType(identifier)

        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, statistics, _ in
                let value = statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0
                continuation.resume(returning: value)
            }

            self.healthStore.execute(query)
        }
    }

    private func queryMostRecentSample(_ identifier: HKQuantityTypeIdentifier, start: Date, end: Date) async -> Double? {
        let type = HKQuantityType(identifier)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let unit = unitForType(identifier)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, _ in
                guard let sample = samples?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }

                let value = sample.quantity.doubleValue(for: unit)
                continuation.resume(returning: value)
            }

            self.healthStore.execute(query)
        }
    }

    /// Activity summary data including stand hours and ring goals
    private struct ActivitySummaryData {
        let standHours: Int
        let moveGoal: Int?
        let exerciseGoal: Int?
        let standGoal: Int?
    }

    /// Query activity summary for a specific date, including stand hours and activity ring goals
    private func queryActivitySummary(for date: Date) async -> ActivitySummaryData {
        let calendar = Calendar.current
        var dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
        dateComponents.calendar = calendar

        let predicate = HKQuery.predicateForActivitySummary(with: dateComponents)

        return await withCheckedContinuation { continuation in
            let query = HKActivitySummaryQuery(predicate: predicate) { _, summaries, error in
                guard let summary = summaries?.first else {
                    continuation.resume(returning: ActivitySummaryData(
                        standHours: 0,
                        moveGoal: nil,
                        exerciseGoal: nil,
                        standGoal: nil
                    ))
                    return
                }

                let standHours = Int(summary.appleStandHours.doubleValue(for: .count()))
                let moveGoal = Int(summary.activeEnergyBurnedGoal.doubleValue(for: .kilocalorie()))
                let exerciseGoal = Int(summary.appleExerciseTimeGoal.doubleValue(for: .minute()))
                let standGoal = Int(summary.appleStandHoursGoal.doubleValue(for: .count()))

                continuation.resume(returning: ActivitySummaryData(
                    standHours: standHours,
                    moveGoal: moveGoal > 0 ? moveGoal : nil,
                    exerciseGoal: exerciseGoal > 0 ? exerciseGoal : nil,
                    standGoal: standGoal > 0 ? standGoal : nil
                ))
            }

            self.healthStore.execute(query)
        }
    }

    private func queryStandHours(for date: Date) async -> Int {
        let summary = await queryActivitySummary(for: date)
        return summary.standHours
    }

    private func unitForType(_ identifier: HKQuantityTypeIdentifier) -> HKUnit {
        switch identifier {
        case .stepCount: return .count()
        case .activeEnergyBurned, .basalEnergyBurned: return .kilocalorie()
        case .appleExerciseTime: return .minute()
        case .heartRateVariabilitySDNN: return .secondUnit(with: .milli)
        case .vo2Max: return HKUnit.literUnit(with: .milli).unitDivided(by: .gramUnit(with: .kilo).unitMultiplied(by: .minute()))
        case .restingHeartRate, .heartRate, .walkingHeartRateAverage: return .count().unitDivided(by: .minute())
        case .walkingDoubleSupportPercentage, .walkingAsymmetryPercentage: return .percent()
        case .walkingSpeed: return .meter().unitDivided(by: .second())
        case .walkingStepLength: return .meter()
        default: return .count()
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
            return "Ready"
        case .syncing:
            return "Syncing..."
        case .success:
            return "Synced"
        case .failed:
            return lastSyncError ?? "Failed"
        case .queued:
            return "\(pendingCount) queued"
        }
    }

    var statusColor: String {
        switch syncStatus {
        case .idle:
            return "gray"
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

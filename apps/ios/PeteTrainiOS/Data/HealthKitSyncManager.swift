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
            // Walking Metrics
            HKQuantityType(.walkingHeartRateAverage),
            HKQuantityType(.walkingDoubleSupportPercentage),
            HKQuantityType(.walkingAsymmetryPercentage),
            HKQuantityType(.walkingSpeed),
            HKQuantityType(.walkingStepLength),
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
    func syncRecent(days: Int = 7) async -> HistoricalSyncResult {
        return await syncHistoricalWorkouts(days: days)
    }

    /// Sync all history
    func syncAllHistory() async -> HistoricalSyncResult {
        return await syncHistoricalWorkouts(days: 365)
    }

    // MARK: - Historical Sync

    /// Sync historical workouts from HealthKit
    func syncHistoricalWorkouts(days: Int = 90) async -> HistoricalSyncResult {
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
        do {
            alreadySynced = try await api.getSyncedWorkoutIDs(limit: 500)
            log("Server has \(alreadySynced.count) workouts")
        } catch {
            log("Can't check server: \(error.localizedDescription)")
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
        async let hrSamples = queryHeartRateSamples(for: workout)
        async let cadenceSamples = queryCadenceSamples(for: workout)
        async let paceSamples = queryPaceSamples(for: workout)
        async let route = queryRoute(for: workout)

        let hrSamplesResult = try await hrSamples
        let cadenceSamplesResult = try await cadenceSamples
        let paceSamplesResult = try await paceSamples
        let routeResult = try await route

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
        if !cadenceSamplesResult.isEmpty || !paceSamplesResult.isEmpty {
            let avgCadence = cadenceSamplesResult.isEmpty ? 0 : cadenceSamplesResult.map { $0.stepsPerMinute }.reduce(0, +) / cadenceSamplesResult.count
            let avgPace = paceSamplesResult.isEmpty ? 0 : paceSamplesResult.map { $0.minutesPerMile }.reduce(0, +) / Double(paceSamplesResult.count)
            let bestPace = paceSamplesResult.map { $0.minutesPerMile }.filter { $0 > 0 }.min() ?? 0

            runningMetrics = PetehomeRunningMetrics(
                cadence: PetehomeCadenceData(average: avgCadence, samples: cadenceSamplesResult),
                pace: PetehomePaceData(average: avgPace, best: bestPace, samples: paceSamplesResult),
                strideLength: nil,
                runningPower: nil
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
            heartRate: heartRateSummary,
            heartRateSamples: hrSamplesResult,
            runningMetrics: runningMetrics,
            route: routeResult,
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

        var result: [PetehomeHeartRateSample] = []
        var lastTimestamp: Date?

        for sample in samples {
            guard let date = sample.timestamp.iso8601Date else { continue }

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
                        samples.append(PetehomeCadenceSample(
                            timestamp: statistics.startDate.iso8601String,
                            stepsPerMinute: Int(steps)
                        ))
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

        let standHrs = await queryStandHours(for: date)

        return await PetehomeDailyMetrics(
            date: date.dateOnlyString,
            steps: Int(steps),
            activeCalories: activeCalories,
            totalCalories: activeCalories + basalCalories,
            exerciseMinutes: Int(exerciseMinutes),
            standHours: standHrs,
            moveGoal: nil,
            exerciseGoal: nil,
            standGoal: nil,
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

    private func queryStandHours(for date: Date) async -> Int {
        let calendar = Calendar.current
        var dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
        dateComponents.calendar = calendar

        let predicate = HKQuery.predicateForActivitySummary(with: dateComponents)

        return await withCheckedContinuation { continuation in
            let query = HKActivitySummaryQuery(predicate: predicate) { _, summaries, error in
                let standHours = summaries?.first.map { Int($0.appleStandHours.doubleValue(for: .count())) } ?? 0
                continuation.resume(returning: standHours)
            }

            self.healthStore.execute(query)
        }
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

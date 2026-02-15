import Foundation
import HealthKit
import Observation
import WidgetKit
import CoreLocation

// MARK: - Workout Activity Types (for Petehome sync and manual logging)

enum WorkoutActivityType: String, CaseIterable, Identifiable {
    case functionalStrength = "Strength"
    case hiit = "HIIT"
    case indoorRun = "Treadmill"
    case outdoorRun = "Run"
    case inclineWalk = "Walk"

    var id: String { rawValue }

    var healthKitType: HKWorkoutActivityType {
        switch self {
        case .functionalStrength: return .functionalStrengthTraining
        case .hiit: return .highIntensityIntervalTraining
        case .indoorRun: return .running
        case .outdoorRun: return .running
        case .inclineWalk: return .walking
        }
    }

    var locationType: HKWorkoutSessionLocationType {
        switch self {
        case .functionalStrength: return .indoor
        case .hiit: return .indoor
        case .indoorRun: return .indoor
        case .outdoorRun: return .outdoor
        case .inclineWalk: return .indoor
        }
    }

    var icon: String {
        switch self {
        case .functionalStrength: return "figure.strengthtraining.functional"
        case .hiit: return "flame.fill"
        case .indoorRun: return "figure.run"
        case .outdoorRun: return "figure.run.circle"
        case .inclineWalk: return "figure.walk"
        }
    }

    var color: String {
        switch self {
        case .functionalStrength: return "purple"
        case .hiit: return "orange"
        case .indoorRun: return "green"
        case .outdoorRun: return "cyan"
        case .inclineWalk: return "yellow"
        }
    }
}

@MainActor
@Observable
final class HealthKitManager {

    static let shared = HealthKitManager()

    let healthStore = HKHealthStore()

    // MARK: - Authorization State
    var isAuthorized = false

    // MARK: - Today's Activity Data
    var todaySteps: Int = 0
    var todayActiveCalories: Double = 0
    var todayExerciseMinutes: Double = 0
    var todayStandHours: Int = 0
    var todayDistance: Double = 0 // in meters

    // MARK: - Activity Ring Goals
    var moveGoal: Double = 500 // calories
    var exerciseGoal: Double = 30 // minutes
    var standGoal: Int = 12 // hours

    // MARK: - Activity Ring Progress (0.0 to 1.0+)
    var moveProgress: Double { min(todayActiveCalories / max(moveGoal, 1), 2.0) }
    var exerciseProgress: Double { min(todayExerciseMinutes / max(exerciseGoal, 1), 2.0) }
    var standProgress: Double { min(Double(todayStandHours) / Double(max(standGoal, 1)), 2.0) }

    // MARK: - Health Metrics
    var restingHeartRate: Double = 0
    var currentHeartRate: Double = 0

    // MARK: - Weekly Stats
    var weeklyWorkoutCount: Int = 0
    var weeklyActiveCalories: Double = 0
    var weeklyExerciseMinutes: Double = 0

    // MARK: - Heart Rate (for zone calculations in Petehome sync)
    var maxHeartRate: Double = 190 // 220 - age, updated from HealthKit if available
    var userAge: Int? = nil // Fetched from HealthKit

    private init() {}

    // MARK: - Authorization

    var isHealthKitAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    func requestAuthorization() async -> Bool {
        guard isHealthKitAvailable else { return false }

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
            // Body Measurements
            HKQuantityType(.bodyMass),
            // Cardio Fitness
            HKQuantityType(.vo2Max),
            // Running Metrics (for Petehome sync)
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

        let typesToWrite: Set<HKSampleType> = [
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.distanceWalkingRunning),
            HKQuantityType(.bodyMass),
            HKObjectType.workoutType()
        ]

        do {
            try await healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead)
            self.isAuthorized = true
            await fetchActivityRingGoals()
            return true
        } catch {
            print("HealthKit authorization failed: \(error)")
            return false
        }
    }

    // MARK: - Fetch All Today's Data

    func fetchAllTodayData() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchTodaySteps() }
            group.addTask { await self.fetchActivitySummary() }
            group.addTask { await self.fetchTodayDistance() }
            group.addTask { await self.fetchRestingHeartRate() }
            group.addTask { await self.fetchCurrentHeartRate() }
            group.addTask { await self.fetchUserAgeAndUpdateMaxHR() }
        }
    }

    // MARK: - User Age & Max HR Calculation

    // Pete's DOB for max HR calculation when HealthKit doesn't have it
    private static let ownerDateOfBirth: DateComponents = {
        var components = DateComponents()
        components.year = 1988
        components.month = 12
        components.day = 16
        return components
    }()

    func fetchUserAgeAndUpdateMaxHR() async {
        // Try HealthKit first
        if isHealthKitAvailable {
            do {
                let dateOfBirth = try healthStore.dateOfBirthComponents()
                if let birthDate = Calendar.current.date(from: dateOfBirth) {
                    let age = Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year ?? 30
                    self.userAge = age
                    self.maxHeartRate = Double(220 - age)
                    print("✅ Fetched age from HealthKit: \(age) years, max HR: \(Int(maxHeartRate)) bpm")
                    return
                }
            } catch {
                // Fall through to use owner DOB
            }
        }

        // Use owner's DOB as fallback
        if let birthDate = Calendar.current.date(from: Self.ownerDateOfBirth) {
            let age = Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year ?? 37
            self.userAge = age
            self.maxHeartRate = Double(220 - age)
            print("✅ Using owner DOB: \(age) years, max HR: \(Int(maxHeartRate)) bpm")
        }
    }

    // MARK: - Activity Summary (Rings Data)

    func fetchActivitySummary() async {
        guard isHealthKitAvailable else { return }

        let calendar = Calendar.current
        var dateComponents = calendar.dateComponents([.year, .month, .day], from: Date())
        dateComponents.calendar = calendar

        let predicate = HKQuery.predicateForActivitySummary(with: dateComponents)

        let query = HKActivitySummaryQuery(predicate: predicate) { [weak self] _, summaries, error in
            guard let self = self else { return }

            Task { @MainActor in
                if let summary = summaries?.first {
                    // Goals
                    self.moveGoal = summary.activeEnergyBurnedGoal.doubleValue(for: .kilocalorie())
                    self.exerciseGoal = summary.appleExerciseTimeGoal.doubleValue(for: .minute())
                    self.standGoal = Int(summary.appleStandHoursGoal.doubleValue(for: .count()))

                    // Progress (actual values that match Apple's rings)
                    self.todayActiveCalories = summary.activeEnergyBurned.doubleValue(for: .kilocalorie())
                    self.todayExerciseMinutes = summary.appleExerciseTime.doubleValue(for: .minute())
                    self.todayStandHours = Int(summary.appleStandHours.doubleValue(for: .count()))
                } else {
                    // No summary yet today - fetch individual samples as fallback
                    await self.fetchTodayActiveCalories()
                    await self.fetchTodayExerciseMinutes()
                    await self.fetchTodayStandHours()
                }
            }
        }

        healthStore.execute(query)
    }

    func fetchActivityRingGoals() async {
        await fetchActivitySummary()
    }

    // MARK: - Today's Metrics

    func fetchTodaySteps() async {
        guard isHealthKitAvailable else { return }

        let stepType = HKQuantityType(.stepCount)
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, error in
            guard let self = self, error == nil, let sum = result?.sumQuantity() else { return }

            let steps = Int(sum.doubleValue(for: HKUnit.count()))
            Task { @MainActor in
                self.todaySteps = steps
            }
        }

        healthStore.execute(query)
    }

    func fetchTodayActiveCalories() async {
        guard isHealthKitAvailable else { return }

        let calorieType = HKQuantityType(.activeEnergyBurned)
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: calorieType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, error in
            guard let self = self, error == nil, let sum = result?.sumQuantity() else { return }

            let calories = sum.doubleValue(for: HKUnit.kilocalorie())
            Task { @MainActor in
                self.todayActiveCalories = calories
            }
        }

        healthStore.execute(query)
    }

    func fetchTodayExerciseMinutes() async {
        guard isHealthKitAvailable else { return }

        let exerciseType = HKQuantityType(.appleExerciseTime)
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: exerciseType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, error in
            guard let self = self, error == nil, let sum = result?.sumQuantity() else { return }

            let minutes = sum.doubleValue(for: .minute())
            Task { @MainActor in
                self.todayExerciseMinutes = minutes
            }
        }

        healthStore.execute(query)
    }

    func fetchTodayStandHours() async {
        guard isHealthKitAvailable else { return }

        let calendar = Calendar.current
        var dateComponents = calendar.dateComponents([.year, .month, .day], from: Date())
        dateComponents.calendar = calendar

        let predicate = HKQuery.predicateForActivitySummary(with: dateComponents)

        let query = HKActivitySummaryQuery(predicate: predicate) { [weak self] _, summaries, error in
            guard let self = self, error == nil, let summary = summaries?.first else { return }

            Task { @MainActor in
                self.todayStandHours = Int(summary.appleStandHours.doubleValue(for: .count()))
            }
        }

        healthStore.execute(query)
    }

    func fetchTodayDistance() async {
        guard isHealthKitAvailable else { return }

        let distanceType = HKQuantityType(.distanceWalkingRunning)
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: distanceType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, error in
            guard let self = self, error == nil, let sum = result?.sumQuantity() else { return }

            let distance = sum.doubleValue(for: .meter())
            Task { @MainActor in
                self.todayDistance = distance
            }
        }

        healthStore.execute(query)
    }

    // MARK: - Heart Rate

    func fetchRestingHeartRate() async {
        guard isHealthKitAvailable else { return }

        let hrType = HKQuantityType(.restingHeartRate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        let query = HKSampleQuery(sampleType: hrType, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] _, samples, error in
            guard let self = self, error == nil, let sample = samples?.first as? HKQuantitySample else { return }

            let hr = sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
            Task { @MainActor in
                self.restingHeartRate = hr
            }
        }

        healthStore.execute(query)
    }

    func fetchCurrentHeartRate() async {
        guard isHealthKitAvailable else { return }

        let hrType = HKQuantityType(.heartRate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let predicate = HKQuery.predicateForSamples(withStart: Date().addingTimeInterval(-600), end: Date(), options: .strictStartDate)

        let query = HKSampleQuery(sampleType: hrType, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] _, samples, error in
            guard let self = self, error == nil, let sample = samples?.first as? HKQuantitySample else { return }

            let hr = sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
            Task { @MainActor in
                self.currentHeartRate = hr
            }
        }

        healthStore.execute(query)
    }

    // MARK: - Errors

    enum HealthKitError: Error {
        case notAvailable
    }

    // MARK: - Weekly Stats

    func fetchWeeklyStats() async {
        guard isHealthKitAvailable else { return }

        let calendar = Calendar.current
        let now = Date()
        guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) else { return }

        // Fetch workout count
        let workoutPredicate = HKQuery.predicateForSamples(withStart: weekAgo, end: now, options: .strictStartDate)
        let workoutQuery = HKSampleQuery(sampleType: .workoutType(), predicate: workoutPredicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, error in
            guard let self = self, error == nil else { return }

            let count = samples?.count ?? 0
            Task { @MainActor in
                self.weeklyWorkoutCount = count
            }
        }
        healthStore.execute(workoutQuery)

        // Fetch weekly calories
        let calorieType = HKQuantityType(.activeEnergyBurned)
        let caloriePredicate = HKQuery.predicateForSamples(withStart: weekAgo, end: now, options: .strictStartDate)
        let calorieQuery = HKStatisticsQuery(quantityType: calorieType, quantitySamplePredicate: caloriePredicate, options: .cumulativeSum) { [weak self] _, result, error in
            guard let self = self, error == nil, let sum = result?.sumQuantity() else { return }

            let calories = sum.doubleValue(for: .kilocalorie())
            Task { @MainActor in
                self.weeklyActiveCalories = calories
            }
        }
        healthStore.execute(calorieQuery)

        // Fetch weekly exercise minutes
        let exerciseType = HKQuantityType(.appleExerciseTime)
        let exercisePredicate = HKQuery.predicateForSamples(withStart: weekAgo, end: now, options: .strictStartDate)
        let exerciseQuery = HKStatisticsQuery(quantityType: exerciseType, quantitySamplePredicate: exercisePredicate, options: .cumulativeSum) { [weak self] _, result, error in
            guard let self = self, error == nil, let sum = result?.sumQuantity() else { return }

            let minutes = sum.doubleValue(for: .minute())
            Task { @MainActor in
                self.weeklyExerciseMinutes = minutes
            }
        }
        healthStore.execute(exerciseQuery)
    }

    // MARK: - Petehome Sync Queries

    func queryHeartRateSamples(for workout: HKWorkout) async throws -> [PetehomeHeartRateSample] {
        guard isHealthKitAvailable else { return [] }

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
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                let hrSamples: [PetehomeHeartRateSample] = (samples as? [HKQuantitySample])?.map { sample in
                    PetehomeHeartRateSample(
                        timestamp: sample.startDate.iso8601String,
                        bpm: Int(sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))),
                        motionContext: self.getMotionContext(from: sample)
                    )
                } ?? []

                let downsampledSamples = self.downsampleHRSamples(hrSamples, targetInterval: 5)
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

    func queryCadenceSamples(for workout: HKWorkout) async throws -> [PetehomeCadenceSample] {
        guard isHealthKitAvailable else { return [] }

        // Query individual step count samples and calculate cadence from sample duration
        // Try to calculate cadence from speed and stride length first (more accurate)
        // Cadence = Speed / Stride Length (in steps per minute)
        let cadenceFromMetrics = try await queryCadenceFromSpeedAndStride(for: workout)
        if !cadenceFromMetrics.isEmpty {
            return cadenceFromMetrics
        }
        
        // Fallback: Calculate from step count samples
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
                // Cadence = (speed / stride) * 60 seconds * 2 (two steps per stride)
                // But Apple measures stride as single step, so just multiply by 60
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

    func queryPaceSamples(for workout: HKWorkout) async throws -> [PetehomePaceSample] {
        guard isHealthKitAvailable else { return [] }

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
    func queryStrideLength(for workout: HKWorkout) async throws -> PetehomeStrideLengthData? {
        guard isHealthKitAvailable else { return nil }
        
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
    func queryRunningPower(for workout: HKWorkout) async throws -> PetehomeRunningPowerData? {
        guard isHealthKitAvailable else { return nil }
        
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
    func queryGroundContactTime(for workout: HKWorkout) async throws -> PetehomeGroundContactTimeData? {
        guard isHealthKitAvailable else { return nil }
        
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
                    // Ground contact time is stored in seconds, convert to milliseconds
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
    func queryVerticalOscillation(for workout: HKWorkout) async throws -> PetehomeVerticalOscillationData? {
        guard isHealthKitAvailable else { return nil }
        
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
                    // Vertical oscillation is stored in meters, convert to centimeters
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
    
    // MARK: - Walking Metrics (for Maple walks)
    
    /// Query walking speed samples from HealthKit (only for walking workouts)
    func queryWalkingSpeed(for workout: HKWorkout) async throws -> (average: Double?, samples: [PetehomeWalkingSpeedSample])? {
        guard isHealthKitAvailable else { return nil }
        guard workout.workoutActivityType == .walking else { return nil }
        
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
    
    /// Query walking step length samples from HealthKit (only for walking workouts)
    func queryWalkingStepLength(for workout: HKWorkout) async throws -> (average: Double?, samples: [PetehomeWalkingStepLengthSample])? {
        guard isHealthKitAvailable else { return nil }
        guard workout.workoutActivityType == .walking else { return nil }
        
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
    
    /// Query walking double support percentage from HealthKit (only for walking workouts)
    /// This is a gait stability metric - higher values indicate more stable walking
    func queryWalkingDoubleSupport(for workout: HKWorkout) async throws -> Double? {
        guard isHealthKitAvailable else { return nil }
        guard workout.workoutActivityType == .walking else { return nil }
        
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
    
    /// Query walking asymmetry percentage from HealthKit (only for walking workouts)
    /// This indicates left/right balance - lower values indicate more symmetric gait
    func queryWalkingAsymmetry(for workout: HKWorkout) async throws -> Double? {
        guard isHealthKitAvailable else { return nil }
        guard workout.workoutActivityType == .walking else { return nil }
        
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
    
    /// Query step count during a walking workout
    func queryWalkingStepCount(for workout: HKWorkout) async throws -> Int? {
        guard isHealthKitAvailable else { return nil }
        guard workout.workoutActivityType == .walking else { return nil }
        
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
    
    /// Build walking metrics for a walking workout (for Maple walks)
    func queryWalkingMetrics(for workout: HKWorkout) async throws -> PetehomeWalkingMetrics? {
        guard workout.workoutActivityType == .walking else { return nil }
        
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
    
    // MARK: - Mile Splits
    
    /// Calculate mile splits from distance and time data
    func calculateMileSplits(
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
    func queryCyclingMetrics(for workout: HKWorkout) async throws -> PetehomeCyclingMetrics? {
        guard isHealthKitAvailable else { return nil }
        
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
    func queryWorkoutEvents(for workout: HKWorkout) -> [PetehomeWorkoutEvent] {
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
                    splitTime: event.dateInterval?.duration
                )
            case .lap:
                eventType = "lap"
                lapNumber += 1
                metadata = PetehomeEventMetadata(
                    segmentIndex: nil,
                    lapNumber: lapNumber,
                    distance: nil,
                    splitTime: event.dateInterval?.duration
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
                timestamp: event.dateInterval?.start.iso8601String ?? workout.startDate.iso8601String,
                duration: event.dateInterval?.duration,
                metadata: metadata
            ))
        }
        
        return petehomeEvents
    }
    
    // MARK: - Effort Score
    
    /// Query physical effort score for a workout (iOS 17+/watchOS 10+)
    func queryEffortScore(for workout: HKWorkout) async throws -> Double? {
        guard isHealthKitAvailable else { return nil }
        
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
                let totalEffort = quantitySamples.reduce(0.0) { sum, sample in
                    sum + sample.quantity.doubleValue(for: HKUnit.appleEffortScore())
                }
                let avgEffort = totalEffort / Double(quantitySamples.count)
                
                continuation.resume(returning: avgEffort)
            }
            
            self.healthStore.execute(query)
        }
    }

    func queryRoute(for workout: HKWorkout) async throws -> PetehomeWorkoutRoute? {
        guard isHealthKitAvailable else { return nil }

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
                        continuation.resume(throwing: error)
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
            moveGoal: Int(moveGoal),
            exerciseGoal: Int(exerciseGoal),
            standGoal: standGoal,
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
            source: "PeteTrain",
            recordedAt: Date().iso8601String
        )
    }

    private func queryDailySum(_ identifier: HKQuantityTypeIdentifier, start: Date, end: Date) async -> Double {
        guard isHealthKitAvailable else { return 0 }

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
        guard isHealthKitAvailable else { return nil }

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
        guard isHealthKitAvailable else { return 0 }

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

    func buildWorkoutPayload(workout: HKWorkout, linkedDay: Day?) async throws -> WorkoutPayload {
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
        
        // Query walking metrics (only for walking workouts - Maple walks!)
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
        let totalCalories = activeCalories + (workout.statistics(for: HKQuantityType(.basalEnergyBurned))?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)
        let distanceMeters = workout.statistics(for: HKQuantityType(.distanceWalkingRunning))?.sumQuantity()?.doubleValue(for: .meter())

        let deviceInfo = PetehomeDeviceInfo(
            name: "Apple Watch",
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
            case .running, .walking, .cycling:
                isIndoor = routeResult == nil // No route likely means indoor
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
            source: "PeteTrain",
            sourceVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
            device: deviceInfo,
            weather: nil
        )

        let linkedWorkoutId: String?
        let linkedDayString: String?
        if let day = linkedDay {
            let dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            let dayName = dayNames[safe: day.id - 1] ?? "unknown"
            linkedWorkoutId = "\(dayName)-\(day.shortName.lowercased().replacingOccurrences(of: " ", with: "-"))"
            linkedDayString = dayName
        } else {
            linkedWorkoutId = nil
            linkedDayString = nil
        }

        return WorkoutPayload(
            workout: appleHealthWorkout,
            linkedWorkoutId: linkedWorkoutId,
            linkedDay: linkedDayString
        )
    }

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

    // MARK: - Log Workout (Manual)

    func logCompletedWorkout(for day: Day, duration: TimeInterval, calories: Double? = nil, distance: Double? = nil) async throws {
        guard isHealthKitAvailable else {
            throw HealthKitError.notAvailable
        }

        let workoutType = day.startingActivityType.healthKitType
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = workoutType
        configuration.locationType = day.startingActivityType.locationType

        let endDate = Date()
        let startDate = endDate.addingTimeInterval(-duration)

        let workoutBuilder = HKWorkoutBuilder(healthStore: healthStore, configuration: configuration, device: .local())

        let brandName = "Pete Train • \(day.startingActivityType.rawValue)"

        let metadata: [String: Any] = [
            HKMetadataKeyWorkoutBrandName: brandName,
            HKMetadataKeyIndoorWorkout: configuration.locationType == .indoor,
            "PeteTrainDayId": day.id,
            "PeteTrainDayName": day.name
        ]

        try await workoutBuilder.beginCollection(at: startDate)

        var samples: [HKSample] = []

        if let calories = calories, calories > 0 {
            let calorieType = HKQuantityType(.activeEnergyBurned)
            let calorieQuantity = HKQuantity(unit: .kilocalorie(), doubleValue: calories)
            let calorieSample = HKQuantitySample(
                type: calorieType,
                quantity: calorieQuantity,
                start: startDate,
                end: endDate,
                metadata: metadata
            )
            samples.append(calorieSample)
        }

        if let distance = distance, distance > 0, shouldTrackDistance(for: day) {
            let distanceType = HKQuantityType(.distanceWalkingRunning)
            let distanceQuantity = HKQuantity(unit: .meter(), doubleValue: distance)
            let distanceSample = HKQuantitySample(
                type: distanceType,
                quantity: distanceQuantity,
                start: startDate,
                end: endDate,
                metadata: metadata
            )
            samples.append(distanceSample)
        }

        if !samples.isEmpty {
            try await workoutBuilder.addSamples(samples)
        }

        try await workoutBuilder.addMetadata(metadata)
        try await workoutBuilder.endCollection(at: endDate)

        let finishedWorkout = try await workoutBuilder.finishWorkout()
        if finishedWorkout != nil {
            print("✅ Logged workout to HealthKit:")
            print("   Type: \(workoutType.rawValue) (\(day.startingActivityType.rawValue))")
            print("   Duration: \(Int(duration / 60)) minutes")
            print("   Calories: \(Int(calories ?? 0)) kcal")
            if let distance = distance {
                print("   Distance: \(String(format: "%.2f", distance / 1000)) km")
            }

            await fetchAllTodayData()
        }
    }

    private func shouldTrackDistance(for day: Day) -> Bool {
        switch day.startingActivityType {
        case .indoorRun, .outdoorRun, .inclineWalk:
            return true
        case .functionalStrength, .hiit:
            return false
        }
    }

    func workoutTypeName(for day: Day) -> String {
        day.startingActivityType.rawValue
    }

    // MARK: - Formatting Helpers

    var formattedTodayDistance: String {
        let km = todayDistance / 1000
        return String(format: "%.1f km", km)
    }
}

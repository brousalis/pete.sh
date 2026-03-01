import Foundation
import HealthKit

// MARK: - Workout Payload

/// Complete workout payload for POST /api/apple-health/workout
struct WorkoutPayload: Encodable {
    let workout: AppleHealthWorkout
    let linkedWorkoutId: String?
    let linkedDay: String?
}

/// Apple Health workout data matching Petehome API spec
struct AppleHealthWorkout: Codable {
    let id: String
    let workoutType: String
    let workoutTypeRaw: Int?
    let startDate: String
    let endDate: String
    let duration: Int

    let activeCalories: Double
    let totalCalories: Double

    let distance: Double?
    let distanceMiles: Double?
    let elevationGain: Double?

    // Indoor/outdoor distinction
    let isIndoor: Bool?

    let heartRate: HeartRateSummary
    let heartRateSamples: [PetehomeHeartRateSample]

    let runningMetrics: PetehomeRunningMetrics?
    let cyclingMetrics: PetehomeCyclingMetrics?
    let walkingMetrics: PetehomeWalkingMetrics?
    let route: PetehomeWorkoutRoute?
    
    // Workout events (pauses, segments, laps)
    let workoutEvents: [PetehomeWorkoutEvent]?
    
    // Effort score (Apple's workout intensity metric)
    let effortScore: Double?

    let source: String
    let sourceVersion: String?
    let device: PetehomeDeviceInfo?
    let weather: PetehomeWeatherInfo?
}

// MARK: - Heart Rate

struct HeartRateSummary: Codable {
    let average: Int
    let min: Int
    let max: Int
    let resting: Int?
    let zones: [PetehomeHeartRateZone]
}

struct PetehomeHeartRateZone: Codable {
    let name: String
    let minBpm: Int
    let maxBpm: Int
    let duration: Int
    let percentage: Int
}

struct PetehomeHeartRateSample: Codable {
    let timestamp: String
    let bpm: Int
    let motionContext: String?
}

// MARK: - Running Metrics

struct PetehomeRunningMetrics: Codable {
    let cadence: PetehomeCadenceData
    let pace: PetehomePaceData
    let strideLength: PetehomeStrideLengthData?
    let runningPower: PetehomeRunningPowerData?
    let groundContactTime: PetehomeGroundContactTimeData?
    let verticalOscillation: PetehomeVerticalOscillationData?
    let splits: [PetehomeSplit]?
}

struct PetehomeCadenceData: Codable {
    let average: Int
    let samples: [PetehomeCadenceSample]
}

struct PetehomeCadenceSample: Codable {
    let timestamp: String
    let stepsPerMinute: Int
}

struct PetehomePaceData: Codable {
    let average: Double
    let best: Double
    let samples: [PetehomePaceSample]
}

struct PetehomePaceSample: Codable {
    let timestamp: String
    let minutesPerMile: Double
    let speedMph: Double?
}

struct PetehomeStrideLengthData: Codable {
    let average: Double
    let samples: [PetehomeStrideLengthSample]?
}

struct PetehomeStrideLengthSample: Codable {
    let timestamp: String
    let meters: Double
}

struct PetehomeRunningPowerData: Codable {
    let average: Double
    let samples: [PetehomeRunningPowerSample]?
}

struct PetehomeRunningPowerSample: Codable {
    let timestamp: String
    let watts: Double
}

struct PetehomeGroundContactTimeData: Codable {
    let average: Double // milliseconds
    let samples: [PetehomeGroundContactTimeSample]?
}

struct PetehomeGroundContactTimeSample: Codable {
    let timestamp: String
    let milliseconds: Double
}

struct PetehomeVerticalOscillationData: Codable {
    let average: Double // centimeters
    let samples: [PetehomeVerticalOscillationSample]?
}

struct PetehomeVerticalOscillationSample: Codable {
    let timestamp: String
    let centimeters: Double
}

/// Mile or kilometer split data
struct PetehomeSplit: Codable {
    let splitNumber: Int
    let splitType: String // "mile" or "kilometer"
    let distanceMeters: Double
    let timeSeconds: Double
    let avgPace: Double // min/mile or min/km
    let avgHeartRate: Int?
    let avgCadence: Int?
    let elevationChange: Double? // meters
}

// MARK: - Walking Metrics (for Maple walks and outdoor walks)

struct PetehomeWalkingMetrics: Codable {
    let avgSpeed: Double? // m/s - average walking speed
    let avgStepLength: Double? // meters - average step length
    let doubleSupportPercentage: Double? // % time both feet on ground (gait stability)
    let asymmetryPercentage: Double? // % left/right imbalance
    let stepCount: Int? // total steps during workout
    
    // Samples for detailed analysis (optional)
    let speedSamples: [PetehomeWalkingSpeedSample]?
    let stepLengthSamples: [PetehomeWalkingStepLengthSample]?
}

struct PetehomeWalkingSpeedSample: Codable {
    let timestamp: String
    let metersPerSecond: Double
}

struct PetehomeWalkingStepLengthSample: Codable {
    let timestamp: String
    let meters: Double
}

// MARK: - Cycling Metrics

struct PetehomeCyclingMetrics: Codable {
    let avgSpeed: Double? // mph
    let maxSpeed: Double? // mph
    let avgCadence: Int? // rpm
    let avgPower: Double? // watts
    let maxPower: Double? // watts
    let speedSamples: [PetehomeCyclingSpeedSample]?
    let cadenceSamples: [PetehomeCyclingCadenceSample]?
    let powerSamples: [PetehomeCyclingPowerSample]?
}

struct PetehomeCyclingSpeedSample: Codable {
    let timestamp: String
    let speedMph: Double
}

struct PetehomeCyclingCadenceSample: Codable {
    let timestamp: String
    let rpm: Int
}

struct PetehomeCyclingPowerSample: Codable {
    let timestamp: String
    let watts: Double
}

// MARK: - Workout Events

/// Represents pause, resume, segment, and lap events during a workout
struct PetehomeWorkoutEvent: Codable {
    let type: String // "pause", "resume", "segment", "lap", "marker"
    let timestamp: String
    let duration: Double? // For segments, duration in seconds
    let metadata: PetehomeEventMetadata?
}

struct PetehomeEventMetadata: Codable {
    let segmentIndex: Int?
    let lapNumber: Int?
    let distance: Double? // meters at this point
    let splitTime: Double? // seconds for this segment/lap
}

// MARK: - Route / GPS

struct PetehomeWorkoutRoute: Codable {
    let totalDistance: Double
    let totalElevationGain: Double
    let totalElevationLoss: Double
    let samples: [PetehomeLocationSample]
}

struct PetehomeLocationSample: Codable {
    let timestamp: String
    let latitude: Double
    let longitude: Double
    let altitude: Double
    let speed: Double
    let course: Double
    let horizontalAccuracy: Double
    let verticalAccuracy: Double
}

// MARK: - Device & Weather

struct PetehomeDeviceInfo: Codable {
    let name: String
    let model: String?
    let hardwareVersion: String?
    let softwareVersion: String?
}

struct PetehomeWeatherInfo: Codable {
    let temperature: Double?
    let humidity: Double?
}

// MARK: - Daily Health Metrics

/// Daily health metrics for POST /api/apple-health/daily
struct PetehomeDailyMetrics: Codable {
    let date: String

    // Activity
    let steps: Int
    let activeCalories: Double
    let totalCalories: Double
    let exerciseMinutes: Int
    let standHours: Int
    let moveGoal: Int?
    let exerciseGoal: Int?
    let standGoal: Int?

    // Heart
    let restingHeartRate: Int?
    let heartRateVariability: Double?

    // Cardio Fitness
    let vo2Max: Double?

    // Sleep (optional)
    let sleepDuration: Int?
    let sleepStages: PetehomeSleepStages?

    // Walking metrics (optional)
    let walkingHeartRateAverage: Int?
    let walkingDoubleSupportPercentage: Double?
    let walkingAsymmetryPercentage: Double?
    let walkingSpeed: Double?
    let walkingStepLength: Double?

    // Body composition (from Fitindex ES-26M scale via HealthKit)
    let bodyMassLbs: Double?
    let bodyFatPercentage: Double?
    let leanBodyMassLbs: Double?

    let source: String
    let recordedAt: String
}

struct PetehomeSleepStages: Codable {
    let awake: Int?
    let rem: Int?
    let core: Int?
    let deep: Int?
}

/// Wrapper for daily metrics POST request
struct DailyMetricsPayload: Encodable {
    let metrics: PetehomeDailyMetrics
}

// MARK: - Batch Sync

/// Batch sync request for POST /api/apple-health/sync
struct BatchSyncPayload: Encodable {
    let workouts: [AppleHealthWorkout]
    let dailyMetrics: [PetehomeDailyMetrics]
    let lastSyncTimestamp: String?
}

/// Batch sync response
struct BatchSyncResult: Decodable {
    let success: Bool
    let data: BatchSyncData?
    let syncTimestamp: String?

    struct BatchSyncData: Decodable {
        let workoutsSaved: Int
        let workoutsFailed: Int
        let dailyMetricsSaved: Int
        let dailyMetricsFailed: Int
        let errors: [String]?
    }
}

// MARK: - API Responses

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: String?
    let message: String?
}

struct WorkoutSyncResponse: Decodable {
    let id: String
    let success: Bool
}

struct WorkoutsListResponse: Decodable {
    let success: Bool
    let data: [SyncedWorkoutSummary]
}

// MARK: - Activity Workout List (GET /api/apple-health/workout)

/// Full workout summary from GET /api/apple-health/workout for Activity list view
struct ActivityWorkoutSummary: Decodable, Identifiable {
    let id: String
    let healthkitId: String
    let workoutType: String
    let startDate: String
    let endDate: String?
    let duration: Int
    let activeCalories: Double
    let totalCalories: Double
    let distanceMiles: Double?
    let hrAverage: Int?
    let cadenceAverage: Int?
    let paceAverage: Double?
    let isIndoor: Bool?
    let source: String

    enum CodingKeys: String, CodingKey {
        case id
        case healthkitId = "healthkit_id"
        case workoutType = "workout_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case duration
        case activeCalories = "active_calories"
        case totalCalories = "total_calories"
        case distanceMiles = "distance_miles"
        case hrAverage = "hr_average"
        case cadenceAverage = "cadence_average"
        case paceAverage = "pace_average"
        case isIndoor = "is_indoor"
        case source
    }
}

struct ActivityWorkoutsResponse: Decodable {
    let success: Bool
    let data: [ActivityWorkoutSummary]
}

// MARK: - Workout Detail (GET /api/apple-health/workout/[id])

/// Heart rate zone from API (camelCase from stored JSON)
struct ActivityHeartRateZone: Decodable {
    let name: String
    let minBpm: Int
    let maxBpm: Int
    let duration: Int
    let percentage: Int

    enum CodingKeys: String, CodingKey {
        case name
        case minBpm
        case maxBpm
        case duration
        case percentage
    }
}

/// Workout from detail API (snake_case from DB)
struct ActivityWorkoutDetail: Decodable {
    let id: String
    let healthkitId: String
    let workoutType: String
    let startDate: String
    let endDate: String
    let duration: Int
    let activeCalories: Double
    let totalCalories: Double
    let distanceMiles: Double?
    let elevationGainMeters: Double?
    let hrAverage: Int?
    let hrMin: Int?
    let hrMax: Int?
    let hrZones: [ActivityHeartRateZone]?
    let cadenceAverage: Int?
    let paceAverage: Double?
    let paceBest: Double?
    let strideLengthAvg: Double?
    let runningPowerAvg: Double?
    let groundContactTimeAvg: Double?
    let verticalOscillationAvg: Double?
    let cyclingAvgSpeed: Double?
    let cyclingAvgPower: Double?
    let effortScore: Double?
    let isIndoor: Bool?
    let source: String

    enum CodingKeys: String, CodingKey {
        case id
        case healthkitId = "healthkit_id"
        case workoutType = "workout_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case duration
        case activeCalories = "active_calories"
        case totalCalories = "total_calories"
        case distanceMiles = "distance_miles"
        case elevationGainMeters = "elevation_gain_meters"
        case hrAverage = "hr_average"
        case hrMin = "hr_min"
        case hrMax = "hr_max"
        case hrZones = "hr_zones"
        case cadenceAverage = "cadence_average"
        case paceAverage = "pace_average"
        case paceBest = "pace_best"
        case strideLengthAvg = "stride_length_avg"
        case runningPowerAvg = "running_power_avg"
        case groundContactTimeAvg = "ground_contact_time_avg"
        case verticalOscillationAvg = "vertical_oscillation_avg"
        case cyclingAvgSpeed = "cycling_avg_speed"
        case cyclingAvgPower = "cycling_avg_power"
        case effortScore = "effort_score"
        case isIndoor = "is_indoor"
        case source
    }
}

struct HrSampleDetail: Decodable {
    let timestamp: String
    let bpm: Int
}

struct CadenceSampleDetail: Decodable {
    let timestamp: String
    let stepsPerMinute: Int

    enum CodingKeys: String, CodingKey {
        case timestamp
        case stepsPerMinute = "steps_per_minute"
    }
}

struct PaceSampleDetail: Decodable {
    let timestamp: String
    let minutesPerMile: Double

    enum CodingKeys: String, CodingKey {
        case timestamp
        case minutesPerMile = "minutes_per_mile"
    }
}

struct CyclingSpeedSampleDetail: Decodable {
    let timestamp: String
    let speedMph: Double

    enum CodingKeys: String, CodingKey {
        case timestamp
        case speedMph = "speed_mph"
    }
}

struct CyclingCadenceSampleDetail: Decodable {
    let timestamp: String
    let rpm: Int
}

struct CyclingPowerSampleDetail: Decodable {
    let timestamp: String
    let watts: Double
}

struct WorkoutEventDetail: Decodable {
    let eventType: String
    let timestamp: String
    let duration: Double?
    let segmentIndex: Int?
    let lapNumber: Int?

    enum CodingKeys: String, CodingKey {
        case eventType = "event_type"
        case timestamp
        case duration
        case segmentIndex = "segment_index"
        case lapNumber = "lap_number"
    }
}

struct SplitDetail: Decodable {
    let splitNumber: Int
    let splitType: String
    let distanceMeters: Double
    let timeSeconds: Double
    let avgPace: Double?
    let avgHeartRate: Int?
    let avgCadence: Int?
    let elevationChange: Double?

    enum CodingKeys: String, CodingKey {
        case splitNumber = "split_number"
        case splitType = "split_type"
        case distanceMeters = "distance_meters"
        case timeSeconds = "time_seconds"
        case avgPace = "avg_pace"
        case avgHeartRate = "avg_heart_rate"
        case avgCadence = "avg_cadence"
        case elevationChange = "elevation_change"
    }
}

struct RouteSampleDetail: Decodable {
    let timestamp: String
    let latitude: Double
    let longitude: Double
    let altitude: Double?
    let speed: Double?
    let course: Double?
    let horizontalAccuracy: Double?
    let verticalAccuracy: Double?
}

struct RouteDetail: Decodable {
    let id: String
    let workoutId: String
    let totalDistanceMeters: Double?
    let totalElevationGain: Double?
    let totalElevationLoss: Double?
    let samples: [RouteSampleDetail]?

    enum CodingKeys: String, CodingKey {
        case id
        case workoutId = "workout_id"
        case totalDistanceMeters = "total_distance_meters"
        case totalElevationGain = "total_elevation_gain"
        case totalElevationLoss = "total_elevation_loss"
        case samples
    }
}

struct GpsPacePoint: Decodable {
    let elapsedSeconds: Int
    let pace: Double
    let speed: Double

    enum CodingKeys: String, CodingKey {
        case elapsedSeconds = "elapsedSeconds"
        case pace
        case speed
    }
}

// MARK: - HR Zones Config (from Supabase user_hr_zones_config)

struct HrZoneConfigDetail: Decodable {
    let zone: Int
    let label: String
    let minBpm: Int?
    let maxBpm: Int?
    let color: String

    enum CodingKeys: String, CodingKey {
        case zone
        case label
        case minBpm = "minBpm"
        case maxBpm = "maxBpm"
        case color
    }
}

struct HrZonesConfigDetail: Decodable {
    let maxHr: Double?
    let restingHr: Double?
    let zones: [HrZoneConfigDetail]

    enum CodingKeys: String, CodingKey {
        case maxHr
        case restingHr
        case zones
    }
}

// MARK: - Enhanced Workout Analytics

struct PerformanceInsightDetail: Decodable {
    let category: String // strength, improvement, warning, info
    let title: String
    let description: String
    let metric: String?
    let icon: String?
}

struct CardiacDriftDetail: Decodable {
    let firstHalfAvgHr: Double
    let secondHalfAvgHr: Double
    let driftPercentage: Double
    let interpretation: String
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case firstHalfAvgHr
        case secondHalfAvgHr
        case driftPercentage
        case interpretation
        case recommendation
    }
}

struct AerobicDecouplingDetail: Decodable {
    let firstHalfEfficiency: Double
    let secondHalfEfficiency: Double
    let decouplingPercentage: Double
    let interpretation: String
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case firstHalfEfficiency
        case secondHalfEfficiency
        case decouplingPercentage
        case interpretation
        case recommendation
    }
}

struct CadenceAnalysisDetail: Decodable {
    let average: Double
    let min: Double
    let max: Double
    let standardDeviation: Double
    let consistency: String
    let optimalRange: Bool
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case average
        case min
        case max
        case standardDeviation
        case consistency
        case optimalRange
        case recommendation
    }
}

struct PaceAnalysisDetail: Decodable {
    let average: Double
    let best: Double
    let worst: Double
    let standardDeviation: Double
    let splitStrategy: String
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case average
        case best
        case worst
        case standardDeviation
        case splitStrategy
        case recommendation
    }
}

struct TrainingImpulseDetail: Decodable {
    let trimp: Int
    let intensity: String
    let loadCategory: String
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case trimp
        case intensity
        case loadCategory
        case recommendation
    }
}

struct HrVariabilityDetail: Decodable {
    let min: Int
    let max: Int
    let range: Int
    let avgFirstQuarter: Double
    let avgLastQuarter: Double

    enum CodingKeys: String, CodingKey {
        case min
        case max
        case range
        case avgFirstQuarter
        case avgLastQuarter
    }
}

struct HrRecoveryDetail: Decodable {
    let oneMinuteRecovery: Int?
    let recoveryRating: String
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case oneMinuteRecovery
        case recoveryRating
        case recommendation
    }
}

struct WorkoutSplitAnalytics: Decodable {
    let splitNumber: Int
    let distanceMeters: Double
    let timeSeconds: Double
    let avgPace: Double
    let avgHr: Double
    let avgCadence: Double?
    let elevationChange: Double?
    let paceVsAvg: Double
    let hrVsAvg: Double
    let efficiencyFactor: Double

    enum CodingKeys: String, CodingKey {
        case splitNumber
        case distanceMeters
        case timeSeconds
        case avgPace
        case avgHr
        case avgCadence
        case elevationChange
        case paceVsAvg
        case hrVsAvg
        case efficiencyFactor
    }
}

struct TimeSeriesPoint: Decodable {
    let elapsedSeconds: Int
    let hr: Int?
    let cadence: Int?
    let pace: Double?
    let cyclingSpeed: Double?
    let cyclingPower: Double?

    enum CodingKeys: String, CodingKey {
        case elapsedSeconds
        case hr
        case cadence
        case pace
        case cyclingSpeed
        case cyclingPower
    }
}

struct EnhancedWorkoutAnalyticsDetail: Decodable {
    let durationSeconds: Int
    let distanceMiles: Double
    let avgPace: Double
    let avgHr: Double
    let avgCadence: Double?
    let hrZones: [ActivityHeartRateZone]
    let cardiacDrift: CardiacDriftDetail
    let aerobicDecoupling: AerobicDecouplingDetail
    let efficiencyFactor: Double
    let cadenceAnalysis: CadenceAnalysisDetail
    let paceAnalysis: PaceAnalysisDetail
    let trainingImpulse: TrainingImpulseDetail
    let hrVariability: HrVariabilityDetail
    let hrRecovery: HrRecoveryDetail
    let splits: [WorkoutSplitAnalytics]
    let insights: [PerformanceInsightDetail]
    let timeSeriesData: [TimeSeriesPoint]

    enum CodingKeys: String, CodingKey {
        case durationSeconds
        case distanceMiles
        case avgPace
        case avgHr
        case avgCadence
        case hrZones
        case cardiacDrift
        case aerobicDecoupling
        case efficiencyFactor
        case cadenceAnalysis
        case paceAnalysis
        case trainingImpulse
        case hrVariability
        case hrRecovery
        case splits
        case insights
        case timeSeriesData
    }
}

struct WorkoutDetailResponse: Decodable {
    let success: Bool
    let data: WorkoutDetailData
}

struct WorkoutDetailData: Decodable {
    let workout: ActivityWorkoutDetail
    let hrSamples: [HrSampleDetail]
    let hrChart: [HrSampleDetail]
    let cadenceSamples: [CadenceSampleDetail]
    let paceSamples: [PaceSampleDetail]
    let cyclingSpeedSamples: [CyclingSpeedSampleDetail]
    let cyclingCadenceSamples: [CyclingCadenceSampleDetail]?
    let cyclingPowerSamples: [CyclingPowerSampleDetail]
    let workoutEvents: [WorkoutEventDetail]
    let splits: [SplitDetail]
    let route: RouteDetail?
    let gpsPaceData: [GpsPacePoint]?
    let analytics: EnhancedWorkoutAnalyticsDetail?
    let hrZonesConfig: HrZonesConfigDetail?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        workout = try c.decode(ActivityWorkoutDetail.self, forKey: .workout)
        hrSamples = (try? c.decode([HrSampleDetail].self, forKey: .hrSamples)) ?? []
        hrChart = (try? c.decode([HrSampleDetail].self, forKey: .hrChart)) ?? []
        cadenceSamples = (try? c.decode([CadenceSampleDetail].self, forKey: .cadenceSamples)) ?? []
        paceSamples = (try? c.decode([PaceSampleDetail].self, forKey: .paceSamples)) ?? []
        cyclingSpeedSamples = (try? c.decode([CyclingSpeedSampleDetail].self, forKey: .cyclingSpeedSamples)) ?? []
        cyclingCadenceSamples = try? c.decode([CyclingCadenceSampleDetail].self, forKey: .cyclingCadenceSamples)
        cyclingPowerSamples = (try? c.decode([CyclingPowerSampleDetail].self, forKey: .cyclingPowerSamples)) ?? []
        workoutEvents = (try? c.decode([WorkoutEventDetail].self, forKey: .workoutEvents)) ?? []
        splits = (try? c.decode([SplitDetail].self, forKey: .splits)) ?? []
        route = try? c.decode(RouteDetail.self, forKey: .route)
        gpsPaceData = try? c.decode([GpsPacePoint].self, forKey: .gpsPaceData)
        analytics = try? c.decode(EnhancedWorkoutAnalyticsDetail.self, forKey: .analytics)
        hrZonesConfig = try? c.decode(HrZonesConfigDetail.self, forKey: .hrZonesConfig)
    }

    enum CodingKeys: String, CodingKey {
        case workout
        case hrSamples
        case hrChart
        case cadenceSamples
        case paceSamples
        case cyclingSpeedSamples
        case cyclingCadenceSamples
        case cyclingPowerSamples
        case workoutEvents
        case splits
        case route
        case gpsPaceData
        case analytics
        case hrZonesConfig
    }
}

struct SyncedWorkoutSummary: Decodable {
    let id: String
    let healthkit_id: String
    let workout_type: String
    let start_date: String
    let duration: Int
    let active_calories: Double?
    let hr_average: Int?
    let distance_miles: Double?
    let cadence_average: Int?
    let pace_average: Double?
}

// MARK: - Errors

enum PetehomeAPIError: Error, LocalizedError {
    case invalidResponse
    case unauthorized(String) // Include raw response
    case rateLimited
    case httpError(Int, String) // Include status code and raw response
    case serverError(String)
    case syncFailed
    case encodingFailed
    case networkUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized(let raw):
            return "Unauthorized: \(raw)"
        case .rateLimited:
            return "Too many requests, please wait"
        case .httpError(let code, let raw):
            return "HTTP \(code): \(raw)"
        case .serverError(let message):
            return "Server error: \(message)"
        case .syncFailed:
            return "Sync failed"
        case .encodingFailed:
            return "Failed to encode request data"
        case .networkUnavailable:
            return "Network unavailable"
        }
    }
}

// MARK: - Sync Status

enum SyncStatus: String, Codable {
    case idle
    case syncing
    case success
    case failed
    case queued
}

/// Represents a workout queued for sync retry
struct QueuedWorkout: Codable, Identifiable {
    let id: String // HealthKit UUID
    let dayNumber: Int?
    let queuedAt: Date
    var retryCount: Int
    var lastError: String?

    init(healthKitId: String, dayNumber: Int?, queuedAt: Date = Date()) {
        self.id = healthKitId
        self.dayNumber = dayNumber
        self.queuedAt = queuedAt
        self.retryCount = 0
    }
}

/// Result of a historical sync operation
struct HistoricalSyncResult {
    let total: Int
    let synced: Int
    let skipped: Int
    let failed: Int
    let errors: [String]

    var summary: String {
        if total == 0 && skipped == 0 {
            return "No workouts found"
        } else if total == 0 && skipped > 0 {
            return "All \(skipped) workouts already synced"
        } else if failed == 0 {
            return "\(synced) synced, \(skipped) skipped"
        } else {
            return "\(synced) synced, \(failed) failed, \(skipped) skipped"
        }
    }
}

// MARK: - HKWorkoutActivityType Extension

extension HKWorkoutActivityType {
    /// Map HKWorkoutActivityType to Petehome API string
    var petehomeType: String {
        switch self {
        case .running:
            return "running"
        case .walking:
            return "walking"
        case .hiking:
            return "hiking"
        case .cycling:
            return "cycling"
        case .functionalStrengthTraining:
            return "functionalStrengthTraining"
        case .traditionalStrengthTraining:
            return "traditionalStrengthTraining"
        case .coreTraining:
            return "coreTraining"
        case .highIntensityIntervalTraining:
            return "hiit"
        case .rowing:
            return "rowing"
        case .stairClimbing:
            return "stairClimbing"
        case .elliptical:
            return "elliptical"
        default:
            return "other"
        }
    }
}

// MARK: - ISO8601 Date Formatting

extension Date {
    /// Format date as ISO8601 string for Petehome API
    var iso8601String: String {
        ISO8601DateFormatter().string(from: self)
    }

    /// Format date as yyyy-MM-dd for daily metrics
    var dateOnlyString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: self)
    }
}

extension String {
    /// Parse ISO8601 string to Date
    var iso8601Date: Date? {
        ISO8601DateFormatter().date(from: self)
    }
}

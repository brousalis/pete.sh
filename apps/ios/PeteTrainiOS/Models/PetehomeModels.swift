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

    let heartRate: HeartRateSummary
    let heartRateSamples: [PetehomeHeartRateSample]

    let runningMetrics: PetehomeRunningMetrics?
    let cyclingMetrics: PetehomeCyclingMetrics?
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

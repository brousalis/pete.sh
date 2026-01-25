# PeteWatch Integration Guide

This guide details how to integrate the PeteWatch Apple Watch app with the Petehome fitness tracking system. The integration enables syncing of workout data, heart rate samples, running metrics (pace, cadence), and daily health metrics from Apple HealthKit to the Petehome dashboard.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Types](#data-types)
5. [HealthKit Queries](#healthkit-queries)
6. [Implementation Guide](#implementation-guide)
7. [Sample Swift Code](#sample-swift-code)
8. [Best Practices](#best-practices)
9. [Error Handling](#error-handling)

---

## Overview

### Architecture

```
┌─────────────────────┐                          ┌─────────────────────┐
│   Apple Watch       │                          │     Petehome        │
│   (PeteWatch App)   │                          │     Server          │
│                     │                          │                     │
│  ┌───────────────┐  │      HTTPS POST          │  ┌───────────────┐  │
│  │   HealthKit   │──┼─────────────────────────►│  │   API Routes  │  │
│  │   Queries     │  │   Authorization:         │  │               │  │
│  └───────────────┘  │   Bearer <API_KEY>       │  └───────┬───────┘  │
│         │           │                          │          │          │
│         ▼           │                          │          ▼          │
│  ┌───────────────┐  │                          │  ┌───────────────┐  │
│  │  JSON Payload │  │                          │  │   Supabase    │  │
│  │  Serializer   │  │                          │  │   Database    │  │
│  └───────────────┘  │                          │  └───────────────┘  │
└─────────────────────┘                          └─────────────────────┘
```

### Sync Triggers

PeteWatch should sync data in these scenarios:

1. **Post-Workout Sync**: Immediately after a workout session ends
2. **Background Refresh**: Periodically via WatchOS background app refresh
3. **Daily Sync**: Once per day for daily health metrics (steps, resting HR, HRV)
4. **Manual Sync**: User-initiated from the watch app

---

## Authentication

All API requests require Bearer token authentication.

### Headers

```http
Authorization: Bearer YOUR_PETEWATCH_API_KEY
Content-Type: application/json
```

### API Key Storage

Store the API key securely in the iOS Keychain. Never hardcode it.

```swift
import Security

class KeychainHelper {
    static func save(key: String, value: String) {
        let data = value.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
```

---

## API Endpoints

### Base URL

```
Production: https://your-petehome-domain.com
Local Dev:  http://192.168.x.x:3000
```

### Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apple-health/workout` | POST | Save a single workout with samples |
| `/api/apple-health/workout` | GET | Get recent workouts |
| `/api/apple-health/workout/{id}` | GET | Get workout details with all samples |
| `/api/apple-health/daily` | POST | Save daily health metrics |
| `/api/apple-health/daily` | GET | Get daily metrics |
| `/api/apple-health/sync` | POST | Batch sync multiple workouts + metrics |
| `/api/apple-health/summary` | GET | Get weekly summary and trends |

---

### POST `/api/apple-health/workout`

Save a workout with heart rate, cadence, pace samples, and optional GPS route.

#### Request

```json
{
  "workout": {
    "id": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
    "workoutType": "running",
    "workoutTypeRaw": 37,
    "startDate": "2026-01-25T07:00:00.000Z",
    "endDate": "2026-01-25T07:32:15.000Z",
    "duration": 1935,
    
    "activeCalories": 342,
    "totalCalories": 412,
    
    "distance": 4828,
    "distanceMiles": 3.0,
    "elevationGain": 45.2,
    
    "heartRate": {
      "average": 156,
      "min": 98,
      "max": 178,
      "resting": 52,
      "zones": [
        { "name": "rest", "minBpm": 0, "maxBpm": 93, "duration": 60, "percentage": 3 },
        { "name": "warmup", "minBpm": 93, "maxBpm": 111, "duration": 180, "percentage": 9 },
        { "name": "fatBurn", "minBpm": 111, "maxBpm": 130, "duration": 420, "percentage": 22 },
        { "name": "cardio", "minBpm": 130, "maxBpm": 157, "duration": 900, "percentage": 47 },
        { "name": "peak", "minBpm": 157, "maxBpm": 185, "duration": 375, "percentage": 19 }
      ]
    },
    
    "heartRateSamples": [
      { "timestamp": "2026-01-25T07:00:05.000Z", "bpm": 98, "motionContext": "active" },
      { "timestamp": "2026-01-25T07:00:10.000Z", "bpm": 102, "motionContext": "active" },
      { "timestamp": "2026-01-25T07:00:15.000Z", "bpm": 108, "motionContext": "active" }
    ],
    
    "runningMetrics": {
      "cadence": {
        "average": 172,
        "samples": [
          { "timestamp": "2026-01-25T07:01:00.000Z", "stepsPerMinute": 168 },
          { "timestamp": "2026-01-25T07:02:00.000Z", "stepsPerMinute": 172 },
          { "timestamp": "2026-01-25T07:03:00.000Z", "stepsPerMinute": 175 }
        ]
      },
      "pace": {
        "average": 10.75,
        "best": 9.25,
        "samples": [
          { "timestamp": "2026-01-25T07:01:00.000Z", "minutesPerMile": 11.2, "speedMph": 5.36 },
          { "timestamp": "2026-01-25T07:02:00.000Z", "minutesPerMile": 10.8, "speedMph": 5.56 },
          { "timestamp": "2026-01-25T07:03:00.000Z", "minutesPerMile": 10.5, "speedMph": 5.71 }
        ]
      },
      "strideLength": {
        "average": 1.12
      },
      "runningPower": {
        "average": 245
      }
    },
    
    "route": {
      "totalDistance": 4828,
      "totalElevationGain": 45.2,
      "totalElevationLoss": 42.8,
      "samples": [
        {
          "timestamp": "2026-01-25T07:00:05.000Z",
          "latitude": 41.8781,
          "longitude": -87.6298,
          "altitude": 182.5,
          "speed": 2.8,
          "course": 45.2,
          "horizontalAccuracy": 5.0,
          "verticalAccuracy": 8.0
        }
      ]
    },
    
    "source": "PeteWatch",
    "sourceVersion": "1.2.0",
    "device": {
      "name": "Apple Watch",
      "model": "Watch7,2",
      "hardwareVersion": "Watch SE (2nd Gen)",
      "softwareVersion": "10.2"
    },
    
    "weather": {
      "temperature": 12.5,
      "humidity": 65
    }
  },
  
  "linkedWorkoutId": "wednesday-fat-incinerator",
  "linkedDay": "wednesday"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "success": true
  }
}
```

---

### POST `/api/apple-health/daily`

Save daily health metrics (activity rings, resting HR, HRV, sleep, etc.)

#### Request

```json
{
  "metrics": {
    "date": "2026-01-25",
    
    "steps": 8432,
    "activeCalories": 485,
    "totalCalories": 2150,
    "exerciseMinutes": 45,
    "standHours": 10,
    "moveGoal": 500,
    "exerciseGoal": 30,
    "standGoal": 12,
    
    "restingHeartRate": 52,
    "heartRateVariability": 48.5,
    
    "vo2Max": 42.3,
    
    "sleepDuration": 27000,
    "sleepStages": {
      "awake": 1800,
      "rem": 5400,
      "core": 14400,
      "deep": 5400
    },
    
    "walkingHeartRateAverage": 98,
    "walkingDoubleSupportPercentage": 28.5,
    "walkingAsymmetryPercentage": 2.1,
    "walkingSpeed": 1.35,
    "walkingStepLength": 0.72,
    
    "source": "PeteWatch",
    "recordedAt": "2026-01-25T23:55:00.000Z"
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Daily metrics saved"
}
```

---

### POST `/api/apple-health/sync`

Batch sync endpoint for background refresh - sync multiple workouts and daily metrics at once.

#### Request

```json
{
  "workouts": [
    { /* AppleHealthWorkout object */ },
    { /* AppleHealthWorkout object */ }
  ],
  "dailyMetrics": [
    { /* DailyHealthMetrics for day 1 */ },
    { /* DailyHealthMetrics for day 2 */ }
  ],
  "lastSyncTimestamp": "2026-01-24T12:00:00.000Z"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "workoutsSaved": 2,
    "workoutsFailed": 0,
    "dailyMetricsSaved": 2,
    "dailyMetricsFailed": 0,
    "errors": []
  },
  "syncTimestamp": "2026-01-25T12:00:00.000Z"
}
```

---

### GET `/api/apple-health/workout`

Get recent workouts (useful for checking what's already synced).

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | - | Filter by workout type (e.g., `running`) |
| `limit` | number | 10 | Number of workouts to return |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "healthkit_id": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
      "workout_type": "running",
      "start_date": "2026-01-25T07:00:00.000Z",
      "duration": 1935,
      "active_calories": 342,
      "hr_average": 156,
      "distance_miles": 3.0,
      "cadence_average": 172,
      "pace_average": 10.75
    }
  ]
}
```

---

## Data Types

### Workout Types

Map HKWorkoutActivityType to string values:

| HKWorkoutActivityType | Raw Value | String Value |
|-----------------------|-----------|--------------|
| `.running` | 37 | `"running"` |
| `.walking` | 52 | `"walking"` |
| `.cycling` | 13 | `"cycling"` |
| `.functionalStrengthTraining` | 20 | `"functionalStrengthTraining"` |
| `.traditionalStrengthTraining` | 50 | `"traditionalStrengthTraining"` |
| `.coreTraining` | 74 | `"coreTraining"` |
| `.highIntensityIntervalTraining` | 63 | `"hiit"` |
| `.rowing` | 35 | `"rowing"` |
| `.stairClimbing` | 46 | `"stairClimbing"` |
| `.elliptical` | 17 | `"elliptical"` |

### Heart Rate Zones

Petehome uses a 5-zone model based on percentage of max heart rate:

| Zone | Name | % of Max HR | Description |
|------|------|-------------|-------------|
| 1 | Rest | 0-50% | Recovery |
| 2 | Warm Up | 50-60% | Light activity |
| 3 | Fat Burn | 60-70% | Aerobic |
| 4 | Cardio | 70-85% | Threshold |
| 5 | Peak | 85-100% | Max effort |

Calculate using: `maxHR = 220 - age` (or use user-configured value)

### Motion Context

For heart rate samples, `motionContext` maps to `HKHeartRateMotionContext`:

| Value | Description |
|-------|-------------|
| `"sedentary"` | User was stationary |
| `"active"` | User was moving |
| `"notSet"` | Context not available |

---

## HealthKit Queries

### Required Permissions

Request these HealthKit authorizations:

```swift
let typesToRead: Set<HKObjectType> = [
    // Workouts
    HKObjectType.workoutType(),
    HKSeriesType.workoutRoute(),
    
    // Heart Rate
    HKQuantityType.quantityType(forIdentifier: .heartRate)!,
    HKQuantityType.quantityType(forIdentifier: .restingHeartRate)!,
    HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
    
    // Activity
    HKQuantityType.quantityType(forIdentifier: .stepCount)!,
    HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
    HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned)!,
    HKQuantityType.quantityType(forIdentifier: .appleExerciseTime)!,
    HKQuantityType.quantityType(forIdentifier: .appleStandTime)!,
    
    // Running Metrics
    HKQuantityType.quantityType(forIdentifier: .runningSpeed)!,
    HKQuantityType.quantityType(forIdentifier: .runningStrideLength)!,
    HKQuantityType.quantityType(forIdentifier: .runningPower)!,
    HKQuantityType.quantityType(forIdentifier: .runningGroundContactTime)!,
    HKQuantityType.quantityType(forIdentifier: .runningVerticalOscillation)!,
    
    // Cardio Fitness
    HKQuantityType.quantityType(forIdentifier: .vo2Max)!,
    
    // Distance
    HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
    HKQuantityType.quantityType(forIdentifier: .distanceCycling)!,
    
    // Sleep
    HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!,
    
    // Walking Metrics
    HKQuantityType.quantityType(forIdentifier: .walkingHeartRateAverage)!,
    HKQuantityType.quantityType(forIdentifier: .walkingDoubleSupportPercentage)!,
    HKQuantityType.quantityType(forIdentifier: .walkingAsymmetryPercentage)!,
    HKQuantityType.quantityType(forIdentifier: .walkingSpeed)!,
    HKQuantityType.quantityType(forIdentifier: .walkingStepLength)!
]
```

### Query: Heart Rate Samples During Workout

```swift
func queryHeartRateSamples(for workout: HKWorkout) async throws -> [HeartRateSample] {
    let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
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
            
            let hrSamples = (samples as? [HKQuantitySample])?.map { sample in
                HeartRateSample(
                    timestamp: ISO8601DateFormatter().string(from: sample.startDate),
                    bpm: Int(sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))),
                    motionContext: self.getMotionContext(from: sample)
                )
            } ?? []
            
            continuation.resume(returning: hrSamples)
        }
        
        healthStore.execute(query)
    }
}

private func getMotionContext(from sample: HKQuantitySample) -> String {
    guard let context = sample.metadata?[HKMetadataKeyHeartRateMotionContext] as? Int else {
        return "notSet"
    }
    switch HKHeartRateMotionContext(rawValue: context) {
    case .sedentary: return "sedentary"
    case .active: return "active"
    default: return "notSet"
    }
}
```

### Query: Running Cadence (Steps Per Minute)

```swift
func queryCadenceSamples(for workout: HKWorkout) async throws -> [CadenceSample] {
    // Query step count and calculate cadence per minute
    let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    let predicate = HKQuery.predicateForSamples(
        withStart: workout.startDate,
        end: workout.endDate,
        options: .strictStartDate
    )
    
    // Use statistics collection query for per-minute aggregation
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
            
            var samples: [CadenceSample] = []
            results?.enumerateStatistics(from: workout.startDate, to: workout.endDate) { statistics, _ in
                if let sum = statistics.sumQuantity() {
                    let steps = sum.doubleValue(for: .count())
                    // Steps per minute interval = cadence (assuming 1-minute intervals)
                    samples.append(CadenceSample(
                        timestamp: ISO8601DateFormatter().string(from: statistics.startDate),
                        stepsPerMinute: Int(steps)
                    ))
                }
            }
            
            continuation.resume(returning: samples)
        }
        
        healthStore.execute(query)
    }
}
```

### Query: Running Speed/Pace

```swift
func queryPaceSamples(for workout: HKWorkout) async throws -> [PaceSample] {
    let speedType = HKQuantityType.quantityType(forIdentifier: .runningSpeed)!
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
            
            let paceSamples = (samples as? [HKQuantitySample])?.map { sample in
                let speedMps = sample.quantity.doubleValue(for: .meter().unitDivided(by: .second()))
                let speedMph = speedMps * 2.237
                let minutesPerMile = speedMph > 0 ? 60.0 / speedMph : 0
                
                return PaceSample(
                    timestamp: ISO8601DateFormatter().string(from: sample.startDate),
                    minutesPerMile: minutesPerMile,
                    speedMph: speedMph
                )
            } ?? []
            
            continuation.resume(returning: paceSamples)
        }
        
        healthStore.execute(query)
    }
}
```

### Query: Workout Route (GPS)

```swift
func queryRoute(for workout: HKWorkout) async throws -> WorkoutRoute? {
    let routeType = HKSeriesType.workoutRoute()
    let predicate = HKQuery.predicateForObjects(from: workout)
    
    return try await withCheckedThrowingContinuation { continuation in
        let query = HKSampleQuery(
            sampleType: routeType,
            predicate: predicate,
            limit: 1,
            sortDescriptors: nil
        ) { [weak self] _, samples, error in
            guard let route = samples?.first as? HKWorkoutRoute else {
                continuation.resume(returning: nil)
                return
            }
            
            Task {
                do {
                    let locations = try await self?.queryRouteLocations(route: route) ?? []
                    let routeData = self?.buildRouteData(from: locations)
                    continuation.resume(returning: routeData)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
        
        healthStore.execute(query)
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
        
        healthStore.execute(query)
    }
}

private func buildRouteData(from locations: [CLLocation]) -> WorkoutRoute {
    var totalElevationGain: Double = 0
    var totalElevationLoss: Double = 0
    var previousAltitude: Double?
    
    let samples = locations.map { location in
        // Calculate elevation change
        if let prev = previousAltitude {
            let diff = location.altitude - prev
            if diff > 0 {
                totalElevationGain += diff
            } else {
                totalElevationLoss += abs(diff)
            }
        }
        previousAltitude = location.altitude
        
        return LocationSample(
            timestamp: ISO8601DateFormatter().string(from: location.timestamp),
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            altitude: location.altitude,
            speed: location.speed,
            course: location.course,
            horizontalAccuracy: location.horizontalAccuracy,
            verticalAccuracy: location.verticalAccuracy
        )
    }
    
    let totalDistance = locations.isEmpty ? 0 : 
        zip(locations, locations.dropFirst()).reduce(0.0) { sum, pair in
            sum + pair.0.distance(from: pair.1)
        }
    
    return WorkoutRoute(
        samples: samples,
        totalDistance: totalDistance,
        totalElevationGain: totalElevationGain,
        totalElevationLoss: totalElevationLoss
    )
}
```

### Query: Daily Health Metrics

```swift
func queryDailyMetrics(for date: Date) async throws -> DailyHealthMetrics {
    let calendar = Calendar.current
    let startOfDay = calendar.startOfDay(for: date)
    let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
    
    async let steps = queryDailySum(.stepCount, start: startOfDay, end: endOfDay)
    async let activeCalories = queryDailySum(.activeEnergyBurned, start: startOfDay, end: endOfDay)
    async let basalCalories = queryDailySum(.basalEnergyBurned, start: startOfDay, end: endOfDay)
    async let exerciseMinutes = queryDailySum(.appleExerciseTime, start: startOfDay, end: endOfDay)
    async let standHours = queryStandHours(start: startOfDay, end: endOfDay)
    async let restingHR = queryMostRecentSample(.restingHeartRate, start: startOfDay, end: endOfDay)
    async let hrv = queryMostRecentSample(.heartRateVariabilitySDNN, start: startOfDay, end: endOfDay)
    async let vo2Max = queryMostRecentSample(.vo2Max, start: startOfDay, end: endOfDay)
    
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    
    return try await DailyHealthMetrics(
        date: dateFormatter.string(from: date),
        steps: Int(steps),
        activeCalories: activeCalories,
        totalCalories: activeCalories + basalCalories,
        exerciseMinutes: Int(exerciseMinutes),
        standHours: standHours,
        restingHeartRate: restingHR != nil ? Int(restingHR!) : nil,
        heartRateVariability: hrv,
        vo2Max: vo2Max,
        source: "PeteWatch",
        recordedAt: ISO8601DateFormatter().string(from: Date())
    )
}

private func queryDailySum(_ identifier: HKQuantityTypeIdentifier, start: Date, end: Date) async throws -> Double {
    let type = HKQuantityType.quantityType(forIdentifier: identifier)!
    let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
    
    return try await withCheckedThrowingContinuation { continuation in
        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, statistics, error in
            if let error = error {
                continuation.resume(throwing: error)
                return
            }
            
            let unit = self.unitForType(identifier)
            let value = statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0
            continuation.resume(returning: value)
        }
        
        healthStore.execute(query)
    }
}

private func unitForType(_ identifier: HKQuantityTypeIdentifier) -> HKUnit {
    switch identifier {
    case .stepCount: return .count()
    case .activeEnergyBurned, .basalEnergyBurned: return .kilocalorie()
    case .appleExerciseTime: return .minute()
    case .heartRateVariabilitySDNN: return .secondUnit(with: .milli)
    case .vo2Max: return HKUnit.literUnit(with: .milli).unitDivided(by: .gramUnit(with: .kilo).unitMultiplied(by: .minute()))
    case .restingHeartRate: return .count().unitDivided(by: .minute())
    default: return .count()
    }
}
```

---

## Implementation Guide

### 1. Setup HealthKit

```swift
import HealthKit

class HealthKitManager {
    static let shared = HealthKitManager()
    let healthStore = HKHealthStore()
    
    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.notAvailable
        }
        
        try await healthStore.requestAuthorization(toShare: [], read: typesToRead)
    }
}
```

### 2. Workout Session Delegate

```swift
extension WorkoutManager: HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        if toState == .ended {
            Task {
                await syncCompletedWorkout()
            }
        }
    }
    
    private func syncCompletedWorkout() async {
        guard let workout = try? await builder.finishWorkout() else { return }
        
        do {
            // Query all samples
            async let hrSamples = queryHeartRateSamples(for: workout)
            async let cadenceSamples = queryCadenceSamples(for: workout)
            async let paceSamples = queryPaceSamples(for: workout)
            async let route = queryRoute(for: workout)
            
            // Build payload
            let payload = try await buildWorkoutPayload(
                workout: workout,
                hrSamples: hrSamples,
                cadenceSamples: cadenceSamples,
                paceSamples: paceSamples,
                route: route
            )
            
            // Sync to Petehome
            try await PetehomeAPI.shared.syncWorkout(payload)
            
        } catch {
            // Queue for retry
            SyncQueue.shared.enqueue(workout)
        }
    }
}
```

### 3. Background Sync

```swift
import WatchKit

class ExtensionDelegate: NSObject, WKExtensionDelegate {
    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for task in backgroundTasks {
            switch task {
            case let backgroundTask as WKApplicationRefreshBackgroundTask:
                Task {
                    await performBackgroundSync()
                    backgroundTask.setTaskCompletedWithSnapshot(false)
                }
            default:
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }
    
    private func performBackgroundSync() async {
        // Sync any queued workouts
        await SyncQueue.shared.processQueue()
        
        // Sync today's daily metrics
        let metrics = try? await HealthKitManager.shared.queryDailyMetrics(for: Date())
        if let metrics = metrics {
            try? await PetehomeAPI.shared.syncDailyMetrics(metrics)
        }
        
        // Schedule next refresh
        scheduleBackgroundRefresh()
    }
    
    func scheduleBackgroundRefresh() {
        let nextRefresh = Date().addingTimeInterval(15 * 60) // 15 minutes
        WKExtension.shared().scheduleBackgroundRefresh(
            withPreferredDate: nextRefresh,
            userInfo: nil
        ) { _ in }
    }
}
```

---

## Sample Swift Code

### Complete API Client

```swift
import Foundation

class PetehomeAPI {
    static let shared = PetehomeAPI()
    
    private let baseURL: URL
    private let apiKey: String
    private let session: URLSession
    
    private init() {
        self.baseURL = URL(string: "https://your-petehome.com")!
        self.apiKey = KeychainHelper.load(key: "petehome_api_key") ?? ""
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Sync Workout
    
    func syncWorkout(_ payload: WorkoutPayload) async throws {
        let url = baseURL.appendingPathComponent("/api/apple-health/workout")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            let result = try JSONDecoder().decode(APIResponse.self, from: data)
            if !result.success {
                throw APIError.serverError(result.error ?? "Unknown error")
            }
        case 401:
            throw APIError.unauthorized
        case 429:
            throw APIError.rateLimited
        default:
            throw APIError.httpError(httpResponse.statusCode)
        }
    }
    
    // MARK: - Sync Daily Metrics
    
    func syncDailyMetrics(_ metrics: DailyHealthMetrics) async throws {
        let url = baseURL.appendingPathComponent("/api/apple-health/daily")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = ["metrics": metrics]
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.syncFailed
        }
    }
    
    // MARK: - Batch Sync
    
    func batchSync(workouts: [WorkoutPayload], dailyMetrics: [DailyHealthMetrics]) async throws -> BatchSyncResult {
        let url = baseURL.appendingPathComponent("/api/apple-health/sync")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = BatchSyncPayload(
            workouts: workouts.map { $0.workout },
            dailyMetrics: dailyMetrics
        )
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.syncFailed
        }
        
        return try JSONDecoder().decode(BatchSyncResult.self, from: data)
    }
    
    // MARK: - Check Synced Workouts
    
    func getSyncedWorkoutIDs(limit: Int = 50) async throws -> Set<String> {
        let url = baseURL.appendingPathComponent("/api/apple-health/workout")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "limit", value: String(limit))]
        
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await session.data(for: request)
        let response = try JSONDecoder().decode(WorkoutsResponse.self, from: data)
        
        return Set(response.data.map { $0.healthkit_id })
    }
}

// MARK: - Models

struct WorkoutPayload: Encodable {
    let workout: AppleHealthWorkout
    let linkedWorkoutId: String?
    let linkedDay: String?
}

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
    let heartRateSamples: [HeartRateSample]
    let runningMetrics: RunningMetrics?
    let route: WorkoutRoute?
    let source: String
    let sourceVersion: String?
    let device: DeviceInfo?
    let weather: WeatherInfo?
}

struct HeartRateSummary: Codable {
    let average: Int
    let min: Int
    let max: Int
    let resting: Int?
    let zones: [HeartRateZone]
}

struct HeartRateZone: Codable {
    let name: String
    let minBpm: Int
    let maxBpm: Int
    let duration: Int
    let percentage: Int
}

struct HeartRateSample: Codable {
    let timestamp: String
    let bpm: Int
    let motionContext: String?
}

struct RunningMetrics: Codable {
    let cadence: CadenceData
    let pace: PaceData
    let strideLength: StrideLengthData?
    let runningPower: RunningPowerData?
}

struct CadenceData: Codable {
    let average: Int
    let samples: [CadenceSample]
}

struct CadenceSample: Codable {
    let timestamp: String
    let stepsPerMinute: Int
}

struct PaceData: Codable {
    let average: Double
    let best: Double
    let samples: [PaceSample]
}

struct PaceSample: Codable {
    let timestamp: String
    let minutesPerMile: Double
    let speedMph: Double?
}

struct DailyHealthMetrics: Codable {
    let date: String
    let steps: Int
    let activeCalories: Double
    let totalCalories: Double
    let exerciseMinutes: Int
    let standHours: Int
    let moveGoal: Int?
    let exerciseGoal: Int?
    let standGoal: Int?
    let restingHeartRate: Int?
    let heartRateVariability: Double?
    let vo2Max: Double?
    let sleepDuration: Int?
    let sleepStages: SleepStages?
    let source: String
    let recordedAt: String
}

enum APIError: Error {
    case invalidResponse
    case unauthorized
    case rateLimited
    case httpError(Int)
    case serverError(String)
    case syncFailed
}
```

---

## Best Practices

### 1. Sample Rate Optimization

Don't send every single HR sample for long workouts. Downsample for workouts > 30 minutes:

```swift
func downsampleHRSamples(_ samples: [HeartRateSample], targetInterval: TimeInterval = 5) -> [HeartRateSample] {
    guard samples.count > 100 else { return samples }
    
    let formatter = ISO8601DateFormatter()
    var result: [HeartRateSample] = []
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
```

### 2. Incremental Sync

Only sync new data since last successful sync:

```swift
class SyncManager {
    private let defaults = UserDefaults.standard
    private let lastSyncKey = "lastPetehomeSync"
    
    var lastSyncDate: Date? {
        get { defaults.object(forKey: lastSyncKey) as? Date }
        set { defaults.set(newValue, forKey: lastSyncKey) }
    }
    
    func getUnsyncedWorkouts() async throws -> [HKWorkout] {
        let predicate: NSPredicate
        if let lastSync = lastSyncDate {
            predicate = HKQuery.predicateForSamples(
                withStart: lastSync,
                end: Date(),
                options: .strictStartDate
            )
        } else {
            // First sync: last 7 days
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
            predicate = HKQuery.predicateForSamples(
                withStart: weekAgo,
                end: Date(),
                options: .strictStartDate
            )
        }
        
        // Query and return workouts
        // ...
    }
}
```

### 3. Offline Queue

Queue failed syncs for retry:

```swift
class SyncQueue {
    static let shared = SyncQueue()
    
    private let queue = DispatchQueue(label: "com.petewatch.syncqueue")
    private var pendingWorkouts: [String] = [] // HealthKit UUIDs
    
    func enqueue(_ workout: HKWorkout) {
        queue.async {
            self.pendingWorkouts.append(workout.uuid.uuidString)
            self.savePendingList()
        }
    }
    
    func processQueue() async {
        let pending = queue.sync { self.pendingWorkouts }
        
        for workoutId in pending {
            do {
                // Re-query workout from HealthKit and sync
                // ...
                dequeue(workoutId)
            } catch {
                // Keep in queue for next attempt
            }
        }
    }
}
```

### 4. Battery Considerations

- Use `WKExtension.scheduleBackgroundRefresh` instead of continuous polling
- Batch network requests when possible
- Skip GPS route for indoor workouts
- Reduce HR sample rate for strength training (every 10-15 seconds is sufficient)

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 400 | Bad Request | Check payload format |
| 401 | Unauthorized | Verify API key |
| 429 | Rate Limited | Back off and retry |
| 500 | Server Error | Retry with backoff |

### Retry Strategy

```swift
func syncWithRetry(_ payload: WorkoutPayload, maxRetries: Int = 3) async throws {
    var lastError: Error?
    
    for attempt in 0..<maxRetries {
        do {
            try await PetehomeAPI.shared.syncWorkout(payload)
            return
        } catch APIError.rateLimited {
            let delay = pow(2.0, Double(attempt)) // Exponential backoff
            try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            lastError = APIError.rateLimited
        } catch {
            lastError = error
            break
        }
    }
    
    throw lastError ?? APIError.syncFailed
}
```

---

## Testing

### Test Endpoint (Development)

In development mode (`NODE_ENV=development`), the API accepts requests without authentication for easier testing.

### Mock Data

Use the batch sync endpoint with test data:

```bash
curl -X POST http://localhost:3000/api/apple-health/sync \
  -H "Content-Type: application/json" \
  -d '{
    "workouts": [{
      "id": "test-workout-001",
      "workoutType": "running",
      "startDate": "2026-01-25T07:00:00Z",
      "endDate": "2026-01-25T07:30:00Z",
      "duration": 1800,
      "activeCalories": 300,
      "totalCalories": 350,
      "distance": 4000,
      "distanceMiles": 2.49,
      "heartRate": {
        "average": 155,
        "min": 95,
        "max": 175,
        "zones": []
      },
      "heartRateSamples": [],
      "source": "PeteWatch-Test"
    }],
    "dailyMetrics": [{
      "date": "2026-01-25",
      "steps": 5000,
      "activeCalories": 250,
      "totalCalories": 1800,
      "exerciseMinutes": 30,
      "standHours": 8,
      "source": "PeteWatch-Test",
      "recordedAt": "2026-01-25T12:00:00Z"
    }]
  }'
```

---

## Support

For questions or issues with the Petehome API integration, contact the Petehome maintainer or open an issue in the repository.

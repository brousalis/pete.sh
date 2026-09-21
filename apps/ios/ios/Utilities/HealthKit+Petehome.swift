import Foundation
import HealthKit

/// Shared HealthKit helpers for iOS 27 / Series 12 ingest.
///
/// Multisport (`swimBikeRun`) and RMSSD compile against older SDKs via raw
/// identifiers. Native zone groups need the iOS 27 SDK and are gated at
/// runtime so a phone still on 26 keeps the 220-age fallback.
enum HealthKitPetehome {

    /// Series 12 Recovery HRV. String-based so Xcode 26 still compiles.
    static var rmssdType: HKQuantityType? {
        HKQuantityType.quantityType(
            forIdentifier: HKQuantityTypeIdentifier(rawValue: "HKQuantityTypeIdentifierHeartRateVariabilityRMSSD")
        )
    }

    static func includes(_ workout: HKWorkout, _ type: HKWorkoutActivityType) -> Bool {
        if workout.workoutActivityType == type { return true }
        return workout.workoutActivities.contains {
            $0.workoutConfiguration.activityType == type
        }
    }

    static func isOutdoorCandidate(_ workout: HKWorkout) -> Bool {
        let outdoor: Set<HKWorkoutActivityType> = [
            .hiking, .walking, .running, .cycling, .swimming, .other, .swimBikeRun
        ]
        if outdoor.contains(workout.workoutActivityType) { return true }
        return workout.workoutActivities.contains {
            outdoor.contains($0.workoutConfiguration.activityType)
        }
    }

    static func activities(from workout: HKWorkout) -> [PetehomeWorkoutActivity] {
        workout.workoutActivities.map { activity in
            let type = activity.workoutConfiguration.activityType
            let distanceType = distanceQuantityType(for: type)
            let distance = distanceType.flatMap {
                activity.statistics(for: $0)?.sumQuantity()?.doubleValue(for: .meter())
            }
            let calories = activity.statistics(for: HKQuantityType(.activeEnergyBurned))?
                .sumQuantity()?.doubleValue(for: .kilocalorie())
            let avgHR = activity.statistics(for: HKQuantityType(.heartRate))?
                .averageQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))

            return PetehomeWorkoutActivity(
                id: activity.uuid.uuidString,
                activityType: type.petehomeType,
                activityTypeRaw: Int(type.rawValue),
                startDate: activity.startDate.iso8601String,
                endDate: activity.endDate.iso8601String,
                duration: Int(activity.duration),
                distance: distance,
                activeCalories: calories,
                averageHeartRate: avgHR.map { Int($0) },
                zones: nativeHeartRateZones(from: activity)
            )
        }
    }

    static func nativeHeartRateZones(from workout: HKWorkout) -> [PetehomeHeartRateZone]? {
        extractNativeHeartRateZones(from: workout)
    }

    static func nativeHeartRateZones(from activity: HKWorkoutActivity) -> [PetehomeHeartRateZone]? {
        extractNativeHeartRateZones(from: activity)
    }

    static func nativeCyclingPowerZones(from workout: HKWorkout) -> [PetehomeHeartRateZone]? {
        extractNativeCyclingPowerZones(from: workout)
    }
}

extension HKWorkoutActivityType {
    var petehomeIsSwimBikeRun: Bool { self == .swimBikeRun }
}

// MARK: - Native zones (iOS / watchOS 27)

private func extractNativeHeartRateZones(from object: Any) -> [PetehomeHeartRateZone]? {
    if #available(iOS 27.0, watchOS 27.0, *) {
        if let workout = object as? HKWorkout {
            return mapZoneGroup(workout.zoneGroupsByType?[HKQuantityType(.heartRate)])
        }
        if let activity = object as? HKWorkoutActivity {
            return mapZoneGroup(activity.zoneGroupsByType?[HKQuantityType(.heartRate)])
        }
    }
    return nil
}

private func extractNativeCyclingPowerZones(from object: Any) -> [PetehomeHeartRateZone]? {
    if #available(iOS 27.0, watchOS 27.0, *) {
        if let workout = object as? HKWorkout {
            return mapZoneGroup(workout.zoneGroupsByType?[HKQuantityType(.cyclingPower)], unit: .watt())
        }
        if let activity = object as? HKWorkoutActivity {
            return mapZoneGroup(activity.zoneGroupsByType?[HKQuantityType(.cyclingPower)], unit: .watt())
        }
    }
    return nil
}

@available(iOS 27.0, watchOS 27.0, *)
private func mapZoneGroup(_ group: HKWorkoutZoneGroup?, unit: HKUnit = HKUnit.count().unitDivided(by: .minute())) -> [PetehomeHeartRateZone]? {
    guard let group else { return nil }

    let total = group.zoneDurations.reduce(0.0) { $0 + $1.duration }
    guard total > 0 else { return nil }

    return group.zoneDurations.map { item in
        let minValue = item.zone.minimum?.doubleValue(for: unit) ?? 0
        let maxValue = item.zone.maximum?.doubleValue(for: unit) ?? minValue
        return PetehomeHeartRateZone(
            name: "z\(item.zone.index + 1)",
            minBpm: Int(minValue.rounded()),
            maxBpm: Int(maxValue.rounded()),
            duration: Int(item.duration),
            percentage: Int((item.duration / total) * 100)
        )
    }
}

private func distanceQuantityType(for type: HKWorkoutActivityType) -> HKQuantityType? {
    switch type {
    case .cycling:
        return HKQuantityType(.distanceCycling)
    case .swimming:
        return HKQuantityType(.distanceSwimming)
    case .running, .walking, .hiking:
        return HKQuantityType(.distanceWalkingRunning)
    default:
        return HKQuantityType(.distanceWalkingRunning)
    }
}

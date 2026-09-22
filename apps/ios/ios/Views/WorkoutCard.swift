import SwiftUI
import HealthKit

struct WorkoutCard: View {
    let workout: HKWorkout
    let isSynced: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Activity icon
            Image(systemName: Self.icon(for: workout.workoutActivityType))
                .font(.system(size: 20))
                .foregroundStyle(iconColor)
                .frame(width: 36, height: 36)
                .background(iconColor.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            // Details
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(Self.name(for: workout.workoutActivityType))
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)

                    if isSynced {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(.green)
                    }
                }

                HStack(spacing: 8) {
                    // Duration
                    Label(Self.formattedDuration(workout.duration), systemImage: "clock")

                    // Active calories
                    if let calories = workout.statistics(for: .quantityType(forIdentifier: .activeEnergyBurned)!)?.sumQuantity()?.doubleValue(for: .kilocalorie()), calories > 0 {
                        Label("\(Int(calories)) cal", systemImage: "flame.fill")
                    }

                    // Distance (walking/running, cycling, or swimming)
                    if let distance = Self.displayDistanceMiles(for: workout), distance > 0.05 {
                        Label(String(format: "%.1f mi", distance), systemImage: "arrow.forward")
                    }
                }
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)

                // Time
                Text(workout.startDate, style: .time)
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(.tertiary)
            }

            Spacer()
        }
        .padding(.vertical, 6)
    }

    private static func displayDistanceMiles(for workout: HKWorkout) -> Double? {
        let meterToMile = 1.0 / 1609.344
        switch workout.workoutActivityType {
        case .swimming:
            if let meters = workout.statistics(for: .quantityType(forIdentifier: .distanceSwimming)!)?.sumQuantity()?.doubleValue(for: .meter()), meters > 0 {
                return meters * meterToMile
            }
        case .cycling:
            if let meters = workout.statistics(for: .quantityType(forIdentifier: .distanceCycling)!)?.sumQuantity()?.doubleValue(for: .meter()), meters > 0 {
                return meters * meterToMile
            }
        default:
            break
        }
        return workout.statistics(for: .quantityType(forIdentifier: .distanceWalkingRunning)!)?.sumQuantity()?.doubleValue(for: .mile())
    }

    private static func icon(for type: HKWorkoutActivityType) -> String {
        switch type {
        case .running:                                          return "figure.run"
        case .walking, .hiking:                                return "figure.walk"
        case .cycling:                                         return "figure.outdoor.cycle"
        case .swimming:                                        return "figure.pool.swim"
        case .functionalStrengthTraining,
             .traditionalStrengthTraining:                     return "dumbbell.fill"
        case .highIntensityIntervalTraining:                   return "bolt.fill"
        case .coreTraining:                                    return "figure.core.training"
        case .rowing:                                          return "figure.rowing"
        case .swimBikeRun:                                     return "figure.triathlon"
        default:                                               return "figure.mixed.cardio"
        }
    }

    private static func name(for type: HKWorkoutActivityType) -> String {
        switch type {
        case .running:                          return "Run"
        case .walking:                          return "Walk"
        case .hiking:                           return "Hike"
        case .cycling:                          return "Ride"
        case .swimming:                         return "Swim"
        case .functionalStrengthTraining:       return "Functional Strength"
        case .traditionalStrengthTraining:      return "Strength"
        case .highIntensityIntervalTraining:    return "HIIT"
        case .coreTraining:                     return "Core"
        case .rowing:                           return "Row"
        case .swimBikeRun:                      return "Triathlon"
        default:                                return "Workout"
        }
    }

    private static func formattedDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%d:%02d", m, s)
    }

    private var iconColor: Color {
        switch workout.workoutActivityType {
        case .running:
            return .green
        case .walking, .hiking:
            return .orange
        case .cycling:
            return .blue
        case .functionalStrengthTraining, .traditionalStrengthTraining:
            return .purple
        case .coreTraining:
            return .yellow
        case .highIntensityIntervalTraining:
            return .red
        case .rowing:
            return .cyan
        case .swimming:
            return .blue
        default:
            return .gray
        }
    }
}

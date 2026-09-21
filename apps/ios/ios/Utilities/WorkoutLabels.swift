import Foundation

/// Workout type display labels. Hiking displays as "Maple Walk" (dog walks).
enum WorkoutLabels {
    static func displayLabel(for workoutType: String) -> String {
        if workoutType == "hiking" {
            return "Maple Walk"
        }
        return defaultLabel(for: workoutType)
    }

    private static func defaultLabel(for workoutType: String) -> String {
        switch workoutType {
        case "running": return "Running"
        case "walking": return "Walking"
        case "cycling": return "Cycling"
        case "functionalStrengthTraining": return "Functional Strength"
        case "traditionalStrengthTraining": return "Strength Training"
        case "coreTraining": return "Core Training"
        case "highIntensityIntervalTraining": return "HIIT"
        case "rowing": return "Rowing"
        case "stairClimbing": return "Stair Climbing"
        case "elliptical": return "Elliptical"
        case "swimming": return "Swimming"
        case "yoga": return "Yoga"
        default: return "Workout"
        }
    }
}

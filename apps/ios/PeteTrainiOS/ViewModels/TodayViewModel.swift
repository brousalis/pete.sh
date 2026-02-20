import Foundation
import HealthKit
import Observation

@MainActor
@Observable
final class TodayViewModel {

    // MARK: - State

    var todayMetrics: PetehomeDailyMetrics?
    var recentWorkouts: [HKWorkout] = []
    var syncedWorkoutIDs: Set<String> = []
    var isLoading = false
    var error: String?

    // MARK: - Dependencies

    private let syncManager = HealthKitSyncManager.shared
    private let api = PetehomeAPI.shared

    // MARK: - Load Data

    func loadAll() async {
        isLoading = true
        error = nil

        async let metricsTask: () = loadTodayMetrics()
        async let workoutsTask: () = loadRecentWorkouts()
        async let syncedTask: () = loadSyncedIDs()

        _ = await (metricsTask, workoutsTask, syncedTask)

        isLoading = false
    }

    func loadTodayMetrics() async {
        do {
            todayMetrics = try await syncManager.queryDailyMetrics(for: Date())
        } catch {
            print("[TodayViewModel] Failed to load today metrics: \(error)")
        }
    }

    func loadRecentWorkouts() async {
        do {
            recentWorkouts = try await syncManager.fetchAllWorkouts(days: 14)
        } catch {
            self.error = error.localizedDescription
            print("[TodayViewModel] Failed to load workouts: \(error)")
        }
    }

    func loadSyncedIDs() async {
        do {
            syncedWorkoutIDs = try await api.getSyncedWorkoutIDs(limit: 200)
        } catch {
            print("[TodayViewModel] Failed to load synced IDs: \(error)")
        }
    }

    // MARK: - Helpers

    func isSynced(_ workout: HKWorkout) -> Bool {
        syncedWorkoutIDs.contains(workout.uuid.uuidString)
    }

    /// Group workouts by date (most recent first)
    var workoutsByDate: [(date: Date, workouts: [HKWorkout])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: recentWorkouts) { workout in
            calendar.startOfDay(for: workout.startDate)
        }
        return grouped
            .sorted { $0.key > $1.key }
            .map { (date: $0.key, workouts: $0.value.sorted { $0.startDate > $1.startDate }) }
    }

    // MARK: - Workout Display Helpers

    static func icon(for activityType: HKWorkoutActivityType) -> String {
        switch activityType {
        case .running:
            return "figure.run"
        case .walking:
            return "figure.walk"
        case .hiking:
            return "figure.hiking"
        case .cycling:
            return "figure.outdoor.cycle"
        case .functionalStrengthTraining, .traditionalStrengthTraining:
            return "dumbbell.fill"
        case .coreTraining:
            return "figure.core.training"
        case .highIntensityIntervalTraining:
            return "bolt.heart.fill"
        case .rowing:
            return "figure.rower"
        case .stairClimbing:
            return "figure.stairs"
        case .elliptical:
            return "figure.elliptical"
        case .swimming:
            return "figure.pool.swim"
        case .yoga:
            return "figure.yoga"
        default:
            return "figure.mixed.cardio"
        }
    }

    static func name(for activityType: HKWorkoutActivityType) -> String {
        switch activityType {
        case .running:
            return "Running"
        case .walking:
            return "Walking"
        case .hiking:
            return "Hiking"
        case .cycling:
            return "Cycling"
        case .functionalStrengthTraining:
            return "Functional Strength"
        case .traditionalStrengthTraining:
            return "Strength Training"
        case .coreTraining:
            return "Core Training"
        case .highIntensityIntervalTraining:
            return "HIIT"
        case .rowing:
            return "Rowing"
        case .stairClimbing:
            return "Stair Climbing"
        case .elliptical:
            return "Elliptical"
        case .swimming:
            return "Swimming"
        case .yoga:
            return "Yoga"
        default:
            return "Workout"
        }
    }

    static func formattedDuration(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        if minutes >= 60 {
            let hours = minutes / 60
            let mins = minutes % 60
            return "\(hours)h \(mins)m"
        }
        return "\(minutes)m"
    }

    static func formattedCalories(_ calories: Double) -> String {
        return "\(Int(calories))"
    }

    // MARK: - Activity Ring Progress

    var moveProgress: Double {
        guard let metrics = todayMetrics, let goal = metrics.moveGoal, goal > 0 else { return 0 }
        return metrics.activeCalories / Double(goal)
    }

    var exerciseProgress: Double {
        guard let metrics = todayMetrics, let goal = metrics.exerciseGoal, goal > 0 else { return 0 }
        return Double(metrics.exerciseMinutes) / Double(goal)
    }

    var standProgress: Double {
        guard let metrics = todayMetrics, let goal = metrics.standGoal, goal > 0 else { return 0 }
        return Double(metrics.standHours) / Double(goal)
    }
}

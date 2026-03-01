import Foundation
import Observation

@MainActor
@Observable
final class ActivityListViewModel {
    var workouts: [ActivityWorkoutSummary] = []
    var isLoading = false
    var error: String?

    private let api = PetehomeAPI.shared

    var workoutsByDate: [(date: Date, workouts: [ActivityWorkoutSummary])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: workouts) { workout -> Date in
            guard let date = workout.startDate.iso8601Date else { return Date() }
            return calendar.startOfDay(for: date)
        }
        return grouped
            .sorted { $0.key > $1.key }
            .map { (date: $0.key, workouts: $0.value.sorted { (w1, w2) in
                (w1.startDate.iso8601Date ?? .distantPast) > (w2.startDate.iso8601Date ?? .distantPast)
            }) }
    }

    func loadWorkouts() async {
        isLoading = true
        error = nil

        do {
            workouts = try await api.fetchWorkouts(limit: 50)
        } catch let err as PetehomeAPIError {
            error = err.localizedDescription
        } catch {
            error = error.localizedDescription
            print("[ActivityListViewModel] Failed to load workouts: \(error)")
        }

        isLoading = false
    }
}

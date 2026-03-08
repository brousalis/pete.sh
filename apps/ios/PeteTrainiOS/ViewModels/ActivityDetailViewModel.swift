import Foundation
import Observation

@MainActor
@Observable
final class ActivityDetailViewModel {
    var detailData: WorkoutDetailData?
    var isLoading = false
    var error: String?
    var is404 = false

    private let api = PetehomeAPI.shared
    private(set) var workoutId: String

    init(workoutId: String) {
        self.workoutId = workoutId
    }

    var workout: ActivityWorkoutDetail? { detailData?.workout }
    var analytics: EnhancedWorkoutAnalyticsDetail? { detailData?.analytics }
    var route: RouteDetail? { detailData?.route }
    var hrZonesConfig: HrZonesConfigDetail? { detailData?.hrZonesConfig }

    var hasAnalytics: Bool { analytics != nil }
    var hasRoute: Bool {
        guard let route = detailData?.route else { return false }
        return (route.samples?.count ?? 0) >= 2
    }
    var hasEvents: Bool {
        (detailData?.workoutEvents.count ?? 0) > 0
    }
    var hasRunningDynamics: Bool {
        guard let w = workout else { return false }
        return w.workoutType == "running" && (
            w.strideLengthAvg != nil ||
            w.runningPowerAvg != nil ||
            w.groundContactTimeAvg != nil ||
            w.verticalOscillationAvg != nil
        )
    }

    var isRunning: Bool { workout?.workoutType == "running" ?? false }
    var isCycling: Bool { workout?.workoutType == "cycling" ?? false }
    var isOutdoor: Bool {
        guard let w = workout else { return false }
        if w.isIndoor == false { return true }
        if w.isIndoor == true { return false }
        return hasRoute
    }
    var isIndoor: Bool {
        guard let w = workout else { return false }
        if w.isIndoor == true { return true }
        if w.isIndoor == false { return false }
        return isRunning && !hasRoute
    }

    var workoutLabel: String {
        guard let w = workout else { return "Workout" }
        if isRunning {
            if isOutdoor { return "Outdoor Run" }
            if isIndoor { return "Indoor Run" }
            return "Run"
        }
        return WorkoutLabels.displayLabel(for: w.workoutType)
    }

    func loadDetail() async {
        isLoading = true
        error = nil
        is404 = false

        do {
            detailData = try await api.fetchWorkoutDetail(id: workoutId)
        } catch PetehomeAPIError.httpError(404, _) {
            is404 = true
            error = "Workout not found. It may not be synced yet."
        } catch let err as PetehomeAPIError {
            error = err.localizedDescription
        } catch {
            self.error = error.localizedDescription
            print("[ActivityDetailViewModel] Failed to load workout: \(error)")
        }

        isLoading = false
    }
}

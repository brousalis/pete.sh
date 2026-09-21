import Foundation
import HealthKit
import WorkoutKit

/// Schedules PeteCoach sessions into the Apple Watch Workout app.
///
/// Without this, a structured session is a description the athlete has to
/// remember mid-interval. With it, the watch runs the intervals and alerts on
/// heart rate, pace or cadence — which matters most for cycling, where the
/// cadence floor is an injury guardrail rather than a preference.
///
/// Requires iOS 18+/watchOS 11+ for `WorkoutScheduler`. The app targets
/// iOS 26.1, so the API is available; availability is still checked so an
/// older install degrades to the in-app session list rather than crashing.
@MainActor
@available(iOS 18.0, *)
final class CoachWorkoutScheduler {

    static let shared = CoachWorkoutScheduler()

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.waitsForConnectivity = true
        self.session = URLSession(configuration: configuration)

        self.decoder = JSONDecoder()
    }

    // MARK: - Public

    /// Pull the coming week's sessions and schedule them.
    @discardableResult
    func syncScheduledWorkouts() async -> SyncOutcome {
        guard await requestAuthorization() else {
            return SyncOutcome(scheduled: 0, unsupported: 0, failed: 0, error: "Scheduling not authorized")
        }

        do {
            let plan = try await fetchPlan()
            var results: [ScheduleResult] = []

            // Replace the whole schedule rather than diffing: the plan is the
            // source of truth, and a downgraded session must not linger on the
            // watch after the guardrails removed it.
            try await clearExisting()

            for workout in plan.workouts {
                guard let date = Self.scheduleDate(for: workout.date) else {
                    results.append(ScheduleResult(sessionId: workout.sessionId, state: "failed"))
                    continue
                }

                guard let custom = Self.buildWorkout(from: workout) else {
                    results.append(ScheduleResult(sessionId: workout.sessionId, state: "unsupported"))
                    continue
                }

                do {
                    let workoutPlan = WorkoutPlan(.custom(custom))
                    try await WorkoutScheduler.shared.schedule(workoutPlan, at: date)
                    results.append(ScheduleResult(sessionId: workout.sessionId, state: "scheduled"))
                } catch {
                    log("Failed to schedule \(workout.displayName): \(error.localizedDescription)")
                    results.append(ScheduleResult(sessionId: workout.sessionId, state: "failed"))
                }
            }

            await reportResults(results)

            return SyncOutcome(
                scheduled: results.filter { $0.state == "scheduled" }.count,
                unsupported: results.filter { $0.state == "unsupported" }.count,
                failed: results.filter { $0.state == "failed" }.count,
                error: nil
            )
        } catch {
            log("Sync failed: \(error.localizedDescription)")
            return SyncOutcome(scheduled: 0, unsupported: 0, failed: 0, error: error.localizedDescription)
        }
    }

    // MARK: - Authorization

    private func requestAuthorization() async -> Bool {
        let state = await WorkoutScheduler.shared.authorizationState
        if state == .authorized { return true }

        let requested = await WorkoutScheduler.shared.requestAuthorization()
        return requested == .authorized
    }

    private func clearExisting() async throws {
        let scheduled = await WorkoutScheduler.shared.scheduledWorkouts
        for workout in scheduled {
            await WorkoutScheduler.shared.remove(workout.plan, at: workout.date)
        }
    }

    // MARK: - Networking

    private func fetchPlan() async throws -> CoachWorkoutPlan {
        var components = URLComponents(
            url: URL(string: KeychainHelper.serverURL)!.appendingPathComponent("api/coach/watch/workouts"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "days", value: "7")]

        guard let url = components?.url else { throw SchedulerError.badURL }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(KeychainHelper.coachAPIKey)", forHTTPHeaderField: "Authorization")
        request.setValue("PeteTrain-iOS/1.0", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw SchedulerError.server((response as? HTTPURLResponse)?.statusCode ?? -1)
        }

        let envelope = try decoder.decode(APIEnvelope<CoachWorkoutPlan>.self, from: data)
        guard let plan = envelope.data else { throw SchedulerError.emptyResponse }
        return plan
    }

    private func reportResults(_ results: [ScheduleResult]) async {
        guard !results.isEmpty else { return }

        let url = URL(string: KeychainHelper.serverURL)!
            .appendingPathComponent("api/coach/watch/workouts")

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(KeychainHelper.coachAPIKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(["results": results])

        _ = try? await session.data(for: request)
    }

    // MARK: - Workout construction

    /// Sessions are scheduled at 05:00 local, before the earliest realistic
    /// start. WorkoutKit surfaces a scheduled workout from its time onward,
    /// so an early anchor keeps it visible all day.
    private static func scheduleDate(for isoDate: String) -> DateComponents? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "America/Chicago")

        guard let day = formatter.date(from: isoDate) else { return nil }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Chicago") ?? .current

        var components = calendar.dateComponents([.year, .month, .day], from: day)
        components.hour = 5
        components.minute = 0
        components.timeZone = calendar.timeZone

        return components
    }

    private static func buildWorkout(from workout: CoachWorkout) -> CustomWorkout? {
        guard let activity = Self.activityType(for: workout.activityType) else { return nil }

        let location: HKWorkoutSessionLocationType = {
            switch workout.location {
            case "indoor", "pool": return .indoor
            case "outdoor": return .outdoor
            default: return .unknown
            }
        }()

        var warmup: WorkoutStep?
        var blocks: [IntervalBlock] = []
        var cooldown: WorkoutStep?

        // The server flattens repeats, so each step here is one execution.
        // They are regrouped into a single block: WorkoutKit renders a flat
        // list correctly and this avoids guessing at repeat boundaries.
        var workSteps: [IntervalStep] = []

        for step in workout.steps {
            switch step.kind {
            case "warmup":
                warmup = Self.buildStep(step)
            case "cooldown":
                cooldown = Self.buildStep(step)
            default:
                let purpose: IntervalStep.Purpose = step.kind == "recovery" ? .recovery : .work
                workSteps.append(IntervalStep(purpose, step: Self.buildStep(step)))
            }
        }

        if !workSteps.isEmpty {
            blocks.append(IntervalBlock(steps: workSteps, iterations: 1))
        }

        // A workout with nothing but a warm-up is not worth scheduling.
        guard !blocks.isEmpty || warmup != nil else { return nil }

        return CustomWorkout(
            activity: activity,
            location: location,
            displayName: workout.displayName,
            warmup: warmup,
            blocks: blocks,
            cooldown: cooldown
        )
    }

    private static func buildStep(_ step: CoachStep) -> WorkoutStep {
        var workoutStep: WorkoutStep

        switch step.goal?.type {
        case "time":
            let seconds = step.goal?.value ?? 300
            workoutStep = WorkoutStep(goal: .time(seconds, .seconds))
        case "distance":
            let value = step.goal?.value ?? 1000
            let unit: UnitLength = step.goal?.unit == "yards" ? .yards : .meters
            workoutStep = WorkoutStep(goal: .distance(value, unit))
        default:
            workoutStep = WorkoutStep(goal: .open)
        }

        if let alert = Self.buildAlert(step.alert) {
            workoutStep.alert = alert
        }

        if let label = step.label {
            workoutStep.displayName = label
        }

        return workoutStep
    }

    private static func buildAlert(_ alert: CoachAlert?) -> (any WorkoutAlert)? {
        guard let alert else { return nil }

        switch alert.type {
        case "heartRate":
            if let zone = alert.zone {
                return HeartRateZoneAlert(zone: zone)
            }
            if let min = alert.min, let max = alert.max {
                return HeartRateRangeAlert(
                    target: Int(min)...Int(max)
                )
            }
            return nil

        case "cadence":
            if let min = alert.min, let max = alert.max {
                return CadenceRangeAlert(target: Int(min)...Int(max))
            }
            return nil

        case "power":
            if let min = alert.min, let max = alert.max {
                return PowerRangeAlert(
                    target: Measurement(value: min, unit: UnitPower.watts)
                        ...Measurement(value: max, unit: UnitPower.watts)
                )
            }
            return nil

        default:
            return nil
        }
    }

    private static func activityType(for name: String) -> HKWorkoutActivityType? {
        switch name {
        case "running": return .running
        case "cycling": return .cycling
        case "swimming": return .swimming
        case "walking": return .walking
        case "swimBikeRun", "brick": return .swimBikeRun
        case "functionalStrengthTraining": return .functionalStrengthTraining
        case "traditionalStrengthTraining": return .traditionalStrengthTraining
        case "highIntensityIntervalTraining": return .highIntensityIntervalTraining
        case "rowing": return .rowing
        case "elliptical": return .elliptical
        default: return .other
        }
    }

    private func log(_ message: String) {
        print("[CoachWorkoutScheduler] \(message)")
    }
}

// MARK: - Models

struct SyncOutcome {
    let scheduled: Int
    let unsupported: Int
    let failed: Int
    let error: String?

    var summary: String {
        if let error { return error }
        if scheduled == 0 && unsupported == 0 && failed == 0 { return "Nothing to schedule" }
        var parts = ["\(scheduled) scheduled"]
        if unsupported > 0 { parts.append("\(unsupported) unsupported") }
        if failed > 0 { parts.append("\(failed) failed") }
        return parts.joined(separator: ", ")
    }
}

private struct APIEnvelope<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
}

private struct CoachWorkoutPlan: Decodable {
    let generatedAt: String
    let workouts: [CoachWorkout]
}

private struct CoachWorkout: Decodable {
    let sessionId: String
    let date: String
    let activityType: String
    let location: String
    let displayName: String
    let poolLengthMeters: Double?
    let steps: [CoachStep]
    let syncState: String?
}

private struct CoachStep: Decodable {
    let kind: String
    let label: String?
    let goal: CoachGoal?
    let alert: CoachAlert?
}

private struct CoachGoal: Decodable {
    let type: String
    let value: Double?
    let unit: String?
}

private struct CoachAlert: Decodable {
    let type: String
    let min: Double?
    let max: Double?
    let zone: Int?
}

private struct ScheduleResult: Encodable {
    let sessionId: String
    let state: String
}

private enum SchedulerError: LocalizedError {
    case badURL
    case server(Int)
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .badURL: return "Invalid server URL"
        case .server(let code): return "Server returned \(code)"
        case .emptyResponse: return "Empty response from the coach"
        }
    }
}

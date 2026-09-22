import Foundation
import Observation

@MainActor
@Observable
final class TodayViewModel {

    var today: CoachTodayData?
    var isLoading = false
    var errorMessage: String?
    var sessionActionInFlight: String?

    /// PT blocks toggled locally before check-in saves them.
    var ptCompletedIds: Set<String> = []

    private let api = PetehomeAPI.shared
    private static let cacheKey = "coachTodayCache"

    func load(refresh: Bool = true) async {
        if refresh {
            isLoading = true
            errorMessage = nil
        }

        do {
            let payload = try await api.fetchCoachToday()
            today = payload
            syncPtSelection(from: payload)
            cache(payload)
        } catch {
            errorMessage = error.localizedDescription
            if today == nil, let cached = loadCached() {
                today = cached
                syncPtSelection(from: cached)
            }
            print("[TodayViewModel] load failed: \(error)")
        }

        isLoading = false
    }

    func markSession(id: String, status: String) async {
        sessionActionInFlight = id
        defer { sessionActionInFlight = nil }

        do {
            _ = try await api.patchSession(id: id, status: status)
            await load(refresh: false)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func togglePtProtocol(_ protocolId: String) {
        if ptCompletedIds.contains(protocolId) {
            ptCompletedIds.remove(protocolId)
        } else {
            ptCompletedIds.insert(protocolId)
        }
    }

    func submitCheckin(_ request: CoachCheckInRequest) async throws -> CoachCheckInResult {
        var body = request
        if body.ptCompleted == nil, !ptCompletedIds.isEmpty {
            body.ptCompleted = ptCompletedIds.map { CoachPtCompletion(protocolId: $0, skipped: false) }
        }
        let result = try await api.submitCheckin(body)
        await load(refresh: false)
        return result
    }

    var readinessBlocked: Bool {
        guard let readiness = today?.readiness else { return false }
        if readiness.level == "blocked" { return true }
        return readiness.flags.contains { $0.lowercased().contains("block") }
    }

    private func syncPtSelection(from payload: CoachTodayData) {
        ptCompletedIds = Set(payload.ptProtocols.filter(\.completed).map(\.id))
    }

    private func cache(_ payload: CoachTodayData) {
        guard let data = try? JSONEncoder().encode(payload) else { return }
        UserDefaults.standard.set(data, forKey: Self.cacheKey)
    }

    private func loadCached() -> CoachTodayData? {
        guard let data = UserDefaults.standard.data(forKey: Self.cacheKey) else { return nil }
        return try? JSONDecoder().decode(CoachTodayData.self, from: data)
    }
}






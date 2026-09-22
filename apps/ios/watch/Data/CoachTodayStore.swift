import Foundation
import Observation
import WidgetKit

/// Loads and caches today's coach plan for the watch companion.
///
/// Source of truth is `GET /api/coach/watch/today`. Cache is served immediately
/// on launch so the wrist is usable offline; a network refresh runs behind it.
@MainActor
@Observable
final class CoachTodayStore {

    static let shared = CoachTodayStore()

    // MARK: - State

    private(set) var payload: CoachTodayPayload?
    private(set) var lastUpdated: Date?
    private(set) var lastError: String?
    private(set) var isLoading = false

    /// True when the last successful fetch is older than 24 hours.
    var isStale: Bool {
        guard let lastUpdated else { return payload != nil }
        return Date().timeIntervalSince(lastUpdated) > 24 * 60 * 60
    }

    var hasData: Bool { payload != nil }

    // MARK: - Private

    private let api = PetehomeAPI.shared
    private static let cacheKey = "coachTodayPayloadCache"
    private static let cacheDateKey = "coachTodayPayloadCacheDate"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: SharedCoachTodayData.appGroupIdentifier)
    }

    private init() {}

    // MARK: - Public

    /// Load cache immediately, then refresh from the network.
    func load() async {
        if let cached = loadCache() {
            self.payload = cached.payload
            self.lastUpdated = cached.updatedAt
            print("📋 CoachTodayStore: loaded cache for \(cached.payload.date)")
        }
        await refresh()
    }

    /// Fetch from the API. On failure, keep the existing cache.
    func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        lastError = nil

        do {
            let fresh = try await api.fetchCoachToday()
            let now = Date()
            self.payload = fresh
            self.lastUpdated = now
            saveCache(fresh, updatedAt: now)
            publishWidgetSnapshot(from: fresh, updatedAt: now)
            print("📋 CoachTodayStore: refreshed \(fresh.sessions.count) sessions, readiness \(fresh.readiness?.score ?? -1)")
        } catch {
            self.lastError = error.localizedDescription
            print("⚠️ CoachTodayStore: refresh failed — \(error.localizedDescription)")
        }

        isLoading = false
    }

    // MARK: - Cache

    private struct CachedPayload: Codable {
        let payload: CoachTodayPayload
        let updatedAt: Date
    }

    private func loadCache() -> CachedPayload? {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: Self.cacheKey) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(CachedPayload.self, from: data)
        } catch {
            print("⚠️ CoachTodayStore: cache decode failed — \(error)")
            return nil
        }
    }

    private func saveCache(_ payload: CoachTodayPayload, updatedAt: Date) {
        guard let defaults = sharedDefaults else { return }
        let cached = CachedPayload(payload: payload, updatedAt: updatedAt)
        do {
            let data = try JSONEncoder().encode(cached)
            defaults.set(data, forKey: Self.cacheKey)
            defaults.set(updatedAt.timeIntervalSince1970, forKey: Self.cacheDateKey)
        } catch {
            print("⚠️ CoachTodayStore: cache encode failed — \(error)")
        }
    }

    private func publishWidgetSnapshot(from payload: CoachTodayPayload, updatedAt: Date) {
        let snapshot = SharedCoachTodayData.snapshot(from: payload, updatedAt: updatedAt)
        snapshot.save()
        SharedCoachTodayData.refreshWidget()
    }
}

extension SharedCoachTodayData {
    /// Build a complication snapshot from the full coach today payload.
    static func snapshot(from payload: CoachTodayPayload, updatedAt: Date = Date()) -> SharedCoachTodayData {
        let active = payload.sessions.filter { !$0.blocked }
        let next = active.first(where: { !$0.completed }) ?? active.first
        return SharedCoachTodayData(
            date: payload.date,
            readinessScore: payload.readiness?.score,
            readinessBlocked: payload.readiness?.blocked ?? false,
            sessionCount: payload.sessions.count,
            completedCount: payload.sessions.filter(\.completed).count,
            nextSessionTitle: next?.title,
            nextSessionSport: next?.sport,
            nextSessionTarget: next?.target,
            isRestDay: payload.sessions.isEmpty,
            lastUpdated: updatedAt
        )
    }
}

import Foundation
import Observation

/// Central manager for fetching, caching, and serving workout data
/// Orchestrates API calls, caching, and mapping to watch app models
@MainActor
@Observable
final class WorkoutDataManager {

    // MARK: - Singleton

    static let shared = WorkoutDataManager()

    // MARK: - State

    /// Current workout days (from cache, API, or fallback)
    private(set) var days: [Day] = []

    /// Current version info (from API)
    private(set) var versionInfo: APIVersionInfo?

    /// Whether a fetch is in progress
    var isLoading: Bool = false

    /// Last error message, if any
    var lastError: String?

    /// Source of current data
    private(set) var dataSource: DataSource = .fallback

    /// Today's coach sessions. Independent of the gym-routine cache.
    private(set) var coachToday: CoachTodayPayload?

    enum DataSource: String {
        case api = "API"
        case cache = "Cache"
        case fallback = "Bundled"
    }

    /// Formatted version string for display
    var versionString: String {
        guard let version = versionInfo else {
            return dataSource == .fallback ? "Bundled" : "Unknown"
        }
        return "v\(version.number)"
    }

    // MARK: - Private

    private let api = PetehomeAPI.shared
    private let cache = WorkoutDefinitionsCache.shared

    // MARK: - Init

    private init() {
        // Start with empty array - API data will be loaded async
        days = []
        dataSource = .fallback
    }

    // MARK: - Public API

    /// Load workouts from cache, then refresh in the background.
    ///
    /// The cache previously never expired and was only refreshed manually,
    /// which meant the watch could show a routine that the coach had already
    /// changed. Now the cache is shown immediately (so the watch is usable
    /// offline and instantly) and a refresh runs behind it. With petehome
    /// adjusting the plan daily, a stale watch is worse than a slow one.
    func loadWorkouts() async {
        print("📚 WorkoutDataManager: Loading workouts from cache...")

        var servedFromCache = false

        if let cached = await cache.load() {
            let mappedDays = WorkoutMapper.mapToDays(cached.definitions)
            if !mappedDays.isEmpty {
                self.days = mappedDays
                self.versionInfo = cached.version
                self.dataSource = .cache
                servedFromCache = true
                print("📚 WorkoutDataManager: Loaded \(mappedDays.count) days from cache (\(versionString))")
            }
        }

        if servedFromCache {
            // Refresh behind the cached view; a failure leaves the cache in
            // place rather than blanking the screen.
            Task { await refreshFromAPI() }
            return
        }

        print("📚 WorkoutDataManager: No cached routine found, fetching from API...")
        await refreshFromAPI()
    }

    /// Force refresh from API
    func refreshFromAPI() async {
        guard !isLoading else {
            print("📚 WorkoutDataManager: Already loading, skipping refresh")
            return
        }

        isLoading = true
        lastError = nil

        do {
            print("📚 WorkoutDataManager: Fetching from API...")
            let result = try await api.fetchWorkoutDefinitions()

            // Map API models to watch models
            let mappedDays = WorkoutMapper.mapToDays(result.definitions)

            if mappedDays.isEmpty {
                print("⚠️ WorkoutDataManager: API returned empty workouts")
                lastError = "No workouts in API response"
            } else {
                // Update state
                self.days = mappedDays
                self.versionInfo = result.version
                self.dataSource = .api
                print("📚 WorkoutDataManager: Loaded \(mappedDays.count) days from API (\(versionString))")

                // Save to cache
                await cache.save(result.definitions, version: result.version)

                // Update notification timing from routine's training time
                if let trainingTime = result.trainingTime {
                    NotificationManager.shared.updateFromTrainingTime(trainingTime)
                }
            }

        } catch {
            print("❌ WorkoutDataManager: API fetch failed - \(error.localizedDescription)")
            lastError = error.localizedDescription
            // Keep using cached data if available, otherwise days stays empty
        }

        isLoading = false

        await refreshCoachToday()
    }

    func refreshCoachToday() async {
        do {
            let payload = try await api.fetchCoachToday()
            self.coachToday = payload
            print("📚 WorkoutDataManager: Coach today \(payload.sessions.count) sessions, readiness \(payload.readiness?.score ?? -1)")
        } catch {
            print("⚠️ WorkoutDataManager: Coach today failed — \(error.localizedDescription)")
        }
    }

    /// Get a specific day by number (1-7)
    /// Returns nil if not found (API data not loaded yet)
    func day(for number: Int) -> Day? {
        return days.first(where: { $0.id == number })
    }

    /// Clear cache and reset state
    func clearCache() async {
        await cache.clear()
        days = []
        versionInfo = nil
        dataSource = .fallback
        lastError = nil
        print("📚 WorkoutDataManager: Cache cleared")
    }

    /// Get status description for UI
    var statusDescription: String {
        if isLoading {
            return "Loading..."
        }
        if let error = lastError {
            return "Error: \(error)"
        }
        let source = dataSource.rawValue
        if let version = versionInfo {
            return "\(days.count) workouts v\(version.number) (\(source))"
        }
        return "\(days.count) workouts (\(source))"
    }
}

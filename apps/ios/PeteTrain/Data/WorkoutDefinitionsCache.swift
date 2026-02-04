import Foundation

/// Manages local caching of workout definitions for offline use
actor WorkoutDefinitionsCache {

    // MARK: - Singleton

    static let shared = WorkoutDefinitionsCache()

    // MARK: - Constants

    private let cacheFileName = "workout_definitions_cache.json"
    private let maxCacheAge: TimeInterval = 24 * 60 * 60  // 24 hours

    // MARK: - Cache Structure

    private struct CacheContainer: Codable {
        let timestamp: Date
        let definitions: [String: APIWorkout]
        let version: APIVersionInfo?
    }

    /// Result type for cache load
    struct CacheResult {
        let definitions: [String: APIWorkout]
        let version: APIVersionInfo?
    }

    // MARK: - File Management

    private var cacheURL: URL {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return documents.appendingPathComponent(cacheFileName)
    }

    // MARK: - Public API

    /// Load cached workout definitions
    /// - Returns: CacheResult with definitions and version if available and not expired, nil otherwise
    func load() -> CacheResult? {
        guard FileManager.default.fileExists(atPath: cacheURL.path) else {
            print("📦 Cache: No cache file exists")
            return nil
        }

        do {
            let data = try Data(contentsOf: cacheURL)
            let container = try JSONDecoder().decode(CacheContainer.self, from: data)

            // Check expiration
            let age = Date().timeIntervalSince(container.timestamp)
            if age > maxCacheAge {
                print("📦 Cache: Expired (age: \(Int(age / 3600))h)")
                return nil
            }

            let versionStr = container.version.map { "v\($0.number)" } ?? "unknown"
            print("📦 Cache: Loaded \(container.definitions.count) workouts \(versionStr) (age: \(Int(age / 60))m)")
            return CacheResult(definitions: container.definitions, version: container.version)

        } catch {
            print("📦 Cache: Failed to load - \(error.localizedDescription)")
            return nil
        }
    }

    /// Save workout definitions to cache
    /// - Parameters:
    ///   - definitions: The workout definitions to cache
    ///   - version: Optional version info
    func save(_ definitions: [String: APIWorkout], version: APIVersionInfo? = nil) {
        let container = CacheContainer(
            timestamp: Date(),
            definitions: definitions,
            version: version
        )

        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(container)
            try data.write(to: cacheURL, options: .atomic)
            let versionStr = version.map { "v\($0.number)" } ?? ""
            print("📦 Cache: Saved \(definitions.count) workouts \(versionStr)")
        } catch {
            print("📦 Cache: Failed to save - \(error.localizedDescription)")
        }
    }

    /// Check if cache exists and is valid (not expired)
    var isValid: Bool {
        guard FileManager.default.fileExists(atPath: cacheURL.path) else {
            return false
        }

        do {
            let data = try Data(contentsOf: cacheURL)
            let container = try JSONDecoder().decode(CacheContainer.self, from: data)
            let age = Date().timeIntervalSince(container.timestamp)
            return age <= maxCacheAge
        } catch {
            return false
        }
    }

    /// Get cache age in seconds, or nil if no cache exists
    var cacheAge: TimeInterval? {
        guard FileManager.default.fileExists(atPath: cacheURL.path) else {
            return nil
        }

        do {
            let data = try Data(contentsOf: cacheURL)
            let container = try JSONDecoder().decode(CacheContainer.self, from: data)
            return Date().timeIntervalSince(container.timestamp)
        } catch {
            return nil
        }
    }

    /// Clear the cache
    func clear() {
        do {
            if FileManager.default.fileExists(atPath: cacheURL.path) {
                try FileManager.default.removeItem(at: cacheURL)
                print("📦 Cache: Cleared")
            }
        } catch {
            print("📦 Cache: Failed to clear - \(error.localizedDescription)")
        }
    }
}

import Foundation

/// API client for syncing data to Petehome server
@MainActor
final class PetehomeAPI {
    
    static let shared = PetehomeAPI()
    
    // MARK: - Configuration (hardcoded)

    private let baseURL = URL(string: KeychainHelper.serverURL)!
    private let apiKey = KeychainHelper.apiKey

    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    // MARK: - Init

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
    }

    // MARK: - Debug Logging

    /// Enable verbose logging for debugging API issues
    var debugLoggingEnabled: Bool = true

    // MARK: - Public API

    /// Always configured with hardcoded values
    var isConfigured: Bool { true }

    /// Get current configuration for debugging
    var configurationSummary: String {
        let keyPreview = "\(apiKey.prefix(8))...\(apiKey.suffix(4))"
        return "URL: \(baseURL.absoluteString), Key: \(keyPreview)"
    }

    /// Sync a single workout to Petehome
    func syncWorkout(_ payload: WorkoutPayload) async throws {

        // Build URL without leading slash to avoid double-slash
        let url = baseURL.appendingPathComponent("api/apple-health/workout")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("PeteTrain/1.0", forHTTPHeaderField: "User-Agent")

        do {
            let body = try encoder.encode(payload)
            request.httpBody = body

            if debugLoggingEnabled {
                logRequest(request, body: body)
            }
        } catch {
            print("❌ Failed to encode workout payload: \(error)")
            throw PetehomeAPIError.encodingFailed
        }

        let (data, response) = try await session.data(for: request)

        if debugLoggingEnabled {
            logResponse(response, data: data)
        }

        try handleResponse(response, data: data)

        print("✅ Workout synced to Petehome: \(payload.workout.id)")
    }
    
    /// Sync daily health metrics to Petehome
    func syncDailyMetrics(_ metrics: PetehomeDailyMetrics) async throws {
        let url = baseURL.appendingPathComponent("api/apple-health/daily")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("PeteTrain/1.0", forHTTPHeaderField: "User-Agent")

        let payload = DailyMetricsPayload(metrics: metrics)

        do {
            let body = try encoder.encode(payload)
            request.httpBody = body

            if debugLoggingEnabled {
                logRequest(request, body: body)
            }
        } catch {
            print("❌ Failed to encode daily metrics: \(error)")
            throw PetehomeAPIError.encodingFailed
        }

        let (data, response) = try await session.data(for: request)

        if debugLoggingEnabled {
            logResponse(response, data: data)
        }

        try handleResponse(response, data: data)

        print("✅ Daily metrics synced to Petehome: \(metrics.date)")
    }
    
    /// Batch sync multiple workouts and daily metrics
    func batchSync(
        workouts: [AppleHealthWorkout],
        dailyMetrics: [PetehomeDailyMetrics],
        lastSyncTimestamp: Date? = nil
    ) async throws -> BatchSyncResult {
        let url = baseURL.appendingPathComponent("api/apple-health/sync")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("PeteTrain/1.0", forHTTPHeaderField: "User-Agent")

        let payload = BatchSyncPayload(
            workouts: workouts,
            dailyMetrics: dailyMetrics,
            lastSyncTimestamp: lastSyncTimestamp?.iso8601String
        )

        do {
            let body = try encoder.encode(payload)
            request.httpBody = body

            if debugLoggingEnabled {
                logRequest(request, body: body)
            }
        } catch {
            print("❌ Failed to encode batch sync payload: \(error)")
            throw PetehomeAPIError.encodingFailed
        }

        let (data, response) = try await session.data(for: request)

        if debugLoggingEnabled {
            logResponse(response, data: data)
        }

        try handleResponse(response, data: data)

        let result = try decoder.decode(BatchSyncResult.self, from: data)

        print("✅ Batch sync complete: \(result.data?.workoutsSaved ?? 0) workouts, \(result.data?.dailyMetricsSaved ?? 0) daily metrics")

        return result
    }
    
    /// Get list of already-synced workout IDs to avoid duplicates
    func getSyncedWorkoutIDs(limit: Int = 50) async throws -> Set<String> {
        var components = URLComponents(url: baseURL.appendingPathComponent("api/apple-health/workout"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "limit", value: String(limit))]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("PeteTrain/1.0", forHTTPHeaderField: "User-Agent")

        if debugLoggingEnabled {
            logRequest(request, body: nil)
        }

        let (data, response) = try await session.data(for: request)

        if debugLoggingEnabled {
            logResponse(response, data: data)
        }

        try handleResponse(response, data: data)

        let listResponse = try decoder.decode(WorkoutsListResponse.self, from: data)

        return Set(listResponse.data.map { $0.healthkit_id })
    }

    /// Result type for workout definitions fetch
    struct WorkoutDefinitionsResult {
        let definitions: [String: APIWorkout]
        let version: APIVersionInfo?
    }

    /// Fetch workout definitions from the API
    /// - Parameter routineId: The routine ID to fetch (defaults to "climber-physique")
    /// - Returns: WorkoutDefinitionsResult containing definitions and version info
    func fetchWorkoutDefinitions(routineId: String = "climber-physique") async throws -> WorkoutDefinitionsResult {
        var components = URLComponents(url: baseURL.appendingPathComponent("api/fitness/workout-definitions"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "routineId", value: routineId)]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("PeteTrain/1.0", forHTTPHeaderField: "User-Agent")

        if debugLoggingEnabled {
            logRequest(request, body: nil)
        }

        let (data, response) = try await session.data(for: request)

        if debugLoggingEnabled {
            logResponse(response, data: data)
        }

        try handleResponse(response, data: data)

        let apiResponse = try decoder.decode(APIWorkoutDefinitionsResponse.self, from: data)

        guard apiResponse.success, let responseData = apiResponse.data else {
            throw PetehomeAPIError.httpError(0, apiResponse.error ?? "No workout definitions returned")
        }

        let versionStr = responseData.version.map { "v\($0.number) (\($0.name))" } ?? "unknown"
        print("📚 Fetched \(responseData.definitions.count) workout definitions - \(versionStr)")

        return WorkoutDefinitionsResult(
            definitions: responseData.definitions,
            version: responseData.version
        )
    }

    /// Test the API connection and credentials
    func testConnection() async throws -> Bool {
        print("🔌 Testing connection to \(baseURL.absoluteString)...")
        print("🔑 API key: \(apiKey.prefix(8))...\(apiKey.suffix(4))")

        // Use GET workouts endpoint as a simple connectivity test
        var components = URLComponents(url: baseURL.appendingPathComponent("api/apple-health/workout"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "limit", value: "1")]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("PeteTrain/1.0", forHTTPHeaderField: "User-Agent")

        if debugLoggingEnabled {
            logRequest(request, body: nil)
        }

        let (data, response) = try await session.data(for: request)

        if debugLoggingEnabled {
            logResponse(response, data: data)
        }

        try handleResponse(response, data: data)

        print("✅ Connection test successful")
        return true
    }
    
    // MARK: - Sync with Retry
    
    /// Sync workout with exponential backoff retry
    func syncWorkoutWithRetry(_ payload: WorkoutPayload, maxRetries: Int = 3) async throws {
        var lastError: Error?

        for attempt in 0..<maxRetries {
            do {
                try await syncWorkout(payload)
                return
            } catch PetehomeAPIError.rateLimited {
                let delay = pow(2.0, Double(attempt))
                print("⏳ Rate limited, retrying in \(Int(delay))s (attempt \(attempt + 1)/\(maxRetries))")
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                lastError = PetehomeAPIError.rateLimited
            } catch PetehomeAPIError.httpError(let code, let raw) where code >= 500 {
                // Server error - retry
                let delay = pow(2.0, Double(attempt))
                print("⏳ Server error \(code), retrying in \(Int(delay))s (attempt \(attempt + 1)/\(maxRetries))")
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                lastError = PetehomeAPIError.httpError(code, raw)
            } catch {
                // Non-retryable error
                throw error
            }
        }

        throw lastError ?? PetehomeAPIError.syncFailed
    }
    
    // MARK: - Private Helpers

    private func handleResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw PetehomeAPIError.invalidResponse
        }

        let rawResponse = String(data: data, encoding: .utf8) ?? "(binary data)"

        switch httpResponse.statusCode {
        case 200...299:
            // Success
            return
        case 401:
            print("🔐 401 Unauthorized - Response: \(rawResponse)")
            throw PetehomeAPIError.unauthorized(rawResponse)
        case 429:
            throw PetehomeAPIError.rateLimited
        case 400...499:
            print("❌ HTTP \(httpResponse.statusCode) - Response: \(rawResponse)")
            throw PetehomeAPIError.httpError(httpResponse.statusCode, rawResponse)
        case 500...599:
            print("❌ Server error \(httpResponse.statusCode) - Response: \(rawResponse)")
            throw PetehomeAPIError.httpError(httpResponse.statusCode, rawResponse)
        default:
            throw PetehomeAPIError.httpError(httpResponse.statusCode, rawResponse)
        }
    }

    // MARK: - Debug Logging Helpers

    private func logRequest(_ request: URLRequest, body: Data?) {
        print("📤 ────────────────────────────────────────")
        print("📤 REQUEST: \(request.httpMethod ?? "?") \(request.url?.absoluteString ?? "?")")
        print("📤 Headers:")
        request.allHTTPHeaderFields?.forEach { key, value in
            // Mask the API key in logs
            if key == "Authorization" {
                let masked = value.prefix(15) + "..." + value.suffix(8)
                print("📤   \(key): \(masked)")
            } else {
                print("📤   \(key): \(value)")
            }
        }
        if let body = body, let bodyString = String(data: body, encoding: .utf8) {
            // Truncate long bodies
            let preview = bodyString.count > 500 ? String(bodyString.prefix(500)) + "... (\(bodyString.count) bytes)" : bodyString
            print("📤 Body: \(preview)")
        }
        print("📤 ────────────────────────────────────────")
    }

    private func logResponse(_ response: URLResponse, data: Data) {
        print("📥 ────────────────────────────────────────")
        if let httpResponse = response as? HTTPURLResponse {
            let statusEmoji = (200...299).contains(httpResponse.statusCode) ? "✅" : "❌"
            print("📥 RESPONSE: \(statusEmoji) HTTP \(httpResponse.statusCode)")
            print("📥 URL: \(httpResponse.url?.absoluteString ?? "?")")
        }
        if let bodyString = String(data: data, encoding: .utf8) {
            // Truncate long responses
            let preview = bodyString.count > 500 ? String(bodyString.prefix(500)) + "... (\(bodyString.count) bytes)" : bodyString
            print("📥 Body: \(preview)")
        } else {
            print("📥 Body: \(data.count) bytes (binary)")
        }
        print("📥 ────────────────────────────────────────")
    }
}

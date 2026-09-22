import Foundation

/// Minimal HTTP client for the watch coach companion.
/// Read-only: today's plan and a connection test. HealthKit ingest lives on iPhone.
@MainActor
final class PetehomeAPI {

    static let shared = PetehomeAPI()

    private var baseURL: URL {
        URL(string: KeychainHelper.serverURL) ?? URL(string: "https://www.pete.sh")!
    }

    private var apiKey: String { KeychainHelper.apiKey }

    private let session: URLSession
    private let decoder: JSONDecoder

    var debugLoggingEnabled: Bool = true

    var isConfigured: Bool { KeychainHelper.hasAPIKey }

    var configurationSummary: String {
        "URL: \(baseURL.absoluteString), Key: \(KeychainHelper.redactedAPIKey)"
    }

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
    }

    // MARK: - Coach Today

    /// Today's petehome sessions, PT blocks, and readiness.
    func fetchCoachToday() async throws -> CoachTodayPayload {
        let url = baseURL.appendingPathComponent("api/coach/watch/today")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("petehome/1.0", forHTTPHeaderField: "User-Agent")

        if debugLoggingEnabled {
            logRequest(request)
        }

        let (data, response) = try await session.data(for: request)

        if debugLoggingEnabled {
            logResponse(response, data: data)
        }

        try handleResponse(response, data: data)

        let apiResponse = try decoder.decode(CoachTodayResponse.self, from: data)
        guard apiResponse.success, let payload = apiResponse.data else {
            throw PetehomeAPIError.httpError(0, apiResponse.error ?? "No coach today payload")
        }
        return payload
    }

    /// Connection test against the coach today endpoint.
    func testConnection() async throws -> Bool {
        print("🔌 Testing connection to \(baseURL.absoluteString)...")
        _ = try await fetchCoachToday()
        print("✅ Connection test successful")
        return true
    }

    // MARK: - Private

    private func handleResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw PetehomeAPIError.invalidResponse
        }

        let rawResponse = String(data: data, encoding: .utf8) ?? "(binary data)"

        switch httpResponse.statusCode {
        case 200...299:
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

    private func logRequest(_ request: URLRequest) {
        print("📤 ────────────────────────────────────────")
        print("📤 REQUEST: \(request.httpMethod ?? "?") \(request.url?.absoluteString ?? "?")")
        request.allHTTPHeaderFields?.forEach { key, value in
            if key == "Authorization" {
                let masked = value.prefix(15) + "..." + value.suffix(8)
                print("📤   \(key): \(masked)")
            } else {
                print("📤   \(key): \(value)")
            }
        }
        print("📤 ────────────────────────────────────────")
    }

    private func logResponse(_ response: URLResponse, data: Data) {
        print("📥 ────────────────────────────────────────")
        if let httpResponse = response as? HTTPURLResponse {
            let statusEmoji = (200...299).contains(httpResponse.statusCode) ? "✅" : "❌"
            print("📥 RESPONSE: \(statusEmoji) HTTP \(httpResponse.statusCode)")
        }
        if let bodyString = String(data: data, encoding: .utf8) {
            let preview = bodyString.count > 500
                ? String(bodyString.prefix(500)) + "... (\(bodyString.count) bytes)"
                : bodyString
            print("📥 Body: \(preview)")
        }
        print("📥 ────────────────────────────────────────")
    }
}

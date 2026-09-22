import Foundation

// MARK: - Coach today (GET /api/coach/watch/today)

struct CoachTodayResponse: Codable {
    let success: Bool
    let data: CoachTodayPayload?
    let error: String?
}

struct CoachTodayPayload: Codable {
    let date: String
    let readiness: CoachTodayReadiness?
    let sessions: [CoachTodaySession]
    let ptBlocks: [CoachTodayPTBlock]
}

struct CoachTodayReadiness: Codable {
    let score: Int
    let level: String
    let blocked: Bool
}

struct CoachTodaySession: Codable, Identifiable, Hashable {
    let id: String
    let sport: String
    let type: String?
    let title: String
    let durationMinutes: Int?
    let distanceMeters: Double?
    let target: String?
    let completed: Bool
    let blocked: Bool
    let blockedReason: String?
}

struct CoachTodayPTBlock: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let timeOfDay: String?
    let completed: Bool
    let exercises: [CoachTodayPTExercise]
}

struct CoachTodayPTExercise: Codable, Hashable {
    let name: String
    let prescription: String
}

// MARK: - API Errors

enum PetehomeAPIError: Error, LocalizedError {
    case invalidResponse
    case unauthorized(String)
    case rateLimited
    case httpError(Int, String)
    case encodingFailed
    case networkUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized(let raw):
            return "Unauthorized: \(raw)"
        case .rateLimited:
            return "Too many requests, please wait"
        case .httpError(let code, let raw):
            return "HTTP \(code): \(raw)"
        case .encodingFailed:
            return "Failed to encode request data"
        case .networkUnavailable:
            return "Network unavailable"
        }
    }
}

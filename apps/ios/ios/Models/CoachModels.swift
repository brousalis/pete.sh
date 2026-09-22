import Foundation

// MARK: - API envelopes

struct CoachAPIEnvelope<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: String?
}

// MARK: - Today (GET /api/coach/today)

struct CoachTodayData: Codable {
    let date: String
    let briefing: String?
    let readiness: CoachReadinessView?
    let lastNightSleep: CoachLastNightSleep?
    let sessions: [CoachTodaySession]
    let ptProtocols: [CoachPtProtocol]
    let symptomsToday: [CoachSymptomToday]
    let injuries: [CoachInjurySummary]
    let block: CoachBlockSummary?
    let load: CoachLoadSummary?
    let conditions: CoachConditionsView?
    let onboard: CoachOnboardStatus?
}

struct CoachReadinessView: Codable {
    let metricDate: String?
    let score: Int
    let level: String
    let flags: [String]
    let guidance: CoachReadinessGuidance
}

struct CoachReadinessGuidance: Codable {
    let action: String
    let summary: String
}

struct CoachLastNightSleep: Codable {
    let hours: Double?
    let inBedHours: Double?
    let efficiencyPct: Int?
}

struct CoachTodaySession: Codable, Identifiable {
    let id: String
    let slot: String
    let sport: String
    let type: String
    let title: String
    let description: String?
    let durationMinutes: Int?
    let distanceMeters: Double?
    let plannedLoad: Double?
    let rationale: String?
    let status: String
    let guardrail: CoachSessionGuardrail?
}

struct CoachSessionGuardrail: Codable {
    let passed: Bool
    let severity: String
    let violations: [CoachGuardrailViolation]
}

struct CoachGuardrailViolation: Codable {
    let severity: String
    let message: String
    let remedy: String?
}

struct CoachPtProtocol: Codable, Identifiable {
    let id: String
    let slug: String
    let name: String
    let timeOfDay: String
    let durationMinutes: Int?
    let mandatory: Bool
    let completed: Bool
    let skipped: Bool
    let exercises: [CoachPtExercise]
}

struct CoachPtExercise: Codable, Identifiable {
    var id: String { name }
    let name: String
    let slug: String?
    let category: String?
    let cues: String?
}

struct CoachSymptomToday: Codable, Identifiable {
    var id: String { "\(site)-\(painScore)" }
    let site: String
    let painScore: Int
    let context: String?
    let swelling: Bool
    let locking: Bool
    let instability: Bool
}

struct CoachInjurySummary: Codable {
    let name: String
    let status: String
    let sites: [String]
}

struct CoachBlockSummary: Codable {
    let name: String
    let phase: String
    let number: Int
    let goals: [String]
}

struct CoachLoadSummary: Codable {
    let ctl: Double?
    let atl: Double?
    let tsb: Double?
    let acwr: Double?
    let weeklyTss: Double
}

struct CoachConditionsView: Codable {
    let summary: String
    let temperatureF: Double?
    let windMph: Double?
    let lakeTempF: Double?
    let lakeNote: String?
    let notes: [String]
}

struct CoachOnboardStatus: Codable {
    let intakeComplete: Bool
    let missingTests: [String]
}

// MARK: - Check-in (POST /api/coach/checkin)

struct CoachCheckInRequest: Encodable {
    var date: String?
    var symptoms: [CoachCheckInSymptom]?
    var feedback: CoachCheckInFeedback?
    var ptCompleted: [CoachPtCompletion]?
}

struct CoachCheckInSymptom: Encodable {
    let site: String
    let painScore: Int
    var context: String?
    var swelling: Bool?
    var instability: Bool?
    var locking: Bool?
    var notes: String?
}

struct CoachCheckInFeedback: Encodable {
    var sessionId: String?
    var rpe: Int?
    var mood: Int?
    var energy: Int?
    var sleepQuality: Int?
    var nutritionAdherence: Int?
    var notes: String?
}

struct CoachPtCompletion: Encodable {
    let protocolId: String
    var skipped: Bool?
}

struct CoachCheckInResult: Codable {
    let date: String
    let symptomsLogged: Int
    let readiness: CoachCheckInReadiness?
    let planChanged: Bool
    let downgradedSessions: [CoachDowngradedSession]
    let redFlag: Bool
    let guardrailMessages: [CoachGuardrailViolation]
}

struct CoachCheckInReadiness: Codable {
    let score: Int
    let level: String
    let flags: [String]
    let guidance: CoachReadinessGuidance
}

struct CoachDowngradedSession: Codable, Identifiable {
    let id: String
    let title: String
}

// MARK: - Session patch

struct CoachSessionPatchRequest: Encodable {
    let status: String
}

struct CoachSessionPatchResult: Codable {
    let id: String
    let status: String
    let title: String
    let sessionDate: String?
}

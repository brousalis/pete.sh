import Foundation
import WidgetKit

/// Compact coach-today snapshot shared between the watch app and complications
/// via the App Group. Written after every successful `/api/coach/watch/today` fetch.
struct SharedCoachTodayData: Codable {
    let date: String
    let readinessScore: Int?
    let readinessBlocked: Bool
    let sessionCount: Int
    let completedCount: Int
    let nextSessionTitle: String?
    let nextSessionSport: String?
    let nextSessionTarget: String?
    let isRestDay: Bool
    let lastUpdated: Date

    /// Primary line for rectangular / inline complications.
    var displayTitle: String {
        if isRestDay { return "Rest" }
        if let title = nextSessionTitle, !title.isEmpty { return title }
        return "\(sessionCount) session\(sessionCount == 1 ? "" : "s")"
    }

    /// Short secondary line (target or session count summary).
    var displaySubtitle: String? {
        if isRestDay { return nil }
        if let target = nextSessionTarget, !target.isEmpty { return target }
        if sessionCount > 1 {
            return "\(completedCount)/\(sessionCount) done"
        }
        return nil
    }

    var inlineLabel: String {
        if isRestDay { return "Rest" }
        if sessionCount == 0 { return "Rest" }
        if completedCount >= sessionCount && sessionCount > 0 {
            return "Done · \(sessionCount)"
        }
        return "\(sessionCount) session\(sessionCount == 1 ? "" : "s")"
    }

    var sportSystemImage: String {
        Self.sportIcon(for: nextSessionSport)
    }

    static func sportIcon(for sport: String?) -> String {
        switch sport {
        case "run": return "figure.run"
        case "bike": return "figure.outdoor.cycle"
        case "swim": return "figure.pool.swim"
        case "brick": return "figure.pool.swim"
        case "strength": return "dumbbell.fill"
        case "walk": return "figure.walk"
        case "hiit": return "bolt.heart.fill"
        case "pt": return "figure.flexibility"
        case "rest": return "moon.zzz.fill"
        default: return "figure.mixed.cardio"
        }
    }
}

// MARK: - App Group Storage

extension SharedCoachTodayData {
    static let appGroupIdentifier = "group.com.petehome.app"
    private static let storageKey = "coachTodaySnapshot"

    private static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupIdentifier)
    }

    func save() {
        guard let defaults = Self.sharedDefaults else {
            print("⚠️ Could not access shared UserDefaults")
            return
        }
        do {
            let data = try JSONEncoder().encode(self)
            defaults.set(data, forKey: Self.storageKey)
            defaults.synchronize()
        } catch {
            print("❌ Failed to encode coach today snapshot: \(error)")
        }
    }

    static func load() -> SharedCoachTodayData? {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: storageKey) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(SharedCoachTodayData.self, from: data)
        } catch {
            print("❌ Failed to decode coach today snapshot: \(error)")
            return nil
        }
    }

    static var placeholder: SharedCoachTodayData {
        SharedCoachTodayData(
            date: "2026-09-21",
            readinessScore: 62,
            readinessBlocked: false,
            sessionCount: 2,
            completedCount: 0,
            nextSessionTitle: "Easy run",
            nextSessionSport: "run",
            nextSessionTarget: "Z2 · RPE 4",
            isRestDay: false,
            lastUpdated: Date()
        )
    }

    static func refreshWidget() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}

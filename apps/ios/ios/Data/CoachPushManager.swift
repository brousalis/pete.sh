import Foundation
import UIKit
import UserNotifications

/// APNs registration for coach notifications.
///
/// Briefings, post-session debriefs and same-day plan changes. The red-flag
/// case is the one that justifies push at all: if a symptom check-in triggers
/// a training hold, the athlete needs to know before they leave the house,
/// not when they next open the app.
@MainActor
final class CoachPushManager: NSObject {

    static let shared = CoachPushManager()

    private override init() {
        super.init()
    }

    // MARK: - Registration

    func requestAuthorizationAndRegister() async {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            guard granted else {
                log("Notification permission denied")
                return
            }

            UIApplication.shared.registerForRemoteNotifications()
        } catch {
            log("Authorization failed: \(error.localizedDescription)")
        }
    }

    /// Called from the app delegate with the APNs device token.
    func registerDeviceToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        log("Registering device token \(token.prefix(8))…")

        Task { await sendTokenToServer(token) }
    }

    private func sendTokenToServer(_ token: String) async {
        guard KeychainHelper.hasAPIKey else { return }

        let url = URL(string: KeychainHelper.serverURL)!
            .appendingPathComponent("api/coach/push/subscribe")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(KeychainHelper.coachAPIKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: String] = [
            "deviceToken": token,
            "deviceLabel": UIDevice.current.name,
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                log("Device token registered")
            } else {
                log("Token registration returned \((response as? HTTPURLResponse)?.statusCode ?? -1)")
            }
        } catch {
            log("Token registration failed: \(error.localizedDescription)")
        }
    }

    private func log(_ message: String) {
        print("[CoachPush] \(message)")
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension CoachPushManager: UNUserNotificationCenterDelegate {

    /// Show coach notifications even when the app is in the foreground: a
    /// training hold is worth interrupting whatever is on screen.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo

        // A coach notification carries the path to open; the app routes to it
        // so tapping a debrief lands on the session rather than the home tab.
        if let path = userInfo["url"] as? String {
            await MainActor.run {
                NotificationCenter.default.post(
                    name: .coachNotificationTapped,
                    object: nil,
                    userInfo: ["path": path]
                )
            }
        }
    }
}

extension Notification.Name {
    static let coachNotificationTapped = Notification.Name("coachNotificationTapped")
}

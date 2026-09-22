import SwiftUI
import BackgroundTasks
import UIKit

/// Minimal app delegate, needed only for the APNs device token callback,
/// which has no SwiftUI equivalent.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            CoachPushManager.shared.registerDeviceToken(deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[CoachPush] APNs registration failed: \(error.localizedDescription)")
    }
}

@main
struct PetehomeiOSApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        BackgroundSyncManager.shared.registerBackgroundTasks()
        HealthKitObserver.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .onAppear {
                    BackgroundSyncManager.shared.scheduleBackgroundSync()

                    Task {
                        await CoachPushManager.shared.requestAuthorizationAndRegister()

                        if #available(iOS 18.0, *) {
                            await CoachWorkoutScheduler.shared.syncScheduledWorkouts()
                        }
                    }
                }
        }
    }
}

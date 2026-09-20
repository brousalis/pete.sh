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
struct PeteTrainiOSApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        // Register background tasks before app finishes launching
        BackgroundSyncManager.shared.registerBackgroundTasks()

        // Start advertising as a BLE heart rate sensor and listening for the watch relay.
        HeartRatePeripheralManager.shared.start()
        WatchConnectivityManager.shared.activate()

        // Wake on new HealthKit samples so the coach sees a session within
        // minutes rather than at the next app launch.
        HealthKitObserver.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .onAppear {
                    // Schedule background sync when app becomes active
                    BackgroundSyncManager.shared.scheduleBackgroundSync()

                    // Ensure BLE advertising is running whenever the app is foregrounded.
                    HeartRatePeripheralManager.shared.start()

                    Task {
                        await CoachPushManager.shared.requestAuthorizationAndRegister()

                        // Push approved sessions to the Watch Workout app so
                        // intervals and cadence alerts run on the wrist.
                        if #available(iOS 18.0, *) {
                            await CoachWorkoutScheduler.shared.syncScheduledWorkouts()
                        }
                    }
                }
        }
    }
}

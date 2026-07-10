import SwiftUI
import BackgroundTasks

@main
struct PeteTrainiOSApp: App {

    init() {
        // Register background tasks before app finishes launching
        BackgroundSyncManager.shared.registerBackgroundTasks()

        // Start advertising as a BLE heart rate sensor and listening for the watch relay.
        HeartRatePeripheralManager.shared.start()
        WatchConnectivityManager.shared.activate()
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .onAppear {
                    // Schedule background sync when app becomes active
                    BackgroundSyncManager.shared.scheduleBackgroundSync()

                    // Ensure BLE advertising is running whenever the app is foregrounded.
                    HeartRatePeripheralManager.shared.start()
                }
        }
    }
}

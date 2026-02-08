import SwiftUI
import BackgroundTasks

@main
struct PeteTrainiOSApp: App {

    init() {
        // Register background tasks before app finishes launching
        BackgroundSyncManager.shared.registerBackgroundTasks()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    // Schedule background sync when app becomes active
                    BackgroundSyncManager.shared.scheduleBackgroundSync()
                }
        }
    }
}

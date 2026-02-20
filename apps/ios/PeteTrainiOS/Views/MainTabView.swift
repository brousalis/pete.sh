import SwiftUI

struct MainTabView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var hasPerformedInitialSync = false
    @State private var lastActiveDate: Date?

    /// Minimum time between automatic syncs (30 minutes)
    private let minimumSyncInterval: TimeInterval = 30 * 60

    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "heart.text.square")
                }

            SyncView()
                .tabItem {
                    Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                }

            WebViewTab()
                .tabItem {
                    Label("Home", systemImage: "globe")
                }
        }
        .tint(.white)
        .task {
            _ = await HealthKitSyncManager.shared.requestHealthKitAuthorization()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            if newPhase == .active {
                handleAppBecameActive()
            } else if newPhase == .background {
                BackgroundSyncManager.shared.scheduleBackgroundSync()
            }
        }
    }

    /// Handle app becoming active - sync daily metrics if needed
    private func handleAppBecameActive() {
        let syncManager = HealthKitSyncManager.shared

        guard syncManager.autoSyncEnabled else { return }

        let shouldSync: Bool
        if !hasPerformedInitialSync {
            shouldSync = true
            hasPerformedInitialSync = true
        } else if let lastActive = lastActiveDate {
            shouldSync = Date().timeIntervalSince(lastActive) >= minimumSyncInterval
        } else {
            shouldSync = true
        }

        lastActiveDate = Date()

        if shouldSync {
            Task {
                print("[MainTabView] Auto-syncing daily metrics on app activation")
                _ = await syncManager.syncDailyMetrics(days: 1)
            }
        }
    }
}

#Preview {
    MainTabView()
        .preferredColorScheme(.dark)
}

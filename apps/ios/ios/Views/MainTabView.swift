import SwiftUI

struct MainTabView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var navigation = AppNavigation.shared
    @State private var hasPerformedInitialSync = false
    @State private var lastActiveDate: Date?

    /// Minimum time between automatic syncs (30 minutes)
    private let minimumSyncInterval: TimeInterval = 30 * 60

    var body: some View {
        TabView(selection: $navigation.selectedTab) {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "sun.max.fill")
                }
                .tag(0)

            SyncView()
                .tabItem {
                    Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                }
                .tag(1)

            ActivityView(selectedTab: $navigation.selectedTab)
                .tabItem {
                    Label("Activity", systemImage: "figure.run")
                }
                .tag(2)

            CoachWebViewTab(navigation: navigation)
                .tabItem {
                    Label("Coach", systemImage: "bubble.left.and.text.bubble.right.fill")
                }
                .tag(3)
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
        .onReceive(NotificationCenter.default.publisher(for: .coachNotificationTapped)) { notification in
            let path = notification.userInfo?["path"] as? String
            navigation.openCoach(path: path)
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

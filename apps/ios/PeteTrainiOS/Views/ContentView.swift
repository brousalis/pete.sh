import SwiftUI

/// Main content view - WebView that can trigger native sync sheet
struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var isLoading = true
    @State private var showSyncSheet = false
    @State private var hasPerformedInitialSync = false
    @State private var lastActiveDate: Date?

    /// Minimum time between automatic syncs (30 minutes)
    private let minimumSyncInterval: TimeInterval = 30 * 60

    var body: some View {
        ZStack {
            // Full-screen WebView
            PetehomeWebView(
                url: URL(string: "https://pete.sh")!,
                isLoading: $isLoading,
                onOpenSyncSheet: {
                    showSyncSheet = true
                },
                onRefresh: { }
            )
            .ignoresSafeArea()

            // Loading overlay
            if isLoading {
                ZStack {
                    Color.black.opacity(0.8)
                        .ignoresSafeArea()

                    VStack(spacing: 16) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)

                        Text("Loading pete.sh...")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
            }
        }
        .sheet(isPresented: $showSyncSheet) {
            SyncSheetView(syncManager: HealthKitSyncManager.shared)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .task {
            _ = await HealthKitSyncManager.shared.requestHealthKitAuthorization()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            if newPhase == .active {
                handleAppBecameActive()
            } else if newPhase == .background {
                // Re-schedule background sync when app goes to background
                BackgroundSyncManager.shared.scheduleBackgroundSync()
            }
        }
    }

    /// Handle app becoming active - sync daily metrics if needed
    private func handleAppBecameActive() {
        let syncManager = HealthKitSyncManager.shared

        // Check if we should perform auto-sync
        guard syncManager.autoSyncEnabled else { return }

        // Determine if enough time has passed since last sync
        let shouldSync: Bool
        if !hasPerformedInitialSync {
            // Always sync on first app launch
            shouldSync = true
            hasPerformedInitialSync = true
        } else if let lastActive = lastActiveDate {
            // Sync if more than minimumSyncInterval has passed
            shouldSync = Date().timeIntervalSince(lastActive) >= minimumSyncInterval
        } else {
            shouldSync = true
        }

        lastActiveDate = Date()

        if shouldSync {
            Task {
                print("[ContentView] Auto-syncing daily metrics on app activation")
                _ = await syncManager.syncDailyMetrics(days: 1)
            }
        }
    }
}

#Preview {
    ContentView()
}

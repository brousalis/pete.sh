import SwiftUI

struct CoachWebViewTab: View {
    @Environment(\.scenePhase) private var scenePhase

    @State private var isLoading = true
    @State private var serverReachable = true
    @State private var coachURL = CoachURLBuilder.coachDeskURL()
    @State private var reloadToken = UUID()
    @State private var pendingNavigationURL: URL? = nil
    @State private var showSyncSheet = false
    @State private var showSettingsSheet = false
    @State private var hasPerformedInitialSync = false
    @State private var lastActiveDate: Date?

    private let minimumSyncInterval: TimeInterval = 30 * 60
    private let staleReloadInterval: TimeInterval = 15 * 60

    var body: some View {
        ZStack {
            if serverReachable {
                PetehomeWebView(
                    url: coachURL,
                    isLoading: $isLoading,
                    pendingNavigationURL: $pendingNavigationURL,
                    onBridgeAction: handleBridgeAction
                )
                .id(reloadToken)
                .ignoresSafeArea()

                if isLoading {
                    loadingOverlay
                }
            } else {
                unreachableView
            }
        }
        .background(Color.black)
        .task {
            await verifyServer()
            _ = await HealthKitSyncManager.shared.requestHealthKitAuthorization()
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                handleAppBecameActive()
            } else if newPhase == .background {
                BackgroundSyncManager.shared.scheduleBackgroundSync()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .coachNotificationTapped)) { notification in
            let path = notification.userInfo?["path"] as? String
            pendingNavigationURL = CoachURLBuilder.url(forPath: path)
        }
        .sheet(isPresented: $showSyncSheet) {
            SyncView()
                .presentationDetents([.large])
                .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $showSettingsSheet) {
            iOSSettingsView()
                .presentationDetents([.large])
                .preferredColorScheme(.dark)
        }
    }

    private func handleBridgeAction(_ action: String) {
        switch action {
        case "openSync":
            showSyncSheet = true
        case "openSettings":
            showSettingsSheet = true
        default:
            break
        }
    }

    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.75).ignoresSafeArea()
            VStack(spacing: 12) {
                ProgressView()
                    .tint(.white)
                Text("Loading coach…")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var unreachableView: some View {
        VStack(spacing: 16) {
            Image(systemName: "server.rack")
                .font(.system(size: 40))
                .foregroundStyle(.orange)
            Text("Coach server unreachable")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
            Text(KeychainHelper.serverURL)
                .font(.system(size: 13, design: .monospaced))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                Task { await verifyServer() }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private func verifyServer() async {
        let base = CoachURLBuilder.serverBaseURL()
        serverReachable = await LocalServerChecker().check(baseURL: base)
        if serverReachable {
            coachURL = CoachURLBuilder.coachDeskURL()
        }
    }

    private func handleAppBecameActive() {
        let now = Date()
        let elapsed = lastActiveDate.map { now.timeIntervalSince($0) } ?? .infinity

        if elapsed >= staleReloadInterval {
            reloadToken = UUID()
        }

        lastActiveDate = now

        let syncManager = HealthKitSyncManager.shared
        guard syncManager.autoSyncEnabled else { return }

        let shouldSync = !hasPerformedInitialSync || elapsed >= minimumSyncInterval
        hasPerformedInitialSync = true

        if shouldSync {
            Task {
                _ = await syncManager.syncDailyMetrics(days: 1)
            }
        }
    }
}

#Preview {
    CoachWebViewTab()
        .preferredColorScheme(.dark)
}

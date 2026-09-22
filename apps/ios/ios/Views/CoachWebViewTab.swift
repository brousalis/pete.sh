import SwiftUI

/// Full coach desk in WKWebView at `{serverURL}/coach`.
struct CoachWebViewTab: View {
    @Bindable var navigation: AppNavigation

    @State private var isLoading = true
    @State private var serverReachable = true
    @State private var coachURL = CoachURLBuilder.coachDeskURL()
    @State private var reloadToken = UUID()

    var body: some View {
        NavigationStack {
            ZStack {
                if serverReachable {
                    PetehomeWebView(
                        url: coachURL,
                        isLoading: $isLoading,
                        pendingNavigationURL: .constant(nil),
                        onRefresh: { reloadToken = UUID() }
                    )
                    .id(reloadToken)
                    .ignoresSafeArea(edges: .bottom)

                    if isLoading {
                        loadingOverlay
                    }
                } else {
                    unreachableView
                }
            }
            .background(Color.black)
            .navigationTitle("Coach")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        reloadToken = UUID()
                        coachURL = CoachURLBuilder.coachDeskURL()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }

                    Button {
                        UIApplication.shared.open(coachURL)
                    } label: {
                        Image(systemName: "safari")
                    }
                }
            }
        }
        .task {
            await verifyServer()
        }
        .onChange(of: navigation.pendingCoachPath) { _, path in
            guard path != nil else { return }
            coachURL = CoachURLBuilder.url(forPath: path)
            navigation.pendingCoachPath = nil
            reloadToken = UUID()
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
}

#Preview {
    CoachWebViewTab(navigation: AppNavigation.shared)
        .preferredColorScheme(.dark)
}

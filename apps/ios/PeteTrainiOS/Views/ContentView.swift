import SwiftUI

/// Main content view - WebView that can trigger native sync sheet
struct ContentView: View {
    @State private var isLoading = true
    @State private var showSyncSheet = false

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
    }
}

#Preview {
    ContentView()
}

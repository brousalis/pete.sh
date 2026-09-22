import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var store = CoachTodayStore.shared
    @State private var lastActiveRefresh: Date?

    /// Minimum time between auto-refreshes when the app becomes active.
    private let minimumRefreshInterval: TimeInterval = 15 * 60

    var body: some View {
        TabView {
            CoachTodayView(store: store)
                .tag(0)

            CoachSettingsView(store: store)
                .tag(1)
        }
        .tabViewStyle(.page(indexDisplayMode: .automatic))
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                handleBecameActive()
            }
        }
    }

    private func handleBecameActive() {
        let shouldRefresh: Bool
        if let last = lastActiveRefresh {
            shouldRefresh = Date().timeIntervalSince(last) >= minimumRefreshInterval
        } else {
            shouldRefresh = true
        }

        guard shouldRefresh else { return }
        lastActiveRefresh = Date()
        Task {
            await store.refresh()
        }
    }
}

#Preview {
    ContentView()
}

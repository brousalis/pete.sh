import SwiftUI
import WatchKit

/// Minimal watch settings: credentials, connection test, and manual refresh.
struct CoachSettingsView: View {
    @Bindable var store: CoachTodayStore
    @State private var connectionMessage: String?
    @State private var isTesting = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Server")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                        Text(KeychainHelper.serverURL)
                            .font(.system(size: 11, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                    }
                    .listRowBackground(Color.white.opacity(0.06))

                    VStack(alignment: .leading, spacing: 4) {
                        Text("API key")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                        Text(KeychainHelper.redactedAPIKey)
                            .font(.system(size: 11, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    .listRowBackground(Color.white.opacity(0.06))
                } header: {
                    Text("CONNECTION")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                } footer: {
                    Text("Credentials come from Config.xcconfig / Keychain. Edit on the paired iPhone build settings if needed.")
                        .font(.system(size: 10, design: .rounded))
                }

                Section {
                    Button {
                        Task { await testConnection() }
                    } label: {
                        HStack {
                            if isTesting {
                                ProgressView()
                            } else {
                                Image(systemName: "antenna.radiowaves.left.and.right")
                            }
                            Text("Test connection")
                                .font(.system(size: 13, design: .rounded))
                        }
                    }
                    .disabled(isTesting || !KeychainHelper.hasAPIKey)
                    .listRowBackground(Color.white.opacity(0.06))

                    Button {
                        Task {
                            await store.refresh()
                            WKInterfaceDevice.current().play(.click)
                        }
                    } label: {
                        HStack {
                            if store.isLoading {
                                ProgressView()
                            } else {
                                Image(systemName: "arrow.clockwise")
                            }
                            Text("Refresh today")
                                .font(.system(size: 13, design: .rounded))
                        }
                    }
                    .disabled(store.isLoading)
                    .listRowBackground(Color.white.opacity(0.06))

                    if let message = connectionMessage {
                        Text(message)
                            .font(.system(size: 11, design: .rounded))
                            .foregroundStyle(.secondary)
                            .listRowBackground(Color.clear)
                    }
                } header: {
                    Text("ACTIONS")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                }

                Section {
                    if let updated = store.lastUpdated {
                        HStack {
                            Text("Last updated")
                                .font(.system(size: 12, design: .rounded))
                            Spacer()
                            Text(updated.formatted(date: .abbreviated, time: .shortened))
                                .font(.system(size: 11, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                        .listRowBackground(Color.white.opacity(0.06))
                    }

                    HStack {
                        Text("Cache")
                            .font(.system(size: 12, design: .rounded))
                        Spacer()
                        if store.isStale {
                            Text("Stale")
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(.orange)
                        } else if store.hasData {
                            Text("Fresh")
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(.green)
                        } else {
                            Text("Empty")
                                .font(.system(size: 11, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .listRowBackground(Color.white.opacity(0.06))

                    if let error = store.lastError {
                        Text(error)
                            .font(.system(size: 10, design: .rounded))
                            .foregroundStyle(.orange)
                            .listRowBackground(Color.clear)
                    }
                } header: {
                    Text("STATUS")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                }
            }
            .listStyle(.plain)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func testConnection() async {
        isTesting = true
        connectionMessage = nil
        defer { isTesting = false }

        do {
            _ = try await PetehomeAPI.shared.testConnection()
            connectionMessage = "Connected"
            WKInterfaceDevice.current().play(.success)
            await store.refresh()
        } catch {
            connectionMessage = error.localizedDescription
            WKInterfaceDevice.current().play(.failure)
        }
    }
}

#Preview {
    CoachSettingsView(store: CoachTodayStore.shared)
}

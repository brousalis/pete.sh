import SwiftUI

/// Settings view for the iOS app, accessible from SyncView toolbar
struct iOSSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    private let syncManager = HealthKitSyncManager.shared
    @State private var showFridgeScanner = false
    @State private var connectionTestResult: ConnectionTestResult?

    enum ConnectionTestResult {
        case success
        case failure(String)
    }

    var body: some View {
        List {
            // Auto-Sync
            Section("Sync") {
                Toggle(isOn: Binding(
                    get: { syncManager.autoSyncEnabled },
                    set: { syncManager.autoSyncEnabled = $0 }
                )) {
                    HStack(spacing: 10) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundStyle(.cyan)
                        Text("Auto-Sync on Launch")
                            .font(.system(size: 15, design: .rounded))
                    }
                }
                .tint(.cyan)

                // Connection test
                Button {
                    connectionTestResult = nil
                    Task {
                        let result = await syncManager.testConnection()
                        connectionTestResult = result ? .success : .failure(syncManager.lastSyncError ?? "Unknown error")
                    }
                } label: {
                    HStack {
                        Image(systemName: "antenna.radiowaves.left.and.right")
                            .foregroundStyle(.green)
                        Text("Test Connection")
                            .font(.system(size: 15, design: .rounded))
                        Spacer()
                        if let result = connectionTestResult {
                            switch result {
                            case .success:
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            case .failure:
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.red)
                            }
                        }
                    }
                }
            }

            // Tools
            Section("Tools") {
                Button {
                    showFridgeScanner = true
                } label: {
                    HStack {
                        Image(systemName: "refrigerator.fill")
                            .foregroundStyle(.blue)
                        Text("Fridge Scanner")
                            .font(.system(size: 15, design: .rounded))
                            .foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // App Info
            Section("About") {
                HStack {
                    Text("App")
                        .font(.system(size: 14, design: .rounded))
                    Spacer()
                    Text("PeteTrain iOS")
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Text("HealthKit")
                        .font(.system(size: 14, design: .rounded))
                    Spacer()
                    Text(syncManager.isAuthorized ? "Authorized" : "Not Authorized")
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(syncManager.isAuthorized ? .green : .orange)
                }

                HStack {
                    Text("API")
                        .font(.system(size: 14, design: .rounded))
                    Spacer()
                    Text(syncManager.canSync ? "Configured" : "Not Configured")
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(syncManager.canSync ? .green : .red)
                }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
        .sheet(isPresented: $showFridgeScanner) {
            FridgeScannerSheet(
                scanManager: FridgeScanManager.shared,
                onScanComplete: { items, scanId in
                    NotificationCenter.default.post(
                        name: .fridgeScanCompleted,
                        object: nil,
                        userInfo: ["items": items, "scanId": scanId]
                    )
                }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }
}

#Preview {
    NavigationStack {
        iOSSettingsView()
    }
    .preferredColorScheme(.dark)
}

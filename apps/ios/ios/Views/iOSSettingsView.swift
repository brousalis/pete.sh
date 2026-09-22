import SwiftUI

struct iOSSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    private let syncManager = HealthKitSyncManager.shared
    @State private var connectionTestResult: ConnectionTestResult?
    @State private var serverURLInput: String = KeychainHelper.serverURL
    @State private var showServerURLSaved = false

    enum ConnectionTestResult {
        case success
        case failure(String)
    }

    var body: some View {
        List {
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

            Section("About") {
                HStack {
                    Text("App")
                        .font(.system(size: 14, design: .rounded))
                    Spacer()
                    Text("petehome")
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

                VStack(alignment: .leading, spacing: 6) {
                    Text("Server URL")
                        .font(.system(size: 14, design: .rounded))
                    TextField("https://pete.sh", text: $serverURLInput)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(.primary)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .onSubmit { saveServerURL() }
                    if showServerURLSaved {
                        Text("Saved")
                            .font(.system(size: 11, design: .rounded))
                            .foregroundStyle(.green)
                    }
                }
                Button("Save URL") { saveServerURL() }
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.cyan)

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
    }

    private func saveServerURL() {
        let trimmed = serverURLInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        KeychainHelper.setServerURL(trimmed)
        connectionTestResult = nil
        showServerURLSaved = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            showServerURLSaved = false
        }
    }
}

#Preview {
    NavigationStack {
        iOSSettingsView()
    }
    .preferredColorScheme(.dark)
}

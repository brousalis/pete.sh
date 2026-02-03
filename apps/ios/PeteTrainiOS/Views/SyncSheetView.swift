import SwiftUI

/// Native sheet for HealthKit sync interface + debug log
struct SyncSheetView: View {
    var syncManager: HealthKitSyncManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                // Status Section
                Section("Status") {
                    StatusRow(syncManager: syncManager)
                }

                // Quick Actions
                Section("Actions") {
                    Button {
                        Task { await syncManager.syncRecent() }
                    } label: {
                        Label("Sync Recent (7 days)", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .disabled(syncManager.isSyncing)

                    Button {
                        Task { await syncManager.syncAllHistory() }
                    } label: {
                        Label("Sync All History", systemImage: "clock.arrow.circlepath")
                    }
                    .disabled(syncManager.isSyncing)

                    Button {
                        Task { await syncManager.syncDailyMetrics(days: 7) }
                    } label: {
                        Label("Sync Daily Metrics", systemImage: "heart.text.square")
                    }
                    .disabled(syncManager.isSyncing)

                    Button {
                        Task { await syncManager.testConnection() }
                    } label: {
                        Label("Test Connection", systemImage: "antenna.radiowaves.left.and.right")
                    }
                    .disabled(syncManager.isSyncing)
                }

                // Progress Section (when syncing)
                if syncManager.isHistoricalSyncInProgress {
                    Section("Progress") {
                        VStack(alignment: .leading, spacing: 8) {
                            ProgressView(value: syncManager.historicalSyncProgress)
                                .tint(.blue)

                            HStack {
                                Text("Synced: \(syncManager.historicalSyncCompleted)")
                                    .foregroundStyle(.green)
                                Spacer()
                                Text("Failed: \(syncManager.historicalSyncFailed)")
                                    .foregroundStyle(.red)
                                Spacer()
                                Text("Total: \(syncManager.historicalSyncTotal)")
                                    .foregroundStyle(.secondary)
                            }
                            .font(.caption)
                        }
                    }
                }

                // Debug Log Section
                Section {
                    if syncManager.debugLog.isEmpty {
                        Text("No log entries")
                            .foregroundStyle(.secondary)
                            .font(.subheadline)
                    } else {
                        ForEach(Array(syncManager.debugLog.enumerated()), id: \.offset) { _, line in
                            Text(line)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(logColor(for: line))
                        }
                    }
                } header: {
                    HStack {
                        Text("Debug Log")
                        Spacer()
                        Button("Clear") {
                            syncManager.clearLog()
                        }
                        .font(.caption)
                    }
                }
            }
            .navigationTitle("HealthKit Sync")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    // MARK: - Log Line Color

    private func logColor(for line: String) -> Color {
        if line.contains("Error") || line.contains("Failed") || line.contains("failed") {
            return .red
        } else if line.contains("Synced") || line.contains("synced") || line.contains("complete") || line.contains("passed") {
            return .green
        } else if line.contains("Syncing") || line.contains("Starting") || line.contains("Testing") {
            return .orange
        } else if line.contains("already synced") || line.contains("skipped") {
            return .yellow
        }
        return .primary
    }
}

// MARK: - Status Row

private struct StatusRow: View {
    var syncManager: HealthKitSyncManager

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Connection Status
            HStack {
                Circle()
                    .fill(syncManager.canSync ? Color.green : Color.red)
                    .frame(width: 10, height: 10)
                Text(syncManager.canSync ? "API Connected" : "API Not Connected")
                    .font(.subheadline)
            }

            // HealthKit Status
            HStack {
                Circle()
                    .fill(syncManager.isAuthorized ? Color.green : Color.orange)
                    .frame(width: 10, height: 10)
                Text(syncManager.isAuthorized ? "HealthKit Authorized" : "HealthKit Not Authorized")
                    .font(.subheadline)
            }

            // Sync Status
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 10, height: 10)
                Text(syncManager.statusDescription)
                    .font(.subheadline)
            }

            // Last Sync
            HStack {
                Image(systemName: "clock")
                    .foregroundStyle(.secondary)
                Text("Last sync: \(syncManager.lastSyncDescription)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Error (if any)
            if let error = syncManager.lastSyncError {
                HStack(alignment: .top) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch syncManager.syncStatus {
        case .idle: return .gray
        case .syncing: return .cyan
        case .success: return .green
        case .failed: return .red
        case .queued: return .orange
        }
    }
}

// MARK: - Floating Sync Button

struct SyncFloatingButton: View {
    var syncManager: HealthKitSyncManager
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack {
                Circle()
                    .fill(syncManager.isSyncing ? Color.orange : Color.blue)
                    .frame(width: 56, height: 56)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                if syncManager.isSyncing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.title2)
                        .foregroundStyle(.white)
                }

                // Badge for pending count
                if syncManager.pendingCount > 0 && !syncManager.isSyncing {
                    Text("\(syncManager.pendingCount)")
                        .font(.caption2.bold())
                        .foregroundStyle(.white)
                        .padding(4)
                        .background(Circle().fill(.red))
                        .offset(x: 18, y: -18)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview("Sync Sheet") {
    SyncSheetView(syncManager: HealthKitSyncManager.shared)
}

#Preview("Floating Button") {
    ZStack {
        Color.black.ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                SyncFloatingButton(
                    syncManager: HealthKitSyncManager.shared,
                    onTap: { print("Tapped") }
                )
                .padding()
            }
        }
    }
}

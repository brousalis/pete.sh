import SwiftUI

struct SyncView: View {
    private let syncManager = HealthKitSyncManager.shared
    @State private var showSettings = false
    @State private var showAdvancedSync = false
    @State private var syncResult: SyncResultState?

    enum SyncResultState {
        case success(String)
        case failure(String)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    statusSection
                    syncButtonsSection
                    resultBanner
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("Sync")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                NavigationStack {
                    iOSSettingsView()
                }
            }
            .sheet(isPresented: $showAdvancedSync) {
                SyncSheetView(syncManager: syncManager)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    // MARK: - Status Section

    private var statusSection: some View {
        VStack(spacing: 12) {
            // API Status
            HStack(spacing: 10) {
                Circle()
                    .fill(syncManager.canSync ? Color.green : Color.red)
                    .frame(width: 10, height: 10)
                Text(syncManager.canSync ? "API Connected" : "API Not Connected")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(.white)
                Spacer()
            }

            // HealthKit Status
            HStack(spacing: 10) {
                Circle()
                    .fill(syncManager.isAuthorized ? Color.green : Color.orange)
                    .frame(width: 10, height: 10)
                Text(syncManager.isAuthorized ? "HealthKit Authorized" : "HealthKit Not Authorized")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(.white)
                Spacer()
            }

            // Last Sync
            HStack(spacing: 10) {
                Image(systemName: "clock")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                Text("Last sync: \(syncManager.lastSyncDescription)")
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    // MARK: - Sync Buttons

    private var syncButtonsSection: some View {
        VStack(spacing: 12) {
            // Primary: Sync Today
            Button {
                syncResult = nil
                Task {
                    let workoutResult = await syncManager.syncHistoricalWorkouts(days: 1)
                    let metricsCount = await syncManager.syncDailyMetrics(days: 1)

                    if workoutResult.failed == 0 {
                        syncResult = .success("\(workoutResult.synced) workout(s) + \(metricsCount) day metrics synced")
                    } else {
                        syncResult = .failure("\(workoutResult.failed) failed, \(workoutResult.synced) synced")
                    }
                }
            } label: {
                HStack {
                    if syncManager.isSyncing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.triangle.2.circlepath")
                    }
                    Text("Sync Today")
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color.green)
                )
            }
            .disabled(syncManager.isSyncing)

            // Secondary: Sync Last 7 Days
            Button {
                syncResult = nil
                Task {
                    let result = await syncManager.syncRecent()
                    let metricsCount = await syncManager.syncDailyMetrics(days: 7)

                    if result.failed == 0 {
                        syncResult = .success(result.summary + " + \(metricsCount) days metrics")
                    } else {
                        syncResult = .failure(result.summary)
                    }
                }
            } label: {
                HStack {
                    Image(systemName: "clock.arrow.circlepath")
                    Text("Sync Last 7 Days")
                        .font(.system(size: 15, weight: .medium, design: .rounded))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color.white.opacity(0.12))
                )
            }
            .disabled(syncManager.isSyncing)

            // Progress
            if syncManager.isHistoricalSyncInProgress {
                VStack(spacing: 8) {
                    ProgressView(value: syncManager.historicalSyncProgress)
                        .tint(.cyan)

                    HStack {
                        Text("Syncing...")
                            .font(.system(size: 13, design: .rounded))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(syncManager.historicalSyncCompleted)/\(syncManager.historicalSyncTotal)")
                            .font(.system(size: 13, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.cyan)
                    }
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.06))
                )
            }

            // Advanced Sync Link
            Button {
                showAdvancedSync = true
            } label: {
                HStack {
                    Image(systemName: "wrench.and.screwdriver")
                        .font(.system(size: 13))
                    Text("Advanced Sync")
                        .font(.system(size: 14, design: .rounded))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                }
                .foregroundStyle(.secondary)
                .padding(.vertical, 8)
            }
        }
    }

    // MARK: - Result Banner

    @ViewBuilder
    private var resultBanner: some View {
        if let result = syncResult {
            HStack(spacing: 10) {
                switch result {
                case .success(let message):
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text(message)
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(.green)
                case .failure(let message):
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(message)
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(.red)
                }
                Spacer()
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.06))
            )
        }
    }
}

#Preview {
    SyncView()
        .preferredColorScheme(.dark)
}

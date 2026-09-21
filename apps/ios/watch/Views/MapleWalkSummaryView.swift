import SwiftUI
import WatchKit

struct MapleWalkSummaryView: View {
    @State private var walkManager = MapleWalkManager.shared
    @State private var syncManager = SyncManager.shared
    @State private var isSyncing = false
    @State private var syncComplete = false
    @State private var syncError: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                headerSection
                statsSection
                bathroomSection
                debugSection
                actionButtons
            }
            .padding(.horizontal, 4)
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 4) {
            Text("🐾")
                .font(.system(size: 36))

            Text("Walk Complete")
                .font(.system(.title3, design: .rounded))
                .fontWeight(.bold)
                .foregroundStyle(.green)
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        VStack(spacing: 8) {
            HStack(spacing: 16) {
                statItem(
                    icon: "clock.fill",
                    value: formatDuration(walkManager.elapsedTime),
                    color: .blue
                )
                statItem(
                    icon: "figure.walk",
                    value: formatDistance(walkManager.distance),
                    color: .mint
                )
            }

            HStack(spacing: 16) {
                statItem(
                    icon: "flame.fill",
                    value: "\(Int(walkManager.activeCalories)) cal",
                    color: .orange
                )
                statItem(
                    icon: "heart.fill",
                    value: walkManager.heartRate > 0 ? "\(Int(walkManager.heartRate)) bpm" : "-- bpm",
                    color: .red
                )
            }
        }
    }

    private func statItem(icon: String, value: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)
            Text(value)
                .font(.system(.caption, design: .rounded))
                .fontWeight(.medium)
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Bathroom Summary

    private var bathroomSection: some View {
        Group {
            if walkManager.bathroomMarkers.isEmpty {
                Text("No bathroom breaks")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else {
                HStack(spacing: 16) {
                    if walkManager.peeCount > 0 {
                        HStack(spacing: 4) {
                            Text("💧")
                                .font(.system(size: 20))
                            Text("x\(walkManager.peeCount)")
                                .font(.system(.body, design: .rounded))
                                .fontWeight(.bold)
                        }
                    }
                    if walkManager.poopCount > 0 {
                        HStack(spacing: 4) {
                            Text("💩")
                                .font(.system(size: 20))
                            Text("x\(walkManager.poopCount)")
                                .font(.system(.body, design: .rounded))
                                .fontWeight(.bold)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Debug Info

    private var debugSection: some View {
        VStack(spacing: 2) {
            let hasWorkout = walkManager.finishedWorkout != nil
            let workoutId = walkManager.finishedWorkout?.uuid.uuidString.prefix(8) ?? "none"

            Text("GPS: \(walkManager.routePointCount) pts | HK: \(hasWorkout ? "✓" : "✗") \(workoutId)")
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(.secondary)

            if let error = walkManager.lastError {
                Text("err: \(error)")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Actions

    private var actionButtons: some View {
        VStack(spacing: 8) {
            if syncComplete {
                Label("Synced!", systemImage: "checkmark.circle.fill")
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.semibold)
                    .foregroundStyle(.green)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
            } else {
                Button {
                    Task {
                        await syncAndDismiss()
                    }
                } label: {
                    if isSyncing {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                    } else {
                        Label("Save & Sync", systemImage: "arrow.up.circle.fill")
                            .font(.system(.body, design: .rounded))
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(isSyncing)
            }

            if let error = syncError {
                Text(error)
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.red)
            }

            if !syncComplete {
                Button(role: .destructive) {
                    walkManager.discardWalk()
                } label: {
                    Text("Discard")
                        .font(.system(.caption, design: .rounded))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
                .disabled(isSyncing)
            }
        }
    }

    // MARK: - Sync

    private func syncAndDismiss() async {
        guard let workout = walkManager.finishedWorkout else {
            print("🐾 SYNC: finishedWorkout is nil — cannot sync")
            syncError = "Workout not saved — try syncing from iPhone later"
            WKInterfaceDevice.current().play(.failure)
            return
        }

        let markers = walkManager.bathroomMarkers
        print("🐾 SYNC: starting — workout=\(workout.uuid.uuidString.prefix(8)), markers=\(markers.count), duration=\(Int(workout.duration / 60))m")

        isSyncing = true
        syncError = nil

        // Persist markers keyed by workout UUID for retry survival
        walkManager.persistMarkersForWorkout(workoutUUID: workout.uuid.uuidString)

        await syncManager.syncMapleWalk(workout, markers: markers)

        if syncManager.syncStatus == .success {
            print("🐾 SYNC: success!")
            MapleWalkManager.clearPersistedMarkers(workoutUUID: workout.uuid.uuidString)
            walkManager.clearPersistedMarkers()
            syncComplete = true
            isSyncing = false
            WKInterfaceDevice.current().play(.success)

            // Auto-dismiss after delay so user can see success
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            walkManager.resetState()
        } else {
            print("🐾 SYNC: failed — \(syncManager.lastSyncError ?? "unknown error")")
            syncError = syncManager.lastSyncError ?? "Sync failed — try again"
            isSyncing = false
            WKInterfaceDevice.current().play(.failure)
        }
    }

    // MARK: - Formatting

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let h = Int(seconds) / 3600
        let m = (Int(seconds) % 3600) / 60
        if h > 0 {
            return "\(h)h \(m)m"
        }
        return "\(m)m"
    }

    private func formatDistance(_ meters: Double) -> String {
        let miles = meters / 1609.344
        return String(format: "%.2f mi", miles)
    }
}

#Preview {
    MapleWalkSummaryView()
}

import SwiftUI
import WatchKit

/// Standalone screen that broadcasts the wrist heart rate to the paired iPhone,
/// which re-emits it as a BLE Heart Rate sensor for a bike computer (Coospo CS600).
struct HRBroadcastView: View {
    @State private var broadcastManager = HRBroadcastManager.shared

    var body: some View {
        Group {
            switch broadcastManager.broadcastState {
            case .idle:
                startView
            case .starting:
                startingView
            case .active:
                activeView
            case .ending:
                startingView
            }
        }
    }

    // MARK: - Start View

    private var startView: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "dot.radiowaves.left.and.right")
                    .font(.system(size: 40))
                    .foregroundStyle(.red)

                Text("HR Broadcast")
                    .font(.system(.title3, design: .rounded))
                    .fontWeight(.bold)
                    .foregroundStyle(.red)

                Text("Send your heart rate to your bike computer as a Bluetooth sensor.")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    Task { await broadcastManager.start() }
                } label: {
                    Label("Start", systemImage: "play.fill")
                        .font(.system(.body, design: .rounded))
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)

                Text("Open petehome on your iPhone first, then pair from your bike computer's sensor menu.")
                    .font(.system(size: 9, design: .rounded))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                if let error = broadcastManager.lastError {
                    Text(error)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.orange)
                        .multilineTextAlignment(.center)
                }
            }
            .padding()
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Starting / Ending

    private var startingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(.red)
            Text(broadcastManager.broadcastState == .ending ? "Stopping..." : "Starting...")
                .font(.system(.body, design: .rounded))
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Active View

    private var activeView: some View {
        ScrollView {
            VStack(spacing: 12) {
                heartRateSection
                statusSection
                keepOpenHint
                stopButton
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 8)
        }
        .scrollIndicators(.hidden)
    }

    private var heartRateSection: some View {
        VStack(spacing: 2) {
            HStack(spacing: 6) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(heartRateColor)
                    .symbolEffect(.pulse, options: .repeating, isActive: broadcastManager.heartRate > 0)
                Text(broadcastManager.heartRate > 0 ? "\(Int(broadcastManager.heartRate))" : "--")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(heartRateColor)
            }
            Text("BPM")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
        }
    }

    private var statusSection: some View {
        VStack(spacing: 6) {
            statusRow(
                label: broadcastManager.phoneReachable ? "iPhone connected" : "iPhone not reachable",
                systemImage: "iphone",
                color: broadcastManager.phoneReachable ? .green : .orange
            )
            statusRow(
                label: broadcastManager.subscriberConnected ? "Bike computer paired" : "Waiting for bike computer",
                systemImage: "dot.radiowaves.left.and.right",
                color: broadcastManager.subscriberConnected ? .green : .secondary
            )
        }
    }

    private func statusRow(label: String, systemImage: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: systemImage)
                .font(.system(size: 10))
                .foregroundStyle(color)
                .frame(width: 16)
            Text(label)
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(.secondary)
            Spacer()
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.white.opacity(0.06)))
    }

    private var keepOpenHint: some View {
        Text("Keep this app open for steady updates.")
            .font(.system(size: 9, design: .rounded))
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
    }

    private var stopButton: some View {
        Button {
            Task { await broadcastManager.stop() }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 12))
                Text("Stop")
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 40)
        }
        .buttonStyle(.bordered)
        .tint(.red)
    }

    private var heartRateColor: Color {
        let hr = broadcastManager.heartRate
        if hr == 0 { return .gray }
        if hr < 100 { return .green }
        if hr < 130 { return .yellow }
        if hr < 160 { return .orange }
        return .red
    }
}

#Preview {
    HRBroadcastView()
}

import SwiftUI
import WatchKit

struct MapleWalkView: View {
    @State private var walkManager = MapleWalkManager.shared
    @State private var showEndConfirmation = false

    // Button animation states
    @State private var peePressed = false
    @State private var poopPressed = false
    @State private var peeSuccess = false
    @State private var poopSuccess = false
    @State private var gpsError = false

    var body: some View {
        Group {
            switch walkManager.walkState {
            case .idle:
                startView
            case .active, .paused:
                activeWalkView
            case .ending:
                endingView
            case .summary:
                MapleWalkSummaryView()
            }
        }
    }

    // MARK: - Start View

    private var startView: some View {
        VStack(spacing: 16) {
            Text("🐾")
                .font(.system(size: 48))

            Text("Maple Walk")
                .font(.system(.title2, design: .rounded))
                .fontWeight(.bold)
                .foregroundStyle(.green)

            Text("Track bathroom breaks\nwith GPS markers")
                .font(.system(.caption, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                Task {
                    await walkManager.startWalk()
                }
            } label: {
                Label("Start Walk", systemImage: "figure.walk")
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)

            if let error = walkManager.lastError {
                Text(error)
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.red)
            }
        }
        .padding()
    }

    // MARK: - Active Walk View

    private var activeWalkView: some View {
        ScrollView {
            VStack(spacing: 12) {
                metricsSection
                markerButtons
                controlsSection
            }
            .padding(.horizontal, 4)
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Metrics

    private var metricsSection: some View {
        VStack(spacing: 4) {
            if walkManager.walkState == .paused {
                Text("PAUSED")
                    .font(.system(.caption2, design: .rounded))
                    .fontWeight(.bold)
                    .foregroundStyle(.yellow)
            }

            Text(formatDuration(walkManager.elapsedTime))
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(walkManager.walkState == .paused ? Color.secondary : Color.green)

            HStack(spacing: 16) {
                // Heart rate
                HStack(spacing: 4) {
                    Image(systemName: "heart.fill")
                        .foregroundStyle(heartRateColor)
                        .font(.system(size: 10))
                    Text(walkManager.heartRate > 0 ? "\(Int(walkManager.heartRate))" : "--")
                        .font(.system(.body, design: .rounded))
                        .fontWeight(.medium)
                        .monospacedDigit()
                }

                // Distance
                HStack(spacing: 4) {
                    Image(systemName: "figure.walk")
                        .foregroundStyle(.mint)
                        .font(.system(size: 10))
                    Text(formatDistance(walkManager.distance))
                        .font(.system(.body, design: .rounded))
                        .fontWeight(.medium)
                        .monospacedDigit()
                }
            }
            .foregroundStyle(walkManager.walkState == .paused ? .secondary : .primary)
        }
    }

    private var heartRateColor: Color {
        let hr = walkManager.heartRate
        if hr == 0 { return .gray }
        if hr < 100 { return .green }
        if hr < 130 { return .yellow }
        if hr < 160 { return .orange }
        return .red
    }

    // MARK: - Bathroom Marker Buttons

    private var markerButtons: some View {
        HStack(spacing: 8) {
            markerButton(type: .pee, emoji: "💧", count: walkManager.peeCount,
                         isPressed: $peePressed, showSuccess: $peeSuccess)
            markerButton(type: .poop, emoji: "💩", count: walkManager.poopCount,
                         isPressed: $poopPressed, showSuccess: $poopSuccess)
        }
        .padding(.vertical, 4)
    }

    private func markerButton(
        type: BathroomMarkerType,
        emoji: String,
        count: Int,
        isPressed: Binding<Bool>,
        showSuccess: Binding<Bool>
    ) -> some View {
        Button {
            walkManager.markBathroom(type: type)

            if walkManager.lastError == nil || walkManager.lastError != "No GPS signal" {
                withAnimation(.easeOut(duration: 0.15)) {
                    isPressed.wrappedValue = true
                }
                showSuccess.wrappedValue = true

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                    withAnimation(.easeIn(duration: 0.1)) {
                        isPressed.wrappedValue = false
                    }
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    showSuccess.wrappedValue = false
                }
            } else {
                withAnimation {
                    gpsError = true
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    gpsError = false
                    walkManager.lastError = nil
                }
            }
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color.green.opacity(0.3), lineWidth: 1)
                    )

                VStack(spacing: 4) {
                    ZStack {
                        Text(emoji)
                            .font(.system(size: 32))

                        if showSuccess.wrappedValue {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(.green)
                                .offset(x: 14, y: -14)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }

                    if count > 0 {
                        Text("\(count)")
                            .font(.system(.caption, design: .rounded))
                            .fontWeight(.bold)
                            .foregroundStyle(.green)
                    }
                }
            }
            .frame(height: 80)
            .scaleEffect(isPressed.wrappedValue ? 0.92 : 1.0)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Mark \(type.rawValue) location, \(count) recorded")
    }

    // MARK: - Controls

    private var controlsSection: some View {
        VStack(spacing: 8) {
            if gpsError {
                Text("No GPS signal")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.red)
                    .transition(.opacity)
            }

            HStack(spacing: 8) {
                // Pause/Resume
                Button {
                    if walkManager.walkState == .paused {
                        walkManager.resumeWalk()
                    } else {
                        walkManager.pauseWalk()
                    }
                } label: {
                    Image(systemName: walkManager.walkState == .paused ? "play.fill" : "pause.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.bordered)
                .tint(.yellow)

                // End Walk (long press)
                Button {
                    showEndConfirmation = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 12))
                        Text("End")
                            .font(.system(.body, design: .rounded))
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
        }
        .confirmationDialog("End Maple Walk?", isPresented: $showEndConfirmation) {
            Button("End Walk", role: .destructive) {
                Task {
                    await walkManager.endWalk()
                }
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    // MARK: - Ending View

    private var endingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(.green)
            Text("Finishing walk...")
                .font(.system(.body, design: .rounded))
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Formatting

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let h = Int(seconds) / 3600
        let m = (Int(seconds) % 3600) / 60
        let s = Int(seconds) % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%d:%02d", m, s)
    }

    private func formatDistance(_ meters: Double) -> String {
        let miles = meters / 1609.344
        return String(format: "%.2f mi", miles)
    }
}

#Preview {
    MapleWalkView()
}

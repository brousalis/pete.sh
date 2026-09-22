import SwiftUI
import WatchKit

/// Read-only day plan: sessions, readiness, and PT blocks from the coach.
struct CoachTodayView: View {
    @Bindable var store: CoachTodayStore
    @State private var selectedSession: CoachTodaySession?
    @State private var selectedPT: CoachTodayPTBlock?
    @State private var showReadinessInfo = false

    var body: some View {
        NavigationStack {
            Group {
                if let payload = store.payload {
                    todayList(payload)
                } else if store.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    emptyState
                }
            }
            .background(Color.black)
            .navigationTitle("petehome")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable {
                await store.refresh()
            }
            .sheet(item: $selectedSession) { session in
                SessionDetailSheet(session: session)
            }
            .sheet(item: $selectedPT) { block in
                PTDetailSheet(block: block)
            }
            .sheet(isPresented: $showReadinessInfo) {
                ReadinessInfoSheet(readiness: store.payload?.readiness)
            }
        }
    }

    // MARK: - List

    @ViewBuilder
    private func todayList(_ payload: CoachTodayPayload) -> some View {
        List {
            headerSection(payload)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 4, bottom: 4, trailing: 4))

            if let readiness = payload.readiness {
                Button {
                    showReadinessInfo = true
                } label: {
                    ReadinessStrip(readiness: readiness)
                }
                .buttonStyle(.plain)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 2, leading: 4, bottom: 8, trailing: 4))
            }

            if store.isStale || store.lastError != nil {
                statusBanner
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 0, leading: 4, bottom: 8, trailing: 4))
            }

            if payload.sessions.isEmpty {
                Text("Rest day — no sessions planned")
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(.secondary)
                    .listRowBackground(Color.clear)
            } else {
                Section {
                    ForEach(payload.sessions) { session in
                        Button {
                            selectedSession = session
                        } label: {
                            SessionRow(session: session)
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Color.white.opacity(0.06))
                        .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))
                    }
                } header: {
                    Text("SESSIONS")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }

            if !payload.ptBlocks.isEmpty {
                Section {
                    ForEach(payload.ptBlocks) { block in
                        Button {
                            selectedPT = block
                        } label: {
                            PTBlockRow(block: block)
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Color.white.opacity(0.06))
                        .listRowInsets(EdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8))
                    }
                } header: {
                    Text("PT")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }

            if let updated = store.lastUpdated {
                Text("Updated \(updated.formatted(date: .omitted, time: .shortened))")
                    .font(.system(size: 10, design: .rounded))
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 8, leading: 4, bottom: 20, trailing: 4))
            }
        }
        .listStyle(.plain)
    }

    @ViewBuilder
    private func headerSection(_ payload: CoachTodayPayload) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(formattedDate(payload.date))
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
            Text("\(payload.sessions.count) session\(payload.sessions.count == 1 ? "" : "s")")
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private var statusBanner: some View {
        HStack(spacing: 6) {
            Image(systemName: store.lastError != nil ? "exclamationmark.triangle.fill" : "clock")
                .font(.system(size: 10))
            Text(store.lastError != nil ? "Offline — showing cache" : "Stale — pull to refresh")
                .font(.system(size: 11, design: .rounded))
                .lineLimit(1)
        }
        .foregroundStyle(store.lastError != nil ? .orange : .secondary)
    }

    @ViewBuilder
    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 28))
                .foregroundStyle(.secondary)
            Text("No plan loaded")
                .font(.system(size: 14, weight: .medium, design: .rounded))
            if let error = store.lastError {
                Text(error)
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            Button("Retry") {
                Task { await store.refresh() }
            }
            .font(.system(size: 13, weight: .semibold, design: .rounded))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func formattedDate(_ iso: String) -> String {
        let parser = DateFormatter()
        parser.calendar = Calendar(identifier: .gregorian)
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(identifier: "America/Chicago")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: iso) else { return iso }

        let display = DateFormatter()
        display.timeZone = TimeZone(identifier: "America/Chicago")
        display.dateFormat = "EEE, MMM d"
        return display.string(from: date)
    }
}

// MARK: - Readiness

private struct ReadinessStrip: View {
    let readiness: CoachTodayReadiness

    var body: some View {
        HStack(spacing: 10) {
            Text("\(readiness.score)")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(readiness.blocked ? .red : readinessColor(readiness.level))

            VStack(alignment: .leading, spacing: 1) {
                Text("Readiness")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                Text(readiness.level.capitalized)
                    .font(.system(size: 10, design: .rounded))
                    .foregroundStyle(readiness.blocked ? .red.opacity(0.85) : readinessColor(readiness.level).opacity(0.85))
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.06))
        )
    }
}

// MARK: - Session row

private struct SessionRow: View {
    let session: CoachTodaySession

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: SharedCoachTodayData.sportIcon(for: session.sport))
                .font(.system(size: 14))
                .foregroundStyle(session.blocked ? .gray : .orange)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(session.title)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(session.blocked ? .gray : .white)
                    .lineLimit(2)

                if let meta = metaLine {
                    Text(meta)
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if session.blocked, let reason = session.blockedReason {
                    Text(reason)
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(.red.opacity(0.85))
                        .lineLimit(2)
                }
            }

            Spacer(minLength: 0)

            if session.completed {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.green)
            } else if session.blocked {
                Image(systemName: "lock.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.gray)
            }
        }
        .padding(.vertical, 2)
    }

    private var metaLine: String? {
        var parts: [String] = []
        if let minutes = session.durationMinutes {
            parts.append("\(minutes) min")
        }
        if let meters = session.distanceMeters, meters > 0 {
            let miles = meters / 1609.344
            if miles >= 0.1 {
                parts.append(String(format: "%.1f mi", miles))
            } else {
                parts.append("\(Int(meters)) m")
            }
        }
        if let target = session.target, !target.isEmpty {
            parts.append(target)
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

// MARK: - PT row

private struct PTBlockRow: View {
    let block: CoachTodayPTBlock

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "figure.flexibility")
                .font(.system(size: 14))
                .foregroundStyle(.cyan)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(block.name)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                HStack(spacing: 4) {
                    if let tod = block.timeOfDay {
                        Text(tod.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.system(size: 10, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    Text("\(block.exercises.count) moves")
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }

            Spacer(minLength: 0)

            if block.completed {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.green)
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Detail sheets

private struct SessionDetailSheet: View {
    let session: CoachTodaySession
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: SharedCoachTodayData.sportIcon(for: session.sport))
                            .font(.system(size: 20))
                            .foregroundStyle(session.blocked ? .gray : .orange)
                        Text(session.title)
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)
                    }

                    if let type = session.type {
                        detailRow(label: "Type", value: type)
                    }
                    if let minutes = session.durationMinutes {
                        detailRow(label: "Duration", value: "\(minutes) min")
                    }
                    if let meters = session.distanceMeters, meters > 0 {
                        let miles = meters / 1609.344
                        detailRow(
                            label: "Distance",
                            value: miles >= 0.1
                                ? String(format: "%.1f mi", miles)
                                : "\(Int(meters)) m"
                        )
                    }
                    if let target = session.target {
                        detailRow(label: "Target", value: target)
                    }

                    if session.blocked {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Blocked")
                                .font(.system(size: 11, weight: .semibold, design: .rounded))
                                .foregroundStyle(.red)
                            Text(session.blockedReason ?? "Guardrail blocked this session.")
                                .font(.system(size: 12, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                    } else if session.completed {
                        Label("Completed", systemImage: "checkmark.circle.fill")
                            .font(.system(size: 12, design: .rounded))
                            .foregroundStyle(.green)
                    } else {
                        Text("Start from the Workout app or Apple Fitness. petehome is the day plan only.")
                            .font(.system(size: 11, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 8)
                .padding(.bottom, 16)
            }
            .background(Color.black)
            .navigationTitle("Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func detailRow(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 13, design: .rounded))
                .foregroundStyle(.white)
        }
    }
}

private struct PTDetailSheet: View {
    let block: CoachTodayPTBlock
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if let tod = block.timeOfDay {
                    Text(tod.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.system(size: 11, design: .rounded))
                        .foregroundStyle(.secondary)
                        .listRowBackground(Color.clear)
                }

                ForEach(Array(block.exercises.enumerated()), id: \.offset) { _, exercise in
                    HStack {
                        Text(exercise.name)
                            .font(.system(size: 13, design: .rounded))
                            .foregroundStyle(.white)
                        Spacer()
                        Text(exercise.prescription)
                            .font(.system(size: 11, design: .rounded))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                    .listRowBackground(Color.white.opacity(0.06))
                }
            }
            .listStyle(.plain)
            .navigationTitle(block.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

private struct ReadinessInfoSheet: View {
    let readiness: CoachTodayReadiness?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if let readiness {
                        Text("Score \(readiness.score) · \(readiness.level.capitalized)")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(readiness.blocked ? .red : readinessColor(readiness.level))
                            .monospacedDigit()
                    }
                    Text("Readiness is computed on the server from sleep, load, and knee guardrails. Knee health comes first — a low score can block hard sessions.")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 8)
            }
            .background(Color.black)
            .navigationTitle("Readiness")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

private func readinessColor(_ level: String) -> Color {
    switch level {
    case "fresh": return .green
    case "moderate": return .cyan
    case "fatigued": return .orange
    case "compromised": return .red
    default: return .cyan
    }
}

#Preview {
    CoachTodayView(store: CoachTodayStore.shared)
}

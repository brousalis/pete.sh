import SwiftUI

struct TodayView: View {
    @State private var viewModel = TodayViewModel()
    @State private var showCheckIn = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isLoading && viewModel.today == nil {
                        ProgressView()
                            .padding(.top, 60)
                    } else if let error = viewModel.errorMessage, viewModel.today == nil {
                        errorState(error)
                    } else if let today = viewModel.today {
                        readinessHeader(today)
                        if viewModel.readinessBlocked {
                            blockedBanner
                        }
                        chipsRow(today)
                        sessionsSection(today)
                        ptSection(today)
                        if let briefing = today.briefing, !briefing.isEmpty {
                            briefingCard(briefing)
                        }
                    }
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Check in") { showCheckIn = true }
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                }
            }
            .refreshable {
                await viewModel.load()
            }
        }
        .task {
            await viewModel.load()
        }
        .sheet(isPresented: $showCheckIn) {
            CoachCheckInSheet { request in
                try await viewModel.submitCheckin(request)
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Sections

    private func readinessHeader(_ today: CoachTodayData) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(formattedDate(today.date))
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.secondary)
                if let readiness = today.readiness {
                    Text("Readiness \(readiness.score)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text(readiness.guidance.summary)
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(.secondary)
                } else {
                    Text("Readiness unavailable")
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                }
            }
            Spacer()
            if let level = today.readiness?.level {
                Text(level.capitalized)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(readinessColor(level).opacity(0.2))
                    .foregroundStyle(readinessColor(level))
                    .clipShape(Capsule())
            }
        }
        .padding(16)
        .background(cardBackground)
    }

    private var blockedBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text("Training hold active — knee guardrails blocked hard sessions today.")
                .font(.system(size: 13, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func chipsRow(_ today: CoachTodayData) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                if let block = today.block {
                    chip("\(block.name) · \(block.phase)")
                }
                if let load = today.load {
                    if let ctl = load.ctl {
                        chip(String(format: "CTL %.0f", ctl))
                    }
                    if let tsb = load.tsb {
                        chip(String(format: "TSB %+.0f", tsb))
                    }
                    if let acwr = load.acwr {
                        chip(String(format: "ACWR %.2f", acwr))
                    }
                }
                if let sleep = today.lastNightSleep, let hours = sleep.hours {
                    chip(String(format: "Sleep %.1fh", hours))
                }
                if let conditions = today.conditions {
                    chip(conditions.summary)
                }
            }
        }
    }

    private func sessionsSection(_ today: CoachTodayData) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sessions")
                .font(.system(size: 18, weight: .semibold, design: .rounded))

            if today.sessions.isEmpty {
                Text("No sessions planned today")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.secondary)
            } else {
                ForEach(today.sessions) { session in
                    sessionCard(session)
                }
            }
        }
    }

    private func sessionCard(_ session: CoachTodaySession) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(session.title)
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                Spacer()
                statusBadge(session.status)
            }

            HStack(spacing: 12) {
                Label(session.sport.capitalized, systemImage: sportIcon(session.sport))
                if let minutes = session.durationMinutes {
                    Text("\(minutes) min")
                }
                if let meters = session.distanceMeters {
                    Text(formatDistance(meters))
                }
            }
            .font(.system(size: 13, design: .rounded))
            .foregroundStyle(.secondary)

            if let guardrail = session.guardrail, !guardrail.passed {
                Text(guardrail.violations.first?.message ?? "Guardrail hold")
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(.orange)
            }

            if session.status == "planned" {
                HStack {
                    Button("Done") {
                        Task { await viewModel.markSession(id: session.id, status: "completed") }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .disabled(viewModel.sessionActionInFlight == session.id)

                    Button("Skip") {
                        Task { await viewModel.markSession(id: session.id, status: "skipped") }
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.sessionActionInFlight == session.id)
                }
            }
        }
        .padding(14)
        .background(cardBackground)
    }

    private func ptSection(_ today: CoachTodayData) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("PT & armor")
                .font(.system(size: 18, weight: .semibold, design: .rounded))

            if today.ptProtocols.isEmpty {
                Text("No PT blocks for today")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.secondary)
            } else {
                ForEach(today.ptProtocols) { block in
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle(isOn: Binding(
                            get: { viewModel.ptCompletedIds.contains(block.id) },
                            set: { _ in viewModel.togglePtProtocol(block.id) }
                        )) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(block.name)
                                    .font(.system(size: 15, weight: .medium, design: .rounded))
                                Text(block.timeOfDay.capitalized)
                                    .font(.system(size: 12, design: .rounded))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .tint(.cyan)

                        ForEach(block.exercises.prefix(3)) { exercise in
                            Text("· \(exercise.name)")
                                .font(.system(size: 12, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(12)
                    .background(cardBackground)
                }

                Text("PT completion saves with your next check-in.")
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func briefingCard(_ briefing: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Briefing")
                .font(.system(size: 16, weight: .semibold, design: .rounded))
            Text(briefing)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBackground)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 36))
                .foregroundStyle(.orange)
            Text("Could not load today")
                .font(.system(size: 17, weight: .semibold, design: .rounded))
            Text(message)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                Task { await viewModel.load() }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(.top, 40)
    }

    // MARK: - Helpers

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: 14)
            .fill(Color.white.opacity(0.06))
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.08))
            .clipShape(Capsule())
    }

    private func statusBadge(_ status: String) -> some View {
        Text(status.capitalized)
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.white.opacity(0.1))
            .clipShape(Capsule())
    }

    private func readinessColor(_ level: String) -> Color {
        switch level {
        case "green", "high": return .green
        case "yellow", "moderate": return .yellow
        case "red", "low", "blocked": return .red
        default: return .cyan
        }
    }

    private func sportIcon(_ sport: String) -> String {
        switch sport {
        case "run": return "figure.run"
        case "bike": return "figure.outdoor.cycle"
        case "swim": return "figure.pool.swim"
        case "strength": return "dumbbell.fill"
        default: return "figure.mixed.cardio"
        }
    }

    private func formatDistance(_ meters: Double) -> String {
        let miles = meters / 1609.34
        return String(format: "%.1f mi", miles)
    }

    private func formattedDate(_ iso: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: iso) else { return iso }
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }
}

#Preview {
    TodayView()
}

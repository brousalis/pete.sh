import SwiftUI

struct ActivityDetailView: View {
    let workoutId: String
    let onBack: () -> Void

    @State private var viewModel: ActivityDetailViewModel

    init(workoutId: String, onBack: @escaping () -> Void) {
        self.workoutId = workoutId
        self.onBack = onBack
        _viewModel = State(initialValue: ActivityDetailViewModel(workoutId: workoutId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.detailData == nil {
                loadingView
            } else if viewModel.is404 {
                notFoundView
            } else if let error = viewModel.error, viewModel.detailData == nil {
                errorView(message: error)
            } else if let workout = viewModel.workout {
                detailContent(workout: workout)
            }
        }
        .background(Color.black)
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadDetail()
        }
        .task {
            await viewModel.loadDetail()
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(.white)
                .scaleEffect(1.2)
            Text("Loading workout...")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var notFoundView: some View {
        VStack(spacing: 16) {
            Image(systemName: "questionmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Workout not found")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)

            Text("It may not be synced yet.")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button(action: onBack) {
                Text("Back")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue.opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundStyle(.orange)

            Text(message)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                Task { await viewModel.loadDetail() }
            } label: {
                Text("Retry")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.orange.opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Button(action: onBack) {
                Text("Back")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private func detailContent(workout: ActivityWorkoutDetail) -> some View {
        ScrollView {
            VStack(spacing: 12) {
                heroCard(workout: workout)
                let advice = WorkoutAdviceGenerator.generate(
                    workout: workout,
                    analytics: viewModel.analytics,
                    hrZones: workout.hrZones
                )
                if !advice.keyTakeaways.isEmpty || viewModel.hasAnalytics {
                    coachAnalysisCard(advice: advice)
                }
                if viewModel.hasAnalytics,
                   let analytics = viewModel.analytics,
                   !analytics.timeSeriesData.isEmpty,
                   viewModel.hrZonesConfig != nil {
                    hrChartCard(analytics: analytics)
                }
                if viewModel.hasAnalytics, let analytics = viewModel.analytics {
                    trainingAnalysisCard(analytics: analytics)
                }
                if let analytics = viewModel.analytics, !analytics.insights.isEmpty {
                    insightsCard(analytics: analytics)
                }
                if viewModel.hasRoute, let route = viewModel.route {
                    routeCard(route: route)
                }
                if viewModel.hasAnalytics,
                   let analytics = viewModel.analytics,
                   !analytics.splits.isEmpty,
                   viewModel.isRunning {
                    splitsCard(analytics: analytics)
                }
                if viewModel.hasAnalytics, let analytics = viewModel.analytics {
                    performanceMetricsCard(analytics: analytics)
                }
                if viewModel.hasEvents {
                    workoutStructureCard()
                }
                if viewModel.hasRunningDynamics, let workout = viewModel.workout {
                    runningDynamicsCard(workout: workout)
                }
            }
            .padding()
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    onBack()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .semibold))
                        Text("Back")
                            .font(.system(size: 14, design: .rounded))
                    }
                    .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func heroCard(workout: ActivityWorkoutDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Spacer()
                Text(formattedDateRange(workout))
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            HStack(alignment: .top, spacing: 8) {
                Text(viewModel.workoutLabel)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                HStack(spacing: 6) {
                    if viewModel.isRunning && viewModel.isOutdoor {
                        badge("Outdoor", color: .cyan)
                    }
                    if viewModel.isRunning && viewModel.isIndoor {
                        badge("Indoor", color: .blue)
                    }
                    if let effort = workout.effortScore, effort > 0 {
                        badge(String(format: "%.1f/10", effort), color: effortColor(effort))
                    }
                    if let elev = workout.elevationGainMeters, elev > 0 {
                        badge("\(Int(elev * 3.28084)) ft", color: .green)
                    }
                }
            }

            Divider()
                .background(Color.white.opacity(0.1))

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                statCell("Duration", value: formatDuration(workout.duration))
                statCell("Calories", value: "\(Int(workout.activeCalories)) kcal", valueColor: .orange)
                if let dist = workout.distanceMiles, dist > 0 {
                    statCell("Distance", value: String(format: "%.2f mi", dist), valueColor: .blue)
                }
                if let hr = workout.hrAverage {
                    statCell("Avg HR", value: "\(hr) bpm", valueColor: .red)
                }
                if viewModel.isRunning, let pace = workout.paceAverage, pace > 0 {
                    statCell("Avg Pace", value: formatPace(pace), valueColor: .green)
                }
                if viewModel.isRunning, let cadence = workout.cadenceAverage {
                    statCell("Cadence", value: "\(cadence) spm")
                }
                if viewModel.isCycling, let speed = workout.cyclingAvgSpeed {
                    statCell("Avg Speed", value: String(format: "%.1f mph", speed), valueColor: .cyan)
                }
                if viewModel.isCycling, let power = workout.cyclingAvgPower {
                    statCell("Avg Power", value: "\(Int(power)) W", valueColor: .orange)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func badge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .medium, design: .rounded))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }

    private func statCell(_ label: String, value: String, valueColor: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(valueColor)
        }
    }

    private func coachAnalysisCard(advice: WorkoutAdvice) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(advice.keyTakeaways.enumerated()), id: \.offset) { _, takeaway in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: takeaway.iconName)
                        .font(.system(size: 12))
                        .foregroundStyle(takeaway.iconColor)
                        .frame(width: 16)
                    Text(takeaway.text)
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
            Divider()
                .background(Color.white.opacity(0.1))
            HStack(spacing: 12) {
                Label(advice.trainingTypeLabel, systemImage: advice.trainingTypeIcon)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(.white)
                Text("|")
                    .foregroundStyle(.secondary)
                Label("\(advice.recoveryHours)h recovery", systemImage: "clock")
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(.secondary)
                Text("|")
                    .foregroundStyle(.secondary)
                Text(advice.nextWorkoutSuggestion)
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func hrChartCard(analytics: EnhancedWorkoutAnalyticsDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "heart.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.red)
                Text("Heart Rate")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                Spacer()
                if let hr = viewModel.workout?.hrAverage {
                    Text("\(hr) BPM AVG")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.red)
                        .monospacedDigit()
                }
            }
            ZoneColoredHrChartView(
                data: analytics.timeSeriesData,
                hrZonesConfig: viewModel.hrZonesConfig!,
                hrAverage: viewModel.workout?.hrAverage
            )
            .frame(height: 180)

            if let zones = viewModel.workout?.hrZones, !zones.isEmpty {
                HrZonesBarView(zones: zones)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func trainingAnalysisCard(analytics: EnhancedWorkoutAnalyticsDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 12))
                Text("Training Analysis")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                trainingMetric("Training Load", value: "\(analytics.trainingImpulse.trimp)", qualifier: analytics.trainingImpulse.intensity)
                trainingMetric("Cardiac Drift", value: "\(analytics.cardiacDrift.driftPercentage > 0 ? "+" : "")\(Int(analytics.cardiacDrift.driftPercentage))%", qualifier: analytics.cardiacDrift.interpretation, sub: "\(Int(analytics.cardiacDrift.firstHalfAvgHr)) → \(Int(analytics.cardiacDrift.secondHalfAvgHr)) bpm")
                trainingMetric("Aerobic Decoupling", value: "\(Int(analytics.aerobicDecoupling.decouplingPercentage))%", qualifier: analytics.aerobicDecoupling.interpretation)
                trainingMetric("Efficiency Factor", value: String(format: "%.3f", analytics.efficiencyFactor))
                if viewModel.isRunning && analytics.cadenceAnalysis.average > 0 {
                    trainingMetric("Cadence", value: "\(Int(analytics.cadenceAnalysis.average)) spm", qualifier: analytics.cadenceAnalysis.optimalRange ? "Optimal" : "Low")
                }
                trainingMetric("HR Variability", value: "\(analytics.hrVariability.range) bpm", sub: "\(analytics.hrVariability.min)–\(analytics.hrVariability.max)")
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func trainingMetric(_ label: String, value: String, qualifier: String? = nil, sub: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, design: .rounded))
                .foregroundStyle(.secondary)
            HStack(spacing: 6) {
                Text(value)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                if let q = qualifier {
                    Text(q)
                        .font(.system(size: 9, weight: .medium, design: .rounded))
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(qualifierColor(q).opacity(0.2))
                        .foregroundStyle(qualifierColor(q))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            if let s = sub {
                Text(s)
                    .font(.system(size: 10, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func qualifierColor(_ q: String) -> Color {
        switch q.lowercased() {
        case "minimal", "excellent", "good", "optimal": return .green
        case "moderate", "consistent": return .blue
        case "significant", "variable": return .orange
        case "excessive", "poor": return .red
        default: return .secondary
        }
    }

    private func insightsCard(analytics: EnhancedWorkoutAnalyticsDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 12))
                Text("Insights")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
            }
            ForEach(Array(analytics.insights.enumerated()), id: \.offset) { _, insight in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: iconForInsightCategory(insight.category))
                            .font(.system(size: 12))
                            .foregroundStyle(colorForInsightCategory(insight.category))
                        Text(insight.title)
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    Text(insight.description)
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func iconForInsightCategory(_ category: String) -> String {
        switch category {
        case "strength": return "checkmark.circle"
        case "improvement": return "target"
        case "warning": return "exclamationmark.triangle"
        case "info": return "info.circle"
        default: return "info.circle"
        }
    }

    private func colorForInsightCategory(_ category: String) -> Color {
        switch category {
        case "strength": return .green
        case "improvement": return .orange
        case "warning": return .orange
        case "info": return .blue
        default: return .secondary
        }
    }

    private func routeCard(route: RouteDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Route")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)

            if let samples = route.samples, samples.count >= 2 {
                WorkoutRouteMapView(samples: samples)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                if let gain = route.totalElevationGain, let loss = route.totalElevationLoss {
                    HStack(spacing: 16) {
                        Label("+\(Int(gain * 3.28084)) ft gain", systemImage: "arrow.up")
                        Label("-\(Int(loss * 3.28084)) ft loss", systemImage: "arrow.down")
                    }
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(.secondary)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func splitsCard(analytics: EnhancedWorkoutAnalyticsDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Mile Splits")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
            SplitsChartView(splits: analytics.splits)
                .frame(height: 150)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func performanceMetricsCard(analytics: EnhancedWorkoutAnalyticsDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Performance Metrics")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
            TimeSeriesChartView(
                data: analytics.timeSeriesData,
                showHr: viewModel.workout?.hrAverage != nil,
                showCadence: viewModel.isRunning && viewModel.workout?.cadenceAverage != nil
            )
            .frame(height: 180)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func workoutStructureCard() -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Workout Structure")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
            if let events = viewModel.detailData?.workoutEvents,
               let workout = viewModel.workout {
                WorkoutStructureBarView(
                    events: events,
                    totalDuration: workout.duration,
                    startDate: workout.startDate
                )
                .frame(height: 40)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func runningDynamicsCard(workout: ActivityWorkoutDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Running Dynamics")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
            HStack(spacing: 16) {
                if let stride = workout.strideLengthAvg {
                    dynamicsGauge("Stride", value: String(format: "%.1fm", stride), color: .blue)
                }
                if let power = workout.runningPowerAvg {
                    dynamicsGauge("Power", value: "\(Int(power))W", color: .orange)
                }
                if let gct = workout.groundContactTimeAvg {
                    dynamicsGauge("GCT", value: "\(Int(gct))ms", color: .green)
                }
                if let vo = workout.verticalOscillationAvg {
                    dynamicsGauge("Vert Osc", value: String(format: "%.1fcm", vo), color: .purple)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func dynamicsGauge(_ label: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 10, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func formattedDateRange(_ workout: ActivityWorkoutDetail) -> String {
        let start = workout.startDate.iso8601Date ?? Date()
        let end = workout.endDate.iso8601Date ?? Date()
        let df = DateFormatter()
        df.dateFormat = "EEE, MMM d"
        let tf = DateFormatter()
        tf.timeStyle = .short
        return "\(df.string(from: start)) · \(tf.string(from: start)) – \(tf.string(from: end))"
    }

    private func formatDuration(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        if m >= 60 {
            let h = m / 60
            let mm = m % 60
            return "\(h)h \(mm)m"
        }
        return "\(m)m \(s)s"
    }

    private func formatPace(_ minPerMile: Double) -> String {
        guard minPerMile > 0, minPerMile < 30 else { return "--:--" }
        let mins = Int(minPerMile)
        let secs = Int((minPerMile - Double(mins)) * 60)
        return String(format: "%d:%02d", mins, secs)
    }

    private func effortColor(_ effort: Double) -> Color {
        if effort >= 8 { return .red }
        if effort >= 6 { return .orange }
        if effort >= 4 { return .yellow }
        return .green
    }
}

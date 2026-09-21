import SwiftUI
import HealthKit

struct TodayView: View {
    @State private var viewModel = TodayViewModel()
    private let syncManager = HealthKitSyncManager.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if !syncManager.isAuthorized {
                        healthKitPrompt
                    } else if viewModel.isLoading && viewModel.todayMetrics == nil {
                        ProgressView()
                            .padding(.top, 60)
                    } else {
                        metricsCard
                        recentWorkoutsSection
                    }
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("Today")
            .refreshable {
                await viewModel.loadAll()
            }
        }
        .task {
            await viewModel.loadAll()
        }
    }

    // MARK: - HealthKit Not Authorized

    private var healthKitPrompt: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart.text.square")
                .font(.system(size: 48))
                .foregroundStyle(.red.opacity(0.6))

            Text("HealthKit Access Required")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)

            Text("Grant access to view your health data and workouts.")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                Task {
                    _ = await syncManager.requestHealthKitAuthorization()
                    await viewModel.loadAll()
                }
            } label: {
                Text("Open Health Settings")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.red.opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(.top, 40)
    }

    // MARK: - Today's Metrics Card

    private var metricsCard: some View {
        VStack(spacing: 16) {
            // Activity Rings Row
            HStack(spacing: 20) {
                ringItem(
                    label: "Move",
                    value: viewModel.todayMetrics.map { "\(Int($0.activeCalories))" } ?? "–",
                    unit: "cal",
                    progress: viewModel.moveProgress,
                    color: .red
                )

                ringItem(
                    label: "Exercise",
                    value: viewModel.todayMetrics.map { "\($0.exerciseMinutes)" } ?? "–",
                    unit: "min",
                    progress: viewModel.exerciseProgress,
                    color: .green
                )

                ringItem(
                    label: "Stand",
                    value: viewModel.todayMetrics.map { "\($0.standHours)" } ?? "–",
                    unit: "hrs",
                    progress: viewModel.standProgress,
                    color: .cyan
                )
            }

            Divider()
                .background(Color.white.opacity(0.1))

            // Health Metrics Grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                if let metrics = viewModel.todayMetrics {
                    metricItem(icon: "figure.walk", label: "Steps", value: "\(metrics.steps)", color: .orange)

                    if let rhr = metrics.restingHeartRate {
                        metricItem(icon: "heart.fill", label: "Resting HR", value: "\(rhr)", color: .red)
                    }

                    if let hrv = metrics.heartRateVariability {
                        metricItem(icon: "waveform.path.ecg", label: "HRV", value: "\(Int(hrv))", color: .pink)
                    }

                    if let weight = metrics.bodyMassLbs {
                        metricItem(icon: "scalemass.fill", label: "Weight", value: String(format: "%.1f", weight), color: .purple)
                    }
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.06))
        )
    }

    // MARK: - Ring Item

    private func ringItem(label: String, value: String, unit: String, progress: Double, color: Color) -> some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 6)
                    .frame(width: 52, height: 52)

                Circle()
                    .trim(from: 0, to: min(progress, 1.0))
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 52, height: 52)
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 0) {
                    Text(value)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                    Text(unit)
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }

            Text(label)
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Metric Item

    private func metricItem(icon: String, label: String, value: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(color)

            Text(value)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.white)

            Text(label)
                .font(.system(size: 10, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    // MARK: - Recent Workouts

    private var recentWorkoutsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Workouts")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)

            if viewModel.recentWorkouts.isEmpty && !viewModel.isLoading {
                Text("No workouts in the last 14 days")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 20)
                    .frame(maxWidth: .infinity)
            } else {
                ForEach(viewModel.workoutsByDate, id: \.date) { group in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(relativeDateLabel(group.date))
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)

                        ForEach(group.workouts, id: \.uuid) { workout in
                            WorkoutCard(
                                workout: workout,
                                isSynced: viewModel.isSynced(workout)
                            )
                        }
                    }
                    .padding(.bottom, 4)
                }
            }
        }
    }

    // MARK: - Date Helpers

    private func relativeDateLabel(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE, MMM d"
            return formatter.string(from: date)
        }
    }
}

#Preview {
    TodayView()
        .preferredColorScheme(.dark)
}

import SwiftUI

struct ActivityListView: View {
    @State private var viewModel = ActivityListViewModel()
    let onWorkoutSelect: (String) -> Void
    let onOpenSync: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if viewModel.isLoading && viewModel.workouts.isEmpty {
                    loadingView
                } else if let error = viewModel.error {
                    errorView(message: error)
                } else if viewModel.workouts.isEmpty {
                    emptyView
                } else {
                    workoutsList
                }
            }
            .padding()
        }
        .background(Color.black)
        .navigationTitle("Activity")
        .refreshable {
            await viewModel.loadWorkouts()
        }
        .task {
            await viewModel.loadWorkouts()
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(.white)
                .scaleEffect(1.2)
            Text("Loading activity...")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
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
                Task { await viewModel.loadWorkouts() }
            } label: {
                Text("Retry")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.orange.opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "figure.run")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No workouts yet")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)

            Text("Sync from the Sync tab to see your activity here.")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button {
                onOpenSync()
            } label: {
                Text("Open Sync")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.green.opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }

    private var workoutsList: some View {
        ForEach(viewModel.workoutsByDate, id: \.date) { group in
            VStack(alignment: .leading, spacing: 8) {
                Text(relativeDateLabel(group.date))
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)

                ForEach(group.workouts) { workout in
                    ActivityWorkoutRow(workout: workout)
                        .onTapGesture {
                            onWorkoutSelect(workout.id)
                        }
                }
            }
            .padding(.bottom, 4)
        }
    }

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

struct ActivityWorkoutRow: View {
    let workout: ActivityWorkoutSummary

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconForType(workout.workoutType))
                .font(.system(size: 20))
                .foregroundStyle(iconColorForType(workout.workoutType))
                .frame(width: 36, height: 36)
                .background(iconColorForType(workout.workoutType).opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(WorkoutLabels.displayLabel(for: workout.workoutType))
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                }

                HStack(spacing: 8) {
                    Label(formattedDuration(workout.duration), systemImage: "clock")
                    if workout.activeCalories > 0 {
                        Label("\(Int(workout.activeCalories)) cal", systemImage: "flame.fill")
                    }
                    if let distance = workout.distanceMiles, distance > 0.1 {
                        Label(String(format: "%.1f mi", distance), systemImage: "arrow.forward")
                    }
                }
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)

                Text(formattedTime(workout.startDate))
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(.tertiary)
            }

            Spacer()
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "running": return "figure.run"
        case "walking": return "figure.walk"
        case "hiking": return "figure.hiking"
        case "cycling": return "figure.outdoor.cycle"
        case "functionalStrengthTraining", "traditionalStrengthTraining": return "dumbbell.fill"
        case "coreTraining": return "figure.core.training"
        case "highIntensityIntervalTraining": return "bolt.heart.fill"
        case "rowing": return "figure.rower"
        case "stairClimbing": return "figure.stairs"
        case "elliptical": return "figure.elliptical"
        case "swimming": return "figure.pool.swim"
        default: return "figure.mixed.cardio"
        }
    }

    private func iconColorForType(_ type: String) -> Color {
        switch type {
        case "running": return .green
        case "walking", "hiking": return .orange
        case "cycling": return .blue
        case "functionalStrengthTraining", "traditionalStrengthTraining": return .purple
        case "coreTraining": return .yellow
        case "highIntensityIntervalTraining": return .red
        case "rowing": return .cyan
        default: return .gray
        }
    }

    private func formattedDuration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        if minutes >= 60 {
            let hours = minutes / 60
            let mins = minutes % 60
            return "\(hours)h \(mins)m"
        }
        return "\(minutes)m"
    }

    private func formattedTime(_ dateString: String) -> String {
        guard let date = dateString.iso8601Date else { return dateString }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

#Preview {
    ActivityListView(onWorkoutSelect: { _ in }, onOpenSync: {})
}

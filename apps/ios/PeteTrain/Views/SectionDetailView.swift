import SwiftUI

struct SectionDetailView: View {
    let section: WorkoutSection
    var viewModel: WorkoutViewModel
    
    private var completedInSection: Int {
        section.exercises.filter { viewModel.isExerciseCompleted($0) }.count
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                if let subtitle = section.subtitle {
                    Text(subtitle)
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.orange)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                }
                
                ForEach(section.exercises) { exercise in
                    ExerciseRow(
                        exercise: exercise,
                        isCompleted: viewModel.isExerciseCompleted(exercise)
                    ) {
                        viewModel.toggleExercise(exercise)
                    }
                }
            }
            .padding(.horizontal, 2)
        }
        .navigationTitle(section.name)
        .toolbar {
            ToolbarItem(placement: .bottomBar) {
                Text("\(completedInSection)/\(section.exercises.count)")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(completedInSection == section.exercises.count ? .green : .orange)
            }
        }
    }
}

#Preview {
    NavigationStack {
        SectionDetailView(
            section: WorkoutData.day1.sections[1],
            viewModel: WorkoutViewModel()
        )
    }
    .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

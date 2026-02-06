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
    let mockSection = WorkoutSection(
        name: "Preview Workout",
        sectionType: .workout,
        exercises: [
            Exercise(name: "Pull-ups", sets: 3, reps: "8"),
            Exercise(name: "Push-ups", sets: 3, reps: "12")
        ]
    )
    return NavigationStack {
        SectionDetailView(
            section: mockSection,
            viewModel: WorkoutViewModel()
        )
    }
    .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

import SwiftUI
import SwiftData
import WatchKit

struct DayView: View {
    @Bindable var viewModel: WorkoutViewModel
    @Environment(\.modelContext) private var modelContext
    @State private var healthKit = HealthKitManager.shared

    // Horizontal paging
    @State private var currentPage = 0

    // Focus state for Digital Crown
    @FocusState private var focusedPage: Int?

    // Sheet items
    @State private var weightInputExercise: Exercise?

    // PR celebration state
    @State private var prCelebration: PRCelebrationData?

    // Dev mode settings
    @AppStorage("devModeEnabled") private var devModeEnabled = false
    @AppStorage("devDayOverride") private var devDayOverride = 1

    // Day mismatch alert
    @State private var showDayMismatchAlert = false
    @State private var expectedDayNumber = 0

    struct PRCelebrationData: Identifiable {
        let id = UUID()
        let exerciseName: String
        let recordType: String
        let newValue: String
        let previousValue: String?
    }

    private var isRecoveryDay: Bool {
        viewModel.currentDay.id == 4 || viewModel.currentDay.id == 7
    }

    private var sections: [WorkoutSection] {
        viewModel.currentDay.sections
    }

    // Completed exercise IDs as Set for efficient lookup
    private var completedIds: Set<String> {
        let array: [String] = viewModel.todayRecord?.completedExerciseIds ?? []
        return Set<String>(array)
    }

    private var skippedIds: Set<String> {
        let array: [String] = viewModel.todayRecord?.skippedExerciseIds ?? []
        return Set<String>(array)
    }

    var body: some View {
        NavigationStack {
            // 2-page TabView design
            TabView(selection: $currentPage) {
                // Page 0: Workout (combined day header + exercise list)
                WorkoutPage(
                    viewModel: viewModel,
                    completedIds: completedIds,
                    skippedIds: skippedIds,
                    isRecoveryDay: isRecoveryDay,
                    getLastWeight: { getLastWeight(for: $0) },
                    getLastReps: { getLastReps(for: $0) },
                    onToggle: { handleExerciseToggle($0) },
                    onSkip: { viewModel.skipExercise($0) },
                    onLogWeight: { weightInputExercise = $0 },
                    onCompleteAll: { viewModel.completeSection($0) },
                    onUncompleteAll: { viewModel.uncompleteSection($0) },
                    onResetAll: { viewModel.resetAllExercises() }
                )
                .focused($focusedPage, equals: 0)
                .tag(0)

                // Page 1: Settings + History
                SettingsHistoryView()
                    .focused($focusedPage, equals: 1)
                    .tag(1)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .onChange(of: currentPage) { _, newPage in
                focusedPage = newPage
            }
            .navigationTitle("Day \(viewModel.currentDay.id)")
            .navigationDestination(for: Exercise.self) { exercise in
                ExerciseHistoryView(exercise: exercise)
            }
            .onAppear {
                checkForDayMismatch()
                focusedPage = currentPage
            }
            .onChange(of: devModeEnabled) { _, _ in
                viewModel.refreshDay()
            }
            .onChange(of: devDayOverride) { _, _ in
                viewModel.refreshDay()
            }
            .sheet(item: $weightInputExercise) { exercise in
                NavigationStack {
                    WeightInputSheet(
                        exercise: exercise,
                        dayNumber: viewModel.currentDay.id
                    ) { log in
                        checkForPR(log: log, exercise: exercise)
                    }
                }
            }
            .overlay {
                if let pr = prCelebration {
                    PRCelebrationView(
                        exerciseName: pr.exerciseName,
                        recordType: pr.recordType,
                        newValue: pr.newValue,
                        previousValue: pr.previousValue,
                        onDismiss: {
                            withAnimation {
                                prCelebration = nil
                            }
                        }
                    )
                    .transition(.opacity)
                }
            }
            .alert("Switch to Today?", isPresented: $showDayMismatchAlert) {
                Button("Stay on Day \(viewModel.currentDay.id)") {
                    // Do nothing, keep current day
                }
                Button("Switch to Day \(expectedDayNumber)") {
                    viewModel.refreshDay()
                }
            } message: {
                Text("You were on Day \(viewModel.currentDay.id), but today is Day \(expectedDayNumber).")
            }
        }
    }

    // MARK: - Day Mismatch Check

    private func checkForDayMismatch() {
        let todayDayNumber = CycleManager.currentDayNumber()
        let currentDayNumber = viewModel.currentDay.id

        if todayDayNumber != currentDayNumber {
            expectedDayNumber = todayDayNumber
            showDayMismatchAlert = true
        }
    }

    // MARK: - Exercise Toggle Handler

    private func handleExerciseToggle(_ exercise: Exercise) {
        viewModel.toggleExercise(exercise)
    }

    // MARK: - PR Check

    private func checkForPR(log: ExerciseLog, exercise: Exercise) {
        let prManager = PRManager.shared
        prManager.configure(with: modelContext)

        if let newPR = prManager.checkAndRecordPR(for: log) {
            prCelebration = PRCelebrationData(
                exerciseName: exercise.name,
                recordType: newPR.recordType.label,
                newValue: newPR.formattedValue,
                previousValue: nil
            )
        }
    }

    private func getLastWeight(for exercise: Exercise) -> Double? {
        return getLastLog(for: exercise)?.weightUsed
    }

    private func getLastReps(for exercise: Exercise) -> Int? {
        return getLastLog(for: exercise)?.repsCompleted
    }

    private func getLastLog(for exercise: Exercise) -> ExerciseLog? {
        let exerciseId = exercise.id
        let predicate = #Predicate<ExerciseLog> { log in
            log.exerciseId == exerciseId
        }

        var descriptor = FetchDescriptor<ExerciseLog>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        descriptor.fetchLimit = 1

        do {
            let logs = try modelContext.fetch(descriptor)
            return logs.first
        } catch {
            return nil
        }
    }
}

// MARK: - Workout Page (Combined Day Header + Exercise List)

struct WorkoutPage: View {
    @Bindable var viewModel: WorkoutViewModel
    let completedIds: Set<String>
    let skippedIds: Set<String>
    let isRecoveryDay: Bool
    let getLastWeight: (Exercise) -> Double?
    let getLastReps: ((Exercise) -> Int?)?
    let onToggle: (Exercise) -> Void
    let onSkip: (Exercise) -> Void
    let onLogWeight: (Exercise) -> Void
    let onCompleteAll: (WorkoutSection) -> Void
    let onUncompleteAll: (WorkoutSection) -> Void
    let onResetAll: () -> Void

    @Environment(\.modelContext) private var modelContext

    private var day: Day {
        viewModel.currentDay
    }

    private var sections: [WorkoutSection] {
        day.sections
    }

    private var allExercises: [Exercise] {
        sections.flatMap { $0.exercises }
    }

    private var totalCompleted: Int {
        allExercises.filter { completedIds.contains($0.id) }.count
    }

    private var totalEffective: Int {
        allExercises.filter { !skippedIds.contains($0.id) }.count
    }

    private var isAllComplete: Bool {
        totalCompleted >= totalEffective && totalEffective > 0
    }

    var body: some View {
        List {
            // Day header section
            dayHeaderSection
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 0, leading: 4, bottom: 8, trailing: 4))

            // Exercise sections
            ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                SectionHeaderRow(
                    section: section,
                    completedIds: completedIds,
                    skippedIds: skippedIds
                )
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: index == 0 ? 4 : 12, leading: 0, bottom: 4, trailing: 0))

                SectionExercisesView(
                    section: section,
                    completedIds: completedIds,
                    skippedIds: skippedIds,
                    getLastWeight: getLastWeight,
                    getLastReps: getLastReps,
                    onToggle: onToggle,
                    onSkip: onSkip,
                    onLogWeight: onLogWeight
                )
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 4, trailing: 0))
            }

            // Footer buttons
            footerButtons
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 40, trailing: 0))
        }
        .listStyle(.plain)
    }

    // MARK: - Day Header Section

    @ViewBuilder
    private var dayHeaderSection: some View {
        HStack(spacing: 10) {
            // Progress ring
            ZStack {
                Circle()
                    .stroke(Color.green.opacity(0.2), lineWidth: 3)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(isAllComplete ? Color.green : Color.orange, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                if isAllComplete {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.green)
                } else {
                    Text("\(totalCompleted)")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: 28, height: 28)

            // Day info
            VStack(alignment: .leading, spacing: 1) {
                Text(day.shortName)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.white)

                HStack(spacing: 4) {
                    Text("\(totalCompleted)/\(totalEffective)")
                        .font(.system(size: 11, design: .rounded))
                        .foregroundStyle(.secondary)

                    if viewModel.skippedCount > 0 {
                        Text("• \(viewModel.skippedCount) skipped")
                            .font(.system(size: 11, design: .rounded))
                            .foregroundStyle(.orange.opacity(0.8))
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }

    private var progress: Double {
        guard totalEffective > 0 else { return 0 }
        return Double(totalCompleted) / Double(totalEffective)
    }

    // MARK: - Footer Buttons

    @ViewBuilder
    private var footerButtons: some View {
        VStack(spacing: 10) {
            if isAllComplete {
                // Reset when all complete
                Button {
                    onResetAll()
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 14))
                        Text("Reset All")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                    }
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.orange.opacity(0.15))
                    )
                }
                .buttonStyle(.plain)

                // Completion celebration
                VStack(spacing: 4) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.green)
                    Text("Workout Complete!")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(.green)
                }
                .padding(.top, 8)
            } else if viewModel.canUndo {
                // Undo button
                Button {
                    viewModel.undoLastToggle()
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.uturn.backward")
                            .font(.system(size: 12))
                        Text("Undo")
                            .font(.system(size: 12, design: .rounded))
                    }
                    .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: WorkoutRecord.self, ExerciseLog.self, PersonalRecord.self, configurations: config)

    let viewModel = WorkoutViewModel()
    viewModel.configure(with: container.mainContext)

    return DayView(viewModel: viewModel)
        .modelContainer(container)
}

import SwiftUI

struct CoachCheckInSheet: View {
    @Environment(\.dismiss) private var dismiss

    let onSubmit: (CoachCheckInRequest) async throws -> CoachCheckInResult

    @State private var site = "r_knee_medial"
    @State private var pain = 0.0
    @State private var context = "rest"
    @State private var swelling = false
    @State private var locking = false
    @State private var instability = false
    @State private var rpe: Int?
    @State private var sleepQuality: Int?
    @State private var notes = ""

    @State private var submitting = false
    @State private var submitError: String?
    @State private var result: CoachCheckInResult?

    private let symptomSites: [(id: String, label: String)] = [
        ("r_knee_medial", "R knee medial"),
        ("l_knee_medial", "L knee medial"),
        ("r_knee_anterior", "R knee anterior"),
        ("l_knee_anterior", "L knee anterior"),
        ("pes_anserine", "Pes anserine"),
        ("hamstring", "Hamstring"),
    ]

    var body: some View {
        NavigationStack {
            Group {
                if let result {
                    resultView(result)
                } else {
                    formView
                }
            }
            .background(Color.black)
            .navigationTitle("Check in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var formView: some View {
        Form {
            Section("Knee") {
                Picker("Site", selection: $site) {
                    ForEach(symptomSites, id: \.id) { item in
                        Text(item.label).tag(item.id)
                    }
                }

                VStack(alignment: .leading) {
                    Text("Pain: \(Int(pain))")
                    Slider(value: $pain, in: 0...10, step: 1)
                }

                Picker("Context", selection: $context) {
                    Text("At rest").tag("rest")
                    Text("During session").tag("during")
                    Text("After session").tag("after")
                    Text("Next morning").tag("next_morning")
                }

                Toggle("Swelling", isOn: $swelling)
                Toggle("Locking", isOn: $locking)
                Toggle("Instability", isOn: $instability)
            }

            Section("How you feel") {
                optionalRating("RPE", selection: $rpe)
                optionalRating("Sleep quality", selection: $sleepQuality)
                TextField("Notes", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            if let submitError {
                Section {
                    Text(submitError)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(.red)
                }
            }

            Section {
                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        Spacer()
                        if submitting {
                            ProgressView()
                        } else {
                            Text("Submit check-in")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(submitting)
            }
        }
        .scrollContentBackground(.hidden)
    }

    @ViewBuilder
    private func optionalRating(_ label: String, selection: Binding<Int?>) -> some View {
        Picker(label, selection: Binding(
            get: { selection.wrappedValue ?? 0 },
            set: { newValue in selection.wrappedValue = newValue == 0 ? nil : newValue }
        )) {
            Text("—").tag(0)
            ForEach(1...10, id: \.self) { value in
                Text("\(value)").tag(value)
            }
        }
    }

    private func resultView(_ result: CoachCheckInResult) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if result.redFlag {
                    banner(
                        title: "Stop training",
                        message: "Mechanical signs were reported. Contact your PT or sports MD before loading the knee.",
                        color: .red
                    )
                }

                if result.planChanged {
                    banner(
                        title: "Plan updated",
                        message: result.downgradedSessions.map(\.title).joined(separator: ", "),
                        color: .orange
                    )
                }

                if let readiness = result.readiness {
                    Text("Readiness \(readiness.score) · \(readiness.level.capitalized)")
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                    Text(readiness.guidance.summary)
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(.secondary)
                }

                ForEach(result.guardrailMessages, id: \.message) { violation in
                    banner(title: violation.severity.capitalized, message: violation.message, color: .orange)
                }

                Button("Done") { dismiss() }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding()
        }
    }

    private func banner(title: String, message: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(color)
            Text(message)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func submit() async {
        submitting = true
        submitError = nil
        defer { submitting = false }

        let request = CoachCheckInRequest(
            symptoms: [
                CoachCheckInSymptom(
                    site: site,
                    painScore: Int(pain),
                    context: context,
                    swelling: swelling,
                    instability: instability,
                    locking: locking,
                    notes: notes.isEmpty ? nil : notes
                ),
            ],
            feedback: CoachCheckInFeedback(
                rpe: rpe,
                sleepQuality: sleepQuality,
                notes: notes.isEmpty ? nil : notes
            )
        )

        do {
            result = try await onSubmit(request)
        } catch {
            submitError = error.localizedDescription
        }
    }
}

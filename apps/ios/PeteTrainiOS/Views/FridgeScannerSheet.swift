import SwiftUI
import UIKit

/// Native SwiftUI sheet for fridge scanning with voice and photo tabs.
/// Presented via .sheet, same pattern as SyncSheetView.
struct FridgeScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    var scanManager: FridgeScanManager
    var onScanComplete: (([String], String) -> Void)?

    @State private var selectedTab: ScanTab = .voice
    @State private var showCamera = false

    enum ScanTab: String, CaseIterable {
        case voice = "Voice"
        case photo = "Photo"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("Scan Method", selection: $selectedTab) {
                    ForEach(ScanTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 8)

                Divider()
                    .padding(.top, 12)

                // Content
                ScrollView {
                    switch selectedTab {
                    case .voice:
                        voiceTab
                    case .photo:
                        photoTab
                    }
                }

                // Results Section
                if !scanManager.identifiedItems.isEmpty {
                    resultsSection
                }
            }
            .navigationTitle("Fridge Scanner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        scanManager.reset()
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraPickerView { image in
                    showCamera = false
                    if let image = image {
                        Task {
                            await scanManager.analyzePhoto(image)
                        }
                    }
                }
                .ignoresSafeArea()
            }
        }
    }

    // MARK: - Voice Tab

    private var voiceTab: some View {
        VStack(spacing: 24) {
            Spacer()
                .frame(height: 20)

            // Mic Button
            Button {
                Task {
                    if scanManager.isRecording {
                        scanManager.stopRecording()
                    } else {
                        await scanManager.startRecording()
                    }
                }
            } label: {
                ZStack {
                    Circle()
                        .fill(scanManager.isRecording ? Color.red.opacity(0.15) : Color.blue.opacity(0.1))
                        .frame(width: 120, height: 120)

                    if scanManager.isRecording {
                        Circle()
                            .fill(Color.red.opacity(0.08))
                            .frame(width: 150, height: 150)
                            .scaleEffect(scanManager.isRecording ? 1.1 : 1.0)
                            .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: scanManager.isRecording)
                    }

                    Image(systemName: scanManager.isRecording ? "stop.fill" : "mic.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(scanManager.isRecording ? .red : .blue)
                }
            }
            .sensoryFeedback(.impact(weight: .medium), trigger: scanManager.isRecording)

            // Instructions
            Text(scanManager.isRecording ? "Listening... list what's in your fridge" : "Tap to start listing ingredients")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            // Live Transcript
            if !scanManager.transcript.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Transcript")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)

                    Text(scanManager.transcript)
                        .font(.body)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .padding(.horizontal)
            }

            // Analyze Button (after stopping recording)
            if !scanManager.isRecording && !scanManager.transcript.isEmpty && scanManager.identifiedItems.isEmpty {
                Button {
                    Task {
                        await scanManager.analyzeVoiceTranscript()
                    }
                } label: {
                    HStack {
                        if scanManager.isAnalyzing {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(scanManager.isAnalyzing ? "Analyzing..." : "Identify Ingredients")
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(scanManager.isAnalyzing ? Color.gray : Color.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(scanManager.isAnalyzing)
                .padding(.horizontal)
            }

            // Error
            if let error = scanManager.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal)
            }

            Spacer()
        }
        .padding(.horizontal)
    }

    // MARK: - Photo Tab

    private var photoTab: some View {
        VStack(spacing: 24) {
            Spacer()
                .frame(height: 20)

            // Camera Preview / Placeholder
            if let image = scanManager.capturedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 300)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )
                    .padding(.horizontal)
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.systemGray6))
                        .frame(height: 200)

                    VStack(spacing: 12) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(.secondary)

                        Text("Take a photo of your fridge")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal)
            }

            // Take Photo Button
            Button {
                showCamera = true
            } label: {
                HStack {
                    Image(systemName: "camera.fill")
                    Text(scanManager.capturedImage != nil ? "Retake Photo" : "Take Photo")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.blue)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal)

            // Analyzing state
            if scanManager.isAnalyzing {
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Scanning your fridge with AI...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Error
            if let error = scanManager.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal)
            }

            Spacer()
        }
    }

    // MARK: - Results Section

    private var resultsSection: some View {
        VStack(spacing: 12) {
            Divider()

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Found \(scanManager.identifiedItems.count) items")
                        .font(.headline)
                    Spacer()
                }

                // Ingredient chips
                FlowLayout(spacing: 8) {
                    ForEach(scanManager.identifiedItems, id: \.self) { item in
                        Text(item)
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.green.opacity(0.12))
                            .foregroundStyle(.green)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal)

            // Send to Recipes button
            Button {
                if let result = scanManager.scanResult {
                    let jsonItems = scanManager.identifiedItems
                    onScanComplete?(jsonItems, result.id)
                }
                dismiss()
            } label: {
                HStack {
                    Image(systemName: "fork.knife")
                    Text("Find Recipes")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.green)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .sensoryFeedback(.success, trigger: scanManager.identifiedItems.count)
            .padding(.horizontal)
            .padding(.bottom, 16)
        }
        .background(Color(.systemBackground))
    }
}

// MARK: - Flow Layout for Chips

/// Simple horizontal flow layout that wraps items to the next line
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (CGSize(width: maxX, height: y + rowHeight), positions)
    }
}

// MARK: - Camera Picker (UIImagePickerController wrapper)

struct CameraPickerView: UIViewControllerRepresentable {
    var onImageCaptured: (UIImage?) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onImageCaptured: onImageCaptured)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        var onImageCaptured: (UIImage?) -> Void

        init(onImageCaptured: @escaping (UIImage?) -> Void) {
            self.onImageCaptured = onImageCaptured
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            let image = info[.originalImage] as? UIImage
            onImageCaptured(image)
            picker.dismiss(animated: true)
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onImageCaptured(nil)
            picker.dismiss(animated: true)
        }
    }
}

#Preview {
    FridgeScannerSheet(scanManager: FridgeScanManager.shared)
}

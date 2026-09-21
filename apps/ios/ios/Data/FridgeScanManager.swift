import Foundation
import Speech
import AVFoundation
import UIKit

/// Response model from the fridge scan API
struct FridgeScanResult: Codable {
    let success: Bool
    let data: FridgeScanData?

    struct FridgeScanData: Codable {
        let id: String
        let scan_type: String
        let raw_transcript: String?
        let identified_items: [String]
        let confirmed_items: [String]
        let recipes_matched: Int
        let created_at: String
    }
}

/// Manages fridge scanning via voice (SFSpeechRecognizer) and camera (UIImagePickerController).
/// Calls PetehomeAPI directly for scan analysis — heavy data never crosses the JS bridge.
@Observable
@MainActor
final class FridgeScanManager: NSObject {

    static let shared = FridgeScanManager()

    // MARK: - Published State

    var isRecording = false
    var transcript = ""
    var isAnalyzing = false
    var identifiedItems: [String] = []
    var scanResult: FridgeScanResult.FridgeScanData?
    var errorMessage: String?
    var capturedImage: UIImage?

    // MARK: - Private

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    private override init() {
        super.init()
    }

    // MARK: - Permissions

    func requestSpeechPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }

    func requestMicrophonePermission() async -> Bool {
        await AVAudioApplication.requestRecordPermission()
    }

    // MARK: - Voice Recognition

    func startRecording() async {
        guard !isRecording else { return }
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            errorMessage = "Speech recognition is not available on this device."
            return
        }

        let speechAuthorized = await requestSpeechPermission()
        guard speechAuthorized else {
            errorMessage = "Speech recognition permission denied."
            return
        }

        let micAuthorized = await requestMicrophonePermission()
        guard micAuthorized else {
            errorMessage = "Microphone permission denied."
            return
        }

        // Reset state
        transcript = ""
        errorMessage = nil
        identifiedItems = []
        scanResult = nil

        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

            recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
            guard let recognitionRequest = recognitionRequest else { return }
            recognitionRequest.shouldReportPartialResults = true

            recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
                Task { @MainActor [weak self] in
                    guard let self = self else { return }
                    if let result = result {
                        self.transcript = result.bestTranscription.formattedString
                    }
                    if error != nil || (result?.isFinal ?? false) {
                        self.stopAudioEngine()
                    }
                }
            }

            let inputNode = audioEngine.inputNode
            let recordingFormat = inputNode.outputFormat(forBus: 0)
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
                recognitionRequest.append(buffer)
            }

            audioEngine.prepare()
            try audioEngine.start()
            isRecording = true
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
        }
    }

    func stopRecording() {
        guard isRecording else { return }
        stopAudioEngine()
        isRecording = false
    }

    private func stopAudioEngine() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isRecording = false
    }

    // MARK: - Analyze Voice Transcript

    func analyzeVoiceTranscript() async {
        guard !transcript.isEmpty else {
            errorMessage = "No transcript to analyze."
            return
        }

        isAnalyzing = true
        errorMessage = nil

        do {
            let result = try await PetehomeAPI.shared.analyzeFridgeScan(
                type: "voice",
                transcript: transcript,
                imageBase64: nil
            )
            if let data = result.data {
                identifiedItems = data.identified_items
                scanResult = data
            } else {
                errorMessage = "No items identified from the transcript."
            }
        } catch {
            errorMessage = "Analysis failed: \(error.localizedDescription)"
        }

        isAnalyzing = false
    }

    // MARK: - Image Capture & Compression

    /// Compress and resize a UIImage for API upload.
    /// Max dimension 1024px, JPEG quality 0.7 -> typically ~100-200KB.
    func compressImage(_ image: UIImage) -> String? {
        let maxDimension: CGFloat = 1024
        let size = image.size

        var scale: CGFloat = 1.0
        if size.width > maxDimension || size.height > maxDimension {
            scale = min(maxDimension / size.width, maxDimension / size.height)
        }

        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        guard let jpegData = resized.jpegData(compressionQuality: 0.7) else { return nil }
        return jpegData.base64EncodedString()
    }

    // MARK: - Analyze Photo

    func analyzePhoto(_ image: UIImage) async {
        capturedImage = image
        isAnalyzing = true
        errorMessage = nil
        identifiedItems = []
        scanResult = nil

        guard let base64 = compressImage(image) else {
            errorMessage = "Failed to compress image."
            isAnalyzing = false
            return
        }

        do {
            let result = try await PetehomeAPI.shared.analyzeFridgeScan(
                type: "photo",
                transcript: nil,
                imageBase64: base64
            )
            if let data = result.data {
                identifiedItems = data.identified_items
                scanResult = data
            } else {
                errorMessage = "No items identified from the photo."
            }
        } catch {
            errorMessage = "Analysis failed: \(error.localizedDescription)"
        }

        isAnalyzing = false
    }

    // MARK: - Reset

    func reset() {
        stopRecording()
        transcript = ""
        isAnalyzing = false
        identifiedItems = []
        scanResult = nil
        errorMessage = nil
        capturedImage = nil
    }
}

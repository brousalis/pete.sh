import SwiftUI
import SwiftData
import WatchKit

struct DataExportView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var exportedJSON: String?
    @State private var isExporting = false
    @State private var showCopied = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Info
                VStack(spacing: 8) {
                    Image(systemName: "doc.text")
                        .font(.largeTitle)
                        .foregroundStyle(.cyan)
                    
                    Text("Export Your Data")
                        .font(.system(.headline, design: .rounded))
                    
                    Text("Generate a JSON backup of all your workout data, logs, and PRs.")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 8)
                
                // Export button
                Button {
                    generateExport()
                } label: {
                    HStack {
                        if isExporting {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "square.and.arrow.up")
                        }
                        Text(isExporting ? "Generating..." : "Generate Export")
                    }
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.cyan)
                    )
                }
                .buttonStyle(.plain)
                .disabled(isExporting)
                
                // Export preview
                if let json = exportedJSON {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("PREVIEW")
                                .font(.system(.caption2, design: .rounded))
                                .foregroundStyle(.secondary)
                            
                            Spacer()
                            
                            Text("\(json.count) chars")
                                .font(.system(.caption2, design: .rounded))
                                .foregroundStyle(.tertiary)
                        }
                        
                        // JSON preview (truncated)
                        Text(String(json.prefix(500)) + (json.count > 500 ? "\n..." : ""))
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(.green)
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.black)
                            )
                        
                        // Note about accessing data
                        Text("To access your data, connect your Apple Watch to your Mac and use Apple Configurator or Xcode to retrieve the exported file.")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.tertiary)
                            .padding(.top, 4)
                    }
                }
                
                if showCopied {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Export generated!")
                            .font(.system(.caption, design: .rounded))
                    }
                    .transition(.opacity)
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Export")
    }
    
    private func generateExport() {
        isExporting = true
        
        // Slight delay for UI feedback
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if let json = DataExporter.exportToJSON(modelContext: modelContext) {
                exportedJSON = json
                
                // Save to documents for potential retrieval
                saveToDocuments(json)
                
                WKInterfaceDevice.current().play(.success)
                
                withAnimation {
                    showCopied = true
                }
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    withAnimation {
                        showCopied = false
                    }
                }
            }
            
            isExporting = false
        }
    }
    
    private func saveToDocuments(_ json: String) {
        let fileManager = FileManager.default
        guard let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return
        }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd_HHmmss"
        let filename = "petetrain_export_\(formatter.string(from: Date())).json"
        
        let fileURL = documentsURL.appendingPathComponent(filename)
        
        do {
            try json.write(to: fileURL, atomically: true, encoding: .utf8)
            print("Export saved to: \(fileURL.path)")
        } catch {
            print("Failed to save export: \(error)")
        }
    }
}

#Preview {
    NavigationStack {
        DataExportView()
    }
    .modelContainer(for: [WorkoutRecord.self, ExerciseLog.self, PersonalRecord.self], inMemory: true)
}






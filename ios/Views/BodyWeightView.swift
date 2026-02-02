import SwiftUI
import SwiftData
import Charts
import WatchKit

struct BodyWeightView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var manager = BodyWeightManager.shared
    @State private var showingInput = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Current Weight Card
                CurrentWeightCard(
                    weight: manager.currentWeight,
                    change: manager.weightChange,
                    onLogTap: { showingInput = true }
                )
                
                // Weight Chart
                if manager.entries.count >= 2 {
                    WeightChartCard(entries: Array(manager.entries.prefix(20).reversed()))
                }
                
                // Counter-Balance Info
                if manager.currentWeight != nil {
                    CounterBalanceCard(manager: manager)
                }
                
                // HealthKit Sync Card
                HealthKitSyncCard(manager: manager)
                
                // History
                if !manager.entries.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("HISTORY")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                        
                        ForEach(manager.entries.prefix(10)) { entry in
                            WeightEntryRow(
                                entry: entry,
                                showSyncStatus: true,
                                onDelete: {
                                    manager.deleteEntry(entry)
                                }
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Body Weight")
        .sheet(isPresented: $showingInput) {
            BodyWeightInputSheet(manager: manager)
        }
        .onAppear {
            manager.configure(with: modelContext)
            // Import latest from HealthKit on appear
            Task {
                await manager.importFromHealthKit()
            }
        }
    }
}

// MARK: - HealthKit Sync Card

struct HealthKitSyncCard: View {
    let manager: BodyWeightManager
    @State private var healthKit = HealthKitManager.shared
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "heart.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
                
                Text("APPLE HEALTH")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                if manager.isSyncingWithHealthKit {
                    ProgressView()
                        .scaleEffect(0.7)
                }
            }
            
            // Show HealthKit weight if different from local
            if let hkWeight = healthKit.healthKitBodyWeight,
               let hkDate = healthKit.healthKitBodyWeightDate {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Health App")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.white)
                        
                        Text(formatDate(hkDate))
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    Text(formatWeight(hkWeight))
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(.red)
                }
            }
            
            // Sync buttons
            HStack(spacing: 8) {
                Button {
                    Task {
                        await manager.importFromHealthKit()
                        WKInterfaceDevice.current().play(.click)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.down.circle")
                            .font(.caption2)
                        Text("Import")
                            .font(.system(.caption2, design: .rounded))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.15))
                    )
                }
                .buttonStyle(.plain)
                
                let unsyncedCount = manager.entries.filter { !$0.syncedToHealthKit }.count
                if unsyncedCount > 0 {
                    Button {
                        Task {
                            await manager.syncUnsyncedEntriesToHealthKit()
                            WKInterfaceDevice.current().play(.success)
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.up.circle")
                                .font(.caption2)
                            Text("Sync \(unsyncedCount)")
                                .font(.system(.caption2, design: .rounded))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(Color.red.opacity(0.5))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.red.opacity(0.1))
        )
        .onAppear {
            Task {
                await healthKit.fetchBodyWeight()
            }
        }
    }
    
    private func formatWeight(_ weight: Double) -> String {
        if weight == floor(weight) {
            return "\(Int(weight)) lbs"
        }
        return String(format: "%.1f lbs", weight)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Current Weight Card

struct CurrentWeightCard: View {
    let weight: Double?
    let change: Double?
    let onLogTap: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            if let weight = weight {
                Text(weight == floor(weight) ? "\(Int(weight))" : String(format: "%.1f", weight))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                
                Text("lbs")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
                
                if let change = change {
                    HStack(spacing: 4) {
                        Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right")
                            .font(.system(size: 10))
                        Text(String(format: "%+.1f lbs", change))
                            .font(.system(.caption2, design: .rounded))
                    }
                    .foregroundStyle(change >= 0 ? .red : .green)
                }
            } else {
                Image(systemName: "scalemass")
                    .font(.title2)
                    .foregroundStyle(.secondary)
                
                Text("No weight logged")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            
            Button(action: onLogTap) {
                HStack {
                    Image(systemName: "plus")
                        .font(.caption)
                    Text("Log Weight")
                        .font(.system(.caption, design: .rounded))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(Color.blue)
                )
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.08))
        )
    }
}

// MARK: - Weight Chart

struct WeightChartCard: View {
    let entries: [BodyWeight]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("TREND")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
            
            Chart(entries, id: \.id) { entry in
                LineMark(
                    x: .value("Date", entry.date),
                    y: .value("Weight", entry.weight)
                )
                .foregroundStyle(Color.cyan)
                .interpolationMethod(.catmullRom)
                
                AreaMark(
                    x: .value("Date", entry.date),
                    y: .value("Weight", entry.weight)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.cyan.opacity(0.3), Color.clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel {
                        if let weight = value.as(Double.self) {
                            Text("\(Int(weight))")
                                .font(.system(size: 8, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .frame(height: 70)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.cyan.opacity(0.1))
        )
    }
}

// MARK: - Counter-Balance Card

struct CounterBalanceCard: View {
    let manager: BodyWeightManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "scalemass.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
                
                Text("COUNTER-BALANCE RULE")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            
            if let change = manager.weightChange, abs(change) > 0 {
                VStack(alignment: .leading, spacing: 4) {
                    if change < 0 {
                        Text("You lost \(String(format: "%.1f", abs(change))) lbs")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.green)
                        
                        Text("Add \(String(format: "%.1f", abs(change))) lbs to your belt")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.white)
                    } else {
                        Text("You gained \(String(format: "%.1f", change)) lbs")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.orange)
                        
                        Text("Remove \(String(format: "%.1f", change)) lbs from belt")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.white)
                    }
                }
            } else {
                Text("Weight stable - maintain belt weight")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.orange.opacity(0.1))
        )
    }
}

// MARK: - Weight Entry Row

struct WeightEntryRow: View {
    let entry: BodyWeight
    var showSyncStatus: Bool = false
    let onDelete: () -> Void
    
    private var dateFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        return f
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(dateFormatter.string(from: entry.date))
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.white)
                    
                    // HealthKit sync indicator
                    if showSyncStatus {
                        Image(systemName: entry.syncedToHealthKit ? "heart.fill" : "heart")
                            .font(.system(size: 8))
                            .foregroundStyle(entry.syncedToHealthKit ? .red : .secondary)
                    }
                }
                
                if let notes = entry.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            Text(entry.formattedWeight)
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(.cyan)
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.05))
        )
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash")
            }
        }
    }
}

// MARK: - Weight Input Sheet

struct BodyWeightInputSheet: View {
    let manager: BodyWeightManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var weight: Double = 175
    
    var body: some View {
        VStack(spacing: 8) {
            // Weight display with crown control
            VStack(spacing: 0) {
                Text("\(Int(weight))")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(.cyan)
                    .monospacedDigit()
                
                Text("lbs")
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            .focusable()
            .digitalCrownRotation($weight, from: 80, through: 350, by: 0.5, sensitivity: .medium)
            
            // Quick adjust buttons
            HStack(spacing: 20) {
                Button {
                    weight = max(80, weight - 1)
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 16, weight: .medium))
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(Color.white.opacity(0.15)))
                }
                .buttonStyle(.plain)
                
                Button {
                    weight = min(350, weight + 1)
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .medium))
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(Color.white.opacity(0.15)))
                }
                .buttonStyle(.plain)
            }
            
            // Save button
            Button {
                manager.logWeight(weight)
                WKInterfaceDevice.current().play(.success)
                dismiss()
            } label: {
                Text("Save")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.cyan)
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .onAppear {
            if let current = manager.currentWeight {
                weight = current
            }
        }
    }
}

#Preview {
    NavigationStack {
        BodyWeightView()
    }
    .modelContainer(for: [BodyWeight.self], inMemory: true)
}


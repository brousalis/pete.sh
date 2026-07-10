import SwiftUI
import CoreBluetooth

/// Shows the iPhone's BLE heart-rate broadcast status and how to pair a bike computer.
struct HeartRateBroadcastView: View {
    @State private var peripheral = HeartRatePeripheralManager.shared
    @State private var connectivity = WatchConnectivityManager.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    broadcastHero
                    statusSection
                    pairingInstructions
                    tips
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("Broadcast")
        }
        .onAppear {
            peripheral.start()
        }
    }

    // MARK: - Hero

    private var broadcastHero: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.red.opacity(0.12))
                    .frame(width: 120, height: 120)
                    .scaleEffect(peripheral.isAdvertising ? 1.0 : 0.85)
                    .opacity(peripheral.isAdvertising ? 1 : 0.5)
                    .animation(
                        peripheral.isAdvertising
                            ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                            : .default,
                        value: peripheral.isAdvertising
                    )
                Image(systemName: "dot.radiowaves.left.and.right")
                    .font(.system(size: 44))
                    .foregroundStyle(.red)
            }

            HStack(spacing: 6) {
                Image(systemName: "heart.fill")
                    .foregroundStyle(.red)
                Text(peripheral.currentBPM.map { "\($0)" } ?? "--")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                Text("BPM")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Status

    private var statusSection: some View {
        VStack(spacing: 12) {
            statusRow(
                label: bluetoothLabel,
                color: peripheral.bluetoothState == .poweredOn ? .green : .orange
            )
            statusRow(
                label: peripheral.isAdvertising ? "Broadcasting HR sensor" : "Not broadcasting",
                color: peripheral.isAdvertising ? .green : .orange
            )
            statusRow(
                label: peripheral.isSubscribed ? "Bike computer connected" : "Waiting for bike computer",
                color: peripheral.isSubscribed ? .green : .secondary
            )
            statusRow(
                label: connectivity.watchReachable ? "Watch connected" : "Open HR Broadcast on your Watch",
                color: connectivity.watchReachable ? .green : .orange
            )
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.06)))
    }

    private func statusRow(label: String, color: Color) -> some View {
        HStack(spacing: 10) {
            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
            Text(label)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundStyle(.white)
            Spacer()
        }
    }

    private var bluetoothLabel: String {
        switch peripheral.bluetoothState {
        case .poweredOn: return "Bluetooth on"
        case .poweredOff: return "Bluetooth is off"
        case .unauthorized: return "Bluetooth permission needed"
        case .unsupported: return "Bluetooth not supported"
        default: return "Starting Bluetooth..."
        }
    }

    // MARK: - Pairing Instructions

    private var pairingInstructions: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Pair your bike computer")
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)

            instructionRow(number: 1, text: "Open HR Broadcast on your Apple Watch and press Start.")
            instructionRow(number: 2, text: "On the Coospo CS600: Sensors → Heart Rate → Add Sensor.")
            instructionRow(number: 3, text: "Select \"petehome HR\" to connect. Your heart rate appears on the CS600.")
            instructionRow(number: 4, text: "Once connected, you can pocket the phone. Keep the Watch app open.")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.06)))
    }

    private func instructionRow(number: Int, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(number)")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 22, height: 22)
                .background(Circle().fill(Color.red.opacity(0.4)))
            Text(text)
                .font(.system(size: 13, design: .rounded))
                .foregroundStyle(.secondary)
            Spacer(minLength: 0)
        }
    }

    // MARK: - Tips

    private var tips: some View {
        VStack(alignment: .leading, spacing: 8) {
            tip("Close your bike computer's own phone app (e.g. Coospo, Garmin Connect) first — most head units only allow one phone connection at a time.")
            tip("Turn off Low Power Mode on both devices for reliable Bluetooth and heart rate.")
            tip("If the sensor won't appear, make sure the Watch is measuring a real heart rate (above ~60 BPM).")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func tip(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "lightbulb.fill")
                .font(.system(size: 11))
                .foregroundStyle(.yellow.opacity(0.7))
            Text(text)
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    HeartRateBroadcastView()
        .preferredColorScheme(.dark)
}

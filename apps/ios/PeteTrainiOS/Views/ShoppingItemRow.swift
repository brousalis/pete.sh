import SwiftUI

struct ShoppingItemRow: View {
    let ingredient: String
    let amount: Double?
    let unit: String?
    let isChecked: Bool
    let onToggle: () -> Void
    let onHide: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Checkbox
            Button(action: onToggle) {
                Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(isChecked ? .green : .gray)
            }
            .buttonStyle(.plain)
            .frame(width: 44, height: 44)

            // Content
            VStack(alignment: .leading, spacing: 2) {
                Text(ingredient.capitalized)
                    .font(.system(size: 16, weight: .medium, design: .rounded))
                    .strikethrough(isChecked)
                    .foregroundStyle(isChecked ? .secondary : .primary)

                if let amount = amount, amount > 0 {
                    HStack(spacing: 4) {
                        Text(formatAmount(amount))
                            .monospacedDigit()
                        if let unit = unit, !unit.isEmpty {
                            Text(unit)
                        }
                    }
                    .font(.system(size: 13, weight: .regular, design: .rounded))
                    .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Hide button
            Button(action: onHide) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
        .opacity(isChecked ? 0.6 : 1.0)
    }

    private func formatAmount(_ value: Double) -> String {
        if value == value.rounded() {
            return String(Int(value))
        }
        return String(format: "%.1f", value)
    }
}

// MARK: - Manual Item Row

struct ManualItemRow: View {
    let name: String
    let isChecked: Bool
    let onToggle: () -> Void
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(isChecked ? .green : .gray)
            }
            .buttonStyle(.plain)
            .frame(width: 44, height: 44)

            Text(name.capitalized)
                .font(.system(size: 16, weight: .medium, design: .rounded))
                .strikethrough(isChecked)
                .foregroundStyle(isChecked ? .secondary : .primary)

            Spacer()

            Button(action: onRemove) {
                Image(systemName: "trash")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.red.opacity(0.7))
            }
            .buttonStyle(.plain)
            .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
        .opacity(isChecked ? 0.6 : 1.0)
    }
}

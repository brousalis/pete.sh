import SwiftUI

struct ShoppingListView: View {
    @State private var viewModel = ShoppingListViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if viewModel.isLoading && viewModel.shoppingList == nil {
                    ProgressView()
                        .tint(.white)
                } else if let error = viewModel.errorMessage, viewModel.shoppingList == nil {
                    emptyState(message: error)
                } else if viewModel.shoppingList != nil {
                    listContent
                } else {
                    emptyState(message: "No shopping list available")
                }
            }
            .navigationTitle("Shopping List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable {
                await viewModel.loadShoppingList()
            }
        }
        .task {
            await viewModel.loadShoppingList()
        }
    }

    // MARK: - List Content

    @ViewBuilder
    private var listContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                progressHeader
                tripHistory
                categorySections
                manualItemsSection
                addItemField

                // Bottom padding for complete trip bar
                if viewModel.hasCheckedItems {
                    Spacer().frame(height: 60)
                }
            }
            .padding(.vertical, 12)
        }
        .overlay(alignment: .bottom) {
            if viewModel.hasCheckedItems {
                completeTripBar
            }
        }
    }

    // MARK: - Progress Header

    private var progressHeader: some View {
        HStack(spacing: 16) {
            // Progress ring
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.3), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: viewModel.progress)
                    .stroke(Color.green, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.3), value: viewModel.progress)

                Text("\(Int(viewModel.progress * 100))%")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
            }
            .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: 4) {
                Text("\(viewModel.checkedItemCount) of \(viewModel.totalItemCount) items")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.3))
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.green)
                            .frame(width: geo.size.width * viewModel.progress)
                            .animation(.easeInOut(duration: 0.3), value: viewModel.progress)
                    }
                }
                .frame(height: 4)
            }

            Spacer()
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Trip History

    @ViewBuilder
    private var tripHistory: some View {
        if !viewModel.trips.isEmpty {
            HStack {
                Image(systemName: "bag.fill")
                    .foregroundStyle(.cyan)
                Text("\(viewModel.trips.count) trip\(viewModel.trips.count == 1 ? "" : "s") completed")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.cyan)

                Spacer()

                Button {
                    viewModel.undoLastTrip()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.uturn.backward")
                        Text("Undo")
                    }
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.orange)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.cyan.opacity(0.1))
            .cornerRadius(8)
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Category Sections

    private var categorySections: some View {
        ForEach(viewModel.groupedItems) { group in
            VStack(spacing: 0) {
                // Category header
                Button {
                    viewModel.toggleCategory(group.category.rawValue)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: group.category.iconName)
                            .font(.system(size: 14))
                            .foregroundStyle(.gray)
                            .frame(width: 20)

                        Text(group.category.rawValue)
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)

                        Text("\(group.checkedCount)/\(group.totalCount)")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(group.checkedCount == group.totalCount ? .green : .secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                Capsule()
                                    .fill(group.checkedCount == group.totalCount ? Color.green.opacity(0.15) : Color.gray.opacity(0.15))
                            )

                        Spacer()

                        Image(systemName: viewModel.collapsedCategories.contains(group.category.rawValue) ? "chevron.right" : "chevron.down")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.plain)

                // Items
                if !viewModel.collapsedCategories.contains(group.category.rawValue) {
                    ForEach(group.items) { item in
                        ShoppingItemRow(
                            ingredient: item.ingredient,
                            amount: item.amount,
                            unit: item.unit,
                            isChecked: viewModel.checkedItems.contains(item.ingredient),
                            onToggle: { viewModel.toggleItem(item.ingredient) },
                            onHide: { viewModel.hideItem(item.ingredient) }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Manual Items

    @ViewBuilder
    private var manualItemsSection: some View {
        if !viewModel.manualItems.isEmpty {
            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(.gray)
                        .frame(width: 20)

                    Text("Custom Items")
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)

                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)

                ForEach(viewModel.manualItems) { item in
                    ManualItemRow(
                        name: item.name,
                        isChecked: item.checked,
                        onToggle: { viewModel.toggleManualItem(item.name) },
                        onRemove: { viewModel.removeManualItem(item.name) }
                    )
                }
            }
        }
    }

    // MARK: - Add Item

    private var addItemField: some View {
        HStack(spacing: 12) {
            Image(systemName: "plus")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.secondary)

            TextField("Add item...", text: $viewModel.newItemText)
                .font(.system(size: 16, weight: .regular, design: .rounded))
                .foregroundStyle(.white)
                .submitLabel(.done)
                .onSubmit {
                    viewModel.addManualItem()
                }

            if !viewModel.newItemText.isEmpty {
                Button {
                    viewModel.addManualItem()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.green)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.05))
        .cornerRadius(10)
        .padding(.horizontal, 16)
    }

    // MARK: - Complete Trip

    private var completeTripBar: some View {
        Button {
            viewModel.completeTrip()
        } label: {
            HStack {
                Image(systemName: "bag.badge.plus")
                Text("Complete Trip (\(viewModel.checkedItemCount) items)")
                    .monospacedDigit()
            }
            .font(.system(size: 16, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.green)
            .cornerRadius(12)
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .buttonStyle(.plain)
        .background(
            LinearGradient(
                colors: [.black.opacity(0), .black],
                startPoint: .top,
                endPoint: .center
            )
            .ignoresSafeArea()
        )
    }

    // MARK: - Empty State

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "list.clipboard")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)
            Text(message)
                .font(.system(size: 16, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                Task { await viewModel.loadShoppingList() }
            }
            .font(.system(size: 14, weight: .medium, design: .rounded))
            .foregroundStyle(.green)
        }
        .padding(32)
    }
}

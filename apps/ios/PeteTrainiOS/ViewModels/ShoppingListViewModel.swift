import Foundation
import SwiftUI

// MARK: - Grouped Item

struct GroupedCategory: Identifiable {
    let category: IngredientCategory
    let items: [ShoppingListItem]
    let checkedCount: Int

    var id: String { category.rawValue }
    var totalCount: Int { items.count }
}

// MARK: - View Model

@MainActor
@Observable
final class ShoppingListViewModel {

    // MARK: - State

    var shoppingList: ShoppingList?
    var mealPlanId: String?
    var isLoading = false
    var errorMessage: String?

    var checkedItems: Set<String> = []
    var hiddenItems: Set<String> = []
    var manualItems: [ManualItem] = []
    var trips: [ShoppingTrip] = []
    var collapsedCategories: Set<String> = []
    var newItemText = ""

    // MARK: - Computed

    var visibleItems: [ShoppingListItem] {
        guard let list = shoppingList else { return [] }
        return list.items.filter { !hiddenItems.contains($0.ingredient) }
    }

    var groupedItems: [GroupedCategory] {
        let items = visibleItems
        var groups: [IngredientCategory: [ShoppingListItem]] = [:]

        for item in items {
            let cat = categorizeIngredient(item.ingredient)
            groups[cat, default: []].append(item)
        }

        return groups.map { cat, items in
            // Sort: unchecked first, then alphabetical
            let sorted = items.sorted { a, b in
                let aChecked = checkedItems.contains(a.ingredient)
                let bChecked = checkedItems.contains(b.ingredient)
                if aChecked != bChecked { return !aChecked }
                return a.ingredient.localizedCaseInsensitiveCompare(b.ingredient) == .orderedAscending
            }
            let checked = sorted.filter { checkedItems.contains($0.ingredient) }.count
            return GroupedCategory(category: cat, items: sorted, checkedCount: checked)
        }
        .sorted { $0.category.sortOrder < $1.category.sortOrder }
    }

    var totalItemCount: Int { visibleItems.count + manualItems.count }

    var checkedItemCount: Int {
        let ingredientChecked = visibleItems.filter { checkedItems.contains($0.ingredient) }.count
        let manualChecked = manualItems.filter { $0.checked }.count
        return ingredientChecked + manualChecked
    }

    var progress: Double {
        guard totalItemCount > 0 else { return 0 }
        return Double(checkedItemCount) / Double(totalItemCount)
    }

    var hasCheckedItems: Bool { checkedItemCount > 0 }

    // MARK: - Load

    func loadShoppingList() async {
        isLoading = true
        errorMessage = nil

        do {
            let mealPlan = try await PetehomeAPI.shared.fetchCurrentMealPlan()
            guard let plan = mealPlan.data else {
                errorMessage = "No meal plan for this week"
                isLoading = false
                return
            }

            mealPlanId = plan.id

            let listResponse = try await PetehomeAPI.shared.fetchShoppingList(mealPlanId: plan.id)
            guard let list = listResponse.data else {
                errorMessage = listResponse.error ?? "Failed to load shopping list"
                isLoading = false
                return
            }

            shoppingList = list
            checkedItems = Set(list.checked_items)
            hiddenItems = Set(list.hidden_items)
            manualItems = list.manual_items
            trips = list.trips
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    // MARK: - Actions

    func toggleItem(_ ingredient: String) {
        if checkedItems.contains(ingredient) {
            checkedItems.remove(ingredient)
        } else {
            checkedItems.insert(ingredient)
        }
        syncToServer()
    }

    func hideItem(_ ingredient: String) {
        hiddenItems.insert(ingredient)
        checkedItems.remove(ingredient)
        syncToServer()
    }

    func addManualItem() {
        let text = newItemText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        guard !manualItems.contains(where: { $0.name.lowercased() == text.lowercased() }) else { return }

        manualItems.append(ManualItem(name: text, checked: false))
        newItemText = ""
        syncToServer()
    }

    func toggleManualItem(_ name: String) {
        guard let idx = manualItems.firstIndex(where: { $0.name == name }) else { return }
        let item = manualItems[idx]
        manualItems[idx] = ManualItem(name: item.name, checked: !item.checked)
        syncToServer()
    }

    func removeManualItem(_ name: String) {
        manualItems.removeAll { $0.name == name }
        syncToServer()
    }

    func toggleCategory(_ category: String) {
        if collapsedCategories.contains(category) {
            collapsedCategories.remove(category)
        } else {
            collapsedCategories.insert(category)
        }
    }

    func completeTrip() {
        let checkedIngredients = visibleItems.filter { checkedItems.contains($0.ingredient) }
        let checkedManualNames = manualItems.filter { $0.checked }.map { $0.name }

        guard !checkedIngredients.isEmpty || !checkedManualNames.isEmpty else { return }

        let tripItems = checkedIngredients.map { TripItem(ingredient: $0.ingredient, amount: $0.amount, unit: $0.unit) }
        let trip = ShoppingTrip(
            id: UUID().uuidString,
            completedAt: ISO8601DateFormatter().string(from: Date()),
            items: tripItems,
            manualItems: checkedManualNames
        )

        trips.append(trip)

        // Hide checked ingredients
        for item in checkedIngredients {
            hiddenItems.insert(item.ingredient)
        }
        checkedItems.removeAll()

        // Remove checked manual items
        manualItems.removeAll { $0.checked }

        syncToServer()
    }

    func undoLastTrip() {
        guard let trip = trips.popLast() else { return }

        // Restore hidden ingredients from this trip
        for item in trip.items {
            hiddenItems.remove(item.ingredient)
        }

        // Restore manual items from this trip
        for name in trip.manualItems {
            if !manualItems.contains(where: { $0.name == name }) {
                manualItems.append(ManualItem(name: name, checked: false))
            }
        }

        syncToServer()
    }

    // MARK: - Sync

    private func syncToServer() {
        guard let listId = shoppingList?.id else { return }

        let patch = ShoppingListStatePatch(
            checked_items: Array(checkedItems),
            hidden_items: Array(hiddenItems),
            manual_items: manualItems,
            trips: trips
        )

        Task {
            do {
                try await PetehomeAPI.shared.updateShoppingListState(listId: listId, patch: patch)
            } catch {
                print("Failed to sync shopping list state: \(error)")
            }
        }
    }
}

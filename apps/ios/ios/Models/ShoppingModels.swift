import Foundation

// MARK: - API Response Wrappers

struct MealPlanResponse: Codable {
    let success: Bool
    let data: MealPlan?
    let error: String?
}

struct ShoppingListResponse: Codable {
    let success: Bool
    let data: ShoppingList?
    let error: String?
}

// MARK: - Meal Plan

struct MealPlan: Codable {
    let id: String
    let week_start_date: String
    let year: Int
    let week_number: Int
    let created_at: String?
    let updated_at: String?
}

// MARK: - Shopping List

struct ShoppingList: Codable {
    let id: String
    let meal_plan_id: String
    let items: [ShoppingListItem]
    let status: String
    let checked_items: [String]
    let hidden_items: [String]
    let manual_items: [ManualItem]
    let trips: [ShoppingTrip]
    let created_at: String?
    let updated_at: String?
}

struct ShoppingListItem: Codable, Identifiable {
    let ingredient: String
    let amount: Double?
    let unit: String?
    let recipes: [String]

    var id: String { ingredient }
}

struct ManualItem: Codable, Identifiable {
    let name: String
    let checked: Bool

    var id: String { name }
}

struct ShoppingTrip: Codable, Identifiable {
    let id: String
    let completedAt: String
    let items: [TripItem]
    let manualItems: [String]
}

struct TripItem: Codable {
    let ingredient: String
    let amount: Double?
    let unit: String?
}

// MARK: - State Patch (for PUT)

struct ShoppingListStatePatch: Codable {
    var checked_items: [String]?
    var hidden_items: [String]?
    var manual_items: [ManualItem]?
    var trips: [ShoppingTrip]?
}

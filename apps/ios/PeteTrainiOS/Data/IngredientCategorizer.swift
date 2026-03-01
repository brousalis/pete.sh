import Foundation

// MARK: - Ingredient Category

enum IngredientCategory: String, CaseIterable {
    case produce = "Produce"
    case fruits = "Fruits"
    case meatAndPoultry = "Meat & Poultry"
    case seafood = "Seafood"
    case dairy = "Dairy"
    case bakery = "Bakery"
    case pantry = "Pantry"
    case spices = "Spices"
    case cannedGoods = "Canned Goods"
    case frozen = "Frozen"
    case other = "Other"

    var sortOrder: Int {
        switch self {
        case .produce: return 0
        case .fruits: return 1
        case .meatAndPoultry: return 2
        case .seafood: return 3
        case .dairy: return 4
        case .bakery: return 5
        case .pantry: return 6
        case .spices: return 7
        case .cannedGoods: return 8
        case .frozen: return 9
        case .other: return 10
        }
    }

    var iconName: String {
        switch self {
        case .produce: return "leaf"
        case .fruits: return "apple.logo"
        case .meatAndPoultry: return "fork.knife"
        case .seafood: return "fish"
        case .dairy: return "cup.and.saucer"
        case .bakery: return "oven"
        case .pantry: return "cabinet"
        case .spices: return "flame"
        case .cannedGoods: return "cylinder"
        case .frozen: return "snowflake"
        case .other: return "bag"
        }
    }
}

// MARK: - Categorization

/// Port of apps/web/lib/utils/shopping-utils.ts categorizeIngredient
func categorizeIngredient(_ name: String) -> IngredientCategory {
    let lower = name.lowercased()

    if lower.range(of: #"milk|cheese|yogurt|cream|butter|sour cream|half.and.half|crème"#, options: .regularExpression) != nil {
        return .dairy
    }
    if lower.range(of: #"egg"#, options: .regularExpression) != nil {
        return .dairy
    }
    if lower.range(of: #"chicken|beef|pork|turkey|sausage|bacon|meat|steak|lamb|ground"#, options: .regularExpression) != nil {
        return .meatAndPoultry
    }
    if lower.range(of: #"salmon|tuna|shrimp|fish|cod|crab|lobster|scallop"#, options: .regularExpression) != nil {
        return .seafood
    }
    if lower.range(of: #"lettuce|tomato|onion|garlic|pepper|carrot|celery|spinach|kale|broccoli|potato|mushroom|avocado|cucumber|zucchini|squash|cabbage|corn|pea|bean sprout|jalapeño|cilantro|parsley|basil|mint|ginger|scallion|shallot|leek"#, options: .regularExpression) != nil {
        return .produce
    }
    if lower.range(of: #"apple|banana|lemon|lime|orange|berry|berries|fruit|grape|mango|pear|peach"#, options: .regularExpression) != nil {
        return .fruits
    }
    if lower.range(of: #"bread|tortilla|bun|roll|pita|naan|bagel|croissant"#, options: .regularExpression) != nil {
        return .bakery
    }
    if lower.range(of: #"rice|pasta|noodle|flour|sugar|honey|maple|oil|vinegar|sauce|broth|stock|soy|sriracha"#, options: .regularExpression) != nil {
        return .pantry
    }
    if lower.range(of: #"salt|pepper|cumin|paprika|oregano|thyme|rosemary|cinnamon|nutmeg|chili|cayenne|turmeric"#, options: .regularExpression) != nil {
        return .spices
    }
    if lower.range(of: #"can |canned|beans|lentil|chickpea|diced tomato"#, options: .regularExpression) != nil {
        return .cannedGoods
    }
    if lower.range(of: #"frozen"#, options: .regularExpression) != nil {
        return .frozen
    }
    return .other
}

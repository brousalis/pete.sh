module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/supabase/client.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSupabaseClient",
    ()=>getSupabaseClient,
    "getSupabaseClientForOperation",
    ()=>getSupabaseClientForOperation,
    "getSupabaseServiceClient",
    ()=>getSupabaseServiceClient,
    "hasServiceRoleKey",
    ()=>hasServiceRoleKey,
    "isSupabaseConfigured",
    ()=>isSupabaseConfigured
]);
/**
 * Supabase Client
 * Initializes and exports Supabase clients for the application
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
// Environment variables
const supabaseUrl = ("TURBOPACK compile-time value", "https://gboqyaucaqnutoqboaym.supabase.co");
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib3F5YXVjYXFudXRvcWJvYXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMDA5NTIsImV4cCI6MjA4NDg3Njk1Mn0.faeaHDIyK7LlDO0jsMjzKiUkVuNqpad8bOBZyvqkze0");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
/**
 * Check if a string is a valid HTTP/HTTPS URL
 */ function isValidUrl(urlString) {
    if (!urlString) return false;
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch  {
        return false;
    }
}
function isSupabaseConfigured() {
    // Check that URL exists and is a valid HTTP/HTTPS URL
    if (!isValidUrl(supabaseUrl)) return false;
    // Check that anon key exists and isn't a placeholder
    if (!supabaseAnonKey || supabaseAnonKey.includes('your-') || supabaseAnonKey.length < 20) return false;
    return true;
}
function hasServiceRoleKey() {
    if (!supabaseServiceKey) return false;
    // Check it's not a placeholder
    if (supabaseServiceKey.includes('your-') || supabaseServiceKey.length < 20) return false;
    return true;
}
// Singleton instances
let anonClient = null;
let serviceClient = null;
function getSupabaseClient() {
    if (!isSupabaseConfigured()) {
        return null;
    }
    if (!anonClient) {
        try {
            anonClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            });
        } catch  {
            return null;
        }
    }
    return anonClient;
}
function getSupabaseServiceClient() {
    if (!isSupabaseConfigured()) {
        return null;
    }
    if (!hasServiceRoleKey()) {
        return null;
    }
    if (!serviceClient) {
        try {
            serviceClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseServiceKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            });
        } catch  {
            return null;
        }
    }
    return serviceClient;
}
function getSupabaseClientForOperation(operation) {
    if (operation === 'write' && hasServiceRoleKey()) {
        return getSupabaseServiceClient();
    }
    return getSupabaseClient();
}
}),
"[project]/lib/services/cooking.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CookingService",
    ()=>CookingService,
    "cookingService",
    ()=>cookingService
]);
/**
 * Cooking Service
 * Handles recipe storage, version history, and management
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-route] (ecmascript)");
;
class CookingService {
    /**
   * Get recipes with optional filters
   */ async getRecipes(filters) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        let query = supabase.from('recipes').select('*').order('created_at', {
            ascending: false
        });
        if (filters?.search) {
            query = query.ilike('name', `%${filters.search}%`);
        }
        if (filters?.source) {
            query = query.eq('source', filters.source);
        }
        if (filters?.difficulty) {
            query = query.eq('difficulty', filters.difficulty);
        }
        if (filters?.is_favorite !== undefined) {
            query = query.eq('is_favorite', filters.is_favorite);
        }
        if (filters?.tags && filters.tags.length > 0) {
            query = query.contains('tags', filters.tags);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching recipes:', error);
            throw new Error(`Failed to fetch recipes: ${error.message}`);
        }
        return data || [];
    }
    /**
   * Get a single recipe with ingredients
   */ async getRecipe(id) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        // Get recipe
        const { data: recipeData, error: recipeError } = await supabase.from('recipes').select('*').eq('id', id).single();
        if (recipeError) {
            if (recipeError.code === 'PGRST116') {
                return null // Not found
                ;
            }
            console.error('Error fetching recipe:', recipeError);
            throw new Error(`Failed to fetch recipe: ${recipeError.message}`);
        }
        // Get ingredients
        const { data: ingredientsData, error: ingredientsError } = await supabase.from('recipe_ingredients').select('*').eq('recipe_id', id).order('order_index', {
            ascending: true
        });
        if (ingredientsError) {
            console.error('Error fetching ingredients:', ingredientsError);
            throw new Error(`Failed to fetch ingredients: ${ingredientsError.message}`);
        }
        const recipe = recipeData;
        const ingredients = ingredientsData || [];
        return {
            ...recipe,
            ingredients
        };
    }
    /**
   * Create a new recipe
   */ async createRecipe(input) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { ingredients, instructions = [], tags = [], is_favorite = false, source = 'custom', ...recipeData } = input;
        // Insert recipe
        const { data: recipe, error: recipeError } = await supabase.from('recipes').insert({
            ...recipeData,
            instructions: instructions,
            tags: tags || [],
            is_favorite,
            source,
            updated_at: new Date().toISOString()
        }).select().single();
        if (recipeError) {
            console.error('Error creating recipe:', recipeError);
            throw new Error(`Failed to create recipe: ${recipeError.message}`);
        }
        const recipeId = recipe.id;
        // Insert ingredients if provided
        if (ingredients && ingredients.length > 0) {
            const ingredientsToInsert = ingredients.map((ing, index)=>({
                    recipe_id: recipeId,
                    name: ing.name,
                    amount: ing.amount ?? null,
                    unit: ing.unit ?? null,
                    notes: ing.notes ?? null,
                    order_index: ing.order_index ?? index
                }));
            const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(ingredientsToInsert);
            if (ingredientsError) {
                console.error('Error creating ingredients:', ingredientsError);
            // Don't fail the whole operation, but log the error
            }
        }
        // Create initial version
        await this.createVersion(recipeId, recipe, 'Initial version');
        // Fetch the complete recipe with ingredients
        const fullRecipe = await this.getRecipe(recipeId);
        if (!fullRecipe) {
            throw new Error('Failed to fetch created recipe');
        }
        return fullRecipe;
    }
    /**
   * Update a recipe (creates a new version)
   */ async updateRecipe(id, input, commitMessage) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        // Get current recipe for version snapshot
        const currentRecipe = await this.getRecipe(id);
        if (!currentRecipe) {
            throw new Error('Recipe not found');
        }
        const { ingredients, instructions, tags, ...recipeData } = input;
        // Update recipe
        const updateData = {
            ...recipeData,
            updated_at: new Date().toISOString()
        };
        if (instructions !== undefined) {
            updateData.instructions = instructions;
        }
        if (tags !== undefined) {
            updateData.tags = tags;
        }
        const { data: updatedRecipe, error: recipeError } = await supabase.from('recipes').update(updateData).eq('id', id).select().single();
        if (recipeError) {
            console.error('Error updating recipe:', recipeError);
            throw new Error(`Failed to update recipe: ${recipeError.message}`);
        }
        // Update ingredients if provided
        if (ingredients !== undefined) {
            // Delete existing ingredients
            await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
            // Insert new ingredients
            if (ingredients.length > 0) {
                const ingredientsToInsert = ingredients.map((ing, index)=>({
                        recipe_id: id,
                        name: ing.name,
                        amount: ing.amount ?? null,
                        unit: ing.unit ?? null,
                        notes: ing.notes ?? null,
                        order_index: ing.order_index ?? index
                    }));
                const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(ingredientsToInsert);
                if (ingredientsError) {
                    console.error('Error updating ingredients:', ingredientsError);
                // Don't fail the whole operation
                }
            }
        }
        // Create version snapshot
        const versionMessage = commitMessage || 'Recipe updated';
        await this.createVersion(id, updatedRecipe, versionMessage);
        // Fetch the complete updated recipe
        const fullRecipe = await this.getRecipe(id);
        if (!fullRecipe) {
            throw new Error('Failed to fetch updated recipe');
        }
        return fullRecipe;
    }
    /**
   * Delete a recipe
   */ async deleteRecipe(id) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        // Delete recipe (cascade will delete ingredients and versions)
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) {
            console.error('Error deleting recipe:', error);
            throw new Error(`Failed to delete recipe: ${error.message}`);
        }
    }
    /**
   * Get version history for a recipe
   */ async getRecipeVersions(recipeId) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('recipe_versions').select('*').eq('recipe_id', recipeId).order('version_number', {
            ascending: false
        });
        if (error) {
            console.error('Error fetching versions:', error);
            throw new Error(`Failed to fetch versions: ${error.message}`);
        }
        return data || [];
    }
    /**
   * Get a specific version
   */ async getRecipeVersion(recipeId, versionId) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('recipe_versions').select('*').eq('id', versionId).eq('recipe_id', recipeId).single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Error fetching version:', error);
            throw new Error(`Failed to fetch version: ${error.message}`);
        }
        return data;
    }
    /**
   * Restore a recipe to a specific version
   */ async restoreRecipeVersion(recipeId, versionId) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        // Get the version
        const version = await this.getRecipeVersion(recipeId, versionId);
        if (!version) {
            throw new Error('Version not found');
        }
        const snapshot = version.recipe_snapshot;
        // Restore recipe from snapshot
        const { data: updatedRecipe, error: recipeError } = await supabase.from('recipes').update({
            name: snapshot.name,
            description: snapshot.description,
            source: snapshot.source,
            source_url: snapshot.source_url,
            prep_time: snapshot.prep_time,
            cook_time: snapshot.cook_time,
            servings: snapshot.servings,
            difficulty: snapshot.difficulty,
            tags: snapshot.tags,
            image_url: snapshot.image_url,
            instructions: snapshot.instructions,
            notes: snapshot.notes,
            is_favorite: snapshot.is_favorite,
            updated_at: new Date().toISOString()
        }).eq('id', recipeId).select().single();
        if (recipeError) {
            console.error('Error restoring recipe:', recipeError);
            throw new Error(`Failed to restore recipe: ${recipeError.message}`);
        }
        // Restore ingredients from snapshot (if available in snapshot)
        // Note: We need to check if ingredients are stored in the snapshot
        // For now, we'll restore from the current recipe's ingredients structure
        // In a full implementation, you might want to store ingredients in the snapshot too
        // Create a new version documenting the restore
        await this.createVersion(recipeId, updatedRecipe, `Restored to version ${version.version_number}`);
        // Fetch the complete restored recipe
        const fullRecipe = await this.getRecipe(recipeId);
        if (!fullRecipe) {
            throw new Error('Failed to fetch restored recipe');
        }
        return fullRecipe;
    }
    /**
   * Create a version snapshot (internal method)
   */ async createVersion(recipeId, recipe, commitMessage) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        // Get next version number
        const { data: versionData } = await supabase.rpc('get_next_version_number', {
            p_recipe_id: recipeId
        });
        const versionNumber = versionData || 1;
        // Get current ingredients to include in snapshot
        const { data: ingredientsData } = await supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId).order('order_index', {
            ascending: true
        });
        const ingredients = ingredientsData || [];
        // Create snapshot with recipe and ingredients
        const snapshot = {
            ...recipe,
            ingredients
        };
        // Insert version
        const { error } = await supabase.from('recipe_versions').insert({
            recipe_id: recipeId,
            version_number: versionNumber,
            commit_message: commitMessage,
            recipe_snapshot: snapshot
        });
        if (error) {
            console.error('Error creating version:', error);
        // Don't throw - versioning is not critical for recipe updates
        }
    }
}
const cookingService = new CookingService();
}),
"[project]/lib/services/meal-planning.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MealPlanningService",
    ()=>MealPlanningService,
    "mealPlanningService",
    ()=>mealPlanningService
]);
/**
 * Meal Planning Service
 * Handles meal plan creation, management, and shopping list generation
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$cooking$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/cooking.service.ts [app-route] (ecmascript)");
;
;
class MealPlanningService {
    /**
   * Get week start date (Monday) for a given date
   */ getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
        ;
        return new Date(d.setDate(diff));
    }
    /**
   * Get week number for a date
   */ getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }
    /**
   * Get meal plan for a specific week
   */ async getMealPlan(weekStart) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const targetDate = weekStart || new Date();
        const weekStartDate = this.getWeekStart(targetDate);
        const year = weekStartDate.getFullYear();
        const weekNumber = this.getWeekNumber(weekStartDate);
        const { data, error } = await supabase.from('meal_plans').select('*').eq('year', year).eq('week_number', weekNumber).single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null // Not found
                ;
            }
            console.error('Error fetching meal plan:', error);
            throw new Error(`Failed to fetch meal plan: ${error.message}`);
        }
        return data;
    }
    /**
   * Save or update a meal plan
   */ async saveMealPlan(input) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const weekStartDate = new Date(input.week_start_date || new Date());
        const year = weekStartDate.getFullYear();
        const weekNumber = this.getWeekNumber(weekStartDate);
        // Check if meal plan exists
        const existing = await this.getMealPlan(weekStartDate);
        if (existing) {
            // Update existing
            const { data, error } = await supabase.from('meal_plans').update({
                meals: input.meals,
                notes: input.notes || null,
                updated_at: new Date().toISOString()
            }).eq('id', existing.id).select().single();
            if (error) {
                console.error('Error updating meal plan:', error);
                throw new Error(`Failed to update meal plan: ${error.message}`);
            }
            return data;
        } else {
            // Create new
            const { data, error } = await supabase.from('meal_plans').insert({
                week_start_date: weekStartDate.toISOString().split('T')[0],
                year,
                week_number: weekNumber,
                meals: input.meals,
                notes: input.notes || null
            }).select().single();
            if (error) {
                console.error('Error creating meal plan:', error);
                throw new Error(`Failed to create meal plan: ${error.message}`);
            }
            return data;
        }
    }
    /**
   * Delete a meal plan
   */ async deleteMealPlan(id) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { error } = await supabase.from('meal_plans').delete().eq('id', id);
        if (error) {
            console.error('Error deleting meal plan:', error);
            throw new Error(`Failed to delete meal plan: ${error.message}`);
        }
    }
    /**
   * Generate shopping list from meal plan
   */ async generateShoppingList(mealPlanId) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        // Get meal plan
        const mealPlan = await this.getMealPlanById(mealPlanId);
        if (!mealPlan) {
            throw new Error('Meal plan not found');
        }
        // Collect all recipe IDs from the meal plan
        const recipeIds = new Set();
        const days = [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
        ];
        days.forEach((day)=>{
            const dayMeals = mealPlan.meals[day];
            if (dayMeals) {
                if (dayMeals.breakfast) recipeIds.add(dayMeals.breakfast);
                if (dayMeals.lunch) recipeIds.add(dayMeals.lunch);
                if (dayMeals.dinner) recipeIds.add(dayMeals.dinner);
                if (dayMeals.snack) recipeIds.add(dayMeals.snack);
            }
        });
        // Fetch all recipes with ingredients
        const recipes = [];
        for (const recipeId of recipeIds){
            try {
                const recipe = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$cooking$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookingService"].getRecipe(recipeId);
                if (recipe) {
                    // Determine which meals use this recipe
                    const mealTypes = [];
                    days.forEach((day)=>{
                        const dayMeals = mealPlan.meals[day];
                        if (dayMeals) {
                            if (dayMeals.breakfast === recipeId) mealTypes.push(`${day} breakfast`);
                            if (dayMeals.lunch === recipeId) mealTypes.push(`${day} lunch`);
                            if (dayMeals.dinner === recipeId) mealTypes.push(`${day} dinner`);
                            if (dayMeals.snack === recipeId) mealTypes.push(`${day} snack`);
                        }
                    });
                    recipes.push({
                        recipe,
                        mealTypes
                    });
                }
            } catch (error) {
                console.error(`Failed to fetch recipe ${recipeId}:`, error);
            }
        }
        // Aggregate ingredients
        const ingredientMap = new Map();
        recipes.forEach(({ recipe, mealTypes })=>{
            recipe.ingredients.forEach((ing)=>{
                const key = ing.name.toLowerCase().trim();
                const existing = ingredientMap.get(key);
                if (existing) {
                    // Merge amounts if same unit
                    if (existing.unit === ing.unit && ing.amount && existing.amount) {
                        existing.amount += ing.amount;
                    } else if (ing.amount) {
                        // Different units or no existing amount - keep separate or combine
                        existing.recipes.push(recipe.name);
                    }
                } else {
                    ingredientMap.set(key, {
                        ingredient: ing.name,
                        amount: ing.amount || 0,
                        unit: ing.unit || '',
                        recipes: [
                            recipe.name
                        ]
                    });
                }
            });
        });
        const items = Array.from(ingredientMap.values());
        // Check if shopping list already exists
        const { data: existingList } = await supabase.from('shopping_lists').select('*').eq('meal_plan_id', mealPlanId).single();
        const listData = {
            meal_plan_id: mealPlanId,
            items: items,
            status: 'draft',
            updated_at: new Date().toISOString()
        };
        if (existingList) {
            // Update existing
            const { data, error } = await supabase.from('shopping_lists').update(listData).eq('id', existingList.id).select().single();
            if (error) {
                console.error('Error updating shopping list:', error);
                throw new Error(`Failed to update shopping list: ${error.message}`);
            }
            return {
                ...data,
                items
            };
        } else {
            // Create new
            const { data, error } = await supabase.from('shopping_lists').insert(listData).select().single();
            if (error) {
                console.error('Error creating shopping list:', error);
                throw new Error(`Failed to create shopping list: ${error.message}`);
            }
            return {
                ...data,
                items
            };
        }
    }
    /**
   * Get shopping list for a meal plan
   */ async getShoppingList(mealPlanId) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('shopping_lists').select('*').eq('meal_plan_id', mealPlanId).single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Error fetching shopping list:', error);
            throw new Error(`Failed to fetch shopping list: ${error.message}`);
        }
        return {
            ...data,
            items: data.items || []
        };
    }
    /**
   * Update shopping list status
   */ async updateShoppingListStatus(shoppingListId, status) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { error } = await supabase.from('shopping_lists').update({
            status,
            updated_at: new Date().toISOString()
        }).eq('id', shoppingListId);
        if (error) {
            console.error('Error updating shopping list status:', error);
            throw new Error(`Failed to update shopping list: ${error.message}`);
        }
    }
    /**
   * Get meal plan by ID
   */ async getMealPlanById(id) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('meal_plans').select('*').eq('id', id).single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to fetch meal plan: ${error.message}`);
        }
        return data;
    }
}
const mealPlanningService = new MealPlanningService();
}),
"[project]/lib/api/cors.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CORS_HEADERS",
    ()=>CORS_HEADERS,
    "corsErrorResponse",
    ()=>corsErrorResponse,
    "corsOptionsResponse",
    ()=>corsOptionsResponse,
    "withCors",
    ()=>withCors
]);
/**
 * CORS helper for API routes
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};
function withCors(response) {
    Object.entries(CORS_HEADERS).forEach(([key, value])=>{
        response.headers.set(key, value);
    });
    return response;
}
function corsOptionsResponse() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({}, {
        headers: CORS_HEADERS
    });
}
function corsErrorResponse(error, status = 500) {
    return withCors(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        success: false,
        error
    }, {
        status
    }));
}
}),
"[project]/app/api/cooking/meal-plans/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
/**
 * Meal Plans API Routes
 * GET - Get meal plans (filter by week)
 * POST - Create/update meal plan
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$meal$2d$planning$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/meal-planning.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/cors.ts [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const weekStartParam = searchParams.get('week_start');
        const weekStart = weekStartParam ? new Date(weekStartParam) : undefined;
        const mealPlan = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$meal$2d$planning$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mealPlanningService"].getMealPlan(weekStart);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withCors"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            data: mealPlan
        }));
    } catch (error) {
        console.error('Error fetching meal plan:', error);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withCors"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        }));
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const input = body;
        if (!input.week_start_date) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withCors"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: 'week_start_date is required'
            }, {
                status: 400
            }));
        }
        const mealPlan = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$meal$2d$planning$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mealPlanningService"].saveMealPlan(input);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withCors"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            data: mealPlan
        }));
    } catch (error) {
        console.error('Error saving meal plan:', error);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withCors"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        }));
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__5157d420._.js.map
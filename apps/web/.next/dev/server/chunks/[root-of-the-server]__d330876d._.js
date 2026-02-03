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
"[project]/lib/services/coffee-config.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "coffeeConfigService",
    ()=>coffeeConfigService
]);
/**
 * Coffee Config Service
 * Handles database operations for coffee configuration management
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-route] (ecmascript)");
;
// Transform database row to app type
function dbRecipeToApp(row) {
    return {
        id: row.id,
        method: row.method,
        cupSize: row.cup_size,
        cupSizeLabel: row.cup_size_label,
        waterMl: row.water_ml,
        roast: row.roast,
        ratio: row.ratio,
        coffee: row.coffee,
        temp: row.temp,
        technique: row.technique,
        switchSetting: row.switch_setting,
        moccaSetting: row.mocca_setting,
        timingCues: row.timing_cues || [],
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
function dbRoastStrategyToApp(row) {
    return {
        id: row.id,
        roast: row.roast,
        goal: row.goal,
        temp: row.temp,
        technique: row.technique,
        ratio: row.ratio,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
function dbQuickDoseToApp(row) {
    return {
        id: row.id,
        method: row.method,
        label: row.label,
        grams: row.grams,
        note: row.note || undefined,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
function dbGoldenRuleToApp(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
function dbRecommendationToApp(row) {
    return {
        id: row.id,
        name: row.name,
        dayOfWeek: row.day_of_week,
        hourStart: row.hour_start,
        hourEnd: row.hour_end,
        method: row.method,
        cupSize: row.cup_size,
        roast: row.roast,
        priority: row.priority,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
class CoffeeConfigService {
    /**
   * Get the best client for reads: service role when available, otherwise anon.
   * This matches the pattern used by other working services.
   */ getReadClient() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseServiceClient"])() ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClient"])();
    }
    /**
   * Get the client for writes: requires service role
   */ getWriteClient() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseServiceClient"])() ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClient"])();
    }
    // ============================================
    // GET ALL CONFIG
    // ============================================
    async getConfig() {
        const [roastStrategies, recipes, quickDoses, goldenRules, recommendations] = await Promise.all([
            this.getRoastStrategies(),
            this.getRecipes(),
            this.getQuickDoses(),
            this.getGoldenRules(),
            this.getRecommendations()
        ]);
        return {
            roastStrategies,
            recipes,
            quickDoses,
            goldenRules,
            recommendations
        };
    }
    // ============================================
    // ROAST STRATEGIES
    // ============================================
    async getRoastStrategies() {
        const supabase = this.getReadClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_roast_strategies').select('*').order('sort_order', {
            ascending: true
        });
        if (error) {
            console.error('Error fetching roast strategies:', error);
            throw new Error(`Failed to fetch roast strategies: ${error.message}`);
        }
        return data.map(dbRoastStrategyToApp);
    }
    async updateRoastStrategy(id, data) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data: updated, error } = await supabase.from('coffee_roast_strategies').update({
            goal: data.goal,
            temp: data.temp,
            technique: data.technique,
            ratio: data.ratio,
            sort_order: data.sortOrder
        }).eq('id', id).select().single();
        if (error) {
            console.error('Error updating roast strategy:', error);
            throw new Error(`Failed to update roast strategy: ${error.message}`);
        }
        return dbRoastStrategyToApp(updated);
    }
    // ============================================
    // RECIPES
    // ============================================
    async getRecipes(method) {
        const supabase = this.getReadClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        let query = supabase.from('coffee_recipes').select('*').order('method', {
            ascending: true
        }).order('cup_size', {
            ascending: true
        }).order('roast', {
            ascending: true
        });
        if (method) {
            query = query.eq('method', method);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching recipes:', error);
            throw new Error(`Failed to fetch recipes: ${error.message}`);
        }
        return data.map(dbRecipeToApp);
    }
    async getRecipe(id) {
        const supabase = this.getReadClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_recipes').select('*').eq('id', id).single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null // Not found
                ;
            }
            console.error('Error fetching recipe:', error);
            throw new Error(`Failed to fetch recipe: ${error.message}`);
        }
        return dbRecipeToApp(data);
    }
    async createRecipe(recipe) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_recipes').insert({
            method: recipe.method,
            cup_size: recipe.cupSize,
            cup_size_label: recipe.cupSizeLabel,
            water_ml: recipe.waterMl,
            roast: recipe.roast,
            ratio: recipe.ratio,
            coffee: recipe.coffee,
            temp: recipe.temp,
            technique: recipe.technique,
            switch_setting: recipe.switchSetting || null,
            mocca_setting: recipe.moccaSetting || null,
            timing_cues: recipe.timingCues || [],
            is_active: recipe.isActive ?? true
        }).select().single();
        if (error) {
            console.error('Error creating recipe:', error);
            throw new Error(`Failed to create recipe: ${error.message}`);
        }
        return dbRecipeToApp(data);
    }
    async updateRecipe(id, recipe) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const updateData = {};
        if (recipe.method !== undefined) updateData.method = recipe.method;
        if (recipe.cupSize !== undefined) updateData.cup_size = recipe.cupSize;
        if (recipe.cupSizeLabel !== undefined) updateData.cup_size_label = recipe.cupSizeLabel;
        if (recipe.waterMl !== undefined) updateData.water_ml = recipe.waterMl;
        if (recipe.roast !== undefined) updateData.roast = recipe.roast;
        if (recipe.ratio !== undefined) updateData.ratio = recipe.ratio;
        if (recipe.coffee !== undefined) updateData.coffee = recipe.coffee;
        if (recipe.temp !== undefined) updateData.temp = recipe.temp;
        if (recipe.technique !== undefined) updateData.technique = recipe.technique;
        if (recipe.switchSetting !== undefined) updateData.switch_setting = recipe.switchSetting;
        if (recipe.moccaSetting !== undefined) updateData.mocca_setting = recipe.moccaSetting;
        if (recipe.timingCues !== undefined) updateData.timing_cues = recipe.timingCues;
        if (recipe.isActive !== undefined) updateData.is_active = recipe.isActive;
        const { data, error } = await supabase.from('coffee_recipes').update(updateData).eq('id', id).select().single();
        if (error) {
            console.error('Error updating recipe:', error);
            throw new Error(`Failed to update recipe: ${error.message}`);
        }
        return dbRecipeToApp(data);
    }
    async deleteRecipe(id) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { error } = await supabase.from('coffee_recipes').delete().eq('id', id);
        if (error) {
            console.error('Error deleting recipe:', error);
            throw new Error(`Failed to delete recipe: ${error.message}`);
        }
    }
    // ============================================
    // QUICK DOSES
    // ============================================
    async getQuickDoses(method) {
        const supabase = this.getReadClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        let query = supabase.from('coffee_quick_doses').select('*').order('method', {
            ascending: true
        }).order('sort_order', {
            ascending: true
        });
        if (method) {
            query = query.eq('method', method);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching quick doses:', error);
            throw new Error(`Failed to fetch quick doses: ${error.message}`);
        }
        return data.map(dbQuickDoseToApp);
    }
    async createQuickDose(dose) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_quick_doses').insert({
            method: dose.method,
            label: dose.label,
            grams: dose.grams,
            note: dose.note || null,
            sort_order: dose.sortOrder ?? 0
        }).select().single();
        if (error) {
            console.error('Error creating quick dose:', error);
            throw new Error(`Failed to create quick dose: ${error.message}`);
        }
        return dbQuickDoseToApp(data);
    }
    async updateQuickDose(id, dose) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const updateData = {};
        if (dose.method !== undefined) updateData.method = dose.method;
        if (dose.label !== undefined) updateData.label = dose.label;
        if (dose.grams !== undefined) updateData.grams = dose.grams;
        if (dose.note !== undefined) updateData.note = dose.note;
        if (dose.sortOrder !== undefined) updateData.sort_order = dose.sortOrder;
        const { data, error } = await supabase.from('coffee_quick_doses').update(updateData).eq('id', id).select().single();
        if (error) {
            console.error('Error updating quick dose:', error);
            throw new Error(`Failed to update quick dose: ${error.message}`);
        }
        return dbQuickDoseToApp(data);
    }
    async deleteQuickDose(id) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { error } = await supabase.from('coffee_quick_doses').delete().eq('id', id);
        if (error) {
            console.error('Error deleting quick dose:', error);
            throw new Error(`Failed to delete quick dose: ${error.message}`);
        }
    }
    // ============================================
    // GOLDEN RULES
    // ============================================
    async getGoldenRules() {
        const supabase = this.getReadClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_golden_rules').select('*').order('sort_order', {
            ascending: true
        });
        if (error) {
            console.error('Error fetching golden rules:', error);
            throw new Error(`Failed to fetch golden rules: ${error.message}`);
        }
        return data.map(dbGoldenRuleToApp);
    }
    async createGoldenRule(rule) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_golden_rules').insert({
            title: rule.title,
            description: rule.description,
            sort_order: rule.sortOrder ?? 0
        }).select().single();
        if (error) {
            console.error('Error creating golden rule:', error);
            throw new Error(`Failed to create golden rule: ${error.message}`);
        }
        return dbGoldenRuleToApp(data);
    }
    async updateGoldenRule(id, rule) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const updateData = {};
        if (rule.title !== undefined) updateData.title = rule.title;
        if (rule.description !== undefined) updateData.description = rule.description;
        if (rule.sortOrder !== undefined) updateData.sort_order = rule.sortOrder;
        const { data, error } = await supabase.from('coffee_golden_rules').update(updateData).eq('id', id).select().single();
        if (error) {
            console.error('Error updating golden rule:', error);
            throw new Error(`Failed to update golden rule: ${error.message}`);
        }
        return dbGoldenRuleToApp(data);
    }
    async deleteGoldenRule(id) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { error } = await supabase.from('coffee_golden_rules').delete().eq('id', id);
        if (error) {
            console.error('Error deleting golden rule:', error);
            throw new Error(`Failed to delete golden rule: ${error.message}`);
        }
    }
    // ============================================
    // RECOMMENDATIONS
    // ============================================
    async getRecommendations() {
        const supabase = this.getReadClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_recommendations').select('*').order('priority', {
            ascending: false
        });
        if (error) {
            console.error('Error fetching recommendations:', error);
            throw new Error(`Failed to fetch recommendations: ${error.message}`);
        }
        return data.map(dbRecommendationToApp);
    }
    async createRecommendation(rec) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { data, error } = await supabase.from('coffee_recommendations').insert({
            name: rec.name,
            day_of_week: rec.dayOfWeek,
            hour_start: rec.hourStart,
            hour_end: rec.hourEnd,
            method: rec.method,
            cup_size: rec.cupSize,
            roast: rec.roast,
            priority: rec.priority,
            is_active: rec.isActive ?? true
        }).select().single();
        if (error) {
            console.error('Error creating recommendation:', error);
            throw new Error(`Failed to create recommendation: ${error.message}`);
        }
        return dbRecommendationToApp(data);
    }
    async updateRecommendation(id, rec) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const updateData = {};
        if (rec.name !== undefined) updateData.name = rec.name;
        if (rec.dayOfWeek !== undefined) updateData.day_of_week = rec.dayOfWeek;
        if (rec.hourStart !== undefined) updateData.hour_start = rec.hourStart;
        if (rec.hourEnd !== undefined) updateData.hour_end = rec.hourEnd;
        if (rec.method !== undefined) updateData.method = rec.method;
        if (rec.cupSize !== undefined) updateData.cup_size = rec.cupSize;
        if (rec.roast !== undefined) updateData.roast = rec.roast;
        if (rec.priority !== undefined) updateData.priority = rec.priority;
        if (rec.isActive !== undefined) updateData.is_active = rec.isActive;
        const { data, error } = await supabase.from('coffee_recommendations').update(updateData).eq('id', id).select().single();
        if (error) {
            console.error('Error updating recommendation:', error);
            throw new Error(`Failed to update recommendation: ${error.message}`);
        }
        return dbRecommendationToApp(data);
    }
    async deleteRecommendation(id) {
        const supabase = this.getWriteClient();
        if (!supabase) {
            throw new Error('Supabase not configured');
        }
        const { error } = await supabase.from('coffee_recommendations').delete().eq('id', id);
        if (error) {
            console.error('Error deleting recommendation:', error);
            throw new Error(`Failed to delete recommendation: ${error.message}`);
        }
    }
    // ============================================
    // RECOMMENDED RECIPE (Time-based)
    // ============================================
    async getRecommendedRecipe() {
        const supabase = this.getReadClient();
        if (!supabase) {
            return null;
        }
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        // First try to find a day-specific recommendation
        const { data: specific } = await supabase.from('coffee_recommendations').select('*').eq('is_active', true).eq('day_of_week', dayOfWeek).lte('hour_start', hour).gt('hour_end', hour).order('priority', {
            ascending: false
        }).limit(1);
        if (specific && specific.length > 0) {
            const rec = specific[0];
            return {
                method: rec.method,
                cupSize: rec.cup_size,
                roast: rec.roast
            };
        }
        // Fall back to any-day recommendations
        const { data: general } = await supabase.from('coffee_recommendations').select('*').eq('is_active', true).is('day_of_week', null).lte('hour_start', hour).gt('hour_end', hour).order('priority', {
            ascending: false
        }).limit(1);
        if (general && general.length > 0) {
            const rec = general[0];
            return {
                method: rec.method,
                cupSize: rec.cup_size,
                roast: rec.roast
            };
        }
        // Default fallback
        return {
            method: 'moccamaster',
            cupSize: '8-cup',
            roast: 'medium'
        };
    }
}
const coffeeConfigService = new CoffeeConfigService();
}),
"[project]/app/api/coffee/config/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "OPTIONS",
    ()=>OPTIONS
]);
/**
 * Coffee Config API Routes
 * GET - Get all coffee configuration
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/cors.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coffee$2d$config$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/coffee-config.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
;
;
async function GET() {
    try {
        const config = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coffee$2d$config$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["coffeeConfigService"].getConfig();
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withCors"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            data: config
        }));
    } catch (error) {
        console.error('Error fetching coffee config:', error);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withCors"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        }));
    }
}
async function OPTIONS() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["corsOptionsResponse"])();
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d330876d._.js.map
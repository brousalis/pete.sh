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
"[project]/lib/services/settings.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_SETTINGS",
    ()=>DEFAULT_SETTINGS,
    "settingsService",
    ()=>settingsService
]);
/**
 * Settings Service
 * Handles fetching and updating application settings from Supabase
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-route] (ecmascript)");
;
const DEFAULT_SETTINGS = {
    rounded_layout: true,
    theme: 'system',
    brand_color: 'yellow'
};
class SettingsService {
    /**
   * Get the current app settings
   * Returns default settings if Supabase is not configured or no settings exist
   */ async getSettings() {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('read');
        if (!supabase) {
            console.log('[SettingsService] Supabase not configured, using defaults');
            return null;
        }
        try {
            const { data, error } = await supabase.from('app_settings').select('*').limit(1).single();
            if (error) {
                // PGRST116 means no rows found - this is expected on first run
                if (error.code === 'PGRST116') {
                    console.log('[SettingsService] No settings found, will use defaults');
                    return null;
                }
                console.error('[SettingsService] Error fetching settings:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('[SettingsService] Unexpected error:', err);
            return null;
        }
    }
    /**
   * Update app settings
   * Creates settings row if it doesn't exist
   */ async updateSettings(updates) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClientForOperation"])('write');
        if (!supabase) {
            console.error('[SettingsService] Supabase not configured for writes');
            return null;
        }
        try {
            // First, try to get existing settings
            const { data: existing } = await supabase.from('app_settings').select('id').limit(1).single();
            if (existing) {
                // Update existing row
                const { data, error } = await supabase.from('app_settings').update(updates).eq('id', existing.id).select().single();
                if (error) {
                    console.error('[SettingsService] Error updating settings:', error);
                    return null;
                }
                return data;
            } else {
                // Insert new row with defaults + updates
                const { data, error } = await supabase.from('app_settings').insert({
                    ...DEFAULT_SETTINGS,
                    ...updates
                }).select().single();
                if (error) {
                    console.error('[SettingsService] Error creating settings:', error);
                    return null;
                }
                return data;
            }
        } catch (err) {
            console.error('[SettingsService] Unexpected error:', err);
            return null;
        }
    }
    /**
   * Initialize settings if they don't exist
   */ async initializeSettings() {
        const existing = await this.getSettings();
        if (existing) return existing;
        return this.updateSettings(DEFAULT_SETTINGS);
    }
}
const settingsService = new SettingsService();
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/app/api/settings/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "PUT",
    ()=>PUT
]);
/**
 * Settings API Routes
 * GET - Fetch current app settings
 * PUT - Update app settings
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$settings$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/settings.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
;
async function GET() {
    try {
        const settings = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$settings$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["settingsService"].getSettings();
        if (!settings) {
            // Return default settings when DB not available
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$settings$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_SETTINGS"],
                id: 'default',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(settings);
    } catch (error) {
        console.error('[Settings API] GET error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch settings'
        }, {
            status: 500
        });
    }
}
async function PUT(request) {
    try {
        const body = await request.json();
        // Validate the update payload
        const allowedKeys = [
            'rounded_layout',
            'theme',
            'brand_color'
        ];
        const updates = {};
        for (const key of allowedKeys){
            if (key in body) {
                updates[key] = body[key];
            }
        }
        if (Object.keys(updates).length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'No valid settings to update'
            }, {
                status: 400
            });
        }
        // Validate values
        if ('rounded_layout' in updates && typeof updates.rounded_layout !== 'boolean') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'rounded_layout must be a boolean'
            }, {
                status: 400
            });
        }
        if ('theme' in updates && ![
            'light',
            'dark',
            'system'
        ].includes(updates.theme)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'theme must be one of: light, dark, system'
            }, {
                status: 400
            });
        }
        if ('brand_color' in updates && ![
            'purple',
            'blue',
            'teal',
            'orange',
            'pink',
            'yellow'
        ].includes(updates.brand_color)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'brand_color must be one of: purple, blue, teal, orange, pink, yellow'
            }, {
                status: 400
            });
        }
        const settings = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$settings$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["settingsService"].updateSettings(updates);
        if (!settings) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Failed to update settings'
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(settings);
    } catch (error) {
        console.error('[Settings API] PUT error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to update settings'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4ba7f6e9._.js.map
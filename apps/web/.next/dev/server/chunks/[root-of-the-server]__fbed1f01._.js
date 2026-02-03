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
"[project]/lib/api/utils.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "errorResponse",
    ()=>errorResponse,
    "getJsonBody",
    ()=>getJsonBody,
    "handleApiError",
    ()=>handleApiError,
    "successResponse",
    ()=>successResponse,
    "validateMethod",
    ()=>validateMethod
]);
/**
 * API utility functions for Next.js API routes
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
function successResponse(data, status = 200) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        success: true,
        data
    }, {
        status
    });
}
function errorResponse(error, status = 500) {
    const errorObj = typeof error === "string" ? {
        code: "UNKNOWN",
        message: error
    } : error;
    const response = {
        success: false,
        error: errorObj.message
    };
    if (errorObj.code) {
        response.code = errorObj.code;
    }
    if (errorObj.details) {
        response.details = errorObj.details;
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(response, {
        status
    });
}
function handleApiError(error) {
    console.error("API Error:", error);
    if (error instanceof Error) {
        return errorResponse(error.message, 500);
    }
    return errorResponse("An unexpected error occurred", 500);
}
function validateMethod(request, allowedMethods) {
    return allowedMethods.includes(request.method);
}
async function getJsonBody(request) {
    try {
        return await request.json();
    } catch  {
        throw new Error("Invalid JSON body");
    }
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
"[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Base Adapter
 * Provides common functionality for all service adapters
 * 
 * The adapter pattern allows seamless switching between:
 * - Local mode: Fetch from real service + write to Supabase (auto-detected)
 * - Production mode: Read from Supabase cache (fallback when services unreachable)
 * 
 * Mode is auto-detected by attempting to reach local services.
 * No DEPLOYMENT_MODE env var required.
 */ __turbopack_context__.s([
    "AVAILABILITY_CHECK_TIMEOUT",
    ()=>AVAILABILITY_CHECK_TIMEOUT,
    "BaseAdapter",
    ()=>BaseAdapter,
    "clearAvailabilityCache",
    ()=>clearAvailabilityCache,
    "getCurrentTimestamp",
    ()=>getCurrentTimestamp,
    "getServiceAvailabilityStatus",
    ()=>getServiceAvailabilityStatus,
    "isAnyLocalServiceAvailable",
    ()=>isAnyLocalServiceAvailable,
    "parseJsonSafe",
    ()=>parseJsonSafe
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-route] (ecmascript)");
;
/** Cache of service availability checks */ const serviceAvailabilityCache = new Map();
/** How long to cache availability results (ms) */ const AVAILABILITY_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
;
const AVAILABILITY_CHECK_TIMEOUT = 2000 // 2 seconds
;
/**
 * Check if a cached availability result is still valid
 */ function isAvailabilityCacheValid(serviceName) {
    const cached = serviceAvailabilityCache.get(serviceName);
    if (!cached) return false;
    const age = Date.now() - cached.checkedAt.getTime();
    return age < AVAILABILITY_CACHE_TTL;
}
function getServiceAvailabilityStatus() {
    const result = {};
    const services = [
        'hue',
        'spotify',
        'cta',
        'calendar',
        'fitness'
    ];
    for (const service of services){
        result[service] = serviceAvailabilityCache.get(service) ?? null;
    }
    return result;
}
function isAnyLocalServiceAvailable() {
    for (const [, status] of serviceAvailabilityCache){
        if (status.available) return true;
    }
    return false;
}
function clearAvailabilityCache() {
    serviceAvailabilityCache.clear();
}
class BaseAdapter {
    serviceName;
    debug;
    /** Cached availability status for this adapter instance */ localAvailable = null;
    constructor(config){
        this.serviceName = config.serviceName;
        this.debug = config.debug ?? false;
    }
    /**
   * Get the Supabase client for read operations
   * Returns null if Supabase is not configured
   */ getReadClient() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClient"])();
    }
    /**
   * Get the Supabase client for write operations
   * Uses service role key if available (for local mode writes)
   * Returns null if Supabase is not configured
   */ getWriteClient() {
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hasServiceRoleKey"])()) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseServiceClient"])();
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClient"])();
    }
    /**
   * Check if Supabase is available for caching
   */ isSupabaseAvailable() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isSupabaseConfigured"])();
    }
    /**
   * Check if local service is available (with caching)
   */ async isLocalServiceAvailable() {
        // Check instance cache first (for multiple calls in same request)
        if (this.localAvailable !== null) {
            return this.localAvailable;
        }
        // Check global cache
        if (isAvailabilityCacheValid(this.serviceName)) {
            const cached = serviceAvailabilityCache.get(this.serviceName);
            this.localAvailable = cached.available;
            return cached.available;
        }
        // Perform actual check
        this.log('Checking local service availability...');
        try {
            const available = await this.checkServiceAvailability();
            // Cache the result
            serviceAvailabilityCache.set(this.serviceName, {
                available,
                checkedAt: new Date()
            });
            this.localAvailable = available;
            this.log(`Local service ${available ? 'available' : 'unavailable'}`);
            return available;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Cache the failure
            serviceAvailabilityCache.set(this.serviceName, {
                available: false,
                checkedAt: new Date(),
                error: errorMessage
            });
            this.localAvailable = false;
            this.log(`Local service check failed: ${errorMessage}`);
            return false;
        }
    }
    /**
   * Check if running in local mode (service available)
   * Auto-detects based on service reachability
   */ async isLocal() {
        return this.isLocalServiceAvailable();
    }
    /**
   * Check if running in production mode (service unavailable)
   * Auto-detects based on service reachability
   */ async isProduction() {
        return !await this.isLocalServiceAvailable();
    }
    /**
   * Synchronous check if local - uses cached value
   * Returns false if no cached value (assumes production until proven otherwise)
   */ isLocalSync() {
        if (this.localAvailable !== null) {
            return this.localAvailable;
        }
        const cached = serviceAvailabilityCache.get(this.serviceName);
        if (cached && isAvailabilityCacheValid(this.serviceName)) {
            return cached.available;
        }
        // Default to false (production) if not yet checked
        return false;
    }
    /**
   * Log a message if debug is enabled
   */ log(message, data) {
        if (this.debug) {
            console.log(`[${this.serviceName.toUpperCase()} Adapter] ${message}`, data ?? '');
        }
    }
    /**
   * Log an error
   * Silently ignores Supabase configuration errors to avoid console spam
   */ logError(message, error) {
        // Suppress errors related to missing tables or unconfigured Supabase
        if (error && typeof error === 'object') {
            const errObj = error;
            // Suppress table not found errors (migration not run yet)
            if (errObj.code === 'PGRST205' || errObj.code === '42P01') return;
            // Suppress connection errors when Supabase isn't properly configured  
            if (errObj.message && String(errObj.message).includes('not configured')) return;
        }
        console.error(`[${this.serviceName.toUpperCase()} Adapter] ${message}`, error ?? '');
    }
    /**
   * Record a sync operation in the sync_log table
   */ async logSync(status, recordsSynced = 0, errorMessage) {
        if (!this.isSupabaseAvailable()) return;
        try {
            const client = this.getWriteClient();
            if (!client) return; // Supabase not configured
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await client.from('sync_log').insert({
                service: this.serviceName,
                status,
                records_synced: recordsSynced,
                error_message: errorMessage ?? null,
                synced_at: new Date().toISOString()
            });
        } catch (error) {
            // Silently ignore - logging sync shouldn't break the app
            if (this.debug) {
                this.logError('Failed to log sync', error);
            }
        }
    }
    /**
   * Get the last sync time for this service
   */ async getLastSyncTime() {
        if (!this.isSupabaseAvailable()) return null;
        try {
            const client = this.getReadClient();
            if (!client) return null // Supabase not configured
            ;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await client.from('sync_log').select('synced_at').eq('service', this.serviceName).eq('status', 'success').order('synced_at', {
                ascending: false
            }).limit(1).single();
            if (error || !data) return null;
            return new Date(data.synced_at);
        } catch  {
            return null;
        }
    }
    /**
   * Main method to get data
   * Auto-detects mode:
   * - If local service reachable: fetches from service and writes to cache
   * - If local service unreachable: reads from cache
   */ async getData() {
        const isLocalAvailable = await this.isLocal();
        if (isLocalAvailable) {
            return this.getDataLocal();
        }
        return this.getDataProduction();
    }
    /**
   * Get data in local mode
   * Fetches from real service and writes to Supabase
   */ async getDataLocal() {
        this.log('Fetching from real service (local mode)');
        try {
            const data = await this.fetchFromService();
            // Write to cache in background (don't block the response)
            if (this.isSupabaseAvailable()) {
                this.writeToCache(data).then((result)=>{
                    if (result.success) {
                        this.log(`Cached ${result.recordsWritten} records`);
                    } else {
                        this.logError('Failed to cache data', result.error);
                    }
                }).catch((error)=>{
                    this.logError('Error writing to cache', error);
                });
            }
            return data;
        } catch (error) {
            this.logError('Error fetching from service', error);
            // On service error, try falling back to cache
            this.log('Service error, attempting cache fallback...');
            if (this.isSupabaseAvailable()) {
                try {
                    const cached = await this.fetchFromCache();
                    if (cached) {
                        this.log('Using cached data as fallback');
                        return cached;
                    }
                } catch  {
                // Cache fallback also failed
                }
            }
            throw error;
        }
    }
    /**
   * Get data in production mode
   * Reads from Supabase cache
   */ async getDataProduction() {
        this.log('Fetching from cache (production mode)');
        if (!this.isSupabaseAvailable()) {
            this.logError('Supabase not configured');
            return null;
        }
        try {
            const data = await this.fetchFromCache();
            if (!data) {
                this.log('No cached data available');
                return null;
            }
            return data;
        } catch (error) {
            this.logError('Error fetching from cache', error);
            return null;
        }
    }
    /**
   * Force refresh the cache (local mode only)
   * Fetches from service and writes to cache, waiting for write to complete
   */ async refreshCache() {
        const isLocalAvailable = await this.isLocal();
        if (!isLocalAvailable) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Cache refresh only available when local services are reachable'
            };
        }
        if (!this.isSupabaseAvailable()) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        this.log('Force refreshing cache');
        try {
            const data = await this.fetchFromService();
            const result = await this.writeToCache(data);
            await this.logSync(result.success ? 'success' : 'error', result.recordsWritten, result.error);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.logSync('error', 0, errorMessage);
            return {
                success: false,
                recordsWritten: 0,
                error: errorMessage
            };
        }
    }
}
function parseJsonSafe(data, fallback) {
    if (data === null || data === undefined) return fallback;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch  {
            return fallback;
        }
    }
    return fallback;
}
function getCurrentTimestamp() {
    return new Date().toISOString();
}
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/lib/services/fitness.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Fitness Service
 * Handles fitness routine storage and management
 * Based on workout.md - comprehensive fitness tracking system
 */ __turbopack_context__.s([
    "FitnessService",
    ()=>FitnessService,
    "ROUTINE_FILE_PATH",
    ()=>ROUTINE_FILE_PATH,
    "WORKOUT_DEFINITIONS_FILE_PATH",
    ()=>WORKOUT_DEFINITIONS_FILE_PATH
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
const ROUTINE_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'data', 'fitness-routine.json');
const WORKOUT_DEFINITIONS_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'data', 'workout-definitions.json');
const ROUTINE_FILE_PATH = ROUTINE_FILE;
const WORKOUT_DEFINITIONS_FILE_PATH = WORKOUT_DEFINITIONS_FILE;
class FitnessService {
    /**
   * Ensure data directory exists
   */ async ensureDataDir() {
        const dataDir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(ROUTINE_FILE);
        try {
            await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].access(dataDir);
        } catch  {
            await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].mkdir(dataDir, {
                recursive: true
            });
        }
    }
    /**
   * Get workout definitions (public method)
   */ async getWorkoutDefinitions() {
        try {
            const data = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(WORKOUT_DEFINITIONS_FILE, 'utf-8');
            return JSON.parse(data);
        } catch  {
            return {};
        }
    }
    /**
   * Update all workout definitions
   */ async updateWorkoutDefinitions(definitions) {
        await this.ensureDataDir();
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(WORKOUT_DEFINITIONS_FILE, JSON.stringify(definitions, null, 2), 'utf-8');
        return definitions;
    }
    /**
   * Update workout definition for a specific day
   */ async updateWorkoutDefinition(day, workout) {
        const definitions = await this.getWorkoutDefinitions();
        definitions[day] = workout;
        await this.updateWorkoutDefinitions(definitions);
        return workout;
    }
    /**
   * Get current week number (Monday start)
   */ getCurrentWeekNumber() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        return weekNumber;
    }
    /**
   * Get start date of week (Monday)
   */ getWeekStartDate(weekNumber) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = (weekNumber - 1) * 7;
        const weekStart = new Date(startOfYear);
        weekStart.setDate(startOfYear.getDate() + days - startOfYear.getDay() + 1); // Monday
        return weekStart;
    }
    /**
   * Get or create week routine
   */ async getOrCreateWeek(routine, weekNumber) {
        let week = routine.weeks.find((w)=>w.weekNumber === weekNumber);
        if (!week) {
            const startDate = this.getWeekStartDate(weekNumber);
            week = {
                weekNumber,
                startDate: startDate.toISOString(),
                days: {}
            };
            routine.weeks.push(week);
            routine.weeks.sort((a, b)=>a.weekNumber - b.weekNumber);
        }
        return week;
    }
    /**
   * Get weekly routine with workout definitions
   */ async getRoutine() {
        try {
            await this.ensureDataDir();
            const data = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(ROUTINE_FILE, 'utf-8');
            const routine = JSON.parse(data);
            // Ensure current week exists
            const currentWeek = this.getCurrentWeekNumber();
            await this.getOrCreateWeek(routine, currentWeek);
            // Load workout definitions
            const workoutDefinitions = await this.getWorkoutDefinitions();
            // Ensure all days have workout definitions in current week
            const week = routine.weeks.find((w)=>w.weekNumber === currentWeek);
            if (week) {
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
                    if (!week.days[day]) {
                        week.days[day] = {};
                    }
                    // Add workout definition if it exists and not already set
                    if (workoutDefinitions[day] && !week.days[day]?.workout) {
                    // Workout will be loaded from definitions when needed
                    }
                });
                await this.updateRoutine(routine);
            }
            return routine;
        } catch (error) {
            return null;
        }
    }
    /**
   * Get workout for a specific day
   */ async getWorkoutForDay(day, weekNumber) {
        const workoutDefinitions = await this.getWorkoutDefinitions();
        return workoutDefinitions[day] || null;
    }
    /**
   * Update weekly routine
   */ async updateRoutine(routine) {
        await this.ensureDataDir();
        routine.updatedAt = new Date().toISOString();
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(ROUTINE_FILE, JSON.stringify(routine, null, 2), 'utf-8');
        return routine;
    }
    /**
   * Collect all exercise IDs from a workout (warmup, main, finisher, metabolic, mobility).
   */ getAllExerciseIdsFromWorkout(workout) {
        const ids = [];
        if (workout.warmup?.exercises?.length) {
            ids.push(...workout.warmup.exercises.map((e)=>e.id));
        }
        if (workout.exercises?.length) {
            ids.push(...workout.exercises.map((e)=>e.id));
        }
        if (workout.finisher?.length) {
            ids.push(...workout.finisher.map((e)=>e.id));
        }
        if (workout.metabolicFlush?.exercises?.length) {
            ids.push(...workout.metabolicFlush.exercises.map((e)=>e.id));
        }
        if (workout.mobility?.exercises?.length) {
            ids.push(...workout.mobility.exercises.map((e)=>e.id));
        }
        return ids;
    }
    /**
   * Mark workout as complete. If exercisesCompleted is missing or empty, all exercises
   * in the workout are auto-completed.
   */ async markWorkoutComplete(day, weekNumber, exercisesCompleted) {
        const routine = await this.getRoutine();
        if (!routine) {
            throw new Error('No routine found');
        }
        const week = await this.getOrCreateWeek(routine, weekNumber);
        if (!week.days[day]) {
            week.days[day] = {};
        }
        const workoutDef = await this.getWorkoutForDay(day, weekNumber);
        if (!workoutDef) {
            throw new Error(`No workout definition found for ${day}`);
        }
        const allIds = this.getAllExerciseIdsFromWorkout(workoutDef);
        const resolved = Array.from(new Set([
            ...allIds,
            ...exercisesCompleted ?? []
        ]));
        week.days[day].workout = {
            workoutId: workoutDef.id,
            completed: true,
            completedAt: new Date().toISOString(),
            exercisesCompleted: resolved
        };
        await this.updateRoutine(routine);
    }
    /**
   * Mark daily routine as complete
   */ async markRoutineComplete(routineType, day, weekNumber) {
        const routine = await this.getRoutine();
        if (!routine) {
            throw new Error('No routine found');
        }
        const week = await this.getOrCreateWeek(routine, weekNumber);
        if (!week.days[day]) {
            week.days[day] = {};
        }
        const routineId = routine.dailyRoutines[routineType].id;
        week.days[day][`${routineType}Routine`] = {
            routineId,
            completed: true,
            completedAt: new Date().toISOString()
        };
        await this.updateRoutine(routine);
    }
    /**
   * Mark daily routine as incomplete (undo completion)
   */ async markRoutineIncomplete(routineType, day, weekNumber) {
        const routine = await this.getRoutine();
        if (!routine) {
            throw new Error('No routine found');
        }
        const week = await this.getOrCreateWeek(routine, weekNumber);
        if (!week.days[day]) {
            week.days[day] = {};
        }
        const routineId = routine.dailyRoutines[routineType].id;
        week.days[day][`${routineType}Routine`] = {
            routineId,
            completed: false,
            completedAt: undefined
        };
        await this.updateRoutine(routine);
    }
    /**
   * Get weekly progress
   */ async getWeeklyProgress(weekNumber) {
        const targetWeek = weekNumber || this.getCurrentWeekNumber();
        const routine = await this.getRoutine();
        if (!routine) {
            throw new Error('No routine found');
        }
        const week = await this.getOrCreateWeek(routine, targetWeek);
        const workoutsByDay = {};
        let completedWorkouts = 0;
        let totalWorkouts = 0;
        let completedMorningRoutines = 0;
        let totalMorningRoutines = 0;
        let completedNightRoutines = 0;
        let totalNightRoutines = 0;
        const days = [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
        ];
        const workoutDefinitions = await this.getWorkoutDefinitions();
        days.forEach((day)=>{
            const dayData = week.days[day];
            const hasWorkout = !!workoutDefinitions[day];
            if (hasWorkout) {
                totalWorkouts++;
                if (dayData?.workout?.completed) {
                    completedWorkouts++;
                }
            }
            // Morning routine exists every day
            totalMorningRoutines++;
            if (dayData?.morningRoutine?.completed) {
                completedMorningRoutines++;
            }
            // Night routine exists every day
            totalNightRoutines++;
            if (dayData?.nightRoutine?.completed) {
                completedNightRoutines++;
            }
            workoutsByDay[day] = {
                workout: dayData?.workout ? {
                    completed: dayData.workout.completed || false,
                    completedAt: dayData.workout.completedAt
                } : undefined,
                morningRoutine: dayData?.morningRoutine ? {
                    completed: dayData.morningRoutine.completed || false,
                    completedAt: dayData.morningRoutine.completedAt
                } : undefined,
                nightRoutine: dayData?.nightRoutine ? {
                    completed: dayData.nightRoutine.completed || false,
                    completedAt: dayData.nightRoutine.completedAt
                } : undefined
            };
        });
        const now = new Date();
        return {
            week: targetWeek,
            year: now.getFullYear(),
            completedWorkouts,
            totalWorkouts,
            completedMorningRoutines,
            totalMorningRoutines,
            completedNightRoutines,
            totalNightRoutines,
            workoutsByDay
        };
    }
    /**
   * Get consistency stats for a given routine (and optional workout definitions).
   * Used by the adapter when routine/defs come from Supabase.
   */ async getConsistencyStatsForRoutine(routine, workoutDefinitions) {
        const defs = workoutDefinitions ?? await this.getWorkoutDefinitions();
        const now = new Date();
        let totalWorkoutDays = 0;
        let completedWorkoutDays = 0;
        let totalMorningDays = 0;
        let completedMorningDays = 0;
        let totalNightDays = 0;
        let completedNightDays = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let lastActiveDate;
        // Check last 30 days
        for(let i = 0; i < 30; i++){
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() - i);
            const dayOfWeek = checkDate.toLocaleDateString('en-US', {
                weekday: 'long'
            }).toLowerCase();
            const weekNum = this.getCurrentWeekNumber() - Math.floor(i / 7);
            const week = routine.weeks.find((w)=>w.weekNumber === weekNum);
            const dayData = week?.days[dayOfWeek];
            // Check if any activity happened
            const hasActivity = dayData?.workout?.completed || dayData?.morningRoutine?.completed || dayData?.nightRoutine?.completed;
            if (hasActivity) {
                if (i === 0 || tempStreak > 0) {
                    tempStreak++;
                    currentStreak = i === 0 ? tempStreak : currentStreak;
                }
                longestStreak = Math.max(longestStreak, tempStreak);
                if (!lastActiveDate) {
                    lastActiveDate = checkDate;
                }
            } else {
                tempStreak = 0;
            }
            totalMorningDays++;
            if (dayData?.morningRoutine?.completed) completedMorningDays++;
            totalNightDays++;
            if (dayData?.nightRoutine?.completed) completedNightDays++;
            if (defs[dayOfWeek]) {
                totalWorkoutDays++;
                if (dayData?.workout?.completed) completedWorkoutDays++;
            }
        }
        const weeklyCompletion = totalWorkoutDays > 0 ? completedWorkoutDays / totalWorkoutDays * 100 : 0;
        const monthlyCompletion = totalWorkoutDays > 0 ? completedWorkoutDays / totalWorkoutDays * 100 : 0;
        return {
            currentStreak,
            longestStreak,
            weeklyCompletion: Math.round(weeklyCompletion),
            monthlyCompletion: Math.round(monthlyCompletion),
            totalDaysActive: completedWorkoutDays + completedMorningDays + completedNightDays,
            lastActiveDate: lastActiveDate?.toISOString(),
            streaks: {
                workouts: currentStreak,
                morningRoutines: completedMorningDays,
                nightRoutines: completedNightDays
            }
        };
    }
    /**
   * Get consistency stats (uses local JSON routine only).
   * Prefer using the adapter in production so routine/defs come from Supabase.
   */ async getConsistencyStats() {
        const routine = await this.getRoutine();
        if (!routine) {
            throw new Error('No routine found');
        }
        return this.getConsistencyStatsForRoutine(routine);
    }
}
}),
"[project]/lib/adapters/fitness.adapter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FitnessAdapter",
    ()=>FitnessAdapter,
    "getFitnessAdapter",
    ()=>getFitnessAdapter
]);
/**
 * Fitness Adapter
 * Replaces JSON file storage with Supabase for fitness routines and progress
 * 
 * Fitness data is primarily stored in Supabase. The local JSON file
 * serves as a fallback/seed when Supabase has no data or is unavailable.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$fitness$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/fitness.service.ts [app-route] (ecmascript)");
;
;
class FitnessAdapter extends __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAdapter"] {
    fitnessService;
    currentRoutineId = 'climber-physique';
    constructor(debug = false){
        super({
            serviceName: 'fitness',
            debug
        });
        this.fitnessService = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$fitness$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FitnessService"]();
    }
    /**
   * Check if fitness service is available
   * Fitness uses Supabase as primary storage, but local JSON as fallback.
   * Always returns true since JSON fallback is always available.
   */ async checkServiceAvailability() {
        // Fitness service is always "available" - we either use Supabase
        // or fall back to local JSON files
        return true;
    }
    /**
   * Fetch from service (JSON file) - used as fallback/seed
   */ async fetchFromService() {
        const routine = await this.fitnessService.getRoutine();
        if (!routine) {
            throw new Error('No fitness routine found');
        }
        return routine;
    }
    /**
   * Fetch from Supabase cache
   */ async fetchFromCache() {
        return this.getRoutineFromSupabase();
    }
    /**
   * Write routine to Supabase
   */ async writeToCache(data) {
        return this.saveRoutineToSupabase(data);
    }
    // ==========================================
    // Supabase Operations
    // ==========================================
    /**
   * Get routine from Supabase
   */ async getRoutineFromSupabase() {
        if (!this.isSupabaseAvailable()) return null;
        const client = this.getReadClient();
        if (!client) return null // Supabase not configured
        ;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            // Get the routine
            const { data: routineData, error: routineError } = await clientAny.from('fitness_routines').select('*').eq('id', this.currentRoutineId).single();
            if (routineError || !routineData) {
                this.log('No routine found in Supabase');
                return null;
            }
            // Get weeks for this routine
            const { data: weeksData, error: weeksError } = await clientAny.from('fitness_weeks').select('*').eq('routine_id', this.currentRoutineId).order('year', {
                ascending: false
            }).order('week_number', {
                ascending: false
            });
            if (weeksError) throw weeksError;
            const row = routineData;
            const weeks = weeksData ?? [];
            // Reconstruct the WeeklyRoutine object
            const routine = {
                id: row.id,
                name: row.name,
                userProfile: row.user_profile,
                injuryProtocol: row.injury_protocol ?? {
                    status: 'inactive',
                    name: '',
                    description: '',
                    dailyRehab: [],
                    rules: []
                },
                schedule: row.schedule,
                dailyRoutines: row.daily_routines,
                weeks: weeks.map((w)=>({
                        weekNumber: w.week_number,
                        startDate: w.start_date,
                        days: w.days
                    })),
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            return routine;
        } catch (error) {
            this.logError('Error fetching routine from Supabase', error);
            return null;
        }
    }
    /**
   * Save routine to Supabase
   */ async saveRoutineToSupabase(routine) {
        if (!this.isSupabaseAvailable()) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        const client = this.getWriteClient();
        if (!client) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        let recordsWritten = 0;
        try {
            // Upsert the main routine
            const routineInsert = {
                id: routine.id,
                name: routine.name,
                user_profile: routine.userProfile,
                injury_protocol: routine.injuryProtocol,
                schedule: routine.schedule,
                daily_routines: routine.dailyRoutines,
                updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])()
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            const { error: routineError } = await clientAny.from('fitness_routines').upsert(routineInsert, {
                onConflict: 'id'
            });
            if (routineError) throw routineError;
            recordsWritten++;
            // Upsert weeks
            for (const week of routine.weeks){
                const weekInsert = {
                    routine_id: routine.id,
                    week_number: week.weekNumber,
                    year: new Date(week.startDate).getFullYear(),
                    start_date: week.startDate.split('T')[0] ?? week.startDate,
                    days: week.days,
                    updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])()
                };
                const { error: weekError } = await clientAny.from('fitness_weeks').upsert(weekInsert, {
                    onConflict: 'routine_id,week_number,year'
                });
                if (weekError) throw weekError;
                recordsWritten++;
            }
            return {
                success: true,
                recordsWritten
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logError('Error saving routine to Supabase', error);
            return {
                success: false,
                recordsWritten,
                error: errorMessage
            };
        }
    }
    // ==========================================
    // High-level API methods
    // ==========================================
    /**
   * Get the current weekly routine
   * Tries Supabase first, falls back to JSON file, then seeds Supabase
   */ async getRoutine() {
        // Try Supabase first
        if (this.isSupabaseAvailable()) {
            const supabaseRoutine = await this.getRoutineFromSupabase();
            if (supabaseRoutine) {
                return supabaseRoutine;
            }
            // No data in Supabase - try to seed from JSON file
            this.log('No routine in Supabase, attempting to seed from JSON file');
            try {
                const fileRoutine = await this.fetchFromService();
                await this.saveRoutineToSupabase(fileRoutine);
                this.log('Seeded Supabase from JSON file');
                return fileRoutine;
            } catch (error) {
                this.logError('Failed to seed from JSON file', error);
            }
        }
        // Fallback to JSON file
        return this.fitnessService.getRoutine();
    }
    /**
   * Get workout definition for a specific day
   * Checks active version in Supabase first, falls back to JSON file
   */ async getWorkoutForDay(day, weekNumber) {
        // Try to get from active version in Supabase first
        if (this.isSupabaseAvailable()) {
            const client = this.getReadClient();
            if (client) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const clientAny = client;
                    const { data, error } = await clientAny.from('fitness_routine_versions').select('workout_definitions').eq('routine_id', this.currentRoutineId).eq('is_active', true).single();
                    if (!error && data?.workout_definitions?.[day]) {
                        return data.workout_definitions[day];
                    }
                } catch  {
                // Fall back to JSON file
                }
            }
        }
        // Fall back to JSON file
        return this.fitnessService.getWorkoutForDay(day, weekNumber);
    }
    /**
   * Get weekly progress
   */ async getWeeklyProgress(weekNumber) {
        // For now, delegate to the service which handles the logic
        // In the future, we could read directly from fitness_progress table
        return this.fitnessService.getWeeklyProgress(weekNumber);
    }
    /**
   * Get consistency stats
   * Uses routine and workout definitions from Supabase (or JSON fallback) so it works in production.
   */ async getConsistencyStats() {
        const routine = await this.getRoutine();
        if (!routine) {
            throw new Error('No routine found');
        }
        const workoutDefinitions = await this.getWorkoutDefinitions(this.currentRoutineId);
        return this.fitnessService.getConsistencyStatsForRoutine(routine, workoutDefinitions);
    }
    /**
   * Mark a workout as complete
   */ async markWorkoutComplete(day, weekNumber, exercisesCompleted) {
        // Update via the service (which updates JSON)
        await this.fitnessService.markWorkoutComplete(day, weekNumber, exercisesCompleted);
        // Also update Supabase if available
        if (this.isSupabaseAvailable()) {
            const routine = await this.fitnessService.getRoutine();
            if (routine) {
                await this.saveRoutineToSupabase(routine);
            }
        }
    }
    /**
   * Mark a daily routine (morning/night) as complete
   */ async markRoutineComplete(routineType, day, weekNumber) {
        // Update via the service (which updates JSON)
        await this.fitnessService.markRoutineComplete(routineType, day, weekNumber);
        // Also update Supabase if available
        if (this.isSupabaseAvailable()) {
            const routine = await this.fitnessService.getRoutine();
            if (routine) {
                await this.saveRoutineToSupabase(routine);
            }
        }
    }
    /**
   * Mark a daily routine as incomplete (undo)
   */ async markRoutineIncomplete(routineType, day, weekNumber) {
        // Update via the service (which updates JSON)
        await this.fitnessService.markRoutineIncomplete(routineType, day, weekNumber);
        // Also update Supabase if available
        if (this.isSupabaseAvailable()) {
            const routine = await this.fitnessService.getRoutine();
            if (routine) {
                await this.saveRoutineToSupabase(routine);
            }
        }
    }
    /**
   * Update the routine
   */ async updateRoutine(routine) {
        // Update JSON file
        const updated = await this.fitnessService.updateRoutine(routine);
        // Also update Supabase if available
        if (this.isSupabaseAvailable()) {
            await this.saveRoutineToSupabase(updated);
        }
        return updated;
    }
    /**
   * Sync routine from JSON file to Supabase
   * Useful for initial data migration
   */ async syncFromJsonToSupabase() {
        if (!this.isSupabaseAvailable()) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        try {
            const routine = await this.fetchFromService();
            return this.saveRoutineToSupabase(routine);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                recordsWritten: 0,
                error: errorMessage
            };
        }
    }
    /**
   * Get current week number
   */ getCurrentWeekNumber() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    }
    /**
   * Get current day of week
   */ getCurrentDayOfWeek() {
        const days = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday'
        ];
        return days[new Date().getDay()] ?? 'monday';
    }
    // ==========================================
    // Version Management Methods
    // ==========================================
    /**
   * Get all versions for a routine
   * Falls back to creating a virtual version from JSON files if Supabase is unavailable
   */ async getVersions(routineId) {
        // Try Supabase first
        if (this.isSupabaseAvailable()) {
            const client = this.getReadClient();
            if (client) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const clientAny = client;
                    const { data, error } = await clientAny.from('fitness_routine_versions').select('id, version_number, name, change_summary, is_active, is_draft, created_at, activated_at').eq('routine_id', routineId).order('version_number', {
                        ascending: false
                    });
                    if (!error && data && data.length > 0) {
                        const versions = data.map((row)=>({
                                id: row.id,
                                versionNumber: row.version_number,
                                name: row.name,
                                changeSummary: row.change_summary ?? undefined,
                                isActive: row.is_active,
                                isDraft: row.is_draft,
                                createdAt: row.created_at,
                                activatedAt: row.activated_at ?? undefined
                            }));
                        const activeVersion = versions.find((v)=>v.isActive);
                        // Only consider drafts newer than active version as "the draft"
                        // (older drafts are orphaned and should be cleaned up)
                        const activeVersionNum = activeVersion?.versionNumber ?? 0;
                        const validDrafts = versions.filter((v)=>v.isDraft && v.versionNumber > activeVersionNum);
                        const draftVersion = validDrafts[0] // Newest draft (already sorted desc)
                        ;
                        return {
                            versions,
                            activeVersion,
                            draftVersion
                        };
                    }
                } catch (error) {
                    this.logError('Error fetching versions from Supabase', error);
                }
            }
        }
        // Fall back to JSON files - create a virtual "active" version
        try {
            const routine = await this.fitnessService.getRoutine();
            if (routine) {
                const virtualVersion = {
                    id: 'json-fallback',
                    versionNumber: 1,
                    name: routine.name,
                    changeSummary: 'Loaded from local files',
                    isActive: true,
                    isDraft: false,
                    createdAt: routine.updatedAt ?? new Date().toISOString()
                };
                return {
                    versions: [
                        virtualVersion
                    ],
                    activeVersion: virtualVersion,
                    draftVersion: undefined
                };
            }
        } catch (error) {
            this.logError('Error creating virtual version from JSON', error);
        }
        return {
            versions: []
        };
    }
    /**
   * Get a specific version by ID
   * Handles the special 'json-fallback' ID for local file data
   */ async getVersion(versionId) {
        // Handle JSON fallback version
        if (versionId === 'json-fallback') {
            try {
                const routine = await this.fitnessService.getRoutine();
                const workoutDefinitions = await this.fitnessService.getWorkoutDefinitions();
                if (!routine) return null;
                return {
                    id: 'json-fallback',
                    routineId: this.currentRoutineId,
                    versionNumber: 1,
                    name: routine.name,
                    changeSummary: 'Loaded from local files',
                    userProfile: routine.userProfile,
                    injuryProtocol: routine.injuryProtocol,
                    schedule: routine.schedule,
                    dailyRoutines: routine.dailyRoutines,
                    workoutDefinitions,
                    isActive: true,
                    isDraft: false,
                    createdAt: routine.updatedAt ?? new Date().toISOString(),
                    updatedAt: routine.updatedAt ?? new Date().toISOString()
                };
            } catch (error) {
                this.logError('Error loading version from JSON files', error);
                return null;
            }
        }
        // Try Supabase
        if (!this.isSupabaseAvailable()) {
            return null;
        }
        const client = this.getReadClient();
        if (!client) return null;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            const { data, error } = await clientAny.from('fitness_routine_versions').select('*').eq('id', versionId).single();
            if (error || !data) return null;
            const row = data;
            return this.rowToVersion(row);
        } catch (error) {
            this.logError('Error fetching version', error);
            return null;
        }
    }
    /**
   * Create a new version (draft by default)
   * Uses retry logic to handle race conditions with version numbers
   */ async createVersion(request, retryCount = 0) {
        const MAX_RETRIES = 3;
        if (!this.isSupabaseAvailable()) {
            // Create version from current JSON files if Supabase not available
            const routine = await this.fitnessService.getRoutine();
            const workoutDefinitions = await this.fitnessService.getWorkoutDefinitions();
            if (!routine) return null;
            // Return a mock version object
            return {
                id: crypto.randomUUID(),
                routineId: request.routineId,
                versionNumber: 1,
                name: request.name ?? routine.name,
                changeSummary: request.changeSummary,
                userProfile: routine.userProfile,
                injuryProtocol: routine.injuryProtocol,
                schedule: routine.schedule,
                dailyRoutines: routine.dailyRoutines,
                workoutDefinitions,
                isActive: false,
                isDraft: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
        const client = this.getWriteClient();
        if (!client) return null;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            // Get the latest version number using MAX aggregate for accuracy
            const { data: versionData } = await clientAny.from('fitness_routine_versions').select('version_number').eq('routine_id', request.routineId).order('version_number', {
                ascending: false
            }).limit(1);
            const maxVersion = versionData?.[0]?.version_number ?? 0;
            const nextVersionNumber = maxVersion + 1;
            // Get base data - either from specified version or current active
            let baseData = null;
            if (request.basedOnVersionId) {
                baseData = await this.getVersion(request.basedOnVersionId);
            }
            if (!baseData) {
                // Get current active version or fall back to JSON files
                const { data: activeData } = await clientAny.from('fitness_routine_versions').select('*').eq('routine_id', request.routineId).eq('is_active', true).single();
                if (activeData) {
                    baseData = this.rowToVersion(activeData);
                } else {
                    // Fall back to JSON files
                    const routine = await this.fitnessService.getRoutine();
                    const workoutDefinitions = await this.fitnessService.getWorkoutDefinitions();
                    if (!routine) return null;
                    baseData = {
                        id: '',
                        routineId: request.routineId,
                        versionNumber: 0,
                        name: routine.name,
                        userProfile: routine.userProfile,
                        injuryProtocol: routine.injuryProtocol,
                        schedule: routine.schedule,
                        dailyRoutines: routine.dailyRoutines,
                        workoutDefinitions,
                        isActive: false,
                        isDraft: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                }
            }
            // Create new version
            const insert = {
                routine_id: request.routineId,
                version_number: nextVersionNumber,
                name: request.name ?? `Version ${nextVersionNumber}`,
                change_summary: request.changeSummary ?? undefined,
                user_profile: baseData.userProfile,
                injury_protocol: baseData.injuryProtocol ?? undefined,
                schedule: baseData.schedule,
                daily_routines: baseData.dailyRoutines,
                workout_definitions: baseData.workoutDefinitions,
                is_active: false,
                is_draft: true,
                updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])()
            };
            const { data, error } = await clientAny.from('fitness_routine_versions').insert(insert).select().single();
            if (error) throw error;
            return this.rowToVersion(data);
        } catch (error) {
            // Check if it's a duplicate key error (code 23505)
            const pgError = error;
            if (pgError.code === '23505' && retryCount < MAX_RETRIES) {
                this.log(`Duplicate version number, retrying (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                // Small delay before retry to reduce collision chance
                await new Promise((resolve)=>setTimeout(resolve, 100 * (retryCount + 1)));
                return this.createVersion(request, retryCount + 1);
            }
            this.logError('Error creating version', error);
            return null;
        }
    }
    /**
   * Update a draft version
   * Handles json-fallback by saving directly to JSON files
   */ async updateVersion(versionId, updates) {
        // Handle JSON fallback version - save directly to files
        if (versionId === 'json-fallback') {
            try {
                const routine = await this.fitnessService.getRoutine();
                if (!routine) return null;
                // Update routine
                if (updates.name !== undefined) routine.name = updates.name;
                if (updates.userProfile !== undefined) routine.userProfile = updates.userProfile;
                if (updates.injuryProtocol !== undefined) routine.injuryProtocol = updates.injuryProtocol;
                if (updates.schedule !== undefined) routine.schedule = updates.schedule;
                if (updates.dailyRoutines !== undefined) {
                    routine.dailyRoutines = {
                        morning: updates.dailyRoutines.morning ?? routine.dailyRoutines.morning,
                        night: updates.dailyRoutines.night ?? routine.dailyRoutines.night
                    };
                }
                await this.fitnessService.updateRoutine(routine);
                // Update workout definitions if provided
                if (updates.workoutDefinitions !== undefined) {
                    const currentDefs = await this.fitnessService.getWorkoutDefinitions();
                    const updatedDefs = {
                        ...currentDefs,
                        ...updates.workoutDefinitions
                    };
                    await this.fitnessService.updateWorkoutDefinitions(updatedDefs);
                }
                // Return updated version
                return this.getVersion('json-fallback');
            } catch (error) {
                this.logError('Error updating JSON fallback version', error);
                return null;
            }
        }
        // Supabase path
        if (!this.isSupabaseAvailable()) {
            return null;
        }
        const client = this.getWriteClient();
        if (!client) return null;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            // First get the existing version to check if it's a draft
            const existing = await this.getVersion(versionId);
            if (!existing || !existing.isDraft) {
                return null // Can only update drafts
                ;
            }
            // Build update object
            const updateData = {
                updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])()
            };
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.changeSummary !== undefined) updateData.change_summary = updates.changeSummary;
            if (updates.userProfile !== undefined) updateData.user_profile = updates.userProfile;
            if (updates.injuryProtocol !== undefined) updateData.injury_protocol = updates.injuryProtocol;
            if (updates.schedule !== undefined) updateData.schedule = updates.schedule;
            if (updates.dailyRoutines !== undefined) {
                updateData.daily_routines = {
                    morning: updates.dailyRoutines.morning ?? existing.dailyRoutines.morning,
                    night: updates.dailyRoutines.night ?? existing.dailyRoutines.night
                };
            }
            if (updates.workoutDefinitions !== undefined) {
                updateData.workout_definitions = {
                    ...existing.workoutDefinitions,
                    ...updates.workoutDefinitions
                };
            }
            const { data, error } = await clientAny.from('fitness_routine_versions').update(updateData).eq('id', versionId).select().single();
            if (error) throw error;
            return this.rowToVersion(data);
        } catch (error) {
            this.logError('Error updating version', error);
            return null;
        }
    }
    /**
   * Activate a version
   */ async activateVersion(versionId) {
        if (!this.isSupabaseAvailable()) {
            return null;
        }
        const client = this.getWriteClient();
        if (!client) return null;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            // Get the version to activate
            const version = await this.getVersion(versionId);
            if (!version) return null;
            // Update to active (trigger will deactivate others)
            const { data, error } = await clientAny.from('fitness_routine_versions').update({
                is_active: true,
                is_draft: false,
                activated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])(),
                updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])()
            }).eq('id', versionId).select().single();
            if (error) throw error;
            // Sync to JSON files and main routine table
            const activatedVersion = this.rowToVersion(data);
            await this.syncVersionToFiles(activatedVersion);
            await this.syncVersionToRoutineTable(activatedVersion);
            return activatedVersion;
        } catch (error) {
            this.logError('Error activating version', error);
            return null;
        }
    }
    /**
   * Delete a draft version
   */ async deleteVersion(versionId) {
        if (!this.isSupabaseAvailable()) {
            return false;
        }
        const client = this.getWriteClient();
        if (!client) return false;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            // First check if it's a draft (only drafts can be deleted)
            const version = await this.getVersion(versionId);
            if (!version || !version.isDraft) {
                return false;
            }
            const { error } = await clientAny.from('fitness_routine_versions').delete().eq('id', versionId);
            return !error;
        } catch (error) {
            this.logError('Error deleting version', error);
            return false;
        }
    }
    /**
   * Clean up duplicate/orphaned versions
   * Keeps the active version and optionally the newest draft if it's newer
   * Returns summary of what was cleaned up
   */ async cleanupVersions(routineId) {
        if (!this.isSupabaseAvailable()) {
            return {
                kept: {},
                deleted: 0,
                versions: []
            };
        }
        const client = this.getWriteClient();
        if (!client) {
            return {
                kept: {},
                deleted: 0,
                versions: []
            };
        }
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            // Get all versions sorted by version_number descending
            const { data: allVersions, error: fetchError } = await clientAny.from('fitness_routine_versions').select('id, version_number, is_active, is_draft, name').eq('routine_id', routineId).order('version_number', {
                ascending: false
            });
            if (fetchError || !allVersions) {
                throw fetchError || new Error('Failed to fetch versions');
            }
            // Find active version
            const activeVersion = allVersions.find((v)=>v.is_active);
            // Find newest draft that's newer than active (or any draft if no active)
            const activeVersionNum = activeVersion?.version_number ?? 0;
            const newerDrafts = allVersions.filter((v)=>v.is_draft && v.version_number > activeVersionNum);
            const newestDraft = newerDrafts[0] // Already sorted desc
            ;
            // Determine what to keep
            const keepIds = new Set();
            if (activeVersion) keepIds.add(activeVersion.id);
            if (newestDraft) keepIds.add(newestDraft.id);
            // If nothing to keep, keep the newest version
            if (keepIds.size === 0 && allVersions.length > 0) {
                keepIds.add(allVersions[0].id);
            }
            // Delete everything else
            const toDelete = allVersions.filter((v)=>!keepIds.has(v.id));
            if (toDelete.length > 0) {
                const deleteIds = toDelete.map((v)=>v.id);
                const { error: deleteError } = await clientAny.from('fitness_routine_versions').delete().in('id', deleteIds);
                if (deleteError) {
                    this.logError('Error deleting versions during cleanup', deleteError);
                }
            }
            // Return summary
            const keptVersions = allVersions.filter((v)=>keepIds.has(v.id));
            return {
                kept: {
                    active: activeVersion?.id,
                    draft: newestDraft?.id
                },
                deleted: toDelete.length,
                versions: keptVersions.map((v)=>({
                        id: v.id,
                        versionNumber: v.version_number,
                        status: v.is_active ? 'active' : v.is_draft ? 'draft' : 'inactive'
                    }))
            };
        } catch (error) {
            this.logError('Error cleaning up versions', error);
            return {
                kept: {},
                deleted: 0,
                versions: []
            };
        }
    }
    // ==========================================
    // Workout Definitions Methods
    // ==========================================
    /**
   * Get workout definitions for a routine
   */ async getWorkoutDefinitions(routineId) {
        // First try to get from active version in Supabase
        if (this.isSupabaseAvailable()) {
            const client = this.getReadClient();
            if (client) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const clientAny = client;
                    const { data, error } = await clientAny.from('fitness_routine_versions').select('workout_definitions').eq('routine_id', routineId).eq('is_active', true).single();
                    if (!error && data?.workout_definitions) {
                        return data.workout_definitions;
                    }
                } catch  {
                // Fall back to JSON files
                }
            }
        }
        // Fall back to JSON files
        return this.fitnessService.getWorkoutDefinitions();
    }
    /**
   * Update all workout definitions for a routine
   */ async updateWorkoutDefinitions(routineId, definitions) {
        // Update JSON file
        await this.fitnessService.updateWorkoutDefinitions(definitions);
        // Update active version if Supabase is available
        if (this.isSupabaseAvailable()) {
            const client = this.getWriteClient();
            if (client) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const clientAny = client;
                    await clientAny.from('fitness_routine_versions').update({
                        workout_definitions: definitions,
                        updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])()
                    }).eq('routine_id', routineId).eq('is_active', true);
                } catch (error) {
                    this.logError('Error updating workout definitions in Supabase', error);
                }
            }
        }
        return definitions;
    }
    /**
   * Update workout definition for a specific day
   */ async updateWorkoutDefinition(routineId, day, workout) {
        const definitions = await this.getWorkoutDefinitions(routineId);
        definitions[day] = workout;
        await this.updateWorkoutDefinitions(routineId, definitions);
        return workout;
    }
    // ==========================================
    // Helper Methods
    // ==========================================
    /**
   * Convert database row to RoutineVersion
   */ rowToVersion(row) {
        return {
            id: row.id,
            routineId: row.routine_id,
            versionNumber: row.version_number,
            name: row.name,
            changeSummary: row.change_summary ?? undefined,
            userProfile: row.user_profile,
            injuryProtocol: row.injury_protocol ?? undefined,
            schedule: row.schedule,
            dailyRoutines: row.daily_routines,
            workoutDefinitions: row.workout_definitions,
            isActive: row.is_active,
            isDraft: row.is_draft,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            activatedAt: row.activated_at ?? undefined
        };
    }
    /**
   * Sync activated version to JSON files
   */ async syncVersionToFiles(version) {
        try {
            // Update routine file
            const routine = await this.fitnessService.getRoutine();
            if (routine) {
                routine.name = version.name;
                routine.userProfile = version.userProfile;
                routine.injuryProtocol = version.injuryProtocol ?? routine.injuryProtocol;
                routine.schedule = version.schedule;
                routine.dailyRoutines = version.dailyRoutines;
                await this.fitnessService.updateRoutine(routine);
            }
            // Update workout definitions file
            await this.fitnessService.updateWorkoutDefinitions(version.workoutDefinitions);
        } catch (error) {
            this.logError('Error syncing version to files', error);
        }
    }
    /**
   * Sync activated version to fitness_routines table
   */ async syncVersionToRoutineTable(version) {
        if (!this.isSupabaseAvailable()) return;
        const client = this.getWriteClient();
        if (!client) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            await clientAny.from('fitness_routines').upsert({
                id: version.routineId,
                name: version.name,
                user_profile: version.userProfile,
                injury_protocol: version.injuryProtocol,
                schedule: version.schedule,
                daily_routines: version.dailyRoutines,
                updated_at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])()
            }, {
                onConflict: 'id'
            });
        } catch (error) {
            this.logError('Error syncing version to routine table', error);
        }
    }
}
// Export singleton instance
let fitnessAdapterInstance = null;
function getFitnessAdapter() {
    if (!fitnessAdapterInstance) {
        fitnessAdapterInstance = new FitnessAdapter();
    }
    return fitnessAdapterInstance;
}
}),
"[project]/app/api/fitness/consistency/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/utils.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$fitness$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/fitness.adapter.ts [app-route] (ecmascript)");
;
;
async function GET(_request) {
    try {
        const adapter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$fitness$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getFitnessAdapter"])();
        const stats = await adapter.getConsistencyStats();
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["successResponse"])(stats);
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleApiError"])(error);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__fbed1f01._.js.map
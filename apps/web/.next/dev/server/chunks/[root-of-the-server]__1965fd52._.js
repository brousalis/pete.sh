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
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/tty [external] (tty, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tty", () => require("tty"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[project]/lib/config.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "isDev",
    ()=>isDev,
    "isLocalhost",
    ()=>isLocalhost
]);
/**
 * Configuration utility for environment variables
 * Validates and provides typed access to environment variables
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
;
// Schema for environment variables
const envSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    // HUE Bridge
    HUE_BRIDGE_IP: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().ip().optional(),
    HUE_BRIDGE_USERNAME: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    HUE_CLIENT_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    // Google
    GOOGLE_CLIENT_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    GOOGLE_CLIENT_SECRET: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    GOOGLE_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    GOOGLE_CALENDAR_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    // Weather
    WEATHER_LATITUDE: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^-?\d+\.?\d*$/).optional(),
    WEATHER_LONGITUDE: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^-?\d+\.?\d*$/).optional(),
    // CTA
    CTA_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    CTA_TRAIN_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    // Spotify
    NEXT_SPOTIFY_CLIENT_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    NEXT_SPOTIFY_CLIENT_SECRET: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    // Desktop (local Windows features)
    DESKTOP_ENABLED: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
// Parse and validate environment variables
const parseEnv = ()=>{
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        console.warn('Environment variable validation warnings:', parsed.error.format());
    }
    return parsed.success ? parsed.data : {};
};
const env = parseEnv();
const config = {
    hue: {
        bridgeIp: env.HUE_BRIDGE_IP,
        username: env.HUE_BRIDGE_USERNAME,
        clientKey: env.HUE_CLIENT_KEY,
        isConfigured: Boolean(env.HUE_BRIDGE_IP && env.HUE_BRIDGE_USERNAME),
        isEntertainmentConfigured: Boolean(env.HUE_BRIDGE_IP && env.HUE_BRIDGE_USERNAME && env.HUE_CLIENT_KEY)
    },
    google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        apiKey: env.GOOGLE_API_KEY,
        calendarId: env.GOOGLE_CALENDAR_ID || 'primary',
        isConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_API_KEY)
    },
    weather: {
        latitude: env.WEATHER_LATITUDE ? parseFloat(env.WEATHER_LATITUDE) : 41.8781,
        longitude: env.WEATHER_LONGITUDE ? parseFloat(env.WEATHER_LONGITUDE) : -87.6298
    },
    cta: {
        apiKey: env.CTA_API_KEY,
        trainApiKey: env.CTA_TRAIN_API_KEY,
        isConfigured: Boolean(env.CTA_API_KEY),
        isTrainConfigured: Boolean(env.CTA_TRAIN_API_KEY)
    },
    spotify: {
        clientId: env.NEXT_SPOTIFY_CLIENT_ID,
        clientSecret: env.NEXT_SPOTIFY_CLIENT_SECRET,
        redirectUri: 'http://127.0.0.1:3000/spotify/callback',
        isConfigured: Boolean(env.NEXT_SPOTIFY_CLIENT_ID && env.NEXT_SPOTIFY_CLIENT_SECRET),
        scopes: [
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'user-read-recently-played',
            'user-library-read',
            'playlist-read-private',
            'playlist-read-collaborative',
            'streaming',
            'user-read-email',
            'user-read-private'
        ]
    },
    desktop: {
        enabled: env.DESKTOP_ENABLED === 'true'
    }
};
const isDev = ("TURBOPACK compile-time value", "development") === 'development';
const isLocalhost = ("TURBOPACK compile-time value", "undefined") !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.'));
}),
"[project]/lib/services/hue.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HueService",
    ()=>HueService
]);
/**
 * HUE Bridge Service
 * Handles communication with Philips HUE bridge
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-route] (ecmascript)");
;
;
class HueService {
    baseUrl;
    constructor(){
        const bridgeIp = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].hue.bridgeIp;
        const username = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].hue.username;
        if (!bridgeIp || !username) {
            this.baseUrl = "";
            return;
        }
        this.baseUrl = `http://${bridgeIp}/api/${username}`;
    }
    isConfigured() {
        return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].hue.isConfigured && this.baseUrl !== "";
    }
    /**
   * Get all lights
   */ async getLights() {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.baseUrl}/lights`);
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get a single light by ID
   */ async getLight(lightId) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.baseUrl}/lights/${lightId}`);
            return {
                ...response.data,
                id: lightId
            };
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Toggle an individual light on/off
   */ async toggleLight(lightId, on) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            // If on is not provided, toggle the current state
            if (on === undefined) {
                const light = await this.getLight(lightId);
                on = !light.state.on;
            }
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/lights/${lightId}/state`, {
                on
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get all zones/rooms
   */ async getZones() {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.baseUrl}/groups`);
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get a single zone by ID
   */ async getZone(zoneId) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.baseUrl}/groups/${zoneId}`);
            return {
                ...response.data,
                id: zoneId
            };
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Toggle a zone on/off
   */ async toggleZone(zoneId, on) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            // If on is not provided, toggle the current state
            if (on === undefined) {
                const zones = await this.getZones();
                const zone = zones[zoneId];
                if (!zone) {
                    throw new Error(`Zone ${zoneId} not found`);
                }
                on = !zone.state.any_on;
            }
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/groups/${zoneId}/action`, {
                on
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Toggle all lights on/off
   */ async toggleAllLights(on) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            // Group 0 is special - it always refers to all lights
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/groups/0/action`, {
                on
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Set brightness for all lights
   */ async setAllBrightness(brightness) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        if (brightness < 1 || brightness > 254) {
            throw new Error("Brightness must be between 1 and 254");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/groups/0/action`, {
                on: true,
                bri: brightness
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Set brightness for a light
   */ async setBrightness(lightId, brightness) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        if (brightness < 0 || brightness > 254) {
            throw new Error("Brightness must be between 0 and 254");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/lights/${lightId}/state`, {
                bri: brightness,
                on: true
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Set brightness for a zone/group
   */ async setZoneBrightness(zoneId, brightness) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        if (brightness < 1 || brightness > 254) {
            throw new Error("Brightness must be between 1 and 254");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/groups/${zoneId}/action`, {
                bri: brightness,
                on: true
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Set light state (comprehensive control)
   */ async setLightState(lightId, state) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/lights/${lightId}/state`, state);
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Set zone state (comprehensive control)
   */ async setZoneState(zoneId, state) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/groups/${zoneId}/action`, state);
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get all scenes
   */ async getScenes() {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.baseUrl}/scenes`);
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get scenes for a specific zone (properly filtered)
   */ async getScenesForZone(zoneId) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const allScenes = await this.getScenes();
            const zone = await this.getZone(zoneId);
            const zoneLightIds = zone.lights;
            // Filter scenes that belong to this zone
            const zoneScenes = Object.entries(allScenes).filter(([_, scene])=>{
                // Check if scene is explicitly for this group
                if (scene.group === zoneId) return true;
                // Check if all scene lights belong to this zone
                if (scene.lights.length > 0) {
                    return scene.lights.every((lightId)=>zoneLightIds.includes(lightId));
                }
                return false;
            }).map(([id, scene])=>({
                    ...scene,
                    id
                }));
            return zoneScenes;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get all scenes with their zone information
   */ async getAllScenesWithZones() {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const [scenes, zones] = await Promise.all([
                this.getScenes(),
                this.getZones()
            ]);
            const zonesArray = Object.entries(zones).map(([id, zone])=>({
                    ...zone,
                    id
                }));
            return Object.entries(scenes).map(([id, scene])=>{
                const zone = zonesArray.find((z)=>z.id === scene.group);
                return {
                    ...scene,
                    id,
                    zoneName: zone?.name
                };
            });
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Find scene by name (case-insensitive partial match)
   */ async findSceneByName(name) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const scenes = await this.getScenes();
            const normalizedSearch = name.toLowerCase();
            const entry = Object.entries(scenes).find(([_, scene])=>scene.name.toLowerCase().includes(normalizedSearch));
            if (entry) {
                return {
                    ...entry[1],
                    id: entry[0]
                };
            }
            return null;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Activate a scene for a zone
   */ async activateScene(zoneId, sceneId) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/groups/${zoneId}/action`, {
                scene: sceneId
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get lights for a zone with full details
   */ async getLightsForZone(zoneId) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const [zone, allLights] = await Promise.all([
                this.getZone(zoneId),
                this.getLights()
            ]);
            return zone.lights.filter((lightId)=>allLights[lightId] !== undefined).map((lightId)=>{
                const light = allLights[lightId];
                return {
                    ...light,
                    id: lightId
                };
            });
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get aggregate status for all lights
   */ async getAllLightsStatus() {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const lights = await this.getLights();
            const lightsArray = Object.values(lights);
            const lightsOn = lightsArray.filter((l)=>l.state.on).length;
            const onLights = lightsArray.filter((l)=>l.state.on);
            const avgBrightness = onLights.length > 0 ? Math.round(onLights.reduce((sum, l)=>sum + (l.state.bri || 0), 0) / onLights.length) : 0;
            return {
                totalLights: lightsArray.length,
                lightsOn,
                anyOn: lightsOn > 0,
                allOn: lightsOn === lightsArray.length,
                averageBrightness: avgBrightness
            };
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get all entertainment areas (for Hue Sync)
   */ async getEntertainmentAreas() {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const groups = await this.getZones();
            const entertainmentAreas = Object.entries(groups).filter(([_, group])=>group.type === "Entertainment").map(([id, group])=>({
                    ...group,
                    id
                }));
            return entertainmentAreas;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get entertainment area by name (case-insensitive partial match)
   */ async getEntertainmentAreaByName(name) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const areas = await this.getEntertainmentAreas();
            const normalizedSearch = name.toLowerCase();
            const area = areas.find((a)=>a.name.toLowerCase().includes(normalizedSearch));
            return area || null;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get entertainment/sync status for an area
   */ async getEntertainmentStatus(areaId) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.baseUrl}/groups/${areaId}`);
            const group = response.data;
            return {
                active: group.stream?.active || false,
                owner: group.stream?.owner,
                proxymode: group.stream?.proxymode
            };
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Toggle entertainment/streaming mode for an area
   * Note: This enables the entertainment API mode. The actual streaming
   * (sending colors) is done by Hue Sync app or Sync Box.
   * 
   * When active=false, this stops any active entertainment session,
   * returning lights to their previous state.
   */ async setEntertainmentMode(areaId, active) {
        if (!this.isConfigured()) {
            throw new Error("HUE bridge not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].put(`${this.baseUrl}/groups/${areaId}`, {
                stream: {
                    active
                }
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`HUE API error: ${error.message}`);
            }
            throw error;
        }
    }
}
}),
"[project]/lib/adapters/hue.adapter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HueAdapter",
    ()=>HueAdapter,
    "getHueAdapter",
    ()=>getHueAdapter
]);
/**
 * Hue Adapter
 * Handles Philips Hue data with write-through caching to Supabase
 * 
 * Auto-detects mode based on Hue bridge reachability:
 * - Bridge reachable: Fetches from Hue bridge, writes to Supabase
 * - Bridge unreachable: Reads from Supabase cache
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$hue$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/hue.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-route] (ecmascript)");
;
;
;
class HueAdapter extends __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAdapter"] {
    hueService;
    constructor(debug = false){
        super({
            serviceName: 'hue',
            debug
        });
        this.hueService = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$hue$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HueService"]();
    }
    /**
   * Check if Hue bridge is configured (has IP and username)
   */ isConfigured() {
        return this.hueService.isConfigured();
    }
    /**
   * Check if Hue bridge is reachable
   * Used for auto-detection of local vs production mode
   */ async checkServiceAvailability() {
        // If not configured, definitely not available
        if (!this.isConfigured()) {
            return false;
        }
        try {
            const bridgeIp = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].hue.bridgeIp;
            const username = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].hue.username;
            if (!bridgeIp || !username) {
                return false;
            }
            // Quick ping to the bridge config endpoint (doesn't require auth for basic info)
            const controller = new AbortController();
            const timeoutId = setTimeout(()=>controller.abort(), __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AVAILABILITY_CHECK_TIMEOUT"]);
            const response = await fetch(`http://${bridgeIp}/api/${username}/config`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Bridge is available if we get a valid response
            return response.ok;
        } catch  {
            // Any error means bridge is not reachable
            return false;
        }
    }
    /**
   * Fetch all Hue data from the bridge
   */ async fetchFromService() {
        if (!this.isConfigured()) {
            throw new Error('Hue bridge not configured');
        }
        const [lights, zones, scenes, status] = await Promise.all([
            this.hueService.getLights(),
            this.hueService.getZones(),
            this.hueService.getScenes(),
            this.hueService.getAllLightsStatus()
        ]);
        // Convert zones object to array with IDs
        const zonesArray = Object.entries(zones).map(([id, zone])=>({
                ...zone,
                id
            })).filter((z)=>z.type === 'Room' || z.type === 'Zone');
        // Convert scenes object to array with IDs
        const scenesArray = Object.entries(scenes).map(([id, scene])=>({
                ...scene,
                id
            }));
        return {
            lights,
            zones: zonesArray,
            scenes: scenesArray,
            status
        };
    }
    /**
   * Fetch cached Hue data from Supabase
   */ async fetchFromCache() {
        const client = this.getReadClient();
        if (!client) return null // Supabase not configured
        ;
        try {
            // Fetch latest lights, zones, scenes, and status in parallel
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            const [lightsResult, zonesResult, scenesResult, statusResult] = await Promise.all([
                clientAny.rpc('get_latest_hue_lights'),
                clientAny.rpc('get_latest_hue_zones'),
                clientAny.rpc('get_latest_hue_scenes'),
                clientAny.rpc('get_latest_hue_status')
            ]);
            if (lightsResult.error) throw lightsResult.error;
            if (zonesResult.error) throw zonesResult.error;
            if (scenesResult.error) throw scenesResult.error;
            if (statusResult.error) throw statusResult.error;
            const lights = lightsResult.data ?? [];
            const zones = zonesResult.data ?? [];
            const scenes = scenesResult.data ?? [];
            const status = statusResult.data;
            // Determine the most recent recorded_at
            const timestamps = [
                ...lights.map((l)=>l.recorded_at),
                ...zones.map((z)=>z.recorded_at),
                ...scenes.map((s)=>s.recorded_at),
                status?.recorded_at
            ].filter(Boolean);
            const recordedAt = timestamps.length > 0 ? timestamps.sort().reverse()[0] : new Date().toISOString();
            return {
                lights,
                zones,
                scenes,
                status,
                recordedAt
            };
        } catch (error) {
            this.logError('Error fetching from cache', error);
            return null;
        }
    }
    /**
   * Write Hue data to Supabase
   */ async writeToCache(data) {
        const client = this.getWriteClient();
        if (!client) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        const timestamp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])();
        let recordsWritten = 0;
        try {
            // Write lights
            const lightInserts = Object.entries(data.lights).map(([id, light])=>({
                    light_id: id,
                    name: light.name,
                    type: light.type,
                    model_id: light.modelid,
                    product_name: light.productname,
                    state: light.state,
                    is_on: light.state.on,
                    brightness: light.state.bri ?? null,
                    is_reachable: light.state.reachable,
                    recorded_at: timestamp
                }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientAny = client;
            if (lightInserts.length > 0) {
                const { error: lightsError } = await clientAny.from('hue_lights').insert(lightInserts);
                if (lightsError) throw lightsError;
                recordsWritten += lightInserts.length;
            }
            // Write zones
            const zoneInserts = data.zones.map((zone)=>({
                    zone_id: zone.id,
                    name: zone.name,
                    type: zone.type,
                    class: zone.class ?? null,
                    lights: zone.lights,
                    state: zone.state,
                    action: zone.action ?? null,
                    any_on: zone.state.any_on,
                    all_on: zone.state.all_on,
                    recorded_at: timestamp
                }));
            if (zoneInserts.length > 0) {
                const { error: zonesError } = await clientAny.from('hue_zones').insert(zoneInserts);
                if (zonesError) throw zonesError;
                recordsWritten += zoneInserts.length;
            }
            // Write scenes
            const sceneInserts = data.scenes.map((scene)=>({
                    scene_id: scene.id,
                    name: scene.name,
                    type: scene.type,
                    zone_id: scene.group ?? null,
                    zone_name: scene.zoneName ?? null,
                    lights: scene.lights,
                    owner: scene.owner ?? null,
                    recycle: scene.recycle ?? false,
                    locked: scene.locked ?? false,
                    recorded_at: timestamp
                }));
            if (sceneInserts.length > 0) {
                const { error: scenesError } = await clientAny.from('hue_scenes').insert(sceneInserts);
                if (scenesError) throw scenesError;
                recordsWritten += sceneInserts.length;
            }
            // Write status
            const statusInsert = {
                total_lights: data.status.totalLights,
                lights_on: data.status.lightsOn,
                any_on: data.status.anyOn,
                all_on: data.status.allOn,
                average_brightness: data.status.averageBrightness,
                recorded_at: timestamp
            };
            const { error: statusError } = await clientAny.from('hue_status').insert(statusInsert);
            if (statusError) throw statusError;
            recordsWritten += 1;
            return {
                success: true,
                recordsWritten
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logError('Error writing to cache', error);
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
   * Get all lights status
   */ async getAllLightsStatus() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            try {
                const status = await this.hueService.getAllLightsStatus();
                // Write to cache in background (only if Supabase is configured)
                if (this.isSupabaseAvailable()) {
                    const client = this.getWriteClient();
                    if (client) {
                        const timestamp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])();
                        client.from('hue_status').insert({
                            total_lights: status.totalLights,
                            lights_on: status.lightsOn,
                            any_on: status.anyOn,
                            all_on: status.allOn,
                            average_brightness: status.averageBrightness,
                            recorded_at: timestamp
                        }).then(({ error })=>{
                            if (error) this.logError('Failed to cache status', error);
                        });
                    }
                }
                return status;
            } catch (error) {
                this.logError('Error fetching status', error);
                throw error;
            }
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        if (!cached?.status) return null;
        return {
            totalLights: cached.status.total_lights,
            lightsOn: cached.status.lights_on,
            anyOn: cached.status.any_on,
            allOn: cached.status.all_on,
            averageBrightness: cached.status.average_brightness
        };
    }
    /**
   * Get all lights
   */ async getLights() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.hueService.getLights();
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        if (!cached) return {};
        const lights = {};
        for (const row of cached.lights){
            lights[row.light_id] = {
                id: row.light_id,
                name: row.name,
                type: row.type ?? '',
                modelid: row.model_id ?? '',
                manufacturername: '',
                productname: row.product_name ?? '',
                state: row.state,
                capabilities: {
                    control: {
                        mindimlevel: 0,
                        maxlumen: 0
                    }
                }
            };
        }
        return lights;
    }
    /**
   * Get all zones
   */ async getZones() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.hueService.getZones();
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        if (!cached) return {};
        const zones = {};
        for (const row of cached.zones){
            zones[row.zone_id] = {
                id: row.zone_id,
                name: row.name,
                type: row.type ?? '',
                class: row.class ?? undefined,
                lights: row.lights,
                state: row.state,
                action: row.action ?? undefined
            };
        }
        return zones;
    }
    /**
   * Get all scenes
   */ async getScenes() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.hueService.getScenes();
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        if (!cached) return {};
        const scenes = {};
        for (const row of cached.scenes){
            scenes[row.scene_id] = {
                id: row.scene_id,
                name: row.name,
                type: row.type ?? '',
                group: row.zone_id ?? undefined,
                zoneName: row.zone_name ?? undefined,
                lights: row.lights,
                owner: row.owner ?? undefined,
                recycle: row.recycle,
                locked: row.locked
            };
        }
        return scenes;
    }
    /**
   * Get scenes for a specific zone
   */ async getScenesForZone(zoneId) {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.hueService.getScenesForZone(zoneId);
        }
        // Production mode - filter cached scenes
        const scenes = await this.getScenes();
        return Object.values(scenes).filter((scene)=>scene.group === zoneId);
    }
    /**
   * Get a specific zone
   */ async getZone(zoneId) {
        const zones = await this.getZones();
        return zones[zoneId] ?? null;
    }
    /**
   * Get lights for a specific zone
   */ async getLightsForZone(zoneId) {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.hueService.getLightsForZone(zoneId);
        }
        // Production mode - get zone and filter lights
        const [zone, allLights] = await Promise.all([
            this.getZone(zoneId),
            this.getLights()
        ]);
        if (!zone) return [];
        return zone.lights.filter((lightId)=>allLights[lightId] !== undefined).map((lightId)=>{
            const light = allLights[lightId];
            return {
                ...light,
                id: lightId
            };
        });
    }
    /**
   * Get entertainment areas
   */ async getEntertainmentAreas() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.hueService.getEntertainmentAreas();
        }
        // Production mode - filter cached zones
        const zones = await this.getZones();
        return Object.values(zones).filter((z)=>z.type === 'Entertainment');
    }
    /**
   * Get entertainment status for an area
   */ async getEntertainmentStatus(areaId) {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.hueService.getEntertainmentStatus(areaId);
        }
        // Production mode - return inactive (can't know real status)
        return {
            active: false
        };
    }
    // ==========================================
    // Mutation methods (local mode only)
    // Use isLocalSync() since by the time controls are enabled,
    // the availability check has already been cached
    // ==========================================
    async toggleLight(lightId, on) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.toggleLight(lightId, on);
    }
    async toggleZone(zoneId, on) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.toggleZone(zoneId, on);
    }
    async toggleAllLights(on) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.toggleAllLights(on);
    }
    async setBrightness(lightId, brightness) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.setBrightness(lightId, brightness);
    }
    async setZoneBrightness(zoneId, brightness) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.setZoneBrightness(zoneId, brightness);
    }
    async setAllBrightness(brightness) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.setAllBrightness(brightness);
    }
    async activateScene(zoneId, sceneId) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.activateScene(zoneId, sceneId);
    }
    async setLightState(lightId, state) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.setLightState(lightId, state);
    }
    async setZoneState(zoneId, state) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.setZoneState(zoneId, state);
    }
    async setEntertainmentMode(areaId, active) {
        if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable');
        return this.hueService.setEntertainmentMode(areaId, active);
    }
}
// Export singleton instance
let hueAdapterInstance = null;
function getHueAdapter() {
    if (!hueAdapterInstance) {
        hueAdapterInstance = new HueAdapter();
    }
    return hueAdapterInstance;
}
}),
"[project]/lib/services/token-storage.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearGoogleCalendarTokens",
    ()=>clearGoogleCalendarTokens,
    "clearSpotifyTokens",
    ()=>clearSpotifyTokens,
    "getGoogleCalendarTokens",
    ()=>getGoogleCalendarTokens,
    "getSpotifyTokens",
    ()=>getSpotifyTokens,
    "setGoogleCalendarTokens",
    ()=>setGoogleCalendarTokens,
    "setSpotifyTokens",
    ()=>setSpotifyTokens
]);
/**
 * Server-side token storage for OAuth tokens
 *
 * Stores tokens in a JSON file on disk instead of cookies.
 * This solves the cross-origin cookie problem when pete.sh makes
 * requests to localhost:3000 - cookies set on localhost aren't
 * sent with cross-origin fetch requests.
 *
 * The local server can read/write this file regardless of which
 * domain initiated the request.
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
// Store tokens in the project root (gitignored)
const TOKEN_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), '.tokens.json');
/**
 * Read all tokens from storage
 */ function readTokens() {
    try {
        if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(TOKEN_FILE)) {
            const data = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(TOKEN_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[TokenStorage] Error reading tokens:', error);
    }
    return {};
}
/**
 * Write tokens to storage
 * Uses fsync to ensure data is flushed to disk (prevents race conditions)
 */ function writeTokens(tokens) {
    try {
        const data = JSON.stringify(tokens, null, 2);
        // Open, write, fsync, close - ensures data is on disk before returning
        const fd = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].openSync(TOKEN_FILE, 'w');
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeSync(fd, data, 0, 'utf-8');
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].fsyncSync(fd);
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].closeSync(fd);
        console.log('[TokenStorage] Tokens written and synced to disk');
    } catch (error) {
        console.error('[TokenStorage] Error writing tokens:', error);
    }
}
function getGoogleCalendarTokens() {
    const tokens = readTokens();
    const calendarTokens = tokens.google_calendar;
    if (!calendarTokens) {
        return {
            accessToken: null,
            refreshToken: null,
            expiryDate: null
        };
    }
    // Check if access token is expired
    if (calendarTokens.expiry_date && Date.now() > calendarTokens.expiry_date) {
        console.log('[TokenStorage] Google Calendar access token expired');
        return {
            accessToken: null,
            refreshToken: calendarTokens.refresh_token || null,
            expiryDate: null
        };
    }
    return {
        accessToken: calendarTokens.access_token || null,
        refreshToken: calendarTokens.refresh_token || null,
        expiryDate: calendarTokens.expiry_date || null
    };
}
function setGoogleCalendarTokens(tokens) {
    const allTokens = readTokens();
    allTokens.google_calendar = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || allTokens.google_calendar?.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
        updated_at: new Date().toISOString()
    };
    writeTokens(allTokens);
    console.log('[TokenStorage] Google Calendar tokens saved');
}
function clearGoogleCalendarTokens() {
    const tokens = readTokens();
    delete tokens.google_calendar;
    writeTokens(tokens);
    console.log('[TokenStorage] Google Calendar tokens cleared');
}
function getSpotifyTokens() {
    const tokens = readTokens();
    const spotifyTokens = tokens.spotify;
    if (!spotifyTokens) {
        return {
            accessToken: null,
            refreshToken: null,
            expiryDate: null
        };
    }
    // Check if access token is expired
    if (spotifyTokens.expiry_date && Date.now() > spotifyTokens.expiry_date) {
        console.log('[TokenStorage] Spotify access token expired');
        return {
            accessToken: null,
            refreshToken: spotifyTokens.refresh_token || null,
            expiryDate: null
        };
    }
    return {
        accessToken: spotifyTokens.access_token || null,
        refreshToken: spotifyTokens.refresh_token || null,
        expiryDate: spotifyTokens.expiry_date || null
    };
}
function setSpotifyTokens(tokens) {
    const allTokens = readTokens();
    allTokens.spotify = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || allTokens.spotify?.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
        updated_at: new Date().toISOString()
    };
    writeTokens(allTokens);
    console.log('[TokenStorage] Spotify tokens saved');
}
function clearSpotifyTokens() {
    const tokens = readTokens();
    delete tokens.spotify;
    writeTokens(tokens);
    console.log('[TokenStorage] Spotify tokens cleared');
}
}),
"[project]/lib/services/spotify.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SpotifyService",
    ()=>SpotifyService,
    "loadSpotifyTokensFromCookies",
    ()=>loadSpotifyTokensFromCookies
]);
/**
 * Spotify Service
 * Handles OAuth and communication with Spotify Web API
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$token$2d$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/token-storage.ts [app-route] (ecmascript)");
;
;
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";
class SpotifyService {
    accessToken = null;
    refreshToken = null;
    constructor(){}
    isConfigured() {
        return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.isConfigured;
    }
    /**
   * Generate the OAuth authorization URL
   */ getAuthUrl(state) {
        if (!this.isConfigured()) {
            throw new Error("Spotify not configured");
        }
        const params = new URLSearchParams({
            client_id: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.clientId,
            response_type: "code",
            redirect_uri: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.redirectUri,
            scope: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.scopes.join(" "),
            show_dialog: "false"
        });
        if (state) {
            params.set("state", state);
        }
        return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
    }
    /**
   * Exchange authorization code for tokens
   */ async exchangeCode(code) {
        if (!this.isConfigured()) {
            throw new Error("Spotify not configured");
        }
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.redirectUri
        });
        const response = await fetch(SPOTIFY_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.clientId}:${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.clientSecret}`).toString("base64")}`
            },
            body: body.toString()
        });
        if (!response.ok) {
            const error = await response.json().catch(()=>({}));
            throw new Error(error.error_description || "Failed to exchange code for tokens");
        }
        const tokens = await response.json();
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token || null;
        return tokens;
    }
    /**
   * Refresh access token using refresh token
   */ async refreshAccessToken(refreshToken) {
        if (!this.isConfigured()) {
            throw new Error("Spotify not configured");
        }
        const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken
        });
        const response = await fetch(SPOTIFY_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.clientId}:${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.clientSecret}`).toString("base64")}`
            },
            body: body.toString()
        });
        if (!response.ok) {
            const error = await response.json().catch(()=>({}));
            throw new Error(error.error_description || "Failed to refresh token");
        }
        const tokens = await response.json();
        this.accessToken = tokens.access_token;
        // Spotify doesn't always return a new refresh token
        if (tokens.refresh_token) {
            this.refreshToken = tokens.refresh_token;
        }
        return {
            ...tokens,
            refresh_token: tokens.refresh_token || refreshToken
        };
    }
    /**
   * Set credentials for API requests
   */ setCredentials(accessToken, refreshToken) {
        this.accessToken = accessToken;
        if (refreshToken) {
            this.refreshToken = refreshToken;
        }
    }
    /**
   * Make authenticated API request
   */ async apiRequest(endpoint, options = {}) {
        if (!this.accessToken) {
            throw new Error("No access token available");
        }
        const response = await fetch(`${SPOTIFY_API_URL}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json"
            }
        });
        // Handle 204 No Content and 202 Accepted (successful but no body)
        if (response.status === 204 || response.status === 202) {
            return {};
        }
        // Get response text first to safely handle empty or non-JSON responses
        const text = await response.text();
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("TOKEN_EXPIRED");
            }
            // Try to parse error as JSON
            try {
                const error = text ? JSON.parse(text) : {};
                throw new Error(error.error?.message || `API request failed: ${response.status}`);
            } catch  {
                throw new Error(`API request failed: ${response.status}`);
            }
        }
        // Handle empty successful response
        if (!text) {
            return {};
        }
        // Parse JSON response
        try {
            return JSON.parse(text);
        } catch  {
            // If parsing fails but response was ok, return empty object
            return {};
        }
    }
    // ==========================================
    // User Endpoints
    // ==========================================
    /**
   * Get current user's profile
   */ async getCurrentUser() {
        return this.apiRequest("/me");
    }
    // ==========================================
    // Player Endpoints
    // ==========================================
    /**
   * Get current playback state
   */ async getPlaybackState() {
        try {
            return await this.apiRequest("/me/player");
        } catch (error) {
            // 204 means no active device
            if (error instanceof Error && error.message.includes("API request failed")) {
                return null;
            }
            throw error;
        }
    }
    /**
   * Get available devices
   */ async getDevices() {
        const response = await this.apiRequest("/me/player/devices");
        return response.devices || [];
    }
    /**
   * Get current queue
   */ async getQueue() {
        return this.apiRequest("/me/player/queue");
    }
    /**
   * Start/resume playback
   */ async play(options) {
        const params = options?.deviceId ? `?device_id=${options.deviceId}` : "";
        const body = {};
        if (options?.contextUri) body.context_uri = options.contextUri;
        if (options?.uris) body.uris = options.uris;
        if (options?.offset) body.offset = options.offset;
        if (options?.positionMs !== undefined) body.position_ms = options.positionMs;
        await this.apiRequest(`/me/player/play${params}`, {
            method: "PUT",
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
        });
    }
    /**
   * Pause playback
   */ async pause(deviceId) {
        const params = deviceId ? `?device_id=${deviceId}` : "";
        await this.apiRequest(`/me/player/pause${params}`, {
            method: "PUT"
        });
    }
    /**
   * Skip to next track
   */ async skipToNext(deviceId) {
        const params = deviceId ? `?device_id=${deviceId}` : "";
        await this.apiRequest(`/me/player/next${params}`, {
            method: "POST"
        });
    }
    /**
   * Skip to previous track
   */ async skipToPrevious(deviceId) {
        const params = deviceId ? `?device_id=${deviceId}` : "";
        await this.apiRequest(`/me/player/previous${params}`, {
            method: "POST"
        });
    }
    /**
   * Seek to position in current track
   */ async seek(positionMs, deviceId) {
        const params = new URLSearchParams({
            position_ms: positionMs.toString()
        });
        if (deviceId) params.set("device_id", deviceId);
        await this.apiRequest(`/me/player/seek?${params.toString()}`, {
            method: "PUT"
        });
    }
    /**
   * Set volume
   */ async setVolume(volumePercent, deviceId) {
        const params = new URLSearchParams({
            volume_percent: Math.round(volumePercent).toString()
        });
        if (deviceId) params.set("device_id", deviceId);
        await this.apiRequest(`/me/player/volume?${params.toString()}`, {
            method: "PUT"
        });
    }
    /**
   * Set repeat mode
   */ async setRepeat(state, deviceId) {
        const params = new URLSearchParams({
            state
        });
        if (deviceId) params.set("device_id", deviceId);
        await this.apiRequest(`/me/player/repeat?${params.toString()}`, {
            method: "PUT"
        });
    }
    /**
   * Toggle shuffle
   */ async setShuffle(state, deviceId) {
        const params = new URLSearchParams({
            state: state.toString()
        });
        if (deviceId) params.set("device_id", deviceId);
        await this.apiRequest(`/me/player/shuffle?${params.toString()}`, {
            method: "PUT"
        });
    }
    /**
   * Add item to queue
   */ async addToQueue(uri, deviceId) {
        const params = new URLSearchParams({
            uri
        });
        if (deviceId) params.set("device_id", deviceId);
        await this.apiRequest(`/me/player/queue?${params.toString()}`, {
            method: "POST"
        });
    }
    /**
   * Transfer playback to a device
   */ async transferPlayback(deviceId, play) {
        await this.apiRequest("/me/player", {
            method: "PUT",
            body: JSON.stringify({
                device_ids: [
                    deviceId
                ],
                play: play ?? false
            })
        });
    }
    // ==========================================
    // Library Endpoints
    // ==========================================
    /**
   * Get user's playlists
   */ async getPlaylists(limit = 20, offset = 0) {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });
        return this.apiRequest(`/me/playlists?${params.toString()}`);
    }
    /**
   * Get recently played tracks
   */ async getRecentlyPlayed(limit = 20) {
        const params = new URLSearchParams({
            limit: limit.toString()
        });
        return this.apiRequest(`/me/player/recently-played?${params.toString()}`);
    }
    /**
   * Get a playlist's tracks
   */ async getPlaylistTracks(playlistId, limit = 50, offset = 0) {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });
        return this.apiRequest(`/playlists/${playlistId}/tracks?${params.toString()}`);
    }
    // ==========================================
    // Search Endpoint
    // ==========================================
    /**
   * Search for tracks, artists, albums, or playlists
   */ async search(query, types = [
        "track"
    ], limit = 20) {
        const params = new URLSearchParams({
            q: query,
            type: types.join(","),
            limit: limit.toString()
        });
        return this.apiRequest(`/search?${params.toString()}`);
    }
    // ==========================================
    // Audio Features Endpoints
    // ==========================================
    /**
   * Get audio features for a single track
   */ async getAudioFeatures(trackId) {
        return this.apiRequest(`/audio-features/${trackId}`);
    }
    /**
   * Get audio features for multiple tracks (max 100)
   */ async getAudioFeaturesForTracks(trackIds) {
        if (trackIds.length === 0) return [];
        // API allows max 100 tracks per request
        const ids = trackIds.slice(0, 100).join(",");
        const response = await this.apiRequest(`/audio-features?ids=${ids}`);
        // Filter out null values (tracks without audio features)
        return response.audio_features.filter((f)=>f !== null);
    }
    // ==========================================
    // User Library Endpoints
    // ==========================================
    /**
   * Get user's saved tracks (library)
   */ async getSavedTracks(limit = 50, offset = 0) {
        const params = new URLSearchParams({
            limit: Math.min(limit, 50).toString(),
            offset: offset.toString()
        });
        return this.apiRequest(`/me/tracks?${params.toString()}`);
    }
    /**
   * Get all saved tracks with pagination
   * Warning: This can be slow for large libraries
   */ async getAllSavedTracks(progressCallback) {
        const allTracks = [];
        let offset = 0;
        const limit = 50;
        let total = 0;
        do {
            const response = await this.getSavedTracks(limit, offset);
            allTracks.push(...response.items);
            total = response.total;
            offset += limit;
            progressCallback?.(allTracks.length, total);
        }while (offset < total)
        return allTracks;
    }
    // ==========================================
    // Recommendations Endpoint
    // ==========================================
    /**
   * Get track recommendations based on seeds and audio features
   */ async getRecommendations(params) {
        const queryParams = new URLSearchParams();
        // Add seed parameters (max 5 total across all seed types)
        if (params.seed_artists?.length) {
            queryParams.set("seed_artists", params.seed_artists.slice(0, 5).join(","));
        }
        if (params.seed_tracks?.length) {
            queryParams.set("seed_tracks", params.seed_tracks.slice(0, 5).join(","));
        }
        if (params.seed_genres?.length) {
            queryParams.set("seed_genres", params.seed_genres.slice(0, 5).join(","));
        }
        // Limit
        if (params.limit) {
            queryParams.set("limit", Math.min(params.limit, 100).toString());
        }
        // Tempo filters
        if (params.target_tempo !== undefined) {
            queryParams.set("target_tempo", params.target_tempo.toString());
        }
        if (params.min_tempo !== undefined) {
            queryParams.set("min_tempo", params.min_tempo.toString());
        }
        if (params.max_tempo !== undefined) {
            queryParams.set("max_tempo", params.max_tempo.toString());
        }
        // Energy filters
        if (params.target_energy !== undefined) {
            queryParams.set("target_energy", params.target_energy.toString());
        }
        if (params.min_energy !== undefined) {
            queryParams.set("min_energy", params.min_energy.toString());
        }
        if (params.max_energy !== undefined) {
            queryParams.set("max_energy", params.max_energy.toString());
        }
        // Danceability filters
        if (params.target_danceability !== undefined) {
            queryParams.set("target_danceability", params.target_danceability.toString());
        }
        if (params.min_danceability !== undefined) {
            queryParams.set("min_danceability", params.min_danceability.toString());
        }
        if (params.max_danceability !== undefined) {
            queryParams.set("max_danceability", params.max_danceability.toString());
        }
        return this.apiRequest(`/recommendations?${queryParams.toString()}`);
    }
    // ==========================================
    // Playlist Management Endpoints
    // ==========================================
    /**
   * Create a new playlist
   */ async createPlaylist(userId, name, options) {
        return this.apiRequest(`/users/${userId}/playlists`, {
            method: "POST",
            body: JSON.stringify({
                name,
                description: options?.description || "",
                public: options?.public ?? false
            })
        });
    }
    /**
   * Add tracks to a playlist
   */ async addTracksToPlaylist(playlistId, trackUris, position) {
        const body = {
            uris: trackUris.slice(0, 100)
        };
        if (position !== undefined) {
            body.position = position;
        }
        return this.apiRequest(`/playlists/${playlistId}/tracks`, {
            method: "POST",
            body: JSON.stringify(body)
        });
    }
    /**
   * Remove tracks from a playlist
   */ async removeTracksFromPlaylist(playlistId, trackUris) {
        return this.apiRequest(`/playlists/${playlistId}/tracks`, {
            method: "DELETE",
            body: JSON.stringify({
                tracks: trackUris.map((uri)=>({
                        uri
                    }))
            })
        });
    }
    /**
   * Get a single playlist by ID
   */ async getPlaylist(playlistId) {
        return this.apiRequest(`/playlists/${playlistId}`);
    }
    /**
   * Get top tracks for an artist
   */ async getArtistTopTracks(artistId, market = "US") {
        return this.apiRequest(`/artists/${artistId}/top-tracks?market=${market}`);
    }
}
async function loadSpotifyTokensFromCookies(spotifyService, cookieStore) {
    // First try file-based storage (works for cross-origin requests)
    const fileTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$token$2d$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSpotifyTokens"])();
    // Fall back to cookies if file storage is empty
    const cookieAccessToken = cookieStore.get("spotify_access_token")?.value || null;
    const cookieRefreshToken = cookieStore.get("spotify_refresh_token")?.value || null;
    const cookieExpiresAt = cookieStore.get("spotify_expires_at")?.value;
    // Use file tokens if available, otherwise use cookies
    const accessToken = fileTokens.accessToken || cookieAccessToken;
    const refreshToken = fileTokens.refreshToken || cookieRefreshToken;
    const expiresAt = fileTokens.expiryDate || (cookieExpiresAt ? parseInt(cookieExpiresAt, 10) : null);
    console.log("[SpotifyService] Loading tokens:", {
        fromFile: {
            hasAccessToken: !!fileTokens.accessToken,
            hasRefreshToken: !!fileTokens.refreshToken
        },
        fromCookies: {
            hasAccessToken: !!cookieAccessToken,
            hasRefreshToken: !!cookieRefreshToken
        },
        using: {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken
        }
    });
    // Check if token is expired or about to expire (within 5 minutes)
    const needsRefresh = expiresAt ? expiresAt < Date.now() + 5 * 60 * 1000 : !accessToken && !!refreshToken;
    if (accessToken) {
        spotifyService.setCredentials(accessToken, refreshToken || undefined);
    }
    return {
        accessToken,
        refreshToken,
        needsRefresh
    };
}
}),
"[project]/lib/adapters/spotify.adapter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SpotifyAdapter",
    ()=>SpotifyAdapter,
    "getSpotifyAdapter",
    ()=>getSpotifyAdapter
]);
/**
 * Spotify Adapter
 * Handles Spotify playback data with write-through caching to Supabase
 * 
 * Spotify requires OAuth authentication, so availability depends on
 * whether the user is authenticated. Supabase cache is used as fallback.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$spotify$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/spotify.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-route] (ecmascript)");
;
;
;
;
class SpotifyAdapter extends __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAdapter"] {
    spotifyService;
    constructor(debug = false){
        super({
            serviceName: 'spotify',
            debug
        });
        this.spotifyService = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$spotify$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SpotifyService"]();
    }
    /**
   * Check if Spotify is configured
   */ isConfigured() {
        return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].spotify.isConfigured;
    }
    /**
   * Check if Spotify API is available
   * Spotify is an external API that requires OAuth - we consider it "available"
   * if the service is configured. Authentication is handled separately.
   */ async checkServiceAvailability() {
        return this.isConfigured();
    }
    /**
   * Initialize the service with tokens from cookies
   * Must be called in server context before fetching data
   */ async initializeWithTokens() {
        if (!this.isConfigured()) {
            return {
                authenticated: false,
                needsRefresh: false
            };
        }
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
        const { accessToken, refreshToken, needsRefresh } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$spotify$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loadSpotifyTokensFromCookies"])(this.spotifyService, cookieStore);
        return {
            authenticated: Boolean(accessToken || refreshToken),
            needsRefresh
        };
    }
    /**
   * Fetch all Spotify data from the API
   */ async fetchFromService() {
        if (!this.isConfigured()) {
            throw new Error('Spotify not configured');
        }
        // Get playback state and devices in parallel
        const [playbackState, devices] = await Promise.all([
            this.spotifyService.getPlaybackState().catch(()=>null),
            this.spotifyService.getDevices().catch(()=>[])
        ]);
        // Try to get user info (might fail if not authenticated)
        let user = null;
        try {
            user = await this.spotifyService.getCurrentUser();
        } catch  {
        // User info is optional
        }
        return {
            playbackState,
            devices,
            user
        };
    }
    /**
   * Fetch cached Spotify data from Supabase
   */ async fetchFromCache() {
        const client = this.getReadClient();
        if (!client) return null // Supabase not configured
        ;
        try {
            const { data, error } = await client.rpc('get_latest_spotify_state');
            if (error) throw error;
            if (!data) return null;
            const row = data;
            return {
                playbackState: row.playback_state,
                devices: row.devices ?? [],
                user: row.user_info,
                isPlaying: row.is_playing,
                currentTrack: {
                    name: row.current_track_name,
                    artist: row.current_track_artist,
                    album: row.current_track_album,
                    imageUrl: row.current_track_image_url,
                    progressMs: row.progress_ms,
                    durationMs: row.duration_ms
                },
                recordedAt: row.recorded_at
            };
        } catch (error) {
            this.logError('Error fetching from cache', error);
            return null;
        }
    }
    /**
   * Write Spotify data to Supabase
   */ async writeToCache(data) {
        const client = this.getWriteClient();
        if (!client) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        const timestamp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])();
        try {
            const track = data.playbackState?.item;
            const insert = {
                playback_state: data.playbackState,
                devices: data.devices,
                user_info: data.user,
                is_playing: data.playbackState?.is_playing ?? false,
                current_track_name: track?.name ?? null,
                current_track_artist: track?.artists?.map((a)=>a.name).join(', ') ?? null,
                current_track_album: track?.album?.name ?? null,
                current_track_image_url: track?.album?.images?.[0]?.url ?? null,
                progress_ms: data.playbackState?.progress_ms ?? null,
                duration_ms: track?.duration_ms ?? null,
                recorded_at: timestamp
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await client.from('spotify_state').insert(insert);
            if (error) throw error;
            return {
                success: true,
                recordsWritten: 1
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logError('Error writing to cache', error);
            return {
                success: false,
                recordsWritten: 0,
                error: errorMessage
            };
        }
    }
    // ==========================================
    // High-level API methods
    // ==========================================
    /**
   * Get current playback state
   */ async getPlaybackState() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            try {
                const state = await this.spotifyService.getPlaybackState();
                // Write to cache in background
                if (this.isSupabaseAvailable() && state) {
                    const devices = await this.spotifyService.getDevices().catch(()=>[]);
                    this.writeToCache({
                        playbackState: state,
                        devices,
                        user: null
                    }).catch((err)=>this.logError('Failed to cache playback state', err));
                }
                return state;
            } catch (error) {
                this.logError('Error fetching playback state', error);
                throw error;
            }
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        return cached?.playbackState ?? null;
    }
    /**
   * Get available devices
   */ async getDevices() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            return this.spotifyService.getDevices();
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        return cached?.devices ?? [];
    }
    /**
   * Get current user info
   */ async getCurrentUser() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            try {
                return await this.spotifyService.getCurrentUser();
            } catch  {
                return null;
            }
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        return cached?.user ?? null;
    }
    /**
   * Get simplified "now playing" info
   * Useful for display widgets
   */ async getNowPlaying() {
        const isLocal = await this.isLocal();
        if (isLocal) {
            const state = await this.getPlaybackState();
            if (!state?.item) {
                return {
                    isPlaying: false,
                    track: null,
                    progressMs: 0,
                    durationMs: 0
                };
            }
            return {
                isPlaying: state.is_playing,
                track: {
                    name: state.item.name,
                    artist: state.item.artists.map((a)=>a.name).join(', '),
                    album: state.item.album.name,
                    imageUrl: state.item.album.images[0]?.url ?? ''
                },
                progressMs: state.progress_ms ?? 0,
                durationMs: state.item.duration_ms
            };
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        if (!cached) {
            return {
                isPlaying: false,
                track: null,
                progressMs: 0,
                durationMs: 0
            };
        }
        return {
            isPlaying: cached.isPlaying,
            track: cached.currentTrack.name ? {
                name: cached.currentTrack.name,
                artist: cached.currentTrack.artist ?? '',
                album: cached.currentTrack.album ?? '',
                imageUrl: cached.currentTrack.imageUrl ?? ''
            } : null,
            progressMs: cached.currentTrack.progressMs ?? 0,
            durationMs: cached.currentTrack.durationMs ?? 0,
            recordedAt: cached.recordedAt
        };
    }
    // ==========================================
    // Mutation methods (local mode only)
    // These delegate to the real service
    // ==========================================
    async play(options) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.play(options);
    }
    async pause(deviceId) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.pause(deviceId);
    }
    async skipToNext(deviceId) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.skipToNext(deviceId);
    }
    async skipToPrevious(deviceId) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.skipToPrevious(deviceId);
    }
    async seek(positionMs, deviceId) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.seek(positionMs, deviceId);
    }
    async setVolume(volumePercent, deviceId) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.setVolume(volumePercent, deviceId);
    }
    async setShuffle(state, deviceId) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.setShuffle(state, deviceId);
    }
    async transferPlayback(deviceId, play) {
        if (!this.isLocal()) throw new Error('Controls only available in local mode');
        return this.spotifyService.transferPlayback(deviceId, play);
    }
    // Pass-through methods for auth (always work)
    getAuthUrl(state) {
        return this.spotifyService.getAuthUrl(state);
    }
    async exchangeCode(code) {
        return this.spotifyService.exchangeCode(code);
    }
    async refreshAccessToken(refreshToken) {
        return this.spotifyService.refreshAccessToken(refreshToken);
    }
    setCredentials(accessToken, refreshToken) {
        this.spotifyService.setCredentials(accessToken, refreshToken);
    }
}
// Export singleton instance
let spotifyAdapterInstance = null;
function getSpotifyAdapter() {
    if (!spotifyAdapterInstance) {
        spotifyAdapterInstance = new SpotifyAdapter();
    }
    return spotifyAdapterInstance;
}
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
   * Add exercises to the completed list without necessarily marking the workout as complete.
   * If all exercises are completed, marks the workout as complete.
   * Used by workout autocomplete to add exercises incrementally.
   */ async addCompletedExercises(day, weekNumber, exerciseIds) {
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
        // Get all exercise IDs from the workout definition
        const allIds = this.getAllExerciseIdsFromWorkout(workoutDef);
        // Get currently completed exercises (or empty array)
        const currentlyCompleted = week.days[day]?.workout?.exercisesCompleted ?? [];
        // Merge with new exercise IDs (deduped)
        const updatedCompleted = Array.from(new Set([
            ...currentlyCompleted,
            ...exerciseIds
        ]));
        // Check if all exercises are now complete
        const allComplete = allIds.every((id)=>updatedCompleted.includes(id));
        // Update the workout completion state
        week.days[day].workout = {
            workoutId: workoutDef.id,
            completed: allComplete,
            completedAt: allComplete ? new Date().toISOString() : undefined,
            exercisesCompleted: updatedCompleted
        };
        await this.updateRoutine(routine);
        return {
            allComplete,
            exercisesCompleted: updatedCompleted
        };
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
   * Add exercises to the completed list without necessarily marking the workout complete
   * Used by workout autocomplete to incrementally complete exercises
   */ async addCompletedExercises(day, weekNumber, exerciseIds) {
        // Update via the service (which updates JSON)
        const result = await this.fitnessService.addCompletedExercises(day, weekNumber, exerciseIds);
        // Also update Supabase if available
        if (this.isSupabaseAvailable()) {
            const routine = await this.fitnessService.getRoutine();
            if (routine) {
                await this.saveRoutineToSupabase(routine);
            }
        }
        return result;
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
"[project]/lib/services/cta.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CTAService",
    ()=>CTAService
]);
/**
 * CTA Transit Service
 * Handles communication with Chicago Transit Authority APIs
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-route] (ecmascript)");
;
;
class CTAService {
    busApiUrl = "http://www.ctabustracker.com/bustime/api/v2";
    trainApiUrl = "http://lapi.transitchicago.com/api/1.0";
    isConfigured() {
        return Boolean(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].cta.apiKey);
    }
    /**
   * Get bus predictions for a route and stop
   */ async getBusPredictions(route, stopId) {
        if (!this.isConfigured()) {
            throw new Error("CTA API key not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.busApiUrl}/getpredictions`, {
                params: {
                    key: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].cta.apiKey,
                    rt: route,
                    stpid: stopId,
                    format: "json"
                }
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`CTA Bus API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get train predictions for a line and station
   */ async getTrainPredictions(line, stationId) {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].cta.isTrainConfigured) {
            throw new Error("CTA Train API key not configured");
        }
        try {
            // Use mapid to get all trains at the station, then filter by route client-side
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.trainApiUrl}/ttarrivals.aspx`, {
                params: {
                    key: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].cta.trainApiKey,
                    mapid: stationId,
                    rt: line,
                    outputType: "JSON"
                }
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`CTA Train API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get stops for a route and direction
   */ async getStops(route, direction) {
        if (!this.isConfigured()) {
            throw new Error("CTA API key not configured");
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.busApiUrl}/getstops`, {
                params: {
                    key: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].cta.apiKey,
                    rt: route,
                    dir: direction,
                    format: "json"
                }
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`CTA Bus Stops API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Find a stop ID by route, direction, and stop name (partial match)
   */ async findStopId(route, direction, stopName) {
        try {
            const stopsResponse = await this.getStops(route, direction);
            const stops = stopsResponse["bustime-response"]?.stops || [];
            // Search for stop by name (case-insensitive, partial match)
            const stopNameLower = stopName.toLowerCase();
            const stop = stops.find((s)=>s.stpnm.toLowerCase().includes(stopNameLower));
            return stop?.stpid || null;
        } catch (error) {
            console.error(`Error finding stop ID for ${route} ${direction} at ${stopName}:`, error);
            return null;
        }
    }
    /**
   * Get all configured routes at once
   * Routes: 76, 36, 22 buses, Brown and Purple Lines southbound
   */ async getAllRoutes(config) {
        const busPromises = config.bus.map(async (route)=>{
            try {
                const predictions = await this.getBusPredictions(route.route, route.stopId);
                // Check if the response contains an error
                if (predictions["bustime-response"]?.error) {
                    const errorMsg = predictions["bustime-response"].error[0]?.msg || "Unknown error";
                    console.error(`Route ${route.route} (${route.direction}) stop ${route.stopId}: ${errorMsg}. ` + `Use /api/cta/bus/stops?route=${route.route}&direction=${route.direction} to find correct stop ID.`);
                }
                return {
                    route: route.route,
                    data: predictions
                };
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                console.error(`Route ${route.route} (${route.direction}) stop ${route.stopId}: ${errorMsg}`);
                return {
                    route: route.route,
                    data: null,
                    error: errorMsg
                };
            }
        });
        const busResults = await Promise.all(busPromises);
        const busData = {};
        busResults.forEach((result)=>{
            if (result.data) {
                busData[result.route] = result.data;
            } else {
                // Include error in response for debugging
                busData[result.route] = {
                    "bustime-response": {
                        error: [
                            {
                                rt: result.route,
                                msg: result.error || "Failed to fetch predictions"
                            }
                        ]
                    }
                };
            }
        });
        const trainPromises = config.train.map(async (trainConfig)=>{
            try {
                const predictions = await this.getTrainPredictions(trainConfig.line, trainConfig.stationId);
                return {
                    line: trainConfig.line,
                    data: predictions
                };
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                console.error(`Train ${trainConfig.line} station ${trainConfig.stationId}: ${errorMsg}`);
                return {
                    line: trainConfig.line,
                    data: null,
                    error: errorMsg
                };
            }
        });
        const trainResults = await Promise.all(trainPromises);
        const trainData = {};
        trainResults.forEach((result)=>{
            if (result.data) {
                trainData[result.line] = result.data;
            } else {
                // Include error in response for debugging
                trainData[result.line] = {
                    ctatt: {
                        tmst: new Date().toISOString(),
                        errCd: "1",
                        errNm: result.error || "Failed to fetch predictions",
                        eta: []
                    }
                };
            }
        });
        return {
            bus: busData,
            train: trainData
        };
    }
}
}),
"[project]/lib/adapters/cta.adapter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CTAAdapter",
    ()=>CTAAdapter,
    "getCTAAdapter",
    ()=>getCTAAdapter
]);
/**
 * CTA Adapter
 * Handles Chicago Transit Authority data with historical recording
 * 
 * CTA data is always fetched from the real API when available (public API).
 * Supabase is used for historical data storage and as a fallback.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$cta$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/cta.service.ts [app-route] (ecmascript)");
;
;
// Default route configuration
const DEFAULT_ROUTE_CONFIG = {
    bus: [
        {
            route: '76',
            stopId: '11031',
            direction: 'Eastbound'
        },
        {
            route: '22',
            stopId: '18173',
            direction: 'Southbound'
        },
        {
            route: '36',
            stopId: '18173',
            direction: 'Southbound'
        }
    ],
    train: [
        {
            line: 'Brn',
            stationId: '40530',
            direction: 'Southbound'
        },
        {
            line: 'P',
            stationId: '40530',
            direction: 'Southbound'
        }
    ]
};
class CTAAdapter extends __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAdapter"] {
    ctaService;
    routeConfig;
    constructor(routeConfig, debug = false){
        super({
            serviceName: 'cta',
            debug
        });
        this.ctaService = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$cta$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CTAService"]();
        this.routeConfig = routeConfig ?? DEFAULT_ROUTE_CONFIG;
    }
    /**
   * Check if CTA service is configured (has API key)
   */ isConfigured() {
        return this.ctaService.isConfigured();
    }
    /**
   * Check if CTA API is reachable
   * Since CTA is a public API, this always returns true if configured
   */ async checkServiceAvailability() {
        // CTA is a public API - always available if configured
        // The actual reachability is handled per-request with fallback to cache
        return this.isConfigured();
    }
    /**
   * Update the route configuration
   */ setRouteConfig(config) {
        this.routeConfig = config;
    }
    /**
   * Fetch all CTA data from the API
   */ async fetchFromService() {
        return this.ctaService.getAllRoutes(this.routeConfig);
    }
    /**
   * Fetch cached CTA data from Supabase (historical)
   */ async fetchFromCache() {
        const client = this.getReadClient();
        if (!client) return null // Supabase not configured
        ;
        try {
            // Get the most recent records for each route
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await client.from('cta_history').select('*').order('recorded_at', {
                ascending: false
            }).limit(20) // Get recent history
            ;
            if (error) throw error;
            if (!data || data.length === 0) return null;
            const rows = data;
            // Group by route and take the latest for each
            const busMap = new Map();
            const trainMap = new Map();
            for (const row of rows){
                if (row.route_type === 'bus' && !busMap.has(row.route)) {
                    busMap.set(row.route, row);
                } else if (row.route_type === 'train' && !trainMap.has(row.route)) {
                    trainMap.set(row.route, row);
                }
            }
            // Convert to response format
            const bus = {};
            for (const [route, row] of busMap){
                if (row.error_message) {
                    bus[route] = {
                        'bustime-response': {
                            error: [
                                {
                                    rt: route,
                                    msg: row.error_message
                                }
                            ]
                        }
                    };
                } else {
                    bus[route] = {
                        'bustime-response': {
                            prd: row.predictions ?? []
                        }
                    };
                }
            }
            const train = {};
            for (const [line, row] of trainMap){
                if (row.error_message) {
                    train[line] = {
                        ctatt: {
                            tmst: row.recorded_at,
                            errCd: '1',
                            errNm: row.error_message,
                            eta: []
                        }
                    };
                } else {
                    train[line] = {
                        ctatt: {
                            tmst: row.recorded_at,
                            errCd: '0',
                            errNm: null,
                            eta: row.predictions ?? []
                        }
                    };
                }
            }
            const recordedAt = rows[0]?.recorded_at ?? new Date().toISOString();
            return {
                bus,
                train,
                recordedAt
            };
        } catch (error) {
            this.logError('Error fetching from cache', error);
            return null;
        }
    }
    /**
   * Write CTA data to Supabase history
   */ async writeToCache(data) {
        const client = this.getWriteClient();
        if (!client) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        const timestamp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])();
        let recordsWritten = 0;
        try {
            const inserts = [];
            // Add bus predictions
            for (const [route, response] of Object.entries(data.bus)){
                const config = this.routeConfig.bus.find((b)=>b.route === route);
                const error = response['bustime-response']?.error?.[0];
                inserts.push({
                    route_type: 'bus',
                    route,
                    stop_id: config?.stopId ?? null,
                    station_id: null,
                    direction: config?.direction ?? null,
                    predictions: error ? null : response['bustime-response']?.prd ?? [],
                    error_message: error?.msg ?? null,
                    recorded_at: timestamp
                });
            }
            // Add train predictions
            for (const [line, response] of Object.entries(data.train)){
                const config = this.routeConfig.train.find((t)=>t.line === line);
                const hasError = response.ctatt?.errCd !== '0';
                inserts.push({
                    route_type: 'train',
                    route: line,
                    stop_id: null,
                    station_id: config?.stationId ?? null,
                    direction: config?.direction ?? null,
                    predictions: hasError ? null : response.ctatt?.eta ?? [],
                    error_message: hasError ? response.ctatt?.errNm : null,
                    recorded_at: timestamp
                });
            }
            if (inserts.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await client.from('cta_history').insert(inserts);
                if (error) throw error;
                recordsWritten = inserts.length;
            }
            return {
                success: true,
                recordsWritten
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logError('Error writing to cache', error);
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
   * Get all routes data
   * Always tries to fetch from CTA API first (it's a public API)
   */ async getAllRoutes(config) {
        const routeConfig = config ?? this.routeConfig;
        try {
            // Always try to fetch from real API first
            const data = await this.ctaService.getAllRoutes(routeConfig);
            // Write to history in background
            if (this.isSupabaseAvailable()) {
                this.writeToCache(data).catch((err)=>this.logError('Failed to record CTA history', err));
            }
            return data;
        } catch (error) {
            this.logError('Error fetching from CTA API', error);
            // Fall back to cached data if available
            if (this.isSupabaseAvailable()) {
                const cached = await this.fetchFromCache();
                if (cached) {
                    this.log('Using cached CTA data');
                    return {
                        bus: cached.bus,
                        train: cached.train
                    };
                }
            }
            throw error;
        }
    }
    /**
   * Get bus predictions for a specific route
   */ async getBusPredictions(route, stopId) {
        try {
            const response = await this.ctaService.getBusPredictions(route, stopId);
            // Record in history (only if Supabase is configured)
            if (this.isSupabaseAvailable()) {
                const client = this.getWriteClient();
                if (client) {
                    const timestamp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])();
                    const error = response['bustime-response']?.error?.[0];
                    client.from('cta_history').insert({
                        route_type: 'bus',
                        route,
                        stop_id: stopId,
                        predictions: error ? null : response['bustime-response']?.prd ?? [],
                        error_message: error?.msg ?? null,
                        recorded_at: timestamp
                    }).then(({ error: insertError })=>{
                        if (insertError) this.logError('Failed to record bus prediction', insertError);
                    });
                }
            }
            return response;
        } catch (error) {
            this.logError('Error fetching bus predictions', error);
            throw error;
        }
    }
    /**
   * Get train predictions for a specific line
   */ async getTrainPredictions(line, stationId) {
        try {
            const response = await this.ctaService.getTrainPredictions(line, stationId);
            // Record in history (only if Supabase is configured)
            if (this.isSupabaseAvailable()) {
                const client = this.getWriteClient();
                if (client) {
                    const timestamp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])();
                    const hasError = response.ctatt?.errCd !== '0';
                    client.from('cta_history').insert({
                        route_type: 'train',
                        route: line,
                        station_id: stationId,
                        predictions: hasError ? null : response.ctatt?.eta ?? [],
                        error_message: hasError ? response.ctatt?.errNm : null,
                        recorded_at: timestamp
                    }).then(({ error: insertError })=>{
                        if (insertError) this.logError('Failed to record train prediction', insertError);
                    });
                }
            }
            return response;
        } catch (error) {
            this.logError('Error fetching train predictions', error);
            throw error;
        }
    }
    /**
   * Get historical CTA data for analysis
   */ async getHistory(options) {
        if (!this.isSupabaseAvailable()) {
            return [];
        }
        const client = this.getReadClient();
        if (!client) return [] // Supabase not configured
        ;
        let query = client.from('cta_history').select('*').order('recorded_at', {
            ascending: false
        });
        if (options?.route) {
            query = query.eq('route', options.route);
        }
        if (options?.routeType) {
            query = query.eq('route_type', options.routeType);
        }
        if (options?.startDate) {
            query = query.gte('recorded_at', options.startDate.toISOString());
        }
        if (options?.endDate) {
            query = query.lte('recorded_at', options.endDate.toISOString());
        }
        query = query.limit(options?.limit ?? 100);
        const { data, error } = await query;
        if (error) {
            this.logError('Error fetching CTA history', error);
            return [];
        }
        return data ?? [];
    }
}
// Export singleton instance
let ctaAdapterInstance = null;
function getCTAAdapter() {
    if (!ctaAdapterInstance) {
        ctaAdapterInstance = new CTAAdapter();
    }
    return ctaAdapterInstance;
}
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/punycode [external] (punycode, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}),
"[externals]/querystring [external] (querystring, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("querystring", () => require("querystring"));

module.exports = mod;
}),
"[externals]/node:events [external] (node:events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:events", () => require("node:events"));

module.exports = mod;
}),
"[externals]/node:process [external] (node:process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:process", () => require("node:process"));

module.exports = mod;
}),
"[externals]/node:util [external] (node:util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util", () => require("node:util"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[project]/lib/services/calendar.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarService",
    ()=>CalendarService,
    "loadCalendarTokensFromCookies",
    ()=>loadCalendarTokensFromCookies,
    "updateCalendarTokenCookies",
    ()=>updateCalendarTokenCookies
]);
/**
 * Google Calendar Service
 * Handles communication with Google Calendar API
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$googleapis$2f$build$2f$src$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/googleapis/build/src/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$token$2d$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/token-storage.ts [app-route] (ecmascript)");
;
;
;
;
async function loadCalendarTokensFromCookies(calendarService) {
    // First try file-based storage (works for cross-origin requests)
    const fileTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$token$2d$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getGoogleCalendarTokens"])();
    // Fall back to cookies if file storage is empty
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    const cookieAccessToken = cookieStore.get("google_calendar_access_token")?.value || null;
    const cookieRefreshToken = cookieStore.get("google_calendar_refresh_token")?.value || null;
    // Use file tokens if available, otherwise use cookies
    let accessToken = fileTokens.accessToken || cookieAccessToken;
    const refreshToken = fileTokens.refreshToken || cookieRefreshToken;
    // Debug logging disabled - uncomment if needed
    // console.log("[CalendarService] Loading tokens:", {
    //   fromFile: { hasAccessToken: !!fileTokens.accessToken, hasRefreshToken: !!fileTokens.refreshToken },
    //   fromCookies: { hasAccessToken: !!cookieAccessToken, hasRefreshToken: !!cookieRefreshToken },
    //   using: { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken },
    // })
    // If we have a refresh token but no access token (or access token expired), refresh it
    if (refreshToken && !accessToken) {
        // console.log("[CalendarService] Access token missing, attempting to refresh")
        try {
            // Set just the refresh token first
            calendarService.setCredentials({
                access_token: "placeholder",
                refresh_token: refreshToken
            });
            // Refresh the access token using the public method
            const updatedCredentials = await calendarService.refreshAccessToken();
            accessToken = updatedCredentials.access_token || null;
            // console.log("[CalendarService] Refresh result:", { gotAccessToken: !!accessToken })
            // Update tokens in both file storage and cookies
            if (accessToken) {
                const expiresIn = updatedCredentials.expiry_date ? new Date(updatedCredentials.expiry_date) : new Date(Date.now() + 3600 * 1000) // 1 hour fallback
                ;
                const newRefreshToken = updatedCredentials.refresh_token || refreshToken;
                // console.log("[CalendarService] Storing refreshed access token")
                // Save to file storage (for cross-origin requests)
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$token$2d$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setGoogleCalendarTokens"])({
                    access_token: accessToken,
                    refresh_token: newRefreshToken,
                    expiry_date: updatedCredentials.expiry_date
                });
                // Also save to cookies (for same-origin requests as backup)
                cookieStore.set("google_calendar_access_token", accessToken, {
                    httpOnly: true,
                    secure: ("TURBOPACK compile-time value", "development") === "production",
                    sameSite: "lax",
                    expires: expiresIn,
                    path: "/"
                });
                cookieStore.set("google_calendar_refresh_token", newRefreshToken, {
                    httpOnly: true,
                    secure: ("TURBOPACK compile-time value", "development") === "production",
                    sameSite: "lax",
                    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    path: "/"
                });
            // console.log("[CalendarService] Token refreshed successfully")
            }
        } catch (refreshError) {
            console.error("[CalendarService] Failed to refresh access token:", {
                error: refreshError?.message || refreshError,
                code: refreshError?.code
            });
            // Only clear tokens if it's an auth error (invalid_grant means refresh token is revoked)
            if (refreshError?.message?.includes("invalid_grant") || refreshError?.code === 400 || refreshError?.code === 401) {
                // console.log("[CalendarService] Clearing invalid tokens")
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$token$2d$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clearGoogleCalendarTokens"])();
                cookieStore.delete("google_calendar_refresh_token");
                cookieStore.delete("google_calendar_access_token");
                return {
                    accessToken: null,
                    refreshToken: null
                };
            }
            // For other errors, keep the refresh token (might be a temporary issue)
            return {
                accessToken: null,
                refreshToken
            };
        }
    }
    if (accessToken) {
        calendarService.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken || undefined
        });
    }
    return {
        accessToken,
        refreshToken
    };
}
async function updateCalendarTokenCookies(calendarService, originalAccessToken) {
    const currentCredentials = calendarService.getCredentials();
    // Update cookie if:
    // 1. Token was refreshed (different access token)
    // 2. We have credentials but no original token (token was refreshed proactively in loadCalendarTokensFromCookies)
    if (currentCredentials.access_token) {
        const shouldUpdate = !originalAccessToken || // No original token means it was refreshed proactively
        currentCredentials.access_token !== originalAccessToken // Token changed
        ;
        if (shouldUpdate) {
            const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
            const expiresIn = currentCredentials.expiry_date ? new Date(currentCredentials.expiry_date) : new Date(Date.now() + 3600 * 1000) // 1 hour fallback
            ;
            cookieStore.set("google_calendar_access_token", currentCredentials.access_token, {
                httpOnly: true,
                secure: ("TURBOPACK compile-time value", "development") === "production",
                sameSite: "lax",
                expires: expiresIn,
                path: "/"
            });
            // Update refresh token if it exists
            if (currentCredentials.refresh_token) {
                cookieStore.set("google_calendar_refresh_token", currentCredentials.refresh_token, {
                    httpOnly: true,
                    secure: ("TURBOPACK compile-time value", "development") === "production",
                    sameSite: "lax",
                    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    path: "/"
                });
            }
        }
    }
}
class CalendarService {
    oauth2Client;
    calendar;
    constructor(){
        if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].google.isConfigured) {
            // Use GOOGLE_REDIRECT_URI env var, or fallback to localhost
            // IMPORTANT: Private IPs (192.168.x.x, 10.x.x.x) don't work with Google OAuth
            // You must use localhost for development
            const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";
            this.oauth2Client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$googleapis$2f$build$2f$src$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["google"].auth.OAuth2(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].google.clientId, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].google.clientSecret, redirectUri);
            this.calendar = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$googleapis$2f$build$2f$src$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["google"].calendar({
                version: "v3",
                auth: this.oauth2Client
            });
        }
    }
    isConfigured() {
        return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].google.isConfigured;
    }
    /**
   * Get authorization URL
   * @param forceConsent - If true, forces consent screen to ensure refresh token is obtained
   */ getAuthUrl(forceConsent = false) {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        const scopes = [
            "https://www.googleapis.com/auth/calendar.readonly"
        ];
        const authOptions = {
            access_type: "offline",
            scope: scopes
        };
        // Force consent screen to ensure we get a refresh token
        // This is important for the first authorization
        if (forceConsent) {
            authOptions.prompt = "consent";
        }
        return this.oauth2Client.generateAuthUrl(authOptions);
    }
    /**
   * Set access token (after OAuth callback)
   */ setAccessToken(token, refreshToken) {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        this.oauth2Client.setCredentials({
            access_token: token,
            refresh_token: refreshToken
        });
    }
    /**
   * Set credentials from tokens object
   */ setCredentials(tokens) {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        // console.log("[CalendarService] Setting credentials")
        this.oauth2Client.setCredentials(tokens);
        // Ensure calendar client uses the updated credentials
        // The calendar client should automatically use the oauth2Client, but let's verify
        if (this.calendar) {
            this.calendar = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$googleapis$2f$build$2f$src$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["google"].calendar({
                version: "v3",
                auth: this.oauth2Client
            });
        }
    }
    /**
   * Get current credentials (useful for checking if token was refreshed)
   */ getCredentials() {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        return this.oauth2Client.credentials || {};
    }
    /**
   * Refresh access token using refresh token
   * Returns the new credentials if successful
   */ async refreshAccessToken() {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        if (!this.oauth2Client.credentials?.refresh_token) {
            throw new Error("No refresh token available");
        }
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        // Preserve refresh token if not returned in new credentials
        const updatedCredentials = {
            ...credentials,
            refresh_token: credentials.refresh_token || this.oauth2Client.credentials.refresh_token
        };
        this.oauth2Client.setCredentials(updatedCredentials);
        return updatedCredentials;
    }
    /**
   * Get calendar events
   */ async getEvents(calendarId = "primary", maxResults = 10) {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        try {
            const response = await this.calendar.events.list({
                calendarId,
                timeMin: new Date().toISOString(),
                maxResults,
                singleEvents: true,
                orderBy: "startTime"
            });
            return response.data.items || [];
        } catch (error) {
            // Handle token refresh if needed
            if (error.code === 401 && this.oauth2Client.credentials?.refresh_token) {
                try {
                    const { credentials } = await this.oauth2Client.refreshAccessToken();
                    // Preserve refresh token if not returned in new credentials
                    const updatedCredentials = {
                        ...credentials,
                        refresh_token: credentials.refresh_token || this.oauth2Client.credentials.refresh_token
                    };
                    this.oauth2Client.setCredentials(updatedCredentials);
                    // Retry the request
                    const response = await this.calendar.events.list({
                        calendarId,
                        timeMin: new Date().toISOString(),
                        maxResults,
                        singleEvents: true,
                        orderBy: "startTime"
                    });
                    return response.data.items || [];
                } catch (refreshError) {
                    throw new Error(`Google Calendar API error: Token refresh failed. Please re-authenticate.`);
                }
            }
            throw new Error(`Google Calendar API error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
   * Get upcoming events
   * Returns the next N upcoming events regardless of how far in the future
   */ async getUpcomingEvents(calendarId = "primary", maxResults = 10) {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        if (!this.calendar) {
            throw new Error("Calendar client not initialized");
        }
        if (!this.oauth2Client.credentials?.access_token) {
            throw new Error("No access token available. Please authenticate.");
        }
        try {
            const now = new Date();
            // Verbose logging disabled
            // console.log("[CalendarService] Fetching upcoming events:", { calendarId, maxResults })
            const response = await this.calendar.events.list({
                calendarId,
                timeMin: now.toISOString(),
                // No timeMax - get all future events
                maxResults,
                singleEvents: true,
                orderBy: "startTime",
                showDeleted: false
            });
            // Verbose logging disabled
            // console.log("[CalendarService] Got", response.data.items?.length || 0, "events")
            const events = response.data.items || [];
            // Filter out cancelled events
            const activeEvents = events.filter((e)=>e.status !== "cancelled");
            // Verbose logging disabled
            // console.log("[CalendarService] Returning", activeEvents.length, "active events")
            return activeEvents;
        } catch (error) {
            console.error("[CalendarService] Error in getUpcomingEvents:", {
                error: error.message,
                code: error.code,
                response: error.response?.data,
                hasRefreshToken: !!this.oauth2Client.credentials?.refresh_token
            });
            // Handle token refresh if needed
            if (error.code === 401 && this.oauth2Client.credentials?.refresh_token) {
                // console.log("[CalendarService] Attempting token refresh")
                try {
                    const { credentials } = await this.oauth2Client.refreshAccessToken();
                    // Preserve refresh token if not returned in new credentials
                    const updatedCredentials = {
                        ...credentials,
                        refresh_token: credentials.refresh_token || this.oauth2Client.credentials.refresh_token
                    };
                    this.oauth2Client.setCredentials(updatedCredentials);
                    // console.log("[CalendarService] Token refreshed, retrying")
                    // Retry the request
                    const now = new Date();
                    const response = await this.calendar.events.list({
                        calendarId,
                        timeMin: now.toISOString(),
                        // No timeMax - get all future events
                        maxResults,
                        singleEvents: true,
                        orderBy: "startTime"
                    });
                    const events = response.data.items || [];
                    return events.filter((e)=>e.status !== "cancelled");
                } catch (refreshError) {
                    console.error("[CalendarService] Token refresh failed:", refreshError);
                    throw new Error(`Google Calendar API error: Token refresh failed. Please re-authenticate.`);
                }
            }
            throw new Error(`Google Calendar API error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
   * Create a calendar event
   */ async createEvent(event, calendarId = "primary") {
        if (!this.isConfigured()) {
            throw new Error("Google Calendar not configured");
        }
        try {
            const response = await this.calendar.events.insert({
                calendarId,
                resource: event
            });
            return response.data;
        } catch (error) {
            throw new Error(`Google Calendar API error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
}),
"[project]/lib/adapters/calendar.adapter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarAdapter",
    ()=>CalendarAdapter,
    "getCalendarAdapter",
    ()=>getCalendarAdapter
]);
/**
 * Calendar Adapter
 * Handles Google Calendar data with event snapshots to Supabase
 * 
 * Google Calendar requires OAuth authentication, so availability depends on
 * whether the user is authenticated. Supabase cache is used as fallback.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$calendar$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/calendar.service.ts [app-route] (ecmascript)");
;
;
class CalendarAdapter extends __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAdapter"] {
    calendarService;
    defaultCalendarId = 'primary';
    constructor(debug = false){
        super({
            serviceName: 'calendar',
            debug
        });
        this.calendarService = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$calendar$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CalendarService"]();
    }
    /**
   * Check if Calendar is configured
   */ isConfigured() {
        return this.calendarService.isConfigured();
    }
    /**
   * Check if Google Calendar API is available
   * Calendar is an external API that requires OAuth - we consider it "available"
   * if the service is configured. Authentication is handled separately.
   */ async checkServiceAvailability() {
        return this.isConfigured();
    }
    /**
   * Initialize the service with tokens from cookies
   * Must be called in server context before fetching data
   */ async initializeWithTokens() {
        if (!this.isConfigured()) {
            return {
                authenticated: false
            };
        }
        const { accessToken, refreshToken } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$calendar$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loadCalendarTokensFromCookies"])(this.calendarService);
        return {
            authenticated: Boolean(accessToken || refreshToken)
        };
    }
    /**
   * Update cookies after API call (if token was refreshed)
   */ async updateCookiesIfNeeded(originalAccessToken) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$calendar$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateCalendarTokenCookies"])(this.calendarService, originalAccessToken);
    }
    /**
   * Fetch calendar events from Google API
   */ async fetchFromService() {
        if (!this.isConfigured()) {
            throw new Error('Google Calendar not configured');
        }
        const events = await this.calendarService.getUpcomingEvents(this.defaultCalendarId, 20);
        return {
            events,
            calendarId: this.defaultCalendarId
        };
    }
    /**
   * Fetch cached calendar events from Supabase
   */ async fetchFromCache() {
        const client = this.getReadClient();
        if (!client) return null // Supabase not configured
        ;
        try {
            // Get the most recent event snapshots
            // Use DISTINCT ON event_id to get the latest snapshot for each event
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await client.from('calendar_events').select('*').gte('start_time', new Date().toISOString()) // Only future events
            .order('recorded_at', {
                ascending: false
            }).limit(50);
            if (error) throw error;
            if (!data || data.length === 0) return null;
            const rows = data;
            // Deduplicate by event_id (keep most recent snapshot)
            const eventMap = new Map();
            for (const row of rows){
                if (!eventMap.has(row.event_id)) {
                    eventMap.set(row.event_id, row);
                }
            }
            // Convert to CalendarEvent array and sort by start time
            const events = Array.from(eventMap.values()).map((row)=>row.event_data).sort((a, b)=>{
                const aTime = a.start.dateTime ?? a.start.date ?? '';
                const bTime = b.start.dateTime ?? b.start.date ?? '';
                return aTime.localeCompare(bTime);
            });
            const recordedAt = rows[0]?.recorded_at ?? new Date().toISOString();
            return {
                events,
                recordedAt
            };
        } catch (error) {
            this.logError('Error fetching from cache', error);
            return null;
        }
    }
    /**
   * Write calendar events to Supabase
   */ async writeToCache(data) {
        const client = this.getWriteClient();
        if (!client) {
            return {
                success: false,
                recordsWritten: 0,
                error: 'Supabase not configured'
            };
        }
        const timestamp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCurrentTimestamp"])();
        let recordsWritten = 0;
        try {
            const inserts = data.events.map((event)=>{
                const startDateTime = event.start.dateTime;
                const endDateTime = event.end.dateTime;
                const isAllDay = !startDateTime && Boolean(event.start.date);
                return {
                    event_id: event.id,
                    calendar_id: data.calendarId,
                    summary: event.summary ?? null,
                    description: event.description ?? null,
                    location: event.location ?? null,
                    start_time: startDateTime ?? null,
                    end_time: endDateTime ?? null,
                    start_date: event.start.date ?? null,
                    end_date: event.end.date ?? null,
                    is_all_day: isAllDay,
                    status: event.status ?? null,
                    html_link: event.htmlLink ?? null,
                    attendees: event.attendees ?? null,
                    recurrence: event.recurrence ?? null,
                    event_data: event,
                    recorded_at: timestamp
                };
            });
            if (inserts.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await client.from('calendar_events').insert(inserts);
                if (error) throw error;
                recordsWritten = inserts.length;
            }
            return {
                success: true,
                recordsWritten
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logError('Error writing to cache', error);
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
   * Get upcoming calendar events
   */ async getUpcomingEvents(calendarId, maxResults = 10) {
        const targetCalendarId = calendarId ?? this.defaultCalendarId;
        const isLocal = await this.isLocal();
        if (isLocal) {
            try {
                const events = await this.calendarService.getUpcomingEvents(targetCalendarId, maxResults);
                // Write to cache in background
                if (this.isSupabaseAvailable()) {
                    this.writeToCache({
                        events,
                        calendarId: targetCalendarId
                    }).catch((err)=>this.logError('Failed to cache events', err));
                }
                return events;
            } catch (error) {
                this.logError('Error fetching events', error);
                throw error;
            }
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        if (!cached) {
            this.log('No cached events available');
            return [];
        }
        // Limit results
        return cached.events.slice(0, maxResults);
    }
    /**
   * Get events (alias for getUpcomingEvents)
   */ async getEvents(calendarId, maxResults = 10) {
        return this.getUpcomingEvents(calendarId, maxResults);
    }
    /**
   * Get simplified event data for display
   */ async getUpcomingEventsSimple(maxResults = 10) {
        const isLocal = await this.isLocal();
        if (isLocal) {
            const events = await this.getUpcomingEvents(undefined, maxResults);
            return events.map((event)=>({
                    id: event.id,
                    title: event.summary ?? 'Untitled Event',
                    description: event.description ?? null,
                    location: event.location ?? null,
                    startTime: event.start.dateTime ? new Date(event.start.dateTime) : null,
                    endTime: event.end.dateTime ? new Date(event.end.dateTime) : null,
                    isAllDay: !event.start.dateTime && Boolean(event.start.date),
                    status: event.status
                }));
        }
        // Production mode - read from cache
        const cached = await this.fetchFromCache();
        if (!cached) return [];
        return cached.events.slice(0, maxResults).map((event)=>({
                id: event.id,
                title: event.summary ?? 'Untitled Event',
                description: event.description ?? null,
                location: event.location ?? null,
                startTime: event.start.dateTime ? new Date(event.start.dateTime) : null,
                endTime: event.end.dateTime ? new Date(event.end.dateTime) : null,
                isAllDay: !event.start.dateTime && Boolean(event.start.date),
                status: event.status,
                recordedAt: cached.recordedAt
            }));
    }
    /**
   * Get today's events
   */ async getTodaysEvents() {
        const events = await this.getUpcomingEvents(undefined, 50);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return events.filter((event)=>{
            const startStr = event.start.dateTime ?? event.start.date;
            if (!startStr) return false;
            const start = new Date(startStr);
            return start >= today && start < tomorrow;
        });
    }
    /**
   * Get the next event
   */ async getNextEvent() {
        const events = await this.getUpcomingEvents(undefined, 1);
        return events[0] ?? null;
    }
    // ==========================================
    // Auth pass-through methods
    // ==========================================
    getAuthUrl(forceConsent = false) {
        return this.calendarService.getAuthUrl(forceConsent);
    }
    setCredentials(tokens) {
        this.calendarService.setCredentials(tokens);
    }
    getCredentials() {
        return this.calendarService.getCredentials();
    }
    async refreshAccessToken() {
        return this.calendarService.refreshAccessToken();
    }
}
// Export singleton instance
let calendarAdapterInstance = null;
function getCalendarAdapter() {
    if (!calendarAdapterInstance) {
        calendarAdapterInstance = new CalendarAdapter();
    }
    return calendarAdapterInstance;
}
}),
"[project]/lib/adapters/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
/**
 * Adapters Index
 * Export all adapters for easy importing
 */ // Base adapter
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
// Hue adapter
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$hue$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/hue.adapter.ts [app-route] (ecmascript)");
// Spotify adapter
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$spotify$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/spotify.adapter.ts [app-route] (ecmascript)");
// Fitness adapter
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$fitness$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/fitness.adapter.ts [app-route] (ecmascript)");
// CTA adapter
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$cta$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/cta.adapter.ts [app-route] (ecmascript)");
// Calendar adapter
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$calendar$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/calendar.adapter.ts [app-route] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/lib/utils/mode.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "areControlsEnabled",
    ()=>areControlsEnabled,
    "getDeploymentMode",
    ()=>getDeploymentMode,
    "getModeInfo",
    ()=>getModeInfo,
    "isLocalMode",
    ()=>isLocalMode,
    "isProductionMode",
    ()=>isProductionMode,
    "localModeGuard",
    ()=>localModeGuard,
    "requireLocalMode",
    ()=>requireLocalMode
]);
/**
 * Mode Detection Utilities
 * Determines whether the app is running in local or production mode
 *
 * Mode is auto-detected based on service reachability:
 * - Local mode: Local services (like Hue bridge) are reachable
 * - Production mode: Local services are not reachable, read from cache
 *
 * DEPLOYMENT_MODE env var is no longer required - mode is auto-detected.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
;
function getDeploymentMode() {
    // Check if any local service is available based on cached checks
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAnyLocalServiceAvailable"])()) {
        return 'local';
    }
    return 'production';
}
function isLocalMode() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAnyLocalServiceAvailable"])();
}
function isProductionMode() {
    return !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAnyLocalServiceAvailable"])();
}
function areControlsEnabled() {
    return isLocalMode();
}
function requireLocalMode(operation = 'This action') {
    if (!isLocalMode()) {
        throw new Error(`${operation} is only available when local services are reachable`);
    }
}
function localModeGuard() {
    if (isLocalMode()) {
        return {
            allowed: true
        };
    }
    return {
        allowed: false,
        error: 'This action is only available when local services are reachable. The web version is read-only.'
    };
}
function getModeInfo() {
    const isLocal = isLocalMode();
    const mode = isLocal ? 'local' : 'production';
    return {
        mode,
        isLocal,
        isProduction: !isLocal,
        controlsEnabled: isLocal,
        displayName: isLocal ? 'Local Mode' : 'Live View',
        description: isLocal ? 'Connected to real devices' : "Live from Pete's apartment",
        serviceStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getServiceAvailabilityStatus"])()
    };
}
}),
"[project]/app/api/spotify/player/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/utils.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/adapters/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$spotify$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/spotify.adapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$mode$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils/mode.ts [app-route] (ecmascript)");
;
;
;
;
async function GET() {
    try {
        const adapter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$spotify$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSpotifyAdapter"])();
        // In production mode (no local services), read from cache
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$mode$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isProductionMode"])()) {
            const nowPlaying = await adapter.getNowPlaying();
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["successResponse"])({
                playback: nowPlaying,
                source: 'cache',
                authenticated: false,
                authAvailable: false
            });
        }
        // Local mode - try to authenticate
        if (!adapter.isConfigured()) {
            // Not configured - return cached data if available
            try {
                const cachedPlayback = await adapter.getNowPlaying();
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["successResponse"])({
                    playback: cachedPlayback,
                    source: 'cache',
                    authenticated: false,
                    authAvailable: false,
                    message: 'Spotify not configured'
                });
            } catch  {
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["successResponse"])({
                    playback: {
                        isPlaying: false,
                        track: null,
                        progressMs: 0,
                        durationMs: 0
                    },
                    source: 'none',
                    authenticated: false,
                    authAvailable: false,
                    message: 'Spotify not configured'
                });
            }
        }
        const { authenticated } = await adapter.initializeWithTokens();
        if (!authenticated) {
            // Not authenticated in local mode - return cached data with auth prompt
            try {
                const cachedPlayback = await adapter.getNowPlaying();
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    data: {
                        playback: cachedPlayback,
                        source: 'cache',
                        authenticated: false,
                        authAvailable: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$mode$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isLocalMode"])(),
                        authUrl: '/api/spotify/auth',
                        message: 'Using cached data. Authenticate to get real-time updates.'
                    }
                });
            } catch  {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    data: {
                        playback: {
                            isPlaying: false,
                            track: null,
                            progressMs: 0,
                            durationMs: 0
                        },
                        source: 'none',
                        authenticated: false,
                        authAvailable: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$mode$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isLocalMode"])(),
                        authUrl: '/api/spotify/auth',
                        message: 'Please authenticate to access Spotify.'
                    }
                });
            }
        }
        // Authenticated - get live data
        const playbackState = await adapter.getPlaybackState();
        // Transform to consistent format
        const nowPlaying = {
            isPlaying: playbackState?.is_playing ?? false,
            track: playbackState?.item ? {
                name: playbackState.item.name,
                artist: playbackState.item.artists.map((a)=>a.name).join(', '),
                album: playbackState.item.album.name,
                imageUrl: playbackState.item.album.images[0]?.url ?? ''
            } : null,
            progressMs: playbackState?.progress_ms ?? 0,
            durationMs: playbackState?.item?.duration_ms ?? 0
        };
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["successResponse"])({
            playback: nowPlaying,
            source: 'live',
            authenticated: true,
            authAvailable: true
        });
    } catch (error) {
        console.error("[Spotify Player] Error:", error);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleApiError"])(error);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1965fd52._.js.map
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
"[project]/app/api/health/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "OPTIONS",
    ()=>OPTIONS
]);
/**
 * GET /api/health - Health check endpoint for connectivity detection
 * 
 * This endpoint is used by the client to determine if the local instance
 * is reachable. When accessible, the client can use local APIs directly.
 * 
 * The response includes:
 * - mode: 'local' if any local services are reachable, 'production' otherwise
 * - instanceId: Identifier to verify it's the correct instance
 * - services: Status of each service's availability (cached results)
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$hue$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/hue.adapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/adapters/base.adapter.ts [app-route] (ecmascript)");
;
;
;
async function GET() {
    // Trigger a Hue bridge check if not already cached
    // This is the primary indicator of "local mode" since Hue requires local network
    const hueAdapter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$hue$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getHueAdapter"])();
    // Check if Hue is reachable (this will cache the result)
    let hueAvailable = false;
    try {
        // Use the adapter's availability check
        hueAvailable = await hueAdapter['isLocalServiceAvailable']();
    } catch  {
    // Ignore errors - just means not available
    }
    // Determine mode based on service availability
    const isLocal = hueAvailable || (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAnyLocalServiceAvailable"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        ok: true,
        mode: isLocal ? "local" : "production",
        timestamp: new Date().toISOString(),
        // Include a unique identifier so the client can verify it's the right instance
        instanceId: "petehome-local",
        // Include service availability status for debugging
        services: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$adapters$2f$base$2e$adapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getServiceAvailabilityStatus"])()
    }, {
        headers: {
            // Allow cross-origin requests from production domain
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            // Prevent caching of health checks
            "Cache-Control": "no-store, no-cache, must-revalidate"
        }
    });
}
async function OPTIONS() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({}, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__548fe8ee._.js.map
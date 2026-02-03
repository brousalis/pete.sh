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
"[project]/lib/services/spotify-history.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SpotifyHistoryService",
    ()=>SpotifyHistoryService,
    "getSpotifyHistoryService",
    ()=>getSpotifyHistoryService
]);
/**
 * Spotify Listening History Service
 * Handles syncing and retrieving Spotify listening history from Supabase
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-route] (ecmascript)");
;
class SpotifyHistoryService {
    spotifyService = null;
    constructor(spotifyService){
        this.spotifyService = spotifyService || null;
    }
    /**
   * Set the authenticated Spotify service for API calls
   */ setSpotifyService(spotifyService) {
        this.spotifyService = spotifyService;
    }
    /**
   * Check if the service is configured (Supabase available)
   */ isConfigured() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isSupabaseConfigured"])();
    }
    /**
   * Get the best client for reads: service role when available (so server-side
   * reads see the same data as writes), otherwise anon. Fixes mismatch where
   * sync inserts with service role but getHistory/getTotalTrackCount used anon
   * and could see 0 rows due to RLS or missing anon policy.
   */ getReadClient() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseServiceClient"])() ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClient"])();
    }
    /**
   * Sync recent plays from Spotify API to Supabase
   * Returns the number of new tracks added
   */ async syncRecentPlays() {
        if (!this.spotifyService) {
            return {
                success: false,
                newTracks: 0,
                totalTracksInDb: 0,
                error: 'Spotify service not initialized'
            };
        }
        const serviceClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseServiceClient"])();
        if (!serviceClient) {
            return {
                success: false,
                newTracks: 0,
                totalTracksInDb: 0,
                error: 'Supabase service client not available'
            };
        }
        try {
            // Get the sync cursor to know where we left off
            const cursor = await this.getSyncCursor();
            // Fetch recent plays from Spotify (max 50)
            // Note: Spotify's recently-played endpoint only returns last 50 tracks
            const recentPlays = await this.spotifyService.getRecentlyPlayed(50);
            if (!recentPlays.items || recentPlays.items.length === 0) {
                return {
                    success: true,
                    newTracks: 0,
                    totalTracksInDb: await this.getTotalTrackCount()
                };
            }
            // Filter out tracks we've already synced
            const newTracks = cursor.last_played_at ? recentPlays.items.filter((item)=>new Date(item.played_at) > new Date(cursor.last_played_at)) : recentPlays.items;
            if (newTracks.length === 0) {
                return {
                    success: true,
                    newTracks: 0,
                    totalTracksInDb: await this.getTotalTrackCount()
                };
            }
            // Transform and insert new tracks
            const historyEntries = newTracks.map((item)=>this.transformToHistoryEntry(item));
            // Upsert to handle any potential duplicates
            const { error } = await serviceClient.from('spotify_listening_history')// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase Insert inferred as never for this table
            .upsert(historyEntries, {
                onConflict: 'track_id,played_at',
                ignoreDuplicates: true
            });
            if (error) {
                // Only log if it's not a "table doesn't exist" error (which is expected before migration)
                if (error.code !== 'PGRST205') {
                    console.error('[SpotifyHistory] Insert error:', error);
                }
                return {
                    success: false,
                    newTracks: 0,
                    totalTracksInDb: 0,
                    error: error.code === 'PGRST205' ? 'Table not found - run migration 004_spotify_listening_history.sql' : error.message
                };
            }
            // Update the sync cursor
            const newestPlayedAt = newTracks[0]?.played_at;
            if (newestPlayedAt) {
                await this.updateSyncCursor(newestPlayedAt, historyEntries.length);
            }
            const totalInDb = await this.getTotalTrackCount();
            return {
                success: true,
                newTracks: historyEntries.length,
                totalTracksInDb: totalInDb,
                oldestTrack: historyEntries[historyEntries.length - 1]?.played_at,
                newestTrack: historyEntries[0]?.played_at
            };
        } catch (error) {
            console.error('[SpotifyHistory] Sync error:', error);
            return {
                success: false,
                newTracks: 0,
                totalTracksInDb: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
   * Get listening history from Supabase
   */ async getHistory(options) {
        const client = this.getReadClient();
        if (!client) return [];
        const { limit = 50, offset = 0, startDate, endDate } = options || {};
        let query = client.from('spotify_listening_history').select('*').order('played_at', {
            ascending: false
        }).limit(limit).range(offset, offset + limit - 1);
        if (startDate) {
            query = query.gte('played_at', startDate.toISOString());
        }
        if (endDate) {
            query = query.lte('played_at', endDate.toISOString());
        }
        const { data, error } = await query;
        if (error) {
            // Don't log "table doesn't exist" errors - expected before migration
            if (error.code !== 'PGRST205') {
                console.error('[SpotifyHistory] Get history error:', error);
            }
            return [];
        }
        return data || [];
    }
    /**
   * Get listening stats for a time period
   */ async getStats(days = 30) {
        const client = this.getReadClient();
        if (!client) return null;
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);
        try {
            // Get total and unique counts
            const { data: rawData, error: historyError } = await client.from('spotify_listening_history').select('track_id, track_name, track_artists, duration_ms').gte('played_at', sinceDate.toISOString());
            if (historyError || !rawData) {
                // Don't log "table doesn't exist" errors - expected before migration
                if (historyError?.code !== 'PGRST205') {
                    console.error('[SpotifyHistory] Stats error:', historyError);
                }
                return null;
            }
            const historyData = rawData;
            // Calculate stats in memory
            const totalTracks = historyData.length;
            const uniqueTracks = new Set(historyData.map((t)=>t.track_id)).size;
            const uniqueArtists = new Set(historyData.map((t)=>t.track_artists)).size;
            const totalListeningTimeMs = historyData.reduce((sum, t)=>sum + (t.duration_ms || 0), 0);
            // Find top track
            const trackCounts = new Map();
            historyData.forEach((t)=>{
                trackCounts.set(t.track_name, (trackCounts.get(t.track_name) || 0) + 1);
            });
            let topTrack;
            let topTrackCount = 0;
            trackCounts.forEach((count, name)=>{
                if (count > topTrackCount) {
                    topTrackCount = count;
                    topTrack = name;
                }
            });
            // Find top artist
            const artistCounts = new Map();
            historyData.forEach((t)=>{
                artistCounts.set(t.track_artists, (artistCounts.get(t.track_artists) || 0) + 1);
            });
            let topArtist;
            let topArtistCount = 0;
            artistCounts.forEach((count, name)=>{
                if (count > topArtistCount) {
                    topArtistCount = count;
                    topArtist = name;
                }
            });
            return {
                total_tracks: totalTracks,
                unique_tracks: uniqueTracks,
                unique_artists: uniqueArtists,
                total_listening_time_ms: totalListeningTimeMs,
                top_track: topTrack,
                top_track_count: topTrackCount,
                top_artist: topArtist,
                top_artist_count: topArtistCount
            };
        } catch (error) {
            // Don't log "table doesn't exist" errors - expected before migration
            const pgError = error;
            if (pgError?.code !== 'PGRST205') {
                console.error('[SpotifyHistory] Stats error:', error);
            }
            return null;
        }
    }
    /**
   * Get the sync cursor
   */ async getSyncCursor() {
        const client = this.getReadClient();
        const defaultCursor = {
            id: 'default',
            last_played_at: null,
            last_sync_at: new Date().toISOString(),
            total_tracks_synced: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        if (!client) return defaultCursor;
        const { data, error } = await client.from('spotify_sync_cursor').select('*').eq('id', 'default').single();
        if (error || !data) {
            return defaultCursor;
        }
        return data;
    }
    /**
   * Update the sync cursor after successful sync
   */ async updateSyncCursor(lastPlayedAt, newTracksCount) {
        const serviceClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseServiceClient"])();
        if (!serviceClient) return;
        const cursor = await this.getSyncCursor();
        const cursorPayload = {
            id: 'default',
            last_played_at: lastPlayedAt,
            last_sync_at: new Date().toISOString(),
            total_tracks_synced: cursor.total_tracks_synced + newTracksCount,
            updated_at: new Date().toISOString()
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase Insert inferred as never for this table
        await serviceClient.from('spotify_sync_cursor').upsert(cursorPayload);
    }
    /**
   * Get total track count in the history
   */ async getTotalTrackCount() {
        const client = this.getReadClient();
        if (!client) return 0;
        const { count, error } = await client.from('spotify_listening_history').select('*', {
            count: 'exact',
            head: true
        });
        if (error) return 0;
        return count || 0;
    }
    /**
   * Transform a Spotify recent track to a history entry
   */ transformToHistoryEntry(item) {
        const track = item.track;
        return {
            track_id: track.id,
            track_uri: track.uri,
            track_name: track.name,
            track_artists: track.artists.map((a)=>a.name).join(', '),
            track_artist_ids: track.artists.map((a)=>a.id).join(', '),
            album_name: track.album.name,
            album_id: track.album.id,
            album_image_url: track.album.images?.[0]?.url ?? undefined,
            duration_ms: track.duration_ms,
            context_type: item.context?.type ?? undefined,
            context_uri: item.context?.uri ?? undefined,
            played_at: item.played_at
        };
    }
    /**
   * Get tracks grouped by day for a given time period
   */ async getHistoryByDay(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        const history = await this.getHistory({
            startDate,
            limit: 500
        });
        const byDay = new Map();
        history.forEach((entry)=>{
            const date = new Date(entry.played_at).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            if (!byDay.has(date)) {
                byDay.set(date, []);
            }
            byDay.get(date).push(entry);
        });
        return byDay;
    }
}
// Singleton instance
let historyServiceInstance = null;
function getSpotifyHistoryService() {
    if (!historyServiceInstance) {
        historyServiceInstance = new SpotifyHistoryService();
    }
    return historyServiceInstance;
}
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
"[project]/app/api/spotify/history/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "OPTIONS",
    ()=>OPTIONS
]);
/**
 * Spotify Listening History API
 * GET - Fetch listening history from Supabase
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$spotify$2d$history$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/spotify-history.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/cors.ts [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    const historyService = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$spotify$2d$history$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSpotifyHistoryService"])();
    if (!historyService.isConfigured()) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            data: {
                history: [],
                count: 0
            },
            message: "History service not configured (Supabase required)"
        }, {
            status: 200,
            headers: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CORS_HEADERS"]
        });
    }
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const history = await historyService.getHistory({
            limit: Math.min(limit, 100),
            offset,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            data: {
                history,
                count: history.length,
                offset,
                limit
            }
        }, {
            headers: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CORS_HEADERS"]
        });
    } catch (error) {
        console.error("[API] History fetch error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch history"
        }, {
            status: 500,
            headers: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CORS_HEADERS"]
        });
    }
}
async function OPTIONS() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$cors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["corsOptionsResponse"])();
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3df9e65b._.js.map
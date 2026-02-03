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
"[project]/lib/services/weather.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WeatherService",
    ()=>WeatherService
]);
/**
 * Weather Service
 * Handles communication with Weather.gov API
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-route] (ecmascript)");
;
;
class WeatherService {
    baseUrl = 'https://api.weather.gov';
    headers = {
        'User-Agent': 'petehome/1.0 (petehome@example.com)',
        Accept: 'application/geo+json'
    };
    /**
   * Get weather point for coordinates
   */ async getWeatherPoint(lat, lon) {
        try {
            // Weather.gov API requires coordinates to be rounded to 4 decimal places
            // Ensure longitude preserves negative sign
            const roundedLat = Math.round(lat * 10000) / 10000;
            const roundedLon = Math.round(lon * 10000) / 10000;
            const url = `${this.baseUrl}/points/${roundedLat},${roundedLon}`;
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(url, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                const status = error.response?.status;
                const statusText = error.response?.statusText;
                const url = error.config?.url;
                const responseData = error.response?.data;
                console.error('Weather API error details:', {
                    url,
                    status,
                    statusText,
                    responseData,
                    inputLat: lat,
                    inputLon: lon,
                    headers: error.config?.headers
                });
                throw new Error(`Weather API error: ${error.message}${status ? ` (${status} ${statusText})` : ''}${url ? ` - URL: ${url}` : ''}`);
            }
            throw error;
        }
    }
    /**
   * Get current weather conditions
   */ async getCurrentWeather(lat, lon) {
        const latitude = lat || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].weather.latitude;
        let longitude = lon || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].weather.longitude;
        // Validate and fix longitude for US locations (should be negative for most of US)
        if (latitude > 24 && latitude < 50 && longitude > 0) {
            console.warn(`Warning: Longitude is positive (${longitude}) for US location. Converting to negative.`);
            longitude = -Math.abs(longitude);
        }
        try {
            // First get the weather point
            const point = await this.getWeatherPoint(latitude, longitude);
            // Get the nearest observation station
            const stationsResponse = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(point.properties.observationStations, {
                headers: this.headers
            });
            if (!stationsResponse.data.features || stationsResponse.data.features.length === 0) {
                throw new Error('No observation stations found');
            }
            const firstFeature = stationsResponse.data.features[0];
            if (!firstFeature) {
                throw new Error('No observation stations found');
            }
            const stationId = firstFeature.properties.stationIdentifier;
            // Get latest observation
            const observationResponse = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(`${this.baseUrl}/stations/${stationId}/observations/latest`, {
                headers: this.headers
            });
            return observationResponse.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`Weather API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
   * Get 5-day weather forecast
   */ async getForecast(lat, lon) {
        const latitude = lat || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].weather.latitude;
        let longitude = lon || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["config"].weather.longitude;
        // Validate and fix longitude for US locations (should be negative for most of US)
        if (latitude > 24 && latitude < 50 && longitude > 0) {
            console.warn(`Warning: Longitude is positive (${longitude}) for US location. Converting to negative.`);
            longitude = -Math.abs(longitude);
        }
        try {
            // First get the weather point
            const point = await this.getWeatherPoint(latitude, longitude);
            // Get the forecast
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(point.properties.forecast, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(error)) {
                throw new Error(`Weather API error: ${error.message}`);
            }
            throw error;
        }
    }
}
}),
"[project]/app/api/weather/current/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/utils.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$weather$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/weather.service.ts [app-route] (ecmascript)");
;
;
const weatherService = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$weather$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WeatherService"]();
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")) : undefined;
        const lon = searchParams.get("lon") ? parseFloat(searchParams.get("lon")) : undefined;
        const current = await weatherService.getCurrentWeather(lat, lon);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["successResponse"])(current);
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleApiError"])(error);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6d961809._.js.map
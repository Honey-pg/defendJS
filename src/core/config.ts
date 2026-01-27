import { DefendJSConfig } from "./types/DefendJSConfig";

export const defaultConfig: DefendJSConfig = {
    enableHelmet: true,
    enableHPP: true,
    enableCORS: true,
    enableSanitizer: true,
    enableRateLimiter: true,
    enableValidation: true,
    enableCompression: true,
    enableCSRF: false,
    enableRequestId: true,
    
    hashing: {
        primary: "argon2",
        fallback: "bcrypt",
        saltRounds: 10,
    },
    
    rateLimiter: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
        message: "Too many requests, please try again later.",
        useAdaptiveMode: false,
    },
    
    validation: {
        mode: "zod",
        fallback: "express-validator",
    },
    
    sanitizer: {
        allowedTags: ["b", "i", "em", "strong", "a"],
        allowedAttributes: { a: ["href"] },
        fallback: 'escape',
        primary: 'sanitize-html'
    },
    
    logging: {
        enabled: true,
        level: "info",
        maxSize: 5 * 1024 * 1024,
    },
    
    auth: {
        enabled: false,
    },
    
    csrf: {
        cookieName: "_csrf",
        headerName: "x-csrf-token",
        methods: ["POST", "PUT", "PATCH", "DELETE"],
        cookieOptions: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3600 * 24
        }
    },
    
    requestId: {
        headerName: "x-request-id",
        setResponseHeader: true
    },
    
    json: { limit: '1mb' },
    urlencoded: { extended: true },
    cors: {},
    compression: {},
};
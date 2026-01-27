export interface DefendJSConfig {
    // Core security features
    enableHelmet: boolean;
    enableHPP: boolean;
    enableCORS: boolean;
    enableSanitizer: boolean;
    enableRateLimiter: boolean;
    enableValidation: boolean;
    enableCompression: boolean;
    enableCSRF: boolean;
    enableRequestId: boolean;

    // Hashing configuration
    hashing: {
        primary: "argon2" | "bcrypt";
        fallback: "bcrypt" | null;
        saltRounds: number;
    };

    // Rate limiting
    rateLimiter: {
        windowMs: number;
        maxRequests: number;
        message: string;
        useAdaptiveMode: boolean;
    };

    // Validation
    validation: {
        mode: "zod" | "express-validator";
        fallback: "express-validator" | null;
    };

    // Sanitization
    sanitizer: {
        allowedTags: string[];
        allowedAttributes: Record<string, string[]>;
        fallback: 'escape' | 'xss' | 'none';
        primary: 'sanitize-html' | 'xss';
    };

    // Logging
    logging: {
        enabled: boolean;
        level: "info" | "warn" | "error" | "debug";
        file?: string;
        maxSize?: number;
    };

    // Authentication
    auth: {
        enabled: boolean;
        jwtSecret?: string;
        jwtExpiresIn?: string | number;
        googleClientId?: string;
    };

    // Account Lockout
    lockout?: {
        enabled?: boolean;
        maxAttempts?: number;
        windowMs?: number;
        lockDurationMs?: number;
    };


    // CSRF Protection
    csrf?: {
        secret?: string;
        cookieName?: string;
        cookieOptions?: {
            httpOnly?: boolean;
            secure?: boolean;
            sameSite?: "strict" | "lax" | "none";
            maxAge?: number;
        };
        headerName?: string;
        methods?: string[];
    };

    // Request ID
    requestId?: {
        headerName?: string;
        setResponseHeader?: boolean;
    };

    // Optional parsers
    json?: object;
    urlencoded?: object;
    cors?: object;
    compression?: object;
}
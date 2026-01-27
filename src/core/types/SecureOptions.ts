import { z, ZodSchema } from 'zod';
import { ValidationChain } from 'express-validator';

export type ValidationSchema = ZodSchema | ValidationChain[];

export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: string;
    skipFailedRequests?: boolean;
    [key: string]: any;
}

export interface SanitizeOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    [key: string]: any;
}

export interface AuthOptions {
    required?: boolean;
    roles?: string[];
}

export interface CSRFOptions {
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
}

export interface RequestIdOptions {
    headerName?: string;
    setResponseHeader?: boolean;
}

export interface SecureOptions {
    cors?: boolean | object;
    rateLimit?: boolean | "strict" | "relaxed" | RateLimitOptions;
    sanitize?: boolean | SanitizeOptions;
    validate?: ValidationSchema;
    json?: boolean | object;
    auth?: boolean | AuthOptions;
    compression?: boolean | object;
    headers?: boolean | object;
    csrf?: boolean | CSRFOptions;
    requestId?: boolean | RequestIdOptions;
}
import rateLimit from "express-rate-limit";
import { logger } from "../logging";
import { AdapterError } from "../core/errors/AdapterError";

export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: any;
    skipFailedRequests?: boolean;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    [key: string]: any;
}

export class ExpressRLAdapter {
    getMiddleware(options: RateLimitOptions = {}) {
        try {
            const defaultOptions = {
                windowMs: 15 * 60 * 1000,
                max: 100,
                message: { error: "Too many requests" },
                standardHeaders: true,
                legacyHeaders: false,
                skipFailedRequests: false
            };

            const finalOptions = { ...defaultOptions, ...options };

            const limiter = rateLimit(finalOptions);

            logger.info("Express rate limiter configured", {
                adapter: "express-rate-limit",
                operation: "configure",
                windowMs: finalOptions.windowMs,
                max: finalOptions.max
            });

            return limiter;
        } catch (err: any) {
            logger.error("Express rate limiter setup failed", {
                adapter: "express-rate-limit",
                operation: "configure",
                reason: err?.message
            });

            throw new AdapterError("Express rate limiter creation failed.");
        }
    }
}

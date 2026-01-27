import { DefendJSConfig } from "../core/types/DefendJSConfig";
import { AdapterError } from "../core/errors/AdapterError";
import { logger } from "../logging";

interface RateLimiterAdapter {
    getMiddleware: (options?: any) => any;
}

export class RateLimitManager {
    private config: DefendJSConfig["rateLimiter"];
    private primaryAdapter: RateLimiterAdapter;
    private fallbackAdapter: RateLimiterAdapter | null;

    constructor(
        config: DefendJSConfig["rateLimiter"],
        primaryAdapter: RateLimiterAdapter,
        fallbackAdapter: RateLimiterAdapter | null
    ) {
        this.config = config;
        this.primaryAdapter = primaryAdapter;
        this.fallbackAdapter = fallbackAdapter;

        logger.info("RateLimitManager initialized", {
            layer: "rate-limit-manager",
            primaryConfigured: true,
            fallbackConfigured: !!fallbackAdapter
        });
    }

    middleware(opts?: { mode?: "strict" | "relaxed" | "api"; options?: any }) {
        let finalOptions: any = {};
        const mode = opts?.mode || "default";

        if (mode === "strict") {
            finalOptions = {
                windowMs: 10_000,
                max: 5,
                message: "Too many requests, please slow down."
            };
        } else if (mode === "relaxed") {
            finalOptions = {
                windowMs: 60_000,
                max: 100,
                message: "Rate limit exceeded."
            };
        } else if (mode === "api") {
            finalOptions = {
                windowMs: 15 * 60 * 1000,
                max: 100,
                message: "API rate limit exceeded."
            };
        } else {
            finalOptions = {
                windowMs: this.config.windowMs,
                max: this.config.maxRequests,
                message: this.config.message,
                standardHeaders: true,
                legacyHeaders: false
            };
        }

        if (opts?.options) {
            const allowedOverrides = [
                "message",
                "skipFailedRequests",
                "standardHeaders",
                "legacyHeaders"
            ];

            for (const key of allowedOverrides) {
                if (opts.options[key] !== undefined) {
                    finalOptions[key] = opts.options[key];
                }
            }

            const attemptedOverrides = Object.keys(opts.options).filter(
                k => !allowedOverrides.includes(k) && k !== "mode"
            );

            if (attemptedOverrides.length > 0) {
                logger.warn("Rate limit overrides ignored", {
                    layer: "rate-limit-manager",
                    operation: "configure",
                    mode,
                    ignoredOptions: attemptedOverrides
                });
            }
        }

        finalOptions.standardHeaders ??= true;
        finalOptions.legacyHeaders ??= false;

        try {
            logger.info("Rate limiting applied", {
                layer: "rate-limit-manager",
                operation: "apply",
                mode,
                windowMs: finalOptions.windowMs,
                max: finalOptions.max
            });

            return this.primaryAdapter.getMiddleware(finalOptions);

        } catch (err: any) {
            logger.warn("Primary rate limiter failed", {
                layer: "rate-limit-manager",
                operation: "apply",
                mode,
                reason: err?.message
            });

            if (!this.fallbackAdapter) {
                throw new AdapterError(
                    "Rate limiters failed; no fallback adapter configured."
                );
            }

            try {
                logger.warn("Using fallback rate limiter", {
                    layer: "rate-limit-manager",
                    operation: "fallback",
                    mode
                });

                return this.fallbackAdapter.getMiddleware(finalOptions);

            } catch (fallbackErr: any) {
                logger.error("Fallback rate limiter failed", {
                    layer: "rate-limit-manager",
                    operation: "fallback",
                    mode,
                    reason: fallbackErr?.message
                });

                throw new AdapterError(
                    "Both primary and fallback rate limiters failed."
                );
            }
        }
    }
}

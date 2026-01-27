import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { logger } from "../logging";
import { AdapterError } from "../core/errors/AdapterError";

export interface RLOptions {
    points?: number;
    duration?: number;
    message?: any;
    blockDuration?: number;
}

export class RLFlexibleAdapter {
    getMiddleware(options: RLOptions = {}) {
        try {
            const defaultOptions = {
                points: 100,
                duration: 60,
                message: "Too many requests, slow down.",
                blockDuration: 0
            };

            const finalOptions = { ...defaultOptions, ...options };

            const limiter = new RateLimiterMemory({
                points: finalOptions.points,
                duration: finalOptions.duration,
                blockDuration: finalOptions.blockDuration
            });

            
            logger.info("Rate limiter initialized", {
                adapter: "rate-limiter-flexible",
                operation: "init",
                points: finalOptions.points,
                duration: finalOptions.duration,
                blockDuration: finalOptions.blockDuration
            });

            return async (req: any, res: any, next: any) => {
                const ip = this.extractIP(req);

                try {
                    await limiter.consume(ip);
                    next();
                } catch (err: any) {
                    const rlErr = err as RateLimiterRes;

                    logger.warn("Rate limit exceeded", {
                        adapter: "rate-limiter-flexible",
                        operation: "consume",
                        ip,
                        method: req.method,
                        path: req.path,
                        retryAfterMs: rlErr.msBeforeNext
                    });

                    res.setHeader(
                        "Retry-After",
                        Math.ceil(rlErr.msBeforeNext / 1000)
                    );

                    return res.status(429).json({
                        success: false,
                        error: "RATE_LIMIT_EXCEEDED",
                        retryAfter: Math.ceil(rlErr.msBeforeNext / 1000),
                        message: finalOptions.message
                    });
                }
            };
        } catch (err: any) {
            logger.error("Rate limiter initialization failed", {
                adapter: "rate-limiter-flexible",
                operation: "init",
                reason: err?.message
            });

            throw new AdapterError("RateLimiterFlexible creation failed.");
        }
    }

    private extractIP(req: any): string {
        return (
            req.headers["x-real-ip"] ||
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.ip ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            "unknown"
        );
    }
}

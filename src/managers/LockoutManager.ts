import { DefendJSConfig } from "../core/types/DefendJSConfig";
import { LockoutAdapter, LockoutData } from "../core/types/LockoutTypes";
import { logger } from "../logging";

export interface LockStatus {
    isLocked: boolean;
    retryAfter: number; // Seconds
    remainingAttempts: number;
}

// Internal strict config type
interface LockoutConfigStrict {
    enabled: boolean;
    maxAttempts: number;
    windowMs: number;
    lockDurationMs: number;
}

export class LockoutManager {
    private adapter: LockoutAdapter;
    private config: LockoutConfigStrict;

    constructor(
        adapter: LockoutAdapter,
        config: DefendJSConfig["lockout"] = {}
    ) {
        this.adapter = adapter;

        // Apply defaults
        this.config = {
            enabled: config?.enabled ?? false,
            maxAttempts: config?.maxAttempts ?? 5,
            windowMs: config?.windowMs ?? 15 * 60 * 1000,
            lockDurationMs: config?.lockDurationMs ?? 30 * 60 * 1000
        };

        // Periodic cleanup (every 10 mins)
        if (this.config.enabled) {
            // @ts-ignore
            setInterval(async () => {
                try {
                    await this.adapter.cleanup(this.config.windowMs);
                } catch (err) {
                    logger.error("Lockout cleanup failed", { layer: "lockout-manager", error: err });
                }
            }, 10 * 60 * 1000).unref();
        }

        logger.info("LockoutManager initialized", {
            layer: "lockout-manager",
            enabled: this.config.enabled,
            maxAttempts: this.config.maxAttempts
        });
    }

    /**
     * Increment failed attempts for a key (email/username)
     */
    async increment(key: string): Promise<LockStatus> {
        if (!this.config.enabled) return { isLocked: false, retryAfter: 0, remainingAttempts: 999 };

        const now = Date.now();
        let data = (await this.adapter.get(key)) || { attempts: 0, lockUntil: null, firstFailAt: now };

        // If already locked, check if expired
        if (data.lockUntil && data.lockUntil > now) {
            return this.evaluateStatus(data);
        }

        // If lock expired, reset
        if (data.lockUntil && data.lockUntil <= now) {
            data = { attempts: 0, lockUntil: null, firstFailAt: now };
        }

        // If window expired (attempts match happened too long ago), reset
        if (now - data.firstFailAt > this.config.windowMs) {
            data = { attempts: 0, lockUntil: null, firstFailAt: now };
        }

        data.attempts++;

        // Check if should lock
        if (data.attempts >= this.config.maxAttempts) {
            data.lockUntil = now + this.config.lockDurationMs;
            logger.warn("Account locked", {
                layer: "lockout-manager",
                key,
                duration: this.config.lockDurationMs
            });
        }

        await this.adapter.set(key, data);
        return this.evaluateStatus(data);
    }

    /**
     * Check if a key is locked without incrementing
     */
    async check(key: string): Promise<LockStatus> {
        if (!this.config.enabled) return { isLocked: false, retryAfter: 0, remainingAttempts: 999 };
        const data = await this.adapter.get(key);
        return this.evaluateStatus(data);
    }

    /**
     * Reset attempts (e.g. on successful login)
     */
    async reset(key: string): Promise<void> {
        await this.adapter.delete(key);
    }

    /**
     * Helper to evaluate status from data object
     */
    private evaluateStatus(data: LockoutData | null): LockStatus {
        if (!data) return { isLocked: false, retryAfter: 0, remainingAttempts: this.config.maxAttempts };

        const now = Date.now();

        if (data.lockUntil && data.lockUntil > now) {
            return {
                isLocked: true,
                retryAfter: Math.ceil((data.lockUntil - now) / 1000),
                remainingAttempts: 0
            };
        }

        return {
            isLocked: false,
            retryAfter: 0,
            remainingAttempts: Math.max(0, this.config.maxAttempts - data.attempts)
        };
    }
}

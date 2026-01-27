import { LockoutAdapter, LockoutData } from "../core/types/LockoutTypes";
import { logger } from "../logging";

export class MemoryLockoutAdapter implements LockoutAdapter {
    private storage = new Map<string, LockoutData>();

    constructor() {
        logger.info("MemoryLockoutAdapter initialized", {
            layer: "monitor-adapter",
            type: "memory"
        });
    }

    async get(key: string): Promise<LockoutData | null> {
        return this.storage.get(key) || null;
    }

    async set(key: string, data: LockoutData): Promise<void> {
        this.storage.set(key, data);
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async cleanup(windowMs: number): Promise<void> {
        const now = Date.now();
        for (const [key, data] of this.storage.entries()) {
            // Remove if lock expired OR if attempts are stale (older than window * 2)
            if (data.lockUntil && data.lockUntil < now) {
                this.storage.delete(key);
            } else if (!data.lockUntil && (now - data.firstFailAt > (windowMs * 2))) {
                this.storage.delete(key);
            }
        }
    }
}

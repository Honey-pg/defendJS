import argon2 from "argon2";
import { AdapterError } from "../core/errors/AdapterError";
import { logger } from "../logging";

export class ArgonAdapter {
    private options?: argon2.Options;

    constructor(options?: argon2.Options) {
        this.options = options;
    }

    async hash(value: string): Promise<string> {
        try {
            return this.options
                ? await argon2.hash(value, this.options)
                : await argon2.hash(value);
        } catch (err: any) {
            logger.error("Argon2 hashing failed", {
                adapter: "argon2",
                operation: "hash",
                reason: err?.message
            });

            throw new AdapterError("Argon2 hashing failed.");
        }
    }

    async verify(value: string, hashed: string): Promise<boolean> {
        try {
            if (!hashed || typeof hashed !== "string") {
                throw new AdapterError("Invalid hash provided for verification.");
            }

            return await argon2.verify(hashed, value);
        } catch (err: any) {
            logger.error("Argon2 verify failed", {
                adapter: "argon2",
                operation: "verify",
                reason: err?.message
            });

            throw new AdapterError("Argon2 verify failed.");
        }
    }

    needsRehash(hashed: string): boolean {
        try {
            return argon2.needsRehash(hashed, this.options);
        } catch (err: any) {
            logger.error("Argon2 needsRehash check failed", {
                adapter: "argon2",
                operation: "needsRehash",
                reason: err?.message
            });
            // If we can't parse it (e.g., malformed or unsupported), assume it needs rehashing
            return true;
        }
    }
}

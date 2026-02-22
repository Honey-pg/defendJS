import bcrypt from "bcryptjs";
import { AdapterError } from "../core/errors/AdapterError";
import { logger } from "../logging";

export class BcryptAdapter {
    constructor(private saltRounds: number = 10) { }

    async hash(value: string): Promise<string> {
        try {
            if (typeof value !== "string") {
                throw new AdapterError("Value to hash must be a string.");
            }

            return await bcrypt.hash(value, this.saltRounds);
        } catch (err: any) {
            logger.error("Bcrypt hashing failed", {
                adapter: "bcrypt",
                operation: "hash",
                saltRounds: this.saltRounds,
                reason: err?.message
            });

            throw new AdapterError("Bcrypt hashing failed.");
        }
    }

    async verify(value: string, hashed: string): Promise<boolean> {
        try {
            if (typeof value !== "string") {
                throw new AdapterError("Value to verify must be a string.");
            }

            if (!hashed || typeof hashed !== "string") {
                throw new AdapterError("Invalid hashed string provided.");
            }

            return await bcrypt.compare(value, hashed);
        } catch (err: any) {
            logger.error("Bcrypt verify failed", {
                adapter: "bcrypt",
                operation: "verify",
                reason: err?.message
            });

            throw new AdapterError("Bcrypt verify failed.");
        }
    }

    needsRehash(hashed: string): boolean {
        try {
            // Extract the rounds from the bcrypt hash format: $2[a|b|y]$[rounds]$[salt][hash]
            // Example: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
            const parts = hashed.split('$');
            if (parts.length >= 4) {
                const rounds = parseInt(parts[2] as string, 10);
                if (!isNaN(rounds) && rounds === this.saltRounds) {
                    return false;
                }
            }
            return true;
        } catch (err: any) {
            logger.error("Bcrypt needsRehash check failed", {
                adapter: "bcrypt",
                operation: "needsRehash",
                reason: err?.message
            });
            // Default to true if parsing fails
            return true;
        }
    }
}

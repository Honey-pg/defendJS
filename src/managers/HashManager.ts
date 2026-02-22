import { AdapterError } from "../core/errors/AdapterError";
import { DefendJSConfig } from "../core/types/DefendJSConfig";
import { logger } from "../logging";

interface HashAdapter {
    hash(value: string): Promise<string>;
    verify(value: string, hashed: string): Promise<boolean>;
    needsRehash?(hashed: string): boolean | Promise<boolean>;
}

export interface HashResult {
    hash: string;
    algorithm: string;
    usedFallback: boolean;
}

export class HashManager {
    private config: DefendJSConfig["hashing"];
    private primaryAdapter: HashAdapter;
    private fallbackAdapter: HashAdapter | null;

    constructor(
        config: DefendJSConfig["hashing"],
        primaryAdapter: HashAdapter,
        fallbackAdapter: HashAdapter | null
    ) {
        this.config = config;
        this.primaryAdapter = primaryAdapter;
        this.fallbackAdapter = fallbackAdapter;

        logger.info("HashManager initialized", {
            layer: "hash-manager",
            primary: config.primary,
            fallbackEnabled: !!fallbackAdapter
        });
    }


    private detectAlgorithm(hashed: string): string {
        if (hashed.startsWith("$argon2")) return "argon2";
        if (
            hashed.startsWith("$2a$") ||
            hashed.startsWith("$2b$") ||
            hashed.startsWith("$2y$")
        ) {
            return "bcrypt";
        }

        throw new AdapterError("Unknown hash algorithm");
    }

    async hash(
        value: string,
        options?: { allowFallback?: boolean }
    ): Promise<HashResult> {
        try {
            const hash = await this.primaryAdapter.hash(value);

            return {
                hash,
                algorithm: this.config.primary,
                usedFallback: false
            };

        } catch (err: any) {
            logger.warn("Primary hashing failed", {
                layer: "hash-manager",
                operation: "hash",
                algorithm: this.config.primary,
                reason: err?.message
            });

            if (!options?.allowFallback || !this.fallbackAdapter) {
                throw new AdapterError(
                    `Primary hashing (${this.config.primary}) failed. Fallback not allowed.`
                );
            }

            try {
                const hash = await this.fallbackAdapter.hash(value);

                logger.warn("Hashing fallback used (security downgrade)", {
                    layer: "hash-manager",
                    operation: "hash",
                    from: this.config.primary,
                    to: this.config.fallback
                });

                return {
                    hash,
                    algorithm: this.config.fallback || "bcrypt",
                    usedFallback: true
                };

            } catch (fallbackErr: any) {
                logger.error("Fallback hashing failed", {
                    layer: "hash-manager",
                    operation: "hash",
                    from: this.config.primary,
                    to: this.config.fallback,
                    reason: fallbackErr?.message
                });

                throw new AdapterError(
                    "Both primary and fallback hashing failed."
                );
            }
        }
    }


    async verify(value: string, hashed: string): Promise<boolean> {
        const algorithm = this.detectAlgorithm(hashed);

        if (algorithm === this.config.primary) {
            return this.primaryAdapter.verify(value, hashed);
        }

        if (
            algorithm === this.config.fallback &&
            this.fallbackAdapter
        ) {
            logger.warn("Verifying legacy hash using fallback adapter", {
                layer: "hash-manager",
                operation: "verify",
                algorithm
            });

            return this.fallbackAdapter.verify(value, hashed);
        }

        throw new AdapterError(
            `No adapter configured for detected hash algorithm: ${algorithm}`
        );
    }

    async needsRehash(hashed: string): Promise<boolean> {
        if (!hashed) return true;

        try {
            const algorithm = this.detectAlgorithm(hashed);

            // If the hash algorithm doesn't match the primary, it definitely needs a rehash
            if (algorithm !== this.config.primary) {
                return true;
            }

            // Otherwise, ask the primary adapter if its own parameters have changed
            if (this.primaryAdapter.needsRehash) {
                return await this.primaryAdapter.needsRehash(hashed);
            }

            // If primary adapter cannot check needsRehash, assume false to avoid infinite rehashes
            return false;
        } catch (err) {
            // If algorithm is undetected or corrupted, it needs rehashing
            return true;
        }
    }
}

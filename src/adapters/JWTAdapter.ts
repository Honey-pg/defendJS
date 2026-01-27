import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { AdapterError } from "../core/errors/AdapterError";
import { logger } from "../logging";

export interface JWTAdapterOptions {
    secret: string;
    expiresIn?: string | number;
    algorithm?: jwt.Algorithm;
    issuer?: string;
    audience?: string | string[];
}

export interface SignOptions {
    expiresIn?: string | number;
    jti?: string;
    subject?: string;
    issuer?: string;
    audience?: string | string[];
}

export class JWTAdapter {
    private secret: string;
    private expiresIn?: string | number;
    private algorithm: jwt.Algorithm;
    private issuer?: string;
    private audience?: string | string[];

    constructor(options: JWTAdapterOptions) {
        if (!options.secret) {
            throw new AdapterError("JWT secret is required");
        }

        if (options.secret.length < 32) {
            logger.warn("Weak JWT secret detected", {
                adapter: "jwt",
                operation: "init",
                secretLength: options.secret.length
            });
        }

        this.secret = options.secret;
        this.expiresIn = options.expiresIn;
        this.algorithm = options.algorithm || "HS256";
        this.issuer = options.issuer;
        this.audience = options.audience;
    }

    sign(payload: object, options?: SignOptions) {
        try {
            const jwtOptions: jwt.SignOptions = {
                algorithm: this.algorithm,
                issuer: options?.issuer || this.issuer,
                audience: options?.audience || this.audience,
                jwtid: options?.jti || randomUUID(),
                subject: options?.subject
            };

            if (options?.expiresIn !== undefined) {
                jwtOptions.expiresIn = options.expiresIn as any;
            } else if (this.expiresIn !== undefined) {
                jwtOptions.expiresIn = this.expiresIn as any;
            }

            return jwt.sign(payload, this.secret, jwtOptions);

        } catch (err: any) {
            logger.error("JWT signing failed", {
                adapter: "jwt",
                operation: "sign",
                reason: err?.message
            });

            throw new AdapterError("JWT sign failed");
        }
    }

    verify(token: string, options?: { audience?: string | string[] }) {
        try {
            const verifyOptions: jwt.VerifyOptions = {
                algorithms: [this.algorithm],
                issuer: this.issuer,
                audience: (options?.audience || this.audience) as string
            };

            return jwt.verify(token, this.secret, verifyOptions);

        } catch (err: any) {
            logger.error("JWT verification failed", {
                adapter: "jwt",
                operation: "verify",
                reason: err?.message
            });

            if (err?.name === "TokenExpiredError") {
                throw new AdapterError("JWT token has expired");
            }

            if (err?.name === "JsonWebTokenError") {
                throw new AdapterError("Invalid JWT token");
            }

            throw new AdapterError("JWT verification failed");
        }
    }
}

import { JWTAdapter } from "../adapters/JWTAdapter";
import { GoogleAdapter } from "../adapters/GoogleAdapter";
import { AdapterError } from "../core/errors/AdapterError";
import { HttpError } from "../core/errors/HttpError";
import { Request, Response, NextFunction } from "express";
import { logger } from "../logging";

export interface AuthOptions {
    jwtSecret: string;
    jwtExpiresIn?: string | number;
    googleClientId?: string;
}

export interface ProtectOptions {
    required?: boolean;
    roles?: string[];
}

export class AuthManager {
    private jwtAdapter: JWTAdapter;
    private googleAdapter?: GoogleAdapter;

    constructor(opts: AuthOptions) {
        if (!opts.jwtSecret) {
            throw new AdapterError("jwtSecret required in AuthOptions");
        }

        if (opts.jwtSecret.length < 32) {
            logger.warn("Weak JWT secret detected", {
                layer: "auth-manager",
                operation: "init",
                secretLength: opts.jwtSecret.length
            });
        }

        logger.info("AuthManager initialized", {
            layer: "auth-manager",
            jwtExpiresIn: opts.jwtExpiresIn ?? "1d",
            googleEnabled: !!opts.googleClientId
        });

        this.jwtAdapter = new JWTAdapter({
            secret: opts.jwtSecret,
            expiresIn: opts.jwtExpiresIn ?? "1d"
        });

        if (opts.googleClientId) {
            this.googleAdapter = new GoogleAdapter(opts.googleClientId);
            logger.info("Google authentication enabled", {
                layer: "auth-manager"
            });
        }
    }

    sign(payload: object, options?: { expiresIn?: string | number; jti?: string }) {
        logger.info("JWT sign requested", {
            layer: "auth-manager",
            operation: "sign"
        });

        return this.jwtAdapter.sign(payload, options);
    }

    verify(token: string) {
        logger.info("JWT verify requested", {
            layer: "auth-manager",
            operation: "verify"
        });

        return this.jwtAdapter.verify(token);
    }

    async verifyGoogleIdToken(idToken: string) {
        if (!this.googleAdapter) {
            throw new AdapterError("GoogleAdapter not configured.");
        }

        logger.info("Google ID token verification requested", {
            layer: "auth-manager",
            operation: "google-verify"
        });

        try {
            return await this.googleAdapter.verifyIdToken(idToken);
        } catch (err: any) {
            logger.error("Google ID token verification failed", {
                layer: "auth-manager",
                operation: "google-verify",
                reason: err?.message
            });

            throw HttpError.Unauthorized("Invalid Google ID token");
        }
    }

    protect(options?: ProtectOptions) {
        const required = options?.required ?? true;
        const roles = options?.roles;

        return (req: Request, _res: Response, next: NextFunction) => {
            const header = req.headers["authorization"];

            if (!required && !header) {
                return next();
            }

            if (!header) {
                logger.warn("Authorization header missing", {
                    layer: "auth-manager",
                    operation: "protect",
                    path: req.path,
                    method: req.method
                });
                return next(HttpError.Unauthorized("Missing Authorization header"));
            }

            const [type, token] = String(header).split(" ");
            if (type !== "Bearer" || !token) {
                logger.warn("Invalid Authorization header format", {
                    layer: "auth-manager",
                    operation: "protect",
                    path: req.path,
                    method: req.method
                });
                return next(HttpError.Unauthorized("Invalid Authorization header"));
            }

            try {
                const decoded = this.verify(token);

                (req as any).auth = decoded;
                (req as any).user = decoded;

                if (roles && roles.length > 0) {
                    const userRole =
                        (decoded as any).role || (decoded as any).roles?.[0];

                    if (!userRole || !roles.includes(userRole)) {
                        logger.warn("Access denied: insufficient role", {
                            layer: "auth-manager",
                            operation: "authorize",
                            path: req.path,
                            requiredRoles: roles,
                            userRole
                        });

                        return next(HttpError.Forbidden("Insufficient permissions"));
                    }
                }

                return next();
            } catch (err: any) {
                logger.error("JWT authentication failed", {
                    layer: "auth-manager",
                    operation: "protect",
                    path: req.path,
                    method: req.method,
                    reason: err?.message
                });

                return next(HttpError.Unauthorized("Invalid or expired token"));
            }
        };
    }
}

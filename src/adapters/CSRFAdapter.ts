import { randomBytes } from "crypto";
import { AdapterError } from "../core/errors/AdapterError";
import { logger } from "../logging";
import { Request, Response, NextFunction } from "express";

export interface CSRFAdapterOptions {
    secret?: string;
    cookieName?: string;
    cookieOptions?: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
        maxAge?: number;
    };
    headerName?: string;
    methods?: string[];
}

export class CSRFAdapter {
    private secret: string;
    private cookieName: string;
    private cookieOptions: Required<CSRFAdapterOptions["cookieOptions"]>;
    private headerName: string;
    private methods: string[];

    constructor(options: CSRFAdapterOptions = {}) {
        this.secret = options.secret || randomBytes(32).toString("hex");
        this.cookieName = options.cookieName || "_csrf";
        this.headerName = options.headerName || "x-csrf-token";
        this.methods = options.methods || ["POST", "PUT", "PATCH", "DELETE"];

        this.cookieOptions = {
            httpOnly: options.cookieOptions?.httpOnly ?? true,
            secure: options.cookieOptions?.secure ?? process.env.NODE_ENV === "production",
            sameSite: options.cookieOptions?.sameSite ?? "strict",
            maxAge: options.cookieOptions?.maxAge ?? 3600 * 24 // 24 hours
        };

        logger.info("CSRFAdapter initialized", {
            adapter: "csrf",
            operation: "init",
            cookieName: this.cookieName,
            headerName: this.headerName,
            methods: this.methods
        });
    }

    private generateToken(): string {
        return randomBytes(32).toString("hex");
    }

    private getTokenFromRequest(req: Request): string | null {
        // Check header first
        const headerToken = req.headers[this.headerName.toLowerCase()] as string;
        if (headerToken) return headerToken;

        // Check body
        const bodyToken = (req.body && req.body._csrf) || req.body?.csrfToken;
        if (bodyToken) return bodyToken;

        // Check query parameter
        const queryToken = req.query._csrf || req.query.csrfToken;
        if (queryToken) return String(queryToken);

        return null;
    }

    private getTokenFromCookie(req: Request): string | null {
        // Try to get from cookies if cookie-parser is used
        if (req.cookies && req.cookies[this.cookieName]) {
            return req.cookies[this.cookieName];
        }
        
        // Fallback: parse cookie header manually if cookie-parser not available
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
                const [key, value] = cookie.trim().split('=');
                if (key && value) acc[key] = decodeURIComponent(value);
                return acc;
            }, {});
            return cookies[this.cookieName] || null;
        }
        
        return null;
    }

    middleware(options?: CSRFAdapterOptions) {
        const finalOptions = {
            secret: options?.secret || this.secret,
            cookieName: options?.cookieName || this.cookieName,
            cookieOptions: { ...this.cookieOptions, ...options?.cookieOptions },
            headerName: options?.headerName || this.headerName,
            methods: options?.methods || this.methods
        };

        return (req: Request, res: Response, next: NextFunction) => {
            try {
                // Skip CSRF check for safe methods
                if (!finalOptions.methods.includes(req.method)) {
                    return next();
                }

                // Generate and set CSRF token cookie if not present
                let csrfToken = this.getTokenFromCookie(req);
                if (!csrfToken) {
                    csrfToken = this.generateToken();
                    
                    // Set cookie if cookie-parser is available
                    if (typeof res.cookie === 'function') {
                        res.cookie(finalOptions.cookieName, csrfToken, {
                            ...finalOptions.cookieOptions,
                            path: "/"
                        });
                    } else {
                        // Fallback: set cookie header manually if cookie-parser not available
                        const cookieValue = `${finalOptions.cookieName}=${csrfToken}; Path=/; ${finalOptions.cookieOptions.httpOnly ? 'HttpOnly; ' : ''}${finalOptions.cookieOptions.secure ? 'Secure; ' : ''}SameSite=${finalOptions.cookieOptions.sameSite}; Max-Age=${finalOptions.cookieOptions.maxAge}`;
                        res.setHeader('Set-Cookie', cookieValue);
                    }

                    logger.info("CSRF token generated", {
                        adapter: "csrf",
                        operation: "generate",
                        path: req.path
                    });
                }

                // Attach token to response locals for templates
                res.locals.csrfToken = csrfToken;

                // Verify CSRF token for state-changing methods
                const providedToken = this.getTokenFromRequest(req);

                if (!providedToken) {
                    logger.warn("CSRF token missing", {
                        adapter: "csrf",
                        operation: "verify",
                        path: req.path,
                        method: req.method
                    });

                    return next(new AdapterError("CSRF token missing"));
                }

                if (providedToken !== csrfToken) {
                    logger.warn("CSRF token mismatch", {
                        adapter: "csrf",
                        operation: "verify",
                        path: req.path,
                        method: req.method
                    });

                    return next(new AdapterError("Invalid CSRF token"));
                }

                logger.info("CSRF token verified", {
                    adapter: "csrf",
                    operation: "verify",
                    path: req.path,
                    method: req.method
                });

                next();
            } catch (err: any) {
                logger.error("CSRF middleware failed", {
                    adapter: "csrf",
                    operation: "middleware",
                    reason: err?.message
                });

                next(new AdapterError("CSRF protection failed"));
            }
        };
    }

    getToken(req: Request): string {
        return this.getTokenFromCookie(req) || this.generateToken();
    }
}


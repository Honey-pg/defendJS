import sanitizeHtml from "sanitize-html";
import { AdapterError } from "../core/errors/AdapterError";
import { logger } from "../logging";

export class SanitizeHtmlAdapter {
    private globalOptions: sanitizeHtml.IOptions;

    constructor(options: sanitizeHtml.IOptions = {}) {
        this.globalOptions = options;
    }

    sanitize(input: string, dynamicOptions?: any): string {
        try {
            const opts = { ...this.globalOptions, ...(dynamicOptions || {}) };
            const clean = sanitizeHtml(input, opts);

            return typeof clean === "string" ? clean : String(clean);

        } catch (err: any) {
            logger.error("HTML sanitization failed", {
                adapter: "sanitize-html",
                operation: "sanitize",
                reason: err?.message
            });

            throw new AdapterError("sanitize-html adapter failed.");
        }
    }

    // Deep Sanitization - recursively
    private deepSanitize(obj: any, dynamicOptions?: any, visited = new WeakSet()): any {
        if (obj && typeof obj === "object") {
            if (visited.has(obj)) return obj;
            visited.add(obj);
        }

        if (typeof obj === "string") {
            return this.sanitize(obj, dynamicOptions);
        }

        if (Array.isArray(obj)) {
            return obj.map(item =>
                this.deepSanitize(item, dynamicOptions, visited)
            );
        }

        if (obj && typeof obj === "object") {
            const result: any = {};
            for (const key of Object.keys(obj)) {
                result[key] = this.deepSanitize(
                    obj[key],
                    dynamicOptions,
                    visited
                );
            }
            return result;
        }

        return obj;
    }

    middleware(dynamicOptions?: any) {
        return (req: any, _res: any, next: any) => {
            try {
                if (req.body) {
                    req.body = this.deepSanitize(req.body, dynamicOptions);

                    
                    logger.info("HTML sanitization applied", {
                        adapter: "sanitize-html",
                        operation: "middleware",
                        keys: Object.keys(req.body)
                    });
                }

                next();
            } catch (err: any) {
                logger.error("HTML sanitization middleware failed", {
                    adapter: "sanitize-html",
                    operation: "middleware",
                    reason: err?.message
                });

                next(err);
            }
        };
    }
}

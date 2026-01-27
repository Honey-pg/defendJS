import cors from "cors";
import { logger } from "../logging";
import { AdapterError } from "../core/errors/AdapterError";

export class CorsManager {
    middleware(options?: any) {
        try {
            const defaultOptions = {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                allowedHeaders: ["Content-Type", "Authorization"],
                credentials: false,
                maxAge: 86400
            };

            const finalOptions = options
                ? { ...defaultOptions, ...options }
                : defaultOptions;

            
            logger.info("CORS middleware configured", {
                layer: "cors-manager",
                operation: "init",
                origin: finalOptions.origin,
                methods: finalOptions.methods,
                credentials: finalOptions.credentials
            });

            return cors(finalOptions);

        } catch (err: any) {
            logger.error("CORS middleware initialization failed", {
                layer: "cors-manager",
                operation: "init",
                reason: err?.message
            });

            throw new AdapterError("CORS middleware initialization failed.");
        }
    }
}

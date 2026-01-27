import { Request, Response, NextFunction } from "express";
import { logger } from "../logging";

import { AdapterError } from "../core/errors/AdapterError.js";
import { ValidationError } from "../core/errors/ValidationError.js";
import { SanitizerError } from "../core/errors/SanitizerError.js";
import { SecurityError } from "../core/errors/SecurityError.js";
import { HttpError } from "../core/errors/HttpError.js";

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    const message =
        typeof err === "string"
            ? err
            : err?.message || "Unknown error";

    const stack =
        err instanceof Error && err.stack
            ? err.stack.split("\n").slice(0, 2).join(" | ")
            : undefined;

    
    logger.error("DefendJS Error", {
        type: err?.name || "UnknownError",
        message,
        status: err?.status,
        code: err?.code,
        path: req.path,
        method: req.method,
        stack,
        raw: err,
    });

    // 1. HttpError (developer thrown)
    if (err instanceof HttpError) {
        return res.status(err.status).json({
            success: false,
            error: err.code,
            message: err.message,
            details: err.details || undefined,
        });
    }

    // 2. Validation Errors
    if (err instanceof ValidationError) {
        return res.status(400).json({
            success: false,
            error: "VALIDATION_ERROR",
            message,
        });
    }

    // 3. Sanitizer Errors
    if (err instanceof SanitizerError) {
        return res.status(400).json({
            success: false,
            error: "SANITIZER_ERROR",
            message,
        });
    }

    // 4. Adapter Errors - hashing, rate-limit, sanitizer, validator
    if (err instanceof AdapterError) {
        return res.status(500).json({
            success: false,
            error: "ADAPTER_ERROR",
            message,
        });
    }

    // 5. Security Errors (internal library security logic)
    if (err instanceof SecurityError) {
        return res.status(500).json({
            success: false,
            error: "SECURITY_ERROR",
            message,
        });
    }

    // 6. Fallback - Unexpected
    return res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred in DefendJS.",
    });
}

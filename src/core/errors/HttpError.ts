export class HttpError extends Error {
    status: number;
    code?: string;
    details?: any;

    constructor(
        status: number,
        message: string,
        options?: { code?:string; details?: any }
    ) {
        super(message);
        this.status = status;
        this.code = options?.code as string;
        this.details = options?.details;
        this.name = "HttpError";
    }

    // ---------- STATIC HELPERS ----------
    static BadRequest(message = "Bad Request", details?: any) {
        return new HttpError(400, message, { code: "BAD_REQUEST", details });
    }

    static Unauthorized(message = "Unauthorized", details?: any) {
        return new HttpError(401, message, { code: "UNAUTHORIZED", details });
    }

    static Forbidden(message = "Forbidden", details?: any) {
        return new HttpError(403, message, { code: "FORBIDDEN", details });
    }

    static NotFound(message = "Not Found", details?: any) {
        return new HttpError(404, message, { code: "NOT_FOUND", details });
    }

    static Conflict(message = "Conflict", details?: any) {
        return new HttpError(409, message, { code: "CONFLICT", details });
    }

    static TooManyRequests(message = "Too Many Requests", details?: any) {
        return new HttpError(429, message, { code: "RATE_LIMIT", details });
    }

    static Internal(message = "Internal Server Error", details?: any) {
        return new HttpError(500, message, { code: "INTERNAL_ERROR", details });
    }
}

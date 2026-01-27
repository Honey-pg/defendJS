import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import { logger } from "../logging";

export interface RequestIdOptions {
    headerName?: string;
    generateId?: () => string;
    setResponseHeader?: boolean;
}

export class RequestIdManager {
    private headerName: string;
    private generateId: () => string;
    private setResponseHeader: boolean;

    constructor(options: RequestIdOptions = {}) {
        this.headerName = options.headerName || "x-request-id";
        this.generateId = options.generateId || (() => randomUUID());
        this.setResponseHeader = options.setResponseHeader ?? true;

        logger.info("RequestIdManager initialized", {
            layer: "request-id-manager",
            headerName: this.headerName
        });
    }

    middleware(options?: RequestIdOptions) {
        const headerName = options?.headerName || this.headerName;
        const generateId = options?.generateId || this.generateId;
        const setResponseHeader = options?.setResponseHeader ?? this.setResponseHeader;

        return (req: Request, res: Response, next: NextFunction) => {
            try {
                // Get request ID from header or generate new one
                const requestId = (req.headers[headerName.toLowerCase()] as string) || generateId();

                // Attach to request
                (req as any).id = requestId;
                (req as any).requestId = requestId;

                // Set response header if enabled
                if (setResponseHeader) {
                    res.setHeader(headerName, requestId);
                }

                // Add to response locals for logging
                res.locals.requestId = requestId;

                logger.info("Request ID assigned", {
                    layer: "request-id-manager",
                    operation: "assign",
                    requestId,
                    path: req.path,
                    method: req.method
                });

                next();
            } catch (err: any) {
                logger.error("Request ID middleware failed", {
                    layer: "request-id-manager",
                    operation: "middleware",
                    reason: err?.message
                });

                // Don't fail the request if ID generation fails
                next();
            }
        };
    }
}


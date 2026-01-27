import { CSRFAdapter, CSRFAdapterOptions } from "../adapters/CSRFAdapter";
import { logger } from "../logging";
import { Request, Response, NextFunction } from "express";

export class CSRFManager {
    private csrfAdapter: CSRFAdapter;

    constructor(options?: CSRFAdapterOptions) {
        this.csrfAdapter = new CSRFAdapter(options);

        logger.info("CSRFManager initialized", {
            layer: "csrf-manager"
        });
    }

    middleware(options?: CSRFAdapterOptions) {
        return this.csrfAdapter.middleware(options);
    }

    getToken(req: Request): string {
        return this.csrfAdapter.getToken(req);
    }
}


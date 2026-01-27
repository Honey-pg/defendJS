import express from "express";
import qs from "qs";
import { logger } from "../logging";
import { AdapterError } from "../core/errors/AdapterError";

export class JsonManager {
    middleware(options?: any) {
        try {
            const defaultOptions = {
                limit: "1mb",
                inflate: true,
                strict: true
            };

            const finalOptions = { ...defaultOptions, ...(options || {}) };

            logger.info("JSON body parser configured", {
                layer: "json-manager",
                operation: "json",
                limit: finalOptions.limit,
                strict: finalOptions.strict
            });

            return express.json(finalOptions);

        } catch (err: any) {
            logger.error("JSON body parser initialization failed", {
                layer: "json-manager",
                operation: "json",
                reason: err?.message
            });

            throw new AdapterError("JSON parser initialization failed.");
        }
    }

    urlencoded(options?: any) {
        try {
            const defaultOptions = {
                extended: true,
                limit: "1mb",
                parameterLimit: 1000
            };

            const finalOptions = { ...defaultOptions, ...(options || {}) };

            logger.info("URL-encoded parser configured", {
                layer: "json-manager",
                operation: "urlencoded",
                limit: finalOptions.limit,
                parameterLimit: finalOptions.parameterLimit
            });

            return express.urlencoded(finalOptions);

        } catch (err: any) {
            logger.error("URL-encoded parser initialization failed", {
                layer: "json-manager",
                operation: "urlencoded",
                reason: err?.message
            });

            throw new AdapterError("URL-encoded parser initialization failed.");
        }
    }

    queryParser(options?: any) {
        return (req: any, _res: any, next: any) => {
            try {
                if (!req.parsedQuery && req.url.includes("?")) {
                    const queryString = req.url.split("?")[1] || "";

                    const parsed = qs.parse(queryString, {
                        depth: 5,
                        parameterLimit: 100,
                        ...options
                    });

                    req.parsedQuery = parsed;

                    
                    logger.info("Query parameters parsed", {
                        layer: "json-manager",
                        operation: "query-parse",
                        keyCount: Object.keys(parsed).length
                    });
                }

                next();
            } catch (err: any) {
                logger.error("Query parsing failed", {
                    layer: "json-manager",
                    operation: "query-parse",
                    reason: err?.message
                });

                next(new AdapterError("Query parsing failed."));
            }
        };
    }
}

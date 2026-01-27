import { logger } from "../logging";
import { ValidationError } from "../core/errors/ValidationError";

interface ValidatorAdapter {
    validate: (schema?: any) => any;
}

export class ValidatorManager {
    private zodAdapter: ValidatorAdapter;
    private expressAdapter: ValidatorAdapter;

    constructor(zodAdapter: ValidatorAdapter, expressAdapter: ValidatorAdapter) {
        this.zodAdapter = zodAdapter;
        this.expressAdapter = expressAdapter;

        logger.info("ValidatorManager initialized", {
            layer: "validator-manager",
            adapters: ["zod", "express-validator"]
        });
    }

    validate(schema?: any) {
        const isZod =
            schema &&
            typeof schema === "object" &&
            typeof schema._def === "object" &&
            typeof schema.safeParse === "function";

        const isExpressValidator = Array.isArray(schema);

        return (req: any, res: any, next: any) => {
            let middleware;
            let adapterUsed: "zod" | "express-validator" | "none" = "none";

            if (isZod) {
                adapterUsed = "zod";
                middleware = this.zodAdapter.validate(schema);
            } else if (isExpressValidator) {
                adapterUsed = "express-validator";
                middleware = this.expressAdapter.validate(schema);
            } else {
                return next();
            }

            logger.info("Validation adapter selected", {
                layer: "validator-manager",
                operation: "select",
                adapter: adapterUsed,
                path: req.path,
                method: req.method
            });

            // CASE 1 — express-validator returns ARRAY
            if (Array.isArray(middleware)) {
                let idx = 0;

                const run = (err?: any) => {
                    if (err) return next(err);

                    const fn = middleware[idx++];
                    if (!fn) return next();

                    try {
                        fn(req, res, run);
                    } catch (error: any) {
                        logger.error("Validation middleware execution failed", {
                            layer: "validator-manager",
                            operation: "execute",
                            adapter: adapterUsed,
                            reason: error?.message
                        });

                        next(new ValidationError(error.message));
                    }
                };

                return run();
            }

            // CASE 2 — Zod returns SINGLE middleware
            try {
                middleware(req, res, (err?: any) => {
                    if (err) return next(err);
                    next();
                });
            } catch (err: any) {
                logger.error("Validation middleware execution failed", {
                    layer: "validator-manager",
                    operation: "execute",
                    adapter: adapterUsed,
                    reason: err?.message
                });

                next(new ValidationError(err.message));
            }
        };
    }
}

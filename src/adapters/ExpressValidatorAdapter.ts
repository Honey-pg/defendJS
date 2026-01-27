import { validationResult } from "express-validator";
import { ValidationError } from "../core/errors/ValidationError";
import { logger } from "../logging";

export class ExpressValidatorAdapter {
    private globalSchema?: any[];

    constructor(globalSchema?: any[]) {
        this.globalSchema = globalSchema;
    }

    validate(dynamicSchema?: any[]) {
        const schema = dynamicSchema || this.globalSchema;

        if (!schema || !Array.isArray(schema)) {
            return (req: any, res: any, next: any) => next();
        }

        return [
            ...schema,

            (req: any, res: any, next: any) => {
                const errors = validationResult(req);

                if (!errors.isEmpty()) {
                    const formattedErrors = errors.array().map(err => ({
                        message: err.msg,
                        field: err.type
                    }));

                    logger.warn("Request validation failed", {
                        adapter: "express-validator",
                        operation: "validate",
                        method: req.method,
                        path: req.path,
                        errorCount: formattedErrors.length,
                        errors: formattedErrors,
                        bodyPreview: req.body
                            ? JSON.stringify(req.body).slice(0, 150)
                            : undefined
                    });

                    return next(
                        new ValidationError("Validation failed.", formattedErrors as any)
                    );
                }

                next();
            }
        ];
    }
}

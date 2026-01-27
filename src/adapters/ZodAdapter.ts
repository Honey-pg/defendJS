import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../core/errors/ValidationError";
import { logger } from "../logging";

export class ZodAdapter {
    private globalSchema?: ZodSchema;

    constructor(globalSchema?: ZodSchema) {
        this.globalSchema = globalSchema;
    }

    validate(dynamicSchema?: ZodSchema) {
        return (req: any, _res: any, next: any) => {
            const schema = dynamicSchema || this.globalSchema;
            if (!schema) return next();

            const result = schema.safeParse(req.body);
            if (result.success) return next();

            const zodErr: ZodError = result.error;

            const issues = zodErr.issues.map(issue => ({
                message: issue.message,
                path: issue.path.join("."),
                code: issue.code
            }));

            logger.warn("Zod validation failed", {
                adapter: "zod",
                operation: "validate",
                method: req.method,
                path: req.path,
                issueCount: issues.length,
                issues
            });

            return next(
                new ValidationError("Validation failed.", issues as any)
            );
        };
    }
}

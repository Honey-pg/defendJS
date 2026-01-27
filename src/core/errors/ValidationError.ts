import { ERROR_CODES } from "../constants.js";

export class ValidationError extends Error {
    code: string;

    constructor(message: string, code: string = ERROR_CODES.VALIDATION_ERROR) {
        super(message);
        this.code = code;
        this.name = "ValidationError";

        Error.captureStackTrace?.(this, ValidationError);
    }
}

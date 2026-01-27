import { ERROR_CODES } from "../constants.js";

export class SecurityError extends Error {
    code: string;

    constructor(message: string, code: string = ERROR_CODES.CONFIG_ERROR) {
        super(message);
        this.code = code;
        this.name = "SecurityError";

        Error.captureStackTrace?.(this, SecurityError);
    }
}

import { ERROR_CODES } from "../constants.js";

export class SanitizerError extends Error {
    code: string;

    constructor(message: string, code: string = ERROR_CODES.SANITIZER_ERROR) {
        super(message);
        this.code = code;
        this.name = "SanitizerError";

        Error.captureStackTrace?.(this, SanitizerError);
    }
}

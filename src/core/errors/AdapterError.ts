import { ERROR_CODES } from "../constants.js";

export class AdapterError extends Error {
    code: string;

    constructor(message: string, code: string = ERROR_CODES.ADAPTER_FAILURE) {
        super(message);
        this.code = code;
        this.name = "AdapterError";

        // stack trace properly
        Error.captureStackTrace?.(this, AdapterError);
    }
}

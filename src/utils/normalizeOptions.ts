import { 
    SecureOptions,
    AuthOptions,       
    RateLimitOptions,   
    SanitizeOptions     
} from "../core/types/SecureOptions.js";

export interface NormalizedOptions {
    cors: { enabled: boolean; options?: object };
    rateLimit: { enabled: boolean; mode?: "strict" | "relaxed"; options?: RateLimitOptions };
    sanitize: { enabled: boolean; options?: SanitizeOptions };
    validate: { enabled: boolean; schema?: any };
    json: { enabled: boolean; options?: object };
    auth: { enabled: boolean; required: boolean; roles?: string[] };
    compression: { enabled: boolean; options?: object };
}

export function normalizeOptions(input?: SecureOptions | false): NormalizedOptions {
    if (input === false) {
        return {
            cors: { enabled: false },
            rateLimit: { enabled: false },
            sanitize: { enabled: false },
            validate: { enabled: false },
            json: { enabled: false },
            auth: { enabled: false, required: false },
            compression: { enabled: false }
        };
    }

    const opts = input || {};

    return {
        cors: {
            enabled: opts.cors === undefined ? true : opts.cors !== false,
            options: typeof opts.cors === "object" ? opts.cors : undefined
        },

        rateLimit: normalizeRateLimit(opts.rateLimit),

        sanitize: {
            enabled: opts.sanitize === undefined ? true : opts.sanitize !== false,
            options: typeof opts.sanitize === "object" ? opts.sanitize : undefined
        },

        // validate: {
        //     enabled: !!opts.validate,
        //     schema: opts.validate || undefined
        // },

        validate: {
    enabled: opts.validate !== undefined,
    schema: opts.validate
},


        json: {
            enabled: opts.json === undefined ? true : opts.json !== false,
            options: typeof opts.json === "object" ? opts.json : undefined
        },

        auth: normalizeAuth(opts.auth),

        compression: {
            enabled: opts.compression === undefined ? true : opts.compression !== false,
            options: typeof opts.compression === "object" ? opts.compression : undefined
        }
    };
}

function normalizeRateLimit(value: SecureOptions["rateLimit"]): NormalizedOptions["rateLimit"] {
    if (value === false) return { enabled: false };
    
    if (value === "strict") {
        return {
            enabled: true,
            mode: "strict",
            options: { max: 5, windowMs: 10000 }
        };
    }
    
    if (value === "relaxed") {
        return {
            enabled: true,
            mode: "relaxed",
            options: { max: 100, windowMs: 60000 }
        };
    }
    
    if (typeof value === "object") {
        const val = value as RateLimitOptions;
        const { mode, ...options } = val;
        return {
            enabled: true,
            mode: (mode === "strict" || mode === "relaxed") ? mode : undefined,
            options
        };
    }
    
    return { enabled: true };
}

function normalizeAuth(value: SecureOptions["auth"]): NormalizedOptions["auth"] {

    // if (value === false) {
    //     return { enabled: false, required: false };
    // }
    
    // if (value === true || value === undefined) {
    //     return { enabled: true, required: true };
    // }


    if (value === undefined) {
    return { enabled: false, required: false };
}
if (value === true) {
    return { enabled: true, required: true };
}

    
    const authOptions = value as AuthOptions;
    const enabled = authOptions.required !== false;
    
    return {
        enabled,
        required: enabled,
        roles: authOptions.roles
    };
}

export function getPresetOptions(preset: 'api' | 'strict' | 'public'): NormalizedOptions {
    const presets = {
        api: {
            cors: { enabled: true, options: { origin: '*' } },
            rateLimit: { enabled: true, mode: 'relaxed' as const },
            sanitize: { enabled: true },
            validate: { enabled: false },
            json: { enabled: true },
            auth: { enabled: false, required: false },
            compression: { enabled: true }
        },
        strict: {
            cors: { enabled: true, options: { origin: process.env.ALLOWED_ORIGIN || '*' } },
            rateLimit: { enabled: true, mode: 'strict' as const },
            sanitize: { enabled: true },
            validate: { enabled: true },
            json: { enabled: true },
            auth: { enabled: true, required: true },
            compression: { enabled: true }
        },
        public: {
            cors: { enabled: true, options: { origin: '*' } },
            rateLimit: { enabled: true },
            sanitize: { enabled: false },
            validate: { enabled: false },
            json: { enabled: true },
            auth: { enabled: false, required: false },
            compression: { enabled: true }
        }
    };
    
    return presets[preset] || presets.api;
}
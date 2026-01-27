import { DefendJS } from "./DefendJS.js";
import { SecureOptions } from "./types/SecureOptions.js";

/**
 * @deprecated Use DefendJS.middleware() or fluent API instead
 */

export function useSecure(options?: SecureOptions | "api" | "strict" | "public") {
    console.warn("useSecure() is deprecated. Use DefendJS.middleware() or fluent API methods.");
    return DefendJS.middleware(options);
}


//  Legacy support - route-level security

export function secureRoute(options?: SecureOptions) {
    const chain: any[] = [];
    
    if (options?.cors) {
        chain.push(DefendJS.cors(
            typeof options.cors === 'object' ? options.cors : undefined
        ));
    }
    
    if (options?.rateLimit) {
        chain.push(DefendJS.rateLimit(
            typeof options.rateLimit === 'object' ? options.rateLimit : 
            options.rateLimit === "strict" ? "strict" : "relaxed"
        ));
    }
    
    if (options?.sanitize) {
        chain.push(DefendJS.sanitize(
            typeof options.sanitize === 'object' ? options.sanitize : undefined
        ));
    }
    
    if (options?.validate) {
        chain.push(DefendJS.validate(options.validate));
    }
    
    if (options?.auth) {
        chain.push(DefendJS.auth(
            typeof options.auth === 'object' ? options.auth : undefined
        ));
    }
    
    if (options?.csrf) {
        chain.push(DefendJS.csrf(
            typeof options.csrf === 'object' ? options.csrf : undefined
        ));
    }
    
    if (options?.requestId) {
        chain.push(DefendJS.requestId(
            typeof options.requestId === 'object' ? options.requestId : undefined
        ));
    }
    
    return chain;
}



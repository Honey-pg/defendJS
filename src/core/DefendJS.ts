import { DefendJSConfig } from "./types/DefendJSConfig.js";
import { defaultConfig } from "./config.js";
import { LIB_NAME, LIB_VERSION } from "./constants.js";
import { deepMerge } from "../utils/deepMerge.js";
import { deepFreeze } from "../utils/deepFreeze.js";
import { logger } from "../logging";

// Adapters
import { ArgonAdapter } from "../adapters/ArgonAdapter.js";
import { BcryptAdapter } from "../adapters/BcryptAdapter.js";
import { RLFlexibleAdapter } from "../adapters/RLFlexibleAdapter.js";
import { ExpressRLAdapter } from "../adapters/ExpressRLAdapter.js";
import { ZodAdapter } from "../adapters/ZodAdapter.js";
import { ExpressValidatorAdapter } from "../adapters/ExpressValidatorAdapter.js";
import { SanitizeHtmlAdapter } from "../adapters/SanitizeHtmlAdapter.js";
import { XSSAdapter } from "../adapters/XSSAdapter.js";
import { MemoryLockoutAdapter } from "../adapters/MemoryLockoutAdapter.js";


// Managers
import { HashManager } from "../managers/HashManager.js";
import { RateLimitManager } from "../managers/RateLimitManager.js";
import { ValidatorManager } from "../managers/ValidatorManager.js";
import { SanitizerManager } from "../managers/SanitizerManager.js";
import { JsonManager } from "../managers/JsonManager.js";
import { CorsManager } from "../managers/CorsManager.js";
import { AuthManager } from "../managers/AuthManager.js";
import { CSRFManager } from "../managers/CSRFManager.js";
import { RequestIdManager } from "../managers/RequestIdManager.js";
import { LockoutManager } from "../managers/LockoutManager.js";


// Middlewares
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";
import { errorHandler } from "../middlewares/errorHandler.js";

// Types
import { SecureOptions, ValidationSchema } from "./types/SecureOptions.js";

export class DefendJS {
    private static instance: DefendJS | null = null;
    private config: DefendJSConfig;
    private initialized = false;

    // Managers
    public hashManager!: HashManager;
    public rateLimitManager!: RateLimitManager;
    public validatorManager!: ValidatorManager;
    public sanitizerManager!: SanitizerManager;
    public jsonManager!: JsonManager;
    public corsManager!: CorsManager;
    public authManager?: AuthManager;
    public csrfManager!: CSRFManager;
    public requestIdManager!: RequestIdManager;
    public lockoutManager!: LockoutManager;


    // Internal adapters
    private hashingPrimary: any;
    private hashingFallback: any;
    private rateLimiterPrimary: any;
    private rateLimiterFallback: any;
    private sanitizerPrimary: any;
    private sanitizerFallback: any;

    private constructor(userConfig: Partial<DefendJSConfig> = {}) {
        this.config = deepMerge(defaultConfig, userConfig);
    }

    // Singleton & Init

    static getInstance(config?: Partial<DefendJSConfig>): DefendJS {
        if (!DefendJS.instance) {
            logger.info("Creating DefendJS singleton", {
                layer: "defendjs-core"
            });
            DefendJS.instance = new DefendJS(config);
            DefendJS.instance.init();
        }
        return DefendJS.instance;
    }

    static resetInstance(): void {
        DefendJS.instance = null;
    }

    init(): void {
        if (this.initialized) {
            logger.warn("Initialization skipped (already initialized)", {
                layer: "defendjs-core"
            });
            return;
        }

        logger.info("Framework initialization started", {
            layer: "defendjs-core",
            lib: LIB_NAME,
            version: LIB_VERSION
        });

        this.setupAdapters();
        this.setupManagers();
        this.setupDynamicManagers();

        deepFreeze(this.config);
        this.initialized = true;

        logger.info("Framework initialized successfully", {
            layer: "defendjs-core"
        });
    }

    // Public Fluent API
    static auth(options?: { required?: boolean; roles?: string[] }) {
        const instance = this.getInstance();
        if (!instance.authManager) {
            throw new Error("Auth not enabled. Set auth.enabled=true in config.");
        }
        return instance.authManager.protect(options);
    }

    static validate(schema: ValidationSchema) {
        return this.getInstance().validatorManager.validate(schema);
    }

    static sanitize(options?: any) {
        return this.getInstance().sanitizerManager.middleware(options);
    }

    static rateLimit(preset: "strict" | "relaxed" | "api" | object) {
        const instance = this.getInstance();

        if (typeof preset === "string") {
            logger.info("Rate limit preset applied", {
                layer: "defendjs-core",
                preset
            });

            const presets: any = {
                strict: { mode: "strict" },
                relaxed: { mode: "relaxed" },
                api: { mode: "api" }
            };
            return instance.rateLimitManager.middleware(presets[preset]);
        }

        return instance.rateLimitManager.middleware({ options: preset });
    }

    static cors(options?: any) {
        return this.getInstance().corsManager.middleware(options);
    }

    static csrf(options?: any) {
        return this.getInstance().csrfManager.middleware(options);
    }

    static requestId(options?: any) {
        return this.getInstance().requestIdManager.middleware(options);
    }

    static json(options?: any) {
        const instance = this.getInstance();
        return [
            instance.jsonManager.middleware(options),
            instance.jsonManager.urlencoded()
        ];
    }

    // Utilities

    static hash = Object.assign(
        async (value: string): Promise<string> => {
            const instance = DefendJS.getInstance();
            const result = await instance.hashManager.hash(value, { allowFallback: true });
            return result.hash;
        },
        {
            needsRehash: async (hashed: string): Promise<boolean> => {
                return DefendJS.getInstance().hashManager.needsRehash(hashed);
            }
        }
    );

    static async verify(value: string, hash: string): Promise<boolean> {
        return this.getInstance().hashManager.verify(value, hash);
    }

    static jwt = {
        sign: (payload: object, options?: any) =>
            DefendJS.getInstance().authManager!.sign(payload, options),

        verify: (token: string) =>
            DefendJS.getInstance().authManager!.verify(token),

        google: {
            verifyIdToken: (idToken: string) =>
                DefendJS.getInstance().authManager!.verifyGoogleIdToken(idToken)
        }
    };

    static get lockout() {
        return this.getInstance().lockoutManager;
    }


    // Global Middleware - globalLevel
    static middleware(options?: SecureOptions | "api" | "strict" | "public") {
        const instance = this.getInstance();

        if (typeof options === "string") {
            logger.info("Global middleware preset applied", {
                layer: "defendjs-core",
                preset: options
            });

            const presets: any = {
                api: { cors: true, rateLimit: "relaxed", sanitize: true, requestId: true },
                strict: { cors: true, rateLimit: "strict", sanitize: true, auth: true, csrf: true, requestId: true },
                public: { cors: true, rateLimit: true, sanitize: false, requestId: true }
            };

            return instance.createMiddlewareChain(presets[options] || {});
        }

        return instance.createMiddlewareChain(options || {});
    }

    // Internal Setup

    private setupAdapters() {
        logger.info("Adapters setup started", {
            layer: "defendjs-core"
        });

        this.hashingPrimary =
            this.config.hashing.primary === "argon2"
                ? new ArgonAdapter()
                : new BcryptAdapter(this.config.hashing.saltRounds);

        this.hashingFallback =
            this.config.hashing.fallback === "bcrypt"
                ? new BcryptAdapter(this.config.hashing.saltRounds)
                : null;

        logger.info("Hashing adapters configured", {
            layer: "defendjs-core",
            primary: this.config.hashing.primary,
            fallback: this.config.hashing.fallback ?? null
        });

        this.rateLimiterPrimary = this.config.rateLimiter.useAdaptiveMode
            ? new RLFlexibleAdapter()
            : new ExpressRLAdapter();

        this.rateLimiterFallback = new ExpressRLAdapter();

        logger.info("Rate limiter adapters configured", {
            layer: "defendjs-core",
            adaptive: this.config.rateLimiter.useAdaptiveMode
        });

        this.sanitizerPrimary = new SanitizeHtmlAdapter(this.config.sanitizer);
        this.sanitizerFallback = new XSSAdapter(this.config.sanitizer);

        logger.info("Sanitizer adapters configured", {
            layer: "defendjs-core",
            primary: "sanitize-html",
            fallback: "xss"
        });
    }

    private setupManagers() {
        this.hashManager = new HashManager(
            this.config.hashing,
            this.hashingPrimary,
            this.hashingFallback
        );

        this.rateLimitManager = new RateLimitManager(
            this.config.rateLimiter,
            this.rateLimiterPrimary,
            this.rateLimiterFallback
        );

        this.validatorManager = new ValidatorManager(
            new ZodAdapter(),
            new ExpressValidatorAdapter()
        );

        this.sanitizerManager = new SanitizerManager(
            this.sanitizerPrimary,
            this.sanitizerFallback
        );

        logger.info("Core managers initialized", {
            layer: "defendjs-core",
            managers: ["hash", "rate-limit", "validator", "sanitizer"]
        });
    }

    private setupDynamicManagers() {
        this.jsonManager = new JsonManager();
        this.corsManager = new CorsManager();

        // Request ID Manager (always initialized)
        this.requestIdManager = new RequestIdManager(this.config.requestId);

        // CSRF Manager (always initialized, but only used if enabled)
        this.csrfManager = new CSRFManager(this.config.csrf);

        if (this.config.auth.enabled) {
            this.authManager = new AuthManager({
                jwtSecret: process.env.JWT_SECRET || this.config.auth.jwtSecret!,
                jwtExpiresIn: this.config.auth.jwtExpiresIn,
                googleClientId:
                    process.env.GOOGLE_CLIENT_ID || this.config.auth.googleClientId
            });

            logger.info("Authentication enabled", {
                layer: "defendjs-core",
                google: !!this.config.auth.googleClientId
            });
        } else {
            logger.info("Authentication disabled", {
                layer: "defendjs-core"
            });
        }

        logger.info("Dynamic managers initialized", {
            layer: "defendjs-core",
            managers: ["json", "cors", "csrf", "request-id"]
        });

        // Lockout Manager (always initialized with defaults)
        const lockoutAdapter = new MemoryLockoutAdapter();
        this.lockoutManager = new LockoutManager(lockoutAdapter, this.config.lockout || {});


    }

    private createMiddlewareChain(options: SecureOptions): any[] {
        const chain: any[] = [];

        // Request ID should be first for tracing
        if (options.requestId !== false && this.config.enableRequestId) {
            chain.push(this.requestIdManager.middleware(
                typeof options.requestId === "object" ? options.requestId : undefined
            ));
        }

        chain.push(this.jsonManager.middleware(this.config.json));
        chain.push(this.jsonManager.urlencoded(this.config.urlencoded));

        if (this.config.enableHelmet) chain.push(helmet());
        if (this.config.enableHPP) chain.push(hpp());

        if (this.config.enableCompression)
            chain.push(compression(this.config.compression));

        if (options.cors) chain.push(this.corsManager.middleware(this.config.cors));

        if (options.sanitize)
            chain.push(this.sanitizerManager.middleware());

        if (options.rateLimit)
            chain.push(this.rateLimitManager.middleware({}));

        // CSRF protection (before auth for state-changing requests)
        if (options.csrf !== false && this.config.enableCSRF) {
            chain.push(this.csrfManager.middleware(
                typeof options.csrf === "object" ? options.csrf : undefined
            ));
        }

        if (options.auth && this.authManager)
            chain.push(this.authManager.protect());

        chain.push(errorHandler);
        return chain;
    }
}


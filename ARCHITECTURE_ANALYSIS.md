# DefendJS - Complete Architecture Analysis

## 📋 Overview

**DefendJS** is a comprehensive security middleware library for Express.js applications. It provides a unified, one-line security layer that combines authentication, validation, sanitization, rate limiting, CORS, CSRF protection, request tracing, headers, and compression into a single, consistent API.

### Core Purpose
- **Unified Security Layer**: Instead of managing multiple security libraries separately, DefendJS acts as an orchestration layer
- **Developer Experience**: Simple API with safe defaults, but allows deep customization
- **Production Ready**: Includes fallback mechanisms, structured logging, and error handling
- **Type Safe**: Built with TypeScript for better developer experience

---

## 🏗️ Architecture Pattern

### Design Pattern: **Adapter Pattern + Manager Pattern**

The library uses a **two-layer architecture**:

1. **Adapters Layer**: Low-level implementations that wrap third-party libraries
2. **Managers Layer**: High-level orchestration that uses adapters with fallback mechanisms

```
┌─────────────────────────────────────┐
│         DefendJS (Singleton)        │
│  - Public API (static methods)      │
│  - Configuration Management         │
│  - Middleware Chain Creation        │
└──────────────┬──────────────────────┘
               │
               ├──────────────────────────────────┐
               │                                  │
    ┌──────────▼──────────┐         ┌────────────▼──────────┐
    │   Managers Layer    │         │   Adapters Layer      │
    │  (Orchestration)    │────────▶│  (Implementation)     │
    │                     │         │                       │
    │ - HashManager       │         │ - ArgonAdapter        │
    │ - AuthManager       │         │ - BcryptAdapter      │
    │ - ValidatorManager  │         │ - JWTAdapter          │
    │ - RateLimitManager  │         │ - GoogleAdapter       │
    │ - SanitizerManager  │         │ - ZodAdapter          │
    │ - CorsManager       │         │ - ExpressValidator    │
    │ - JsonManager       │         │ - SanitizeHtmlAdapter │
    │ - CSRFManager        │         │ - XSSAdapter          │
    │ - RequestIdManager  │         │ - ExpressRLAdapter   │
    │ - LockoutManager    │         │ - RLFlexibleAdapter   │

    └─────────────────────┘         │ - RLFlexibleAdapter   │
                                    │ - CSRFAdapter          │
                                    └───────────────────────┘
```

---

## 📁 Project Structure

```
src/
├── adapters/          # Low-level implementations (wrappers around 3rd party libs)
│   ├── ArgonAdapter.ts
│   ├── BcryptAdapter.ts
│   ├── JWTAdapter.ts
│   ├── GoogleAdapter.ts
│   ├── ZodAdapter.ts
│   ├── ExpressValidatorAdapter.ts
│   ├── SanitizeHtmlAdapter.ts
│   ├── XSSAdapter.ts
│   ├── ExpressRLAdapter.ts
│   ├── RLFlexibleAdapter.ts
│   └── CSRFAdapter.ts
│
├── managers/          # High-level orchestration with fallback logic
│   ├── HashManager.ts
│   ├── AuthManager.ts
│   ├── ValidatorManager.ts
│   ├── RateLimitManager.ts
│   ├── SanitizerManager.ts
│   ├── CorsManager.ts
│   ├── JsonManager.ts
│   ├── CSRFManager.ts
│   ├── RequestIdManager.ts
│   └── LockoutManager.ts

│
├── core/              # Core framework logic
│   ├── DefendJS.ts           # Main singleton class
│   ├── useSecure.ts          # Legacy API (deprecated)
│   ├── config.ts              # Default configuration
│   ├── constants.ts           # Constants and enums
│   └── types/                 # TypeScript type definitions
│       ├── DefendJSConfig.ts
│       └── SecureOptions.ts
│
├── middlewares/       # Express middleware
│   ├── errorHandler.ts       # Centralized error handling
│   └── requestLogger.ts      # Request logging
│
├── logging/           # Logging infrastructure
│   ├── winstonSetup.ts       # Winston logger configuration
│   └── morganSetup.ts        # Morgan HTTP logger
│
├── utils/             # Utility functions
│   ├── deepMerge.ts          # Deep merge for config
│   ├── deepFreeze.ts         # Immutable config
│   └── normalizeOptions.ts   # Option normalization
│
└── errors/            # Custom error classes
    ├── AdapterError.ts
    ├── HttpError.ts
    ├── ValidationError.ts
    ├── SanitizerError.ts
    └── SecurityError.ts
```

---

## 🔑 Key Components Explained

### 1. **DefendJS Class (Singleton)**

**Location**: `src/core/DefendJS.ts`

**Purpose**: Main entry point and singleton instance manager

**Key Features**:
- **Singleton Pattern**: Only one instance exists throughout the application lifecycle
- **Lazy Initialization**: Initialized on first `getInstance()` call
- **Static API**: All public methods are static for easy access
- **Configuration Management**: Merges user config with defaults and freezes it

**Public API**:
```typescript
// Static methods (fluent API)
DefendJS.middleware(options)      // Global middleware chain
DefendJS.auth(options)            // Route protection
DefendJS.validate(schema)         // Input validation
DefendJS.sanitize(options)        // XSS/HTML sanitization
DefendJS.rateLimit(options)       // Rate limiting
DefendJS.cors(options)            // CORS configuration
DefendJS.csrf(options)            // CSRF protection
DefendJS.requestId(options)      // Request ID/tracing
DefendJS.json(options)            // JSON parsing

// Utility methods
DefendJS.hash(password)           // Password hashing
DefendJS.verify(password, hash)   // Password verification
DefendJS.jwt.sign(payload)        // JWT signing
DefendJS.jwt.verify(token)        // JWT verification
DefendJS.jwt.google.verifyIdToken(idToken) // Google OAuth
```

**Initialization Flow**:
1. `getInstance(config)` called
2. Creates singleton if doesn't exist
3. Calls `init()` which:
   - Sets up adapters (primary + fallback)
   - Initializes managers
   - Sets up dynamic managers (CORS, JSON, CSRF, RequestId, Auth if enabled)
   - Freezes configuration

---

### 2. **Managers (Orchestration Layer)**

Managers coordinate between adapters and provide fallback mechanisms.

#### **HashManager**
- **Primary**: Argon2 (modern, secure)
- **Fallback**: Bcrypt (widely supported)
- **Features**:
  - Automatic algorithm detection for verification
  - Fallback on primary failure
  - Returns metadata (algorithm used, fallback status)

#### **AuthManager**
- **JWT Support**: Sign/verify tokens with configurable options
- **Google OAuth**: ID token verification
- **Route Protection**: Middleware for protected routes
- **RBAC**: Role-based access control via JWT payload

#### **ValidatorManager**
- **Dual Support**: Zod schemas OR express-validator chains
- **Auto Detection**: Automatically detects which validation library is used
- **Unified Errors**: Both produce consistent error format

#### **RateLimitManager**
- **Primary**: RLFlexibleAdapter (adaptive) or ExpressRLAdapter
- **Fallback**: ExpressRLAdapter
- **Presets**: "strict", "relaxed", "api" modes
- **Custom**: Per-route configuration

#### **SanitizerManager**
- **Primary**: sanitize-html (allows configurable HTML tags)
- **Fallback**: XSS (escape-only)
- **Middleware**: Automatically sanitizes request body strings

#### **CorsManager**
- **Wrapper**: Around `cors` package
- **Configurable**: Origin, methods, headers, credentials

#### **JsonManager**
- **JSON Parsing**: Express JSON body parser
- **URL Encoded**: Express URL-encoded parser

#### **CSRFManager**
- **Token Generation**: Cookie-based and header-based CSRF tokens
- **Validation**: Automatic token validation for state-changing requests
- **Configurable**: Cookie options, header names, protected methods

#### **RequestIdManager**
- **UUID Generation**: Automatic unique request ID per request
- **Tracing**: Adds request ID to response headers
- **Debugging**: Essential for production log correlation

#### **LockoutManager**
- **Brute Force Protection**: Locks accounts after failed attempts
- **Storage**: In-memory tracking (extensible structure)
- **Configurable**: Max attempts, lock duration, reset window
- **Usage**: Manual increment/check in auth flow


---

### 3. **Adapters (Implementation Layer)**

Adapters wrap third-party libraries and provide a consistent interface.

**Adapter Interface Pattern**:
```typescript
interface Adapter {
    // Common methods based on adapter type
    hash?(value: string): Promise<string>;
    verify?(value: string, hash: string): Promise<boolean>;
    sign?(payload: object, options?: any): string;
    validate?(schema: any): Middleware;
    sanitize?(value: string, options?: any): string;
    getMiddleware?(options?: any): Middleware;
}
```

**Key Adapters**:

1. **ArgonAdapter**: Wraps `argon2` for password hashing
2. **BcryptAdapter**: Wraps `bcryptjs` for password hashing
3. **JWTAdapter**: Wraps `jsonwebtoken` for token operations
4. **GoogleAdapter**: Wraps `google-auth-library` for OAuth
5. **ZodAdapter**: Wraps `zod` for schema validation
6. **ExpressValidatorAdapter**: Wraps `express-validator` for rule-based validation
7. **SanitizeHtmlAdapter**: Wraps `sanitize-html` for HTML sanitization
8. **XSSAdapter**: Wraps `xss` for XSS protection
9. **ExpressRLAdapter**: Wraps `express-rate-limit` for rate limiting
10. **RLFlexibleAdapter**: Wraps `rate-limiter-flexible` for advanced rate limiting
11. **CSRFAdapter**: Implements CSRF token generation and validation

---

### 4. **Error Handling System**

**Location**: `src/core/errors/` and `src/middlewares/errorHandler.ts`

**Error Classes Hierarchy**:
```
Error (base)
├── HttpError          (HTTP status codes: 400, 401, 403, etc.)
├── ValidationError    (Input validation failures)
├── SanitizerError     (Sanitization failures)
├── AdapterError       (Adapter operation failures)
└── SecurityError      (Security-related failures)
```

**Error Handler Middleware**:
- Catches all errors in the middleware chain
- Maps error types to appropriate HTTP status codes
- Returns consistent JSON error responses
- Logs errors with structured data

**Error Response Format**:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {} // Optional
}
```

---

### 5. **Configuration System**

**Location**: `src/core/config.ts` and `src/core/types/DefendJSConfig.ts`

**Configuration Structure**:
```typescript
interface DefendJSConfig {
    // Feature toggles
    enableHelmet: boolean;
    enableHPP: boolean;
    enableCORS: boolean;
    enableSanitizer: boolean;
    enableRateLimiter: boolean;
    enableValidation: boolean;
    enableCompression: boolean;
    enableCSRF: boolean;
    enableRequestId: boolean;
    
    // Feature-specific configs
    hashing: { primary, fallback, saltRounds };
    rateLimiter: { windowMs, maxRequests, message, useAdaptiveMode };
    validation: { mode, fallback };
    sanitizer: { allowedTags, allowedAttributes, fallback, primary };
    logging: { enabled, level, maxSize };
    auth: { enabled, jwtSecret, jwtExpiresIn, googleClientId };
    csrf: { cookieName, headerName, methods, cookieOptions };
    requestId: { headerName, setResponseHeader };
    
    // Express middleware configs
    json: object;
    urlencoded: object;
    cors: object;
    compression: object;
}
```

**Configuration Flow**:
1. Default config loaded from `config.ts`
2. User config merged using `deepMerge()`
3. Final config frozen using `deepFreeze()` (immutable)
4. Config used throughout initialization

---

### 6. **Logging System**

**Location**: `src/logging/`

**Components**:
- **Winston**: Structured logging with levels (info, warn, error, debug)
- **Morgan**: HTTP request logging
- **Structured Logs**: JSON format with metadata (layer, operation, etc.)

**Log Structure**:
```typescript
{
    layer: "defend_js-core" | "auth-manager" | "hash-manager" | ...,
    operation: "init" | "hash" | "verify" | "protect" | ...,
    // Additional context based on operation
}
```

**Logging Layers**:
- `defend_js-core`: Core framework initialization
- `auth-manager`: Authentication operations
- `hash-manager`: Password hashing operations
- `validator-manager`: Validation operations
- `rate-limit-manager`: Rate limiting operations
- `sanitizer-manager`: Sanitization operations
- `cors-manager`: CORS operations
- `csrf-manager`: CSRF operations
- `request-id-manager`: Request ID operations
- `adapter`: Adapter-specific operations

---

## 🔄 How It Works (Flow)

### 1. **Initialization Flow**

```
User calls: DefendJS.getInstance({ auth: { enabled: true } })
    ↓
Singleton created (if not exists)
    ↓
init() called
    ↓
setupAdapters()
    ├── Create ArgonAdapter (primary)
    ├── Create BcryptAdapter (fallback)
    ├── Create ExpressRLAdapter or RLFlexibleAdapter
    ├── Create SanitizeHtmlAdapter (primary)
    └── Create XSSAdapter (fallback)
    ↓
setupManagers()
    ├── HashManager(primary, fallback)
    ├── RateLimitManager(primary, fallback)
    ├── ValidatorManager(zod, express-validator)
    └── SanitizerManager(primary, fallback)
    ↓
setupDynamicManagers()
    ├── JsonManager()
    ├── CorsManager()
    ├── CSRFManager()
    ├── RequestIdManager()
    └── AuthManager() [if enabled]
    ↓
Config frozen
    ↓
Initialized = true
```

### 2. **Middleware Chain Creation**

```
User calls: DefendJS.middleware("api")
    ↓
createMiddlewareChain(preset)
    ↓
Chain built in order:
    1. Request ID middleware (tracing)
    2. JSON parser middleware
    3. URL-encoded parser middleware
    4. Helmet (if enabled)
    5. HPP (if enabled)
    6. Compression (if enabled)
    7. CORS middleware (if enabled)
    8. Sanitizer middleware (if enabled)
    9. Rate limiter middleware (if enabled)
    10. CSRF middleware (if enabled)
    11. Auth middleware (if enabled)
    12. Error handler (always last)
    ↓
Returns array of middleware functions
```

### 3. **Request Flow (Example: Protected Route)**

```
Request arrives
    ↓
Request ID: Generate/attach unique ID
    ↓
JSON Parser: Parse request body
    ↓
Helmet: Add security headers
    ↓
CORS: Check origin, add CORS headers
    ↓
Sanitizer: Sanitize string values in body
    ↓
Rate Limiter: Check rate limits
    ↓
CSRF: Validate CSRF token (if state-changing)
    ↓
Auth Middleware:
    ├── Extract Authorization header
    ├── Verify JWT token
    ├── Check roles (if required)
    └── Attach user to req.user
    ↓
Route Handler: Process request
    ↓
Error Handler: Catch any errors, format response
    ↓
Response sent (with request ID header)
```

### 4. **Password Hashing Flow**

```
User calls: DefendJS.hash("password123")
    ↓
HashManager.hash()
    ↓
Try ArgonAdapter.hash()
    ├── Success → Return hash
    └── Failure → Try BcryptAdapter.hash()
        ├── Success → Return hash (with fallback flag)
        └── Failure → Throw AdapterError
    ↓
Return HashResult { hash, algorithm, usedFallback }
```

### 5. **Validation Flow**

```
User calls: DefendJS.validate(zodSchema)
    ↓
ValidatorManager.validate()
    ↓
Detect schema type:
    ├── Zod schema → Use ZodAdapter
    └── Array → Use ExpressValidatorAdapter
    ↓
Create middleware function
    ↓
On request:
    ├── Zod: Parse and validate, attach to req.body
    └── Express-validator: Run validation chain, check errors
    ↓
If invalid → Throw ValidationError
If valid → Continue to next middleware
```

### 6. **CSRF Protection Flow**

```
User calls: DefendJS.csrf()
    ↓
CSRFManager.middleware()
    ↓
On request:
    ├── GET/HEAD: Generate token, set cookie
    ├── POST/PUT/PATCH/DELETE: Validate token
    │   ├── Extract token from cookie
    │   ├── Extract token from header
    │   ├── Compare tokens
    │   └── If mismatch → Throw SecurityError
    └── Continue to next middleware
```

---

## 🎯 Key Design Decisions

### 1. **Singleton Pattern**
- **Why**: Single configuration source, prevents multiple initializations
- **Trade-off**: Can't have multiple DefendJS instances with different configs
- **Solution**: `resetInstance()` for testing

### 2. **Adapter Pattern**
- **Why**: Abstraction over third-party libraries, easy to swap implementations
- **Benefit**: Can change underlying libraries without changing manager code

### 3. **Fallback Mechanisms**
- **Why**: Resilience - if primary adapter fails, fallback ensures operation continues
- **Use Cases**: 
  - Hashing: Argon2 → Bcrypt (if Argon2 unavailable)
  - Rate Limiting: RLFlexible → ExpressRL (if RLFlexible fails)
  - Sanitization: sanitize-html → XSS (if sanitize-html fails)

### 4. **Manager Pattern**
- **Why**: Encapsulates business logic, coordinates adapters, provides unified API
- **Benefit**: Single responsibility, easier testing, cleaner code

### 5. **Static API**
- **Why**: Easy to use, no need to pass instances around
- **Trade-off**: Less flexible for dependency injection
- **Solution**: Singleton provides instance internally

### 6. **Immutable Configuration**
- **Why**: Prevents accidental config changes after initialization
- **Implementation**: `deepFreeze()` after merge

### 7. **Structured Logging**
- **Why**: Production debugging, monitoring, troubleshooting
- **Format**: JSON with consistent structure (layer, operation, metadata)

### 8. **Request ID First**
- **Why**: Enables request tracing throughout the entire middleware chain
- **Benefit**: Essential for production debugging and log correlation

---

## 📦 Dependencies

### Core Dependencies
- **express**: Peer dependency (Express.js framework)
- **argon2**: Password hashing (primary)
- **bcryptjs**: Password hashing (fallback)
- **jsonwebtoken**: JWT operations
- **google-auth-library**: Google OAuth verification
- **zod**: Schema validation
- **express-validator**: Rule-based validation
- **sanitize-html**: HTML sanitization (primary)
- **xss**: XSS protection (fallback)
- **express-rate-limit**: Rate limiting (fallback)
- **rate-limiter-flexible**: Advanced rate limiting (primary, optional)
- **cors**: CORS middleware
- **helmet**: Security headers
- **hpp**: HTTP Parameter Pollution protection
- **compression**: Response compression
- **winston**: Structured logging
- **morgan**: HTTP request logging
- **uuid**: Request ID generation

---

## 🔐 Security Features

1. **Password Hashing**: Argon2 (primary) with Bcrypt fallback
2. **JWT Authentication**: Token-based auth with configurable options
3. **Google OAuth**: ID token verification
4. **Input Validation**: Zod or express-validator
5. **XSS Protection**: HTML sanitization and XSS escaping
6. **Rate Limiting**: Prevents abuse and DDoS
7. **CORS**: Cross-origin resource sharing control
8. **Security Headers**: Helmet integration
9. **HTTP Parameter Pollution**: HPP protection
10. **CSRF Protection**: Cookie and header-based token validation
11. **Request Tracing**: Unique request IDs for debugging
12. **Error Handling**: Prevents information leakage

---

## 🚀 Usage Patterns

### 1. **Global Middleware (Simple)**
```typescript
app.use(DefendJS.middleware("api"));
```

### 2. **Global Middleware (Custom)**
```typescript
app.use(DefendJS.middleware({
    cors: true,
    rateLimit: "strict",
    sanitize: true,
    csrf: true,
    requestId: true
}));
```

### 3. **Route-Level Security**
```typescript
router.post(
    "/admin/create",
    DefendJS.auth({ roles: ["admin"] }),
    DefendJS.rateLimit({ max: 3, windowMs: 60000 }),
    DefendJS.csrf(),
    DefendJS.validate(zodSchema),
    controller
);
```

### 4. **Password Operations**
```typescript
const hash = await DefendJS.hash(password);
const isValid = await DefendJS.verify(password, hash);
```

### 5. **JWT Operations**
```typescript
const token = DefendJS.jwt.sign({ userId: 123 });
const decoded = DefendJS.jwt.verify(token);
```

### 6. **CSRF Protection**
```typescript
// Global
app.use(DefendJS.middleware({ csrf: true }));

// Route-level
router.post("/api/data", DefendJS.csrf(), handler);
```

### 7. **Request ID**
```typescript
// Enabled by default
app.use(DefendJS.middleware("api"));

// Access in handler
router.get("/api/data", (req, res) => {
    console.log(req.id); // Unique request ID
});
```

---

## 🧪 Testing Considerations

- **Singleton Reset**: Use `DefendJS.resetInstance()` between tests
- **Mock Adapters**: Can inject mock adapters for testing
- **Error Scenarios**: Test fallback mechanisms
- **Configuration**: Test config merging and defaults

---

## 📝 TypeScript Support

- **Strict Mode**: Enabled in tsconfig.json
- **Type Definitions**: Comprehensive types for all APIs
- **Declaration Files**: Generated `.d.ts` files for consumers
- **Type Safety**: Full type checking throughout

---

## 🎓 Learning Points

1. **Separation of Concerns**: Adapters vs Managers
2. **Resilience**: Fallback mechanisms for critical operations
3. **Developer Experience**: Simple API, complex internals
4. **Production Ready**: Logging, error handling, monitoring
5. **Extensibility**: Easy to add new adapters/managers
6. **Type Safety**: TypeScript throughout for better DX
7. **Security First**: Multiple layers of protection
8. **Observability**: Request tracing for production debugging

---

## 🔄 Extension Points

To extend DefendJS:

1. **New Adapter**: Create adapter class implementing interface
2. **New Manager**: Create manager class using adapters
3. **New Feature**: Add to DefendJS class, update config types
4. **New Error Type**: Extend error class hierarchy

---

## 📊 Summary

DefendJS is a **well-architected security middleware library** that:
- Provides a unified API for multiple security concerns
- Uses adapter/manager pattern for flexibility and resilience
- Includes fallback mechanisms for critical operations
- Has structured logging for production debugging
- Offers both global and route-level security configuration
- Includes CSRF protection and request tracing
- Is fully typed with TypeScript
- Follows best practices for Express.js middleware

The codebase is **production-ready**, **maintainable**, and **extensible**.

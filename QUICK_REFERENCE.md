# DefendJS - Quick Reference Guide

## 🎯 What is DefendJS?

A **unified security middleware library** for Express.js that combines:
- Authentication (JWT, Google OAuth)
- Password Hashing (Argon2/Bcrypt)
- Input Validation (Zod/express-validator)
- XSS Protection (HTML sanitization)
- Rate Limiting
- CORS
- Security Headers (Helmet)
- CSRF Protection
- Request ID/Tracing
- Request Parsing (JSON, URL-encoded)

**One dependency. One middleware. Complete security.**
---

## 🏗️ Architecture at a Glance

```
DefendJS (Singleton)
    │
    ├── Managers (Orchestration)
    │   ├── HashManager → ArgonAdapter / BcryptAdapter
    │   ├── AuthManager → JWTAdapter / GoogleAdapter
    │   ├── ValidatorManager → ZodAdapter / ExpressValidatorAdapter
    │   ├── RateLimitManager → RLFlexibleAdapter / ExpressRLAdapter
    │   ├── SanitizerManager → SanitizeHtmlAdapter / XSSAdapter
    │   ├── CorsManager → cors package
    │   ├── CSRFManager → CSRFAdapter
    │   ├── RequestIdManager → UUID generation
    │   └── JsonManager → express.json / express.urlencoded
    │
    └── Adapters (Implementation)
        └── Wrappers around 3rd party libraries
```

---

## 📦 Key Files

| File | Purpose |
|------|---------|
| `src/core/DefendJS.ts` | Main singleton class, public API |
| `src/core/config.ts` | Default configuration |
| `src/core/types/DefendJSConfig.ts` | Configuration type definitions |
| `src/managers/*.ts` | High-level orchestration |
| `src/adapters/*.ts` | Low-level implementations |
| `src/middlewares/errorHandler.ts` | Centralized error handling |
| `src/logging/*.ts` | Structured logging setup |

---

## 🔑 Core Concepts

### 1. Singleton Pattern
- Only one instance exists
- Initialized via `DefendJS.getInstance(config)`
- Reset with `DefendJS.resetInstance()` (testing only)

### 2. Adapter Pattern
- Adapters wrap 3rd party libraries
- Provide consistent interface
- Easy to swap implementations

### 3. Manager Pattern
- Managers coordinate adapters
- Provide fallback mechanisms
- Expose unified API

### 4. Fallback Mechanisms
- **Hashing**: Argon2 → Bcrypt
- **Rate Limiting**: RLFlexible → ExpressRL
- **Sanitization**: sanitize-html → XSS

---

## 🚀 Common Usage Patterns

### Basic Setup
```typescript
import { DefendJS } from "defend_js";

// Initialize (once at app startup)
DefendJS.getInstance({
    auth: {
        enabled: true,
        jwtSecret: process.env.JWT_SECRET
    }
});

// Use global middleware
app.use(DefendJS.middleware("api"));
```

### Route Protection
```typescript
router.get(
    "/profile",
    DefendJS.auth({ required: true }),
    getProfile
);

router.post(
    "/admin/create",
    DefendJS.auth({ roles: ["admin"] }),
    createResource
);
```

### Validation
```typescript
// Zod schema
const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

router.post("/register", 
    DefendJS.validate(schema),
    register
);

// express-validator
router.post("/login",
    DefendJS.validate([
        body("email").isEmail(),
        body("password").notEmpty()
    ]),
    login
);
```

### Password Hashing
```typescript
// Hash password
const hash = await DefendJS.hash(password);

// Verify password
const isValid = await DefendJS.verify(password, hash);

// Check if hash needs upgrading (e.g., bcrypt -> argon2)
const needsUpgrade = await DefendJS.hash.needsRehash(hash);
if (needsUpgrade) {
    const newHash = await DefendJS.hash(password);
    // Save newHash to database
}
```

### JWT Operations
```typescript
// Sign token
const token = DefendJS.jwt.sign(
    { userId: 123, role: "admin" },
    { expiresIn: "7d" }
);

// Verify token
const decoded = DefendJS.jwt.verify(token);

// Google OAuth
const user = await DefendJS.jwt.google.verifyIdToken(idToken);
```

### Rate Limiting
```typescript
// Preset
router.post("/login",
    DefendJS.rateLimit("strict"),
    login
);

// Custom
router.post("/api",
    DefendJS.rateLimit({
        max: 10,
        windowMs: 60000
    }),
    handler
);
```

### CORS
```typescript
// Global
app.use(DefendJS.middleware({
    cors: {
        origin: ["https://app.example.com"],
        credentials: true
    }
}));

// Route-level
router.post("/webhook",
    DefendJS.cors({
        origin: ["https://trusted-client.com"]
    }),
    handler
);
```

### Sanitization
```typescript
// Default (strict)
router.post("/comment",
    DefendJS.sanitize(),
    handler
);

// Custom (allow some HTML)
router.post("/post",
    DefendJS.sanitize({
        allowedTags: ["b", "i", "a"],
        allowedAttributes: { a: ["href"] }
    }),
    handler
);

// Disable
router.post("/internal",
    DefendJS.sanitize(false),
    handler
);
```

### CSRF Protection
```typescript
// Global
app.use(DefendJS.middleware({
    csrf: true
}));

// Route-level
router.post("/api/data",
    DefendJS.csrf(),
    handler
);

// Custom configuration
router.post("/api/data",
    DefendJS.csrf({
        cookieName: "_csrf",
        headerName: "x-csrf-token",
        methods: ["POST", "PUT", "DELETE"]
    }),
    handler
);
```

### Request ID/Tracing
```typescript
// Enabled by default
app.use(DefendJS.middleware("api"));

// Route-level
router.get("/api/data",
    DefendJS.requestId(),
    handler
);

// Access in handler
router.get("/api/data", (req, res) => {
    console.log(req.id); // Unique request ID
    res.json({ requestId: req.id });
});
```

---

## 🔄 Request Flow

```
Request
  ↓
Request ID (tracing)
  ↓
JSON Parser
  ↓
Helmet (Security Headers)
  ↓
CORS Check
  ↓
Sanitizer (XSS Protection)
  ↓
Rate Limiter
  ↓
CSRF Validation (if state-changing)
  ↓
Auth Middleware (if protected)
  ↓
Validation (if specified)
  ↓
Route Handler
  ↓
Error Handler (catches errors)
  ↓
Response (with request ID header)
```

---

## ⚙️ Configuration Options

### Authentication
```typescript
auth: {
    enabled: true,
    jwtSecret: "your-secret-key",
    jwtExpiresIn: "1d",
    googleClientId: "optional-google-client-id"
}
```

### Hashing
```typescript
hashing: {
    primary: "argon2",      // or "bcrypt"
    fallback: "bcrypt",      // or null
    saltRounds: 10
}
```

### Rate Limiting
```typescript
rateLimiter: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 100,
    message: "Too many requests",
    useAdaptiveMode: false
}
```

### Validation
```typescript
validation: {
    mode: "zod",              // or "express-validator"
    fallback: "express-validator"
}
```

### Sanitization
```typescript
sanitizer: {
    allowedTags: ["b", "i", "em", "strong", "a"],
    allowedAttributes: { a: ["href"] },
    fallback: "escape",       // or "xss" or "none"
    primary: "sanitize-html"  // or "xss"
}
```

### CSRF
```typescript
csrf: {
    cookieName: "_csrf",
    headerName: "x-csrf-token",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    cookieOptions: {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 3600 * 24
    }
}
```

### Request ID
```typescript
requestId: {
    headerName: "x-request-id",
    setResponseHeader: true
}
```

---

## 🎨 Middleware Presets

### "api"
```typescript
{
    cors: true,
    rateLimit: "relaxed",
    sanitize: true,
    requestId: true
}
```

### "strict"
```typescript
{
    cors: true,
    rateLimit: "strict",
    sanitize: true,
    auth: true,
    csrf: true,
    requestId: true
}
```

### "public"
```typescript
{
    cors: true,
    rateLimit: true,
    sanitize: false,
    requestId: true
}
```

---

## 🐛 Error Types

| Error Class | Status | Use Case |
|-------------|--------|----------|
| `HttpError` | 400-500 | HTTP errors (BadRequest, Unauthorized, etc.) |
| `ValidationError` | 400 | Input validation failures |
| `SanitizerError` | 400 | Sanitization failures |
| `AdapterError` | 500 | Adapter operation failures |
| `SecurityError` | 500 | Security-related failures |

---

## 📝 Logging

Structured logs with layers:
- `defend_js-core`: Core framework
- `auth-manager`: Authentication
- `hash-manager`: Password hashing
- `validator-manager`: Validation
- `rate-limit-manager`: Rate limiting
- `sanitizer-manager`: Sanitization
- `cors-manager`: CORS
- `csrf-manager`: CSRF protection
- `request-id-manager`: Request tracing
- `adapter`: Adapter operations

---

## 🔧 Extension Points

1. **New Adapter**: Create class implementing adapter interface
2. **New Manager**: Create manager using adapters
3. **New Feature**: Add to DefendJS class, update config
4. **New Error**: Extend error class hierarchy

---

## ✅ Best Practices

1. **Initialize once** at app startup
2. **Use resetInstance()** only in tests
3. **Don't initialize** inside controllers
4. **Use route-level security** for fine-grained control
5. **Enable auth** only if needed
6. **Configure CORS** based on your needs
7. **Use validation** on all user inputs
8. **Enable sanitization** for user-generated content
9. **Set appropriate rate limits** per route
10. **Enable CSRF** for state-changing requests
11. **Use request IDs** for production debugging
12. **Monitor logs** in production

---

## 🚨 Common Pitfalls

1. ❌ Initializing multiple times
2. ❌ Using resetInstance() in production
3. ❌ Not configuring JWT secret properly
4. ❌ Disabling sanitization on user inputs
5. ❌ Not using validation
6. ❌ Too permissive CORS settings
7. ❌ Weak rate limits
8. ❌ Not handling errors properly
9. ❌ Forgetting CSRF protection on state-changing routes
10. ❌ Not using request IDs for debugging

---

## 📚 Key Takeaways

1. **Unified API**: One library for all security needs
2. **Adapter Pattern**: Easy to swap implementations
3. **Fallback Mechanisms**: Resilient to failures
4. **Type Safe**: Full TypeScript support
5. **Production Ready**: Logging, error handling, monitoring
6. **Flexible**: Global and route-level configuration
7. **Simple**: Easy API, complex internals hidden
8. **Secure**: Multiple layers of protection
9. **Observable**: Request tracing built-in

---

## 🔗 Related Files

- `ARCHITECTURE_ANALYSIS.md` - Detailed architecture documentation
- `readme.md` - User-facing documentation
- `package.json` - Dependencies and scripts
- `CHANGELOG.md` - Version history and migration guide

---

## 📖 Complete Example

```typescript
import express from "express";
import { DefendJS } from "defend_js";

const app = express();

// Initialize
DefendJS.getInstance({
    auth: {
        enabled: true,
        jwtSecret: process.env.JWT_SECRET
    },
    enableCSRF: true,
    enableRequestId: true
});

// Global middleware
app.use(DefendJS.middleware("api"));

// Protected route
app.get("/profile",
    DefendJS.auth({ required: true }),
    (req, res) => {
        res.json({ user: req.user, requestId: req.id });
    }
);

// Admin route with CSRF
app.post("/admin/create",
    DefendJS.auth({ roles: ["admin"] }),
    DefendJS.csrf(),
    DefendJS.validate(zodSchema),
    (req, res) => {
        // Handle request
    }
);

app.listen(3000);
```

---

## 🎯 Quick Decision Guide

**When to use what:**

- **Global middleware**: Standard security for all routes
- **Route-level**: Fine-grained control per endpoint
- **Zod validation**: Complex schemas, reusable
- **express-validator**: Quick, form-like validation
- **CSRF**: All state-changing routes (POST, PUT, DELETE)
- **Request ID**: Always enabled (production debugging)
- **Rate limiting**: Public endpoints, login, API routes
- **Sanitization**: User-generated content
- **CORS**: APIs accessed from browsers

---

**One dependency. One middleware. Complete security.**

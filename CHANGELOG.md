# Changelog - DefendJS (formerly DefendJS)

## Version 1.0.0 - Major Update

### 🎉 New Features

#### 1. CSRF Protection
- **CSRFManager** and **CSRFAdapter** added for Cross-Site Request Forgery protection
- Supports cookie-based and header-based CSRF tokens
- Configurable cookie options (httpOnly, secure, sameSite)
- Works with or without cookie-parser middleware
- Automatic token generation and validation
- Protects POST, PUT, PATCH, DELETE requests by default

**Usage:**
```typescript
// Global middleware
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

#### 2. Request ID/Tracing
- **RequestIdManager** added for request tracing and debugging
- Automatically generates unique request IDs (UUIDs)
- Adds request ID to response headers
- Attaches request ID to `req.id` and `req.requestId`
- Essential for production debugging and log correlation

**Usage:**
```typescript
// Global middleware (enabled by default)
app.use(DefendJS.middleware({
    requestId: true
}));

// Route-level
router.get("/api/data",
    DefendJS.requestId(),
    handler
);

// Access in route handler
router.get("/api/data", (req, res) => {
    console.log(req.id); // Unique request ID
    res.json({ requestId: req.id });
});
```

#### 3. Account Lockout
- **LockoutManager** added to prevent "Low and Slow" brute force attacks
- Locks specific user accounts after `N` failed attempts
- Configurable max attempts, window duration, and lock duration
- Provides manual API to check, increment, and reset lock status

**Usage:**
```typescript
// Enable in config
DefendJS.getInstance({
    lockout: {
        enabled: true,
        maxAttempts: 5
    }
});

// Check status
const status = DefendJS.lockout.check(email);
if (status.isLocked) throw new Error("Locked");

// Increment on failure
DefendJS.lockout.increment(email);
```


### 🔄 Renamed from DefendJS to DefendJS

- **Class renamed**: `DefendJS` → `DefendJS`
- **Package name**: `defend_js` → `defend_js`
- **All exports updated**: `DefendJS` → `DefendJS`
- **Configuration interface**: `DefendJSConfig` → `DefendJSConfig`
- **Logging layer**: `defend_js-core` → `defend_js-core`

### 📝 Breaking Changes

1. **Import changes:**
   ```typescript
   // Old
   import { DefendJS } from "defend_js";
   
   // New
   import { DefendJS } from "defend_js";
   ```

2. **Configuration:**
   ```typescript
   // Old
   DefendJS.getInstance({ ... });
   
   // New
   DefendJS.getInstance({ ... });
   ```

3. **All static methods:**
   ```typescript
   // Old
   DefendJS.middleware("api");
   DefendJS.auth();
   DefendJS.validate();
   
   // New
   DefendJS.middleware("api");
   DefendJS.auth();
   DefendJS.validate();
   ```

### ⚙️ Configuration Updates

#### New Configuration Options

```typescript
interface DefendJSConfig {
    // ... existing options
    
    enableCSRF: boolean;        // Enable CSRF protection (default: false)
    enableRequestId: boolean;   // Enable request ID (default: true)
    
    csrf?: {
        secret?: string;
        cookieName?: string;
        cookieOptions?: {
            httpOnly?: boolean;
            secure?: boolean;
            sameSite?: "strict" | "lax" | "none";
            maxAge?: number;
        };
        headerName?: string;
        methods?: string[];
    };
    
    requestId?: {
        headerName?: string;
        setResponseHeader?: boolean;
    };
}
```

### 🎨 Updated Middleware Presets

#### "api" preset
```typescript
{
    cors: true,
    rateLimit: "relaxed",
    sanitize: true,
    requestId: true  // Added
}
```

#### "strict" preset
```typescript
{
    cors: true,
    rateLimit: "strict",
    sanitize: true,
    auth: true,
    csrf: true,        // Added
    requestId: true    // Added
}
```

#### "public" preset
```typescript
{
    cors: true,
    rateLimit: true,
    sanitize: false,
    requestId: true    // Added
}
```

### 🔧 Migration Guide

1. **Update package:**
   ```bash
   npm uninstall defend_js
   npm install defend_js
   ```

2. **Update imports:**
   ```typescript
   // Replace all occurrences
   import { DefendJS } from "defend_js";
   // With
   import { DefendJS } from "defend_js";
   ```

3. **Update code:**
   ```typescript
   // Replace DefendJS with DefendJS
   DefendJS.getInstance({ ... });
   DefendJS.middleware("api");
   DefendJS.auth();
   // etc.
   ```

4. **Enable new features (optional):**
   ```typescript
   DefendJS.getInstance({
       enableCSRF: true,      // Enable CSRF protection
       enableRequestId: true  // Already enabled by default
   });
   ```

### 📚 Documentation

- See `ARCHITECTURE_ANALYSIS.md` for detailed architecture documentation
- See `QUICK_REFERENCE.md` for quick usage reference
- See `readme.md` for complete user guide

### 🐛 Bug Fixes

- Fixed cookie parsing to work without cookie-parser middleware
- Improved error messages and logging

### ✨ Improvements

- Better TypeScript types for new features
- Enhanced logging with request IDs
- More flexible CSRF configuration
- Improved error handling

---

## Previous Versions (DefendJS)

See git history for previous DefendJS versions.


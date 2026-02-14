# Environment Configuration

## Demo Mode Notice

This repository is configured for **demo/development use**:

- **Demo dataset**: The Supabase instance contains sample data for testing and development.
- **Anon key is public**: The Supabase anon key is designed for client-side use. In this demo configuration, database policies may be permissive. Production deployments should validate and tighten RLS.
- **Open access**: The current build does not enforce user authentication or device restrictions.

For production deployment: validate RLS policies, implement appropriate access controls, and consider rotating credentials.

---

## Environment Variables

All environment variables use the `VITE_` prefix (required by Vite for client-side access).

### Required Variables

| Variable | Description | Required In |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Production builds |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Production builds |
| `VITE_BASE_URL` | API base URL for Edge Functions (optional - derived from SUPABASE_URL if omitted) | Optional |

> **Note:** In development and test modes, built-in defaults are used if env vars are not set.
> Production builds (with `PROD=true`) will use the defaults if env vars are empty, but
> it's recommended to set explicit values for production deployments.

### Optional Feature Flags

> Env vars are strings. Use **"true"** / **"false"**.
> Some flags default to enabled unless explicitly set to `"false"` (see `src/config/runtimeConfig.js`).

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_USE_REAL_AI` | `true` | Set to `"false"` to use mock AI responses |
| `VITE_ENABLE_WET_COURTS` | `true` | Set to `"false"` to disable wet court features |
| `VITE_DEBUG_MODE` | `false` | Set to `"true"` for verbose logging |

---

## Local Development Setup

1. Copy the example environment file:

       cp .env.example .env.local

2. Edit `.env.local` and add your Supabase credentials:

       VITE_SUPABASE_URL=<your-supabase-url>
       VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

3. Start the development server:

       npm run dev

Note: `.env.local` is gitignored and should never be committed.

---

## Vercel Deployment Setup

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add:

| Name | Environment | Value |
|------|-------------|-------|
| `VITE_SUPABASE_URL` | Production, Preview, Development | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development | Supabase anon key |

Optional feature flags can also be set per-environment if needed.

4. Redeploy for changes to take effect.

---

## Configuration Architecture

Environment variables are loaded through a centralized configuration module:

```
.env.local (or build-time injection)
  → import.meta.env.VITE_*
    → src/config/runtimeConfig.js (validation + freeze)
      → src/lib/apiConfig.js (single consumer, re-exports)
        → ApiAdapter, RealtimeClient, TennisQueries (import from apiConfig)
```

Key files:

- `src/config/runtimeConfig.js` — centralized env var access, validation, feature flags
- `src/lib/apiConfig.js` — API configuration export + device context
- `.env.example` — names-only template

### Validation Behavior

The `getRuntimeConfig()` function validates environment variables:

- **Dev/test mode** (`PROD=false`): Falls back to built-in defaults silently
- **Production mode** (`PROD=true`): Falls back to defaults if env vars are empty (defaults are valid working credentials)

The returned config object is frozen (immutable) for safety.

---

## Troubleshooting

### "Missing required env vars" error

If you see:

    [runtimeConfig] Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY

Ensure `.env.local` exists with valid values, or set the variables in Vercel.

### Changes not taking effect

- Local: restart the dev server after changing `.env.local`
- Vercel: trigger a new deployment after changing environment variables

### Feature flag not working

Ensure the value is exactly `"true"` or `"false"` (string), for example:

- ✅ VITE_DEBUG_MODE=true
- ❌ VITE_DEBUG_MODE=1

---

## Logging Policy

### Centralized Logger

All application logging should use the centralized logger from `src/lib/logger.js`:

```javascript
import { logger } from '../lib/logger.js';

logger.debug('ModuleName', 'Operation description', optionalData);
logger.info('ModuleName', 'Important event');
logger.warn('ModuleName', 'Warning message');
logger.error('ModuleName', 'Error description', errorObject);
```

### Usage Guidelines

1. **Always use the logger** — Do not use `console.log/warn/error` directly in ESM modules.
2. **Module tagging** — First argument is a short module identifier (e.g., `'TennisService'`, `'AdminApp'`).
3. **Descriptive messages** — Second argument describes what happened (no emoji prefixes).
4. **Optional data** — Third argument can include additional context (objects, errors).

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Development tracing, state changes, operation progress |
| `info` | Important events (initialization complete, feature enabled) |
| `warn` | Recoverable issues, deprecated usage, fallback behavior |
| `error` | Failures that need attention, caught exceptions |

### Allowlist (Plain Scripts)

These files may retain `console.*` calls because they are plain JavaScript without ESM imports:

- `src/registration/nav-diagnostics.js`
- `src/courtboard/mobile-fallback-bar.js`
- `src/courtboard/mobile-bridge.js`
- `src/admin/sync-promotions.js`

### Enabling Debug Output

Set `VITE_DEBUG_MODE=true` in your environment to enable verbose logging in the browser console.

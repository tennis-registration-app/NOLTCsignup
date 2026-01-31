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

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

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

    .env.local (local dev)
         ↓
    import.meta.env.VITE_*
         ↓
    src/config/runtimeConfig.js (single source of truth)
         ↓
    src/lib/apiConfig.js (API_CONFIG export for consumers)

Key files:

- `src/config/runtimeConfig.js` — centralized env var access, feature flags
- `src/lib/apiConfig.js` — API configuration export + device context
- `.env.example` — names-only template

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

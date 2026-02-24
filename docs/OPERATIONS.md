# Operations Guide — NOLTC Tennis Registration System

> Production operations reference for engineers running this system. For development setup, see [ONBOARDING.md](ONBOARDING.md). For env var details, see [ENVIRONMENT.md](ENVIRONMENT.md).

## Environment Variables

All client-side variables use the `VITE_` prefix (required by Vite).

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_SUPABASE_URL` | Production | Dev default baked in | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Production | Dev default baked in | Supabase anon/public key (not a secret — RLS provides access control) |
| `VITE_BASE_URL` | No | Derived from `SUPABASE_URL + /functions/v1` | API base URL for Edge Functions |
| `VITE_USE_REAL_AI` | No | `true` | Enable AI assistant in admin panel |
| `VITE_ENABLE_WET_COURTS` | No | `true` | Enable wet court functionality |
| `VITE_DEBUG_MODE` | No | `false` | Enable debug-level logging in browser console |
| `VITE_ADMIN_ACCESS_MODE` | No | `open` | Admin access mode (`open` or `authenticated`). See [Admin Access Control](#admin-access-control). |

**Build-time validation:** `scripts/check-env.js` runs before every Vercel build. It blocks deployment if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing. Only enforced when `VERCEL=1` (skipped in local builds).

**Dev defaults:** `src/config/runtimeConfig.js` includes hardcoded dev Supabase credentials via `DEV_DEFAULTS`. These are anon keys (not secrets) for frictionless local development. The build-time check is the gate that prevents dev credentials from reaching production.

See [ENVIRONMENT.md](ENVIRONMENT.md) for full details and feature flag behavior.

## Deployment Pipeline

### Production (Vercel)

- **Platform:** Vercel
- **Trigger:** Push to `main` branch (auto-deploy)
- **Preview deployments:** Enabled for pull requests
- **Production URL:** `https://courtboard-noltc.vercel.app/`

| App | Production URL |
|-----|---------------|
| Registration (kiosk) | `/src/registration/index.html` |
| Admin Panel | `/src/admin/index.html` |
| Courtboard Display | `/src/courtboard/index.html` |
| Mobile Shell | `/Mobile.html` |

### Vercel Build Command

Defined in `vercel.json`:

```
node scripts/check-env.js && npm run lint:ratchet && npm run type:ratchet && npm run coverage:ratchet && npm run test:fixtures && npm run build
```

This runs all quality gates before producing the production build. If any gate fails, the deploy is blocked.

### CI Pipeline (GitHub Actions)

Two workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `verify.yml` | Push to `main`, PRs to `main` | Lint ratchet → type ratchet → coverage ratchet → build → E2E tests |
| `deploy.yml` | Manual dispatch only | Legacy GitHub Pages deploy (disabled — retained for auditability) |

The `verify.yml` pipeline runs in two jobs:
1. **lint-and-build** — lint, typecheck, coverage, build (uploads `dist/` artifact)
2. **e2e-tests** — downloads artifact, runs Playwright E2E tests against built output

### Rollback

- **Vercel dashboard:** Deployments → select previous successful deployment → Promote to Production
- **Git revert:** `git revert <commit> && git push origin main` — triggers new deploy with reverted code
- **CSP rollback:** Revert the `vercel.json` CSP header change (see [CSP_ROLLOUT.md](CSP_ROLLOUT.md) for specific commit hashes)

## Vercel Configuration

All configuration lives in `vercel.json`:

- **Output directory:** `dist/`
- **Single catch-all route:** `/(.*)`
- **Security headers on all routes:**

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `script-src 'self'`; `style-src 'self' 'unsafe-inline'`; connect/frame to Supabase + camera |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` |

See [CSP_ROLLOUT.md](CSP_ROLLOUT.md) for the full CSP directive breakdown.

## Backend (Supabase)

- **Project URL:** Configured via `VITE_SUPABASE_URL` (see Vercel env vars)
- **Edge Functions:** Hosted in a separate repo (`noltc-backend/`). This frontend repo does not contain Edge Function source code.
- **Database:** PostgreSQL with Row-Level Security (RLS) policies for access control
- **Authentication:** Honor-system kiosk model — no user authentication. Supabase anon key provides frontend access; RLS is the security boundary. See [SECURITY_WP.md](SECURITY_WP.md).

### API Communication

All backend calls go through:
- `src/lib/backend/commands/TennisCommands.js` — mutations (assign court, join waitlist, etc.)
- `src/lib/backend/commands/TennisQueries.js` — reads (get board, get members)
- `src/lib/backend/admin/AdminCommands.js` — admin operations (blocks, settings, analytics)

These call Supabase Edge Functions via `ApiAdapter._fetch()`, which handles auth headers, error normalization, and caching.

## Polling and Real-time Updates

The system uses **polling** (not Supabase Realtime WebSockets) for state updates:

### Board Subscription (`TennisQueries.subscribeToBoardChanges`)

| Mechanism | Interval | Purpose |
|-----------|----------|---------|
| Initial fetch | On mount | Load current board state |
| Block expiry poll | 30 seconds | Catch naturally expired blocks (no DB signal for expiry) |
| Backup poll | 60 seconds | Ensure state stays fresh on always-visible displays |
| Visibility change | On tab focus | Refresh when tab becomes visible (handles sleep/wake) |

All polling is visibility-aware — polls only run when `document.hidden === false`.

**E2E test mode:** When `?e2e=1` query param is present, polling is disabled (single fetch only).

### Courtboard Module Loading (`courtboard/main.jsx`)

- Polls every 100ms for `window.Tennis` modules to become available
- Times out after 10 seconds, showing error state
- This is a startup-only mechanism, not ongoing polling

### Mobile Shell Queue (`courtboard/mobile-fallback-bar.js`)

- Modal queue polls via `setInterval` until `window.MobileModal` is available
- Clears interval once the modal bridge is ready

### Adjusting Poll Intervals

The board subscription accepts `options.pollIntervalMs` to override the 30-second default. The backup poll interval is `max(pollIntervalMs, 30000)` or 60 seconds by default. To adjust globally, modify the `BLOCK_EXPIRY_POLL_INTERVAL` constant in `TennisQueries.js`.

## Monitoring and Debugging

### First-Response Checklist

1. **Check Vercel deployment status** — Vercel dashboard → Deployments. Look for failed builds or recent deploys.
2. **Check browser DevTools console** — Look for CSP violations (`Refused to execute...`), API errors, or React errors.
3. **Check Supabase dashboard** — Edge Function logs for backend errors. Database → check RLS policies if access issues.
4. **Check network tab** — Failed API calls (4xx/5xx from Edge Functions). CORS errors indicate CSP or Supabase config issues.

### Logs

| Source | Location | Level Control |
|--------|----------|---------------|
| Client (browser) | Browser DevTools console | `VITE_DEBUG_MODE=true` for verbose logging; default is warn-level |
| Vercel | Vercel dashboard → Functions tab | Serverless function logs (if applicable) |
| Supabase | Supabase dashboard → Edge Functions → Logs | Edge Function execution logs |
| CI | GitHub Actions → workflow run | Build and test output |

Client-side logging uses `src/lib/logger.js` with levels: NONE(0), ERROR(1), WARN(2), INFO(3), DEBUG(4). Debug mode enabled via `VITE_DEBUG_MODE=true` or automatically in dev builds (`import.meta.env.DEV`).

### Common Issues

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Blank page after deploy | Build failure or missing env vars | Check Vercel build logs; verify env vars in dashboard |
| "Loading Court Display..." stuck | Tennis IIFE modules not loading | Check browser console for script errors; verify CSP allows `script-src 'self'` |
| Stale court data | Polling not running | Check if tab is in background (polling pauses when hidden); force refresh |
| CSP violation in console | New external resource not in policy | Add domain to appropriate CSP directive in `vercel.json` |
| API calls returning 401 | Invalid or expired anon key | Rotate `VITE_SUPABASE_ANON_KEY` in Vercel env vars |

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for additional debugging scenarios.

## Secret Rotation

| Secret | Location | Rotation Procedure |
|--------|----------|-------------------|
| `VITE_SUPABASE_ANON_KEY` | Vercel env vars | Update in Vercel dashboard → Project Settings → Environment Variables → redeploy |
| `VITE_SUPABASE_URL` | Vercel env vars | Update in Vercel dashboard → redeploy (only if migrating Supabase projects) |

No build step caches secrets — a new deployment picks up updated values immediately. Dev defaults in `runtimeConfig.js` are anon keys only (not service role keys).

## Admin Access Control

### Current Mode: Open Admin (Test/Development)

**Assumptions:**
- System is accessed by trusted testers only
- Not deployed on public internet
- Admin URL (`/src/admin/`) is not advertised but is reachable by anyone with the URL

**Risk Statement:**
Admin panel has no authentication. Any user who discovers the admin URL has full operational control (block courts, clear sessions, modify settings).

**Acceptable when:**
- Deployed on trusted LAN or behind Vercel password protection
- All users are known testers
- No real member data at risk

**Mitigations available without code changes:**
- Vercel Deployment Protection (password gate on preview/production URLs)
- IP allowlisting at CDN/DNS level
- Basic auth via Vercel middleware (zero app code)

**Production deployment:** Enable `VITE_ADMIN_ACCESS_MODE=authenticated` and implement Supabase Auth gate. See auth-ready seam in `src/admin/guards/adminAccessGuard.js`.

## Known Operational Considerations

- **Courtboard uses IIFE scripts** for display stability on the wall-mounted monitor. This is intentional (ADR-006). The IIFE boundary is fenced by ESLint rules.
- **Mobile shell uses 3 iframes** (registration, courtboard, camera feed) in `Mobile.html`. Camera feed at `camera.noltc.com` must be accessible (allowed in CSP `frame-src` and `connect-src`).
- **No user authentication** — the system is an honor-system kiosk. Admin access is via URL path, not login. See [SECURITY_WP.md](SECURITY_WP.md) for threat model.
- **Block expiry is passive** — blocks expire by timestamp comparison, not by database signal. The 30-second poll catches expired blocks. If the poll interval is too long, users may see expired blocks for up to one interval.
- **Always-visible displays** (courtboard, kiosk) never trigger the visibility-change refresh because they are never hidden. The 60-second backup poll keeps them current.

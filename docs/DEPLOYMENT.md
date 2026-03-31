# Deployment Guide

## Production (Verified)

Production URL: https://courtboard-noltc.vercel.app/

| App | URL |
|-----|-----|
| Registration (kiosk) | https://courtboard-noltc.vercel.app/src/registration/index.html |
| Admin Panel | https://courtboard-noltc.vercel.app/src/admin/index.html |
| Courtboard Display | https://courtboard-noltc.vercel.app/src/courtboard/index.html |

Source: README.md, docs/audits/handoff/ docs, vite.config.js comment ("root for Vercel").

## Vercel Configuration (Confirm in Dashboard)

Vercel is the production host. The following settings depend on the Vercel project configuration — confirm in the [Vercel dashboard](https://vercel.com/dashboard):

- **Connected repo and branch:** Expected to be this repo, `main` branch
- **Build command:** Defined in `vercel.json` — runs quality ratchets before `npm run build`
- **Output directory:** Expected `dist/`
- **Auto-deploy on push:** Expected enabled for `main`
- **Preview deployments:** Expected enabled for pull requests
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE_URL` — set in Vercel dashboard, not in repo

## GitHub Pages (Legacy)

A GitHub Pages deployment workflow exists at `.github/workflows/deploy.yml`. It was created during initial project scaffold (Dec 2024) and has never been updated. Its automatic trigger has been disabled (dispatch-only).

**Status:** Unknown whether GitHub Pages is enabled in repo settings. To determine:
1. Go to GitHub repo → Settings → Pages
2. If "Source" shows a branch or GitHub Actions, Pages may be active
3. If disabled or unconfigured, the workflow is fully inert

**Action required:** Confirm Pages status. If disabled, deploy.yml can be deleted.

## Quality Gates

### Vercel Build (vercel.json)

The `vercel.json` build command runs quality ratchets before `npm run build`. If any ratchet fails, the Vercel build fails and deployment is blocked.

| Gate | Runs In | Blocks Deploy? |
|------|---------|----------------|
| Lint ratchet | Vercel build | Yes (if Vercel uses repo build settings) |
| Type ratchet | Vercel build | Yes |
| Coverage ratchet (runs all unit tests) | Vercel build | Yes |
| Fixture tests | Vercel build | Yes |
| Build (`vite build`) | Vercel build | Yes |
| E2E tests (Playwright) | GitHub Actions `verify.yml` | Independent — blocks merge only if branch protection enabled |

### To fully block broken code from production:
1. Verify `vercel.json` build command is active (check Vercel dashboard → project settings → build command)
2. Enable GitHub branch protection on `main` requiring the "Verify" status check to pass before merge

## Environment Variables

Vite injects environment variables at build time via `import.meta.env`. The config module (`src/config/runtimeConfig.js`) falls back to development defaults if variables are missing.

| Variable | Purpose | Where Set |
|----------|---------|-----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Vercel dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Vercel dashboard |
| `VITE_BASE_URL` | API base URL (optional) | Vercel dashboard |

### Build-Time Validation

`scripts/check-env.js` runs as the first step of the Vercel build command. It validates that all required `VITE_*` variables are present (without logging values). If any are missing, the build fails with a clear error message. The check only runs in Vercel builds (`VERCEL=1`) — it is skipped in local development and GitHub Actions.

The enforced build contract is defined in `scripts/check-env.js`. Keep it consistent with `.env.example` and this document.

> **Known issue:** `runtimeConfig.js` has a dead-code production check — `DEV_DEFAULTS` applied via `||` before the `!value` test means missing env vars silently use dev credentials at runtime. The build-time script above is the real gate preventing this.

## Local Development

No environment file is required for local development. The config module
falls back to development defaults automatically.

To use custom values, create `.env.local` from the template:

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Note: `.env.local` is gitignored and should never be committed.

## Security Headers

Security headers are configured in `vercel.json` and applied to all routes.

### Content Security Policy

CSP is **fully enforced** on all routes via `Content-Security-Policy` header in `vercel.json`. All scripts are bundled by Vite (`script-src 'self'` — no inline scripts, no CDN). See [CSP_ROLLOUT.md](./CSP_ROLLOUT.md) for the full rollout history.

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Baseline deny |
| `script-src` | `'self'` | All scripts bundled by Vite — no inline, no CDN |
| `style-src` | `'self' 'unsafe-inline'` | React style injection requires inline styles |
| `connect-src` | `'self' https://…supabase.co wss://…supabase.co https://camera.noltc.com` | Supabase REST + Realtime WebSocket + camera |
| `frame-src` | `'self' https://camera.noltc.com` | Internal iframes + wet court camera |
| `frame-ancestors` | `'self'` | Clickjacking defense |
| `img-src` | `'self' data:` | Favicon data URI |
| `font-src` | `'self'` | Local fonts only |
| `object-src` | `'none'` | Block plugins |
| `base-uri` | `'self'` | Prevent base tag hijacking |
| `form-action` | `'self'` | Prevent form exfiltration |

**If the production Supabase URL changes**, update `connect-src` in `vercel.json` to match the new host (both `https://` and `wss://`).

### Other Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `X-Frame-Options` | `SAMEORIGIN` | Legacy clickjacking defense. If cross-origin embedding is needed later, switch to `frame-ancestors` in enforced CSP and remove XFO. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Restrict sensitive APIs |

## Configuration Reference

See [ENVIRONMENT.md](./ENVIRONMENT.md) for the complete list of environment
variables, feature flags, and troubleshooting guidance.

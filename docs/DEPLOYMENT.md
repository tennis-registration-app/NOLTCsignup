# Deployment Guide

## Production (Verified)

Production URL: https://courtboard-noltc.vercel.app/

| App | URL |
|-----|-----|
| Registration (kiosk) | https://courtboard-noltc.vercel.app/src/registration/index.html |
| Admin Panel | https://courtboard-noltc.vercel.app/src/admin/index.html |
| Courtboard Display | https://courtboard-noltc.vercel.app/src/courtboard/index.html |

Source: README.md, handoff_audit docs, vite.config.js comment ("root for Vercel").

## Vercel Configuration (Confirm in Dashboard)

Vercel is the production host. The following settings depend on the Vercel project configuration — confirm in the [Vercel dashboard](https://vercel.com/dashboard):

- **Connected repo and branch:** Expected to be this repo, `main` branch
- **Build command:** Expected `npm run build` (Vite auto-detected) unless overridden by `vercel.json`
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

## Environment Variables

Vite injects environment variables at build time via `import.meta.env`. The config module (`src/config/runtimeConfig.js`) falls back to development defaults if variables are missing.

| Variable | Purpose | Where Set |
|----------|---------|-----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Vercel dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Vercel dashboard |
| `VITE_BASE_URL` | API base URL (optional) | Vercel dashboard |

## Local Development

No environment file is required for local development. The config module
falls back to development defaults automatically.

To use custom values, create `.env.local` from the template:

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Note: `.env.local` is gitignored and should never be committed.

## Configuration Reference

See [ENVIRONMENT.md](./ENVIRONMENT.md) for the complete list of environment
variables, feature flags, and troubleshooting guidance.

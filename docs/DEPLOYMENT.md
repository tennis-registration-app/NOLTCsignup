# Deployment Guide

> **Note:** This document describes configuration requirements. It does not
> change or enforce deployment behavior. No pipeline or workflow files are
> modified by this work package.

## Vercel (Recommended)

### Build-Time Environment Variables

Vite injects environment variables at build time. For Vercel deployment,
configure project environment variables:

1. Go to **Project Settings → Environment Variables**
2. Add the following variables:
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public key
   - `VITE_BASE_URL` — (Optional) API base URL; derived from SUPABASE_URL if omitted

3. Select which environments should use each variable (Production, Preview, Development)

4. Redeploy for changes to take effect

### Validation

The configuration module validates environment variables at runtime:

- **Dev/Preview builds**: Fall back to built-in defaults if env vars are missing
- **Production builds**: Use defaults if env vars are empty (defaults are working demo credentials)

For production deployments with custom Supabase instances, ensure all three
environment variables are set to your production values.

## GitHub Pages

### Build-Time Environment Variables via GitHub Actions

For GitHub Pages deployment via GitHub Actions, configure repository secrets:

1. Go to **Settings → Secrets and variables → Actions**
2. Add repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BASE_URL` (optional)

3. Expose them in your build step:

```yaml
- name: Build
  run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    VITE_BASE_URL: ${{ secrets.VITE_BASE_URL }}
```

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

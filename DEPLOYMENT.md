# Deployment

## Current Hosting

**Platform:** Vercel
**Base URL:** https://courtboard-noltc.vercel.app

### Component URLs

> Note: URLs verified working as of 2026-01-24

| Component | URL |
|-----------|-----|
| Homepage | https://courtboard-noltc.vercel.app/ |
| Registration Kiosk | https://courtboard-noltc.vercel.app/src/registration/index.html |
| Admin Panel | https://courtboard-noltc.vercel.app/src/admin/index.html |
| Courtboard Display | https://courtboard-noltc.vercel.app/src/courtboard/index.html |
| Mobile Interface | https://courtboard-noltc.vercel.app/Mobile.html |

## Build Configuration

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 18.x+ (Vercel default) |

## Deployment Process

- **Typical:** Vercel deploys on push to `main` when connected to GitHub
- **Preview deployments:** Created automatically for pull requests (if configured)

## Legacy

GitHub Pages deployment workflow remains in `.github/workflows/deploy.yml` but is no longer the primary hosting method.

## Next Steps (Phase 4)

Phase 4 will plan and implement environment variables for Supabase configuration:
- Move `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Vercel environment variables
- Add `.env.example` for local development
- Update documentation with deployment requirements

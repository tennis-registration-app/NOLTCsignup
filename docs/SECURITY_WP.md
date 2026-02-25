# Security Posture — NOLTC Tennis Registration System

## Deployment Context

- **Registration Kiosk**: wall-mounted tablet, trusted LAN, staff-supervised area
- **Admin Panel**: accessed by staff via browser, no authentication (auth-ready seam exists)
- **Courtboard Display**: lobby-mounted display, read-only
- **Mobile Shell**: member phones via QR code, 3-iframe layout (`Mobile.html`)

## Content Security Policy

**Status: Fully enforced on all routes** (see [CSP_ROLLOUT.md](CSP_ROLLOUT.md))

Configured in `vercel.json`, applied to all paths:

```
default-src   'self'
script-src    'self'                          — no inline scripts, no CDN
style-src     'self' 'unsafe-inline'          — retained for React style injection
connect-src   'self' <supabase-url> camera.noltc.com
frame-src     'self' camera.noltc.com         — mobile shell camera feed
frame-ancestors 'self'                        — prevents clickjacking
img-src       'self' data:
font-src      'self'
object-src    'none'
base-uri      'self'
form-action   'self'
```

Additional headers: `X-Content-Type-Options: nosniff`

## Authentication & Authorization

**Current mode: Open (test/development)**

| Surface | Auth status | Notes |
|---------|------------|-------|
| Registration kiosk | None | Honor-system — member enters own ID |
| Admin panel | None | URL-path access, no login required |
| Courtboard | None | Read-only display, no actions |
| Mobile shell | None | Same as kiosk, accessed via QR |
| Supabase Edge Functions | Anon key | RLS policies enforce access control |

**Auth-ready seam:**
- Config: `VITE_ADMIN_ACCESS_MODE` (`open` or `authenticated`) in `src/config/runtimeConfig.js`
- Guard: `src/admin/guards/adminAccessGuard.js`
- Wiring point: `src/admin/App.jsx` (comment documents where to add `useAdminAccess()`)
- Production lockdown: enable Supabase Auth + Edge Function JWT verification

**Device identity:**
- Kiosk, admin, mobile identified by hardcoded device UUIDs
- Device IDs are client-generated (spoofable) — no sensitive actions gated by device ID
- Edge Functions do not verify caller identity beyond anon key

## Data Protection

| Concern | Mitigation |
|---------|-----------|
| Database writes | All mutations via Supabase Edge Functions (no direct DB writes from client) |
| Script injection | CSP `script-src 'self'` — no inline scripts allowed |
| localStorage access | Restricted to `src/platform/` boundary (ESLint enforced) |
| Sensitive data in client | No PII beyond member names and numbers |
| Member data at rest | localStorage only (cleared on browser reset) |

## Input Validation

**Client-side (defense in depth, not security boundary):**
- Zod schemas on command DTOs — fail-fast before API calls (`src/lib/commands/`)
- Domain validation in normalizers — after API response (`src/lib/normalize/`)
- Guard clauses in orchestrators — before state mutations
- `DenialCodes` enum for all backend rejection codes — no raw string comparisons

**Server-side (security boundary):**
- Supabase RLS policies on all tables
- Edge Function input validation
- Edge Functions are the sole write path

## Attack Surface

| Vector | Current Mitigation | Residual Risk |
|--------|-------------------|---------------|
| Admin URL discovery | None (open by design for LAN) | Full admin access if URL known — **enable auth before internet exposure** |
| XSS via inline scripts | CSP `script-src 'self'` | Low — all scripts bundled by Vite |
| XSS via member names | React auto-escaping + CSP | Low |
| Supabase anon key exposure | RLS policies on all tables | Medium — anon key is client-bundled, grants RLS-scoped access |
| iframe clickjacking | `frame-ancestors 'self'` | Low |
| CSRF | No session cookies to steal | Low — API uses bearer-style anon key |
| Member data in localStorage | Platform-restricted access | Low — no PII beyond names/member numbers |
| Device ID spoofing | No sensitive actions gated by ID | Low |
| Kiosk physical tampering | Staff-supervised area | Low |
| Stale session replay | Server-side session validation | Medium — depends on Edge Function implementation |

## Threat Model Assumptions

- **Kiosk deployment**: physical access is controlled (club facility)
- **LAN deployment**: network is trusted (club WiFi, no public internet exposure)
- **Internet exposure**: **NOT safe without auth** — requires admin auth implementation first
- **Multi-club deployment**: NOT supported — single-tenant architecture
- **Data sensitivity**: Low — member names and court assignments only

## Recommended Mitigations (Production Deployment)

| Priority | Mitigation | Status | Effort |
|----------|-----------|--------|--------|
| 1 | **Enable admin auth** | Auth-ready seam in place | Low — wire guard + Supabase Auth |
| 2 | Vercel Deployment Protection for preview URLs | Not configured | Low |
| 3 | Rate limiting on Edge Functions | Not implemented | Medium |
| 4 | Supabase RLS policy audit | Not audited | Medium |
| 5 | Session timeout for admin panel | Not implemented | Low |
| 6 | Audit logging for admin operations | Not implemented | Medium |
| 7 | `style-src` hardening (remove `unsafe-inline`) | Deferred (see CSP Stage 5) | High |

## Completed Mitigations

- [x] CSP fully enforced on all routes (Stages 1-4)
- [x] All inline scripts extracted to ES modules
- [x] Tailwind CDN removed, bundled via PostCSS
- [x] `X-Content-Type-Options: nosniff` header
- [x] `frame-ancestors 'self'` prevents clickjacking
- [x] localStorage access boundary enforced by ESLint
- [x] Command DTOs validated by Zod schemas
- [x] DenialCodes enum eliminates raw string comparisons
- [x] Error normalization via `AppError` + `ErrorCategories`

# Security Work Package — Scope & Threat Model

## Deployment Context
- Tennis club kiosk (physical access controlled)
- Staff admin panel (URL-path access)
- Mobile shell (club WiFi)
- Courtboard display (read-only, public area)

## Assets
- Member roster (names, IDs — no PII beyond names)
- Court assignments and waitlist state
- Block schedules
- Admin settings (pricing, hours)
- Supabase anon key (client-bundled, RLS-protected)

## Current Posture
- No user authentication
- Admin access via URL path detection
- Device IDs generated client-side (spoofable)
- Supabase RLS provides backend access control
- No CSP headers configured
- No rate limiting on client-side API calls

## Attack Surface
| Vector | Risk | Current Mitigation |
|---|---|---|
| Direct API calls with anon key | Medium | RLS policies |
| Admin URL discovery | Low | Club network only |
| Device ID spoofing | Low | No sensitive actions gated by ID |
| XSS via member names | Low | React auto-escaping |
| CSRF | Low | No session cookies |
| Kiosk physical tampering | Low | Staff-supervised area |

## Recommended Mitigations (Priority Order)
1. **RLS audit** — verify all tables have
   appropriate policies, test with anon key directly
2. **CSP headers** — add Content-Security-Policy
   via Vercel config or meta tag
3. **Input validation** — server-side name/group
   validation in Edge Functions
4. **Rate limiting** — Edge Function rate limits
   for write operations
5. **Admin auth** — simple PIN/password gate for
   admin route (when needed)
6. **Audit logging** — log admin actions to
   Supabase table
7. **Secret scanning** — add pre-commit hook or
   CI check for leaked credentials

## Decision
Items 1-4 are recommended for current deployment.
Items 5-7 are required if deployment expands
beyond club network.

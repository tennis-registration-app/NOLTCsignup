# CSP Enforcement Rollout Plan

## Current State (Report-Only)

Policy deployed via `vercel.json` headers block, applying to ALL routes.
Mode: `Content-Security-Policy-Report-Only` (not enforced).

Key compromises:
- `script-src 'unsafe-inline'` — required by 5 inline `<script>` blocks + Tailwind CDN runtime
- `style-src 'unsafe-inline'` — required by React inline styles + Mobile.html inline styles
- `https://cdn.tailwindcss.com` — Tailwind loaded as runtime CDN script (not bundled)

## Enforcement Blockers by Route

### Courtboard (`/src/courtboard/`)
**Status: READY TO ENFORCE**
- ✅ Zero inline scripts (all external via Vite build)
- ✅ Tailwind bundled via PostCSS (no CDN)
- ✅ 5 external script tags only
- ⚠️ Shares CSP header with other routes (vercel.json applies globally)

### Registration (`/src/registration/`)
**Status: 3 blockers**
1. Tailwind CDN `<script src="https://cdn.tailwindcss.com">` — runtime compiler
2. `IS_MOBILE_VIEW` detection inline script (198 chars)
3. Cache warm inline script (147 chars)
4. File protocol warning inline script (715 chars, dev-only)

### Admin (`/src/admin/`)
**Status: 2 blockers**
1. Tailwind CDN `<script src="https://cdn.tailwindcss.com">` — runtime compiler
2. Cache warm inline script (147 chars, same as registration)
3. File protocol warning inline script (715 chars, dev-only)

### Mobile.html (`/Mobile.html`)
**Status: 1 blocker**
1. `onclick="hideReg()"` inline event handler on close button

### Test pages (`/src/test-api/`, `/src/test-react/`)
**Status: Non-production, exempt**

## Staged Rollout Plan

### Stage 0: Reporting (current)
- [x] CSP Report-Only header deployed
- [ ] Add `report-uri` directive pointing to logging endpoint
  - Options: Supabase Edge Function, Sentry CSP, or third-party collector
  - Collect violations before enforcement

### Stage 1: Enforce on Courtboard (lowest risk) — DONE
- [x] Per-route header in vercel.json: `/src/courtboard/(.*)` gets enforced CSP
- [x] All other routes remain on Report-Only (catch-all)
- [x] `script-src 'self'` only (no `unsafe-inline`, no CDN)
- Courtboard policy:
  ```
  Content-Security-Policy:
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    connect-src 'self' https://dncjloqewjubodkoruou.supabase.co https://camera.noltc.com;
    frame-src 'self' https://camera.noltc.com;
    frame-ancestors 'self';
    img-src 'self' data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self'
  ```
- `style-src 'unsafe-inline'` retained — courtboard CSS uses `style=` via React

### Stage 2: Extract Inline Scripts (registration + admin)
- Extract `IS_MOBILE_VIEW` detection → `/src/registration/mobile-detect.js`
- Extract cache warm → `/src/shared/cache-warm.js`
- Extract file protocol warning → `/src/shared/file-warning.js` (or remove for prod)
- Fix `onclick="hideReg()"` → `addEventListener` in Mobile.html
- All scripts are synchronous, order-dependent — use `<script src="...">` (not `type="module"`)
- After extraction: registration + admin can drop `'unsafe-inline'` from script-src

### Stage 3: Bundle Tailwind (registration + admin)
- Registration and Admin currently load `https://cdn.tailwindcss.com` as a runtime compiler
- Replace with build-time Tailwind via PostCSS (same as courtboard already uses)
- Steps:
  1. Add `@tailwind` directives to registration/admin CSS entry points
  2. Verify Vite PostCSS config processes them (already configured for courtboard)
  3. Remove `<script src="https://cdn.tailwindcss.com">` from both HTML files
  4. Remove `https://cdn.tailwindcss.com` from CSP allowlist
- **This is the largest lift** — requires testing all Tailwind utility classes still work
- Risk: Tailwind CDN runtime compiler supports arbitrary classes in HTML;
  build-time Tailwind only includes classes found by content scanner.
  Must verify all Tailwind classes are detected by `tailwind.config.js` content paths.

### Stage 4: Full Enforcement
- With all blockers resolved, switch ALL routes from Report-Only to enforced
- Final policy (target):
  ```
  Content-Security-Policy:
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    connect-src 'self' https://dncjloqewjubodkoruou.supabase.co https://camera.noltc.com;
    frame-src 'self' https://camera.noltc.com;
    frame-ancestors 'self';
    img-src 'self' data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self'
  ```
- `'unsafe-inline'` removed from `script-src`
- `style-src 'unsafe-inline'` retained (React needs it; removal requires CSS-in-JS migration — low ROI)
- `https://cdn.tailwindcss.com` removed

### Stage 5 (future): style-src hardening
- Replace `'unsafe-inline'` in `style-src` with nonce-based approach
- Requires Vite plugin to inject nonces at build time or server-side middleware
- Lower priority — inline styles are lower risk than inline scripts

## Rollback Plan

Each stage is independently reversible:
1. Revert vercel.json header change (1-line diff)
2. Redeploy via `git push` (Vercel auto-deploys)
3. Propagation: immediate (Vercel edge headers, no CDN cache)

## Reporting Endpoint Options

| Option | Effort | Quality | Notes |
|--------|--------|---------|-------|
| Sentry CSP | Low | High | If already using Sentry; built-in CSP report ingestion |
| Supabase Edge Function | Medium | Medium | Custom `/api/csp-report` that logs to a table |
| Report URI (third-party) | Low | Medium | report-uri.com or similar SaaS |
| Vercel Edge Middleware | Medium | Medium | Log violations, forward to logging stack |
| Manual browser DevTools | Zero | Low | Check Console for Report-Only violations during testing |

**Recommended for this project:** Manual DevTools testing for Stage 1 (courtboard only), then add Supabase Edge Function before Stage 4 (full enforcement).

## Inline Script Inventory

| # | Script | Size | Files | Extractable? |
|---|--------|------|-------|-------------|
| 1 | IS_MOBILE_VIEW detection | 198 chars | registration | Yes → `mobile-view-detect.js` |
| 2 | Cache warm (localStorage parse) | 147 chars | registration, admin | Yes → `cache-warm.js` |
| 3 | File protocol warning (dev-only) | 715 chars | registration, admin | Yes → `file-protocol-warn.js` |
| 4 | `onclick="hideReg()"` | 14 chars | Mobile.html | Yes → addEventListener in ESM |

## CDN Dependency Inventory

| CDN | Routes | Purpose | Removal plan |
|-----|--------|---------|-------------|
| `cdn.tailwindcss.com` | registration, admin | Tailwind CSS runtime compiler | Bundle via PostCSS (Stage 3) |

## Risk Assessment

| Stage | Risk | Mitigation |
|-------|------|------------|
| 1 (Courtboard enforce) | Low — zero inline scripts | Report-Only first, enforce after clean report |
| 2 (Extract inline scripts) | Low — mechanical extraction | Scripts are tiny, order-preserved, no logic change |
| 3 (Bundle Tailwind) | Medium — class scanning miss | Full visual regression test on registration + admin |
| 4 (Full enforcement) | Low — all blockers already resolved | Graduate from Report-Only after clean report |

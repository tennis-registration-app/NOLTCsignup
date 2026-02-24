# CSP Enforcement Rollout Plan

## Current State (Enforced)

Policy deployed via `vercel.json` headers block, applying to ALL routes.
Mode: `Content-Security-Policy` (enforced — Stage 4 complete).

Single catch-all route `/(.*)`; courtboard-specific route removed (was redundant).

Enforced policy:
- `script-src 'self'` — no `unsafe-inline`, no CDN allowlists
- `style-src 'self' 'unsafe-inline'` — required by React inline styles (Stage 5 future work)
- ~~`https://cdn.tailwindcss.com`~~ — removed; Tailwind now bundled via PostCSS (Stage 3)

## Enforcement Blockers by Route

### Courtboard (`/src/courtboard/`)
**Status: ENFORCED** ✅
- Zero inline scripts (all external via Vite build)
- Tailwind bundled via PostCSS (no CDN)
- Enforced since Stage 1

### Registration (`/src/registration/`)
**Status: ENFORCED** ✅
1. ~~Tailwind CDN~~ — removed; bundled via PostCSS (`src/registration/styles/index.css`)
2. ~~`IS_MOBILE_VIEW` detection inline script~~ — extracted to `src/registration/bootstrap/mobileViewDetect.js`
3. ~~Cache warm inline script~~ — extracted to `src/shared/bootstrap/cacheWarm.js`
4. ~~File protocol warning inline script~~ — extracted to `src/shared/bootstrap/fileProtocolWarning.js`

### Admin (`/src/admin/`)
**Status: ENFORCED** ✅
1. ~~Tailwind CDN~~ — removed; bundled via PostCSS (`src/admin/styles/index.css`)
2. ~~Cache warm inline script~~ — extracted to `src/shared/bootstrap/cacheWarm.js`
3. ~~File protocol warning inline script~~ — extracted to `src/shared/bootstrap/fileProtocolWarning.js`

### Mobile.html (`/Mobile.html`)
**Status: ENFORCED** ✅
1. ~~`onclick="hideReg()"`~~ — replaced with `addEventListener` in `mobileBridge.js`

### Test pages (`/src/test-api/`, `/src/test-react/`)
**Status: Non-production, exempt** (inline handler in test-api tolerated)

## Staged Rollout Plan

### Stage 0: Reporting — DONE
- [x] CSP Report-Only header deployed
- [x] Reporting phase used for Stages 1–3; Report-Only header now removed (Stage 4)

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

### Stage 2: Extract Inline Scripts (registration + admin) — DONE
- [x] Extract file protocol warning → `src/shared/bootstrap/fileProtocolWarning.js` (Commit 1)
- [x] Extract cache warm → `src/shared/bootstrap/cacheWarm.js` (Commit 2)
- [x] Extract `IS_MOBILE_VIEW` detection → `src/registration/bootstrap/mobileViewDetect.js` (Commit 3)
- [x] Fix `onclick="hideReg()"` → `addEventListener` in `mobileBridge.js` (Commit 3)
- All extracted as `<script type="module">` entry points (Vite bundles them in production)
- Result: zero inline `<script>` blocks in registration and admin HTML
- Result: zero inline event handlers in Mobile.html
- Remaining `'unsafe-inline'` dependency: Tailwind CDN only (Stage 3)

### Stage 3: Bundle Tailwind (registration + admin) — DONE
- [x] Create CSS entry points: `src/registration/styles/index.css`, `src/admin/styles/index.css` (Commit 1)
- [x] Extract registration inline `<style>` to `src/registration/styles/registration.css` (Commit 1)
- [x] Import CSS in `main.jsx` entry points (Commit 1)
- [x] Verify build produces CSS chunks: registration (57KB), admin (57KB) (Commit 1)
- [x] Remove `<script src="https://cdn.tailwindcss.com">` from both HTML files (Commit 2)
- Result: zero CDN references in src or dist
- `tailwind.config.js` content globs already covered `src/**/*.{js,jsx,ts,tsx}`

### Stage 4: Full Enforcement — DONE
- [x] Switched catch-all route `/(.*)`from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`
- [x] Removed `'unsafe-inline'` from `script-src`
- [x] Removed `https://cdn.tailwindcss.com` from `script-src`
- [x] Removed redundant courtboard-specific route (policy was identical to catch-all)
- [x] Zero `Report-Only` headers remaining
- Final enforced policy:
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
- `style-src 'unsafe-inline'` retained (React needs it; removal requires CSS-in-JS migration — low ROI)
- Rollback: revert commit `ebf1cfb` to restore Report-Only mode

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

**Status:** Reporting endpoint was not needed — manual DevTools testing during Stages 1–3 confirmed zero violations before full enforcement.

## Inline Script Inventory

| # | Script | Size | Files | Status |
|---|--------|------|-------|--------|
| 1 | IS_MOBILE_VIEW detection | 198 chars | registration | ✅ Extracted → `src/registration/bootstrap/mobileViewDetect.js` |
| 2 | Cache warm (localStorage parse) | 147 chars | registration, admin | ✅ Extracted → `src/shared/bootstrap/cacheWarm.js` |
| 3 | File protocol warning (dev-only) | 715 chars | registration, admin | ✅ Extracted → `src/shared/bootstrap/fileProtocolWarning.js` |
| 4 | `onclick="hideReg()"` | 14 chars | Mobile.html | ✅ Replaced → addEventListener in `mobileBridge.js` |

## CDN Dependency Inventory

| CDN | Routes | Purpose | Status |
|-----|--------|---------|--------|
| `cdn.tailwindcss.com` | ~~registration, admin~~ | Tailwind CSS runtime compiler | ✅ Removed — bundled via PostCSS (Stage 3) |

## Risk Assessment

| Stage | Risk | Mitigation |
|-------|------|------------|
| 1 (Courtboard enforce) | Low — zero inline scripts | Report-Only first, enforce after clean report |
| 2 (Extract inline scripts) | Low — mechanical extraction | Scripts are tiny, order-preserved, no logic change |
| 3 (Bundle Tailwind) | Medium — class scanning miss | Full visual regression test on registration + admin |
| 4 (Full enforcement) | Low — all blockers already resolved | Graduate from Report-Only after clean report |

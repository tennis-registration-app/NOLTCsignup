# WP6-A Security / Secrets / Config Audit Report

**Date:** 2026-02-05
**Auditor:** Claude Code
**Scope:** NOLTCsignup frontend repository
**Gate Status:** ✅ `npm run verify` passed (15/15 E2E tests), git tree clean

---

## Executive Summary

| Category | Finding | Severity |
|----------|---------|----------|
| Hardcoded secrets in source | Anon key + URL in `runtimeConfig.js` | 🟡 Review |
| Secrets in git history | Yes, committed in `runtimeConfig.js` | 🟡 Review |
| Secrets in production bundle | Yes, baked into minified JS | 🟡 Review |
| service_role key exposure | None found | 🟢 OK |
| .env files committed | No (only `.env.example` template) | 🟢 OK |
| .gitignore coverage | Comprehensive | 🟢 OK |
| Vite config security | No dangerous overrides | 🟢 OK |
| Edge Functions (this repo) | Not present (separate backend repo) | ℹ️ N/A |
| RLS policies (this repo) | Not present (separate backend repo) | ℹ️ N/A |

**Overall Assessment:** The codebase follows the documented "demo mode" security model. The anon key is public-by-design for Supabase, but the hardcoded fallback pattern means secrets persist in git history and production bundles. No critical vulnerabilities found—this is acceptable for demo/development but requires remediation before production use with real user data.

---

## D1 — Hardcoded Secrets Scan

### Findings

| File | Line | Content | Type | Severity |
|------|------|---------|------|----------|
| `src/config/runtimeConfig.js` | 18 | `SUPABASE_URL: 'https://dncjloqewjubodkoruou.supabase.co'` | URL | 🟡 Review |
| `src/config/runtimeConfig.js` | 19-20 | `SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIs...'` | JWT | 🟡 Review |
| `src/config/runtimeConfig.js` | 21 | `BASE_URL: 'https://dncjloqewjubodkoruou.supabase.co/functions/v1'` | URL | 🟡 Review |

### Analysis

The `DEV_DEFAULTS` object in `runtimeConfig.js` contains hardcoded Supabase credentials used as fallbacks when environment variables are not set:

```javascript
const DEV_DEFAULTS = {
  SUPABASE_URL: 'https://dncjloqewjubodkoruou.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  BASE_URL: 'https://dncjloqewjubodkoruou.supabase.co/functions/v1',
};
```

**Important Notes:**
- The JWT payload confirms `"role":"anon"` — this is the public anon key, not service_role
- No `service_role` key found anywhere in the frontend codebase ✅
- The pattern is intentional for zero-config development experience
- Production builds will use these defaults if env vars are not set

### Recommended Actions

1. **Phase 4 planned fix:** Remove hardcoded fallbacks, require env vars (documented in `PHASE4_CHARTER.md` as WP-S1)
2. After removing hardcoded values, rotate the Supabase anon key
3. Consider adding a build-time check that fails if VITE_* vars are missing

---

## D2 — Environment Variable Inventory

### VITE_* References Found

| Variable | File | Line | Purpose |
|----------|------|------|---------|
| `VITE_SUPABASE_URL` | `src/config/runtimeConfig.js` | 38 | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/config/runtimeConfig.js` | 41 | Supabase anon key |
| `VITE_BASE_URL` | `src/config/runtimeConfig.js` | 42 | API base URL (optional) |
| `VITE_USE_REAL_AI` | `src/config/runtimeConfig.js` | 91 | Feature flag |
| `VITE_ENABLE_WET_COURTS` | `src/config/runtimeConfig.js` | 94 | Feature flag |
| `VITE_DEBUG_MODE` | `src/config/runtimeConfig.js` | 97 | Debug logging flag |
| `VITE_DEBUG_MODE` | `src/lib/logger.js` | 45 | Debug logging flag |

### Non-VITE References (Vite built-ins)

| Variable | File | Purpose |
|----------|------|---------|
| `import.meta.env.DEV` | `src/config/runtimeConfig.js` | Development mode detection |
| `import.meta.env.PROD` | `src/config/runtimeConfig.js` | Production mode detection |
| `import.meta.env.MODE` | `src/config/runtimeConfig.js` | Build mode string |

### Environment Files

| File | Exists | In .gitignore | Content |
|------|--------|---------------|---------|
| `.env` | No | Yes | — |
| `.env.local` | Yes | Yes ✅ | Contains working Supabase credentials |
| `.env.example` | Yes | No (template) | Empty placeholder values |
| `.env.production` | No | Yes | — |

### Severity: 🟢 OK

- All env files properly gitignored
- `.env.example` contains only empty placeholders
- No non-VITE_ prefixed client-side env vars (correct Vite pattern)

---

## D3 — Supabase Client Configuration

### Client Instantiation Points

| File | Line | Pattern |
|------|------|---------|
| `src/registration/backend/TennisQueries.js` | 22 | `createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.ANON_KEY)` |
| `src/lib/RealtimeClient.js` | 34 | `createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.ANON_KEY, {...})` |

### Analysis

- **Single config source:** All Supabase clients source credentials from `API_CONFIG` (apiConfig.js)
- **Config chain:** `apiConfig.js` → `getSupabaseConfig()` → `runtimeConfig.js` → `import.meta.env.VITE_*`
- **Key type:** Only `anon` key used client-side ✅
- **No service_role:** Confirmed no `service_role` key in any frontend file ✅

### Direct Fetch Calls

The `src/lib/ApiAdapter.js` makes direct `fetch()` calls to the Supabase Edge Functions URL:

```javascript
async _fetch(endpoint, options = {}) {
  const url = `${this.baseUrl}${endpoint}`;  // baseUrl = SUPABASE_URL/functions/v1
  // ...
  Authorization: `Bearer ${this.anonKey}`,
}
```

This is the correct pattern—Edge Functions handle authorization, not direct database access.

### Severity: 🟢 OK

---

## D4 — Edge Function Security Review

### Findings

**Edge Functions are NOT in this repository.** Per `ARCHITECTURE.md`:

> | Repository | Contents | Deployment |
> |------------|----------|------------|
> | `NOLTCsignup/` (this repo) | Frontend applications (React/Vite) | GitHub Pages |
> | `noltc-backend/` | Supabase Edge Functions + migrations | Supabase |

### Items Requiring Backend Repo Audit

From `ARCHITECTURE.md` WP-B3b checklist:

- [ ] Edge Function auth check: Verify admin-only endpoints validate `deviceType` or auth token
- [ ] Service role key usage: Confirm Edge Functions use service role (not anon) for writes
- [ ] Rate limiting: Check if Edge Functions have rate limits configured

### Severity: ℹ️ N/A (Out of Scope)

**Recommended Action:** Conduct separate audit of `noltc-backend/` repository for Edge Function security.

---

## D5 — Vite Build Exposure Check

### vite.config.js Analysis

```javascript
export default defineConfig({
  plugins: [react({...}), copyPlainJsFiles()],
  base: '/',
  // No `define` overrides
  // No `envPrefix` overrides (defaults to 'VITE_')
  // ...
});
```

- **No `define` overrides:** Secrets not injected via Vite define
- **Default `envPrefix`:** Only `VITE_*` vars exposed (correct)
- **No env leakage in config:** Configuration is clean

### Production Bundle Analysis

After `npm run build`, searching the output:

```bash
$ grep -l "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" dist/assets/*.js
dist/assets/normalizeError-lctBgKPd.js
```

**The anon key IS present in the production bundle:**

```javascript
// In minified output:
const g={...,VITE_SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",...}
```

### Analysis

This is expected behavior:
1. `import.meta.env` is replaced at build time with actual values
2. The `DEV_DEFAULTS` object is inlined into the bundle
3. Even with env vars set, the fallback code path remains in the bundle

### Severity: 🟡 Review

**Recommended Actions:**
1. After Phase 4 fix (remove DEV_DEFAULTS), rebuild to verify secrets no longer in bundle
2. Consider conditional compilation or dead code elimination for fallback paths
3. Rotate anon key after removing hardcoded values from git history

---

## D6 — Git History Check

### Environment Files

```bash
$ git log --all --diff-filter=A --name-only -- '*.env*'
408ab0b docs: add .env.example template
.env.example
```

- **Only `.env.example` committed** (correct—empty template)
- No `.env`, `.env.local`, or `.env.production` in git history ✅

### .gitignore Coverage

```gitignore
.env
.env.local
.env.*.local
.env.production
.env.production.local
```

Coverage is comprehensive. ✅

### Secrets in Source Code History

```bash
$ git log --all -p -- 'src/config/runtimeConfig.js' | grep "eyJ"
+    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**The hardcoded anon key was committed to git history** when `runtimeConfig.js` was created.

### Severity: 🟡 Review

**Recommended Actions:**
1. After removing hardcoded values, consider history rewrite (git filter-branch) if this becomes a public repo
2. Rotate the Supabase anon key after remediation
3. For now, this is acceptable as the repo appears to be private and the key is public-by-design

---

## D7 — RLS / Supabase Policy Review

### Findings

**No SQL migrations or RLS policies exist in this repository.**

Per `ARCHITECTURE.md`:
- Database schema and RLS policies are in `noltc-backend/` repository
- Current status: "Demo mode" with potentially permissive RLS

### Documentation of Security Model

From `ARCHITECTURE.md:362`:

> ⚠️ **This system is currently in open demo mode.** Anyone with access to the URL can perform any action, including admin operations. Security currently relies primarily on physical access control (kiosk located in a private club). Database Row Level Security (RLS) policies exist but may be permissive in demo mode.

### Items Requiring Backend Repo Audit

From `ARCHITECTURE.md:569`:

- [ ] RLS policy audit: Document policies on all tables (members, sessions, blocks, waitlist, transactions)
- [ ] CORS configuration: Document allowed origins in Supabase dashboard
- [ ] Verify all tables have appropriate row-level security

### Severity: ℹ️ N/A (Out of Scope)

**Recommended Action:** Conduct RLS audit in `noltc-backend/` repository and Supabase dashboard.

---

## Summary of Recommended Actions

### Immediate (Before Production Use)

| Priority | Action | Owner | Documented In |
|----------|--------|-------|---------------|
| 🔴 High | Remove DEV_DEFAULTS from `runtimeConfig.js` | Phase 4 | PHASE4_CHARTER.md WP-S1 |
| 🔴 High | Require env vars, fail build if missing | Phase 4 | PHASE4_CHARTER.md WP-S1 |
| 🟡 Medium | Rotate Supabase anon key after remediation | Post-Phase 4 | ARCHITECTURE.md |
| 🟡 Medium | Audit RLS policies in backend repo | WP-B3b | ARCHITECTURE.md |
| 🟡 Medium | Audit Edge Function auth in backend repo | WP-B3b | ARCHITECTURE.md |

### Deferred (Production Hardening)

| Priority | Action | Notes |
|----------|--------|-------|
| 🟡 Medium | Add admin authentication | Currently URL-path only |
| 🟡 Medium | Implement device enrollment | Replace client-supplied IDs |
| 🟢 Low | Consider git history rewrite | Only if repo becomes public |
| 🟢 Low | Enable rate limiting | Protect mutation endpoints |

---

## Conclusion

The security posture is **acceptable for demo/development** but **requires Phase 4 remediation before production use**. Key findings:

1. **No critical vulnerabilities:** No service_role key exposure, no .env files in git
2. **Known technical debt:** Hardcoded anon key documented and scheduled for Phase 4
3. **Demo mode acknowledged:** Security model explicitly documented as "open demo mode"
4. **Clear remediation path:** PHASE4_CHARTER.md and ARCHITECTURE.md have detailed action items

The audit confirms the codebase matches its documented security model. Proceed with Phase 4 remediation work when scheduled.

---

*Report generated by WP6-A Discovery audit. For questions, see ARCHITECTURE.md Security Model section.*

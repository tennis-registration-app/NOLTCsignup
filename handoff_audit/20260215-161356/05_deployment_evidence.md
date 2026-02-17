# Deployment Evidence

## Vercel config (if present)

## Supabase / Edge function directories (if present)

## Search for Supabase usage + Edge function references

## Deployment docs
docs/verification-checklist.md:7:| Supabase Project | dncjloqewjubodkoruou |
docs/verification-checklist.md:295:- **P0**: Data integrity issue, security breach, or complete feature failure. Blocks release.
docs/verification-checklist.md:297:- **P2**: Minor issue, cosmetic, or edge case. Can defer.
docs/verification-checklist.md:307:## Release Candidate Criteria
docs/ARCHITECTURE_MAP.md:144:- **Docs:** `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`
docs/ARCHITECTURE_MAP.md:175:rg "supabase.*url|anon.*key" src/ --glob "*.js" | rg -v "src/config/"
docs/ARCHITECTURE_MAP.md:207:│ (Edge Fn)     │      └───────┬───────┘       └───────┬───────┘
docs/ARCHITECTURE_MAP.md:225:- `supabase/functions/update-session-tournament/` — Edge Function to toggle flag
docs/SECURITY_WP.md:3:## Deployment Context
docs/SECURITY_WP.md:14:- Supabase anon key (client-bundled, RLS-protected)
docs/SECURITY_WP.md:20:- Supabase RLS provides backend access control
docs/SECURITY_WP.md:38:   via Vercel config or meta tag
docs/SECURITY_WP.md:40:   validation in Edge Functions
docs/SECURITY_WP.md:41:4. **Rate limiting** — Edge Function rate limits
docs/SECURITY_WP.md:46:   Supabase table
docs/SECURITY_WP.md:51:Items 1-4 are recommended for current deployment.
docs/SECURITY_WP.md:52:Items 5-7 are required if deployment expands
docs/DEPLOYMENT.md:1:# Deployment Guide
docs/DEPLOYMENT.md:4:> change or enforce deployment behavior. No pipeline or workflow files are
docs/DEPLOYMENT.md:7:## Vercel (Recommended)
docs/DEPLOYMENT.md:11:Vite injects environment variables at build time. For Vercel deployment,
docs/DEPLOYMENT.md:16:   - `VITE_SUPABASE_URL` — Supabase project URL
docs/DEPLOYMENT.md:17:   - `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public key
docs/DEPLOYMENT.md:18:   - `VITE_BASE_URL` — (Optional) API base URL; derived from SUPABASE_URL if omitted
docs/DEPLOYMENT.md:22:4. Redeploy for changes to take effect
docs/DEPLOYMENT.md:31:For production deployments with custom Supabase instances, ensure all three
docs/DEPLOYMENT.md:38:For GitHub Pages deployment via GitHub Actions, configure repository secrets:
docs/DEPLOYMENT.md:42:   - `VITE_SUPABASE_URL`
docs/DEPLOYMENT.md:43:   - `VITE_SUPABASE_ANON_KEY`
docs/DEPLOYMENT.md:52:    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
docs/DEPLOYMENT.md:53:    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
docs/API_TESTING.md:93:Requires `vi.mock('@supabase/supabase-js')` because the constructor creates a Supabase realtime client.
docs/API_TESTING.md:147:| Realtime subscriptions | Depends on Supabase WebSocket client. Separate concern from API facade. |
docs/TESTING.md:153:- Supabase backend deployed
docs/TESTING.md:255:## Edge Cases
docs/error-contracts.md:36:| `EDGE_FN_ERROR` | Supabase edge function errors |
docs/error-contracts.md:111:- **Finer domain codes**: Map specific Supabase error codes to more granular domain codes
docs/RUNBOOK.md:5:This document covers deployment, kiosk hardware setup, and troubleshooting for the NOLTC Tennis Court Registration System.
docs/RUNBOOK.md:15:- **Supabase** — PostgreSQL database + Realtime subscriptions
docs/RUNBOOK.md:16:- **Edge Functions** — Server-side business logic (court assignment, waitlist)
docs/RUNBOOK.md:19:## Deployment
docs/RUNBOOK.md:22:- Supabase project configured
docs/RUNBOOK.md:25:### Deploy Steps
docs/RUNBOOK.md:36:   All gates must pass before deployment.
docs/RUNBOOK.md:38:3. **Deploy to hosting**
docs/RUNBOOK.md:39:   - Deploy `dist/` folder to your hosting provider
docs/RUNBOOK.md:42:4. **Verify deployment**
docs/RUNBOOK.md:53:| `VITE_SUPABASE_URL` | Supabase project URL |
docs/RUNBOOK.md:54:| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
docs/RUNBOOK.md:75:4. Check Supabase dashboard for service status
docs/RUNBOOK.md:92:2. Check Supabase Realtime status in dashboard
docs/RUNBOOK.md:140:- Check Network tab for Edge Function response
docs/RUNBOOK.md:146:3. **RLS violation** — Permission issue (check Supabase logs)
docs/RUNBOOK.md:152:3. Review Supabase Edge Function logs
docs/RUNBOOK.md:197:- Edge Function error rates
docs/RUNBOOK.md:203:2. **Data fresh**: Compare displayed data with Supabase dashboard
docs/RUNBOOK.md:208:- **Supabase Dashboard**: Edge Function logs, Realtime status
docs/RUNBOOK.md:214:1. Check Supabase status page
docs/RUNBOOK.md:221:2. Check Supabase backups
docs/RUNBOOK.md:222:3. Review recent Edge Function logs for errors
docs/RUNBOOK.md:226:1. Rotate Supabase API keys immediately
docs/RUNBOOK.md:228:3. Check Edge Function access logs
docs/RUNBOOK.md:234:- Monitor Supabase usage and quotas
docs/internal/HR6_EXTRACTION_PLAN.md:140:Not realtime transport, not Supabase, not timing. Unsubscribe semantics
docs/internal/PHASE4_CHARTER.md:18:| src/lib/apiConfig.js | 83 | `SUPABASE_URL: supabase.url` | config (derived) |
docs/internal/PHASE4_CHARTER.md:19:| src/lib/apiConfig.js | 85 | `ANON_KEY: supabase.anonKey` | config (derived) |
docs/internal/PHASE4_CHARTER.md:21:| src/lib/RealtimeClient.js | 35-36 | `API_CONFIG.SUPABASE_URL`, `API_CONFIG.ANON_KEY` | config ref |
docs/internal/PHASE4_CHARTER.md:22:| src/config/runtimeConfig.js | 23-24 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | env var (correct pattern) |
docs/internal/PHASE4_CHARTER.md:23:| src/registration/backend/TennisQueries.js | 22 | `createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.ANON_KEY)` | config ref |
docs/internal/PHASE4_CHARTER.md:25:**Note:** The `src/config/runtimeConfig.js` file correctly reads from `import.meta.env.VITE_*` environment variables. The issue is that `src/lib/apiConfig.js` has a fallback pattern that may expose hardcoded values. Need to trace where `supabase.url` and `supabase.anonKey` originate.
docs/internal/PHASE4_CHARTER.md:157:- Supabase Auth / RLS audit (backend repo)
docs/internal/PHASE4_CHARTER.md:160:- Rate limiting (Edge Function concern, backend repo)
docs/internal/WP4-2_DEPS_REFACTOR.md:60:    setStreakAcknowledged,
docs/internal/WP4-2_DEPS_REFACTOR.md:104:| 34 | setStreakAcknowledged | setter | Clears streak acknowledgment |
docs/internal/WP4-2_DEPS_REFACTOR.md:110:- **Setters:** 34 keys — setCurrentGroup, setShowSuccess, setMemberNumber, setCurrentMemberId, setJustAssignedCourt, setAssignedSessionId, setReplacedGroup, setDisplacement, setOriginalCourtData, setCanChangeCourt, setIsTimeLimited, setCurrentScreen, setSearchInput, setShowSuggestions, setShowAddPlayer, setAddPlayerSearch, setShowAddPlayerSuggestions, setHasWaitlistPriority, setCurrentWaitlistEntryId, setWaitlistPosition, setSelectedCourtToClear, setClearCourtStep, setIsChangingCourt, setWasOvertimeCourt, setCourtToMove, setHasAssignedCourt, setShowGuestForm, setGuestName, setGuestSponsor, setShowGuestNameError, setShowSponsorError, setRegistrantStreak, setShowStreakModal, setStreakAcknowledged
docs/internal/WP4-2_DEPS_REFACTOR.md:153:    setRegistrantStreak, setShowStreakModal, setStreakAcknowledged,
docs/internal/WP4-2_DEPS_REFACTOR.md:180:    setStreakAcknowledged,
docs/internal/WP4-2_DEPS_REFACTOR.md:204:| 7 | setStreakAcknowledged | setter | Track streak acknowledgment |
docs/internal/WP4-2_DEPS_REFACTOR.md:217:- **Setters:** 8 keys — setSearchInput, setShowSuggestions, setMemberNumber, setCurrentMemberId, setRegistrantStreak, setStreakAcknowledged, setCurrentGroup, setCurrentScreen
docs/internal/WP4-2_DEPS_REFACTOR.md:240:    setRegistrantStreak, setStreakAcknowledged,
docs/internal/WP4-2_DEPS_REFACTOR.md:474:      setStreakAcknowledged,
docs/internal/WP4-2_DEPS_REFACTOR.md:520:36. setStreakAcknowledged(false)
docs/internal/WP5-C_LOCALSTORAGE_INVENTORY.md:130:3. **sync-promotions.js**: Writes to `tennisClubData` for "backward compatibility with legacy UI components". The comment acknowledges backend now computes promotions.
docs/internal/WP6-A_SECURITY_AUDIT.md:21:| Edge Functions (this repo) | Not present (separate backend repo) | ℹ️ N/A |
docs/internal/WP6-A_SECURITY_AUDIT.md:24:**Overall Assessment:** The codebase follows the documented "demo mode" security model. The anon key is public-by-design for Supabase, but the hardcoded fallback pattern means secrets persist in git history and production bundles. No critical vulnerabilities found—this is acceptable for demo/development but requires remediation before production use with real user data.
docs/internal/WP6-A_SECURITY_AUDIT.md:34:| `src/config/runtimeConfig.js` | 18 | `SUPABASE_URL: 'https://dncjloqewjubodkoruou.supabase.co'` | URL | 🟡 Review |
docs/internal/WP6-A_SECURITY_AUDIT.md:35:| `src/config/runtimeConfig.js` | 19-20 | `SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIs...'` | JWT | 🟡 Review |
docs/internal/WP6-A_SECURITY_AUDIT.md:36:| `src/config/runtimeConfig.js` | 21 | `BASE_URL: 'https://dncjloqewjubodkoruou.supabase.co/functions/v1'` | URL | 🟡 Review |
docs/internal/WP6-A_SECURITY_AUDIT.md:40:The `DEV_DEFAULTS` object in `runtimeConfig.js` contains hardcoded Supabase credentials used as fallbacks when environment variables are not set:
docs/internal/WP6-A_SECURITY_AUDIT.md:44:  SUPABASE_URL: 'https://dncjloqewjubodkoruou.supabase.co',
docs/internal/WP6-A_SECURITY_AUDIT.md:45:  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
docs/internal/WP6-A_SECURITY_AUDIT.md:46:  BASE_URL: 'https://dncjloqewjubodkoruou.supabase.co/functions/v1',
docs/internal/WP6-A_SECURITY_AUDIT.md:59:2. After removing hardcoded values, rotate the Supabase anon key
docs/internal/WP6-A_SECURITY_AUDIT.md:70:| `VITE_SUPABASE_URL` | `src/config/runtimeConfig.js` | 38 | Supabase project URL |
docs/internal/WP6-A_SECURITY_AUDIT.md:71:| `VITE_SUPABASE_ANON_KEY` | `src/config/runtimeConfig.js` | 41 | Supabase anon key |
docs/internal/WP6-A_SECURITY_AUDIT.md:91:| `.env.local` | Yes | Yes ✅ | Contains working Supabase credentials |
docs/internal/WP6-A_SECURITY_AUDIT.md:103:## D3 — Supabase Client Configuration
docs/internal/WP6-A_SECURITY_AUDIT.md:109:| `src/registration/backend/TennisQueries.js` | 22 | `createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.ANON_KEY)` |
docs/internal/WP6-A_SECURITY_AUDIT.md:110:| `src/lib/RealtimeClient.js` | 34 | `createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.ANON_KEY, {...})` |
docs/internal/WP6-A_SECURITY_AUDIT.md:114:- **Single config source:** All Supabase clients source credentials from `API_CONFIG` (apiConfig.js)
docs/internal/WP6-A_SECURITY_AUDIT.md:115:- **Config chain:** `apiConfig.js` → `getSupabaseConfig()` → `runtimeConfig.js` → `import.meta.env.VITE_*`
docs/internal/WP6-A_SECURITY_AUDIT.md:121:The `src/lib/ApiAdapter.js` makes direct `fetch()` calls to the Supabase Edge Functions URL:
docs/internal/WP6-A_SECURITY_AUDIT.md:125:  const url = `${this.baseUrl}${endpoint}`;  // baseUrl = SUPABASE_URL/functions/v1
docs/internal/WP6-A_SECURITY_AUDIT.md:131:This is the correct pattern—Edge Functions handle authorization, not direct database access.
docs/internal/WP6-A_SECURITY_AUDIT.md:137:## D4 — Edge Function Security Review
docs/internal/WP6-A_SECURITY_AUDIT.md:141:**Edge Functions are NOT in this repository.** Per `ARCHITECTURE.md`:
docs/internal/WP6-A_SECURITY_AUDIT.md:143:> | Repository | Contents | Deployment |
docs/internal/WP6-A_SECURITY_AUDIT.md:146:> | `noltc-backend/` | Supabase Edge Functions + migrations | Supabase |
docs/internal/WP6-A_SECURITY_AUDIT.md:152:- [ ] Edge Function auth check: Verify admin-only endpoints validate `deviceType` or auth token
docs/internal/WP6-A_SECURITY_AUDIT.md:153:- [ ] Service role key usage: Confirm Edge Functions use service role (not anon) for writes
docs/internal/WP6-A_SECURITY_AUDIT.md:154:- [ ] Rate limiting: Check if Edge Functions have rate limits configured
docs/internal/WP6-A_SECURITY_AUDIT.md:158:**Recommended Action:** Conduct separate audit of `noltc-backend/` repository for Edge Function security.
docs/internal/WP6-A_SECURITY_AUDIT.md:193:const g={...,VITE_SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",...}
docs/internal/WP6-A_SECURITY_AUDIT.md:250:2. Rotate the Supabase anon key after remediation
docs/internal/WP6-A_SECURITY_AUDIT.md:255:## D7 — RLS / Supabase Policy Review
docs/internal/WP6-A_SECURITY_AUDIT.md:276:- [ ] CORS configuration: Document allowed origins in Supabase dashboard
docs/internal/WP6-A_SECURITY_AUDIT.md:281:**Recommended Action:** Conduct RLS audit in `noltc-backend/` repository and Supabase dashboard.
docs/internal/WP6-A_SECURITY_AUDIT.md:293:| 🟡 Medium | Rotate Supabase anon key after remediation | Post-Phase 4 | ARCHITECTURE.md |
docs/internal/WP6-A_SECURITY_AUDIT.md:295:| 🟡 Medium | Audit Edge Function auth in backend repo | WP-B3b | ARCHITECTURE.md |
docs/internal/WP6-A_SECURITY_AUDIT.md:314:3. **Demo mode acknowledged:** Security model explicitly documented as "open demo mode"
docs/ENVIRONMENT.md:5:This project includes dev-only defaults for rapid local setup. These are Supabase anon/public keys (not secrets) and are acceptable for this closed club deployment. Row Level Security (RLS) on the Supabase backend provides the real access control.
docs/ENVIRONMENT.md:19:| `VITE_SUPABASE_URL` | Supabase project URL | Production builds |
docs/ENVIRONMENT.md:20:| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Production builds |
docs/ENVIRONMENT.md:21:| `VITE_BASE_URL` | API base URL for Edge Functions (optional - derived from SUPABASE_URL if omitted) | Optional |
docs/ENVIRONMENT.md:25:> it's recommended to set explicit values for production deployments.
docs/ENVIRONMENT.md:46:2. Edit `.env.local` and add your Supabase credentials:
docs/ENVIRONMENT.md:48:       VITE_SUPABASE_URL=<your-supabase-url>
docs/ENVIRONMENT.md:49:       VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
docs/ENVIRONMENT.md:59:## Vercel Deployment Setup
docs/ENVIRONMENT.md:61:1. Go to your Vercel project dashboard
docs/ENVIRONMENT.md:67:| `VITE_SUPABASE_URL` | Production, Preview, Development | Supabase URL |
docs/ENVIRONMENT.md:68:| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development | Supabase anon key |
docs/ENVIRONMENT.md:72:4. Redeploy for changes to take effect.
docs/ENVIRONMENT.md:111:    [runtimeConfig] Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY
docs/ENVIRONMENT.md:113:Ensure `.env.local` exists with valid values, or set the variables in Vercel.
docs/ENVIRONMENT.md:118:- Vercel: trigger a new deployment after changing environment variables
docs/GOLDEN_FLOWS.md:220:Run through each flow before deployments or after significant changes.
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:213:| `@supabase/supabase-js` | 2 | ✅ |

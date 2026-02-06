# Phase 4 Charter — Architectural Cleanup

## Overview
Phase 4 addresses four architectural issues identified by code analysis during the
hardening sprint. This document provides the precise inventory that scopes all
subsequent work packages.

**Date:** 2026-02-02
**Baseline:** 454 unit tests, 15 E2E tests, npm run verify green

---

## 1. Hardcoded Credentials (WP-S1 Target)

### Inventory
| File | Line(s) | What | Type |
|------|---------|------|------|
| src/lib/apiConfig.js | 83 | `SUPABASE_URL: supabase.url` | config (derived) |
| src/lib/apiConfig.js | 85 | `ANON_KEY: supabase.anonKey` | config (derived) |
| src/lib/ApiAdapter.js | 15 | `this.anonKey = options.anonKey \|\| API_CONFIG.ANON_KEY` | config ref |
| src/lib/RealtimeClient.js | 35-36 | `API_CONFIG.SUPABASE_URL`, `API_CONFIG.ANON_KEY` | config ref |
| src/config/runtimeConfig.js | 23-24 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | env var (correct pattern) |
| src/registration/backend/TennisQueries.js | 22 | `createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.ANON_KEY)` | config ref |

**Note:** The `src/config/runtimeConfig.js` file correctly reads from `import.meta.env.VITE_*` environment variables. The issue is that `src/lib/apiConfig.js` has a fallback pattern that may expose hardcoded values. Need to trace where `supabase.url` and `supabase.anonKey` originate.

### Additional Token References (Non-Credential)
These are legitimate runtime tokens, not hardcoded secrets:
- `src/lib/ApiAdapter.js:394-410` — `actions_token` parameter for AI assistant
- `src/registration/backend/wire.js:54-56, 153-155, 193-195` — `location_token` for QR verification
- `src/registration/ui/mobile/useMobileFlowController.js:69-82` — location token handling
- `src/registration/components/QRScanner.jsx`, `LocationQRCode.jsx` — QR token UI
- `src/courtboard/mobile/MobileModalSheet.jsx:233-246` — name token parsing (string split)
- `src/courtboard/components/CourtCard.jsx:59-72` — name token parsing (string split)

### Scope
- Total files with hardcoded credential references: 4 (apiConfig, ApiAdapter, RealtimeClient, TennisQueries)
- Files correctly using env vars: 1 (runtimeConfig.js)
- Target: Zero hardcoded secrets; all credential access flows through runtimeConfig.js

---

## 2. Oversized Dependency Objects (WP-S2 Target)

### Inventory
| Orchestrator/Handler | Destructured Props | File | Lines |
|---------------------|-------------------|------|-------|
| useRegistrationHandlers | 94 | src/registration/appHandlers/useRegistrationHandlers.js | 441 |
| resetOrchestrator | 69 | src/registration/orchestration/resetOrchestrator.js | 231 |
| assignCourtOrchestrator | 36 | src/registration/orchestration/assignCourtOrchestrator.js | 518 |
| memberSelectionOrchestrator | 33 | src/registration/orchestration/memberSelectionOrchestrator.js | 371 |
| waitlistOrchestrator | 12 | src/registration/orchestration/waitlistOrchestrator.js | 212 |
| courtChangeOrchestrator | 8 | src/registration/orchestration/courtChangeOrchestrator.js | 59 |

### Scope
- Largest deps consumer: **useRegistrationHandlers** with **94** destructured properties
- Second largest: **resetOrchestrator** with **69** destructured properties
- Target: No orchestrator/handler destructures more than 12 properties directly

---

## 3. Window Globals (WP-S3 Target)

### Inventory

#### Writes (window.X = ...)
| File | Line | Global | Classification |
|------|------|--------|----------------|
| src/lib/browser-bridge.js | 25-26 | `window.APP_UTILS` | required-runtime (IIFE namespace) |
| src/lib/browser-bridge.js | 31-55 | `window.Tennis.*` | required-runtime (IIFE namespace) |
| src/courtboard/courtboardState.js | 89-90 | `window.getCourtboardState`, `window.isCourtboardStateReady` | required-runtime (cross-frame) |
| src/courtboard/bridge/window-bridge.js | 16 | `window.CourtboardState` | required-runtime (single writer) |
| src/courtboard/browser-bridge.js | 14 | `window.CourtAvailability` | required-runtime (plain JS consumers) |
| src/courtboard/mobile-fallback-bar.js | 177, 244 | `window.updateJoinButtonForMobile`, `window.updateJoinButtonState` | required-runtime (plain JS) |
| src/courtboard/mobile-bridge.js | 15 | `window.mobileTapToRegister` | required-runtime (cross-frame) |
| src/admin/App.jsx | 208 | `window.refreshAdminView` | legacy (can use module export) |
| src/admin/utils/adminRefresh.js | 13-18, 40-48 | `window.__adminRefreshPending`, `window.scheduleAdminRefresh`, `window.__wiredAdminListeners` | legacy (can use module state) |
| src/registration/App.jsx | 18-19 | `window.Tennis`, `window.GeolocationService` | required-runtime (IIFE compat) |
| src/registration/services/index.js | 119, 130 | `window.NOLTC_USE_API` | legacy (can use module state) |
| src/registration/appHandlers/useRegistrationAppState.js | 312-318, 353 | `window.RegistrationUI.*`, `window.loadData` | legacy (can use context/props) |
| src/courtboard/components/TennisCourtDisplay.jsx | 341 | `window.refreshBoard` | legacy (can use context) |

#### Reads (window.X accessed) — Selected High-Impact
| File | Line | Global | Classification |
|------|------|--------|----------------|
| src/lib/apiConfig.js | 26, 29, 34, 51 | `window.__mobileFlow`, `window.location`, `window.parent` | required-runtime |
| src/platform/windowBridge.js | 26-274 (throughout) | `window.APP_UTILS`, `window.Tennis.*`, `window.IS_MOBILE_VIEW`, etc. | required-runtime (centralized reader) |
| src/admin/ai/MockAIAdmin.jsx | 10-12 | `window.TENNIS_CONFIG`, `window.Events`, `window.BL` | legacy (can import) |
| src/admin/blocks/BlockTemplateManager.jsx | 10 | `window.APP_UTILS?.TENNIS_CONFIG` | legacy (can import) |
| src/admin/blocks/hooks/useWetCourts.js | 10, 37 | `window.Events`, `window.Tennis?.deviceId` | legacy (can import) |
| src/admin/screens/AnalyticsDashboard.jsx | 22-28 | `window.TENNIS_CONFIG`, `window.APP_UTILS` | legacy (can import) |
| src/courtboard/components/NextAvailablePanel.jsx | 17 | `window.Tennis?.Domain?.availability` | required-runtime (IIFE) |
| src/courtboard/mobile-fallback-bar.js | 3, 19, 78-88, 120, 154-165, 275-276 | Multiple | required-runtime (plain JS) |
| src/courtboard/mobile-bridge.js | 4, 11, 40-106 | Multiple | required-runtime (plain JS) |
| src/registration/utils/helpers.js | 88-89, 114-115 | `window.Tennis?.Domain`, `window.Tennis?.Storage` | legacy? (needs audit) |
| src/registration/handlers/adminOperations.js | 111-113 | `window.Tennis?.Commands` | legacy (can inject) |
| src/registration/screens/HomeScreen.jsx | 108-109 | `window.Tennis?.UI?.toast` | legacy (can inject) |

### Classification Key
- **required-runtime**: Cross-frame communication, boot-time namespace for plain JS IIFE files
- **legacy**: Can be replaced with ES imports, context, or dependency injection
- **dead**: No consumer found, safe to remove

### Scope
- Total `window.*` writes outside platform/: ~15 locations
- Total `window.*` reads outside platform/: ~100+ locations
- Already centralized in `src/platform/windowBridge.js`: Good pattern to extend
- Target: All writes contained in src/platform/ or bridge files, documented exceptions only

---

## 4. Snake_case Property Access (WP-S4 Target)

### Inventory
| File | Count | Example Properties |
|------|-------|--------------------|
| src/lib/normalize/normalizeCourt.js | 15 | `court_number`, `session_id`, `block_id`, `starts_at`, `ends_at` |
| src/lib/normalize/normalizeSession.js | 8 | `scheduled_end_at`, `actual_end_at`, `end_reason`, `session_id` |
| src/lib/normalize/normalizeMember.js | 4 | `member_id`, `display_name`, `is_guest` |
| src/lib/normalize/normalizeBlock.js | 4 | `starts_at`, `ends_at`, `block_id`, `court_number` |
| src/lib/normalize/normalizeWaitlistEntry.js | 6 | `joined_at`, `minutes_waiting`, `entry_id`, `queue_position`, `estimated_court_time` |
| src/lib/normalize/normalizeGroup.js | 2 | `group_type`, `group_id` |
| src/lib/normalizeWaitlist.js | 8 | `display_name`, `member_id`, `member_name`, `is_guest`, `group_type`, `joined_at`, `minutes_waiting` |
| src/lib/ApiAdapter.js | 18 | `court_number`, `court_id`, `started_at`, `scheduled_end_at`, `minutes_remaining`, `group_type`, `joined_at`, `operating_hours`, `date_start`, `date_end`, `member_number` |
| src/admin/screens/SystemSettings.jsx | 25+ | `ball_price_cents`, `guest_fee_weekday_cents`, `auto_clear_enabled`, `check_status_minutes`, `block_warning_minutes`, `operating_hours`, `day_of_week`, `opens_at`, `closes_at`, `is_closed` |
| src/admin/analytics/UsageHeatmap.jsx | 3 | `day_of_week`, `session_count` |
| src/admin/calendar/WeekView.jsx | 6 | `is_closed`, `opens_at`, `closes_at` |
| src/courtboard/components/TennisCourtDisplay.jsx | 4 | `check_status_minutes`, `block_warning_minutes` |
| src/shared/courts/courtAvailability.js | 1 | `ends_at` |

### Scope
- Total files with snake_case property access: ~15
- Total snake_case references: ~100+
- **Normalization layer** (src/lib/normalize/): Correctly handles API ↔ frontend translation
- **Leakage outside normalization**: SystemSettings.jsx, WeekView.jsx, UsageHeatmap.jsx, TennisCourtDisplay.jsx
- Target: Zero snake_case access in React components; all snake_case confined to normalization layer

---

## Execution Order
| Priority | WP | Commits | Risk | Rationale |
|----------|-----|---------|------|-----------|
| 1 | WP-S1: Credentials | 3 | Low | Quick win, eliminates visible smell, security posture |
| 2 | WP-S4: Naming | 4 | Low | Extends normalization layer, reduces coupling |
| 3 | WP-S3: Window Globals | 5 | Medium | Builds on existing windowBridge.js pattern |
| 4 | WP-S2: Deps Refactor | 8-10 | Medium-High | Highest architectural impact, needs careful API design |

**Rationale for order change:**
- WP-S1 (Credentials) is quick and improves security posture
- WP-S4 (Naming) is mechanical and creates cleaner boundaries before deps refactor
- WP-S3 (Window Globals) consolidates platform access before handler redesign
- WP-S2 (Deps) is highest impact but benefits from cleaner boundaries established by S3/S4

---

## Out of Scope
- Supabase Auth / RLS audit (backend repo)
- TypeScript migration (separate initiative)
- Device enrollment / attestation (Phase 5+)
- Rate limiting (Edge Function concern, backend repo)
- AdminCommands test coverage (deferred from HR9)
- Mobile.html iframe architecture (requires broader mobile strategy)
- Plain JS IIFE files (domain/, shared/, courtboard/*.js) — these require window globals by design

---

## Success Criteria
1. `npm run verify` green after each WP commit
2. No regression in E2E tests (15/15 passing)
3. No regression in unit tests (454 passing)
4. Each WP has measurable before/after metrics documented in commit message

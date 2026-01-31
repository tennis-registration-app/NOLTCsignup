# NOLTC Tennis Registration System — Architecture

## Overview

The NOLTC Tennis Registration System manages court registration for approximately 2,500 members across 12 courts at the New Orleans Lawn Tennis Club. The system consists of multiple frontend applications backed by Supabase (PostgreSQL + Edge Functions).

## Repository Structure

This is a **two-repository system**:

| Repository | Contents | Deployment |
|------------|----------|------------|
| `NOLTCsignup/` (this repo) | Frontend applications (React/Vite) | GitHub Pages |
| `noltc-backend/` | Supabase Edge Functions + migrations | Supabase |

## Frontend Applications

The frontend is a multi-page Vite application with four entry points:

| App | Path | Purpose |
|-----|------|---------|
| Registration | `/src/registration/` | Member check-in kiosk (iPad) |
| Courtboard | `/src/courtboard/` | Passive court status display |
| Admin | `/src/admin/` | Analytics, settings, blocks, calendar |
| Mobile | `/Mobile.html` | Mobile shell (iframe-based) |

### Shared Code

- `src/lib/` — API client, realtime subscriptions, utilities
- `src/shared/` — Shared React components
- `shared/` — Cross-app utilities
- `domain/` — Domain logic and constants

## Architectural Principles

### 1. Backend-Authoritative

All domain state lives in the database. The frontend is a view layer that:
- Reads state via API calls or realtime subscriptions
- Mutates state **only** through Edge Function calls
- Never stores domain state in localStorage (localStorage is for UI preferences only)

### 2. Edge Functions as Mutation Layer

All data mutations go through Supabase Edge Functions. The frontend never writes directly to the database. This ensures:
- Consistent business rule enforcement
- Audit logging at the mutation boundary
- Atomic operations for complex workflows

### 3. Realtime State Propagation

Court status updates propagate via:
1. **Primary:** Supabase Realtime subscriptions (signals table)
2. **Fallback:** Polling (for environments where websockets are unreliable)

When a mutation occurs, the Edge Function writes to the signals table, which triggers realtime updates to all connected clients.

### 4. Event-Sourced Sessions

Court sessions maintain history:
- Active sessions represent current court state
- Completed sessions are archived with timestamps
- Session transitions (start, end, transfer) are recorded

## Data Flow

```
┌─────────────┐     HTTP POST      ┌─────────────────┐
│   Frontend  │ ─────────────────> │  Edge Function  │
│  (React)    │                    │  (Deno)         │
└─────────────┘                    └────────┬────────┘
       ▲                                    │
       │                                    ▼
       │ Realtime              ┌─────────────────────┐
       │ Subscription          │     PostgreSQL      │
       │                       │  (Supabase)         │
       └───────────────────────┴─────────────────────┘
```

## Key Backend Patterns

### API Response Format

All Edge Functions return consistent response format:
```javascript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Error message", code: "ERROR_CODE" }
```

### Audit Logging

Mutations are logged with:
- Timestamp
- Action type
- Actor (device/admin)
- Before/after state (where applicable)

## Admin BlockManager Decomposition (Phase 2.2)

The `CompleteBlockManagerEnhanced.jsx` component (~1,076 lines) was decomposed into bounded modules for maintainability.

### Extracted Modules

| Module | Type | Location | Responsibility |
|--------|------|----------|----------------|
| `useWetCourts` | Hook | `src/admin/blocks/hooks/useWetCourts.js` | Wet court API handlers (markWet, clear, deactivate). Parent owns state, hook provides handlers. |
| `CourtSelectionGrid` | Component | `src/admin/blocks/CourtSelectionGrid.jsx` | Presentational 12-court selection grid. Parent owns selection state and toggle logic. |
| `BlockReasonSelector` | Component | `src/admin/blocks/BlockReasonSelector.jsx` | Presentational quick-reason buttons + custom input. Owns `quickReasons` data (UI-only). |
| `expandRecurrenceDates` | Utility | `src/admin/blocks/utils/expandRecurrenceDates.js` | Pure function: expands recurrence config into `{date: Date}[]`. No side effects. |

### Ownership Model

- **State ownership:** Parent component (`CompleteBlockManagerEnhanced`) retains all state
- **Handler pattern:** `useWetCourts` receives setters as props, returns handler functions
- **Presentational components:** Receive data + callbacks via props, no internal state
- **Pure utilities:** No React dependencies, testable in isolation

### Post-Decomposition Metrics

- Original: 1,076 lines
- Current: 832 lines (~23% reduction)
- Extracted: 363 lines across 4 modules

## Courtboard Module Structure (WP4 Phase 1)

```
src/courtboard/
├── main.jsx                    # Thin entry point (≤500 lines target met)
├── bridge/
│   └── window-bridge.js        # Single writer for window.CourtboardState
├── components/
│   ├── CourtCard.jsx           # Individual court display
│   ├── Icons.jsx               # Shared icon components
│   ├── LoadingPlaceholder.jsx  # Loading state
│   ├── NextAvailablePanel.jsx  # Next available courts panel
│   ├── ReservedCourtsPanel.jsx # Reserved courts panel
│   ├── TennisCourtDisplay.jsx  # Main court grid (state owner)
│   ├── ToastHost.jsx           # Toast notifications
│   └── WaitingList.jsx         # Waitlist display
├── mobile/
│   ├── MobileModalApp.jsx      # Mobile app shell
│   └── MobileModalSheet.jsx    # Mobile modal content
├── utils/
│   └── courtUtils.js           # Shared helper functions
└── Existing supporting modules (unchanged):
    ├── browser-bridge.js       # window.CourtAvailability export
    ├── courtboardState.js      # State reading helpers
    ├── mobile-bridge.js        # Mobile communication
    ├── mobile-fallback-bar.js  # Fallback UI
    ├── debug-panel.js          # Debug utilities
    └── sync-promotions.js      # Promotion sync
```

### Key Architectural Patterns

- **Single Writer**: `window.CourtboardState` is written ONLY by `bridge/window-bridge.js`
- **State Owner**: `TennisCourtDisplay.jsx` owns React state and calls bridge to sync
- **Mobile Shell**: `mobile/` components handle mobile-specific UI
- **Pure Extraction**: All components extracted without behavior changes

### Verification Baseline

Playwright baseline is currently 14/15 due to pre-existing failure in `block-refresh-wiring.spec.js` (to be addressed in WP5 Cleanup).

## Admin Module Structure (WP4 Phase 2)

```
src/admin/
├── App.jsx                     # Entry point + AdminPanelV2 (~792 lines)
├── handlers/
│   ├── applyBlocksOperation.js # Block creation logic
│   ├── courtOperations.js      # Clear/move court operations
│   └── waitlistOperations.js   # Waitlist management
├── tabs/
│   ├── AIAssistantSection.jsx  # AI assistant floating panel
│   ├── AnalyticsSection.jsx    # Analytics tab content
│   ├── BlockingSection.jsx     # Block management tab
│   ├── CalendarSection.jsx     # Calendar tab content
│   ├── HistorySection.jsx      # Game history tab
│   ├── StatusSection.jsx       # Court status tab
│   ├── SystemSection.jsx       # System settings tab
│   ├── TabNavigation.jsx       # Tab bar navigation
│   └── WaitlistSection.jsx     # Waitlist tab content
├── utils/
│   ├── adminRefresh.js         # Refresh coalescer utilities (extracted IIFEs)
│   └── eventIcons.js           # Event icon helper
├── screens/                    # Existing (AnalyticsDashboard, GameHistorySearch, SystemSettings)
├── blocks/                     # Existing (CompleteBlockManagerEnhanced, etc.)
├── calendar/                   # Existing (EventCalendarEnhanced, etc.)
├── analytics/                  # Existing (UsageHeatmap, UtilizationChart, etc.)
├── courts/                     # Existing (CourtStatusGrid)
├── ai/                         # Existing (AIAssistant, MockAIAdmin)
└── components/                 # Existing + extracted (VisualTimeEntry, MiniCalendar, MonthView, EventSummary)
```

### Key Architectural Patterns

- **Handler modules**: Pure async functions with dependency injection (`ctx` parameter). No React hooks or state.
- **Tab sections**: Render-only components. All handlers passed as props from AdminPanelV2.
- **State ownership**: AdminPanelV2 owns all React state and delegates rendering to tab components.
- **Refresh contract**: `window.refreshAdminView` remains assigned in App.jsx; used by refresh utilities and test wiring.

### Why App.jsx Remains ~792 Lines

Reaching ≤500 lines requires refactoring beyond WP4 scope:
- `loadData` + subscription effects are tightly coupled to multiple state setters
- Wet-court handler cluster (`handleEmergencyWetCourt`, `deactivateWetCourts`, `clearWetCourt`) couples 7+ state setters
- Further reduction requires hooks/state modularization (WP5+)

### Verification Baseline

Playwright baseline is 14/15 due to pre-existing failure in `block-refresh-wiring.spec.js` (to be addressed in WP5).

## Registration Module Structure (Post-WP6)

The registration app underwent significant architectural refactoring in WP5 and WP6, reducing App.jsx from ~3,491 lines to 349 lines through modular extraction.

### App Composition Layer

```
src/registration/
├── App.jsx (349 lines) — Composition root
│   ├── useRegistrationAppState() — All state/hooks
│   ├── useRegistrationHandlers() — All handlers
│   └── <RegistrationRouter app={app} handlers={handlers} />
```

### State Modules (`appHandlers/state/`)

```
useRegistrationAppState.js (398 lines) — Composition
├── useRegistrationUiState.js (133 lines) — useState declarations
├── useRegistrationRuntime.js (136 lines) — Timers, refs, effects
├── useRegistrationDataLayer.js (112 lines) — Backend subscription
├── useRegistrationDomainHooks.js (376 lines) — Feature hooks
├── useRegistrationDerived.js (140 lines) — Computed values
├── useRegistrationHelpers.js (192 lines) — Helper functions
└── buildRegistrationReturn.js (327 lines) — Return object assembly
```

### Handler Modules (`appHandlers/handlers/`)

```
useRegistrationHandlers.js (479 lines) — Composition
├── useAdminHandlers.js (110 lines)
├── useGuestHandlers.js (239 lines)
├── useGroupHandlers.js (369 lines)
├── useCourtHandlers.js (339 lines)
└── useNavigationHandlers.js (119 lines)
```

### Router & Routes (`router/`)

```
RegistrationRouter.jsx (59 lines) — Thin switch
└── routes/
    ├── HomeRoute.jsx (102 lines)
    ├── AdminRoute.jsx (119 lines)
    ├── GroupRoute.jsx (188 lines)
    ├── CourtRoute.jsx (313 lines)
    ├── SuccessRoute.jsx (181 lines)
    ├── ClearCourtRoute.jsx (53 lines)
    └── SilentAssignRoute.jsx (17 lines)
```

### Key Architectural Patterns

- **Grouped props**: Routes receive `{ app, handlers }` instead of 150+ individual props
- **State composition**: `useRegistrationAppState` composes 7 sub-modules
- **Handler composition**: `useRegistrationHandlers` composes 5 domain-specific handler modules
- **Thin router**: RegistrationRouter is a simple switch (59 lines) that delegates to route components
- **Route components**: Each route destructures what it needs from `app` and `handlers`

### Prop Structure

Routes receive two grouped objects:
- `app` — All state, setters, refs, derived values, services
- `handlers` — All handler functions

```javascript
// In App.jsx
const app = useRegistrationAppState();
const handlers = useRegistrationHandlers({ ...app });
return <RegistrationRouter app={app} handlers={handlers} />;

// In routes
function GroupRoute({ app, handlers }) {
  const { groupGuest, search, derived } = app;
  const { handleSuggestionClick, handleAddGuest } = handlers;
  // ...
}
```

### Screens

```
screens/
├── HomeScreen.jsx          # Home/search screen
├── GroupScreen.jsx         # Group management
├── CourtSelectionScreen.jsx # Court selection
├── ClearCourtScreen.jsx    # Court clearing flow
├── AdminScreen.jsx         # Admin interface
└── SuccessScreen.jsx       # Success/completion
```

Screen components receive explicit props (not `app`/`handlers`) to maintain clear interfaces.

### Verification Baseline

Playwright baseline is 15/15 with all tests passing after WP5/WP6 refactoring.

## Code Standards

### File Size Rule

All source files must be under 500 lines. Current status:
- ✅ App.jsx: 349 lines (down from 3,491)
- ✅ All state modules: <400 lines each
- ✅ All handler modules: <500 lines each
- ✅ All route components: <320 lines each
- ✅ RegistrationRouter: 59 lines

### Verification Gate

Every commit must pass:
```bash
npm run verify  # lint + unit tests + build + e2e tests
```

See `CONTRIBUTING.md` for full development workflow.

## Known Technical Debt

### Hardcoded Credentials (Phase 4)

The frontend currently contains hardcoded Supabase credentials in `src/lib/apiConfig.js`. This is documented and will be addressed in Phase 4 (Backend Hygiene & Security) by:
- Moving credentials to environment variables
- Creating `.env.example` template
- Updating build/deploy pipeline

### Frontend Decomposition - Complete

Large components status (post-WP6):
- `src/registration/App.jsx` (349 lines) ✅ — Fully decomposed in WP5/WP6
- `src/admin/App.jsx` (~792 lines) — Tab sections + handlers extracted in WP4 Phase 2
- `src/courtboard/main.jsx` (~105 lines) ✅ — Fully decomposed in WP4 Phase 1
- `CompleteBlockManagerEnhanced.jsx` (~832 lines) — Decomposed in Phase 2.2

Registration app achieved <500 line target through:
- State modularization (WP5.9) — 7 sub-modules
- Handler modularization (WP5.9.3) — 5 domain handlers
- Route extraction (WP6.0.1) — 7 route components
- Props consolidation (WP6.0.2) — `{ app, handlers }` pattern

## Security Model

### Current State: Open Demo Mode

> ⚠️ **This system is currently in open demo mode.** Anyone with access to the URL can perform any action, including admin operations. Security currently relies primarily on physical access control (kiosk located in a private club). Database Row Level Security (RLS) policies exist but may be permissive in demo mode.

### Trust Model Overview

| Surface | URL Pattern | Trust Level | Notes |
|---------|-------------|-------------|-------|
| Registration Kiosk | `/` (root) | Open | Primary member-facing interface |
| Admin Panel | `/admin/*` | Open | URL-path detection only, no auth |
| Courtboard Display | `/courtboard/` | Open | Read-only passive display |
| Mobile | `/Mobile.html` | Open | Location token for QR context only |

**Key limitation:** Admin mode is determined solely by URL path (`window.location.pathname.includes('/admin/')`). There is no authentication — anyone who navigates to `/admin/` has full admin access.

### Device Identification

Devices are identified by **client-supplied constants**, not authenticated tokens:

| Device Type | ID Source | Spoofable? |
|-------------|-----------|------------|
| Kiosk | `DEVICES.KIOSK_ID` (constant) | Yes |
| Admin | `DEVICES.ADMIN_ID` (constant) | Yes |
| Mobile | `DEVICES.MOBILE_ID` (constant) | Yes |

Device IDs are passed to Edge Functions in request payloads. Backend validation of these IDs cannot be confirmed from the frontend code alone.

### Action Authorization Matrix

| Action | Endpoint | Intended Access | Current Protection |
|--------|----------|-----------------|-------------------|
| Assign court | `/assign-court` | Kiosk/Admin | Frontend: none |
| End session | `/end-session` | Kiosk/Admin | Frontend: none |
| Create block | `/create-block` | Admin only | Frontend: none |
| Cancel block | `/cancel-block` | Admin only | Frontend: none |
| Join waitlist | `/join-waitlist` | Kiosk/Mobile | Frontend: none |
| Cancel waitlist | `/cancel-waitlist` | Kiosk/Mobile | Frontend: none |
| Update settings | `/update-system-settings` | Admin only | Frontend: none |
| Export data | `/export-transactions` | Admin only | Frontend: none |
| AI assistant | `/ai-assistant` | Admin only | Frontend: none |

**Note:** "Frontend: none" means the frontend does not enforce access control. Backend Edge Functions may have additional validation — this requires backend code review to confirm.

### What's Protected vs. What's Not

| Layer | Protection | Status |
|-------|------------|--------|
| Supabase service role key | Not in frontend code | ✅ Protected |
| Admin UI features | URL-path hidden only | ❌ Not protected |
| Mutation endpoints | Unknown backend validation | ⚠️ Unknown |
| Read access | RLS policies | ⚠️ Unknown (may be permissive) |
| Physical access | Kiosk in private club | ✅ Environmental control |

### Compromise Scenarios

#### Scenario 1: Kiosk tablet stolen
- **Impact:** Access to registration and, if the admin URL is known, admin functions
- **Current mitigation:** None beyond physical security
- **Production mitigation:** Device enrollment, remote wipe capability, session tokens

#### Scenario 2: Vercel/deployment URL shared publicly
- **Impact:** Anyone can register, create blocks, modify settings, export data
- **Current mitigation:** URL not publicly advertised
- **Production mitigation:** Authentication, IP allowlisting, or VPN requirement

#### Scenario 3: Malicious user spams mutations
- **Impact:** Junk registrations, fake blocks, data pollution
- **Current mitigation:** None
- **Production mitigation:** Rate limiting, authentication, audit logging

#### Scenario 4: Frontend attempts privilege escalation
- **Impact:** Limited — no service role key available, RLS should block unauthorized DB access
- **Current mitigation:** Supabase anon key + RLS policies
- **Production mitigation:** Verify RLS policies are correctly restrictive

### Device Trust Concept (Future)

When leaving demo mode, implement device trust via:

1. **Device enrollment**: Admin registers device IDs/tokens in a trusted devices table
2. **Token storage**: Device token in secure storage (HttpOnly cookie or device keychain)
3. **Token validation**: Backend verifies device token on each request
4. **Rotation**: Tokens expire and require re-enrollment periodically
5. **Revocation**: Admin can invalidate a device token immediately if compromised

This is **not implemented** — documented here for future reference.

### Leaving Demo Mode Checklist

The order of these steps is flexible and depends on deployment priorities.

- [ ] **Add admin authentication**: Password, SSO, or device certificate for `/admin/*` routes
- [ ] **Implement device enrollment**: Replace client-supplied device IDs with server-issued tokens
- [ ] **Audit RLS policies**: Verify all tables have appropriate row-level security (WP-B3)
- [ ] **Validate Edge Function authorization**: Confirm admin-only endpoints check device type/auth
- [ ] **Rotate credentials**: Generate new Supabase anon key after removing hardcoded values
- [ ] **Enable rate limiting**: Protect mutation endpoints from abuse
- [ ] **Restrict CORS**: Limit allowed origins to known deployment URLs (WP-B4)
- [ ] **Add audit logging**: Track who performed admin actions and when
- [ ] **Document incident response**: What to do if a device is compromised

### Related Security Documentation

- `docs/ENVIRONMENT.md` — Environment configuration and demo mode notice
- Backend repository — Edge Function authorization logic (separate repo)

## Type Boundaries

The registration app uses JSDoc type boundaries to prevent silent drift of core data shapes. This discipline was established in WP6.3–6.6.

### Canonical Shape Origins

| Shape | Origin File | Description |
|-------|-------------|-------------|
| `AppState` | `src/registration/appHandlers/state/buildRegistrationReturn.js` | Application state object |
| `Handlers` | `src/registration/appHandlers/useRegistrationHandlers.js` | 34 handler functions (explicitly enumerated) |

Type definitions live in `src/types/appTypes.js`.

### Files with `// @ts-check`

All routing and screen files have TypeScript checking enabled via JSDoc:

**Router & Routes (7 files):**
- `RegistrationRouter.jsx`
- `HomeRoute.jsx`, `AdminRoute.jsx`, `GroupRoute.jsx`, `CourtRoute.jsx`, `SuccessRoute.jsx`, `ClearCourtRoute.jsx`

**Screens (6 files):**
- `AdminScreen.jsx`, `ClearCourtScreen.jsx`, `CourtSelectionScreen.jsx`
- `GroupScreen.jsx`, `HomeScreen.jsx`, `SuccessScreen.jsx`

### Rules of Engagement

1. **Adding a handler:** Update the `Handlers` typedef in `src/types/appTypes.js` to include the new key. The typedef explicitly enumerates all 34 handler keys to prevent silent additions/removals.

2. **Platform access in screens:** Do not use `window.Tennis.*` directly in screen components. Use the platform bridge exports from `src/platform/windowBridge.js`:
   - `getStorageDataSafe()` — for Storage.readDataSafe()
   - `getDataStoreValue(key)` — for DataStore.get()
   - `setDataStoreValue(key, value)` — for DataStore.set()

3. **Icon className typing:** Use `TypedIcon` wrapper from `src/components/icons/TypedIcon.jsx` for lucide-react icons that need className props.

4. **Suppressions:** `@ts-expect-error` comments require a reason and are capped:
   - Per file: ≤3
   - Total across codebase: minimize (currently 1 — AdminScreen third-party type issue)

### Verification

Type checking is part of the standard verify pipeline:
```bash
npm run verify  # Includes lint + unit tests + build + E2E
```

For single-file type checking during development:
```bash
npx tsc --noEmit --allowJs --checkJs --skipLibCheck <file>
```

## Related Documentation

- [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) — Environment setup and staging
- [docs/GOLDEN_FLOWS.md](./docs/GOLDEN_FLOWS.md) — Critical user flows
- [docs/TESTING.md](./docs/TESTING.md) — Testing strategy

# NOLTC Tennis Registration System — Architecture

## Overview

The NOLTC Tennis Registration System manages court registration for approximately 2,500 members across 12 courts at the New Orleans Lawn Tennis Club. The system consists of multiple frontend applications backed by Supabase (PostgreSQL + Edge Functions).

## Repository Structure

This is a **two-repository system**:

| Repository | Contents | Deployment |
|------------|----------|------------|
| `NOLTCsignup/` (this repo) | Frontend applications (React/Vite) | Vercel |
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
- `shared/` — Cross-app utilities (legacy IIFE modules)
- `domain/` — Domain logic and constants (IIFE modules)

## Design Principles

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

## Registration App Architecture

The registration app is the most complex frontend, handling member check-in, court assignment, waitlist management, and admin functions.

### Composition Layer

```
src/registration/
├── App.jsx (36 lines) — Composition root
│   ├── useRegistrationAppState() — All state/hooks
│   ├── useRegistrationHandlers() — All handlers
│   └── <RegistrationRouter app={app} handlers={handlers} />
```

### State Modules

The app state is composed from 7 focused sub-modules:

```
appHandlers/state/
├── useRegistrationAppState.js — Composition hook
├── useRegistrationUiState.js — useState declarations
├── useRegistrationRuntime.js — Timers, refs, effects
├── useRegistrationDataLayer.js — Backend subscription
├── useRegistrationDomainHooks.js — Feature hooks (streak, courts, etc.)
├── useRegistrationDerived.js — Computed values
├── useRegistrationHelpers.js — Helper functions
└── buildRegistrationReturn.ts — Return object assembly
```

### Handler Modules

Handlers are grouped by domain concern:

```
appHandlers/handlers/
├── useRegistrationHandlers.js — Composition hook
├── useAdminHandlers.js — Admin operations
├── useGuestHandlers.js — Guest player management
├── useGroupHandlers.js — Group composition
├── useCourtHandlers.js — Court assignment
└── useNavigationHandlers.js — Screen navigation
```

### Router & Routes

```
router/
├── RegistrationRouter.jsx — Thin switch (59 lines)
└── routes/
    ├── HomeRoute.jsx — Home/search
    ├── AdminRoute.jsx — Admin interface
    ├── GroupRoute.jsx — Group management
    ├── CourtRoute.jsx — Court selection
    ├── SuccessRoute.jsx — Success screen
    ├── ClearCourtRoute.jsx — Court clearing
    └── SilentAssignRoute.jsx — Direct assignment
```

### Business Features

**Tournament Matches** — Players can designate a session as a tournament match from the success screen. Tournament sessions play until completion with no time enforcement. They are never selectable or offered to waitlisted groups. The flag is stored on the session record via `/update-session-tournament`.

**Deferred Waitlist** — When all available courts have upcoming blocks that restrict full session time, players can choose to wait for a full-time court. Deferred entries are invisible to queue position logic and only receive CTAs when a court with no time restriction opens. The flag is stored on the waitlist entry via `/defer-waitlist`.

### Props Pattern

Routes receive two grouped objects plus workflow context:
- `app` — Shell-owned state, setters, refs, derived values, services (26 keys)
- `handlers` — All handler functions
- Per-flow state (group composition, court assignment, member identity, streak) is owned by `WorkflowProvider` and consumed via `useWorkflowContext()` in routes, presenters, and handler deps builders

```javascript
// In App.jsx
const app = useRegistrationAppState();
const handlers = useRegistrationHandlers({ ...app });
return (
  <WorkflowProvider backend={backend}>
    <RegistrationRouter app={app} handlers={handlers} />
  </WorkflowProvider>
);

// In routes — shell state from app, per-flow state from workflow context
function GroupRoute({ app, handlers }) {
  const workflow = useWorkflowContext();
  const model = buildGroupModel(app);
  const actions = buildGroupActions(app, workflow, handlers);
  return <GroupScreen {...model} {...actions} />;
}
```

## Service Layer Architecture

The registration app uses a façade pattern for backend communication.

### TennisBackend Façade

`TennisBackend` is the single entry point for all backend operations:

```
backend/
├── TennisBackend.js — Façade (composes queries + commands)
├── TennisQueries.js — Read operations (getBoard, getSettings)
├── TennisCommands.js — Write operations (assignCourt, endSession)
└── TennisDirectory.js — Member search and lookup
```

### ApiTennisService

`ApiTennisService` manages state and delegates to 7 extracted service modules:

| Module | Responsibility |
|--------|----------------|
| `courtsService.js` | Court assignment and session operations |
| `waitlistService.js` | Waitlist CRUD and promotion |
| `membersService.js` | Member lookup and caching |
| `settingsService.js` | System settings access |
| `purchasesService.js` | Ball purchase recording |
| `lifecycleService.js` | Data initialization and refresh |
| `participantResolution.js` | Member/guest resolution logic |

Each service module uses dependency injection for testability:

```javascript
function createCourtsService({ api, getWaitlistData, notifyListeners }) {
  return {
    async assignCourt(courtNumber, players) { ... },
    async endSession(courtNumber) { ... },
  };
}
```

## Admin App Architecture

```
src/admin/
├── App.jsx — Entry point + state management
├── handlers/
│   ├── applyBlocksOperation.js — Block creation logic
│   ├── courtOperations.js — Clear/move court operations
│   └── waitlistOperations.js — Waitlist management
├── tabs/
│   ├── StatusSection.jsx — Court status tab
│   ├── BlockingSection.jsx — Block management
│   ├── CalendarSection.jsx — Event calendar
│   ├── AnalyticsSection.jsx — Usage analytics
│   ├── WaitlistSection.jsx — Waitlist management
│   ├── HistorySection.jsx — Session history
│   ├── SystemSection.jsx — System settings
│   ├── AIAssistantSection.jsx — AI assistant interface
│   └── TabNavigation.jsx — Tab bar
├── blocks/ — Block manager components
├── calendar/ — Calendar components
├── courts/ — Court grid components
├── analytics/ — Analytics charts
└── ai/ — AI assistant interface
```

### Handler Pattern

Admin handlers are pure async functions with dependency injection:

```javascript
async function applyBlocksOperation(ctx, blockConfig) {
  const { api, refreshData, showError } = ctx;
  // ...
}
```

### Domain Objects

Admin sections use domain object props to reduce prop drilling:

```javascript
// Instead of 17 individual props:
<StatusSection
  model={statusModel}
  actions={statusActions}
  isLoading={isLoading}
/>
```

## Courtboard Architecture

```
src/courtboard/
├── main.jsx — Entry point
├── bridge/
│   └── window-bridge.js — Single writer for window.CourtboardState
├── components/
│   ├── TennisCourtDisplay.jsx — Main court grid (state owner)
│   ├── CourtCard.jsx — Individual court display
│   ├── WaitingList.jsx — Waitlist display
│   └── NextAvailablePanel.jsx — Next available courts
└── mobile/
    ├── MobileModalApp.jsx — Mobile shell
    └── MobileModalSheet.jsx — Modal content
```

### Single Writer Pattern

`window.CourtboardState` is written ONLY by `bridge/window-bridge.js`. This prevents race conditions from multiple components updating shared state.

### Court Status Logic

Court display status is computed client-side by `availability.js`. Tournament courts use a two-layer approach: excluded from the availability overtime list (preventing waitlist offers) but overridden to display as overtime (dark blue) on the courtboard. Tournament courts never turn dark green (selectable).

## Error Handling

### AppError Contract

The application uses a single structured error class (`AppError`, defined in
`src/lib/errors/AppError.js`) for programmatic error handling. All other errors
flow as plain `Error` instances.

```javascript
{
  name: 'AppError',
  category: ErrorCategory,  // 'VALIDATION' | 'NETWORK' | 'AUTH' | 'CONFLICT' | 'NOT_FOUND' | 'UNKNOWN'
  code: string,             // Machine-readable code (e.g., 'API_ERROR', 'FETCH_FAILED')
  message: string,          // Human-readable message
  details: any,             // Raw response or original error (for debugging)
}
```

### Throw Sites

`ApiAdapter._fetch()` is the sole throw site. Two cases:

1. **API returned `ok: false`**: `AppError({ category: NETWORK, code: 'API_ERROR', ... })`
2. **Network/fetch failure**: `AppError({ category: NETWORK, code: 'FETCH_FAILED', ... })`

### Dual Error Contract

- **Private methods** (`_get`, `_post`) throw `AppError` on failure.
- **Public methods** (`get`, `post`) catch and return structured error responses:
  ```javascript
  { ok: false, ...fields, error: { category, code, message } }
  ```
- **Network/fetch failure:** `{ ok: false, error: { category: 'NETWORK', code: 'FETCH_FAILED', message } }`

See `docs/error-contracts.md` for the canonical error contract reference.

## Type Boundaries

The registration app uses JSDoc type boundaries with `// @ts-check` to prevent silent drift.

### Canonical Types

| Type | Origin | Description |
|------|--------|-------------|
| `AppState` | `buildRegistrationReturn.ts` | Application state object |
| `Handlers` | `useRegistrationHandlers.js` | All handler functions |

Type definitions live in `src/types/appTypes.ts`.

### TypeScript Checking

Routes and screens have TypeScript checking enabled via JSDoc:

```javascript
// @ts-check
/** @typedef {import('@/types/appTypes').AppState} AppState */

/** @param {{ app: AppState, handlers: Handlers }} props */
function GroupRoute({ app, handlers }) {
  // TypeScript validates prop access
}
```

## Testing Strategy

### Unit Tests (Vitest)

- **3,128 unit tests** across 161 test files
- Cover: reducers, services, transforms, error handling, contract fences,
  orchestrators, presenters (including behavioral presenter tests)
- Mock external dependencies (API, storage)

Coverage ratchet enforced via CI (current baseline: 53.92% statements, 49.22% branches, 45.84% functions). Type-error ratchet enforced at 0 errors with `strictNullChecks` enabled.

### E2E Tests (Playwright)

- **22 tests** across 15 spec files covering critical user flows
- Golden flows: registration, court assignment, waitlist, blocks
- Failure-path tests: assign-court failure, court-occupied race, assign-from-waitlist failure, clear-court failure
- Run against preview server with mock API

### Verification Gate

All gating CI via:

```bash
npm run verify  # lint:ratchet + type:ratchet + coverage:ratchet + test:fixtures + build + test:e2e
```

## Code Standards

### File Size Limit

All source files should be under 500 lines. This encourages modular design and makes code easier to understand.

### Import Aliases

```javascript
import { logger } from '@lib';        // src/lib/
import { Events } from '@shared';     // shared/
import { getFreeCourts } from '@domain';  // domain/
```

### ESLint Boundaries

Architecture boundaries are enforced via ESLint:
- UI components (*.jsx) cannot import `ApiAdapter` directly
- Application code cannot use raw `localStorage` (use `prefsStorage.js`)
- camelCase enforced in application code (snake_case allowed at API boundaries)

## Security Model

### Current State: Demo Mode

> ⚠️ **This system is currently in open demo mode.** Security relies primarily on physical access control (kiosk in private club). There is no user authentication.

| Surface | Protection |
|---------|------------|
| Registration | Open access |
| Admin | URL-path detection only (no auth) |
| Courtboard | Read-only, open access |
| Mobile | Open access |

### Key Security Facts

- **Anon key only:** No service role key in frontend code
- **No direct DB writes:** All mutations via Edge Functions
- **Device IDs:** Client-supplied constants (spoofable)
- **Admin access:** Anyone who navigates to `/admin/` has full access

An auth-ready seam is in place: `src/admin/guards/adminAccessGuard.js` provides `checkAdminAccess()` and `useAdminAccess()` hooks that currently return `{ allowed: true }` in all modes. `ADMIN_ACCESS_MODE` in `src/config/runtimeConfig.js` defaults to `'open'`. When authentication is implemented, this seam activates without structural changes.

### Production Hardening Checklist

When leaving demo mode:

- [ ] Add admin authentication (auth-ready seam scaffolded in `adminAccessGuard.js` — implement Supabase Auth + JWT verification)
- [ ] Implement device enrollment with server-issued tokens
- [ ] Audit RLS policies in Supabase
- [ ] Verify Edge Function authorization
- [ ] Rotate credentials after removing hardcoded values
- [ ] Enable rate limiting
- [ ] Restrict CORS to known deployment URLs
- [ ] Add audit logging for admin actions

## API Endpoints

### Mutation Endpoints (POST)

| Endpoint | Purpose |
|----------|---------|
| `/assign-court` | Assign court to member |
| `/end-session` | End court session |
| `/create-block` | Create court block |
| `/cancel-block` | Cancel court block |
| `/join-waitlist` | Join waitlist |
| `/cancel-waitlist` | Cancel waitlist entry |
| `/assign-from-waitlist` | Assign court from waitlist |
| `/update-system-settings` | Update settings |
| `/purchase-balls` | Record ball purchase |
| `/update-session-tournament` | Toggle is_tournament flag on active session |
| `/defer-waitlist` | Mark waitlist entry as deferred (waiting for full-time court) |

### Query Endpoints (GET)

| Endpoint | Purpose |
|----------|---------|
| `/get-board` | Court status for all surfaces |
| `/get-members` | Member lookup/search |
| `/get-settings` | System settings |
| `/get-blocks` | Block list |
| `/get-analytics` | Usage analytics |
| `/get-frequent-partners` | Partner suggestions |

## Known Technical Debt

### Hardcoded Credentials

The frontend contains hardcoded Supabase credentials in `src/config/runtimeConfig.js` as development fallbacks. Production deployments should use environment variables.

### Files Over 500 Lines

| File | Lines | Notes |
|------|-------|-------|
| `src/types/appTypes.ts` | 1,237 | Type definitions only — acceptable exception (no logic) |
| `src/lib/backend/TennisCommands.js` | 611 | Command methods |
| `src/tennis/domain/availability.js` | 610 | Court availability logic |
| `src/lib/ApiAdapter.js` | 546 | API client |
| `src/tennis/domain/waitlist.js` | 538 | Waitlist domain logic |
| `src/registration/orchestration/assignCourtOrchestrator.ts` | 545 | Court assignment orchestration |

The remaining five files (excluding `appTypes.ts`) are candidates for extraction when next modified for functional changes.

## Entry Points & Module System

| Entry | HTML | Main Module |
|-------|------|-------------|
| Registration | `src/registration/index.html` | `src/registration/main.jsx` |
| Courtboard | `src/courtboard/index.html` | `src/courtboard/main.jsx` |
| Admin | `src/admin/index.html` | `src/admin/main.jsx` |
| Mobile Shell | `Mobile.html` | `src/mobile-shell/main.js` |

All domain logic lives in ES modules under `src/`. Legacy `window.Tennis.*` globals are populated by adapter modules in `src/platform/attachLegacy*.js`, imported at the top of each entry point.

### Mobile Shell

`Mobile.html` is an ESM entry that coordinates Registration and Courtboard iframes. It loads `src/mobile-shell/main.js` which imports only the Events adapter. Shell logic:
- `mobileBridge.js` — iframe coordination, state sync via sessionStorage, postMessage
- `healthCheck.js` — iframe health monitoring, debug-only selfTest (`?debug=1`)

### Adapter Pattern

Each `attachLegacy*.js` module:
1. Imports canonical ESM implementation
2. Attaches to `window.Tennis.*` for legacy compat
3. Self-registers on import (no explicit init call)

Adapters (in import order):

| # | Adapter | Global |
|---|---------|--------|
| 1 | `attachLegacyConfig.js` | `window.Tennis.Config` |
| 2 | `attachLegacyTime.js` | `window.Tennis.Domain.Time` |
| 3 | `attachLegacyStorage.js` | `window.Tennis.Storage` |
| 4 | `attachLegacyEvents.js` | `window.Tennis.Events` |
| 5 | `attachLegacyDataStore.js` | `window.Tennis.DataStore` |
| 6 | `attachLegacyBlocks.js` | `window.Tennis.Domain.Blocks` |
| 7 | `attachLegacyAvailability.js` | `window.Tennis.Domain.Availability` |
| 8 | `attachLegacyRoster.js` | `window.Tennis.Domain.Roster` |
| 9 | `attachLegacyWaitlist.js` | `window.Tennis.Domain.Waitlist` |

### ESM → Legacy Global Mapping

| ESM Module | Legacy Global |
|------------|---------------|
| `src/tennis/config.js` | `Tennis.Config` |
| `src/tennis/domain/time.js` | `Tennis.Domain.Time` |
| `src/lib/storage.js` | `Tennis.Storage` |
| `src/tennis/events.js` | `Tennis.Events` |
| `src/tennis/datastore.js` | `Tennis.DataStore` |
| `src/tennis/domain/blocks.js` | `Tennis.Domain.Blocks` |
| `src/tennis/domain/availability.js` | `Tennis.Domain.Availability` |
| `src/tennis/domain/roster.js` | `Tennis.Domain.Roster` |
| `src/tennis/domain/waitlist.js` | `Tennis.Domain.Waitlist` |

## Error Boundaries

App-level boundaries wrap each entry point:
- Registration: "Court Registration"
- Courtboard: "Courtboard Display"
- Admin: "Admin Panel"
- Mobile Shell: try/catch with fallback HTML

Feature boundaries protect known-risk areas:
- Court Selection (`CourtRoute.jsx`)
- Waitlist Display (`TennisCourtDisplay.jsx`, both instances)

All boundaries: log to console, emit `clientError` via `Tennis.Events.emitDom` (falls back to raw `CustomEvent` dispatch), show Reload + Copy Diagnostic Info buttons.

### clientError Event Payload

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Error message |
| `stack` | string | Stack trace (when available) |
| `context` | string | Boundary label (e.g. "Court Registration") |
| `route` | string | `window.location.pathname` |
| `timestamp` | string | ISO 8601 |
| `deviceId` | string | Device identifier (when available) |

## Orchestrator Dependency Conventions

Preferred pattern for orchestrator dependencies (grouped deps):

```js
async function myOrchestrator(input, deps) {
  const { state, actions, services, ui } = deps;
}
```

Current status:
- `assignCourtOrchestrator`: grouped deps
- `adminOperations`: context objects
- `waitlistOrchestrator`: flat deps (legacy, predates grouped convention)

Rule: New orchestrators must use grouped deps (`{ state, actions, services, ui }`). Existing flat deps will be migrated when those files are next modified for functional changes.

### Test Coverage Requirements

Orchestrator tests must verify these sanity checks:
1. Guard failures reset state (mutation safety)
2. Backend throw → alert + state reset
3. Double-click / double-submit guard

See `tests/unit/orchestration/` for reference.

## Controller & Presenter Patterns

### Registration: Presenter Pattern

Routes use presenter functions to extract props:

```js
function GroupRoute({ app, handlers }) {
  const model = buildGroupModel(app);
  const actions = buildGroupActions(app, handlers);
  return <GroupScreen {...model} {...actions} />;
}
```

Presenter files: `src/registration/router/presenters/`
Tests: `tests/unit/registration/*Presenter.equivalence.test.js`

### Admin: Domain Object Factories

Admin uses factory functions to create domain objects via `buildAdminController.js`:

```js
<StatusSection statusModel={statusModel} statusActions={statusActions} />
```

Controller assembly: `src/admin/controller/buildAdminController.js`
Tests: `tests/unit/admin/controller/buildAdminController.contract.test.js`

## Courtboard State Bridge

Courtboard shares state with non-React code via a window global:

```
API (get-board) → React State (main.jsx) → window.CourtboardState
                                                    │
              ┌─────────────────────────────────────┤
              ▼                  ▼                   ▼
    mobile-fallback-bar.js  mobile-bridge.js   MobileModal
```

- **Writer** (exactly one): `main.jsx` useEffect syncs React state
- **Readers**: `getCourtboardState()` from `courtboardState.js`
- **Guaranteed fields**: `courts`, `courtBlocks`, `waitingGroups`
- **Optional fields**: `upcomingBlocks`, `freeCourts`, `timestamp`

See [docs/adr/006-courtboard-legacy-containment.md](./docs/adr/006-courtboard-legacy-containment.md) for the full containment strategy.

## Courtboard Icon Contract

Courtboard icons use emoji in `<span>` elements sized via `fontSize` — this is intentional. SVG icons (lucide-react) break courtboard layout because `<svg>` elements have a different sizing model than inline text spans. Courtboard must never import from `src/shared/ui/icons/Icons.jsx`.

## Contract Tests

Contract tests (`*.contract.test.js`, `*.equivalence.test.js`) are non-negotiable CI gates. Any controller, presenter, or bridge surface change requires updating inline snapshots in the same PR with written rationale.

Contract test files (`*.contract.test.js`): `buildAdminController.contract.test.js`, `useCourtActions.contract.test.js`, `useAdminHandlers.contract.test.js`, `taxonomyChain.contract.test.js`, `normalizeSession.contract.test.js`, `waitlistPosition.contract.test.js`, `buildHandlerDeps.contract.test.js`. Additional contract-style test: `useRegistrationAppState.test.js` (freezes 26-key AppState shape). Equivalence tests: 5 registration + 4 admin presenter equivalence tests.

Gate: `npm run verify`

## Related Documentation

- [README.md](./README.md) — Quick start and overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development workflow
- [docs/START_HERE.md](./docs/START_HERE.md) — New developer entry point
- [docs/DEPENDENCY_MAP.md](./docs/DEPENDENCY_MAP.md) — Module boundaries and import rules
- [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) — Environment configuration
- [docs/TESTING.md](./docs/TESTING.md) — Testing strategy
- [docs/GOLDEN_FLOWS.md](./docs/GOLDEN_FLOWS.md) — Critical user flows
- [docs/RUNBOOK.md](./docs/RUNBOOK.md) — Operations guide

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
└── buildRegistrationReturn.js — Return object assembly
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

### Props Pattern

Routes receive two grouped objects instead of individual props:
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

## Error Handling

### DomainError Contract

All service-layer errors use the `DomainError` class:

```javascript
class DomainError extends Error {
  constructor(code, message, { safeDetails, cause } = {}) {
    super(message);
    this.code = code;           // NETWORK, DB_ERROR, TRANSFORM_ERROR, etc.
    this.safeDetails = safeDetails;  // { service, operation }
    this.cause = cause;         // Original error for debugging
  }
}
```

### Error Normalization

Service modules wrap all errors using `normalizeServiceError`:

```javascript
async function getCourtByNumber(courtNumber) {
  try {
    // ... operation
  } catch (error) {
    throw normalizeServiceError(error, {
      service: 'courtsService',
      op: 'getCourtByNumber'
    });
  }
}
```

This ensures:
1. **Idempotent:** Existing DomainErrors pass through unchanged
2. **Message preserved:** Original error message kept for UI
3. **Cause attached:** Original error available for debugging
4. **Context sanitized:** Only service/operation in safeDetails

## Type Boundaries

The registration app uses JSDoc type boundaries with `// @ts-check` to prevent silent drift.

### Canonical Types

| Type | Origin | Description |
|------|--------|-------------|
| `AppState` | `buildRegistrationReturn.js` | Application state object |
| `Handlers` | `useRegistrationHandlers.js` | All handler functions |

Type definitions live in `src/types/appTypes.js`.

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

- **683 tests** across 46 test files
- Cover: reducers, services, transforms, error handling
- Mock external dependencies (API, storage)

### E2E Tests (Playwright)

- **15 tests** covering critical user flows
- Golden flows: registration, court assignment, waitlist, blocks
- Run against preview server with mock API

### Verification Gate

```bash
npm run verify  # lint + typecheck + unit + build + e2e
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

### Production Hardening Checklist

When leaving demo mode:

- [ ] Add admin authentication (password, SSO, or device certificate)
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

### Large Components

Some components exceed the 500-line target:

| Component | Lines | Notes |
|-----------|-------|-------|
| `CompleteBlockManagerEnhanced.jsx` | ~900 | Complex block management UI |
| `SystemSettings.jsx` | ~740 | Settings form with many fields |
| `AdminScreen.jsx` | ~720 | Admin interface |

These are candidates for future decomposition.

## Related Documentation

- [README.md](./README.md) — Quick start and overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development workflow
- [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) — Environment configuration
- [docs/TESTING.md](./docs/TESTING.md) — Testing strategy
- [docs/GOLDEN_FLOWS.md](./docs/GOLDEN_FLOWS.md) — Critical user flows
- [docs/RUNBOOK.md](./docs/RUNBOOK.md) — Operations guide

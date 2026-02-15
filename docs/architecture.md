# Architecture

## Module System
All domain logic lives in ES modules under `src/`.
Legacy `window.Tennis.*` globals are populated by
adapter modules in `src/platform/attachLegacy*.js`,
imported at the top of each entry point.

## Entry Points
| Entry | HTML | Main Module |
|-------|------|-------------|
| Registration | src/registration/index.html | src/registration/main.jsx |
| Courtboard | src/courtboard/index.html | src/courtboard/main.jsx |
| Admin | src/admin/index.html | src/admin/main.jsx |
| Mobile Shell | Mobile.html | src/mobile-shell/main.js |

## Mobile Shell
Mobile.html is an ESM entry that coordinates
Registration and Courtboard iframes. It loads
`src/mobile-shell/main.js` which imports only
the Events adapter. Shell logic:
- `mobileBridge.js` — iframe coordination,
  state sync via sessionStorage, postMessage
- `healthCheck.js` — iframe health monitoring,
  debug-only selfTest (?debug=1)

## Adapter Pattern
Each `attachLegacy*.js` module:
1. Imports canonical ESM implementation
2. Attaches to `window.Tennis.*` for legacy compat
3. Self-registers on import (no explicit init call)

Adapters (in import order):
1. `attachLegacyConfig.js` → `window.Tennis.Config`
2. `attachLegacyTime.js` → `window.Tennis.Domain.Time`
3. `attachLegacyStorage.js` → `window.Tennis.Storage`
4. `attachLegacyEvents.js` → `window.Tennis.Events`
5. `attachLegacyDataStore.js` → `window.Tennis.DataStore`
6. `attachLegacyBlocks.js` → `window.Tennis.Domain.Blocks`
7. `attachLegacyAvailability.js` → `window.Tennis.Domain.Availability`
8. `attachLegacyRoster.js` → `window.Tennis.Domain.Roster`
9. `attachLegacyWaitlist.js` → `window.Tennis.Domain.Waitlist`

## Source Locations

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

## Court Availability Logic
Court availability is computed by `src/tennis/domain/availability.js`:
- `getFreeCourtsInfo()` — Excludes tournament courts from "free" count
- `getCourtStatuses()` — Overrides display for blocked/tournament courts
- `src/shared/courts/overtimeEligibility.js` — Excludes from fallback courts

## Error Handling

### Error Boundaries
App-level boundaries wrap each entry point:
- Registration: "Court Registration"
- Courtboard: "Courtboard Display"
- Admin: "Admin Panel"
- Mobile Shell: try/catch with fallback HTML

Feature boundaries protect known-risk areas:
- Court Selection (CourtRoute.jsx)
- Waitlist Display (TennisCourtDisplay.jsx, both instances)

All boundaries:
- Log to console
- Emit 'clientError' via Tennis.Events.emitDom
  (falls back to raw CustomEvent dispatch)
- Diagnostic payload: message, stack, context,
  route, timestamp, deviceId
- Show Reload + Copy Diagnostic Info buttons
- Clipboard failure shows selectable textarea

### clientError Event Contract

All error boundaries and the mobile shell bootstrap
emit a `clientError` CustomEvent via Tennis.Events.emitDom
(with raw CustomEvent fallback).

Detail payload:
- message — error message string
- stack — stack trace (when available)
- context — boundary label (e.g. "Court Registration")
- route — window.location.pathname
- timestamp — ISO 8601 string
- deviceId — device identifier (when available)

Consumers (logging, monitoring, admin tools) should
treat this as best-effort diagnostic telemetry.

## Orchestrator Dependency Conventions

Preferred pattern for orchestrator dependencies
(grouped deps):
```js
async function myOrchestrator(input, deps) {
  const { state, actions, services, ui } = deps;
}
```

Current status:
- assignCourtOrchestrator: grouped deps ✓
- adminOperations: context objects ✓
- waitlistOrchestrator: flat deps (legacy,
  predates grouped convention)

Rule: New orchestrators must use grouped deps
({ state, actions, services, ui }). Existing flat
deps will be migrated when those files are next
modified for functional changes.

### Test Coverage Requirements

Orchestrator tests must verify these sanity checks:
1. Guard failures reset state (mutation safety)
2. Backend throw → alert + state reset
3. Double-click / double-submit guard

See `tests/unit/orchestration/` for reference.

## Controller Patterns

### Registration: Presenter Pattern
Registration routes use presenter functions to extract props:

```js
// Route receives app + handlers
function GroupRoute({ app, handlers }) {
  const model = buildGroupModel(app);
  const actions = buildGroupActions(app, handlers);
  return <GroupScreen {...model} {...actions} />;
}
```

Files:
- `src/registration/router/presenters/groupPresenter.js`
- `src/registration/router/presenters/adminPresenter.js`
- `src/registration/router/presenters/successPresenter.js`
- `src/registration/router/presenters/homePresenter.js`
- `src/registration/router/presenters/courtPresenter.js` (model only)

Tests: `tests/unit/registration/*Presenter.equivalence.test.js`

### Admin: Domain Object Factories
Admin uses factory functions to create domain objects:

```js
// App.jsx creates domain objects with useMemo
const wetCourtsModel = useMemo(() =>
  createWetCourtsModel({ wetCourtsActive, wetCourts, ENABLE_WET_COURTS }),
[deps]);

// Sections receive domain objects
<StatusSection statusModel={statusModel} statusActions={statusActions} />
```

Factory functions in `src/admin/types/domainObjects.js`:
- `createWetCourtsModel/Actions` — Wet court state
- `createBlockModel/Actions/Components` — Court blocking
- `createStatusModel/Actions` — Status display
- `createCalendarModel/Actions` — Calendar display
- `createAIAssistantModel/Actions/Services/Components` — AI assistant

Controller assembly: `src/admin/controller/buildAdminController.js`
Tests: `tests/unit/admin/controller/buildAdminController.contract.test.js`

## State Bridges

### Courtboard: Window Bridge Pattern
Courtboard shares state with non-React code via window global:

```
┌─────────────────────────────────────────────────────┐
│   API (get-board)  ──►  React State (main.jsx)      │
│                               │                      │
│                               ▼                      │
│                    window.CourtboardState            │
│                    (written by useEffect)            │
│                               │                      │
│       ┌───────────────────────┼───────────────┐      │
│       ▼                       ▼               ▼      │
│ mobile-fallback-bar.js  mobile-bridge.js  MobileModal│
│                               │                      │
│               getCourtboardState() (READ-ONLY)       │
└─────────────────────────────────────────────────────┘
```

Contract:
- **Writer** (exactly one): `main.jsx` useEffect syncs React state
- **Readers**: `getCourtboardState()` from `courtboardState.js`
- **Guaranteed fields**: courts, courtBlocks, waitingGroups
- **Optional fields**: upcomingBlocks, freeCourts, timestamp

Files:
- `src/courtboard/courtboardState.js` — Read accessor
- `src/courtboard/bridge/window-bridge.js` — Write function

Tests: `tests/unit/courtboard/courtboardState.contract.test.js`

## Development Rules

### Contract Tests
Contract tests (*.contract.test.js, *.equivalence.test.js)
are non-negotiable CI gates. Any controller, presenter,
or bridge surface change requires updating inline
snapshots in the same PR with written rationale.

Files:
- useRegistrationAppState.contract.test.js
- buildAdminController.contract.test.js
- courtboardState.contract.test.js
- groupPresenter.equivalence.test.js
- adminPresenter.equivalence.test.js
- homePresenter.equivalence.test.js
- successPresenter.equivalence.test.js
- courtPresenter.equivalence.test.js

Gate: npm run verify

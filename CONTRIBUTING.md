# Contributing to NOLTC Tennis Registration

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Getting Started
```bash
git clone <repo>
cd NOLTCsignup
npm install
npm run dev
```

## Development Workflow

### Before Making Changes
1. Pull latest from main
2. Run `npm run verify` to ensure clean baseline
3. Create a feature branch

### Making Changes
1. Make incremental changes
2. Run `npm run verify` after each logical change
3. Commit with conventional commit messages

### Verification Gate (REQUIRED)
Every commit must pass the full verification suite:
```bash
npm run verify
```

This runs:
1. `npm run lint:ratchet` — ESLint with baseline enforcement (0 errors, warnings must not increase)
2. `npm run type:ratchet` — TypeScript with baseline enforcement (error count must not increase)
3. `npm run test:unit` — Vitest unit tests (994 tests)
4. `npm run build` — Vite production build
5. `npm run test:e2e` — Playwright E2E tests (14/14 required)

**Do not commit if any gate fails.**

## Commit Conventions

Use conventional commits:
```
feat(scope): add new feature
fix(scope): fix bug
refactor(scope): code change with no behavior change
docs(scope): documentation only
test(scope): add or update tests
chore(scope): maintenance tasks
```

### Scopes
- `registration` — Main registration flow
- `router` — Routing components
- `handlers` — Handler modules
- `state` — State management
- `backend` — Backend/API layer
- `ui` — UI components

## Code Organization

### File Size Rule
**No file should exceed 500 lines.** If a file grows beyond this:
1. Identify cohesive chunks
2. Extract to separate modules
3. Maintain the same API surface
4. Verify with Playwright

### Module Patterns

#### State Modules (`src/registration/appHandlers/state/`)
- `useRegistrationUiState` — useState declarations
- `useRegistrationRuntime` — Timers, refs, effects
- `useRegistrationDataLayer` — Backend subscription, data loading
- `useRegistrationDomainHooks` — Feature hook consolidation
- `useRegistrationDerived` — Computed values (useMemo)
- `useRegistrationHelpers` — Helper functions

#### Handler Modules (`src/registration/appHandlers/handlers/`)
- `useAdminHandlers` — Admin operations
- `useGuestHandlers` — Guest management
- `useGroupHandlers` — Group/player selection
- `useCourtHandlers` — Court assignment
- `useNavigationHandlers` — Screen navigation

#### Route Components (`src/registration/router/routes/`)
- One file per screen
- Receives `{ app, handlers }` props only
- Destructures what it needs internally

### Component Patterns

**Route Components** receive only `{ app, handlers }`:
```jsx
export function HomeRoute({ app, handlers }) {
  const { search, derived, CONSTANTS } = app;
  const { handleSuggestionClick } = handlers;
  // ...
}
```

**Screen Components** receive explicit props:
```jsx
export function HomeScreen({
  searchInput,
  setSearchInput,
  onSuggestionClick,
  // ...
}) {
  // ...
}
```

### Naming Conventions
- **Hooks**: `use` prefix (`useRegistrationAppState`)
- **Handlers**: `handle` prefix (`handleSuggestionClick`)
- **Setters**: `set` prefix (`setCurrentScreen`)
- **Boolean state**: `is`/`has`/`show` prefix (`isAssigning`, `hasWaitlistPriority`, `showAlert`)

## Refactoring Rules

### "No Behavior Change" Refactors
When refactoring (moving code, extracting modules):

1. **Verbatim extraction** — Copy exact code, no "improvements"
2. **Same API surface** — Return same identifiers
3. **Same dependency arrays** — Don't "fix" useCallback/useEffect deps
4. **Playwright gate** — Must pass 14/14 after each commit

### Integration Order
When wiring state modules:
1. UI State first (provides setters)
2. Runtime (provides refs)
3. Domain Hooks (provides hook outputs)
4. Data Layer (may need outputs from Domain Hooks)
5. Derived values (computed from above)
6. Helpers (may use all of above)

## Testing

### Unit Tests (Vitest)
```bash
npm run test:unit        # Run once
npm run test:unit:watch  # Watch mode
```

Unit tests live in `tests/unit/` mirroring source structure.

### E2E Tests (Playwright)
```bash
npm run test:e2e         # Run all
npx playwright test <file>  # Run specific
```

E2E tests live in `e2e/` directory.

### Writing Tests
- Unit test reducers and pure functions
- E2E test critical user flows (see `docs/GOLDEN_FLOWS.md`)
- Always run full verification before committing

### Writing Handler Tests

Handler modules (`src/registration/appHandlers/handlers/`) are React hooks
wrapping orchestrator calls with guards, error handling, and state resets.
Use the test harness in `tests/helpers/handlerTestHarness.js`.

**Setup:**
```js
import { createCourtHandlerDeps, renderHandlerHook } from '../../../../helpers/handlerTestHarness.js';
import { useCourtHandlers } from '../../../../../src/registration/appHandlers/handlers/courtHandlers.js';

let deps, mocks, result, unmount;
beforeEach(async () => {
  ({ deps, mocks } = createCourtHandlerDeps());
  ({ result, unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));
});
afterEach(() => unmount()); // Required — prevents cross-test leakage
```

**Testing rules per callback type:**
- **Pure delegation (no guards, no catch):** One happy-path test — assert
  correct args passed to orchestrator.
- **Guarded callback:** Happy path + guard failure test (orchestrator NOT
  called, feedback shown).
- **Error-handling callback (try/catch):** Happy path + error test (mock
  rejection, verify toast/alert + reset setters called).

**Adding tests for other handlers:**
Use `createBaseDeps()` from the harness and extend with handler-specific
fields. See `createCourtHandlerDeps` as the reference implementation.

## Architecture Overview

See `ARCHITECTURE.md` for full details.

### Key Principles
- **Backend-authoritative** — Supabase is source of truth
- **Event sourcing** — Commands → events → projections
- **RLS** — Row-level security on all tables
- **Idempotent operations** — Safe to retry

### State Management
- **App state**: `useRegistrationAppState` hook
- **Handlers**: `useRegistrationHandlers` hook
- **Grouped props**: `app` object (state/config) and `handlers` object (actions)

### Data Flow
```
User Action
→ Handler (useRegistrationHandlers)
→ Orchestrator (registration/orchestration/)
→ Backend Command (registration/backend/)
→ Supabase Edge Function
→ Database
→ Realtime subscription
→ UI update
```

### Boundary Enforcement
Layer boundaries are ESLint-enforced — `npm run verify` will reject violations. See `docs/ARCHITECTURE_MAP.md` § "Boundary Enforcement" for the full table of 8 rules. Key constraints:
- Screens cannot import orchestrators or backend
- Orchestrators and presenters must be pure (no React imports)
- Handlers cannot import UI components
- No `window.X =` outside the platform bridge layer

### Exemptions

Boundary rule exemptions are narrowly scoped in `eslint.config.js`. Before adding a new exemption:

1. **Document why** — the file cannot comply without breaking legacy constraints
2. **State the deletion condition** — what change would allow removing the exemption
3. **Keep scope minimal** — exempt the specific file, not an entire directory

Current exemptions: entry points (`main.jsx`), legacy interop (`helpers.js`, `courtOperations.js`, `AIAssistantAdmin.jsx`), `useAdminSettings.js` (singleton guard pattern), and courtboard plain scripts.

### AppState Top-Level Key Governance

Do not add new top-level keys to the `AppState` interface. The current 33 keys are frozen by contract test (`useRegistrationAppState.test.js`).

New state should be added to the appropriate existing sub-interface:

| Concern | Add fields to |
|---------|--------------|
| UI state (visibility, modes, selections) | `RegistrationUiState` |
| UI setters | `RegistrationSetters` |
| Court management | `CourtAssignmentState` or `ClearCourtFlow` |
| Waitlist features | `WaitlistAdminState` |
| Block scheduling | `BlockAdminState` |
| Group/guest management | `GroupGuestState` |
| Member lookup | `MemberIdentityState` or `SearchState` |
| Mobile-specific | `MobileState` |
| Alerts/feedback | `AlertState` or `AdminPriceFeedback` |
| Streak tracking | `StreakState` |

If a new top-level key is genuinely required:
1. Document why an existing sub-interface doesn't fit
2. Update the contract test in `useRegistrationAppState.test.js`
3. Update the grouping comments in `appTypes.ts`
4. Note a deletion condition if the key is temporary

```
App.jsx
  └── useRegistrationAppState() → app object
  └── useRegistrationHandlers() → handlers object
  └── RegistrationRouter({ app, handlers })
        └── *Route({ app, handlers })
              └── *Screen({ explicit props })
```

### Backend Integration
- All mutations go through Edge Functions (never direct DB access)
- Real-time updates via Supabase subscriptions
- See `ARCHITECTURE.md` for full details

## Pull Request Process

1. Ensure `npm run verify` passes
2. Update documentation if needed
3. Request review
4. Squash merge to main

## Getting Help

- Check `docs/` for detailed documentation
- Review `ARCHITECTURE.md` for system design
- See `docs/GOLDEN_FLOWS.md` for critical user journeys
- Check work package checkpoints (`docs/WP*.md`) for context

---

## Window Global Policy

### Goals
- Keep app-global access testable and auditable
- Avoid spreading direct `window.*` usage throughout ESM code

### Rules for ESM Files
1. **Do NOT read app-specific globals directly** in ESM files (`src/**/*.js`, `src/**/*.jsx`).
2. **Use platform bridge accessors** from `src/platform/windowBridge.js`.
3. **Writes to app globals are allowed only in designated definition sites** (see below). Do not relocate or refactor these writes.
4. **Browser APIs are allowed** as direct `window.*` access (addEventListener, location, etc.).
5. Do not create ad-hoc wrappers per module; **add/extend accessors in `windowBridge.js`**.

### App-Specific Globals (Use Bridge for READS)

| Global | Bridge Accessor | Notes |
|--------|------------------|-------|
| `window.Tennis` | `getTennis()` | Main namespace |
| `window.Tennis.UI` | `getTennisUI()` | UI utilities |
| `window.Tennis.Domain` | `getTennisDomain()` | Domain logic |
| `window.Tennis.Commands` | `getTennisCommands()` | Command handlers |
| `window.Tennis.DataStore` | `getTennisDataStore()` | Data store |
| `window.Tennis.Storage` | `getTennisStorage()` | Storage adapter |
| `window.Tennis.Events` | `getTennisEvents()` | Event bus |
| `window.Tennis.Config` | `getTennisNamespaceConfig()` | Namespace config |
| `window.APP_UTILS` | `getAppUtils()` | App constants |
| `window.UI` | `getUI()` | UI namespace |
| `window.MobileModal` | `getMobileModal()` | Mobile modal API |
| `window.refreshBoard` | `getRefreshBoard()` | Board refresh function |
| `window.refreshAdminView` | `getRefreshAdminView()` | Admin refresh function |
| `window.loadData` | `getLoadData()` | Data loader function |
| `window.mobileTapToRegister` | `getMobileTapToRegister()` | Mobile tap handler |
| `window.GeolocationService` | `getGeolocationService()` | Geolocation |

### Allowed Direct Window Access

Browser APIs (keep as `window.*`):
- `window.addEventListener` / `removeEventListener`
- `window.dispatchEvent`
- `window.location`
- `window.parent` / `top` / `self`
- `window.confirm`
- `window.innerWidth` / `innerHeight`
- `window.setTimeout` / `setInterval`

### Plain Script Exceptions (cannot use ESM imports)
- `src/courtboard/mobile-fallback-bar.js`
- `src/courtboard/mobile-bridge.js`
- `src/courtboard/sync-promotions.js`
- `src/courtboard/debug-panel.js`

### Global Definition Sites (allowed WRITES for interop)
- `src/lib/browser-bridge.js` — defines `window.APP_UTILS`, `window.Tennis`
- `src/courtboard/courtboardState.js` — defines `window.CourtboardState`
- `src/courtboard/components/TennisCourtDisplay.jsx` — defines `window.refreshBoard`
- `src/admin/App.jsx` — defines `window.refreshAdminView`
- `src/registration/appHandlers/useRegistrationAppState.js` — defines `window.loadData`

### Adding New Globals

1. Add the global write in the appropriate definition site
2. Add a bridge accessor in `src/platform/windowBridge.js`
3. Use the accessor in all ESM files
4. Document in this table

### Enforcement

Window global access is ESLint-enforced — `npm run verify` will fail if violated:
- **Reads** of `Tennis`, `APP_UTILS`, `localStorage`, `alert`, `confirm` are blocked by `no-restricted-globals` / `no-restricted-properties`
- **Writes** (`window.X = ...`) are blocked by `no-restricted-syntax` in `registration/` and `admin/`
- Entry points, legacy interop files, and tests are narrowly exempted in `eslint.config.js`

### Supplementary Audit Command

For deeper auditing beyond what ESLint catches (e.g., courtboard plain scripts):
```bash
rg "window\.(Tennis|APP_UTILS|CourtboardState|UI|MobileModal|refreshBoard|refreshAdminView|loadData|mobileTapToRegister)" src --glob "*.js" --glob "*.jsx" \
  | grep -v "src/platform/windowBridge.js" \
  | grep -v "src/lib/browser-bridge.js" \
  | grep -v "src/courtboard/mobile-fallback-bar.js" \
  | grep -v "src/courtboard/mobile-bridge.js" \
  | grep -v "src/courtboard/sync-promotions.js" \
  | grep -v "src/courtboard/debug-panel.js" \
  | grep -v "src/courtboard/bridge/window-bridge.js" \
  | grep -v "src/courtboard/courtboardState.js"
```

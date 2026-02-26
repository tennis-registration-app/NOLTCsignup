# Onboarding / Golden Flows Evidence

## Look for golden flow docs
docs/LEGACY_MIGRATION.md:51:5. Test the affected flows manually
docs/LEGACY_MIGRATION.md:72:2. Test affected flows manually
docs/verification-checklist.md:52:## 2. Registration Flows
docs/verification-checklist.md:127:## 3. Admin Flows
docs/verification-checklist.md:312:- [ ] Core flows work end-to-end (Sections 1-3)
docs/ARCHITECTURE_MAP.md:81:- Do NOT orchestrate workflows
docs/ARCHITECTURE_MAP.md:84:- Coordinate multi-step workflows
docs/ARCHITECTURE_MAP.md:191:## Feature Data Flows
docs/API_TESTING.md:13:3. **E2E tests** (Playwright) test full user flows with Playwright route interception at the HTTP layer.
docs/API_TESTING.md:15:This layer fills the gap between orchestrator mocks and E2E flows, ensuring the API facade layer — which has real logic (payload mapping, normalization, caching, error wrapping) — is covered by fast, deterministic tests.
docs/TESTING.md:37:- **For**: Full user flows, screen interactions, integration
docs/TESTING.md:43:- Add E2E test for new user-facing flows
docs/TESTING.md:104:| `registration-happy-path.spec.js` | Registration Happy Path | `/src/registration/index.html` |
docs/TESTING.md:158:## Registration Flows
docs/TESTING.md:194:## Waitlist Flows
docs/TESTING.md:222:## Admin Flows
docs/internal/PHASE4_CHARTER.md:39:- Target: Zero hardcoded secrets; all credential access flows through runtimeConfig.js
docs/internal/ORCHESTRATION.md:5:This document defines orchestration patterns used in the NOLTC Tennis Registration System. Orchestrators coordinate flows involving backend mutations, state updates, device signaling, timers, and user feedback.
docs/internal/ORCHESTRATION.md:216:- Any changes to admin flows (`src/admin/App.jsx`)
docs/GOLDEN_FLOWS.md:1:# Golden Flows
docs/GOLDEN_FLOWS.md:3:These are the critical user flows that must work correctly at all times. They serve as:
docs/GOLDEN_FLOWS.md:11:## Flow 1: Registration Happy Path
docs/GOLDEN_FLOWS.md:217:## Using These Flows
docs/GOLDEN_FLOWS.md:223:These flows are implemented as Playwright tests with:
docs/GOLDEN_FLOWS.md:229:When a golden flow fails:

## CONTRIBUTING / onboarding
-rw-r--r--@ 1 claudewilliams  staff  9494 Feb  1 06:12 CONTRIBUTING.md
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
- `npm run lint` — ESLint checks (0 errors required)
- `npm run test:unit` — Vitest unit tests (267+ tests)
- `npm run build` — Production build
- `npm run test:e2e` — Playwright E2E tests (15/15 required)

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
4. **Playwright gate** — Must pass 15/15 after each commit

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

```
App.jsx
  └── useRegistrationAppState() → app object
  └── useRegistrationHandlers() → handlers object
  └── RegistrationRouter({ app, handlers })
        └── *Route({ app, handlers })
              └── *Screen({ explicit props })
```


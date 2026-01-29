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

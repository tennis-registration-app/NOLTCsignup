# NOLTC Architecture Map

**Purpose:** Contractor discoverability — "If you need to change X, start here."

---

## Quick Reference

| I need to... | Start here |
|--------------|------------|
| Add a new court UI feature | `src/registration/court/` hooks |
| Change member search behavior | `src/registration/search/useMemberSearch.js` |
| Modify group/guest logic | `src/registration/group/useGroupGuest.js` |
| Update streak warning | `src/registration/streak/useStreak.js` |
| Change block admin behavior | `src/registration/blocks/useBlockAdmin.js` |
| Modify waitlist admin | `src/registration/waitlist/useWaitlistAdmin.js` |
| Change frequent partners | `src/registration/memberIdentity/useMemberIdentity.js` |
| Modify tournament match logic | `src/lib/commands/updateSessionTournament.js` |
| Change deferred waitlist behavior | `src/lib/commands/deferWaitlist.js` |
| Modify court availability logic | `src/tennis/domain/availability.js` + `src/shared/courts/overtimeEligibility.js` |
| **Touch court assignment flow** | ⚠️ READ ORCHESTRATION.md FIRST |
| **Touch navigation/screens** | ⚠️ App.jsx — high coupling zone |

---

## Module Map

```
src/registration/
├── App.jsx                    # Main component + orchestrators (HIGH COUPLING)
├── blocks/
│   ├── blockAdminReducer.ts   # Pure state machine (TypeScript)
│   └── useBlockAdmin.js       # Block admin hook
├── waitlist/
│   ├── waitlistAdminReducer.ts
│   └── useWaitlistAdmin.js
├── search/
│   ├── memberSearchReducer.ts
│   └── useMemberSearch.js     # Includes debounce logic
├── group/
│   ├── groupGuestReducer.ts
│   └── useGroupGuest.js
├── streak/
│   ├── streakReducer.ts
│   └── useStreak.js
├── memberIdentity/
│   ├── memberIdentityReducer.ts
│   └── useMemberIdentity.js   # Includes cache + fetch
├── court/
│   ├── courtAssignmentResultReducer.ts
│   ├── useCourtAssignmentResult.js
│   ├── clearCourtFlowReducer.ts
│   └── useClearCourtFlow.js
├── handlers/
│   └── adminOperations.js     # Extracted admin handlers
└── screens/
    └── *.jsx                  # UI components (render only)
```

---

## Invariants (Do Not Violate)

### Reducers
- Pure functions: `(state, action) => newState`
- No side effects
- No async
- No backend calls

### Hooks
- Manage state via reducer
- Expose setters with stable identity (useCallback)
- May include derived values (useMemo)
- May include fetch functions (for data loading)
- Do NOT include navigation logic

### Screens/Components
- Render UI only
- Receive state + handlers via props
- Do NOT call backend directly — **ESLint-enforced**
- Do NOT orchestrate workflows — **ESLint-enforced**

### Orchestrators (`src/registration/orchestration/`)
- Coordinate multi-step workflows
- Make backend calls
- Handle navigation
- Must be pure functions (no React imports) — **ESLint-enforced**
- See ORCHESTRATION.md for frozen list

---

## Do-Not-Touch Zones 🚫

| Zone | Reason | Required Before Change |
|------|--------|----------------------|
| `assignCourtToGroup` | 370-line orchestrator | Approval + decomposition plan |
| `sendGroupToWaitlist` | GPS + validation coupling | Approval |
| `handleSuggestionClick` | Crosses 5+ clusters | Approval |
| `src/tennis/domain/*` | Shared business logic | Unit test coverage |
| Backend adapters | API contract | Integration tests |

---

## Testing Requirements

| Change Type | Required Tests |
|-------------|---------------|
| Reducer change | Reducer unit tests |
| Hook change | Reducer tests + Playwright |
| Screen change | Playwright |
| Orchestrator change | Full Playwright suite + manual QA |
| Domain logic change | Domain unit tests + Playwright |

---

## Adding New Features

### Safe Pattern (Low Risk)
1. Add state to appropriate reducer
2. Expose via hook
3. Pass to screen as props
4. Playwright verification

### Medium Risk Pattern
1. Inventory existing coupling
2. Document in PR
3. Review required
4. Playwright + manual QA

### High Risk Pattern (Requires Strategy)
1. Write BEFORE/AFTER behavior spec
2. Get approval
3. Incremental implementation with gates
4. Full regression testing

---

## Architectural Guardrails

Architectural boundaries and enforcement mechanisms prevent common drift patterns. These guardrails are treated as **hard constraints**: any change that violates them requires explicit approval + test evidence.

### 1. Config Validation + Freeze
- **Location:** `src/config/` (see referenced docs)
- **Behavior:** Runtime config validates required env vars in production, uses dev defaults in development/test, and returns a frozen object
- **Docs:** `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`

### 2. Window Globals Policy
- **Writes:** Centralized in `src/platform/registerGlobals.js` via setter helpers
- **Reads:** Via `src/platform/windowBridge.js`
- **Rule:** No `window.X = ...` outside platform layer (except documented IIFE exceptions)
- **Enforcement:** ESLint `no-restricted-syntax` blocks `window.X =` assignments in `registration/` and `admin/`. ESLint `no-restricted-globals` and `no-restricted-properties` block reads of `Tennis`, `APP_UTILS`, `localStorage`, `alert`, `confirm`. Entry points and legacy interop files are narrowly exempted.
- **Docs:** `docs/WINDOW_GLOBALS.md`

### 3. Orchestrator Deps Grouping
- **Pattern:** Large dependency objects grouped into `{ state, actions, services, ui }`
- **resetOrchestrator:** Shell-level cleanup only (6 setters + 1 service). Workflow state resets via WorkflowProvider key-based remount — no explicit setter calls needed
- **assignCourtOrchestrator:** Grouped deps (`{ state, actions, services, ui }`) sourced from `app` + workflow context via `buildHandlerDeps`

### 4. Boundary Normalization Rule
- **Rule:** snake_case allowed only at boundaries; internal UI/services use camelCase
- **Boundaries:** `src/lib/normalize/`, `src/registration/backend/` (plus any documented adapter modules)
- **Anti-pattern eliminated:** dual-format fallbacks (e.g., `value || value_snake`)
- **Docs:** `docs/CODE_CONVENTIONS.md`

### 5. ESLint Naming Enforcement
- **Rule:** `camelcase` enabled as a ratchet-friendly warning with:
  - `properties: "never"`
  - `ignoreDestructuring: true`
  - `ignoreImports: true`
- **Exemptions:** Boundary modules listed above
- **Enforcement:** Lint ratchet prevents new violations
- **Docs:** `docs/CODE_CONVENTIONS.md`

### Verification

Most boundaries are now ESLint-enforced — `npm run verify` will fail if violated. The following `rg` commands are supplementary audit tools for boundaries not yet covered by ESLint:

```bash
# Config: no hardcoded secrets outside the config module(s)
rg "supabase.*url|anon.*key" src/ --glob "*.js" | rg -v "src/config/"

# Window writes: ESLint-enforced (no-restricted-syntax) — this rg check is supplementary
rg "\bwindow\.\w+\s*=" src/ --glob "*.js" --glob "*.jsx" | rg -v "src/platform/"

# Naming: no snake_case in JSX outside boundary modules
rg -n "\b[a-z]+_[a-z]+\b" src/ --glob "*.jsx" | rg -v "src/lib/normalize|src/registration/backend"

# Dual-format: no fallback patterns
rg -n "accountId\s*\|\|.*account_id|isPrimary\s*\|\|.*is_primary" src/
```

All checks should return empty (or only documented boundary exceptions).

---

## Boundary Enforcement (ESLint-backed)

These rules are mechanically enforced — CI rejects violations via `npm run verify`:

| Rule | Scope | What it prevents |
|------|-------|-----------------|
| No raw ApiAdapter | `*.jsx` | UI bypassing the backend facade |
| No orchestration/backend from screens | `*/screens/**` | Screens doing business logic |
| No backend from presenters | `*/presenters/**` | Presenters making API calls |
| No React in presenters | `*/presenters/**` | Impure presenters |
| No cross-app imports | `admin/**`, `courtboard/**` | Coupling between apps |
| No React in orchestrators | `orchestration/**` | Impure orchestrators |
| No UI imports from handlers | `appHandlers/**` | Handlers importing components |
| No `window.X =` assignments | `registration/**`, `admin/**` | Global pollution outside platform |

Plus global bans: `localStorage`, `alert`, `confirm`, `window.Tennis` (outside platform bridge).

Exemptions are narrowly scoped to entry points (`main.jsx`), legacy interop files, and test files. See `eslint.config.js` for the full list.

---

## Feature Data Flows

### Tournament Match Flow

Tournament matches allow sessions to play until completion, bypassing scheduled end times.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Database: sessions.is_tournament (boolean, default false)               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐       ┌───────────────┐
│ update-session│      │ get-courts    │       │ get-board     │
│ -tournament   │      │ RPC           │       │ RPC           │
│ (Edge Fn)     │      └───────┬───────┘       └───────┬───────┘
└───────────────┘              │                       │
                               ▼                       ▼
                      ┌───────────────────────────────────────┐
                      │ src/lib/normalize/normalizeSession.js │
                      │ is_tournament → isTournament          │
                      └───────────────────┬───────────────────┘
                                          │
                      ┌───────────────────┼───────────────────┐
                      ▼                   ▼                   ▼
             ┌─────────────┐    ┌─────────────────┐   ┌──────────────┐
             │ Registration│    │ availability.js │   │ Courtboard   │
             │ Success     │    │ getFreeCourts   │   │ Display      │
             │ Screen      │    │ (exclusion)     │   │ (override)   │
             └─────────────┘    └─────────────────┘   └──────────────┘
```

**Key files:**
- `supabase/functions/update-session-tournament/` — Edge Function to toggle flag
- `src/lib/commands/updateSessionTournament.js` — Frontend command wrapper
- `src/lib/normalize/normalizeSession.js` — snake_case → camelCase conversion
- `src/tennis/domain/availability.js` — Two-layer exclusion (see below)
- `src/shared/courts/overtimeEligibility.js` — Excludes from fallback courts

**Two-layer availability approach:**
1. `getFreeCourtsInfo()` — Excludes tournament courts from "free" count (no waitlist CTA triggers)
2. `getCourtStatuses()` — Overrides display to show "Tournament" instead of end time

### Deferred Waitlist Flow

Players can defer their waitlist position until a full-time court becomes available.

```
Waitlist entry: { id, players[], deferred: boolean, deferredAt: timestamp }

Active queue logic:
  const active = waitlist.filter(e => !e.deferred)
  const hasWaiters = waitlist.some(e => !e.deferred)

Full-time court detection:
  const hasFullTimeCourt = availableCourts.some(courtNum =>
    !upcomingBlocks.some(b => b.courtNumber === courtNum)
  )
```

**Key files:**
- `src/lib/commands/deferWaitlist.js` — Marks entry as deferred
- `src/tennis/domain/availability.js` — Full-time court detection

**Behavioral invariants:**
- Deferred entries are invisible to queue position calculation
- Don't count as active waiters
- Don't block fresh registrations from seeing available courts
- CTA fires only when full-time court available (no block within session + 5 min buffer)

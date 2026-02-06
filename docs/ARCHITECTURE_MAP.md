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
| **Touch court assignment flow** | ⚠️ READ ORCHESTRATION.md FIRST |
| **Touch navigation/screens** | ⚠️ App.jsx — high coupling zone |

---

## Module Map

```
src/registration/
├── App.jsx                    # Main component + orchestrators (HIGH COUPLING)
├── blocks/
│   ├── blockAdminReducer.js   # Pure state machine
│   └── useBlockAdmin.js       # Block admin hook
├── waitlist/
│   ├── waitlistAdminReducer.js
│   └── useWaitlistAdmin.js
├── search/
│   ├── memberSearchReducer.js
│   └── useMemberSearch.js     # Includes debounce logic
├── group/
│   ├── groupGuestReducer.js
│   └── useGroupGuest.js
├── streak/
│   ├── streakReducer.js
│   └── useStreak.js
├── memberIdentity/
│   ├── memberIdentityReducer.js
│   └── useMemberIdentity.js   # Includes cache + fetch
├── court/
│   ├── courtAssignmentResultReducer.js
│   ├── useCourtAssignmentResult.js
│   ├── clearCourtFlowReducer.js
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
- Do NOT call backend directly
- Do NOT orchestrate workflows

### Orchestrators (App.jsx)
- Coordinate multi-step workflows
- Make backend calls
- Handle navigation
- See ORCHESTRATION.md for frozen list

---

## Do-Not-Touch Zones 🚫

| Zone | Reason | Required Before Change |
|------|--------|----------------------|
| `assignCourtToGroup` | 370-line orchestrator | Approval + decomposition plan |
| `sendGroupToWaitlist` | GPS + validation coupling | Approval |
| `handleSuggestionClick` | Crosses 5+ clusters | Approval |
| `Tennis.Domain.*` | Shared business logic | Unit test coverage |
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
- **Docs:** `docs/WINDOW_GLOBALS.md`

### 3. Orchestrator Deps Grouping
- **Pattern:** Large dependency objects grouped into `{ state, actions, services, ui }`
- **resetOrchestrator:** 36 → 2 top-level keys (`actions`, `services`)
- **assignCourtOrchestrator:** 36 → 4 top-level keys

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
```bash
# Config: no hardcoded secrets outside the config module(s)
rg "supabase.*url|anon.*key" src/ --glob "*.js" | rg -v "src/config/"

# Window: no writes outside platform layer
rg "\bwindow\.\w+\s*=" src/ --glob "*.js" --glob "*.jsx" | rg -v "src/platform/"

# Naming: no snake_case in JSX outside boundary modules
rg -n "\b[a-z]+_[a-z]+\b" src/ --glob "*.jsx" | rg -v "src/lib/normalize|src/registration/backend"

# Dual-format: no fallback patterns
rg -n "accountId\s*\|\|.*account_id|isPrimary\s*\|\|.*is_primary" src/
```

All checks should return empty (or only documented boundary exceptions).

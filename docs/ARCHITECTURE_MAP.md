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
| `assignCourtToGroup` | 370-line orchestrator | Overseer approval + decomposition plan |
| `sendGroupToWaitlist` | GPS + validation coupling | Overseer approval |
| `handleSuggestionClick` | Crosses 5+ clusters | Overseer approval |
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
3. Overseer review
4. Playwright + manual QA

### High Risk Pattern (Requires Strategy)
1. Write BEFORE/AFTER behavior spec
2. Get Overseer approval
3. Incremental implementation with gates
4. Full regression testing

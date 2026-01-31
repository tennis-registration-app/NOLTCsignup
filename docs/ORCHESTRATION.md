# NOLTC Orchestration Containment Strategy

**Purpose:** Define what orchestration means, where it lives, and how it changes.

---

## 1. Definition

**Orchestration** in NOLTC refers to functions that:
- Coordinate multiple state changes across clusters
- Make backend API calls
- Handle complex conditional flows (mobile vs desktop, waitlist vs direct assignment)
- Navigate between screens based on outcomes

Orchestrators are **not** pure state transitions — they are **workflow coordinators**.

---

## 2. Allowed Locations

Orchestrators may ONLY exist in:

| Location | Examples |
|----------|----------|
| `src/registration/App.jsx` | assignCourtToGroup, sendGroupToWaitlist, changeCourt |
| `src/registration/handlers/*.js` | adminOperations.js (already extracted) |
| Future: `src/registration/orchestrators/*.js` | When decomposition begins |

---

## 3. Forbidden Locations

Orchestrators must NEVER be placed in:

| Location | Reason |
|----------|--------|
| Reducers (`*Reducer.js`) | Reducers are pure state machines |
| Hooks (`use*.js`) | Hooks manage state, not workflows |
| Components (`*Screen.jsx`) | Components render, not orchestrate |
| Domain (`src/domain/`) | Domain is pure business logic |

---

## 4. Frozen Orchestrators List

These orchestrators are **frozen** — no refactoring without explicit Overseer approval and a decomposition plan:

| Orchestrator | Location | Lines | Touches |
|--------------|----------|-------|---------|
| `assignCourtToGroup` | App.jsx:1347-1714 | ~370 | Backend, GPS, waitlist, blocks, mobile, navigation |
| `sendGroupToWaitlist` | App.jsx:1786+ | ~155 | Backend, GPS, validation, navigation |
| `changeCourt` | App.jsx:1717-1767 | ~50 | Backend, state reset, navigation |
| `handleSuggestionClick` | App.jsx:2185-2312 | ~130 | Group, search, navigation, frequent partners |
| `handleAddPlayerSuggestionClick` | App.jsx:2390-2503 | ~115 | Group, search, waitlist, court data |

---

## 5. Interface Contract

### UI → Orchestrator

Orchestrators receive:
- Current state values (read-only)
- Callbacks/setters for state updates
- Backend reference

Orchestrators do NOT receive:
- Raw dispatch functions
- Direct reducer access

### Orchestrator → API

Orchestrators call:
- `backend.*` methods
- State setters (from hooks or useState)
- `setCurrentScreen()` for navigation

Orchestrators return:
- Nothing (side-effect only), OR
- Success/failure result for caller to handle

---

## 6. Refactor Policy

### Before Any Orchestrator Change

1. **Evidence required:** Document current behavior with specific test coverage
2. **Playwright gate:** All 15 tests must pass before AND after
3. **No behavior change:** Refactors must preserve exact UX flow
4. **Overseer approval:** Required for any frozen orchestrator

### What Counts as "Behavior Change"

- Different API call sequence
- Different navigation path
- Different error handling
- Different state after completion
- Different timing (debounce, delays)

### Allowed Changes Without Approval

- Extracting pure helper functions (already unit tested)
- Renaming internal variables
- Adding logging/instrumentation
- TypeScript annotations

---

## 7. Future Decomposition Path

When ready to decompose orchestrators:

1. **Wrap first:** Create thin wrapper that calls existing orchestrator
2. **Test wrapper:** Ensure identical behavior
3. **Extract steps:** Move individual steps to testable functions
4. **Replace incrementally:** Swap steps one at a time with Playwright gate
5. **Delete original:** Only when fully migrated

This is NOT approved for WP5.4. It's the strategy for a future work package.
